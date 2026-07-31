// SPDX-License-Identifier: Apache-2.0
/**
 * Postgres budget-ledger adapter (DEC-3, Gap 0.4, Issue #133).
 *
 * Atomic checkAndDecrement enforces per-user spend caps via
 * SELECT ... FOR UPDATE inside a transaction. The table-level
 * CHECK (spent_credits <= cap_credits) is a second line of defence.
 *
 * Schema: see migrations/0001_budget_ledger.sql.
 *
 * This adapter is decoupled from any specific pg driver via the
 * `PgExecutor` interface. Production wiring passes a thin adapter over
 * the `pg` package's `Pool` (shipped separately to avoid adding a
 * native-build dependency to bu-tpi). Tests use `FakePgExecutor`.
 */

import {
  APP_SCOPE,
  scopeKey,
  userScope,
  modelScope,
  tightestScope,
  BudgetLedgerNotConfiguredError,
  type BudgetCap,
  type BudgetDecision,
  type BudgetAdminLedger,
  type BudgetScope,
  type BudgetScopeKind,
  type BudgetSnapshot,
  type CheckAndDecrementOptions,
  type ScopeBudgetSnapshot,
} from './budget-ledger.js';

// ---------------------------------------------------------------------------
// Executor contract
// ---------------------------------------------------------------------------

/** A row returned from a Postgres query. Keys mirror column names. */
export type PgRow = Record<string, unknown>;

/** Handle to a Postgres connection already inside a transaction. */
export interface PgTx {
  query<R extends PgRow = PgRow>(sql: string, params?: readonly unknown[]): Promise<R[]>;
}

/**
 * Opens a transaction, runs `fn`, commits on success, rolls back on throw.
 * Implementations must ensure BEGIN/COMMIT/ROLLBACK wrap the entire callback.
 */
export interface PgExecutor {
  withTransaction<T>(fn: (tx: PgTx) => Promise<T>): Promise<T>;
}

export interface PostgresBudgetConfig {
  readonly databaseUrl: string;
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const SQL_UPSERT_EMPTY_ROW = `
  INSERT INTO budget_ledger (scope_type, scope_id, cap_credits, spent_credits)
  VALUES ($1, $2, 0, 0)
  ON CONFLICT (scope_type, scope_id) DO NOTHING
`;

const SQL_SELECT_FOR_UPDATE = `
  SELECT cap_credits, spent_credits, period_start
    FROM budget_ledger
   WHERE scope_type = $1 AND scope_id = $2
   FOR UPDATE
`;

const SQL_INCREMENT_SPENT = `
  UPDATE budget_ledger
     SET spent_credits = spent_credits + $3
   WHERE scope_type = $1 AND scope_id = $2
`;

const SQL_SELECT_SNAPSHOT = `
  SELECT cap_credits, spent_credits, period_start
    FROM budget_ledger
   WHERE scope_type = $1 AND scope_id = $2
`;

const SQL_UPSERT_CAP_RESET = `
  INSERT INTO budget_ledger (scope_type, scope_id, cap_credits, spent_credits, period_start)
  VALUES ($1, $2, $3, 0, $4)
  ON CONFLICT (scope_type, scope_id) DO UPDATE
    SET cap_credits   = EXCLUDED.cap_credits,
        spent_credits = CASE
                          WHEN budget_ledger.period_start = EXCLUDED.period_start
                            THEN budget_ledger.spent_credits
                          ELSE 0
                        END,
        period_start  = EXCLUDED.period_start
`;

const SQL_DELETE_SCOPE = `
  DELETE FROM budget_ledger
   WHERE scope_type = $1 AND scope_id = $2
`;

const SQL_LIST_ALL = `
  SELECT scope_type, scope_id, cap_credits, spent_credits, period_start
    FROM budget_ledger
   ORDER BY scope_type, scope_id
`;

const SQL_LIST_BY_KIND = `
  SELECT scope_type, scope_id, cap_credits, spent_credits, period_start
    FROM budget_ledger
   WHERE scope_type = $1
   ORDER BY scope_id
`;

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

function toInt(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number.parseInt(value, 10);
  throw new TypeError(`expected numeric column, got ${typeof value}`);
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return new Date(value).toISOString();
  throw new TypeError(`expected timestamp column, got ${typeof value}`);
}

export class PostgresBudgetLedger implements BudgetAdminLedger {
  readonly id = 'postgres' as const;

  constructor(
    private readonly config: PostgresBudgetConfig,
    private readonly executor: PgExecutor,
  ) {
    if (!config.databaseUrl) {
      throw new BudgetLedgerNotConfiguredError('postgres');
    }
  }

