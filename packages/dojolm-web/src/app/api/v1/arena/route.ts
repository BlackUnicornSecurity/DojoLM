// SPDX-License-Identifier: Apache-2.0
// @public-api -- /api/v1/* external integrator surface (G-086).
/**
 * File: route.ts
 * Purpose: Public v1 API route for Arena mode (DEPRECATED — use /api/arena)
 * Story: MUSUBI Phase 7.3, PR-4g.1 Deprecation
 *
 * TICKET-H8 (ADR-0098 §4): fifth Evidence consumer route — closes Phase H.
 * Wraps the existing handler with `withEvidence` (H-2) feeding the H-3
 * `WormEvidenceWriter` via the in-memory dev store gated by
 * `EVIDENCE_WORM_STORE=in-memory`.
 *
 * The wrap is OBSERVATIONAL — v1 deprecation business logic (validation,
 * deprecation headers, response shape) is unchanged. Capture is best-effort:
 * writer failures log via the H-2 wrapper's built-in handler and never break
 * the user response. A `pass` verdict reflects "request validated and
 * accepted by the deprecation stub" — NOT execution success on the
 * successor surface (the stub does not invoke the model).
 *
 * Mirrors H-4 (`/api/shingan/scan`), H-5 (`/api/kagami/behavior-tests`),
 * H-6 (`/api/scan`), and H-7 (`/api/buki/fuzz`); H-6 hoisted the shared
 * helpers to `@/lib/evidence/route-helpers` and this route consumes them
 * directly (no file-local duplicates).
 *
 * Note on plaintext audit: the existing v1/arena handler does NOT write to
 * the plain audit-log sink (only `console.error` on failure), so the
 * `hashOperatorForAuditLog` helper that H-6 introduced is NOT needed here —
 * mirrors the H-7 discipline.
 *
 * Index:
 * - Constants (deprecation successor, mode whitelist)
 * - Closed-list controls + zero-state AIVSS (NEW)
 * - Writer memo + test-only reset (NEW)
 * - Inner handler (existing logic, untouched)
 * - withEvidence + withAuth composition (NEW)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { SUNSET_DATE, deprecationHeaders } from '@/lib/v1-deprecation';
import { withEvidence } from '@/lib/evidence';
import {
  resolveRequestOperator,
  payloadExceedsClonableSize,
  truncateEvidenceField,
} from '@/lib/evidence/route-helpers';
import { writerMemo } from './_writer-memo';
import type { AivssScore } from 'bu-tpi/aivss';

const SUCCESSOR = '/api/arena';
const headers = () => deprecationHeaders(SUCCESSOR);

const VALID_ARENA_MODES = ['kunai', 'shuriken', 'naginata', 'musashi'] as const;
type ArenaMode = (typeof VALID_ARENA_MODES)[number];

function isArenaMode(v: unknown): v is ArenaMode {
  return typeof v === 'string'
    && (VALID_ARENA_MODES as readonly string[]).includes(v);
}

/**
 * Body-size pre-clone gate for `withEvidence`'s `resolveInput`. The body is
 * a small JSON object (`{ mode, modelId }`) — modelId is bounded at 128
 * chars by the inner handler, mode is a closed enum. We enforce a 2KB
 * clonable cap so an adversarial client cannot cause double-buffering of
 * large payloads. The inner handler still validates `mode` / `modelId`
 * shape after the JSON parse.
 */
const MAX_BODY_BYTES = 2_000;

/**
 * Zero-state AIVSS for an observational deprecation route: v1/arena is a
 * deprecation stub that VALIDATES request shape and emits successor-version
 * headers — it does NOT execute model combat. Per-Arena-mode AIVSS scoring
 * lives on the V2 successor surface (`/api/arena`); this wrap captures
 * whether the deprecation gate accepted the request, not the
 * adversarial-evaluation severity of any individual combat run.
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
 * Closed-list controls for the V1 Arena deprecation surface. Arena is the
 * adversarial-evaluation combat surface (modes: kunai / shuriken /
 * naginata / musashi) — the V1 surface lands on:
 *   - NIST-SP-800-53.CA-8 (Penetration Testing) — Arena modes are
 *     structured adversarial evaluations of model defences.
 *   - AI frameworks: `owasp-llm-top10` (LLM01 Prompt Injection — Arena's
 *     core attack class) + `mitre-atlas` (AML.T0020 Adversarial ML Attacks
 *     and AML.T0070 LLM Jailbreak — directly map to Arena's combat modes).
 *   - aiControlIds: 'LLM01' (OWASP LLM Top 10 prompt injection) — the
 *     adversarial-evaluation primary attack vector.
 *
 * R-T1: closed-map discipline — these constants are referenced by id only;
 * downstream consumers resolve labels via the `frameworks.ts` lookup tables.
 */
