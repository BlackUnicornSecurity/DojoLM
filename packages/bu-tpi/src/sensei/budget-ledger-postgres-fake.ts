// SPDX-License-Identifier: Apache-2.0
/**
 * FakePgExecutor — in-process simulator for PgExecutor that honours
 * the atomicity contract required by PostgresBudgetLedger.
 *
 * The real Postgres adapter relies on SELECT ... FOR UPDATE to
 * serialise concurrent transactions touching the same scope row.
 * This fake simulates that with a global async mutex so parallel
 * `withTransaction` callers execute sequentially — stricter than
 * per-row locking, but sufficient to validate the no-overspend
 * invariant under concurrency.
 *
 * Rows are keyed by `scope_type scope_id` (multi-scope schema).
 *
 * Meant for tests only.
 */

import type { PgExecutor, PgRow, PgTx } from './budget-ledger-postgres.js';

interface LedgerRow {
  scope_type: string;
  scope_id: string;
  cap_credits: number;
  spent_credits: number;
  period_start: string;
}

/** Legacy seed shape (user scope) — kept for backwards-compatible tests. */
interface UserSeedRow {
  user_id: string;
  cap_credits: number;
  spent_credits: number;
  period_start: string;
}

export interface FakePgExecutorOptions {
  /** If true, the next query throws — used to exercise rollback paths. */
  readonly failNextQuery?: boolean;
  /** Optional hook invoked before each query, for interleaving assertions. */
  readonly beforeQuery?: (sql: string, params: readonly unknown[]) => void;
}

function keyOf(scopeType: string, scopeId: string): string {
  return `${scopeType} ${scopeId}`;
}

export class FakePgExecutor implements PgExecutor {
  private readonly rows = new Map<string, LedgerRow>();
  private mutex: Promise<void> = Promise.resolve();
  private shouldFailNext: boolean;
  private readonly beforeQuery?: (sql: string, params: readonly unknown[]) => void;

  queryCount = 0;
  rollbackCount = 0;
  commitCount = 0;

  constructor(opts: FakePgExecutorOptions = {}) {
    this.shouldFailNext = opts.failNextQuery ?? false;
    this.beforeQuery = opts.beforeQuery;
  }

  async withTransaction<T>(fn: (tx: PgTx) => Promise<T>): Promise<T> {
    const prev = this.mutex;
    let release!: () => void;
    this.mutex = new Promise<void>((r) => { release = r; });
    await prev;

    const snapshot = new Map<string, LedgerRow>();
    for (const [k, v] of this.rows) snapshot.set(k, { ...v });

    const tx: PgTx = {
      query: <R extends PgRow = PgRow>(sql: string, params: readonly unknown[] = []) =>
        this.runQuery<R>(sql, params),
    };

    try {
      const result = await fn(tx);
      this.commitCount += 1;
      release();
      return result;
    } catch (err) {
      // Roll back: restore snapshot.
      this.rows.clear();
      for (const [k, v] of snapshot) this.rows.set(k, v);
      this.rollbackCount += 1;
      release();
      throw err;
    }
  }

  /** Seed a user-scope row directly (test setup). */
  seed(row: UserSeedRow): void {
    const full: LedgerRow = {
      scope_type: 'user',
      scope_id: row.user_id,
      cap_credits: row.cap_credits,
      spent_credits: row.spent_credits,
      period_start: row.period_start,
    };
    this.rows.set(keyOf('user', row.user_id), full);
  }

  /** Read a user-scope row (test assertions). */
  read(userId: string): UserSeedRow | undefined {
    const r = this.rows.get(keyOf('user', userId));
    return r
      ? {
          user_id: r.scope_id,
          cap_credits: r.cap_credits,
          spent_credits: r.spent_credits,
          period_start: r.period_start,
        }
      : undefined;
  }

  /** Read any scope row (test assertions). */
  readScope(scopeType: string, scopeId: string): LedgerRow | undefined {
    const r = this.rows.get(keyOf(scopeType, scopeId));
    return r ? { ...r } : undefined;
  }

