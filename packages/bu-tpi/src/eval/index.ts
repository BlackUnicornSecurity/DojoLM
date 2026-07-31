// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/eval — Gap 13 multi-model evaluation primitives.
 */
export {
  estimateRaceCost,
  defaultPromptTokenEstimator,
  EMPTY_COST_TABLE,
} from './cost-estimator.js';
export type {
  ModelCostEntry,
  ModelCostTable,
  RaceCostEstimate,
  EstimateRaceCostInput,
} from './cost-estimator.js';

export {
  createOpenRouterAdapter,
} from './openrouter-adapter.js';
export type {
  OpenRouterHttpRequest,
  OpenRouterHttpResponse,
  OpenRouterHttpClient,
  OpenRouterAdapterConfig,
} from './openrouter-adapter.js';

export {
  mutateSeed,
  shouldMutate,
  MAX_ROUND_DEPTH,
  MUTATION_STRATEGY_IDS,
} from './active-mutator.js';
export type {
  MutationStrategyId,
  MutationBudget,
  MutationInput,
  MutationResult,
} from './active-mutator.js';

export {
  rewriteForConsistency,
  identityRewriteEngine,
  normalizeRewriteEngine,
  REWRITE_STYLES,
} from './consistency-rewriter.js';
export type {
  RewriteStyle,
  RewriteEngine,
  RewriteRequest,
  RewriteResult,
} from './consistency-rewriter.js';

export {
  compareRefusals,
  classifyRefusalFragments,
} from './refusal-comparator.js';
export type {
  FragmentKind,
  RefusalFragment,
  ComparatorInput,
  ComparatorModelEntry,
  ComparatorResult,
  CompareRefusalsOptions,
} from './refusal-comparator.js';
