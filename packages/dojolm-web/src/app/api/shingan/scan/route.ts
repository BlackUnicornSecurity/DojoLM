// SPDX-License-Identifier: Apache-2.0
/**
 * D7.11 — Shingan Scan Endpoint
 * POST /api/shingan/scan
 *
 * TICKET-H4 (ADR-0098 §4): first Evidence consumer route. Wraps the existing
 * handler with `withEvidence` (H-2) feeding the H-3 `WormEvidenceWriter`
 * via the in-memory dev store gated by `EVIDENCE_WORM_STORE=in-memory`.
 *
 * The wrap is OBSERVATIONAL — business logic of the trust scan is unchanged.
 * Capture is best-effort: writer failures log via the H-2 wrapper's
 * built-in handler and never break the user response.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoShinganScansGet } from '@/lib/demo/mock-api-handlers';
import { withAuth } from '@/lib/auth/route-guard';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-claim';
import { getClientIp } from '@/lib/api-handler';
import { scanSkill, computeTrustScore } from 'bu-tpi/shingan';
import type { AivssScore } from 'bu-tpi/aivss';
import type { EvidenceRecord } from 'bu-tpi/compliance';
import { withEvidence } from '@/lib/evidence';
import { writerMemo } from './_writer-memo';

const MAX_CONTENT_SIZE = 512_000; // 500KB

// In-memory rate limiter — 20 scans per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

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

/**
 * Field truncation budget for the H-1 EvidenceRecord `input` / `output` fields.
 * Capture is auditor-grade evidence, NOT diagnostic logging — bound at 500
 * chars per ADR-0098 first-consumer guideline so a malicious or oversized
 * scan payload cannot inflate WORM storage.
 */
const EVIDENCE_FIELD_MAX_LEN = 500;

function truncateEvidenceField(value: unknown): string {
  return String(value ?? '').slice(0, EVIDENCE_FIELD_MAX_LEN);
}

/**
 * Zero-state AIVSS for an observational route: Shingan trust-test is a
 * compliance-evidence emitter, not an exploit attempt. Scoring is deferred
 * to AIVSS-aware test surfaces (Atemi, Buki, Kagami) and TICKET-H4-FOLLOWUP
 * will fold a real `resolveAivss` shape once the AIVSS-from-trust-score
 * mapping is decided. The vector is the canonical "all-N" form per H-2 tests.
 */
const ZERO_AIVSS: AivssScore = Object.freeze({
  base: 0,
  temporal: null,
  environmental: null,
  severity: 'none',
  vector: 'AIVSS:1.0/AV:N/AC:H/PIS:none/MC:advisor/DS:public/CI:none/II:none/AI:none',
});

/**
 * Closed-list of compliance controls this route maps to. Shingan is the
 * trust-test surface for skill content, so it lands on access-control
 * primitives (raw external content reaching a privileged scan engine).
 *
 * R-T1: closed-map discipline — these constants are referenced by id only;
 * downstream consumers resolve labels via the `frameworks.ts` lookup tables.
 */
const SHINGAN_CONTROL_IDS = ['NIST-SP-800-53.AC-3'] as const;
const SHINGAN_FRAMEWORK_IDS = ['NIST-SP-800-53'] as const;
const SHINGAN_AI_FRAMEWORK_IDS = ['owasp-llm-top10'] as const;
const EMPTY_AI_CONTROL_IDS: readonly string[] = [];
const EMPTY_ARTIFACT_REFS: readonly string[] = [];

/**
 * Operator identity resolution (TICKET-H4 pass-1 fold-in: security-reviewer
 * MED). The route's `withEvidence` wrapper sits INSIDE `withAuth`, which has
 * already authenticated the caller via session-cookie OR API-key header by
 * the time `resolveUserId` fires. We surface a stable, opaque identifier
 * here — the H-2 wrapper SHA-256-hashes it before it reaches WORM, so the
 * raw cookie/key value is never persisted.
 *
 * Returning `null` causes the H-2 wrapper to write `operator: ''` to WORM
 * — preserves the pre-fix behaviour for unauthenticated test surfaces (the
 * 401 path) without breaking any record schema invariants.
 */
function resolveRequestOperator(request: NextRequest): string | null {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey.length > 0) return `api-key:${apiKey}`;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session && session.length > 0) return `session:${session}`;
  return null;
}

/**
 * Pre-clone payload size guard (TICKET-H4 pass-1 fold-in: security-reviewer
 * MED). The inner handler enforces `MAX_CONTENT_SIZE` (500KB) on the parsed
 * body — but `withEvidence`'s `resolveInput` runs BEFORE the inner handler
 * and would clone+parse the full body even for oversize payloads. We refuse
 * to clone bodies whose declared `Content-Length` exceeds the same limit so
 * an adversarial client can't cause double-buffering of large payloads.
 *
 * For requests without `Content-Length` we let the clone proceed (chunked
 * encoding); the inner handler's MAX_CONTENT_SIZE remains the canonical gate.
 */
