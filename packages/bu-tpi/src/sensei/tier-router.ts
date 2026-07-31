// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei attacker-tier router (Gap 1 / Issue #139).
 *
 * `selectAttackerModel` resolves a requested `SenseiTier` to a concrete
 * model identifier, consulting the BudgetLedger to auto-degrade to a
 * cheaper tier when the requested tier would overspend. The generator
 * itself remains tier-agnostic — this module is the single integration
 * point for tier → model + budget enforcement.
 *
 * Auto-degrade order: frontier → silver → bronze. If even bronze is
 * denied, the result is `denied` with the best-effort remaining budget.
 *
 * Telemetry: emits `sensei.tier.call` with the requested and resolved
 * tiers so drift (requested vs. actual) is observable.
 */

import {
  DEFAULT_TIER_COST_MAP,
  DEFAULT_TIER_MODEL_MAP,
  SENSEI_TIERS,
  type SenseiTier,
  type TierCostMap,
  type TierModelMap,
} from '../llm/types.js';
import type { BudgetLedger } from './budget-ledger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Deps required to resolve a tier to a model under budget constraints. */
export interface TierRouterDeps {
  readonly ledger: BudgetLedger;
  /** Optional overrides — defaults shipped in llm/types.ts. */
  readonly tierModelMap?: TierModelMap;
  readonly tierCostMap?: TierCostMap;
  /** Optional telemetry emitter for drift observability. */
  readonly emitTierCall?: (event: TierCallTelemetry) => void;
}

/** Shape emitted to the telemetry pipe (adapter translates to DojoEvent). */
export interface TierCallTelemetry {
  readonly userId: string;
  readonly requestedTier: SenseiTier;
  readonly resolvedTier: SenseiTier | null;
  readonly degraded: boolean;
  readonly approved: boolean;
  readonly degradationReason?: 'budget_exhausted';
  readonly creditsCharged: number;
}

/** Successful tier resolution. */
export interface TierSelectionApproved {
  readonly verdict: 'approved';
  readonly requestedTier: SenseiTier;
  readonly resolvedTier: SenseiTier;
  readonly model: string;
  readonly creditsCharged: number;
  readonly remainingCredits: number;
  readonly degraded: boolean;
}

/** All tiers denied by the ledger. */
export interface TierSelectionDenied {
  readonly verdict: 'denied';
  readonly requestedTier: SenseiTier;
  readonly reason: string;
  readonly remainingCredits: number;
}

export type TierSelection = TierSelectionApproved | TierSelectionDenied;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build the degrade chain starting at `requestedTier` and walking down
 * to the cheapest tier. `frontier → silver → bronze`; `silver → bronze`;
 * `bronze → bronze`.
 */
export function buildDegradeChain(requestedTier: SenseiTier): readonly SenseiTier[] {
  const startIdx = SENSEI_TIERS.indexOf(requestedTier);
  if (startIdx < 0) {
    throw new RangeError(`unknown tier: ${requestedTier}`);
  }
  return SENSEI_TIERS.slice(startIdx);
}

/**
 * Resolve `requestedTier` to a concrete model, auto-degrading on budget
 * exhaustion. Consumes exactly one successful ledger charge at the
 * chosen tier when approved; charges nothing when denied at every tier.
 */
export async function selectAttackerModel(
  userId: string,
  requestedTier: SenseiTier,
  deps: TierRouterDeps,
): Promise<TierSelection> {
  const tierModelMap = deps.tierModelMap ?? DEFAULT_TIER_MODEL_MAP;
  const tierCostMap = deps.tierCostMap ?? DEFAULT_TIER_COST_MAP;
  const chain = buildDegradeChain(requestedTier);

  let lastRemaining = 0;
  let lastReason = 'insufficient budget';

  for (const candidate of chain) {
    const cost = tierCostMap[candidate];
    // Gate against the concrete model this tier resolves to, so an admin
    // per-model cap degrades the tier (fail-closed) instead of being bypassed.
    const decision = await deps.ledger.checkAndDecrement(userId, cost, {
      modelId: tierModelMap[candidate],
    });
    lastRemaining = decision.remainingCredits;

    if (decision.verdict === 'approved') {
      const degraded = candidate !== requestedTier;
      deps.emitTierCall?.({
        userId,
        requestedTier,
        resolvedTier: candidate,
        degraded,
        approved: true,
        degradationReason: degraded ? 'budget_exhausted' : undefined,
        creditsCharged: cost,
      });
      return {
        verdict: 'approved',
        requestedTier,
        resolvedTier: candidate,
        model: tierModelMap[candidate],
        creditsCharged: cost,
        remainingCredits: decision.remainingCredits,
        degraded,
      };
    }

    if (decision.reason) lastReason = decision.reason;
  }

  deps.emitTierCall?.({
    userId,
    requestedTier,
    resolvedTier: null,
    degraded: false,
    approved: false,
    degradationReason: 'budget_exhausted',
    creditsCharged: 0,
  });

  return {
    verdict: 'denied',
    requestedTier,
    reason: lastReason,
    remainingCredits: lastRemaining,
  };
}
