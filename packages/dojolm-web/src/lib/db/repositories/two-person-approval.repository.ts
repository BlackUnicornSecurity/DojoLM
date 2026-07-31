// SPDX-License-Identifier: Apache-2.0
/**
 * Two-Person-Approval Repository (YR.13.3 / G-057).
 *
 * Persists pending destructive admin actions awaiting a second operator's
 * approval. Mirrors the pattern of `user.repository.ts` — the row shape
 * lives in `db/types.ts` (`PendingApprovalRow`) and the SQL schema is in
 * `migrations/006_two_person_approval.sql`.
 *
 * The `consumed_at` column is the single source of truth for "this
 * approval has executed its wrapped action" (replay defense per ticket
 * CRIT-3). `rejected_at` + `rejection_reason` are recorded independently
 * so an audit viewer can distinguish auto-expire from explicit reject.
 */

import { BaseRepository } from './base.repository';
import type { PendingApprovalRow } from '../types';

export type RejectionReason =
  | 'expired'
  | 'wrong-code'
  | 'same-operator'
  | 'manual'
  /** Wrapped action threw mid-execution (after consume marker was set). */
  | 'executor-failed'
  /** DB row references an `action_type` not in the registered handler set
   *  (schema drift or row corruption). */
  | 'corrupt-record';

export class TwoPersonApprovalRepository extends BaseRepository<PendingApprovalRow> {
  constructor() {
    super('pending_approvals');
  }

  /**
   * Insert a fresh pending approval. Caller supplies the SHA-256 hash of
   * the code; the raw code is never persisted.
   */
  createPending(record: PendingApprovalRow): PendingApprovalRow {
    return this.create(record);
  }

  /**
   * Mark an approval consumed (the wrapped action just executed).
   * Writes consumed_at + consumed_by_operator_id atomically.
   */
  markConsumed(id: string, secondOperatorId: string): PendingApprovalRow | null {
    return this.update(id, {
      consumed_at: new Date().toISOString(),
      consumed_by_operator_id: secondOperatorId,
    } as Partial<PendingApprovalRow>);
  }

  /**
   * Mark an approval rejected. Writes rejected_at + rejection_reason.
   * Caller is expected to ALSO emit `auditLog.twoPersonApprovalReject`.
   */
  markRejected(id: string, reason: RejectionReason): PendingApprovalRow | null {
    return this.update(id, {
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
    } as Partial<PendingApprovalRow>);
  }

  /**
   * Count pending submits by primary operator within the trailing window.
   * Used by the rate-limit gate at /api/admin/two-person-approval submit.
   * Excludes consumed and rejected rows so a slow approval cycle does not
   * lock out the operator.
   */
  countActiveByOperatorSince(operatorId: string, sinceIso: string): number {
    const db = this.getDb();
    const row = db.prepare(
      `SELECT COUNT(*) AS total FROM pending_approvals
       WHERE primary_operator_id = ?
         AND submitted_at >= ?
         AND consumed_at IS NULL
         AND rejected_at IS NULL`,
    ).get(operatorId, sinceIso) as { total: number };
    return row.total;
  }

  /**
   * Delete approvals that expired without being consumed or rejected.
   * Called from the per-request cleanup helper (no separate cron). Returns
   * the row count purged so callers can surface ops metrics if desired.
   */
  cleanExpired(nowIso: string = new Date().toISOString()): number {
    const db = this.getDb();
    const result = db.prepare(
      `DELETE FROM pending_approvals
       WHERE expires_at <= ?
         AND consumed_at IS NULL
         AND rejected_at IS NULL`,
    ).run(nowIso);
    return result.changes;
  }

  /**
   * List pending approvals (not yet consumed or rejected) in submit-order
   * descending. Bounded by `limit`; the caller is also expected to scope
   * by `primary_operator_id` if appropriate (e.g., to hide self-submitted
   * approvals from operator B's review queue).
   */
  listPending(limit: number = 50): PendingApprovalRow[] {
    const db = this.getDb();
    return db.prepare(
      `SELECT * FROM pending_approvals
       WHERE consumed_at IS NULL
         AND rejected_at IS NULL
       ORDER BY submitted_at DESC
       LIMIT ?`,
    ).all(limit) as PendingApprovalRow[];
  }
}

export const twoPersonApprovalRepo = new TwoPersonApprovalRepository();
