// SPDX-License-Identifier: Apache-2.0
/**
 * Per-turn budget check — thin wrapper over BudgetLedger.checkAndDecrement.
 */

import type { BudgetDecision, BudgetLedger } from '../sensei/budget-ledger.js';

export async function debitTurn(
  ledger: BudgetLedger,
  userId: string,
  credits: number,
  modelId?: string,
): Promise<BudgetDecision> {
  return ledger.checkAndDecrement(userId, credits, modelId ? { modelId } : undefined);
}
