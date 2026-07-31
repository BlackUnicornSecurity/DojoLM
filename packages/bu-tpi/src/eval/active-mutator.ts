// SPDX-License-Identifier: Apache-2.0
/**
 * File: active-mutator.ts
 * Purpose: Gap 13.B active seed-mutator for multi-round KUMITE races.
 * Story: Industry-tools parity plan §Gap 13.3 active mutator (harm-path).
 *
 * v1-deferred scope: deterministic rule-based seed mutator that runs
 * BETWEEN race rounds. Budget-gated, kill-switch-aware, hard-cap depth.
 * Flag-gated by ADAPTIVE_SAMPLER_ENABLED (harmPath, default-off, shipped
 * in #187).
 *
 * Design rules:
 * - Pure library, no I/O. Mutation strategies are deterministic functions
 *   of (seed, round, strategyId, refusalClass) so a replay with the same
 *   inputs yields byte-identical output.
 * - Budget ceiling: each call decrements a budget handle; when the
 *   budget hits zero, `shouldMutate` returns false.
 * - Hard-cap depth: MAX_ROUND_DEPTH prevents runaway loops even if the
 *   caller miscomputes budget.
 * - Kill-switch-aware: if a CancellationToken is cancelled, the mutator
 *   is a no-op (returns the input unchanged, flags abort=true).
 * - R-T1: no prompt content in telemetry — only seed length, strategy
 *   id, round number, and hash-suffixed bucket id.
 *
 * Audit discipline: bidi-strip, ID_PATTERN, RESERVED_PROTO_IDS denylist.
 */

import { createHash } from 'node:crypto';
import { stripBidiOverrides } from '../bushido/safety.js';
import type { CancellationToken } from '../flags/kill-switch.js';
import type { RefusalClass } from '../arena/race-types.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);

export const MAX_ROUND_DEPTH = 8;
export const MAX_SEED_LEN = 256;
export const MIN_SEED_LEN = 1;

