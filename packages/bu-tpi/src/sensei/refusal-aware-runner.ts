// SPDX-License-Identifier: Apache-2.0
/**
 * Refusal-aware closed-loop campaign runner (Gap 4 / #140, PR-140c).
 *
 * Orchestrates the Hydra loop:
 *   1. Charge ledger for the sensei (rewriter) call at the resolved tier
 *   2. Call the target model with the current attacker payload
 *   3. Classify the target's refusal posture
 *   4. If complied / off-topic → success, exit
 *   5. Otherwise ask the sensei for refusal-aware mutations
 *   6. Pick best mutation as next attacker payload
 *   7. Stop on: convergence, max turns, budget exhausted, or success
 *
 * Does NOT touch the existing `runProbeCampaign` path. Independent
 * orchestrator wired into Gap 4's refusal-driven mode.
 */

import type {
  LLMModelConfig,
  LLMProviderAdapter,
  ProviderRequestOptions,
  SenseiTier,
} from '../llm/types.js';
import type { LLMCallMetadata } from '../telemetry/llm-call-metadata.js';
import { redactString } from '../telemetry/redaction.js';
import type { RedactedPayload } from '../telemetry/types.js';
import type { BudgetLedger } from './budget-ledger.js';
import { detectConvergence, DEFAULT_WINDOW_SIZE, DEFAULT_SIMILARITY_THRESHOLD } from './convergence.js';
import { adviseMutationsFromRefusal, type MutationSuggestion } from './mutation-advisor.js';
import { classifyRefusal, type RefusalSignal } from './refusal-classifier.js';
import { selectAttackerModel, type TierSelection, type TierCallTelemetry } from './tier-router.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunnerStopReason =
  | 'success'
  | 'max-turns'
  | 'budget-exhausted'
  | 'converged'
  | 'no-mutations';

export interface RunnerTurn {
  readonly turnIndex: number;
  readonly attackerPayload: string;
  readonly targetResponse: string;
  readonly refusal: RefusalSignal;
  readonly tierSelection: TierSelection;
  readonly mutationStrategy?: string;
}

export interface RunnerResult {
  readonly stopReason: RunnerStopReason;
  readonly turns: readonly RunnerTurn[];
  readonly totalTurns: number;
  readonly creditsSpent: number;
  readonly converged: boolean;
  readonly succeeded: boolean;
  readonly elapsed: number;
}

export interface RunnerInput {
  readonly userId: string;
  readonly category: string;
  readonly seedPayload: string;
  readonly targetAdapter: LLMProviderAdapter;
  readonly targetConfig: LLMModelConfig;
  readonly senseiAdapter: LLMProviderAdapter;
  /** Resolved by the tier router each turn; only the tier is passed here. */
  readonly senseiTier: SenseiTier;
  /**
   * Optional engagement identifier used in telemetry events. When omitted,
   * telemetry hooks are still invoked but the engagementId field is the
   * empty string — the caller is responsible for filling it in before
   * forwarding to any sink.
   */
  readonly engagementId?: string;
}

export interface RunnerConfig {
  readonly maxTurns?: number;
  readonly convergenceWindow?: number;
  readonly convergenceThreshold?: number;
}

/** Per-turn telemetry shape — matches `sensei.hydra.turn` schema. */
export interface HydraTurnTelemetry {
  readonly engagementId: string;
  readonly turnIndex: number;
  readonly attackerPayload: RedactedPayload;
  readonly targetResponse: RedactedPayload;
  readonly refusalClass: string;
  readonly mutationStrategy?: string;
  readonly llmCallMetadata: LLMCallMetadata;
}

/** Breakthrough telemetry — matches `sensei.hydra.breakthrough` schema. */
export interface HydraBreakthroughTelemetry {
  readonly engagementId: string;
  readonly turnsRequired: number;
  readonly attackerPayload: RedactedPayload;
}

/** Budget-abort telemetry — matches `sensei.hydra.budget_abort` schema. */
export interface HydraBudgetAbortTelemetry {
  readonly engagementId: string;
  readonly turnsRun: number;
  readonly creditsConsumed: number;
}

/** Convergence telemetry — matches `sensei.hydra.converged` schema. */
export interface HydraConvergedTelemetry {
  readonly engagementId: string;
  readonly turnsRun: number;
  readonly creditsConsumed: number;
  readonly windowSize: number;
  readonly minPairwiseSimilarity: number;
  readonly similarityThreshold: number;
}

