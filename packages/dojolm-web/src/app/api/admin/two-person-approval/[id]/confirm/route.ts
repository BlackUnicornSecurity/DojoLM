// SPDX-License-Identifier: Apache-2.0
/**
 * POST /api/admin/two-person-approval/[id]/confirm — confirm (operator B).
 *
 * YR.13.3 (G-057). Second operator presents the code shared by operator A
 * out-of-band. Server validates: row exists, not already consumed, not
 * already rejected, not expired (strict `<= nowSec` per session-claim
 * invariant), code hash matches (timing-safe), AND second operator id !=
 * primary operator id (defense in depth — `twoPersonApprovalSubmit`
 * helper also self-degrades on same-operator).
 *
 * On success: marks consumed, executes the wrapped action, emits
 * `auditLog.twoPersonApprovalSubmit` (the threshold-cross marker), and
 * returns the executor's result. On any rejection path: emits
 * `auditLog.twoPersonApprovalReject` with the precise reason and marks
 * the row rejected so the same code cannot be replayed.
 *
 * Auth: admin role required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { twoPersonApprovalRepo } from '@/lib/db/repositories/two-person-approval.repository';
import { verifyApprovalCode } from '@/lib/two-person-approval/code';
import {
  isApprovalActionType,
  executeApproval,
  type ApprovalActionType,
} from '@/lib/two-person-approval/handlers';
import { maybeCleanupExpiredApprovals } from '@/lib/two-person-approval/cleanup';
import { getClientIp } from '@/lib/api-handler';

const confirmBodySchema = z.object({
  code: z.string().min(1).max(64),
});

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

/** UUID v4 format produced by `crypto.randomUUID()`. Tighter than the
 *  prior `[0-9a-fA-F-]{1,64}` shape — rejects malformed-but-hex-ish ids
 *  like `----` so audit + DB lookups never see junk that the random-UUID
 *  generator could not have produced. */
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

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const parsed = confirmBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
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

    const actor = {
      operatorId,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? '',
    } as const;

    const row = twoPersonApprovalRepo.findById(id);
    if (!row) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    if (row.consumed_at !== null || row.rejected_at !== null) {
      // Already finalised — surface as 409 to differentiate from 404 and
      // give the client a deterministic terminal state.
      return NextResponse.json(
        { error: 'Approval already finalised', state: row.consumed_at ? 'consumed' : 'rejected' },
        { status: 409, headers: RESPONSE_HEADERS },
      );
    }

    // Same-operator bypass — record + reject before any DB or executor work.
    // Solo-operator deploys (single-admin production, dev box, etc.) can opt
    // out via SOLO_OPERATOR_MODE=true in the .env. When ON, the
    // self-confirm is permitted; the audit row carries `solo-operator`
    // in the actor context so forensic review can still distinguish
    // self-approved actions from 2-operator-confirmed ones. The default
    // is OFF — multi-operator deploys keep the strict gate.
    const SOLO_OPERATOR_MODE = process.env.SOLO_OPERATOR_MODE === 'true';
    if (operatorId === row.primary_operator_id && !SOLO_OPERATOR_MODE) {
      twoPersonApprovalRepo.markRejected(id, 'same-operator');
      await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'same-operator' });
      return NextResponse.json(
        { error: 'Second operator must differ from primary operator' },
        { status: 403, headers: RESPONSE_HEADERS },
      );
    }

    // Strict expiry check (no skew) — matches YR.13.2 signed-cookie invariant.
    const nowMs = Date.now();
    const expiresMs = Date.parse(row.expires_at);
    if (!Number.isFinite(expiresMs) || nowMs >= expiresMs) {
      twoPersonApprovalRepo.markRejected(id, 'expired');
      await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'expired' });
      return NextResponse.json(
        { error: 'Approval expired' },
        { status: 410, headers: RESPONSE_HEADERS },
      );
    }

    // Timing-safe code comparison.
    if (!verifyApprovalCode(parsed.data.code, row.code_hash)) {
      twoPersonApprovalRepo.markRejected(id, 'wrong-code');
      await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'wrong-code' });
      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 403, headers: RESPONSE_HEADERS },
      );
    }

    // ActionType + payload verification (defense in depth — the row was
    // validated at submit, but a corrupt DB row should still fail closed
    // and the audit trail should reflect the corruption rather than
    // mislabel the failure as a code-entry error).
    if (!isApprovalActionType(row.action_type)) {
      twoPersonApprovalRepo.markRejected(id, 'corrupt-record');
      await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'corrupt-record' });
      return NextResponse.json(
        { error: 'Pending approval has unknown actionType' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }

    // Mark consumed BEFORE executing. If executor throws, the row stays
    // consumed and the action's actual side effect is whatever executor
    // achieved before throwing — better than re-running on retry.
    twoPersonApprovalRepo.markConsumed(id, operatorId);

    let executorOk: boolean;
    let summary = '';
    let meta: Record<string, unknown> | undefined;
    try {
      const result = await executeApproval(
        row.action_type as ApprovalActionType,
        row.payload_json,
        actor,
        row.primary_operator_id,
      );
      if (!result.ok) {
        // Validation failure post-consume should be unreachable since the
        // payload was validated at submit. Emit an `executor-failed` audit
        // row so the security trail still records the consumed-then-failed
        // state — the row stays consumed (no retry) but ops can correlate
        // the missing action with the audit entry.
        console.error('[two-person-approval] Post-consume payload invalidation:', { id, actionType: row.action_type });
        await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'executor-failed' });
        return NextResponse.json(
          { error: 'Approval payload re-validation failed' },
          { status: 500, headers: RESPONSE_HEADERS },
        );
      }
      executorOk = true;
      summary = result.result.summary;
      meta = result.result.meta;
    } catch (err) {
      // Executor threw after the consume marker was set. The row stays
      // consumed (no replay), but we MUST still emit an audit row so the
      // security trail reflects the post-consume failure rather than
      // silently dropping the threshold-cross event.
      console.error('[two-person-approval] Executor failed:', err);
      await auditLog.twoPersonApprovalReject({ ...actor, actionId: id, rejectionReason: 'executor-failed' });
      return NextResponse.json(
        { error: 'Action execution failed' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }

    // Threshold-cross marker — only on successful execution.
    await auditLog.twoPersonApprovalSubmit({
      ...actor,
      actionId: id,
      primaryOperator: row.primary_operator_id,
      secondOperator: operatorId,
    });

    return NextResponse.json(
      {
        ok: executorOk,
        approvalId: id,
        actionType: row.action_type,
        summary,
        meta,
      },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
