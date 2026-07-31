// SPDX-License-Identifier: Apache-2.0
/**
 * /api/tatami/cases/[id]/proofs — case↔proof link management (case-side; D-H4-2).
 *
 * GET — the case's linked-proof timeline: resolve all of the case's `proofIds` to
 * bounded, customer-safe summaries in ONE org-scoped store pass (`getByIds`), ordered
 * chronologically and capped to MAX_CASE_PROOF_PAGE. This is the read the case room
 * (CaseRoomDrawer) consumes — it replaces a per-proof fetch fan-out (an N+1) with a
 * single request. POST — attach a captured proof to a case (PR-7). DELETE — detach a
 * proof from a case (S3 / TATAMI-CASE-DETACH, the inverse). The two mutations touch
 * ONLY the case (`proofIds` + `linkedModules` + `updatedAt`); the PROOF is never
 * touched, so its B7 self-anchor stays valid — captured evidence is immutable, the
 * mutable case carries the linkage. (A proof may be filed under more than one case; the
 * case owns the reference. Founder-ruled 2026-06-18: case-side.)
 *
 * POST (attach):
 *   1. validate case id (URL) + proof id (body)        (grammar — 400 at the edge)
 *   2. server-trusted orgId                            (tatami/org — never client; B5)
 *   3. load case + proof under that org                (404 if either missing / cross-
 *                                                       org — same response, no oracle)
 *   4. attach (pure, immutable) + persist iff changed  (idempotent — re-attach no-ops)
 *
 * DELETE (detach):
 *   1. validate case id (URL) + proof id (body)        (grammar — 400 at the edge)
 *   2. server-trusted orgId                            (tatami/org — never client; B5)
 *   3. load case under that org                        (404 if missing / cross-org)
 *   4. if not linked ⇒ idempotent no-op (no write)     (detaching an absent proof = 200)
 *   5. load the REMAINING proofs (org-scoped) to recompute `linkedModules`, then detach
 *      (pure, immutable) + persist                     (append-versioned upsert)
 *
 * RBAC: `executions:create` — the mutation verb the case/proof create + attach routes
 * reuse (admin + operator, NOT view-only members); detach is a mutation, so it shares
 * it. POST/DELETE are state-mutating ⇒ `withAuth` enforces CSRF. A dedicated `tatami`
 * resource stays deferred (FUTURE: TATAMI-RBAC-RESOURCE); the M-3 write rate-limit
 * applies to both verbs.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SessionUser } from '@/lib/auth/session';
import { withAuth } from '@/lib/auth/route-guard';
import {
  attachProofToCase,
  detachProofFromCase,
  getTatamiCaseStore,
  getTatamiProofStore,
  isTatamiCaseId,
  isTatamiProofId,
  MAX_CASE_PROOF_IDS,
  MAX_CASE_PROOF_PAGE,
  resolveTatamiOrgId,
  toProofSummary,
  verifyProofAnchor,
  type TatamiProof,
} from '@/lib/tatami';
import { enforceTatamiWriteRateLimit } from '@/lib/tatami/rate-limit';

const attachHandler = async (
  request: NextRequest,
  { params }: { params?: Record<string, string>; user: SessionUser },
): Promise<NextResponse> => {
  // M-3 — per-caller write throttle (≈60/min) before any work runs.
  const limited = await enforceTatamiWriteRateLimit(request);
  if (limited !== null) return limited;

  const caseId = params?.id ?? '';
  // Length-bounded then grammar-checked against the canonical case-id minter.
  if (!isTatamiCaseId(caseId)) {
    return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
  const proofId = (body as { proofId?: unknown } | null)?.proofId;
  if (typeof proofId !== 'string' || !isTatamiProofId(proofId)) {
    return NextResponse.json({ error: 'Invalid or missing proofId' }, { status: 400 });
  }

  try {
    // orgId is server-trusted (B5) — resolved here, NEVER from the request/URL/body.
    const orgId = resolveTatamiOrgId();
    const caseStore = getTatamiCaseStore();

    const tatamiCase = await caseStore.getById(orgId, caseId);
    if (tatamiCase === null) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    // The proof must exist in the SAME org: this prevents a dangling link AND enforces
    // B5 — a cross-org (or unknown) proof reads as null → 404, no cross-org oracle.
    const proof = await getTatamiProofStore().getById(orgId, proofId);
    if (proof === null) {
      return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
    }

    // Idempotent: if the proof is already filed under this case, return it unchanged
    // with NO write (no new log row, list position unmoved, updatedAt preserved). This
    // runs BEFORE the cap check so a re-attach at the cap stays a safe 200 no-op.
    if (tatamiCase.proofIds.includes(proofId)) {
      return NextResponse.json(
        { caseId: tatamiCase.id, case: tatamiCase },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    }

    // H-2 — refuse a NEW link once the case is at MAX_CASE_PROOF_IDS. Without this the
    // case grows until its serialized row exceeds the store's MAX_ROW_BYTES and every
    // future put() throws, wedging the case permanently. 422 = semantically valid
    // request the server won't apply (attachProofToCase also throws as a backstop).
    if (tatamiCase.proofIds.length >= MAX_CASE_PROOF_IDS) {
      return NextResponse.json(
        { error: `Case has reached the maximum of ${MAX_CASE_PROOF_IDS} linked proofs` },
        { status: 422, headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    }

    const now = new Date().toISOString();
    const updated = attachProofToCase({ tatamiCase, proof, now });
    // Append-versioned upsert — getById/list resolve the newest version (see store).
    await caseStore.put(updated);

    return NextResponse.json(
      { caseId: updated.id, case: updated },
      { headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] proof attach failed:', err);
    return NextResponse.json({ error: 'Proof attach failed' }, { status: 500 });
  }
};

export const POST = withAuth(attachHandler, { resource: 'executions', action: 'create' });

const detachHandler = async (
  request: NextRequest,
  { params }: { params?: Record<string, string>; user: SessionUser },
): Promise<NextResponse> => {
  // M-3 — per-caller write throttle (≈60/min) before any work runs.
  const limited = await enforceTatamiWriteRateLimit(request);
  if (limited !== null) return limited;

  const caseId = params?.id ?? '';
  // Length-bounded then grammar-checked against the canonical case-id minter.
  if (!isTatamiCaseId(caseId)) {
    return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }
  const proofId = (body as { proofId?: unknown } | null)?.proofId;
  if (typeof proofId !== 'string' || !isTatamiProofId(proofId)) {
    return NextResponse.json({ error: 'Invalid or missing proofId' }, { status: 400 });
  }

  try {
    // orgId is server-trusted (B5) — resolved here, NEVER from the request/URL/body.
    const orgId = resolveTatamiOrgId();
    const caseStore = getTatamiCaseStore();

    const tatamiCase = await caseStore.getById(orgId, caseId);
    if (tatamiCase === null) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Idempotent: if the proof is not filed under this case, return it unchanged with NO
    // write (no new log row, updatedAt preserved). Detaching an already-absent proof is
    // a safe 200 no-op — symmetric with attach's already-linked short-circuit. NB: we do
    // NOT 404 on an unlinked proof (that would leak whether the proof exists anywhere).
    if (!tatamiCase.proofIds.includes(proofId)) {
      return NextResponse.json(
        { caseId: tatamiCase.id, case: tatamiCase },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    }

    // Recompute `linkedModules` from the proofs that REMAIN after removal — a module
    // stays linked only while a remaining proof still sources it. Load them org-scoped
    // (B5); an unresolvable remaining proof (deleted / retention-expired) contributes no
    // module, so a module sourced only by such a proof drops. Bounded by the case's
    // existing proofIds (≤ MAX_CASE_PROOF_IDS). (FUTURE: move this derivation to read
    // time to avoid the per-detach fan-out — TATAMI-PROOF-REVERSE-CASE-LINK relatives.)
    const remainingIds = tatamiCase.proofIds.filter((id) => id !== proofId);
    const proofStore = getTatamiProofStore();
    const loaded = await Promise.all(remainingIds.map((pid) => proofStore.getById(orgId, pid)));
    const remainingProofs = loaded.filter((p): p is TatamiProof => p !== null);

    const now = new Date().toISOString();
    const updated = detachProofFromCase({ tatamiCase, proofId, remainingProofs, now });
    // Append-versioned upsert — getById/list resolve the newest (smaller) version.
    await caseStore.put(updated);

    return NextResponse.json(
      { caseId: updated.id, case: updated },
      { headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] proof detach failed:', err);
    return NextResponse.json({ error: 'Proof detach failed' }, { status: 500 });
  }
};

export const DELETE = withAuth(detachHandler, { resource: 'executions', action: 'create' });

/**
 * M-2 — a case's linked-proof SET is part of the elevated projection: cases/[id] drops
 * raw `proofIds` for view-only members, so the timeline that enumerates them is gated to
 * the same elevated readers (admin/operator/moderator/engagement-approver). Fail-closed.
 */
