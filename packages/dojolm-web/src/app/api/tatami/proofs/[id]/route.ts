// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/tatami/proofs/[id] — single-proof read returning a self-verifiable,
 * customer-safe receipt (the v0 thesis artifact), NOT the raw stored proof.
 *
 * The persisted proof carries internal-only fields (`capturedBy`, input/output
 * hashes, non-`customer_safe` previews); the receipt is the defensible, shareable
 * projection — only `customer_safe` previews survive and internal linkage is
 * dropped. Returning the receipt by DEFAULT keeps this read least-privilege-safe
 * under `executions:read` (held by view-only members).
 *
 * S1 / TATAMI-PROOF-DETAIL-VIEW — an ELEVATED reader (admin/operator/moderator/
 * engagement-approver) may request the FULL stored proof via `?view=proof` (for the
 * /admin internal detail view: `capturedBy`, input/output hashes, all preview tiers,
 * the B7 `hashLink`). Fail-closed, mirroring the case-detail M-2 gate: a member, an
 * unrecognised/absent role, OR any request WITHOUT `?view=proof` receives the
 * customer-safe receipt — never the full record. The proof references source evidence
 * by id/hash and its previews are redacted, so even the full proof carries no raw
 * payload; the gate is about internal-attribution granularity, not payload exposure.
 *
 * RBAC: `executions:read`. GET is not state-mutating ⇒ `withAuth` skips CSRF. The
 * org id is server-trusted (B5): resolved here, never from the request/URL, so a
 * proof owned by another org is never returned (404 — indistinguishable from a
 * genuinely unknown id, which also avoids a cross-org existence oracle).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import {
  buildReceipt,
  getTatamiCaseStore,
  getTatamiProofStore,
  isTatamiProofId,
  renderReceiptJson,
  renderReceiptMarkdown,
  resolveTatamiOrgId,
  verifyProofAnchor,
  type ReceiptRisk,
} from '@/lib/tatami';

/**
 * S1 — only elevated readers may see the FULL stored proof. Everyone else with
 * `executions:read` (members) — and, fail-closed, any unrecognised/absent role — gets
 * the customer-safe receipt. Same role set as the case-detail gate (M-2, cases/[id]).
 */
function proofReaderSeesFullProof(role: string | undefined): boolean {
  return role === 'admin' || role === 'operator' || role === 'moderator' || role === 'engagement-approver';
}

/**
 * §9.10 — the receipt's risk assessment (mitigation / residual risk / verifier note)
 * is sourced from the proof's LINKED CASE. A proof is immutable, so those operator
 * conclusions live on the mutable case (authored via PATCH cases/[id]); the link is
 * case→proof (the case carries `proofIds`, populated by the attach flow), so we
 * REVERSE-resolve via the store's `proofId` filter (S4 / TATAMI-PROOF-REVERSE-CASE-LINK)
 * — newest linking case wins. The list projection drops the (potentially long) risk
 * notes, so we re-read the full case by id. Org-scoped throughout (B5): a case owned
 * by another org can never surface here. Returns undefined for an unlinked proof or a
 * case with no annotations; `buildReceipt` additionally strips blank notes.
 */
async function resolveLinkedCaseRisk(
  orgId: string,
  proofId: string,
): Promise<ReceiptRisk | undefined> {
  const store = getTatamiCaseStore();
  const { items } = await store.list(orgId, { limit: 1, proofId });
  const linkId = items[0]?.id;
  if (linkId === undefined) return undefined;
  const linked = await store.getById(orgId, linkId);
  if (linked === null) return undefined;
  // Match the documented contract: undefined (not an all-undefined object) when the
  // linking case carries no annotations, so `risk` is truthy only when there's content.
  if (
    linked.mitigation === undefined
    && linked.residualRisk === undefined
    && linked.verifierNote === undefined
  ) {
    return undefined;
  }
  return {
    mitigation: linked.mitigation,
    residualRisk: linked.residualRisk,
    verifierNote: linked.verifierNote,
  };
}

