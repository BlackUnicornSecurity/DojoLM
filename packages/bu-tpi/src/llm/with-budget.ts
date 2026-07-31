// SPDX-License-Identifier: Apache-2.0
/**
 * withBudget — R-B1 enforcement helper.
 *
 * Every LLM call site MUST be wrapped in this helper.  Direct SDK calls
 * (`anthropic.messages.create`, `openai.chat.completions.create`, etc.)
 * outside this module are caught by the pre-commit lint check in
 * tools/check-budget-gate.ts.
 *
 * Design choices per R-B2:
 * - Ledger writes are APPEND-ONLY, NO REFUNDS.
 * - If `fn` throws, credits are NOT refunded (partial runs charged in full).
 * - Budget denial throws BudgetExceededError before `fn` is called.
 */

import type { BudgetLedger } from '../sensei/budget-ledger.js';

export class BudgetExceededError extends Error {
  readonly code = 'BUDGET.EXCEEDED' as const;
  readonly userId: string;
  readonly requestedCredits: number;
  readonly remainingCredits: number;

  constructor(
    userId: string,
    requestedCredits: number,
    remainingCredits: number,
    reason?: string,
  ) {
    super(
      reason ??
        `Budget exceeded for user "${userId}": requested ${requestedCredits}, ` +
          `only ${remainingCredits} remaining.`,
    );
    this.name = 'BudgetExceededError';
    this.userId = userId;
    this.requestedCredits = requestedCredits;
    this.remainingCredits = remainingCredits;
  }
}

/**
 * Gate an LLM call through the budget ledger.
 *
 * @param ledger    Budget ledger instance (use the default from DI root).
 * @param userId    The user whose budget is consumed.
 * @param costEstimate  Credits to deduct (must be >= 0).
 * @param fn        The LLM call to execute when budget is approved.
 * @returns The result of `fn()`.
 * @throws BudgetExceededError if the user lacks sufficient budget.
 *
 * NOTE: No refund on `fn` failure (R-B2).  Callers must not retry
 * without re-checking budget.
 */
export async function withBudget<T>(
  ledger: BudgetLedger,
  userId: string,
  costEstimate: number,
  fn: () => Promise<T>,
  opts?: { readonly modelId?: string },
): Promise<T> {
  if (costEstimate < 0) {
    throw new RangeError('costEstimate must be >= 0');
  }

  const decision = await ledger.checkAndDecrement(
    userId,
    costEstimate,
    opts?.modelId ? { modelId: opts.modelId } : undefined,
  );

  if (decision.verdict === 'denied') {
    throw new BudgetExceededError(
      userId,
      costEstimate,
      decision.remainingCredits,
      decision.reason,
    );
  }

  // Budget approved — run the call.  No catch/refund: R-B2.
  return fn();
}

/**
 * Zero-cost wrapper: gates the call but charges 0 credits.
 * Use for non-billed reads (e.g. model-listing, health checks).
 */
export async function withBudgetFree<T>(
  ledger: BudgetLedger,
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  return withBudget(ledger, userId, 0, fn);
}
