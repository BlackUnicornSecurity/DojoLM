// SPDX-License-Identifier: Apache-2.0
/**
 * Postgres-backed DSR cascade stores for dojolm-web.
 *
 * Generic templates that wire bu-tpi's `DsrCascadeStore` contract onto
 * any user-keyed Postgres table via the same `PgPoolExecutor` used by
 * the budget ledger deploy glue (issue #133, PR #150). Phase E feature
 * teams pick the template that matches their class's plan §0.3 action
 * (delete vs pseudonymise) and supply the concrete table name + user-id
 * column.
 *
 * Design intent
 * - No per-class hard-coded table names — Phase E tables for
 *   HydraTranscript / Match / ProbeOutcome / etc. each land with their
 *   own module; this file is the adapter, not the schema.
 * - SQL identifiers parameterised through a whitelist check
 *   (`assertSafeIdentifier`) so callers cannot inject table/column
 *   names that break quoting.
 * - Every mutation runs inside a transaction via `PgPoolExecutor`; we
 *   do not share a transaction with the surrounding cascade orchestrator
 *   — each store call independently commits so a per-class failure does
 *   not roll back earlier classes. The DSR ticket tracks partial success
 *   via per-class results.
 */

import type { DsrCascadeStore, DsrDataClass } from 'bu-tpi/compliance';
import { PgPoolExecutor, type PgPoolLike } from '../budget/pg-pool-executor.js';
import { assertSafeSqlIdentifier } from './pg-identifier.js';

export interface PostgresDsrStoreOptions {
  readonly pool: PgPoolLike;
  /** Table name, e.g. `hydra_transcripts`. Whitelist-validated; see `pg-identifier.ts`. */
  readonly tableName: string;
  /** Column that carries the user id. Default: `user_id`. */
  readonly userColumn?: string;
}

interface NormalisedOptions {
  readonly executor: PgPoolExecutor;
  readonly tableName: string;
  readonly userColumn: string;
}

function normaliseOptions(opts: PostgresDsrStoreOptions): NormalisedOptions {
  const userColumn = opts.userColumn ?? 'user_id';
  assertSafeSqlIdentifier(opts.tableName, 'tableName');
  assertSafeSqlIdentifier(userColumn, 'userColumn');
  return {
    executor: new PgPoolExecutor(opts.pool),
    tableName: opts.tableName,
    userColumn,
  };
}

// ---------------------------------------------------------------------------
// Delete template (raw-deletion classes)
// ---------------------------------------------------------------------------

/**
 * Fits classes whose plan §0.3 action is `deleted`:
 *   HydraTranscript, Match, ProbeOutcome, CommunitySubmission.
 */
export class PostgresDsrDeleteStore implements DsrCascadeStore {
  readonly dataClass: DsrDataClass;
  private readonly cfg: NormalisedOptions;

  constructor(dataClass: DsrDataClass, options: PostgresDsrStoreOptions) {
    this.dataClass = dataClass;
    this.cfg = normaliseOptions(options);
  }

  async deleteRawByUser(userId: string): Promise<number> {
    const { executor, tableName, userColumn } = this.cfg;
    const sql = `DELETE FROM ${tableName} WHERE ${userColumn} = $1 RETURNING 1`;
    return executor.withTransaction(async (tx) => {
      const rows = await tx.query(sql, [userId]);
      return rows.length;
    });
  }

  async exportByUser(userId: string): Promise<{ count: number; payload: unknown }> {
    const { executor, tableName, userColumn } = this.cfg;
    const sql = `SELECT * FROM ${tableName} WHERE ${userColumn} = $1`;
    return executor.withTransaction(async (tx) => {
      const rows = await tx.query(sql, [userId]);
      return { count: rows.length, payload: rows };
    });
  }
}

// ---------------------------------------------------------------------------
// Pseudonymise template (retain-7y classes)
// ---------------------------------------------------------------------------

/**
 * Fits classes whose plan §0.3 action is `pseudonymised`:
 *   BudgetLedger, OnigaeshiAuditRecord.
 */
export class PostgresDsrPseudonymiseStore implements DsrCascadeStore {
  readonly dataClass: DsrDataClass;
  private readonly cfg: NormalisedOptions;

  constructor(dataClass: DsrDataClass, options: PostgresDsrStoreOptions) {
    this.dataClass = dataClass;
    this.cfg = normaliseOptions(options);
  }

  async pseudonymiseByUser(userId: string, userHashValue: string): Promise<number> {
    const { executor, tableName, userColumn } = this.cfg;
    const sql =
      `UPDATE ${tableName} SET ${userColumn} = $2 WHERE ${userColumn} = $1 RETURNING 1`;
    return executor.withTransaction(async (tx) => {
      const rows = await tx.query(sql, [userId, userHashValue]);
      return rows.length;
    });
  }

  async exportByUser(userId: string): Promise<{ count: number; payload: unknown }> {
    const { executor, tableName, userColumn } = this.cfg;
    const sql = `SELECT * FROM ${tableName} WHERE ${userColumn} = $1`;
    return executor.withTransaction(async (tx) => {
      const rows = await tx.query(sql, [userId]);
      return { count: rows.length, payload: rows };
    });
  }
}
