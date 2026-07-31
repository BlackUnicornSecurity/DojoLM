// SPDX-License-Identifier: Apache-2.0
/**
 * PATCH /api/admin/api-keys/[id] — submit revoke OR rotate via TPA (YR.14.2).
 *
 * Both actions are gated by the YR.13.3 two-person-approval state
 * machine. The PATCH route SUBMITS a pending approval; the actual
 * revoke/rotate only fires when operator B confirms via
 * /api/admin/two-person-approval/[id]/confirm.
 *
 * Body shape: `{ action: 'revoke' | 'rotate', reason: string, ... }`.
 * For rotate, the operator additionally supplies `label` + `scopes`
 * + optional `expiresAt`; the new key's secret is NOT generated until
 * the executor runs (post-confirmation).
 *
 * Auth: admin role required (`withAuth({ role: 'admin' })`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { apiKeyRepo, API_KEY_SCOPES } from '@/lib/db/repositories/api-key.repository';
import { submitApproval } from '@/lib/two-person-approval/submit';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const SAFE_KEY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patchBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('revoke'),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    action: z.literal('rotate'),
    reason: z.string().min(1).max(500),
    label: z.string().min(1).max(100),
    scopes: z
      .array(z.enum(API_KEY_SCOPES as readonly [string, ...string[]]))
      .min(1)
      .max(8),
    expiresAt: z.string().datetime().optional(),
  }),
]);

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'PATCH, OPTIONS' },
  });
}

export const PATCH = withAuth(
  async (request: NextRequest, { params, user }) => {
    const id = params?.id ?? '';
    if (!SAFE_KEY_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid api-key id' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const operatorId = user?.id ?? '';
    if (!operatorId) {
      return NextResponse.json(
        { error: 'Operator identity required' },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const body = parsed.data;

    // Sentinel: the key must exist and be active. The TPA executor
    // re-checks this when operator B confirms (the gap window is
    // bounded by the approval TTL — typically minutes), but rejecting
    // a rotate/revoke against a missing or already-revoked key here
    // keeps the pending_approvals queue clean.
    const target = apiKeyRepo.findByIdSafe(id);
    if (!target) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    if (target.revoked_at !== null) {
      return NextResponse.json(
        { error: 'API key already revoked' },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    const result = body.action === 'revoke'
      ? submitApproval({
          actionType: 'API_KEY_REVOKE',
          payload: { keyId: id, reason: body.reason },
          primaryOperatorId: operatorId,
        })
      : submitApproval({
          actionType: 'API_KEY_ROTATE',
          payload: {
            prevKeyId: id,
            // Pass-1 BLOCKER fold-in: forward operator-supplied reason
            // so the rotate audit trail records WHY, not just WHAT.
            reason: body.reason,
            label: body.label,
            scopes: body.scopes,
            ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
          },
          primaryOperatorId: operatorId,
        });

    if (!result.ok) {
      const headers = result.status === 429
        ? { ...RESPONSE_HEADERS, 'Retry-After': String(result.retryAfterSec) }
        : RESPONSE_HEADERS;
      return NextResponse.json(
        { error: result.error },
        { status: result.status, headers },
      );
    }

    return NextResponse.json(
      {
        approvalId: result.approvalId,
        code: result.code,
        actionType: result.actionType,
        summary: result.summary,
        expiresAt: result.expiresAt,
      },
      { status: 201, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
