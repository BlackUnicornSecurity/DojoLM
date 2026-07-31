// SPDX-License-Identifier: Apache-2.0
/**
 * /api/tatami/explain — evidence-grounded explainer (Explain lane / Kaisetsu 解説,
 * OSS Epic 5 / P2.4).
 *
 * POST — explain a question over the operator's chosen proofs/cases. The route
 * loads the requested evidence (org-scoped, B5), builds a CUSTOMER-SAFE context
 * pack, asks the model to explain over it, and returns a grounding-contract-valid
 * answer (cited proof-ids ⊆ the pack; suggestion pills reference only verified
 * routes; an ungroundable reply degrades to the missing-evidence pattern). It
 * generates no evidence values and persists nothing.
 *
 * RBAC: `executions:read` — explaining existing evidence is a read, not a write
 * (no persistence). Being a POST, `withAuth` still enforces CSRF. The model call
 * carries cost, so the write rate-limiter bucket gates it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getTatamiCaseStore, getTatamiProofStore, resolveTatamiOrgId } from '@/lib/tatami';
import { enforceTatamiWriteRateLimit } from '@/lib/tatami/rate-limit';
import { createDefaultExplainModelClient, parseExplainBody, runExplain } from './_run';

const handler = async (request: NextRequest): Promise<NextResponse> => {
  const limited = await enforceTatamiWriteRateLimit(request);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
  }

  const parsed = parseExplainBody(body);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid or missing question' }, { status: 400 });
  }

  try {
    const orgId = resolveTatamiOrgId();
    const proofStore = getTatamiProofStore();
    const caseStore = getTatamiCaseStore();
    const answer = await runExplain(parsed, {
      model: createDefaultExplainModelClient(),
      loadProofs: (ids) => proofStore.getByIds(orgId, ids),
      loadCases: async (ids) =>
        (await Promise.all(ids.map((id) => caseStore.getById(orgId, id)))).filter(
          (c): c is NonNullable<typeof c> => c !== null,
        ),
    });
    return NextResponse.json({ answer }, { headers: { 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return NextResponse.json({ error: 'Explain unavailable' }, { status: 500 });
  }
};

export const POST = withAuth(handler, { resource: 'executions', action: 'read' });
