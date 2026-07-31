// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/two-person-approval/[id]/reject — explicit reject.
 *
 * YR.13.3 (G-057). Either operator may explicitly cancel a pending
 * approval. The wrapped action is NEVER executed. Emits
 * `auditLog.twoPersonApprovalReject` with `rejectionReason: 'manual'`.
 *
 * Auth: admin role required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { twoPersonApprovalRepo } from '@/lib/db/repositories/two-person-approval.repository';
import { maybeCleanupExpiredApprovals } from '@/lib/two-person-approval/cleanup';
import { getClientIp } from '@/lib/api-handler';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}

export const POST = withAuth(
  async (request: NextRequest, { params, user }) => {
    maybeCleanupExpiredApprovals();

    const id = params?.id ?? '';
    if (!SAFE_ID.test(id)) {
      return NextResponse.json(
        { error: 'Invalid approval id' },
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

    const row = twoPersonApprovalRepo.findById(id);
    if (!row) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    if (row.consumed_at !== null || row.rejected_at !== null) {
      return NextResponse.json(
        { error: 'Approval already finalised', state: row.consumed_at ? 'consumed' : 'rejected' },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    twoPersonApprovalRepo.markRejected(id, 'manual');
    await auditLog.twoPersonApprovalReject({
      operatorId,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
      actionId: id,
      rejectionReason: 'manual',
    });

    return NextResponse.json(
      { ok: true, approvalId: id, rejectionReason: 'manual' },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