  private async runQuery<R extends PgRow>(
    sql: string,
    params: readonly unknown[],
  ): Promise<R[]> {
    this.queryCount += 1;
    this.beforeQuery?.(sql, params);

    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      throw new Error('simulated Postgres failure');
    }

    const trimmed = sql.replace(/\s+/g, ' ').trim().toUpperCase();

    if (trimmed.startsWith('INSERT INTO BUDGET_LEDGER (SCOPE_TYPE, SCOPE_ID, CAP_CREDITS, SPENT_CREDITS) VALUES')) {
      // Empty-row upsert: INSERT ... ON CONFLICT DO NOTHING.
      const scopeType = String(params[0]);
      const scopeId = String(params[1]);
      const k = keyOf(scopeType, scopeId);
      if (!this.rows.has(k)) {
        this.rows.set(k, {
          scope_type: scopeType,
          scope_id: scopeId,
          cap_credits: 0,
          spent_credits: 0,
          period_start: new Date().toISOString(),
        });
      }
      return [];
    }

    if (trimmed.startsWith('INSERT INTO BUDGET_LEDGER (SCOPE_TYPE, SCOPE_ID, CAP_CREDITS, SPENT_CREDITS, PERIOD_START)')) {
      // setScopeCap upsert.
      const scopeType = String(params[0]);
      const scopeId = String(params[1]);
      const capCredits = Number(params[2]);
      const periodStart = String(params[3]);
      const k = keyOf(scopeType, scopeId);
      const existing = this.rows.get(k);
      const spent = existing && existing.period_start === periodStart ? existing.spent_credits : 0;
      if (capCredits < spent) {
        throw new Error('no_overspend CHECK violation');
      }
      this.rows.set(k, {
        scope_type: scopeType,
        scope_id: scopeId,
        cap_credits: capCredits,
        spent_credits: spent,
        period_start: periodStart,
      });
      return [];
    }

    if (trimmed.startsWith('SELECT CAP_CREDITS, SPENT_CREDITS, PERIOD_START FROM BUDGET_LEDGER')) {
      const scopeType = String(params[0]);
      const scopeId = String(params[1]);
      const row = this.rows.get(keyOf(scopeType, scopeId));
      return row ? ([{ ...row }] as unknown as R[]) : [];
    }

    if (trimmed.startsWith('UPDATE BUDGET_LEDGER SET SPENT_CREDITS = SPENT_CREDITS +')) {
      const scopeType = String(params[0]);
      const scopeId = String(params[1]);
      const delta = Number(params[2]);
      const k = keyOf(scopeType, scopeId);
      const row = this.rows.get(k);
      if (!row) return [];
      const next = row.spent_credits + delta;
      if (next > row.cap_credits) {
        throw new Error('no_overspend CHECK violation');
      }
      this.rows.set(k, { ...row, spent_credits: next });
      return [];
    }

    if (trimmed.startsWith('DELETE FROM BUDGET_LEDGER')) {
      const scopeType = String(params[0]);
      const scopeId = String(params[1]);
      this.rows.delete(keyOf(scopeType, scopeId));
      return [];
    }

    if (trimmed.startsWith('SELECT SCOPE_TYPE, SCOPE_ID, CAP_CREDITS, SPENT_CREDITS, PERIOD_START FROM BUDGET_LEDGER')) {
      const kindFilter = params.length > 0 ? String(params[0]) : undefined;
      const list = [...this.rows.values()]
        .filter((r) => (kindFilter ? r.scope_type === kindFilter : true))
        .sort((a, b) =>
          a.scope_type === b.scope_type
            ? a.scope_id.localeCompare(b.scope_id)
            : a.scope_type.localeCompare(b.scope_type),
        )
        .map((r) => ({ ...r }));
      return list as unknown as R[];
    }

    throw new Error(`FakePgExecutor: unrecognised SQL: ${sql}`);
  }
}
