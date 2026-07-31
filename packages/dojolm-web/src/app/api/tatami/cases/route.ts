// SPDX-License-Identifier: Apache-2.0
/**
 * /api/tatami/cases — Tatami case routes (OSS, PR-6).
 *
 * POST — create an operator-authored case (org-scoped; B5). GET — newest-first list
 * of org-scoped case summaries (a bounded projection that drops owner / hypothesis /
 * raw proofIds). Mirrors the proof routes' shape, RBAC, and B5 posture.
 *
 * --- POST (create) ---
 *   1. parse + bound the operator fields   (tatami/case — fail-fast at the edge)
 *   2. server-trusted orgId                (tatami/org — never client input; B5)
 *   3. hashed operator attribution         (owner = hash(user.id); never a bearer)
 *   4. complete + validate                 (tatami/case → full TatamiCase)
 *   5. persist                             (org-scoped case store; validate-before-write)
 *
 * RBAC: `executions:create` — the same verb the proof capture route reuses (admin +
 * operator, NOT view-only members). A dedicated `tatami`/`evidence` resource is the
 * proper long-term home (FUTURE-IMPLEMENTATIONS: TATAMI-RBAC-RESOURCE) but is avoided
 * here to keep the diff off the shared RBAC matrix. A new case starts with no proofs;
 * the proof↔case attach path (D-H4-2) is a separate route.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SessionUser } from '@/lib/auth/session';
import { withAuth } from '@/lib/auth/route-guard';
import {
  buildTatamiCase,
  getTatamiCaseStore,
  hashTatamiOwner,
  isTatamiCaseId,
  isTatamiProofId,
  mintCaseId,
  parseTatamiCaseInput,
  resolveTatamiOrgId,
} from '@/lib/tatami';
import { enforceTatamiWriteRateLimit } from '@/lib/tatami/rate-limit';
import { withTatamiTiming } from '@/lib/tatami/metrics';
import type { TatamiCaseListFilter } from '@/lib/tatami/store/case-types';
import type { TatamiCaseStatus, TatamiSourceModule } from '@/lib/tatami/types';

/** List pagination bounds (mirrors /api/tatami/proofs). */
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// P1.2 — closed allowlists for the Room case filters (status/severity/module).
// A present-but-unrecognised value is a 400, mirroring the proofs route.
const FILTER_STATUS: ReadonlySet<string> = new Set<TatamiCaseStatus>([
  'open', 'investigating', 'mitigating', 'verified', 'closed', 'archived',
]);
const FILTER_MODULES: ReadonlySet<string> = new Set<TatamiSourceModule>([
  'scanner', 'buki', 'jutsu', 'arena', 'hattori', 'kotoba', 'sengoku', 'kagami', 'bushido',
]);
const FILTER_SEVERITY: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low', 'info']);

/** Validate one optional filter param against its closed set (mirrors proofs route). */
function parseFilterParam<T extends string>(
  raw: string | null,
  allowed: ReadonlySet<string>,
): { ok: true; value: T | undefined } | { ok: false } {
  if (raw === null) return { ok: true, value: undefined };
  return allowed.has(raw) ? { ok: true, value: raw as T } : { ok: false };
}

const createHandler = async (
  request: NextRequest,
  { user }: { params?: Record<string, string>; user: SessionUser },
): Promise<NextResponse> => {
  // M-3 — per-caller write throttle (≈60/min) before any work runs.
  const limited = await enforceTatamiWriteRateLimit(request);
  if (limited !== null) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = parseTatamiCaseInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    // orgId + owner are server-trusted (B5) — resolved here, NEVER from the request.
    // A client-supplied org would be a cross-org write; the operator identity (the
    // session user `withAuth` guarantees before this handler runs) is hashed before it
    // touches the store, so a raw bearer never lands in `owner`.
    const orgId = resolveTatamiOrgId();
    const owner = hashTatamiOwner(user.id);
    const now = new Date().toISOString();
    const caseId = mintCaseId();

    const tatamiCase = buildTatamiCase({ input: parsed.input, orgId, owner, caseId, now });
    await getTatamiCaseStore().put(tatamiCase);

    return NextResponse.json(
      { caseId: tatamiCase.id, case: tatamiCase },
      { status: 201, headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] case create failed:', err);
    return NextResponse.json({ error: 'Case create failed' }, { status: 500 });
  }
};

