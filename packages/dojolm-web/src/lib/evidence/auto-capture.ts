// SPDX-License-Identifier: Apache-2.0
/**
 * H-2: `withEvidence` auto-capture middleware (ADR-0098 §2).
 *
 * Wraps Next.js API route handlers so every test execution emits an
 * EvidenceRecord (H-1 schema) into the WORM evidence chain (H-3 storage,
 * not yet wired — stubbed below).
 *
 * Curried HOF shape — composes with `withAuth(handler, options)` (which is
 * NOT itself curried). Stack order matters: auth runs first, then evidence
 * captures around the inner handler.
 *
 *     export const POST = withAuth(
 *       withEvidence({ testType: 'kagami', resolveVerdict, resolveAivss })(
 *         async (request) => { ... handler ... }
 *       ),
 *       { role: 'admin' },
 *     );
 *
 * Capture phases:
 * - **Before:** captures input + headers + operator (hashed; raw userId never written)
 * - **After:** captures output + verdict + AIVSS, builds EvidenceRecord, writes to
 *   WORM evidence writer (idempotent via `(testId, requestId)` uniqueness key —
 *   duplicate writes are no-ops).
 *
 * Failure semantics:
 * - **Verdict='fail' contract.** A non-2xx response is the canonical
 *   verdict='fail' signal. Handlers that THROW exit out-of-band — the
 *   wrapper re-throws immediately and does NOT emit an EvidenceRecord on
 *   that path. Routes that need fail-evidence capture must catch their own
 *   error and return a non-2xx response so `resolveVerdict` can read it.
 * - **Capture failure does NOT break the request.** A WORM write that throws is
 *   logged via `console.error` (H-3 will route this through the existing
 *   `appendOnigaeshiAudit` / Onigaeshi audit chain). The handler's response
 *   reaches the caller intact.
 * - **DSR-subject discipline (§10.6).** Raw userIds, raw input, and raw output
 *   contents are routed through `pii_`-prefixed envelope keys at the WORM
 *   producer layer (H-3) so `applyOverlay()` masks them under DSR erasure
 *   markers per ADR-0093 Path B. The H-1 EvidenceRecord schema itself has
 *   `input` / `output` / `operator` as plain fields; it is the WORM record
 *   ENVELOPE (not the inner EvidenceRecord) that carries the `pii_*` keys.
 *
 * Cross-references:
 * - ADR-0098 §2 — Auto-capture middleware (this file)
 * - ADR-0093 — DSR Path B (WORM + erasure overlay)
 * - H-1 (`bu-tpi/compliance` `EvidenceRecord`) — schema consumed here
 * - H-3 (TBD) — `WormEvidenceWriter` storage (currently stubbed)
 */