function ensureSafeId(raw: string, kind: string): string {
  if (typeof raw !== 'string') throw new TypeError(`${kind} must be a string`);
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > 128) {
    throw new RangeError(`${kind} length must be 1..128`);
  }
  if (!ID_PATTERN.test(stripped)) {
    throw new Error(`${kind} "${stripped}" is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(stripped)) {
    throw new Error(`${kind} "${stripped}" is a reserved prototype name`);
  }
  return stripped;
}

function ensureSeed(raw: string): string {
  if (typeof raw !== 'string') throw new TypeError('seed must be a string');
  const stripped = stripBidiOverrides(raw);
  if (stripped.length < MIN_SEED_LEN || stripped.length > MAX_SEED_LEN) {
    throw new RangeError(
      `seed length must be ${MIN_SEED_LEN}..${MAX_SEED_LEN}`,
    );
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(stripped)) {
    throw new Error('seed must not contain control characters');
  }
  return stripped;
}

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Rule-based mutation strategies. Each strategy is a pure function:
 * (seed, round) → nextSeed. Determinism lets tests assert byte-identical
 * output for identical inputs.
 */
export type MutationStrategyId =
  | 'append-round-marker'
  | 'double-prefix'
  | 'reverse-tail'
  | 'identity';

const STRATEGIES: Readonly<Record<MutationStrategyId, (s: string, r: number) => string>> =
  Object.freeze({
    'append-round-marker': (seed: string, round: number): string => {
      const next = `${seed}.r${round}`;
      return next.slice(-MAX_SEED_LEN);
    },
    'double-prefix': (seed: string, _round: number): string => {
      const prefix = seed.slice(0, Math.min(8, seed.length));
      const next = `${prefix}${seed}`;
      return next.slice(-MAX_SEED_LEN);
    },
    'reverse-tail': (seed: string, _round: number): string => {
      const tail = seed.slice(-8);
      const next = `${seed.slice(0, -8)}${tail.split('').reverse().join('')}`;
      return next.slice(-MAX_SEED_LEN);
    },
    identity: (seed: string, _round: number): string => seed,
  });

export const MUTATION_STRATEGY_IDS: readonly MutationStrategyId[] = Object.freeze([
  'append-round-marker',
  'double-prefix',
  'reverse-tail',
  'identity',
]);

export interface MutationBudget {
  /** Remaining mutation budget (decremented per successful mutation). */
  remaining: number;
}

export interface MutationInput {
  readonly modelId: string;
  readonly round: number;
  readonly priorSeed: string;
  readonly refusalClass: RefusalClass;
  readonly strategyId: MutationStrategyId;
  readonly flagEnabled: boolean;
  readonly budget: MutationBudget;
  readonly cancellationToken?: CancellationToken;
}

export interface MutationResult {
  readonly mutated: boolean;
  readonly aborted: boolean;
  readonly reason:
    | 'ok'
    | 'flag-off'
    | 'budget-exhausted'
    | 'depth-cap'
    | 'cancelled'
    | 'refusal-compliant';
  readonly nextSeed: string;
  readonly strategyId: MutationStrategyId;
  readonly round: number;
  readonly seedHash: string;
  readonly modelId: string;
}

/**
 * Determine whether mutation should happen at all.
 *
 * Returns false when:
 *   - flag off (harmPath gate)
 *   - budget exhausted
 *   - depth cap reached (R-K5 loop guard)
 *   - cancellation token fired
 *   - refusal class is 'compliant' (no need to mutate on a successful
 *     response — that's the attacker-view signal, defender's view says
 *     "stop iterating")
 */
export function shouldMutate(input: {
  readonly flagEnabled: boolean;
  readonly round: number;
  readonly budget: MutationBudget;
  readonly refusalClass: RefusalClass;
  readonly cancellationToken?: CancellationToken;
}): { proceed: boolean; reason: MutationResult['reason'] } {
  if (!input.flagEnabled) return { proceed: false, reason: 'flag-off' };
  if (input.cancellationToken?.cancelled)
    return { proceed: false, reason: 'cancelled' };
  if (input.round >= MAX_ROUND_DEPTH)
    return { proceed: false, reason: 'depth-cap' };
  if (input.budget.remaining <= 0)
    return { proceed: false, reason: 'budget-exhausted' };
  if (input.refusalClass === 'compliant')
    return { proceed: false, reason: 'refusal-compliant' };
  return { proceed: true, reason: 'ok' };
}

/**
 * Run a single mutation round. Deterministic, pure modulo budget
 * decrement. Returns `mutated: false` with an explicit reason when
 * mutation is suppressed.
 */
export function mutateSeed(input: MutationInput): MutationResult {
  const modelId = ensureSafeId(input.modelId, 'modelId');
  const priorSeed = ensureSeed(input.priorSeed);
  const strategyId = input.strategyId;
  if (!Object.hasOwn(STRATEGIES, strategyId)) {
    throw new Error(`unknown mutation strategy "${strategyId}"`);
  }
  if (!Number.isInteger(input.round) || input.round < 0) {
    throw new RangeError('round must be a non-negative integer');
  }

  const decision = shouldMutate({
    flagEnabled: input.flagEnabled,
    round: input.round,
    budget: input.budget,
    refusalClass: input.refusalClass,
    cancellationToken: input.cancellationToken,
  });
  if (!decision.proceed) {
    return Object.freeze<MutationResult>({
      mutated: false,
      aborted: decision.reason === 'cancelled',
      reason: decision.reason,
      nextSeed: priorSeed,
      strategyId,
      round: input.round,
      seedHash: sha256Hex(priorSeed),
      modelId,
    });
  }

  const nextRaw = STRATEGIES[strategyId](priorSeed, input.round);
  // Ensure nextSeed still valid for downstream consumers.
  let nextSeed = nextRaw;
  if (nextSeed.length < MIN_SEED_LEN || nextSeed.length > MAX_SEED_LEN) {
    // Fall back to identity if strategy produced invalid output.
    nextSeed = priorSeed;
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(nextSeed)) {
    nextSeed = priorSeed;
  }
  // Commit: decrement budget only when an actual mutation happens.
  input.budget.remaining -= 1;

  return Object.freeze<MutationResult>({
    mutated: nextSeed !== priorSeed,
    aborted: false,
    reason: 'ok',
    nextSeed,
    strategyId,
    round: input.round,
    seedHash: sha256Hex(nextSeed),
    modelId,
  });
}

export const __testing = Object.freeze({
  ensureSafeId,
  ensureSeed,
  STRATEGIES,
});
