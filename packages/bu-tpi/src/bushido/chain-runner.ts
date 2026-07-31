// SPDX-License-Identifier: Apache-2.0
/**
 * File: chain-runner.ts
 * Purpose: Execute a BushidoChain against a ChainTarget.
 *
 * Responsibilities:
 *   1. Drive the step graph — evaluate edge conditions, detect illegal
 *      transitions, honor `max-steps` and convergence short-circuit.
 *   2. Consume budget credits from the shipped Gap 1 ledger for every
 *      step. On denial, abort with `budget-exhausted`.
 *   3. Emit R-T1-compliant telemetry: `bushido.chain.started`,
 *      `bushido.chain.step.executed`, `bushido.chain.completed`. Payload
 *      content NEVER appears — only hash+length (already enforced by
 *      the StepOutcome shape).
 *   4. Deterministic replay — same (chain, target, seed) + the same
 *      primitive implementations reproduce the identical step log.
 */

import { createHash } from 'node:crypto';

import type { BudgetLedger } from '../sensei/budget-ledger.js';
import { sanitizeId, sanitizeSeed } from './safety.js';
import {
  IllegalTransitionError,
  type BushidoChain,
  type ChainNode,
  type ChainRefusalClass,
  type ChainStepLogEntry,
  type ChainStopReason,
  type ChainTarget,
  type ChainTranscript,
  type EdgeCondition,
  type StepExecContext,
  type StepHistoryEntry,
  type StepOutcome,
} from './types.js';

const DEFAULT_MAX_STEPS = 32;
const DEFAULT_CONVERGENCE_WINDOW = 3;

// ---------------------------------------------------------------------------
// Telemetry envelopes — caller injects this to route to the telemetry bus.
// ---------------------------------------------------------------------------

/** R-T1-safe telemetry payload for `bushido.chain.started`. */
export interface BushidoChainStartedEvent {
  readonly type: 'bushido.chain.started';
  readonly chainId: string;
  readonly targetId: string;
  readonly seedHashPrefix: string;
  readonly startedAt: string;
}

/** R-T1-safe telemetry payload for `bushido.chain.step.executed`. */
export interface BushidoChainStepExecutedEvent {
  readonly type: 'bushido.chain.step.executed';
  readonly chainId: string;
  readonly stepId: string;
  readonly stepIndex: number;
  readonly primitiveId: string;
  readonly category: string;
  readonly refusalClass: ChainRefusalClass;
  readonly creditsConsumed: number;
  readonly elapsedMs: number;
}

/** R-T1-safe telemetry payload for `bushido.chain.completed`. */
export interface BushidoChainCompletedEvent {
  readonly type: 'bushido.chain.completed';
  readonly chainId: string;
  readonly targetId: string;
  readonly stopReason: ChainStopReason;
  readonly totalCreditsConsumed: number;
  readonly stepCount: number;
  readonly succeeded: boolean;
  readonly durationMs: number;
}

export interface ChainRunnerTelemetry {
  onStarted?(event: BushidoChainStartedEvent): void;
  onStepExecuted?(event: BushidoChainStepExecutedEvent): void;
  onCompleted?(event: BushidoChainCompletedEvent): void;
}

// ---------------------------------------------------------------------------
// Runner config
// ---------------------------------------------------------------------------

export interface ChainRunnerConfig {
  readonly userId: string;
  readonly seed: string;
  readonly target: ChainTarget;
  /** Safety cap on total steps. Default 32. */
  readonly maxSteps?: number;
  /**
   * Consecutive identical-(primitiveId, refusalClass) steps at which we
   * short-circuit with `converged`. Default 3.
   */
  readonly convergenceWindow?: number;
}

