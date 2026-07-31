// SPDX-License-Identifier: Apache-2.0
/**
 * File: race-types.ts
 * Purpose: Gap 13.2 KUMITE parallel race — shared types.
 * Story: Industry-tools parity plan §Gap 13.2.
 *
 * v1 scope cut: primitives only (race-runner + scorer). No SSE route,
 * no UI, no pre-flight cost modal — those land in Phase F UI work.
 * This module defines the wire shape for the runner + observers.
 *
 * Audit lessons applied:
 * - #176/#178: race ids and model ids validated as filename-safe.
 * - #181: any lookup into operator/model-family maps uses Object.hasOwn.
 * - R-T1: no payload content leaves this module in telemetry — only
 *   lengths + hashes + ids.
 */

/** Refusal-class classification for a single model response. */
export type RefusalClass = 'compliant' | 'partial' | 'soft-refuse' | 'hard-refuse' | 'error';

/** Result of a single model call inside a race. */
export interface RaceCard {
  readonly modelId: string;
  readonly status: 'ok' | 'error' | 'cancelled' | 'budget_denied';
  /** Response text (sanitized by caller before this is persisted). */
  readonly responseText: string;
  /** SHA-256 of raw response, hex. Empty string for non-ok cards. */
  readonly responseHash: string;
  /** Refusal classification (deterministic, rule-based). */
  readonly refusalClass: RefusalClass;
  /** Latency in ms for this card's call. */
  readonly latencyMs: number;
  /** Credits debited for this card (always committed per R-B2). */
  readonly creditsDebited: number;
  /** Error code if status === 'error', otherwise null. */
  readonly errorCode: string | null;
}

/** Config for a race run. */
export interface RaceConfig {
  readonly raceId: string;
  readonly prompt: string;
  /** 2..50 model ids. */
  readonly modelIds: readonly string[];
  /** Reserved total budget for the entire race (R-K1). */
  readonly reservedCredits: number;
  /** Per-model credit allocation ceiling. Card is cut at 100%. */
  readonly perModelCreditCeiling: number;
  /** Deterministic seed for any non-deterministic scorer logic. */
  readonly seed: string;
}

/** Finalised race result. Frozen. */
export interface RaceResult {
  readonly raceId: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly cards: readonly RaceCard[];
  /**
   * Sum of `creditsDebited` across all cards.
   * Bound: `≤ perModelCreditCeiling × modelIds.length`
   * (NOT bounded by `reservedCredits` — the reservation is committed
   * up front per R-K1/R-B2 and is independent of the per-card ceilings).
   */
  readonly totalCreditsDebited: number;
  /** Reserved - debited, never refunded (per R-B2). */
  readonly reservedCredits: number;
  /** Count of cards per status. */
  readonly statusCounts: Readonly<Record<RaceCard['status'], number>>;
  /** Fraction of ok-status cards classified 'compliant' or 'partial'. */
  readonly bypassRate: number;
  /** Number of 'ok' cards (denominator for bypassRate). */
  readonly okCount: number;
}

/** Model adapter: tests inject deterministic fakes; prod injects real LLM clients. */
export interface RaceModelAdapter {
  readonly modelId: string;
  /**
   * Generate a response for the prompt. Must NOT throw for expected
   * failures — return a RaceCard with status 'error' instead. May throw
   * for programmer errors (invalid args).
   */
  run(input: {
    readonly prompt: string;
    readonly seed: string;
    readonly creditCeiling: number;
  }): Promise<{
    readonly responseText: string;
    readonly latencyMs: number;
    readonly creditsConsumed: number;
    readonly errorCode?: string;
  }>;
}

/** Telemetry events emitted by the race runner. */
export type RaceTelemetryEvent =
  | {
      readonly type: 'kumite.race.requested';
      readonly raceId: string;
      readonly modelCount: number;
      readonly reservedCredits: number;
      readonly promptLen: number;
      readonly promptHash: string;
    }
  | {
      readonly type: 'kumite.race.reserved';
      readonly raceId: string;
      readonly reservedCredits: number;
    }
  | {
      readonly type: 'kumite.race.model_result';
      readonly raceId: string;
      readonly modelId: string;
      readonly status: RaceCard['status'];
      readonly refusalClass: RefusalClass;
      readonly latencyMs: number;
      readonly creditsDebited: number;
      readonly responseLen: number;
      readonly responseHash: string;
    }
  | {
      readonly type: 'kumite.race.completed';
      readonly raceId: string;
      readonly okCount: number;
      readonly bypassRate: number;
      readonly totalCreditsDebited: number;
    }
  | {
      readonly type: 'kumite.race.flag_off';
      readonly raceId: string;
    }
  | {
      /**
       * Emitted BEFORE the budget reservation, once a cost table is
       * available. R-T1: carries model ids + integer micro-USD totals
       * only. No prompt content, no response content.
       */
      readonly type: 'kumite.race.cost_estimated';
      readonly raceId: string;
      readonly modelCount: number;
      readonly promptTokensEstimated: number;
      readonly completionTokensEstimated: number;
      readonly totalMicroUsd: number;
      readonly perModelMicroUsd: Readonly<Record<string, number>>;
    }
  | {
      /**
       * Emitted when KILL_KUMITE_RACE cancels the race. Includes the
       * position in the lifecycle: 'pre-fanout' | 'mid-fanout'.
       */
      readonly type: 'kumite.race.killswitch.honored';
      readonly raceId: string;
      readonly stage: 'pre-fanout' | 'mid-fanout';
    };