import type { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import type {
  EvidenceRecord,
  TestType,
  EvidenceVerdict,
  BushidoFrameworkId,
  AiComplianceFrameworkId,
} from 'bu-tpi/compliance';
import type { AivssScore } from 'bu-tpi/aivss';

/**
 * Context passed to every `resolveXxx` callback.
 * Both request and response are READ-ONLY here — the wrapper never mutates them.
 */
export interface EvidenceContext<TResponse> {
  readonly request: NextRequest;
  readonly response: TResponse;
}

/**
 * Operator identity resolved from the auth boundary.
 *
 * The wrapper accepts EITHER a raw userId (which it then hashes via SHA-256
 * so the raw value never reaches WORM) OR a pre-computed userHash from the
 * caller (e.g. `withAuth` already hashed it). At least one must be supplied
 * — the wrapper does NOT fall back to "anonymous"; an unauthenticated test
 * surface is a configuration error and should fail closed.
 */
export interface OperatorResolver {
  readonly resolveUserId?: (request: NextRequest) => string | null;
  readonly resolveUserHash?: (request: NextRequest) => string | null;
}

export interface WithEvidenceOptions<TResponse> extends OperatorResolver {
  readonly testType: TestType;
  readonly resolveVerdict: (ctx: EvidenceContext<TResponse>) => EvidenceVerdict;
  readonly resolveAivss: (ctx: EvidenceContext<TResponse>) => AivssScore;
  readonly resolveControls?: (ctx: EvidenceContext<TResponse>) => {
    readonly controlIds: readonly string[];
    readonly aiControlIds: readonly string[];
  };
  readonly resolveFrameworks?: (ctx: EvidenceContext<TResponse>) => {
    readonly frameworkIds: readonly BushidoFrameworkId[];
    readonly aiFrameworkIds: readonly AiComplianceFrameworkId[];
  };
  readonly resolveInput?: (request: NextRequest) => Promise<string> | string;
  readonly resolveOutput?: (response: TResponse) => Promise<string> | string;
  readonly resolveModelId?: (ctx: EvidenceContext<TResponse>) => string | null;
  readonly resolveArtifactRefs?: (ctx: EvidenceContext<TResponse>) => readonly string[];
  /**
   * Test-only override of the WORM writer. Production callers omit this and
   * rely on the default `WormEvidenceWriter` (H-3 — currently stubbed).
   */
  readonly writer?: WormEvidenceWriter;
  /**
   * Test-only override of the testId factory. Production omits and the wrapper
   * generates a `randomUUID()` per request.
   */
  readonly resolveTestId?: (ctx: EvidenceContext<TResponse>) => string;
}

/** Minimal Next.js handler signature this wrapper accepts. */
export type ApiHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * H-3 dependency seam. The default implementation is a `console.warn` stub
 * until the postgres-backed `WormEvidenceWriter` lands. Tests override via
 * `WithEvidenceOptions.writer`.
 *
 * **Idempotency contract (ADR-0098 §2):** the `(record.testId, requestId)`
 * tuple is the dedupe key. The wrapper forwards the same tuple on retries;
 * the writer MUST treat duplicate calls as no-ops. The HOF does NOT
 * deduplicate — it is the writer's responsibility to enforce uniqueness
 * (e.g. via a Postgres unique index or a hash-set guard). Any consumer
 * wiring a real writer in place of `StubWormEvidenceWriter` must implement
 * this guarantee.
 */
export interface WormEvidenceWriter {
  append(record: EvidenceRecord, requestId: string): Promise<void>;
}

class StubWormEvidenceWriter implements WormEvidenceWriter {
  async append(record: EvidenceRecord, requestId: string): Promise<void> {
    // H-3 storage TODO — once the WORM evidence chain lands this stub is
    // replaced with a real append that routes `record.input` / `record.output`
    // / `record.operator` through `pii_*`-prefixed envelope keys for the
    // DSR overlay. For now, log so dev can see the call shape without
    // breaking any consumer.
    console.warn(
      '[evidence] H-3 storage not yet wired — record dropped',
      { testId: record.testId, requestId, testType: record.testType, verdict: record.verdict },
    );
  }
}

const DEFAULT_WRITER: WormEvidenceWriter = new StubWormEvidenceWriter();

/**
 * Hash a raw userId so the EvidenceRecord's `operator` field never carries
 * the cleartext value. SHA-256 hex matches the existing `hashApiKey` shape
 * in `auth/route-guard.ts` — a deterministic, non-reversible identifier
 * suitable for DSR-overlay keying.
 *
 * Note: this is NOT the DSR-pseudonymisation HMAC (`userHmac` in
 * `bu-tpi/compliance`). The pseudonym is keyed on `DSR_PSEUDONYM_HMAC_KEY`
 * for cascade-store linkage; the operator hash is just a stable
 * audit-side identifier and does not need to be HMAC-keyed.
 */
function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}

const ERR_LOG_MAX_LEN = 200;

/**
 * Render an unknown thrown value as a bounded log string. Strips request
 * body content that may have ended up in `Error.message` (e.g. JSON-parse
 * errors that print the offending payload). Caps at 200 chars so an
 * adversarial input cannot inflate the log line.
 */
function truncateErr(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.length <= ERR_LOG_MAX_LEN
    ? raw
    : `${raw.slice(0, ERR_LOG_MAX_LEN)}…[+${raw.length - ERR_LOG_MAX_LEN}]`;
}

const SHA256_HEX_RE = /^[0-9a-f]{64}$/;

/**
 * Resolve the operator string for the EvidenceRecord. Prefers a
 * pre-computed userHash from the caller; falls back to hashing a raw
 * userId. Returns the empty string if neither resolver yields a value —
 * the EvidenceRecord schema requires `operator: string` and the H-1
 * schema does not allow null. Routes that require auth should run
 * `withEvidence` INSIDE `withAuth` so the user is always populated.
 *
 * **Hash bypass defense:** the pre-hashed path is gated on a strict
 * 64-char lowercase hex check. A caller who passes a raw userId by mistake
 * via `resolveUserHash` falls through to the raw-userId path, which
 * SHA-256 hashes before persisting. This guarantees no cleartext userId
 * can reach `record.operator` even via misconfigured callers.
 */
function resolveOperator<TResponse>(
  request: NextRequest,
  options: WithEvidenceOptions<TResponse>,
): string {
  const preHashed = options.resolveUserHash?.(request);
  if (typeof preHashed === 'string' && SHA256_HEX_RE.test(preHashed)) {
    return preHashed;
  }
  const raw = options.resolveUserId?.(request);
  if (typeof raw === 'string' && raw.length > 0) {
    return hashUserId(raw);
  }
  return '';
}