export interface ChainRunnerDeps {
  readonly budgetLedger: BudgetLedger;
  readonly telemetry?: ChainRunnerTelemetry;
  /** Injectable clock for deterministic tests. Returns epoch-ms. */
  readonly now?: () => number;
  /** Injectable hasher for `seedHashPrefix` in started event (hex, 8 chars). */
  readonly hashSeed?: (seed: string) => string;
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Execute a chain. Throws `IllegalTransitionError` on malformed edges
 * encountered at runtime (should be caught by builder.build(), but
 * defense-in-depth). All other stop conditions surface via
 * `ChainTranscript.stopReason`.
 */
export async function runChain(
  deps: ChainRunnerDeps,
  chain: BushidoChain,
  config: ChainRunnerConfig,
): Promise<ChainTranscript> {
  // Safety: sanitize user-supplied seed + config pieces.
  const seed = sanitizeSeed(config.seed);
  const maxSteps = config.maxSteps ?? DEFAULT_MAX_STEPS;
  const convergenceWindow = config.convergenceWindow ?? DEFAULT_CONVERGENCE_WINDOW;
  const now = deps.now ?? Date.now;
  const hashSeed = deps.hashSeed ?? defaultSeedHashPrefix;

  const startedAtMs = now();
  const startedAt = new Date(startedAtMs).toISOString();

  deps.telemetry?.onStarted?.({
    type: 'bushido.chain.started',
    chainId: chain.id,
    targetId: config.target.id,
    seedHashPrefix: hashSeed(seed),
    startedAt,
  });

  const steps: ChainStepLogEntry[] = [];
  const history: StepHistoryEntry[] = [];
  let totalCreditsConsumed = 0;
  let stopReason: ChainStopReason = 'max-steps';
  let succeeded = false;

  let currentStepId: string | undefined = chain.entryStepId;
  let stepIndex = 0;

  while (currentStepId !== undefined && stepIndex < maxSteps) {
    const node = chain.nodes.get(currentStepId);
    if (!node) {
      // Defense-in-depth — builder.build() should already have rejected this.
      throw new IllegalTransitionError(
        steps.at(-1)?.stepId ?? '<entry>',
        currentStepId,
      );
    }

    // 1. Budget check BEFORE invoking the primitive.
    const primitiveCredits = Math.max(0, node.primitive.credits | 0);
    if (primitiveCredits > 0) {
      const decision = await deps.budgetLedger.checkAndDecrement(
        config.userId,
        primitiveCredits,
        // Gate on the CONCRETE model id (not the stable target id) so an
        // admin per-model cap binds. Absent modelId → uncapped (user+app only).
        { modelId: config.target.modelId },
      );
      if (decision.verdict === 'denied') {
        stopReason = 'budget-exhausted';
        break;
      }
      totalCreditsConsumed += decision.requestedCredits;
    }

    // 2. Execute the primitive.
    const execCtx: StepExecContext = {
      chainId: chain.id,
      stepIndex,
      seed,
      target: config.target,
      history: [...history],
    };
    const stepStartMs = now();
    let outcome: StepOutcome;
    try {
      outcome = await node.primitive.execute(execCtx);
    } catch (err) {
      outcome = {
        refusalClass: 'error',
        creditsConsumed: 0,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
    // Post-#185 M-1: `elapsedMs` is the per-step duration (stepEnd -
    // stepStart), NOT cumulative-from-chain-start. Capture stepEndMs
    // AFTER `execute` returns so the value reflects actual primitive
    // work, not wall-clock-since-chain-start.
    const stepEndMs = now();

    const stepEntry: ChainStepLogEntry = {
      index: stepIndex,
      stepId: node.stepId,
      primitiveId: node.primitive.id,
      category: node.primitive.category,
      outcome,
      elapsedMs: stepEndMs - stepStartMs,
    };

    // 3. Pick next edge based on refusal class.
    const firedEdge = pickEdge(node, outcome.refusalClass);
    const nextStepId = firedEdge?.nextStepId;

    const enriched: ChainStepLogEntry = {
      ...stepEntry,
      firedCondition: firedEdge?.condition,
      nextStepId,
    };
    steps.push(enriched);

    deps.telemetry?.onStepExecuted?.({
      type: 'bushido.chain.step.executed',
      chainId: chain.id,
      stepId: node.stepId,
      stepIndex,
      primitiveId: node.primitive.id,
      category: node.primitive.category,
      refusalClass: outcome.refusalClass,
      creditsConsumed: primitiveCredits,
      elapsedMs: enriched.elapsedMs,
    });

    history.push({
      stepId: node.stepId,
      refusalClass: outcome.refusalClass,
      context: outcome.context,
    });

    // 4. Success short-circuit.
    if (outcome.refusalClass === 'compliance') {
      succeeded = true;
      stopReason = 'success';
      break;
    }

    // 5. Convergence: N consecutive identical (primitiveId + refusalClass).
    if (detectConvergence(steps, convergenceWindow)) {
      stopReason = 'converged';
      break;
    }

    // 6. No next step → halt.
    if (nextStepId === undefined) {
      stopReason = outcome.refusalClass === 'error' ? 'error' : 'no-transition';
      break;
    }

    // 7. Validate target exists (belt-and-braces — builder already enforces).
    if (!chain.nodes.has(nextStepId)) {
      throw new IllegalTransitionError(node.stepId, nextStepId);
    }

    currentStepId = nextStepId;
    stepIndex++;
  }

  const completedAtMs = now();
  const completedAt = new Date(completedAtMs).toISOString();
  const transcript: ChainTranscript = {
    chainId: chain.id,
    targetId: config.target.id,
    seed,
    steps,
    stopReason,
    totalCreditsConsumed,
    startedAt,
    completedAt,
    succeeded,
  };

  deps.telemetry?.onCompleted?.({
    type: 'bushido.chain.completed',
    chainId: chain.id,
    targetId: config.target.id,
    stopReason,
    totalCreditsConsumed,
    stepCount: steps.length,
    succeeded,
    durationMs: completedAtMs - startedAtMs,
  });

  return transcript;
}

// ---------------------------------------------------------------------------
// Edge dispatch
// ---------------------------------------------------------------------------

const REFUSAL_TO_CONDITION: Readonly<Record<ChainRefusalClass, EdgeCondition>> = {
  compliance: 'onSuccess',
  'soft-refusal': 'onSoftRefusal',
  'hard-refusal': 'onHardRefusal',
  'off-topic': 'onSoftRefusal',
  error: 'onError',
};

function pickEdge(node: ChainNode, refusalClass: ChainRefusalClass) {
  const preferred = REFUSAL_TO_CONDITION[refusalClass];
  const match = node.edges.find((e) => e.condition === preferred);
  if (match) return match;
  // Fallback to `always` — builder gates duplicates, so at most one.
  return node.edges.find((e) => e.condition === 'always');
}

// ---------------------------------------------------------------------------
// Convergence detector
// ---------------------------------------------------------------------------

/**
 * Short-circuit when the last `windowSize` steps all have the same
 * `(primitiveId, refusalClass)` — i.e. the chain has stopped making
 * progress.
 *
 * Post-#185 L-2: oscillation cap. Even with a persistent 2-step
 * oscillation pattern, the runner's outer `stepIndex < maxSteps` loop
 * remains the hard upper bound — convergence here only detects
 * CONSTANT repetition, not alternating cycles. Alternating patterns
 * still consume up to `maxSteps` credits then exit with
 * `stopReason: 'max-steps'`. This is intentional: detecting oscillation
 * cheaply would require a longer sliding-window comparator, which we
 * have not needed in practice.
 */
function detectConvergence(
  steps: readonly ChainStepLogEntry[],
  windowSize: number,
): boolean {
  if (windowSize < 2 || steps.length < windowSize) return false;
  const window = steps.slice(-windowSize);
  const first = window[0]!;
  return window.every(
    (s) =>
      s.primitiveId === first.primitiveId &&
      s.outcome.refusalClass === first.outcome.refusalClass,
  );
}

// ---------------------------------------------------------------------------
// Seed hash — used only for telemetry `seedHashPrefix`. Not cryptographic.
// ---------------------------------------------------------------------------

function defaultSeedHashPrefix(seed: string): string {
  // LOW-2 fix (adversarial audit 2026-04-22): FNV-1a's 32-bit state is
  // trivially reversible — an attacker who sees a `seedHashPrefix` in
  // telemetry can brute-force the original seed. We use the first 8 hex
  // chars of a SHA-256 digest instead: the prefix is non-reversible and
  // still narrow enough to serve as a visibility-only hint.
  return createHash('sha256').update(seed, 'utf8').digest('hex').slice(0, 8);
}

/** Re-export for tests + advanced callers. */
export { defaultSeedHashPrefix };

/** Public alias used for deterministic-replay helpers (see `bushido.ts`). */
export function transcriptStepIds(t: ChainTranscript): readonly string[] {
  return t.steps.map((s) => s.stepId);
}

/** Sanitize a user-supplied chain id before lookup — exported for tests. */
export function sanitizeChainId(id: string): string {
  return sanitizeId(id, 'chainId');
}
