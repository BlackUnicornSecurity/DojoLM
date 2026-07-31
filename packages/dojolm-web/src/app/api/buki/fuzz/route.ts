// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- YA.6 Buki standalone (D-06) v1-v2-restore-buki-tabs.md
/**
 * File: route.ts
 * Purpose:
 *   - POST /api/buki/fuzz — coverage-guided fuzz session against the Shingan
 *     scanner. Admin-RBAC-gated via `withAuth({ role: 'admin' })`.
 *
 * TICKET-H7 (ADR-0098 §4): fourth Evidence consumer route. Wraps the existing
 * handler with `withEvidence` (H-2) feeding the H-3 `WormEvidenceWriter`
 * via the in-memory dev store gated by `EVIDENCE_WORM_STORE=in-memory`.
 *
 * The wrap is OBSERVATIONAL — fuzz business logic (rate-limiter, concurrency
 * guard, grammar selection, scanner-fn adapter) is unchanged. Capture is
 * best-effort: writer failures log via the H-2 wrapper's built-in handler
 * and never break the user response.
 *
 * Mirrors H-4 (`/api/shingan/scan`), H-5 (`/api/kagami/behavior-tests`), and
 * H-6 (`/api/scan`); H-6 hoisted the shared helpers to
 * `@/lib/evidence/route-helpers` and this route consumes them directly (no
 * file-local duplicates).
 *
 * Note on plaintext audit: the existing fuzz handler does NOT write to the
 * plain audit-log sink (only `console.error` on failure), so the
 * `hashOperatorForAuditLog` helper that H-6 introduced is NOT needed here.
 *
 * Body: { grammar: 'prompt' | 'encoding' | 'structural', mutationCount: number }
 * Response: { results: FuzzerResult[] }
 *
 * Index:
 * - Rate-limit + concurrency guard (existing)
 * - Grammar map (existing)
 * - Inner handler (existing logic, untouched)
 * - withEvidence composition + closed-list controls (NEW)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getClientIp } from '@/lib/api-handler';
import {
  createFuzzSession,
  fuzz,
  PROMPT_GRAMMAR,
  ENCODING_GRAMMAR,
  STRUCTURAL_GRAMMAR,
  DEFAULT_FUZZ_CONFIG,
} from 'bu-tpi/fuzzing';
import { scanSkill } from 'bu-tpi/shingan';
import { withEvidence } from '@/lib/evidence';
import {
  resolveRequestOperator,
  payloadExceedsClonableSize,
  truncateEvidenceField,
} from '@/lib/evidence/route-helpers';
import { writerMemo } from './_writer-memo';
import type { AivssScore } from 'bu-tpi/aivss';

const MAX_MUTATIONS = 200;
const MIN_MUTATIONS = 1;
/** Hard cap on fuzz session wall-clock time — prevents event-loop stall */
const FUZZ_TIMEOUT_MS = 25_000;

/**
 * Body-size pre-clone gate for `withEvidence`'s `resolveInput`. The body is
 * a small JSON object (`{ grammar, mutationCount }`) — no legitimate caller
 * sends >2KB. We enforce that as the clonable-size cap so an adversarial
 * client cannot cause double-buffering of large payloads. The inner handler
 * still validates `mutationCount`/`grammar` shape after the JSON parse.
 */
const MAX_BODY_BYTES = 2_000;

// In-memory rate limiter — 3 fuzz sessions per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 60_000;

// Concurrency guard — max simultaneous fuzz sessions across all IPs
let activeSessionCount = 0;
const MAX_CONCURRENT_SESSIONS = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

const GRAMMAR_MAP = {
  prompt: PROMPT_GRAMMAR,
  encoding: ENCODING_GRAMMAR,
  structural: STRUCTURAL_GRAMMAR,
} as const;

type GrammarKey = keyof typeof GRAMMAR_MAP;

function isGrammarKey(v: unknown): v is GrammarKey {
  return typeof v === 'string' && v in GRAMMAR_MAP;
}

/**
 * Zero-state AIVSS for an observational route: Buki fuzz is a coverage-guided
 * vulnerability-discovery surface that EMITS findings via the scanner; the
 * wrap captures whether the route accepted the fuzz session, not the
 * exploit-severity of any individual mutation. Per-finding AIVSS scoring is
 * deferred to the AIVSS-aware test surfaces (Atemi/Buki-attack/Kagami) and
 * a follow-up ticket can fold a real `resolveAivss` shape if a
 * `findingsCount → AIVSS` mapping ever lands.
 *
 * Vector is the canonical "all-N" form per H-2 tests.
 */
const ZERO_AIVSS: AivssScore = Object.freeze({
  base: 0,
  temporal: null,
  environmental: null,
  severity: 'none',
  vector: 'AIVSS:1.0/AV:N/AC:H/PIS:none/MC:advisor/DS:public/CI:none/II:none/AI:none',
});

/**
 * Closed-list controls for the Buki fuzz surface. Buki fuzz is the
 * coverage-guided vulnerability-discovery surface against the Shingan
 * scanner — it lands on:
 *   - NIST-SP-800-53.RA-5 (Risk Assessment / Vulnerability Monitoring &
 *     Scanning) — fuzz sessions actively scan for anomalies / unhandled
 *     inputs in the privileged scanner pipeline.
 *   - mitre-atlas (AI threat catalogue) — fuzzed prompts surface
 *     ATLAS-pattern adversarial-ML signals (notably AML.T0020 Adversarial
 *     ML Attacks and AML.T0060 LLM Prompt Injection).
 *
 * R-T1: closed-map discipline — these constants are referenced by id only;
 * downstream consumers resolve labels via the `frameworks.ts` lookup tables.
 */