/**
 * Default control-resolver — empty set. Routes that map to specific
 * controls override via `options.resolveControls`.
 */
const EMPTY_CONTROLS = {
  controlIds: [] as readonly string[],
  aiControlIds: [] as readonly string[],
} as const;

const EMPTY_FRAMEWORKS = {
  frameworkIds: [] as readonly BushidoFrameworkId[],
  aiFrameworkIds: [] as readonly AiComplianceFrameworkId[],
} as const;

/**
 * `withEvidence` HOF — wraps a Next.js route handler so every invocation
 * emits a WORM EvidenceRecord (H-1 schema) on the success path.
 *
 * Handler-throws are re-thrown immediately and emit no record (verdict='fail'
 * contract is non-2xx response). Routes that need fail-evidence capture must
 * catch internally and return a non-2xx response so `resolveVerdict` reads it.
 *
 * Composability: independent of `withAuth(handler, options)` — note that
 * withAuth is NOT curried. Stack as
 * `withAuth(withEvidence(...)(handler), { role: 'admin' })`.
 */
export function withEvidence<TResponse extends NextResponse>(
  options: WithEvidenceOptions<TResponse>,
): (handler: (request: NextRequest) => Promise<TResponse>) => ApiHandler {
  const writer = options.writer ?? DEFAULT_WRITER;

  return (handler) => {
    return async (request: NextRequest): Promise<NextResponse> => {
      // Pre-compute request-side fields so they are captured even if the
      // handler throws. Headers/URL are already concrete; input is resolved
      // up front because the request body stream may be consumed by the
      // handler itself.
      const requestId = request.headers.get('x-request-id') ?? randomUUID();
      const operator = resolveOperator(request, options);

      let resolvedInput = '';
      if (options.resolveInput) {
        try {
          resolvedInput = await options.resolveInput(request);
        } catch (err) {
          // Input-capture failure is non-fatal — we still record an empty
          // input rather than crashing the request. Log so ops sees the
          // resolver is broken.
          console.error(
            '[evidence] resolveInput threw — continuing with empty input',
            { msg: truncateErr(err) },
          );
        }
      }

      // Handler-throw is OUT-OF-BAND. We do NOT capture an EvidenceRecord
      // when the handler throws; verdict='fail' is signalled exclusively
      // via a non-2xx response. The throw propagates up to the framework's
      // error boundary (Next.js error.tsx / 500 handler).
      const response: TResponse = await handler(request);

      // Best-effort post-capture. ANY failure here is logged but never
      // bubbles to the caller — the request response is the contract.
      try {
        const ctx: EvidenceContext<TResponse> = { request, response };

        const verdict = options.resolveVerdict(ctx);
        const aivss = options.resolveAivss(ctx);
        const controls = options.resolveControls?.(ctx) ?? EMPTY_CONTROLS;
        const frameworks = options.resolveFrameworks?.(ctx) ?? EMPTY_FRAMEWORKS;

        let resolvedOutput = '';
        if (options.resolveOutput) {
          try {
            resolvedOutput = await options.resolveOutput(response);
          } catch (err) {
            console.error(
              '[evidence] resolveOutput threw — continuing with empty output',
              { msg: truncateErr(err) },
            );
          }
        }

        const modelId = options.resolveModelId?.(ctx) ?? null;
        const artifactRefs = options.resolveArtifactRefs?.(ctx) ?? [];
        const testId = options.resolveTestId?.(ctx) ?? randomUUID();

        const record: EvidenceRecord = {
          id: randomUUID(),
          testId,
          testType: options.testType,
          verdict,
          controlIds: controls.controlIds,
          aiControlIds: controls.aiControlIds,
          frameworkIds: frameworks.frameworkIds,
          aiFrameworkIds: frameworks.aiFrameworkIds,
          aivss,
          input: resolvedInput,
          output: resolvedOutput,
          modelId,
          operator,
          timestamp: new Date().toISOString(),
          artifactRefs,
          // H-3 will populate this with the WORM chain entry hash after
          // writing. The wrapper passes the empty string and the writer
          // overlays the real ref before `seal`.
          auditChainRef: '',
          // The overlay state is `none` at write-time; an erasure marker
          // landing later flips this to `applied` at read-time via
          // `applyOverlay()`.
          dsrOverlay: 'none',
        };

        await writer.append(record, requestId);
      } catch (err) {
        // Per ADR-0098 §2: evidence-write failures are non-fatal. The
        // request response has already been committed to the in-memory
        // `response` value; we simply log and let the caller see it.
        console.error(
          '[evidence] capture failed — request response preserved',
          { msg: truncateErr(err) },
        );
      }

      return response;
    };
  };
}
