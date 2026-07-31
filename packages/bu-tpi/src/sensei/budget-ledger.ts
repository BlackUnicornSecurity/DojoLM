// SPDX-License-Identifier: Apache-2.0
/**
 * Budget-ledger interface and core types (DEC-3, Gap 0.4).
 *
 * The ledger is the enforcement point for per-user LLM spend caps.
 * checkAndDecrement() is the critical-path gate; every LLM call must
 * pass through it.  Telemetry (`sensei.budget.decision`) is emitted
 * AFTER the ledger decision — not here, in the caller.
 *
 * Phase 0 ships:
 * - The interface + types.
 * - InMemoryBudgetLedger (dev/test adapter).
 * - PostgresBudgetLedger scaffold (config-validation only; SQL wired
 *   in Phase E with Gap 4 Hydra integration).
 */

/** Whether a budget check approved or denied the requested spend. */
export type BudgetVerdict = 'approved' | 'denied';

/** Result of checkAndDecrement(). */
export interface BudgetDecision {
  readonly verdict: BudgetVerdict;
  /** Credits requested in this call. */
  readonly requestedCredits: number;
  /** Remaining credits AFTER this decision (0 if denied). */
  readonly remainingCredits: number;
  /**
   * Human-readable reason when denied. **Must NOT contain user-supplied
   * content** — callers/consumers (probe-runner, race-runner, chain-runner)
   * forward this string into telemetry/audit/error responses, where
   * unredacted user content would violate R-T1. Adapters MUST cap the
   * reason length and emit only operator-controlled strings.
   */
  readonly reason?: string;
}

/** Point-in-time snapshot of a user's budget state. */
export interface BudgetSnapshot {
  readonly userId: string;
  readonly capCredits: number;
  readonly spentCredits: number;
  readonly remainingCredits: number;
  /** ISO-8601 UTC start of the current budget period. */
  readonly periodStart: string;
}

/** Configuration for a budget cap. */
export interface BudgetCap {
  readonly capCredits: number;
  /** ISO-8601 UTC. Defaults to now if omitted. */
  readonly periodStart?: string;
}

// ---------------------------------------------------------------------------
// Multi-scope budgets (per-user | per-model | application-wide)
// ---------------------------------------------------------------------------

/**
 * A budget scope. A single `budget_ledger` row exists per scope.
 *
 * - `user`  — the existing per-user cap. An **absent** row means cap 0
 *             (denied for any non-zero cost) — the pre-existing contract
 *             callers rely on (they `setCap` before spending).
 * - `model` — a per-model cap. An **absent** row means UNCAPPED — the model
 *             is only bounded by the app-wide scope, if one is set.
 * - `app`   — the single application-wide ceiling (`id` fixed to `'*'`).
 *             An **absent** row means UNCAPPED.
 *
 * Composition rule (the crux — see checkAndDecrement): a call is DENIED if
 * ANY *applicable* capped scope would be exceeded; it is charged against
 * ALL applicable scopes atomically. "Applicable" = user (always) + model
 * (if a modelId is supplied AND a row exists) + app (if a row exists).
 */
export type BudgetScopeKind = 'user' | 'model' | 'app';

export interface BudgetScope {
  readonly kind: BudgetScopeKind;
  /** userId, modelId, or `'*'` for the app-wide singleton. */
  readonly id: string;
}

/** The single application-wide scope. */
export const APP_SCOPE: BudgetScope = Object.freeze({ kind: 'app', id: '*' });

export function userScope(userId: string): BudgetScope {
  return { kind: 'user', id: userId };
}

export function modelScope(modelId: string): BudgetScope {
  return { kind: 'model', id: modelId };
}

/** Stable string key for a scope — used for map keys and lock ordering. */
export function scopeKey(scope: BudgetScope): string {
  return `${scope.kind}:${scope.id}`;
}

/**
 * The binding constraint among applicable scopes: the one with the
 * SMALLEST remaining balance (ties broken by scopeKey for determinism).
 * Both adapters use this so denial `reason` + `remainingCredits` agree.
 * Returns undefined when no scope is capped (fully uncapped call).
 */
export function tightestScope<T extends { readonly scope: BudgetScope; readonly remaining: number }>(
  scopes: readonly T[],
): T | undefined {
  let best: T | undefined;
  for (const s of scopes) {
    if (
      !best ||
      s.remaining < best.remaining ||
      (s.remaining === best.remaining && scopeKey(s.scope) < scopeKey(best.scope))
    ) {
      best = s;
    }
  }
  return best;
}

