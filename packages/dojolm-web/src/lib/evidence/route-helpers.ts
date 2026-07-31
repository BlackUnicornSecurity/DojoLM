// SPDX-License-Identifier: Apache-2.0
/**
 * H-6: Shared route-helper primitives for `withEvidence` consumer routes
 * (ADR-0098 §4).
 *
 * Hoisted from H-4 (`src/app/api/shingan/scan/route.ts`) and H-5
 * (`src/app/api/kagami/behavior-tests/route.ts`) when the third Evidence
 * consumer route landed (TICKET-H6 — `/api/scan`). Each H-4/H-5 file carried
 * an identical copy of these helpers; the contract has stabilised across
 * three independent consumers so the duplication moves to one shared module.
 *
 * What lives here:
 * - {@link adaptH3Writer} — H-3 `WormEvidenceWriter` → H-2 middleware writer.
 * - {@link createWriterMemo} — per-route memoisation of the resolved H-3
 *   writer. Returns `{ ROUTE_WRITER, __resetMemoForTests }` so each route can
 *   keep its own cache (independent test resets, no cross-test bleed).
 * - {@link resolveRequestOperator} — pull a stable operator string from the
 *   incoming request (api-key header preferred, session cookie fallback).
 * - {@link payloadExceedsClonableSize} — pre-clone size guard for
 *   `withEvidence`'s `resolveInput` (refuses to double-buffer adversarial
 *   oversize payloads). Cap is parameterized per consumer.
 * - {@link truncateEvidenceField} — bound a captured input/output field at
 *   {@link EVIDENCE_FIELD_MAX_LEN_DEFAULT} (500 chars by default; override
 *   per consumer if the audit profile differs).
 *
 * Cross-references:
 * - ADR-0098 §2 — `withEvidence` middleware (H-2)
 * - ADR-0098 §4 — first/second/third Evidence consumer routes (H-4..H-6)
 * - H-1 (`bu-tpi/compliance` `EvidenceRecord`) — schema consumed by the
 *   middleware
 * - H-3 (`bu-tpi/onigaeshi` `WormEvidenceWriter`) — backing storage adapted
 *   here
 */

import type { NextRequest } from 'next/server';
import type { EvidenceRecord } from 'bu-tpi/compliance';
import type { WormEvidenceWriter as H3WormEvidenceWriter } from 'bu-tpi/onigaeshi';
import type { WormEvidenceWriter as MiddlewareWriter } from '@/lib/evidence';
import { getEvidenceWriter } from '@/lib/evidence/store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-claim';

/**
 * Default field-truncation budget for the H-1 EvidenceRecord
 * `input` / `output` fields. Capture is auditor-grade evidence, NOT
 * diagnostic logging — bound at 500 chars per ADR-0098 first-consumer
 * guideline so a malicious or oversized payload cannot inflate WORM storage.
 *
 * Consumers MAY override per route by passing an explicit `maxLen` to
 * {@link truncateEvidenceField}.
 */
export const EVIDENCE_FIELD_MAX_LEN_DEFAULT = 500;

/**
 * Render a captured value as a bounded string. Coerces non-strings via
 * `String(value ?? '')` (preserves the empty-string contract for `null` /
 * `undefined`) then slices to `maxLen`.
 *
 * @param value Raw value to capture. Strings pass through; non-strings are
 *   coerced (the resulting JSON-string-ish form is acceptable for audit).
 * @param maxLen Optional cap (default {@link EVIDENCE_FIELD_MAX_LEN_DEFAULT}).
 */
export function truncateEvidenceField(
  value: unknown,
  maxLen: number = EVIDENCE_FIELD_MAX_LEN_DEFAULT,
): string {
  return String(value ?? '').slice(0, maxLen);
}

/**
 * Operator identity resolution. The `withEvidence` wrapper sits INSIDE
 * `withAuth`, which has already authenticated the caller via session-cookie
 * OR API-key header by the time `resolveUserId` fires. This helper surfaces
 * a stable, opaque identifier — the H-2 wrapper SHA-256-hashes it before it
 * reaches WORM, so the raw cookie / API-key value is never persisted.
 *
 * Returning `null` causes the H-2 wrapper to write `operator: ''` to WORM —
 * preserves the pre-fix behaviour for unauthenticated test surfaces (the
 * 401 path) without breaking any record schema invariants.
 *
 * Header precedence (matches H-4 / H-5):
 * 1. `x-api-key` header → `api-key:<value>`
 * 2. session cookie    → `session:<value>`
 * 3. neither           → `null`
 */
