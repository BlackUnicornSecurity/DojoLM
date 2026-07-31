// SPDX-License-Identifier: Apache-2.0
/**
 * /api/tatami/proofs — Tatami proof routes (OSS, Epic 2).
 *
 * POST — capture route (below); GET — newest-first list of org-scoped proof
 * summaries (B5; a bounded projection that never carries previews or raw refs).
 *
 * --- POST (capture) ---
 *
 * The v0 thesis payoff: capture a selected `ScanRunRecord` as a persisted,
 * org-scoped `TatamiProof` and return a self-verifiable customer-safe receipt
 * (`scan run → proof → receipt`). All primitives are reused — this is wiring:
 *   1. server-trusted orgId         (tatami/org — never client input; B5)
 *   2. read the run                 (scan-runs store, org-agnostic source today)
 *   3. complete + anchor the proof  (tatami/capture → adapter Partial + B7 link)
 *   4. persist                      (org-scoped proof store; validate-before-write)
 *   5. receipt                      (caller-supplied deterministic generatedAt)
 *
 * RBAC: `executions:create` — capturing an execution-derived evidence artifact.
 * Held by admin + operator, NOT member (read-only). A dedicated `tatami`/`evidence`
 * resource is the proper long-term home (see FUTURE-IMPLEMENTATIONS) but is avoided
 * here to keep the diff off the shared RBAC matrix.
 *
 * Scope notes (v0):
 * - No `withEvidence` wrap: this route writes a Tatami proof, it does not execute
 *   a scanner run, so it is not a WORM evidence consumer.
 * - Capture is NOT audit-logged yet (no fitting `auditLog` method; adding one is a
 *   shared-file change deferred to a follow-up). The persisted proof + its B7
 *   anchor are the durable record; the route is RBAC-gated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getScanRunsStore } from '@/lib/scan-runs';
import { resolveRequestOperator } from '@/lib/evidence/route-helpers';
import {
  captureScanRunProof,
  getTatamiProofStore,
  isTatamiProofId,
  mintProofId,
  resolveTatamiOrgId,
  scanRunBelongsToOperator,
} from '@/lib/tatami';
import { enforceTatamiWriteRateLimit } from '@/lib/tatami/rate-limit';
import { withTatamiTiming } from '@/lib/tatami/metrics';
import type { TatamiProofListFilter } from '@/lib/tatami/store/types';
import type {
  TatamiRedactionTier,
  TatamiSourceModule,
  TatamiTrustState,
} from '@/lib/tatami/types';

/** Same shape the scan-runs builder mints (`r-<base36>-<10 hex>`). */
const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;
/** Defensive upper bound on the inbound run id string before the regex test. */
const MAX_RUN_ID_LEN = 200;
/** List pagination bounds (mirrors /api/scan/history). */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// P1.2 — closed allowlists for the Room list filters. A present-but-unrecognised
// value is a 400 (fail fast, same posture as the cursor grammar check) — never a
// silent no-op that would mislead the operator into thinking a filter applied.
const FILTER_MODULES: ReadonlySet<string> = new Set<TatamiSourceModule>([
  'scanner', 'buki', 'jutsu', 'arena', 'hattori', 'kotoba', 'sengoku', 'kagami', 'bushido',
]);
const FILTER_TRUST: ReadonlySet<string> = new Set<TatamiTrustState>([
  'draft', 'sealed', 'verified', 'partially_verified', 'redacted',
  'exported', 'challenged', 'superseded', 'broken_chain',
]);
const FILTER_REDACTION: ReadonlySet<string> = new Set<TatamiRedactionTier>([
  'raw_sealed', 'internal_redacted', 'customer_safe', 'sealed_evidence_packet',
]);
const FILTER_SEVERITY: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low', 'info']);

/**
 * Validate one optional filter param against its closed set. `{ ok:false }` when
 * the param is present but unrecognised (→ 400); `value: undefined` when absent.
 */
function parseFilterParam<T extends string>(
  raw: string | null,
  allowed: ReadonlySet<string>,
): { ok: true; value: T | undefined } | { ok: false } {
  if (raw === null) return { ok: true, value: undefined };
  return allowed.has(raw) ? { ok: true, value: raw as T } : { ok: false };
}