function caseReaderSeesLinkedProofs(role: string | undefined): boolean {
  return role === 'admin' || role === 'operator' || role === 'moderator' || role === 'engagement-approver';
}

/**
 * GET /api/tatami/cases/[id]/proofs — the case's linked-proof timeline.
 *
 * RBAC: `executions:read` (read-only — held by members too). GET is not state-mutating ⇒
 * `withAuth` skips CSRF. The org id is server-trusted (B5): resolved here, never from the
 * request — so neither the case nor any proof of another org is ever returned (404 /
 * omission, no cross-org existence oracle). The response is the bounded `toProofSummary`
 * projection (never previews / raw refs / capturedBy); L-1 — each proof's B7 anchor is
 * verified at read and a tampered-at-rest row is omitted (the `total` discloses the gap).
 */
const listProofsHandler = async (
  _request: NextRequest,
  { params, user }: { params?: Record<string, string>; user: SessionUser },
): Promise<NextResponse> => {
  const caseId = params?.id ?? '';
  // Length-bounded then grammar-checked against the canonical case-id minter.
  if (!isTatamiCaseId(caseId)) {
    return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });
  }

  try {
    // orgId is server-trusted (B5) — resolved here, NEVER from the request/URL.
    const orgId = resolveTatamiOrgId();
    const tatamiCase = await getTatamiCaseStore().getById(orgId, caseId);
    if (tatamiCase === null) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // `total` = the authoritative linked count; lets the room disclose "showing X of N"
    // without the client over-fetching. Safe for members too — it equals the `proofCount`
    // they already get from cases/[id] (toCaseSummary).
    const total = tatamiCase.proofIds.length;

    // M-2 — fail-closed: a member / unknown role gets an empty timeline + the total, never
    // the linkage (which proofs are filed under the case is the withheld bit).
    if (!caseReaderSeesLinkedProofs(user?.role)) {
      return NextResponse.json(
        { caseId: tatamiCase.id, proofs: [], total },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    }

    // ONE org-scoped store pass for the WHOLE linkage (was a per-proof N+1 in the room).
    const proofs = await getTatamiProofStore().getByIds(orgId, tatamiCase.proofIds);
    // L-1 — verify each B7 anchor at read; omit a tampered-at-rest row (the count
    // discloses the gap). Aggregate the failures into ONE log line — a mass-corruption
    // event in a case at the 500-proof cap must not flood logs with 500 entries / GET.
    const verified: TatamiProof[] = [];
    let tampered = 0;
    for (const p of proofs) {
      if (verifyProofAnchor(p)) verified.push(p);
      else tampered += 1;
    }
    if (tampered > 0) {
      // caseId only (it is in the URL already) — never echo proof internals.
      console.error(`[tatami] case-proofs read: ${tampered} linked proof(s) failed B7 anchor verification and were omitted (case ${tatamiCase.id})`);
    }
    const summaries = verified
      .map(toProofSummary)
      // Chronological (oldest first — a case accumulates evidence over time); `id`
      // tiebreaks for a stable order under equal timestamps.
      .sort((a, b) =>
        a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1,
      )
      .slice(0, MAX_CASE_PROOF_PAGE);

    return NextResponse.json(
      { caseId: tatamiCase.id, proofs: summaries, total },
      { headers: { 'X-Content-Type-Options': 'nosniff' } },
    );
  } catch (err) {
    console.error('[tatami] case proofs read failed:', err);
    return NextResponse.json({ error: 'Case proofs unavailable' }, { status: 500 });
  }
};

export const GET = withAuth(listProofsHandler, { resource: 'executions', action: 'read' });
