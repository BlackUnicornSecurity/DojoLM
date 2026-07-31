// SPDX-License-Identifier: Apache-2.0
/**
 * Postgres-backed `RetentionReapableStore` template.
 *
 * Generic adapter that wires bu-tpi's retention reaper onto any
 * user-keyed Postgres table that has a timestamp column indicating
 * when the row was created (or when its retention period started).
 *
 * The SQL runs inside a transaction via `PgPoolExecutor` so a deletion
 * that can't commit leaves the row in place — the reaper's next pass
 * will retry. Identifiers whitelist-validated to prevent injection via
 * config, matching `PostgresDsrDeleteStore` (PR #158).
 */

import type {
  DsrDataClass,
  RetentionReapableStore,
} from 'bu-tpi/security';
import { PgPoolExecutor, type PgPoolLike } from '../budget/pg-pool-executor.js';
import { assertSafeSqlIdentifier } from './pg-identifier.js';

export interface PostgresReapableStoreOptions {
  readonly pool: PgPoolLike;
  /** Table name, e.g. `hydra_transcripts`. Whitelist-validated; see `pg-identifier.ts`. */
  readonly tableName: string;
  /** Column carrying the row-creation timestamp. Default: `created_at`. */
  readonly timestampColumn?: string;
}

export class PostgresReapableStore implements RetentionReapableStore {
  readonly dataClass: DsrDataClass;
  private readonly executor: PgPoolExecutor;
  private readonly tableName: string;
  private readonly timestampColumn: string;

  constructor(dataClass: DsrDataClass, options: PostgresReapableStoreOptions) {
    this.dataClass = dataClass;
    this.tableName = options.tableName;
    this.timestampColumn = options.timestampColumn ?? 'created_at';
    assertSafeSqlIdentifier(this.tableName, 'tableName');
    assertSafeSqlIdentifier(this.timestampColumn, 'timestampColumn');
    this.executor = new PgPoolExecutor(options.pool);
  }

  async deleteOlderThan(cutoffISO: string): Promise<number> {
    const sql = `DELETE FROM ${this.tableName} WHERE ${this.timestampColumn} < $1 RETURNING 1`;
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query(sql, [cutoffISO]);
      return rows.length;
    });
  }
}
