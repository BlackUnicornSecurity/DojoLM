-- Migration 005: RBAC 5-role reconciliation (#138, plan §0.1).
--
-- Migrates legacy `users.role` values to the plan-level 5-role matrix.
-- Mapping (founder decision 2026-04-22, Option A):
--   admin    → admin     (unchanged)
--   analyst  → operator  (runs probes; no budget/flag modification)
--   viewer   → member    (read-only + submits + own-budget)
--
-- Idempotent — re-running is a no-op after the first pass because every
-- UPDATE targets legacy values that no longer exist post-migration.

UPDATE users SET role = 'operator', updated_at = datetime('now')
 WHERE role = 'analyst';

UPDATE users SET role = 'member', updated_at = datetime('now')
 WHERE role = 'viewer';

-- Also normalise the `role` default for any future inserts that rely on
-- the column default. SQLite does not support ALTER DEFAULT directly;
-- this INSERT is a placeholder noting the change — application code now
-- defaults to 'member' in the user repository.
--
-- Historical defaults on this table: 'viewer' (migration 003) → 'member'.
