// SPDX-License-Identifier: Apache-2.0
/**
 * Budget-ledger deploy glue (DEC-3 / Issue #133).
 *
 * Brings the bu-tpi Postgres adapter to life at the dojolm-web boundary by
 * supplying a real pg Pool executor + boot-time migration.
 */

export {
  PgPoolExecutor,
  type PgClientLike,
  type PgPoolLike,
  type PgQueryResult,
} from './pg-pool-executor.js';

export {
  BUDGET_LEDGER_MIGRATION_SQL,
  runBudgetMigration,
  type RunBudgetMigrationOptions,
} from './migrate.js';

export {
  BudgetLedgerPoolMissingError,
  createBudgetLedger,
  type CreateBudgetLedgerOptions,
} from './factory.js';

export {
  getBudgetLedger,
  __resetBudgetLedgerForTests,
} from './ledger-singleton.js';
