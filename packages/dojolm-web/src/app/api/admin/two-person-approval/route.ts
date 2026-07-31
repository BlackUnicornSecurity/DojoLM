// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/two-person-approval — submit (operator A).
 *
 * YR.13.3 (G-057). Operator A submits a destructive action to be
 * approved by a second operator. Server generates an 8-char base32
 * approval code (40 bits), hashes it with SHA-256, persists the row in
 * `pending_approvals`, and returns the raw code to operator A exactly
 * once. The code is never persisted in plaintext.
 *
 * Rate-limit: 5 active pending submits per primary operator within a
 * 60-second window — defense against an operator spamming pending
 * approvals to lock out real ones.
 *
 * Auth: admin role required (`withAuth`).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { twoPersonApprovalRepo } from '@/lib/db/repositories/two-person-approval.repository';
import {
  isApprovalActionType,
  getActionHandler,
  type ApprovalActionType,
} from '@/lib/two-person-approval/handlers';
import { PENDING_LIST_MAX_ROWS } from '@/lib/two-person-approval/constants';
import { maybeCleanupExpiredApprovals } from '@/lib/two-person-approval/cleanup';
import { submitApproval } from '@/lib/two-person-approval/submit';

const submitBodySchema = z.object({
  actionType: z.string().min(1),
  payload: z.unknown(),
});

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    maybeCleanupExpiredApprovals();

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const parsed = submitBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const { actionType, payload } = parsed.data;

    // YR.13.3 NOTE: we deliberately do NOT emit `auditLog.twoPersonApprovalSubmit`
    // here — that event marks the moment a SECOND operator confirms (the
    // 2-of-2 threshold cross). The submit step alone is one operator and
    // does not yet authorise the action. Per-submit observability is the
    // pending row itself (queryable via list endpoint) plus the operator's
    // session audit trail.
    const result = submitApproval({
      actionType,
      payload,
      primaryOperatorId: user?.id ?? '',
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

/**
 * GET /api/admin/two-person-approval — list pending approvals.
 *
 * Returns rows where `consumed_at IS NULL AND rejected_at IS NULL`.
 * Each row carries its action summary (computed from the payload via the
 * handler's `describe`) so the client can render review queues without
 * re-deriving payload semantics. The raw code is NEVER returned here —
 * only operator A holds it from the original submit response.
 */
export const GET = withAuth(
  async () => {
    maybeCleanupExpiredApprovals();
    const rows = twoPersonApprovalRepo.listPending(PENDING_LIST_MAX_ROWS);
    const items = rows.map((row) => {
      let summary: string;
      try {
        const payload = JSON.parse(row.payload_json);
        if (isApprovalActionType(row.action_type)) {
          const handler = getActionHandler(row.action_type as ApprovalActionType);
          const validation = handler.schema.safeParse(payload);
          // `as never` bridges union-vs-intersection narrowing across the
          // multi-handler registry — see executeApproval for the same.
          summary = validation.success ? handler.describe(validation.data as never) : '(unparseable payload)';
        } else {
          summary = '(unknown actionType)';
        }
      } catch {
        summary = '(invalid payload JSON)';
      }
      return {
        id: row.id,
        actionType: row.action_type,
        summary,
        primaryOperatorId: row.primary_operator_id,
        submittedAt: row.submitted_at,
        expiresAt: row.expires_at,
      };
    });
    return NextResponse.json({ items, total: items.length }, { status: 200, headers: RESPONSE_HEADERS });
  },
  { role: 'admin' },
);
