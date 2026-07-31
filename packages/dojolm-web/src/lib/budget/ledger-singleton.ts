// SPDX-License-Identifier: Apache-2.0
/**
 * Process-wide BudgetLedger singleton.
 *
 * The admin surface (set/clear scope caps) and the enforcement path MUST
 * share one ledger instance, otherwise a cap set by an admin request would
 * never reach the gate. `createBudgetLedger()` builds a *fresh* adapter per
 * call, so callers that need shared state go through here instead.
 *
 * - memory backend  → one InMemoryBudgetLedger for the process lifetime
 *                     (caps persist across requests within this process).
 * - postgres backend → one lazily-created pg Pool + boot migration, shared.
 *
 * The build promise is cached so the pool + migration run exactly once.
 */

import { createBudgetLedger } from './factory.js';
import { runBudgetMigration } from './migrate.js';
import { type PgPoolLike } from './pg-pool-executor.js';
import { readBudgetBackend } from 'bu-tpi/sensei';
import type { BudgetAdminLedger } from 'bu-tpi/sensei';

let cached: Promise<BudgetAdminLedger> | undefined;

async function build(): Promise<BudgetAdminLedger> {
  if (readBudgetBackend() === 'memory') {
    return createBudgetLedger();
  }
  // Postgres: import `pg` dynamically so the web bundle never statically
  // depends on the native module (mirrors the pg-integration test). Delegate
  // adapter construction to createBudgetLedger so the two paths can't drift.
  const pgSpec = 'pg';
  const { Pool } = (await import(pgSpec)) as typeof import('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await runBudgetMigration(pool as unknown as PgPoolLike);
  } catch (err) {
    // Boot failed — close the pool so a retry (cache is cleared on reject)
    // doesn't leak a Pool per failed attempt.
    await pool.end().catch(() => {});
    throw err;
  }
  return createBudgetLedger({ pool: pool as unknown as PgPoolLike });
}

/**
 * Get the shared ledger. Builds (and migrates, for postgres) once. If the
 * build REJECTS (DB down at boot, migration error), the cache is cleared so
 * the next call retries — a transient boot failure must not permanently
 * poison the enforcement path for the process lifetime.
 */
export function getBudgetLedger(): Promise<BudgetAdminLedger> {
  if (!cached) {
    cached = build().catch((err) => {
      cached = undefined;
      throw err;
    });
  }
  return cached;
}

/** Test-only: drop the cached instance so the next call rebuilds. */
export function __resetBudgetLedgerForTests(): void {
  cached = undefined;
}