const handler = async (request: NextRequest): Promise<NextResponse> => {
  // M-3 — per-caller write throttle (≈60/min) before any work runs.
  const limited = await enforceTatamiWriteRateLimit(request);
  if (limited !== null) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
  }

  const { runId } = body as { runId?: unknown };
  if (typeof runId !== 'string' || runId.length === 0 || runId.length > MAX_RUN_ID_LEN || !RUN_ID.test(runId)) {
    return NextResponse.json({ error: 'Invalid or missing runId' }, { status: 400 });
  }

  try {
    const record = await getScanRunsStore().getById(runId);
    if (record === null) {
      return NextResponse.json({ error: 'Scan run not found' }, { status: 404 });
    }

    // H-1 — operator-scope the capture. scan-runs is org-agnostic today (no orgId
    // column), so a bare getById would let one operator capture another's run into the
    // shared org store (a multi-tenant IDOR). Until a real orgId lands on scan-runs
    // (FUTURE: SCAN-RUNS-ORG-COLUMN), the trust boundary is the per-caller operator hash
    // the run was recorded with: a caller may capture ONLY the runs they executed. We
    // return the same 404 as an unknown run so this never becomes a cross-operator
    // existence oracle. (Single-tenant deployments have one operator, so this is a
    // no-op there; it activates the moment a second operator/org shares the store.)
    if (!scanRunBelongsToOperator(record, resolveRequestOperator(request))) {
      return NextResponse.json({ error: 'Scan run not found' }, { status: 404 });
    }

    // orgId is server-trusted (B5) — resolved here, never read from the request.
    const orgId = resolveTatamiOrgId();
    const generatedAt = new Date().toISOString();
    const proofId = mintProofId();

    const { proof, receipt } = captureScanRunProof({
      record,
      orgId,
      proofId,
      generatedAt,
    });

    await getTatamiProofStore().put(proof);

    return NextResponse.json(
      { proofId: proof.id, receipt },
      { status: 201, headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] capture failed:', err);
    return NextResponse.json({ error: 'Capture failed' }, { status: 500 });
  }
};

// P2.5 — time the capture op (success rate + latency) under the SLO snapshot. The
// timing wrapper sits INSIDE withAuth so it measures the capture work, not auth/CSRF.
export const POST = withAuth(withTatamiTiming('proof.capture', handler), {
  resource: 'executions',
  action: 'create',
});

/**
 * GET /api/tatami/proofs — newest-first list of org-scoped proof summaries.
 *
 * RBAC: `executions:read` (admin/operator/member — read is view-only). GET is not
 * state-mutating, so `withAuth` skips CSRF. The org id is server-trusted (B5):
 * resolved here, NEVER from the request — a client-supplied org would be a cross-org
 * read. Summaries are a bounded projection (`toProofSummary`) and never carry
 * `previews` or raw source refs.
 *
 * Query:
 *   - limit  1..100 (default 20)
 *   - before exclusive proof-id cursor (validated against the proof-id grammar;
 *            an unknown cursor degrades to the first page in the store)
 */
const listHandler = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = request.nextUrl;
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT));
  const before = searchParams.get('before');
  // Length-bounded then grammar-checked (isTatamiProofId) — same defensive posture
  // as the POST runId guard; an over-long or malformed cursor is rejected, not run.
  if (before !== null && !isTatamiProofId(before)) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
  }

  // P1.2 — optional Room filters (module/severity/trust/redaction), each validated
  // against its closed set. A present-but-invalid value is a 400.
  const moduleF = parseFilterParam<TatamiSourceModule>(searchParams.get('module'), FILTER_MODULES);
  const severityF = parseFilterParam<string>(searchParams.get('severity'), FILTER_SEVERITY);
  const trustF = parseFilterParam<TatamiTrustState>(searchParams.get('trust'), FILTER_TRUST);
  const redactionF = parseFilterParam<TatamiRedactionTier>(searchParams.get('redaction'), FILTER_REDACTION);
  if (!moduleF.ok || !severityF.ok || !trustF.ok || !redactionF.ok) {
    return NextResponse.json({ error: 'Invalid filter' }, { status: 400 });
  }
  const filter: TatamiProofListFilter = {
    ...(moduleF.value !== undefined ? { module: moduleF.value } : {}),
    ...(severityF.value !== undefined ? { severity: severityF.value } : {}),
    ...(trustF.value !== undefined ? { trustState: trustF.value } : {}),
    ...(redactionF.value !== undefined ? { redactionTier: redactionF.value } : {}),
  };

  try {
    // orgId is server-trusted (B5) — resolved here, never read from the request.
    const orgId = resolveTatamiOrgId();
    // S6 — the store returns the page + the cursor for the next page (id of the last
    // row when more remain, else null). Echoed as `nextCursor` so the UI can "Load more".
    const { items, nextCursor } = await getTatamiProofStore().list(orgId, {
      limit,
      ...(before !== null ? { before } : {}),
      ...filter,
    });
    return NextResponse.json(
      { proofs: items, nextCursor },
      { headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] list failed:', err);
    return NextResponse.json({ error: 'Tatami proofs unavailable' }, { status: 500 });
  }
};

export const GET = withAuth(withTatamiTiming('proof.list', listHandler), {
  resource: 'executions',
  action: 'read',
});