export const GET = withAuth(
  async (request: NextRequest, { params, user }) => {
    const id = params?.id ?? '';
    // Length-bounded then grammar-checked against the canonical proof-id minter.
    if (!isTatamiProofId(id)) {
      return NextResponse.json({ error: 'Invalid proof id' }, { status: 400 });
    }
    try {
      // orgId is server-trusted (B5) — resolved here, never from the request/URL.
      const orgId = resolveTatamiOrgId();
      const proof = await getTatamiProofStore().getById(orgId, id);
      if (proof === null) {
        return NextResponse.json({ error: 'Proof not found' }, { status: 404 });
      }
      // L-1 — enforce the B7 self-anchor at READ time, not just at write. A proof is
      // captured-once/immutable; if its stored content no longer matches its hashLink,
      // the row was tampered with at rest (or corrupted), so we refuse to serve it. 409
      // = the stored state conflicts with its own integrity anchor. Runs BEFORE the view
      // branch so neither the receipt NOR the full proof is minted over a tampered row.
      // We log for forensics but never echo the proof's internals.
      if (!verifyProofAnchor(proof)) {
        console.error('[tatami] proof anchor verification failed at read:', proof.id);
        return NextResponse.json({ error: 'Proof integrity check failed' }, { status: 409 });
      }
      // P0.2 / DoD#7 — receipt EXPORT. `?format=markdown|json` renders the customer-safe
      // receipt as a downloadable file (the missing UI half of the self-verifiable receipt —
      // the renderers exist in lib/tatami/receipt but had no caller). Independent of the
      // `?view=proof` elevation gate: the receipt is customer-safe by construction (no raw
      // payload, no `capturedBy`), so any `executions:read` reader may export it. The render
      // functions are server-only (they pull the node:crypto hash chain), so the client
      // fetches THIS endpoint rather than rendering the receipt itself. Unknown `format`
      // values fall through to the normal JSON receipt response below.
      // §9.10 — resolve the linked case's customer-safe risk annotations once; both
      // the export and the default-receipt paths fold them into the receipt.
      const risk = await resolveLinkedCaseRisk(orgId, proof.id);
      const format = request.nextUrl.searchParams.get('format');
      if (format === 'markdown' || format === 'json') {
        const receipt = buildReceipt(proof, { generatedAt: new Date().toISOString(), risk });
        const isMarkdown = format === 'markdown';
        return new NextResponse(
          isMarkdown ? renderReceiptMarkdown(receipt) : renderReceiptJson(receipt),
          {
            headers: {
              'Content-Type': isMarkdown
                ? 'text/markdown; charset=utf-8'
                : 'application/json; charset=utf-8',
              'Content-Disposition': `attachment; filename="tatami-receipt-${proof.id}.${isMarkdown ? 'md' : 'json'}"`,
              'X-Content-Type-Options': 'nosniff',
              'Cache-Control': 'no-store',
            },
          },
        );
      }
      // S1 — elevated reader + explicit `?view=proof` ⇒ the full stored proof. Default,
      // member, and unknown-role all fall through to the receipt (fail-closed).
      //
      // PREVIEW-TIER POLICY (deliberate): the full proof is returned verbatim, so an
      // elevated reader sees `proof.previews` at ALL tiers, not just `customer_safe`.
      // This is intentional — the internal detail view is exactly the place to surface
      // `internal_redacted` context. It is safe because every preview's `text` is already
      // redacted (pseudonymous: salted/keyed/truncated — never the raw payload), the
      // source is referenced by id/hash, and `capturedBy` is a hashed operator id. Today
      // only the scanner adapter emits previews and only at `customer_safe`. Before an
      // adapter that emits richer (`raw_sealed`) tiers ships, revisit whether those tiers
      // should be gated further or stay on this elevated-only view.
      const wantsFullProof = request.nextUrl.searchParams.get('view') === 'proof';
      if (wantsFullProof && proofReaderSeesFullProof(user?.role)) {
        return NextResponse.json(
          { proofId: proof.id, proof },
          { headers: { 'X-Content-Type-Options': 'nosniff' } },
        );
      }
      // The receipt is a deterministic projection of the (immutable) proof, but
      // `generatedAt` is the render time — so each GET returns a receipt with a
      // fresh `generatedAt` and therefore a different B7 `chain`. That is by
      // design: the receipt is NOT persisted and each one self-verifies
      // independently (verifyReceipt recomputes from the receipt's own fields).
      const receipt = buildReceipt(proof, { generatedAt: new Date().toISOString(), risk });
      return NextResponse.json(
        { proofId: proof.id, receipt },
        { headers: { 'X-Content-Type-Options': 'nosniff' } },
      );
    } catch (err) {
      console.error('[tatami] proof read failed:', err);
      return NextResponse.json({ error: 'Proof unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'read' },
);