// P2.5 — time the case-create write op (success rate + latency), symmetric with
// proof.capture so neither write is invisible to the SLO snapshot.
export const POST = withAuth(withTatamiTiming('case.create', createHandler), {
  resource: 'executions',
  action: 'create',
});

/**
 * GET /api/tatami/cases — newest-first list of org-scoped case summaries.
 *
 * RBAC: `executions:read` (admin/operator/member — read is view-only). GET is not
 * state-mutating ⇒ `withAuth` skips CSRF. The org id is server-trusted (B5): resolved
 * here, NEVER from the request — a client-supplied org would be a cross-org read.
 * Summaries (`toCaseSummary`) drop `owner` / `hypothesis` and the raw `proofIds`
 * (→ `proofCount`).
 *
 * Query:
 *   - limit   1..100 (default 20)
 *   - before  exclusive case-id cursor (validated against the case-id grammar; an
 *             unknown cursor degrades to the first page, matching the proof contract)
 *   - proofId S4 reverse link — filter to cases referencing this proof (validated
 *             against the proof-id grammar; a well-formed unknown id ⇒ empty list).
 *             A read filter on the existing list, NOT a new route.
 */
const listHandler = async (request: NextRequest): Promise<NextResponse> => {
  const { searchParams } = request.nextUrl;
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT));
  const before = searchParams.get('before');
  if (before !== null && !isTatamiCaseId(before)) {
    return NextResponse.json({ error: 'Invalid cursor' }, { status: 400 });
  }
  // S4 — optional reverse-link filter (cases referencing this proof). Grammar-checked
  // like `before`, so an over-long or malformed id is rejected 400 (not run); a
  // well-formed unknown id ⇒ empty list. A read filter on the existing list — NOT a
  // new route (case→proof stays the source of truth; the proof is never mutated).
  const proofId = searchParams.get('proofId');
  if (proofId !== null && !isTatamiProofId(proofId)) {
    return NextResponse.json({ error: 'Invalid proofId' }, { status: 400 });
  }

  // P1.2 — optional Room filters (status/severity/module), each validated against its
  // closed set. A present-but-invalid value is a 400.
  const statusF = parseFilterParam<TatamiCaseStatus>(searchParams.get('status'), FILTER_STATUS);
  const severityF = parseFilterParam<string>(searchParams.get('severity'), FILTER_SEVERITY);
  const moduleF = parseFilterParam<TatamiSourceModule>(searchParams.get('module'), FILTER_MODULES);
  if (!statusF.ok || !severityF.ok || !moduleF.ok) {
    return NextResponse.json({ error: 'Invalid filter' }, { status: 400 });
  }
  const filter: TatamiCaseListFilter = {
    ...(statusF.value !== undefined ? { status: statusF.value } : {}),
    ...(severityF.value !== undefined ? { severity: severityF.value } : {}),
    ...(moduleF.value !== undefined ? { module: moduleF.value } : {}),
  };

  try {
    // orgId is server-trusted (B5) — resolved here, never read from the request.
    const orgId = resolveTatamiOrgId();
    // S6 — the store returns the page + the cursor for the next page (id of the last
    // row when more remain, else null). Echoed as `nextCursor` so the UI can "Load more".
    const { items, nextCursor } = await getTatamiCaseStore().list(orgId, {
      limit,
      ...(before !== null ? { before } : {}),
      ...(proofId !== null ? { proofId } : {}),
      ...filter,
    });
    return NextResponse.json(
      { cases: items, nextCursor },
      { headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] case list failed:', err);
    return NextResponse.json({ error: 'Tatami cases unavailable' }, { status: 500 });
  }
};

// P2.5 — time the case-list read latency under the SLO snapshot.
export const GET = withAuth(withTatamiTiming('case.list', listHandler), {
  resource: 'executions',
  action: 'read',
});
