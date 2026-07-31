// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/tatami/cases/[id] — single-case read returning the full org-scoped
 * {@link TatamiCase} (the case "detail" the Room renders).
 *
 * Unlike a proof — whose stored form carries internal-only fields, so its [id] route
 * returns the customer-safe *receipt* — a case carries no raw payloads: `owner` is a
 * hashed operator id, and the proofs it references hold (and redact) the evidence.
 * The full case is therefore safe to return under `executions:read`. A customer-safe
 * case *export* is a later EE concern (tatami-vault, Epic 9).
 *
 * M-2 — `executions:read` is held by view-only MEMBERS too, but the full case carries
 * operator attribution (`owner`), the free-text `hypothesis`, and the raw `proofIds[]`.
 * Members get the bounded `toCaseSummary` projection (the same row shape the list route
 * returns: owner / hypothesis dropped, proofIds → proofCount); admin / operator (and any
 * other elevated reader) get the full case. Default is FAIL-CLOSED — an unrecognised or
 * missing role receives the summary, never the full record.
 *
 * RBAC: `executions:read`. GET is not state-mutating ⇒ `withAuth` skips CSRF. The org
 * id is server-trusted (B5): resolved here, never from the request/URL, so a case
 * owned by another org is never returned (404 — indistinguishable from a genuinely
 * unknown id, which also avoids a cross-org existence oracle).
 */

import { NextRequest, NextResponse } from 'next/server';
import { auditLog } from '@/lib/audit-logger';
import type { SessionUser } from '@/lib/auth/session';
import { withAuth } from '@/lib/auth/route-guard';
import {
  CaseStatusTransitionError,
  getTatamiCaseStore,
  hashTatamiOwner,
  isTatamiCaseId,
  parseTatamiCasePatch,
  patchTatamiCase,
  resolveTatamiOrgId,
  toCaseSummary,
} from '@/lib/tatami';
import { enforceTatamiWriteRateLimit } from '@/lib/tatami/rate-limit';

/**
 * Only elevated readers see the full case. Everyone else with `executions:read`
 * (members) — and, fail-closed, any unrecognised/absent role — gets the summary.
 */
function caseReaderSeesFullRecord(role: string | undefined): boolean {
  return role === 'admin' || role === 'operator' || role === 'moderator' || role === 'engagement-approver';
}

export const GET = withAuth(
  async (_request: NextRequest, { params, user }: { params?: Record<string, string>; user: SessionUser }) => {
    const id = params?.id ?? '';
    // Length-bounded then grammar-checked against the canonical case-id minter.
    if (!isTatamiCaseId(id)) {
      return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
    }
    try {
      // orgId is server-trusted (B5) — resolved here, never from the request/URL.
      const orgId = resolveTatamiOrgId();
      const tatamiCase = await getTatamiCaseStore().getById(orgId, id);
      if (tatamiCase === null) {
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }
      // M-2 — least-privilege projection for view-only members (fail-closed default).
      const projected = caseReaderSeesFullRecord(user?.role)
        ? tatamiCase
        : toCaseSummary(tatamiCase);
      return NextResponse.json(
        { caseId: tatamiCase.id, case: projected },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[tatami] case read failed:', err);
      return NextResponse.json({ error: 'Case unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'read' },
);

/**
 * PATCH /api/tatami/cases/[id] — operator edit of a case (P1.8 / TATAMI-CASE-PATCH).
 *
 * Editable surface: title, hypothesis, severity, tags, status (everything the
 * operator authored at create, plus status transitions). Server-owned fields
 * (id / orgId / owner / createdAt / proofIds / linkedModules / schemaVersion)
 * are NEVER editable here; the parser drops them and the builder re-asserts
 * them from the existing record (defense-in-depth).
 *
 * `updatedAt` advances on any real change; `closedAt` is stamped when the
 * status transitions into a terminal state (closed/archived), cleared on the
 * way out, preserved across moves within terminal states — see
 * {@link patchTatamiCase}.
 *
 * RBAC: `executions:create` — the same verb the create/attach/detach routes
 * reuse (admin + operator, NOT view-only members). A dedicated `tatami`/
 * `evidence` resource is the proper long-term home (FUTURE-IMPLEMENTATIONS:
 * TATAMI-RBAC-RESOURCE) but is avoided here to keep the diff off the shared
 * RBAC matrix. PATCH is state-mutating ⇒ withAuth enforces CSRF by default.
 *
 * Persistence: the case store's `put` is an append-versioned upsert (PR-7),
 * so a successful patch records a NEW version of the same id; `getById`
 * resolves the newest. No in-place row rewrite, no proof-side mutation
 * (the proof's B7 anchor is untouched — see the case-side attach/detach
 * design).
 */
export const PATCH = withAuth(
  async (
    request: NextRequest,
    { params, user }: { params?: Record<string, string>; user: SessionUser },
  ): Promise<NextResponse> => {
    // M-3 — per-caller write throttle (≈60/min) before any work runs.
    const limited = await enforceTatamiWriteRateLimit(request);
    if (limited !== null) return limited;

    const id = params?.id ?? '';
    if (!isTatamiCaseId(id)) {
      return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const parsed = parseTatamiCasePatch(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    try {
      // orgId is server-trusted (B5) — resolved here, never from the request/URL.
      const orgId = resolveTatamiOrgId();
      const store = getTatamiCaseStore();
      const existing = await store.getById(orgId, id);
      if (existing === null) {
        // Cross-org id is indistinguishable from a genuinely unknown id — same
        // 404 (no cross-org existence oracle).
        return NextResponse.json({ error: 'Case not found' }, { status: 404 });
      }

      const now = new Date().toISOString();
      let next;
      try {
        next = patchTatamiCase({ tatamiCase: existing, patch: parsed.patch, now });
      } catch (err) {
        if (err instanceof CaseStatusTransitionError) {
          // HC-2.C Lane B (Product-1) — archived → * is forbidden. 422 (the
          // request is well-formed but contradicts the state machine).
          return NextResponse.json(
            { error: `Case is archived; status transitions are not allowed (${err.from} → ${err.to})` },
            { status: 422 },
          );
        }
        throw err;
      }
      // True no-op (patch == existing on every field) — same reference. Skip the
      // write so `updatedAt` does not advance and the store doesn't grow a
      // version that records nothing. Audit-log is skipped too — there is no
      // event worth recording for a confirmed no-op (changedFields would be
      // empty by construction).
      const noChange = next === existing;
      if (!noChange) {
        await store.put(next);
        // HC-2.C Lane A (Security-2) — name-only audit. The `parsed.patch`
        // keys ARE the changed-field set (the parser only retains explicitly
        // sent editable keys; smuggled server-owned keys are stripped). We
        // do NOT log raw values (R-T1; hypothesis may carry pasted PII).
        await auditLog.tatamiCasePatch({
          operatorId: hashTatamiOwner(user.id),
          caseId: next.id,
          orgId,
          changedFields: Object.keys(parsed.patch),
        });
      }
      return NextResponse.json(
        { caseId: next.id, case: next, changed: !noChange },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[tatami] case patch failed:', err);
      return NextResponse.json({ error: 'Case patch failed' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'create' },
);
