-- Migration M-0001: budget_ledger table (DEC-3, Gap 0.4, Issue #133).
--
-- Multi-scope LLM spend caps: one row per scope (user | model | app-wide).
-- Enforces DB-level overspend prevention. Atomic checkAndDecrement() relies
-- on SELECT ... FOR UPDATE row locks inside a transaction. The CHECK
-- constraints are belt-and-braces against any caller that bypasses the adapter.
--
-- Idempotent: safe to run on a fresh DB (CREATE branch) or on a pre-
-- multi-scope install that still has the legacy `user_id` PK (DO branch).

CREATE TABLE IF NOT EXISTS budget_ledger (
  scope_type    TEXT        NOT NULL,
  scope_id      TEXT        NOT NULL,
  cap_credits   INTEGER     NOT NULL CHECK (cap_credits >= 0),
  spent_credits INTEGER     NOT NULL DEFAULT 0 CHECK (spent_credits >= 0),
  period_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (scope_type, scope_id),
  CONSTRAINT no_overspend CHECK (spent_credits <= cap_credits),
  CONSTRAINT budget_ledger_scope_type_valid CHECK (scope_type IN ('user', 'model', 'app'))
);

-- Upgrade path for installs created before multi-scope (user_id TEXT PK).
-- Existing rows become `scope_type = 'user'` and keep their ids. The PK
-- constraint name is resolved dynamically (not the hardcoded default) so a
-- restored/renamed install does not crash the deploy.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'budget_ledger' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE budget_ledger RENAME COLUMN user_id TO scope_id;
    ALTER TABLE budget_ledger ADD COLUMN scope_type TEXT NOT NULL DEFAULT 'user';
    EXECUTE (
      SELECT format('ALTER TABLE budget_ledger DROP CONSTRAINT %I', conname)
        FROM pg_constraint
       WHERE conrelid = 'budget_ledger'::regclass AND contype = 'p'
    );
    ALTER TABLE budget_ledger ADD PRIMARY KEY (scope_type, scope_id);
    ALTER TABLE budget_ledger ALTER COLUMN scope_type DROP DEFAULT;
    ALTER TABLE budget_ledger
      ADD CONSTRAINT budget_ledger_scope_type_valid CHECK (scope_type IN ('user', 'model', 'app'));
  END IF;
END $$;
