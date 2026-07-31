// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 5 — Long-Form LLM Match (Option A, greenfield).
 *
 * Two-party attacker-LLM ↔ target-LLM turn loop with rolling-summary
 * state carry, refusal-plateau convergence detection, and per-turn
 * budget checks. Distinct from arena/match-runner.ts which is an
 * agent-simulation runner.
 */

import type { LLMModelConfig } from '../llm/types.js';

export type LongMatchMode = 'static' | 'refusal-driven';

export type LongMatchStatus =
  | 'converged'
  | 'budget-exhausted'
  | 'max-turns'
  | 'error';

export interface LongMatchConfig {
  /** Opaque match identifier (caller-supplied; UUID recommended). */
  readonly matchId: string;
  /** User whose budget is charged per turn. */
  readonly userId: string;
  /** Seed attacker payload for turn 1. */
  readonly seedPayload: string;
  /** Target system message / scenario framing (optional). */
  readonly targetSystemMessage?: string;
  /** Attacker model config (the "red-team LLM"). */
  readonly attackerModelConfig: LLMModelConfig;
  /** Target model config (the "victim under test"). */
  readonly targetModelConfig: LLMModelConfig;
  /** Turn mode: static drives fixed attacker prompt pattern;
   *  refusal-driven routes through MutationAdvisor. */
  readonly mode: LongMatchMode;
  /** Credits debited per turn. */
  readonly creditsPerTurn: number;
  /** Hard turn cap. Default 30. */
  readonly maxTurns?: number;
  /** Recent-N turns carried verbatim. Default 5. */
  readonly contextWindowTurns?: number;
  /** Regenerate rolling summary every K turns. Default 5. */
  readonly summariseEveryK?: number;
  /** Consecutive-refusal count to declare convergence. Default 3. */
  readonly convergenceN?: number;
  /** Cosine similarity threshold over refusal text. Default 0.9. */
  readonly convergenceSimilarityThreshold?: number;
  /** Category passed to MutationAdvisor in refusal-driven mode. */
  readonly mutationCategory?: string;
}

export interface Turn {
  readonly index: number;
  readonly attackerPayload: string;
  readonly targetResponse: string;
  readonly refusalDetected: boolean;
  readonly mutationStrategy?: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costCents: number;
}

export interface TranscriptState {
  /** Full untruncated turn log — kept for post-match analysis. */
  readonly fullLog: readonly Turn[];
  /** Rolling summary regenerated every K turns. */
  readonly rollingSummary: string;
  /** Recent turns kept verbatim for attacker context. */
  readonly recentWindow: readonly Turn[];
}

export interface ConvergenceSignal {
  readonly converged: boolean;
  readonly reason?: string;
}

export interface LongMatchResult {
  readonly matchId: string;
  readonly status: LongMatchStatus;
  readonly turnsRun: number;
  readonly creditsConsumed: number;
  readonly transcript: TranscriptState;
  readonly error?: string;
}

/** Thrown when KUMITE_LONG_MATCH_ENABLED is off. */
export class FeatureFlagDisabledError extends Error {
  readonly code = 'LONG_MATCH.FLAG_DISABLED' as const;
  constructor(flag: string) {
    super(`Feature flag "${flag}" is disabled.`);
    this.name = 'FeatureFlagDisabledError';
  }
}

/** Thrown when refusal-driven mode is requested before Gap 4 (#140) lands. */
export class NotYetImplementedError extends Error {
  readonly code = 'LONG_MATCH.NOT_YET_IMPLEMENTED' as const;
  constructor(feature: string) {
    super(`${feature} is not yet implemented.`);
    this.name = 'NotYetImplementedError';
  }
}