const BUKI_FUZZ_CONTROL_IDS = ['NIST-SP-800-53.RA-5'] as const;
const BUKI_FUZZ_FRAMEWORK_IDS = ['NIST-SP-800-53'] as const;
const BUKI_FUZZ_AI_FRAMEWORK_IDS = ['mitre-atlas'] as const;
const EMPTY_AI_CONTROL_IDS: readonly string[] = [];
const EMPTY_ARTIFACT_REFS: readonly string[] = [];

const innerHandler = async (request: NextRequest): Promise<NextResponse> => {
  const ip = getClientIp(request);

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded — try again later' },
      { status: 429 },
    );
  }

  if (activeSessionCount >= MAX_CONCURRENT_SESSIONS) {
    return NextResponse.json(
      { error: 'Server busy — try again in a moment' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json() as { grammar?: unknown; mutationCount?: unknown };
    const { grammar, mutationCount } = body;

    if (!isGrammarKey(grammar)) {
      return NextResponse.json(
        { error: 'grammar must be one of: prompt, encoding, structural' },
        { status: 400 },
      );
    }

    const count = Number(mutationCount);
    if (!Number.isInteger(count) || count < MIN_MUTATIONS || count > MAX_MUTATIONS) {
      return NextResponse.json(
        { error: `mutationCount must be an integer between ${MIN_MUTATIONS} and ${MAX_MUTATIONS}` },
        { status: 400 },
      );
    }

    const grammarRules = GRAMMAR_MAP[grammar];

    activeSessionCount++;
    try {
      const session = createFuzzSession({
        ...DEFAULT_FUZZ_CONFIG,
        maxIterations: count,
        grammarRules,
        seed: `buki-fuzz-${grammar}-${Date.now()}`,
        timeoutMs: FUZZ_TIMEOUT_MS,
      });

      // ScannerFn adapter: scanSkill returns ScanResult which matches the required shape
      const completedSession = fuzz(session, (text) => {
        const result = scanSkill(text);
        return {
          verdict: result.verdict,
          findings: result.findings,
          counts: result.counts,
        };
      });

      const results = completedSession.results.map((r, idx) => ({
        id: `${completedSession.id}-${idx}`,
        input: r.input,
        anomalyType: r.anomalyType,
        isAnomaly: r.anomaly,
        // score: fraction of findings among all runs; use findingsCount normalised 0–1
        score: r.findingsCount > 0 ? Math.min(r.findingsCount / 10, 1) : 0,
        timestamp: completedSession.startTime,
      }));

      return NextResponse.json({ results });
    } finally {
      activeSessionCount--;
    }
  } catch (error) {
    console.error('Buki fuzz error:', error);
    return NextResponse.json({ error: 'Fuzz session failed' }, { status: 500 });
  }
};

/**
 * Per H-2 docs: stack `withAuth(withEvidence(...)(handler), opts)`.
 * `withEvidence` is curried; `withAuth` is NOT.
 *
 * - `resolveVerdict` reads response status — 2xx = pass, anything else = fail.
 * - `resolveInput` clones request so inner handler can still read body. We
 *   capture the JSON body verbatim (it is small — `grammar` + `mutationCount`
 *   only) so the audit trail records the exact fuzz config that ran.
 * - `resolveOutput` reads response body via `clone()` so the original
 *   `response.body` stream remains intact for the framework to flush.
 */
export const POST = withAuth(
  withEvidence({
    testType: 'buki-fuzz',
    writer: writerMemo.ROUTE_WRITER,
    resolveVerdict: ({ response }) =>
      response.status >= 200 && response.status < 300 ? 'pass' : 'fail',
    resolveAivss: () => ZERO_AIVSS,
    resolveControls: () => ({
      controlIds: BUKI_FUZZ_CONTROL_IDS,
      aiControlIds: EMPTY_AI_CONTROL_IDS,
    }),
    resolveFrameworks: () => ({
      frameworkIds: BUKI_FUZZ_FRAMEWORK_IDS,
      aiFrameworkIds: BUKI_FUZZ_AI_FRAMEWORK_IDS,
    }),
    resolveUserId: resolveRequestOperator,
    resolveInput: async (request: NextRequest) => {
      if (payloadExceedsClonableSize(request, MAX_BODY_BYTES)) {
        return truncateEvidenceField('[oversize payload — capture skipped]');
      }
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        // Capture the full JSON body — it is small by contract
        // (`{ grammar, mutationCount }`). Other shapes (rejected at the
        // inner-handler validation gate) still get serialised so the audit
        // trail has SOMETHING to inspect for fail-verdict records.
        return truncateEvidenceField(JSON.stringify(body ?? {}));
      } catch {
        return '';
      }
    },
    resolveOutput: async (response: NextResponse) => {
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        return truncateEvidenceField(text);
      } catch {
        return '';
      }
    },
    resolveArtifactRefs: () => EMPTY_ARTIFACT_REFS,
  })(innerHandler),
  { role: 'admin' },
);