export function resolveRequestOperator(request: NextRequest): string | null {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey && apiKey.length > 0) return `api-key:${apiKey}`;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (session && session.length > 0) return `session:${session}`;
  return null;
}

/**
 * Pre-clone payload size guard. The inner handler enforces a content-size
 * gate on the parsed body — but `withEvidence`'s `resolveInput` runs BEFORE
 * the inner handler and would clone+parse the full body even for oversize
 * payloads. We refuse to clone bodies whose declared `Content-Length`
 * exceeds the same limit so an adversarial client can't cause double-
 * buffering of large payloads.
 *
 * For requests without `Content-Length` we let the clone proceed (chunked
 * encoding); the inner handler's body-size gate remains the canonical
 * guard.
 *
 * @param request Inbound request to inspect.
 * @param maxBytes Per-route inner-handler size cap.
 */
export function payloadExceedsClonableSize(
  request: NextRequest,
  maxBytes: number,
): boolean {
  const lenHeader = request.headers.get('content-length');
  if (lenHeader === null) return false;
  const len = Number.parseInt(lenHeader, 10);
  if (!Number.isFinite(len)) return false;
  return len > maxBytes;
}

/**
 * Adapter: H-3 `WormEvidenceWriter` (returns `WormEvidenceEntry`) →
 * H-2 `WormEvidenceWriter` interface (returns `void`).
 *
 * The H-2 middleware contract treats the writer as a fire-and-forget sink;
 * the chain entry returned by H-3 is consumed for chain integrity, not
 * surfaced to the route handler. This adapter discards the entry and lets
 * H-2's built-in error handling cover write failures.
 *
 * Stable across H-4 / H-5 / H-6 — hoisted to this shared module under
 * TICKET-H6 once the third consumer landed and the contract was confirmed.
 */
export function adaptH3Writer(h3: H3WormEvidenceWriter): MiddlewareWriter {
  return {
    async append(record: EvidenceRecord, _requestId: string): Promise<void> {
      await h3.append(record);
    },
  };
}

/**
 * Result of {@link createWriterMemo} — one stable `MiddlewareWriter`
 * reference suitable for `withEvidence`'s `writer` option, plus a test-only
 * reset hook so vitest can install a fresh driver per test.
 */
export interface WriterMemo {
  /** Stable writer reference passed to `withEvidence({ writer })`. */
  readonly ROUTE_WRITER: MiddlewareWriter;
  /**
   * Test-only: reset the memoized writer so each test can install a fresh
   * driver via `__resetEvidenceStoreForTests` + `EVIDENCE_WORM_STORE`.
   * Production code never imports this — it is a vitest-side hook only.
   */
  readonly __resetMemoForTests: () => void;
}

/**
 * Per-route writer-memoisation factory.
 *
 * Each consumer route gets its own {@link WriterMemo} so that:
 * - The H-2 middleware sees a stable `MiddlewareWriter` reference at
 *   construction time (its `writer` option is synchronous).
 * - The actual H-3 store resolution stays async (per H-3's
 *   `getEvidenceWriter` contract) — the indirection-writer's `append`
 *   resolves the H-3 writer on first call and caches it.
 * - Tests can reset each route's memo independently without cross-test
 *   bleed via `__resetMemoForTests`.
 *
 * On a `null` resolution (no store configured / `EVIDENCE_WORM_STORE`
 * unset), the indirection-writer simply no-ops — H-2's stub already logs
 * in that path so we don't double-log here.
 */
export function createWriterMemo(): WriterMemo {
  let memoizedWriter: MiddlewareWriter | null = null;
  let memoizedWriterPromise: Promise<MiddlewareWriter | null> | null = null;

  async function resolveDefaultWriter(): Promise<MiddlewareWriter | null> {
    const h3 = await getEvidenceWriter();
    return h3 ? adaptH3Writer(h3) : null;
  }

  async function getOrInitWriter(): Promise<MiddlewareWriter | null> {
    if (memoizedWriter) return memoizedWriter;
    if (!memoizedWriterPromise) {
      memoizedWriterPromise = resolveDefaultWriter().then((w) => {
        memoizedWriter = w;
        return w;
      });
    }
    return memoizedWriterPromise;
  }

  const ROUTE_WRITER: MiddlewareWriter = {
    async append(record: EvidenceRecord, requestId: string): Promise<void> {
      const writer = await getOrInitWriter();
      if (!writer) return;
      await writer.append(record, requestId);
    },
  };

  function __resetMemoForTests(): void {
    memoizedWriter = null;
    memoizedWriterPromise = null;
  }

  return { ROUTE_WRITER, __resetMemoForTests };
}
