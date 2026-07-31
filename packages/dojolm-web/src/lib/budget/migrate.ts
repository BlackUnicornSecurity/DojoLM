// SPDX-License-Identifier: Apache-2.0
/**
 * Idempotent boot-time migration runner for the budget_ledger schema.
 *
 * The SQL below is an exact copy of the canonical DDL shipped with bu-tpi
 * at `packages/bu-tpi/src/sensei/migrations/0001_budget_ledger.sql`.
 * It is embedded here (rather than read from disk) so the migration runs
 * cleanly from a packaged Next.js build where source file paths relative
 * to bu-tpi are not guaranteed to survive bundling. The statement itself
 * uses `CREATE TABLE IF NOT EXISTS`, so repeated invocations are safe.
 *
 * Kept minimal by design: one migration, one file. If the set grows we
 * replace with `node-pg-migrate` or a similar tool.
 */

import type { PgPoolLike } from './pg-pool-executor.js';

/** Canonical budget_ledger DDL. Mirror of bu-tpi/src/sensei/migrations/0001_budget_ledger.sql. */
export const BUDGET_LEDGER_MIGRATION_SQL = `
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
`.trim();

export interface RunBudgetMigrationOptions {
  /** Override source SQL (tests). Defaults to the bundled migration. */
  readonly sql?: string;
}

/**
 * Apply the budget-ledger migration to the target pool. Idempotent.
 * Throws if the pool rejects the DDL.
 */
export async function runBudgetMigration(
  pool: PgPoolLike,
  opts: RunBudgetMigrationOptions = {},
): Promise<void> {
  const sql = opts.sql ?? BUDGET_LEDGER_MIGRATION_SQL;
  const client = await pool.connect();
  try {
    await client.query(sql);
  } finally {
    client.release();
  }
}
