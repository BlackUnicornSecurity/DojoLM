// SPDX-License-Identifier: Apache-2.0
/**
 * PgPoolExecutor — node-postgres Pool adapter for bu-tpi's PgExecutor contract.
 *
 * Wraps BEGIN/COMMIT/ROLLBACK around a callback using a single checked-out
 * client, satisfying the transactional-atomicity invariant required by
 * PostgresBudgetLedger.checkAndDecrement.
 *
 * The underlying pool is typed structurally (PgPoolLike) so unit tests can
 * inject a fake without loading the native `pg` driver.
 */

import type {
  PgExecutor,
  PgRow,
  PgTx,
} from 'bu-tpi/sensei';

export interface PgQueryResult<R extends PgRow = PgRow> {
  readonly rows: R[];
}

export interface PgClientLike {
  query<R extends PgRow = PgRow>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<PgQueryResult<R>>;
  release(err?: unknown): void;
}

export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

export class PgPoolExecutor implements PgExecutor {
  constructor(private readonly pool: PgPoolLike) {}

  async withTransaction<T>(fn: (tx: PgTx) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let released = false;
    try {
      await client.query('BEGIN');
      const tx: PgTx = {
        query: async <R extends PgRow = PgRow>(
          sql: string,
          params: readonly unknown[] = [],
        ): Promise<R[]> => {
          const result = await client.query<R>(sql, params);
          return result.rows;
        },
      };
      let result: T;
      try {
        result = await fn(tx);
      } catch (fnErr) {
        let rollbackErr: unknown;
        try {
          await client.query('ROLLBACK');
        } catch (rbErr) {
          rollbackErr = rbErr;
        }
        // Pass any rollback error to release() so the pool discards the
        // (potentially poisoned) client instead of recycling it.
        client.release(rollbackErr);
        released = true;
        throw fnErr;
      }
      await client.query('COMMIT');
      client.release();
      released = true;
      return result;
    } catch (err) {
      if (!released) {
        client.release(err);
      }
      throw err;
    }
  }
}