const ARENA_V1_CONTROL_IDS = ['NIST-SP-800-53.CA-8'] as const;
const ARENA_V1_AI_CONTROL_IDS = ['LLM01'] as const;
const ARENA_V1_FRAMEWORK_IDS = ['NIST-SP-800-53'] as const;
const ARENA_V1_AI_FRAMEWORK_IDS = ['owasp-llm-top10', 'mitre-atlas'] as const;
const EMPTY_ARTIFACT_REFS: readonly string[] = [];

const innerHandler = async (request: NextRequest): Promise<NextResponse> => {
  // F-QA-038: deprecated echo stub (no model invoked) — hidden by default.
  if (process.env.V1_COMPAT_ENABLED !== 'true') {
    return NextResponse.json(
      { error: 'v1 compatibility routes are not enabled' },
      { status: 404 },
    );
  }
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: headers() }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400, headers: headers() }
      );
    }

    const { mode, modelId } = body as { mode?: string; modelId?: string };

    // Validate required: mode
    if (!mode || typeof mode !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: mode (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (!isArenaMode(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Valid: ${VALID_ARENA_MODES.join(', ')}` },
        { status: 400, headers: headers() }
      );
    }

    // Validate required: modelId
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: modelId (string)' },
        { status: 400, headers: headers() }
      );
    }

    if (modelId.length > 128) {
      return NextResponse.json(
        { error: 'modelId exceeds maximum length (128)' },
        { status: 413, headers: headers() }
      );
    }

    // Arena v1 — DEPRECATED: use /api/arena
    return NextResponse.json(
      {
        success: true,
        deprecated: true,
        sunset: SUNSET_DATE,
        migration: `POST ${SUCCESSOR}`,
        data: {
          mode,
          modelId,
          status: 'ready',
          message: `DEPRECATED — migrate to POST ${SUCCESSOR} before 2026-06-30`,
        },
      },
      { status: 200, headers: headers() }
    );
  } catch (error) {
    console.error('v1 Arena API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: headers() }
    );
  }
};

/**
 * Per H-2 docs: stack `withAuth(withEvidence(...)(handler), opts)`.
 * `withEvidence` is curried; `withAuth` is NOT.
 *
 * - `resolveVerdict` reads response status — 2xx = pass, anything else = fail.
 *   For the deprecation stub, `pass` = request shape accepted; the stub does
 *   not invoke the model (V2 successor owns combat execution).
 * - `resolveInput` clones request so inner handler can still read body. We
 *   capture the JSON body verbatim (it is small — `mode` + `modelId` only)
 *   so the audit trail records the exact deprecation-stub call shape. Other
 *   shapes (rejected at the inner-handler validation gate) still get
 *   serialised so the audit trail has SOMETHING to inspect for fail-verdict
 *   records.
 * - `resolveOutput` reads response body via `clone()` so the original
 *   `response.body` stream remains intact for the framework to flush.
 * - Authentication preserved with `extraHeaders: headers()` so 401 paths
 *   still surface the v1 deprecation envelope.
 */
export const POST = withAuth(
  withEvidence({
    testType: 'arena',
    writer: writerMemo.ROUTE_WRITER,
    resolveVerdict: ({ response }) =>
      response.status >= 200 && response.status < 300 ? 'pass' : 'fail',
    resolveAivss: () => ZERO_AIVSS,
    resolveControls: () => ({
      controlIds: ARENA_V1_CONTROL_IDS,
      aiControlIds: ARENA_V1_AI_CONTROL_IDS,
    }),
    resolveFrameworks: () => ({
      frameworkIds: ARENA_V1_FRAMEWORK_IDS,
      aiFrameworkIds: ARENA_V1_AI_FRAMEWORK_IDS,
    }),
    resolveUserId: resolveRequestOperator,
    resolveInput: async (request: NextRequest) => {
      if (payloadExceedsClonableSize(request, MAX_BODY_BYTES)) {
        return truncateEvidenceField('[oversize payload — capture skipped]');
      }
      try {
        const cloned = request.clone();
        const body = await cloned.json();
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
  { resource: 'executions', action: 'execute', extraHeaders: headers() }
);

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'POST, OPTIONS', 'Content-Type': 'application/json' },
  });
}
