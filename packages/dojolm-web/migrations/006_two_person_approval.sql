-- Migration 006: Two-person-approval pending-action state machine (#G-057, YR.13.3).
--
-- Persists pending destructive admin actions that require a second operator's
-- approval before execution. Operator A POSTs to /api/admin/two-person-approval
-- with an action_type + payload; the server generates a short code, hashes it,
-- and stores a `pending_approvals` row. Operator B then POSTs /[id]/confirm
-- with the code and (cryptographically distinct) operator id; the server
-- validates and either marks the row consumed (success) or rejected.
--
-- Replay defense (CRIT-3 from ticket pass-3): consumed_at is the consume
-- marker. Validation rejects rows where consumed_at IS NOT NULL. Rejection
-- markers (rejected_at + rejection_reason) are independent so an audit
-- viewer can distinguish manual reject vs auto-expire vs same-operator vs
-- wrong-code.
--
-- Idempotent — wrapped in IF NOT EXISTS so re-running mid-deploy is safe.

CREATE TABLE IF NOT EXISTS pending_approvals (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  primary_operator_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  consumed_by_operator_id TEXT,
  rejected_at TEXT,
  rejection_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_primary_op
  ON pending_approvals(primary_operator_id);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_expires
  ON pending_approvals(expires_at);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_consumed
  ON pending_approvals(consumed_at);
CREATE INDEX IF NOT EXISTS idx_pending_approvals_action
  ON pending_approvals(action_type);