const EVIDENCE_INPUT_MAX_BYTES = MAX_CONTENT_SIZE;

function payloadExceedsClonableSize(request: NextRequest): boolean {
  const lenHeader = request.headers.get('content-length');
  if (lenHeader === null) return false;
  const len = Number.parseInt(lenHeader, 10);
  if (!Number.isFinite(len)) return false;
  return len > EVIDENCE_INPUT_MAX_BYTES;
}

/**
 * Adapter: H-3 `WormEvidenceWriter` (returns `WormEvidenceEntry`) →
 * H-2 `WormEvidenceWriter` interface (returns `void`).
 *
 * The H-2 middleware contract treats the writer as a fire-and-forget
 * sink; the chain entry returned by H-3 is consumed for chain integrity,
 * not surfaced to the route handler. This adapter discards the entry and
 * lets H-2's built-in error handling cover write failures.
 *
 * Kept file-local for this PR — TICKET-H4-FOLLOWUP will hoist a shared
 * adapter once a second consumer route lands and the contract stabilises.
 */
// Writer-memo singleton lives in the sibling `_writer-memo.ts` so this
// route module exposes only Next.js 16 canonical Route exports. Tests
// reset via `resetWriterMemoForTests` from the same sibling.

const innerHandler = async (request: NextRequest): Promise<NextResponse> => {
  if (isDemoMode()) {
    const demo = await demoShinganScansGet();
    return demo as NextResponse;
  }

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let content: string;
    let filename: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      content = await (file as File).text();
      filename = (file as File).name;
    } else {
      const body = await request.json();
      content = body.content;
      filename = body.filename;
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > MAX_CONTENT_SIZE) {
      return NextResponse.json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes` }, { status: 400 });
    }

    // Sanitize filename
    const safeFilename = filename
      ? String(filename).replace(/[^\w.\-]/g, '_').slice(0, 255)
      : undefined;

    const scanResult = scanSkill(content, safeFilename);
    const trustScore = computeTrustScore(content, safeFilename);

    return NextResponse.json({ trustScore, scanResult, detectedFormat: trustScore.format });
  } catch (error) {
    console.error('Shingan scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
};

/**
 * Per H-2 docs: stack `withAuth(withEvidence(...)(handler), { role: 'admin' })`.
 * `withEvidence` is curried; `withAuth` is NOT.
 *
 * - `resolveVerdict` reads the response status — 2xx = pass, anything else = fail.
 * - `resolveInput` clones the request so the inner handler can still read the
 *   body. Form-data payloads return an empty string here (the file content
 *   is the input semantically, but it is NOT cloneable cheaply in NextRequest).
 * - `resolveOutput` reads the response body via `clone()` so the original
 *   `response.body` stream remains intact for the framework to flush.
 */
export const POST = withAuth(
  withEvidence({
    testType: 'shingan',
    writer: writerMemo.ROUTE_WRITER,
    resolveVerdict: ({ response }) =>
      response.status >= 200 && response.status < 300 ? 'pass' : 'fail',
    resolveAivss: () => ZERO_AIVSS,
    resolveControls: () => ({
      controlIds: SHINGAN_CONTROL_IDS,
      aiControlIds: EMPTY_AI_CONTROL_IDS,
    }),
    resolveFrameworks: () => ({
      frameworkIds: SHINGAN_FRAMEWORK_IDS,
      aiFrameworkIds: SHINGAN_AI_FRAMEWORK_IDS,
    }),
    resolveUserId: resolveRequestOperator,
    resolveInput: async (request: NextRequest) => {
      const contentType = request.headers.get('content-type') ?? '';
      // Form-data (file upload) — the file content is the input, but cloning
      // a multipart stream is expensive and not portable across NextRequest
      // shims; capture the filename hint via header instead.
      if (contentType.includes('multipart/form-data')) {
        return truncateEvidenceField('[multipart upload]');
      }
      // Pass-1 security fold-in: refuse to double-buffer adversarial payloads.
      if (payloadExceedsClonableSize(request)) {
        return truncateEvidenceField('[oversize payload — capture skipped]');
      }
      try {
        // Clone so the inner handler can still consume `request.json()`.
        const cloned = request.clone();
        const body = await cloned.json();
        // Extract just the `content` field (and `filename` hint) — body may
        // contain other fields but the scan-input contract is `content`.
        return truncateEvidenceField(
          typeof body?.content === 'string' ? body.content : JSON.stringify(body ?? {}),
        );
      } catch {
        return '';
      }
    },
    resolveOutput: async (response: NextResponse) => {
      try {
        // Clone so the framework can still flush the original body to the wire.
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

