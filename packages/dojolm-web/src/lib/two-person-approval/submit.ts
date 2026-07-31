// SPDX-License-Identifier: Apache-2.0
/**
 * Shared submit logic for the YR.13.3 two-person-approval state machine.
 *
 * Both `POST /api/admin/two-person-approval` (operator-A free-form submit)
 * and `DELETE /api/admin/users/[id]` (operator-A delete-user submit, YR.14.1)
 * route through this helper so the rate-limit gate, payload validation,
 * code generation, and persistence all share one code path.
 *
 * Stays Node-runtime — uses `node:crypto` and the better-sqlite3 repo.
 * Caller is responsible for the auth + CSRF gates and for surfacing the
 * returned `{approvalId, code}` to the primary operator exactly once.
 */

import crypto from 'node:crypto';
import { twoPersonApprovalRepo } from '@/lib/db/repositories/two-person-approval.repository';
import { generateApprovalCode, hashApprovalCode } from './code';
import {
  getActionHandler,
  isApprovalActionType,
  type ApprovalActionType,
} from './handlers';
import {
  APPROVAL_TTL_MS,
  SUBMIT_RATE_LIMIT_MAX,
  SUBMIT_RATE_LIMIT_WINDOW_MS,
} from './constants';

export interface ApprovalSubmitInput {
  readonly actionType: string;
  readonly payload: unknown;
  readonly primaryOperatorId: string;
}

export type ApprovalSubmitResult =
  | {
      readonly ok: true;
      readonly approvalId: string;
      readonly code: string;
      readonly actionType: ApprovalActionType;
      readonly summary: string;
      readonly expiresAt: string;
    }
  | {
      readonly ok: false;
      readonly status: 400 | 401 | 429;
      readonly error: string;
      readonly retryAfterSec?: number;
    };

/**
 * Validate, rate-limit, persist a pending approval row. Returns
 * `{approvalId, code}` on success — caller must surface to operator A
 * exactly once. The raw code is never persisted in plaintext.
 */
export function submitApproval(input: ApprovalSubmitInput): ApprovalSubmitResult {
  if (!input.primaryOperatorId) {
    return { ok: false, status: 401, error: 'Operator identity required' };
  }
  if (!isApprovalActionType(input.actionType)) {
    return { ok: false, status: 400, error: 'Unknown actionType' };
  }
  const handler = getActionHandler(input.actionType);
  const validation = handler.schema.safeParse(input.payload);
  if (!validation.success) {
    return { ok: false, status: 400, error: 'Invalid payload for actionType' };
  }

  const sinceIso = new Date(Date.now() - SUBMIT_RATE_LIMIT_WINDOW_MS).toISOString();
  const activeCount = twoPersonApprovalRepo.countActiveByOperatorSince(input.primaryOperatorId, sinceIso);
  if (activeCount >= SUBMIT_RATE_LIMIT_MAX) {
    return {
      ok: false,
      status: 429,
      error: 'Too many pending approvals — wait for existing submissions to expire',
      retryAfterSec: Math.ceil(SUBMIT_RATE_LIMIT_WINDOW_MS / 1000),
    };
  }

  const id = crypto.randomUUID();
  const code = generateApprovalCode();
  const codeHash = hashApprovalCode(code);
  const submittedAt = new Date();
  const expiresAt = new Date(submittedAt.getTime() + APPROVAL_TTL_MS);

  twoPersonApprovalRepo.createPending({
    id,
    action_type: input.actionType,
    payload_json: JSON.stringify(validation.data),
    primary_operator_id: input.primaryOperatorId,
    code_hash: codeHash,
    submitted_at: submittedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    consumed_at: null,
    consumed_by_operator_id: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: submittedAt.toISOString(),
  });

  return {
    ok: true,
    approvalId: id,
    code,
    actionType: input.actionType,
    // `as never` bridges TS's union-vs-intersection narrowing — see the
    // matching note inside `executeApproval` (handlers.ts).
    summary: handler.describe(validation.data as never),
    expiresAt: expiresAt.toISOString(),
  };
}
