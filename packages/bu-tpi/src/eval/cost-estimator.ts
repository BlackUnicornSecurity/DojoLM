// SPDX-License-Identifier: Apache-2.0
/**
 * File: cost-estimator.ts
 * Purpose: Gap 13.A per-model cost estimator emitted BEFORE budget reserve.
 * Story: Industry-tools parity plan §Gap 13.2 pre-flight cost modal +
 *        post-merge deferral of #187.
 *
 * v1-deferred scope: deterministic rule-based estimator. Accepts a
 * MICRO-USD-per-1k-token table (input/output split) and returns an
 * integer micro-USD total. The estimator is:
 *   - Deterministic — identical inputs yield identical outputs.
 *   - Pure — no I/O, no globals, no clock.
 *   - R-T1 compliant — returns ids + integer totals only.
 *
 * Invariants:
 * 1. Per-model lookup uses `Object.hasOwn` (post-#181 lesson) so an id
 *    matching `constructor`/`prototype`/`__proto__` cannot hit the
 *    prototype chain.
 * 2. Unknown model ids surface as `unknown-model` entry with zero cost —
 *    caller decides whether to proceed.
 * 3. Returned perModelMicroUsd map is frozen.
 *
 * Used by race-runner before it reserves budget so the caller can emit
 * `kumite.race.cost_estimated` + surface a pre-flight modal.
 */

const MAX_MICRO_USD = Number.MAX_SAFE_INTEGER;

/** Per-model cost entry (micro-USD per 1000 tokens). */
export interface ModelCostEntry {
  readonly inputMicroUsdPer1k: number;
  readonly outputMicroUsdPer1k: number;
}

export interface ModelCostTable {
  /** Map-like record keyed by model id. */
  readonly entries: Readonly<Record<string, ModelCostEntry>>;
}

export interface RaceCostEstimate {
  readonly modelCount: number;
  readonly promptTokensEstimated: number;
  readonly completionTokensEstimated: number;
  readonly totalMicroUsd: number;
  readonly perModelMicroUsd: Readonly<Record<string, number>>;
  readonly unknownModelIds: readonly string[];
}

function safeGetEntry(
  table: ModelCostTable,
  modelId: string,
): ModelCostEntry | undefined {
  if (!Object.hasOwn(table.entries, modelId)) return undefined;
  return table.entries[modelId];
}

function clamp(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > MAX_MICRO_USD) return MAX_MICRO_USD;
  return Math.floor(n);
}

/**
 * Default char-to-token heuristic: 4 chars per token, rounded up.
 * Conservative (over-estimates slightly on short prompts), deterministic,
 * no tokenizer dependency.
 */
export function defaultPromptTokenEstimator(prompt: string): number {
  if (typeof prompt !== 'string' || prompt.length === 0) return 0;
  return Math.ceil(prompt.length / 4);
}

export interface EstimateRaceCostInput {
  readonly modelIds: readonly string[];
  readonly costTable: ModelCostTable;
  readonly promptTokens: number;
  readonly completionTokens: number;
}

/**
 * Deterministic cost projection.
 *
 * Per-model cost:
 *   (promptTokens / 1000) * inputMicroUsdPer1k
 * + (completionTokens / 1000) * outputMicroUsdPer1k
 *
 * Results are integer-clamped (floor) to prevent fractional precision
 * drift in telemetry.
 */
export function estimateRaceCost(
  input: EstimateRaceCostInput,
): RaceCostEstimate {
  const { modelIds, costTable, promptTokens, completionTokens } = input;
  if (!Array.isArray(modelIds)) {
    throw new TypeError('modelIds must be an array');
  }
  if (!Number.isFinite(promptTokens) || promptTokens < 0) {
    throw new RangeError('promptTokens must be ≥ 0');
  }
  if (!Number.isFinite(completionTokens) || completionTokens < 0) {
    throw new RangeError('completionTokens must be ≥ 0');
  }

  const perModel: Record<string, number> = Object.create(null);
  const unknown: string[] = [];
  let total = 0;

  for (const modelId of modelIds) {
    const entry = safeGetEntry(costTable, modelId);
    if (!entry) {
      perModel[modelId] = 0;
      unknown.push(modelId);
      continue;
    }
    const inputCost = (promptTokens / 1000) * entry.inputMicroUsdPer1k;
    const outputCost = (completionTokens / 1000) * entry.outputMicroUsdPer1k;
    const cost = clamp(inputCost + outputCost);
    perModel[modelId] = cost;
    total = Math.min(MAX_MICRO_USD, total + cost);
  }

  return Object.freeze<RaceCostEstimate>({
    modelCount: modelIds.length,
    promptTokensEstimated: Math.floor(promptTokens),
    completionTokensEstimated: Math.floor(completionTokens),
    totalMicroUsd: clamp(total),
    perModelMicroUsd: Object.freeze({ ...perModel }),
    unknownModelIds: Object.freeze([...unknown]),
  });
}

/** Empty/default cost table for flag-off or test defaults. */
export const EMPTY_COST_TABLE: ModelCostTable = Object.freeze({
  entries: Object.freeze({}),
});