/** Snapshot of a single scope's budget state (admin read surface). */
export interface ScopeBudgetSnapshot {
  readonly scope: BudgetScope;
  readonly capCredits: number;
  readonly spentCredits: number;
  readonly remainingCredits: number;
  /** ISO-8601 UTC start of the current budget period. */
  readonly periodStart: string;
}

/** Options for checkAndDecrement — the model whose per-model cap applies. */
export interface CheckAndDecrementOptions {
  /** When set, the model's per-model cap (if any) is also gated + charged. */
  readonly modelId?: string;
}

/**
 * Thrown when a BudgetLedger adapter is constructed without required
 * credentials or configuration.
 */
export class BudgetLedgerNotConfiguredError extends Error {
  readonly code = 'BUDGET.LEDGER.NOT_CONFIGURED' as const;
  constructor(backend: string) {
    super(
      `Budget ledger backend "${backend}" is not configured. ` +
        'Set the required environment variables before starting the server.',
    );
    this.name = 'BudgetLedgerNotConfiguredError';
  }
}

/**
 * Thrown when a BudgetLedger adapter method is intentionally unimplemented
 * at this phase. Postgres is the sole production adapter per DEC-3 +
 * ADR-0001 (Redis deferred to Phase G). The interface stays
 * driver-agnostic so a future adapter can slot in if any of the ADR's
 * reopen triggers fire. Distinct from `NotConfigured` — this means the
 * adapter was constructed successfully but the requested operation
 * is not yet wired.
 */
export class BudgetLedgerNotImplementedError extends Error {
  readonly code = 'BUDGET.LEDGER.NOT_IMPLEMENTED' as const;
  constructor(backend: string, method: string, plannedPhase: string) {
    super(
      `BudgetLedger method "${backend}.${method}()" is a scaffold ` +
        `planned for ${plannedPhase}. Do not invoke in production.`,
    );
    this.name = 'BudgetLedgerNotImplementedError';
  }
}

/**
 * Budget ledger contract.
 *
 * All operations MUST be atomic and safe for concurrent calls.
 * Implementations must prevent overspend (spent_credits > cap_credits).
 */
export interface BudgetLedger {
  /**
   * Atomically gate a spend across ALL applicable scopes and, if approved,
   * decrement every one of them by `requestedCredits`.
   *
   * Applicable scopes: the user (always) + the model named in
   * `opts.modelId` (if that model has a cap row) + the app-wide scope
   * (if one is set). DENIED if ANY applicable scope has insufficient
   * remaining; charged against all of them otherwise. `remainingCredits`
   * reports the tightest (smallest) remaining balance across scopes.
   */
  checkAndDecrement(
    userId: string,
    requestedCredits: number,
    opts?: CheckAndDecrementOptions,
  ): Promise<BudgetDecision>;

  /** Read current per-user budget state without modifying it. */
  getSnapshot(userId: string): Promise<BudgetSnapshot>;

  /**
   * Set or replace a user's budget cap.  If no cap exists, creates one.
   * Sets spent_credits to 0 when a new period_start is provided.
   */
  setCap(userId: string, cap: BudgetCap): Promise<void>;
}

/**
 * Admin configuration surface for multi-scope caps — a SUPERSET of the
 * hot-path `BudgetLedger` enforcement contract. Segregated so that the
 * many enforcement-only consumers/doubles (runners, `withBudget`) keep
 * satisfying the 3-method `BudgetLedger` without gaining admin methods
 * they never call. The two shipped adapters implement this wider
 * interface; the admin route + shared singleton type against it.
 */
export interface BudgetAdminLedger extends BudgetLedger {
  /**
   * Set or replace the cap for ANY scope (user | model | app).
   * Same period-reset semantics as setCap. Used by the admin surface.
   */
  setScopeCap(scope: BudgetScope, cap: BudgetCap): Promise<void>;

  /**
   * Remove a scope's cap row entirely. For `model`/`app` scopes this
   * makes them UNCAPPED again. No-op if the row does not exist.
   */
  clearScopeCap(scope: BudgetScope): Promise<void>;

  /**
   * List every configured cap, optionally filtered to one kind.
   * Admin read surface — ordered by (kind, scope id).
   */
  listScopeCaps(kind?: BudgetScopeKind): Promise<ScopeBudgetSnapshot[]>;
}

/** Factory: read BUDGET_LEDGER_BACKEND and return the right adapter. */
export function readBudgetBackend(
  env: NodeJS.ProcessEnv = process.env,
): 'postgres' | 'memory' {
  const raw = env.BUDGET_LEDGER_BACKEND?.toLowerCase();
  if (raw === 'postgres') return 'postgres';
  return 'memory';
}
