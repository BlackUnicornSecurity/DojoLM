// SPDX-License-Identifier: Apache-2.0
/**
 * Env-driven BudgetLedger factory.
 *
 * Resolves the backend (`memory` | `postgres`) via bu-tpi's `readBudgetBackend`
 * and constructs the corresponding adapter. The pg Pool is injected so this
 * module stays free of the native `pg` dependency at import time — callers
 * create the Pool at server bootstrap.
 */

import {
  InMemoryBudgetLedger,
  PostgresBudgetLedger,
  loadPostgresConfigFromEnv,
  readBudgetBackend,
  type BudgetAdminLedger,
} from 'bu-tpi/sensei';
import { PgPoolExecutor, type PgPoolLike } from './pg-pool-executor.js';

export interface CreateBudgetLedgerOptions {
  /** Required when backend resolves to `postgres`. */
  readonly pool?: PgPoolLike;
  /** Override for tests; defaults to `process.env`. */
  readonly env?: NodeJS.ProcessEnv;
}

export class BudgetLedgerPoolMissingError extends Error {
  readonly code = 'BUDGET.LEDGER.POOL_MISSING' as const;
  constructor() {
    super(
      'BUDGET_LEDGER_BACKEND=postgres requires a pg Pool. ' +
        'Pass `pool` to createBudgetLedger().',
    );
    this.name = 'BudgetLedgerPoolMissingError';
  }
}

export function createBudgetLedger(
  opts: CreateBudgetLedgerOptions = {},
): BudgetAdminLedger {
  const env = opts.env ?? process.env;
  const backend = readBudgetBackend(env);

  if (backend === 'memory') {
    return new InMemoryBudgetLedger();
  }

  if (!opts.pool) {
    throw new BudgetLedgerPoolMissingError();
  }
  const config = loadPostgresConfigFromEnv(env);
  const executor = new PgPoolExecutor(opts.pool);
  return new PostgresBudgetLedger(config, executor);
}