export interface RunnerDeps {
  readonly ledger: BudgetLedger;
  readonly emitTierCall?: (e: TierCallTelemetry) => void;
  /** Called after every turn for external observers (tests, runners). */
  readonly onTurn?: (turn: RunnerTurn) => void;
  /** Emits the `sensei.hydra.turn` telemetry shape (R-T1 redacted). */
  readonly emitHydraTurn?: (e: HydraTurnTelemetry) => void;
  /** Emits the `sensei.hydra.breakthrough` telemetry shape. */
  readonly emitBreakthrough?: (e: HydraBreakthroughTelemetry) => void;
  /** Emits the `sensei.hydra.budget_abort` telemetry shape. */
  readonly emitBudgetAbort?: (e: HydraBudgetAbortTelemetry) => void;
  /** Emits the `sensei.hydra.converged` telemetry shape. */
  readonly emitConverged?: (e: HydraConvergedTelemetry) => void;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_MAX_TURNS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickBestMutation(
  suggestions: readonly MutationSuggestion[],
): MutationSuggestion | undefined {
  if (suggestions.length === 0) return undefined;
  // Prefer suggestions that claim to preserve semantics and have the
  // highest confidence.
  const sorted = [...suggestions].sort((a, b) => {
    if (a.preservesSemantics !== b.preservesSemantics) {
      return a.preservesSemantics ? -1 : 1;
    }
    return b.confidence - a.confidence;
  });
  return sorted[0];
}

/**
 * Build a sensei model config for the resolved tier. We reuse the
 * target adapter's type assumptions minimally — concrete production
 * wiring supplies a full `LLMModelConfig` pool per tier; this helper is
 * a conservative default that most tests + CLIs can use.
 */
function buildSenseiConfig(model: string): LLMModelConfig {
  const now = new Date().toISOString();
  return {
    id: `sensei-${model}`,
    name: `Sensei (${model})`,
    provider: 'anthropic',
    model,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

const KNOWN_VENDORS = new Set([
  'anthropic', 'openai', 'google', 'meta', 'mistral',
  'cohere', 'openrouter', 'local', 'other',
]);

function toLLMVendor(provider: string): LLMCallMetadata['targetVendor'] {
  if (KNOWN_VENDORS.has(provider)) {
    return provider as LLMCallMetadata['targetVendor'];
  }
  return 'other';
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Run the refusal-aware closed-loop campaign.
 *
 * Budget policy: every turn charges the ledger for the sensei (rewriter)
 * call at the resolved tier via `selectAttackerModel`. When all tiers
 * are denied, the runner halts with `stopReason: 'budget-exhausted'` and
 * returns the turns completed so far — no further ledger charges, no
 * partial turn records for the denied turn.
 *
 * Success: target `complied` or `off-topic`.
 * Convergence: last N responses with pairwise similarity ≥ threshold.
 */
export async function runRefusalAwareCampaign(
  input: RunnerInput,
  config: RunnerConfig,
  deps: RunnerDeps,
): Promise<RunnerResult> {
  const start = performance.now();
  const maxTurns = config.maxTurns ?? DEFAULT_MAX_TURNS;
  const windowSize = config.convergenceWindow ?? DEFAULT_WINDOW_SIZE;
  const threshold = config.convergenceThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

  const turns: RunnerTurn[] = [];
  const responseHistory: string[] = [];
  let creditsSpent = 0;
  let currentPayload = input.seedPayload;

  for (let i = 0; i < maxTurns; i += 1) {
    const tierSelection = await selectAttackerModel(input.userId, input.senseiTier, {
      ledger: deps.ledger,
      emitTierCall: deps.emitTierCall,
    });

    if (tierSelection.verdict === 'denied') {
      deps.emitBudgetAbort?.({
        engagementId: input.engagementId ?? '',
        turnsRun: turns.length,
        creditsConsumed: creditsSpent,
      });
      return finalise({
        stopReason: 'budget-exhausted',
        turns,
        creditsSpent,
        start,
      });
    }

    creditsSpent += tierSelection.creditsCharged;

    const targetOptions: ProviderRequestOptions = {
      prompt: currentPayload,
      maxTokens: 1024,
      temperature: 0.7,
    };
    const targetResult = await input.targetAdapter.execute(input.targetConfig, targetOptions);
    const targetResponse = targetResult.text;

    const refusal = classifyRefusal(targetResponse, { attackerPayload: currentPayload });

    const redactedAttacker = redactString(currentPayload);
    const redactedTarget = redactString(targetResponse);
    const llmCallMetadata: LLMCallMetadata = {
      targetVendor: toLLMVendor(input.targetConfig.provider),
      targetModel: input.targetConfig.model,
      tokensIn: targetResult.promptTokens,
      tokensOut: targetResult.completionTokens,
      costCents: 0,
      tier: input.senseiTier,
    };

    const turn: RunnerTurn = {
      turnIndex: i,
      attackerPayload: currentPayload,
      targetResponse,
      refusal,
      tierSelection,
    };

    // Success: target actually produced non-refusal output.
    if (refusal.class === 'complied' || refusal.class === 'off-topic') {
      const finalTurn = { ...turn };
      turns.push(finalTurn);
      deps.onTurn?.(finalTurn);
      deps.emitHydraTurn?.({
        engagementId: input.engagementId ?? '',
        turnIndex: i,
        attackerPayload: redactedAttacker,
        targetResponse: redactedTarget,
        refusalClass: refusal.class,
        llmCallMetadata,
      });
      deps.emitBreakthrough?.({
        engagementId: input.engagementId ?? '',
        turnsRequired: turns.length,
        attackerPayload: redactedAttacker,
      });
      return finalise({ stopReason: 'success', turns, creditsSpent, start });
    }

    responseHistory.push(targetResponse);

    // Convergence check.
    const convergence = detectConvergence(responseHistory, {
      windowSize,
      similarityThreshold: threshold,
    });
    if (convergence.converged) {
      turns.push(turn);
      deps.onTurn?.(turn);
      deps.emitHydraTurn?.({
        engagementId: input.engagementId ?? '',
        turnIndex: i,
        attackerPayload: redactedAttacker,
        targetResponse: redactedTarget,
        refusalClass: refusal.class,
        llmCallMetadata,
      });
      deps.emitConverged?.({
        engagementId: input.engagementId ?? '',
        turnsRun: turns.length,
        creditsConsumed: creditsSpent,
        windowSize,
        minPairwiseSimilarity: convergence.minPairwiseSimilarity,
        similarityThreshold: threshold,
      });
      return finalise({ stopReason: 'converged', turns, creditsSpent, start, converged: true });
    }

    // Ask sensei for the next mutation.
    const senseiConfig = buildSenseiConfig(tierSelection.model);
    const advisory = await adviseMutationsFromRefusal(input.senseiAdapter, senseiConfig, {
      content: currentPayload,
      category: input.category,
      targetResponse,
      refusalSignal: refusal,
    });

    const best = pickBestMutation(advisory.suggestions);
    if (!best) {
      turns.push(turn);
      deps.onTurn?.(turn);
      deps.emitHydraTurn?.({
        engagementId: input.engagementId ?? '',
        turnIndex: i,
        attackerPayload: redactedAttacker,
        targetResponse: redactedTarget,
        refusalClass: refusal.class,
        llmCallMetadata,
      });
      return finalise({ stopReason: 'no-mutations', turns, creditsSpent, start });
    }

    const turnWithStrategy: RunnerTurn = { ...turn, mutationStrategy: best.strategy };
    turns.push(turnWithStrategy);
    deps.onTurn?.(turnWithStrategy);
    deps.emitHydraTurn?.({
      engagementId: input.engagementId ?? '',
      turnIndex: i,
      attackerPayload: redactedAttacker,
      targetResponse: redactedTarget,
      refusalClass: refusal.class,
      mutationStrategy: best.strategy,
      llmCallMetadata,
    });
    currentPayload = best.mutatedContent;
  }

  return finalise({ stopReason: 'max-turns', turns, creditsSpent, start });
}

// ---------------------------------------------------------------------------
// Finalise helper
// ---------------------------------------------------------------------------

function finalise(input: {
  stopReason: RunnerStopReason;
  turns: RunnerTurn[];
  creditsSpent: number;
  start: number;
  converged?: boolean;
}): RunnerResult {
  return {
    stopReason: input.stopReason,
    turns: input.turns,
    totalTurns: input.turns.length,
    creditsSpent: input.creditsSpent,
    converged: input.converged ?? false,
    succeeded: input.stopReason === 'success',
    elapsed: performance.now() - input.start,
  };
}
