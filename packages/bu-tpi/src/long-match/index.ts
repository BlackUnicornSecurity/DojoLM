// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 5 — Long-form LLM match module (Option A, greenfield).
 *
 * Distinct from `arena/match-runner.ts` (agent-simulation). This module
 * hosts the two-party attacker-LLM ↔ target-LLM turn loop with
 * convergence detection, rolling-summary state carry, and per-turn
 * budget gating.
 */

export { runLongMatch } from './runner.js';
export type {
  LongMatchDeps,
  LongMatchEmitter,
  LongMatchTelemetryEnvelope,
} from './runner.js';
export {
  FeatureFlagDisabledError,
  NotYetImplementedError,
} from './types.js';
export type {
  ConvergenceSignal,
  LongMatchConfig,
  LongMatchMode,
  LongMatchResult,
  LongMatchStatus,
  TranscriptState,
  Turn,
} from './types.js';
export {
  DEFAULT_CONTEXT_WINDOW,
  DEFAULT_SUMMARISE_EVERY_K,
  appendTurn,
  emptyTranscript,
  renderAttackerContext,
  shouldSummarise,
  withSummary,
} from './transcript.js';
export {
  DEFAULT_CONVERGENCE_N,
  DEFAULT_CONVERGENCE_SIMILARITY,
  cosineSimilarity,
  detectConvergence,
  detectRefusal,
} from './convergence.js';
export { LLMSummariser } from './summariser.js';
export type { Summariser } from './summariser.js';
export { debitTurn } from './budget-integration.js';