  async checkAndDecrement(
    userId: string,
    requestedCredits: number,
    opts?: CheckAndDecrementOptions,
  ): Promise<BudgetDecision> {
    if (requestedCredits < 0) {
      throw new RangeError('requestedCredits must be >= 0');
    }

    // Candidate scopes: user (always), optional model, app-wide. Model/app
    // are only gated when a row exists (absent row = uncapped).
    //
    // ponytail: app-wide caps are an EXACT global ceiling — when an `app:*`
    // cap is set, every capped call serialises on that single row (that is
    // what a hard fleet-wide ceiling costs). If app-scope throughput ever
    // matters, shard `app:*` into `app:*:<n>` sub-rows and sum on read.
    // When no app cap exists the SELECT below matches zero rows and takes no
    // lock, so uncapped installs never pay the global-serialisation cost.
    const candidates: BudgetScope[] = [userScope(userId)];
    if (opts?.modelId) candidates.push(modelScope(opts.modelId));
    candidates.push(APP_SCOPE);
    // Lock rows in a stable scope-key order so concurrent multi-scope calls
    // never acquire locks in opposite orders → no deadlock. INVARIANT: the
    // pre-loop user upsert locks exactly one row (this call's own user row,
    // which sorts last), so it can never invert against another txn. If a
    // future scope ever locks a SECOND user row (team/parent budgets), fold
    // it into this sorted loop instead of a separate pre-loop lock.
    const ordered = [...candidates].sort((a, b) => scopeKey(a).localeCompare(scopeKey(b)));

    return this.executor.withTransaction(async (tx) => {
      // Ensure the user row exists (preserves "unknown user = cap 0 = denied").
      await tx.query(SQL_UPSERT_EMPTY_ROW, ['user', userId]);

      const applicable: Array<{ scope: BudgetScope; remaining: number }> = [];
      for (const scope of ordered) {
        const rows = await tx.query(SQL_SELECT_FOR_UPDATE, [scope.kind, scope.id]);
        const row = rows[0];
        if (!row) continue; // model/app with no cap → uncapped, skip.
        applicable.push({
          scope,
          remaining: toInt(row['cap_credits']) - toInt(row['spent_credits']),
        });
      }

      // Deny/report against the TIGHTEST (smallest-remaining) scope — the
      // binding constraint. Deterministic + identical to the InMemory adapter.
      const binding = tightestScope(applicable);
      if (binding && requestedCredits > binding.remaining) {
        return {
          verdict: 'denied',
          requestedCredits,
          remainingCredits: binding.remaining,
          reason: `insufficient budget in ${binding.scope.kind} scope: need ${requestedCredits}, have ${binding.remaining}`,
        };
      }

      for (const a of applicable) {
        await tx.query(SQL_INCREMENT_SPENT, [a.scope.kind, a.scope.id, requestedCredits]);
      }

      return {
        verdict: 'approved',
        requestedCredits,
        remainingCredits: binding ? binding.remaining - requestedCredits : 0,
      };
    });
  }

  async getSnapshot(userId: string): Promise<BudgetSnapshot> {
    return this.executor.withTransaction(async (tx) => {
      const rows = await tx.query(SQL_SELECT_SNAPSHOT, ['user', userId]);
      const row = rows[0];
      if (!row) {
        return {
          userId,
          capCredits: 0,
          spentCredits: 0,
          remainingCredits: 0,
          periodStart: new Date().toISOString(),
        };
      }
      const cap = toInt(row['cap_credits']);
      const spent = toInt(row['spent_credits']);
      return {
        userId,
        capCredits: cap,
        spentCredits: spent,
        remainingCredits: cap - spent,
        periodStart: toIso(row['period_start']),
      };
    });
  }

  async setCap(userId: string, cap: BudgetCap): Promise<void> {
    return this.setScopeCap(userScope(userId), cap);
  }

  async setScopeCap(scope: BudgetScope, cap: BudgetCap): Promise<void> {
    if (cap.capCredits < 0) {
      throw new RangeError('capCredits must be >= 0');
    }
    const periodStart = cap.periodStart ?? new Date().toISOString();
    await this.executor.withTransaction(async (tx) => {
      await tx.query(SQL_UPSERT_CAP_RESET, [scope.kind, scope.id, cap.capCredits, periodStart]);
    });
  }

  async clearScopeCap(scope: BudgetScope): Promise<void> {
    await this.executor.withTransaction(async (tx) => {
      await tx.query(SQL_DELETE_SCOPE, [scope.kind, scope.id]);
    });
  }

  async listScopeCaps(kind?: BudgetScopeKind): Promise<ScopeBudgetSnapshot[]> {
    return this.executor.withTransaction(async (tx) => {
      const rows = kind
        ? await tx.query(SQL_LIST_BY_KIND, [kind])
        : await tx.query(SQL_LIST_ALL);
      return rows.map((row) => {
        const cap = toInt(row['cap_credits']);
        const spent = toInt(row['spent_credits']);
        return {
          scope: {
            kind: String(row['scope_type']) as BudgetScopeKind,
            id: String(row['scope_id']),
          },
          capCredits: cap,
          spentCredits: spent,
          remainingCredits: cap - spent,
          periodStart: toIso(row['period_start']),
        };
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export function loadPostgresConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): PostgresBudgetConfig {
  return { databaseUrl: env.DATABASE_URL ?? '' };
}
