// SPDX-License-Identifier: Apache-2.0
/**
 * In-memory budget-ledger adapter (DEC-3, multi-scope).
 * Safe for single-process dev/test; NOT for production (no persistence,
 * no cross-process locking).
 *
 * Rows are keyed by scope (`user:<id>` | `model:<id>` | `app:*`). Writes
 * replace rows immutably (never mutate an existing row object).
 */

import {
  APP_SCOPE,
  scopeKey,
  userScope,
  modelScope,
  tightestScope,
  type BudgetCap,
  type BudgetDecision,
  type BudgetAdminLedger,
  type BudgetScope,
  type BudgetScopeKind,
  type BudgetSnapshot,
  type CheckAndDecrementOptions,
  type ScopeBudgetSnapshot,
} from './budget-ledger.js';

interface LedgerRow {
  readonly capCredits: number;
  readonly spentCredits: number;
  readonly periodStart: string;
}

const DEFAULT_CAP = 0;

export class InMemoryBudgetLedger implements BudgetAdminLedger {
  private readonly store = new Map<string, LedgerRow>();

  /** Read-only lookup of a user row (or a synthetic cap-0 row if unseen). */
  private userRow(userId: string): LedgerRow {
    return (
      this.store.get(scopeKey(userScope(userId))) ?? {
        capCredits: DEFAULT_CAP,
        spentCredits: 0,
        periodStart: new Date().toISOString(),
      }
    );
  }

  /** Ensure a user row exists (cap 0 if unseen) so it always gates. */
  private ensureUserRow(userId: string): void {
    const key = scopeKey(userScope(userId));
    if (!this.store.has(key)) {
      this.store.set(key, { capCredits: DEFAULT_CAP, spentCredits: 0, periodStart: new Date().toISOString() });
    }
  }

  /**
   * The scopes gated by a spend. The user row is always present (created
   * with cap 0 if unseen). Model/app rows are only included when they
   * exist — an absent model/app row means UNCAPPED.
   */
  private applicableScopes(
    userId: string,
    modelId?: string,
  ): Array<{ readonly scope: BudgetScope; readonly key: string; readonly remaining: number }> {
    this.ensureUserRow(userId);
    const candidates: BudgetScope[] = [userScope(userId)];
    if (modelId) candidates.push(modelScope(modelId));
    candidates.push(APP_SCOPE);
    const out: Array<{ scope: BudgetScope; key: string; remaining: number }> = [];
    for (const scope of candidates) {
      const key = scopeKey(scope);
      const row = this.store.get(key);
      if (row) out.push({ scope, key, remaining: row.capCredits - row.spentCredits });
    }
    return out;
  }

  async checkAndDecrement(
    userId: string,
    requestedCredits: number,
    opts?: CheckAndDecrementOptions,
  ): Promise<BudgetDecision> {
    if (requestedCredits < 0) {
      throw new RangeError('requestedCredits must be >= 0');
    }

    const scopes = this.applicableScopes(userId, opts?.modelId);
    // Deny/report against the TIGHTEST (smallest-remaining) scope — the
    // binding constraint. Deterministic + identical to the Postgres adapter.
    const binding = tightestScope(scopes);

    if (binding && requestedCredits > binding.remaining) {
      return {
        verdict: 'denied',
        requestedCredits,
        remainingCredits: binding.remaining,
        reason: `insufficient budget in ${binding.scope.kind} scope: need ${requestedCredits}, have ${binding.remaining}`,
      };
    }

    for (const s of scopes) {
      const row = this.store.get(s.key)!;
      this.store.set(s.key, { ...row, spentCredits: row.spentCredits + requestedCredits });
    }

    return {
      verdict: 'approved',
      requestedCredits,
      remainingCredits: binding ? binding.remaining - requestedCredits : 0,
    };
  }

  async getSnapshot(userId: string): Promise<BudgetSnapshot> {
    const row = this.userRow(userId);
    return {
      userId,
      capCredits: row.capCredits,
      spentCredits: row.spentCredits,
      remainingCredits: row.capCredits - row.spentCredits,
      periodStart: row.periodStart,
    };
  }

  async setCap(userId: string, cap: BudgetCap): Promise<void> {
    return this.setScopeCap(userScope(userId), cap);
  }

  async setScopeCap(scope: BudgetScope, cap: BudgetCap): Promise<void> {
    if (cap.capCredits < 0) {
      throw new RangeError('capCredits must be >= 0');
    }
    const key = scopeKey(scope);
    const existing = this.store.get(key);
    const periodStart = cap.periodStart ?? new Date().toISOString();
    const resetSpent =
      !existing || periodStart !== existing.periodStart ? 0 : existing.spentCredits;

    // Parity with the Postgres no_overspend CHECK: never persist spent > cap.
    if (resetSpent > cap.capCredits) {
      throw new RangeError('capCredits must be >= current spentCredits for the period');
    }

    this.store.set(key, {
      capCredits: cap.capCredits,
      spentCredits: resetSpent,
      periodStart,
    });
  }

  async clearScopeCap(scope: BudgetScope): Promise<void> {
    this.store.delete(scopeKey(scope));
  }

  async listScopeCaps(kind?: BudgetScopeKind): Promise<ScopeBudgetSnapshot[]> {
    const out: ScopeBudgetSnapshot[] = [];
    for (const [key, row] of this.store) {
      const sepIdx = key.indexOf(':');
      const scope: BudgetScope = {
        kind: key.slice(0, sepIdx) as BudgetScopeKind,
        id: key.slice(sepIdx + 1),
      };
      if (kind && scope.kind !== kind) continue;
      out.push({
        scope,
        capCredits: row.capCredits,
        spentCredits: row.spentCredits,
        remainingCredits: row.capCredits - row.spentCredits,
        periodStart: row.periodStart,
      });
    }
    return out.sort((a, b) =>
      a.scope.kind === b.scope.kind
        ? a.scope.id.localeCompare(b.scope.id)
        : a.scope.kind.localeCompare(b.scope.kind),
    );
  }

  /** Test helper: wipe all ledger state. */
  reset(): void {
    this.store.clear();
  }
}
