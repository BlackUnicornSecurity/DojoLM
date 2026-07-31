// SPDX-License-Identifier: Apache-2.0
/**
 * File: types.ts
 * Purpose: Gap 10 — cross-feature attack-chain orchestrator types.
 * Story: Industry-tools parity plan §Gap 10 (lines 579–619).
 *
 * v1 scope cut: typed-TS chain builders only (no YAML DSL, no visualizer).
 * Orchestrator is pure composition — it consumes existing APIs
 * (budget-ledger, refusal-aware-runner, long-match runner, Kotoba
 * dialect-api, scanner-profile) without mutating their public surfaces.
 *
 * Safety notes:
 * - Step IDs must be filename-safe (audit-lesson #176 / #178 M-1).
 * - Lookup against model-family keys uses `Object.hasOwn` (audit-lesson
 *   #181 M-1).
 * - User-supplied strings (chainId, stepId, seed) are stripped of
 *   bidi-override codepoints (audit-lesson #182 audit M-01).
 * - R-T1: step telemetry never carries raw payload content — only hash
 *   + length when relevant.
 */

import type { RedactedPayload } from '../telemetry/types.js';

// ---------------------------------------------------------------------------
// Refusal classes (shared with Gap 4 refusal-classifier vocabulary)
// ---------------------------------------------------------------------------

/**
 * Abstract refusal posture surfaced by a step. Keep narrow; concrete
 * probes may map their own labels into these buckets.
 */
export type ChainRefusalClass =
  | 'compliance'     // target complied — attack succeeded
  | 'soft-refusal'   // hedge / partial refusal, worth retrying
  | 'hard-refusal'   // firm refusal, escalate strategy
  | 'off-topic'      // target answered but not on-topic
  | 'error';         // probe threw — treat as failure unless caller says otherwise

// ---------------------------------------------------------------------------
// Step contract — every chain node implements this
// ---------------------------------------------------------------------------

/**
 * Target handle passed to every primitive. Abstracts over concrete
 * delivery (API vs. product-UI) so the orchestrator never duplicates
 * transport logic — the primitive owns that.
 */
export interface ChainTarget {
  /** Stable target identifier (e.g. "claude-api:prod"). */
  readonly id: string;
  /** Coarse model family label — routed via Kotoba dialect heuristics. */
  readonly modelFamily: string;
  /** Optional concrete model id (e.g. `claude-sonnet-4-6`). */
  readonly modelId?: string;
  /**
   * Caller-supplied metadata — opaque to the orchestrator. Useful for
   * primitives that need provider-specific knobs (e.g. tool lists for
   * tool-abuse). Must be a plain object; keys looked up with
   * `Object.hasOwn` per audit-lesson #181 M-1.
   */
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Outcome of a single step invocation. */
export interface StepOutcome {
  readonly refusalClass: ChainRefusalClass;
  /** Credits actually charged. `0` when the step is budget-free. */
  readonly creditsConsumed: number;
  /** Redacted input hash (R-T1). */
  readonly inputRedacted?: RedactedPayload;
  /** Redacted output hash (R-T1). */
  readonly outputRedacted?: RedactedPayload;
  /** Free-form error message when `refusalClass === 'error'`. */
  readonly errorMessage?: string;
  /**
   * Opaque, primitive-defined context passed to downstream steps.
   * MUST NOT contain raw payload content — hash/len/refusal-class only.
   */
  readonly context?: Readonly<Record<string, unknown>>;
}

/** Deterministic execution context available to each primitive. */
export interface StepExecContext {
  readonly chainId: string;
  readonly stepIndex: number;
  readonly seed: string;
  readonly target: ChainTarget;
  /** Accumulated context from prior steps, newest last. */
  readonly history: readonly StepHistoryEntry[];
}

export interface StepHistoryEntry {
  readonly stepId: string;
  readonly refusalClass: ChainRefusalClass;
  readonly context?: Readonly<Record<string, unknown>>;
}

/** A primitive — the unit the chain builder composes. */
export interface ChainPrimitive {
  /** Filename-safe identifier (ASCII alnum + dash/underscore only). */
  readonly id: string;
  /** Coarse category used for telemetry + catalog UX. */
  readonly category:
    | 'memory-poison'
    | 'artifact-exfil'
    | 'tool-abuse'
    | 'context-decay'
    | 'system-prompt-leak'
    | 'dialect-probe'
    | 'long-match'
    | 'custom';
  /** Credits debited from the ledger before the step runs. */
  readonly credits: number;
  /** Whether the primitive reaches a product-UI target (Gap 3). */
  readonly requiresGap3?: boolean;
  /** Synchronous or async execution. MUST be deterministic for the same seed + target. */
  execute(ctx: StepExecContext): Promise<StepOutcome>;
}

// ---------------------------------------------------------------------------
// Chain structure
// ---------------------------------------------------------------------------

/** Edge predicate — chosen by the runner after each step. */
export type EdgeCondition = 'onSuccess' | 'onSoftRefusal' | 'onHardRefusal' | 'onError' | 'always';

export interface ChainEdge {
  readonly condition: EdgeCondition;
  readonly nextStepId: string;
}

export interface ChainNode {
  readonly stepId: string;
  readonly primitive: ChainPrimitive;
  readonly edges: readonly ChainEdge[];
}

export interface BushidoChain {
  readonly id: string;
  readonly entryStepId: string;
  readonly nodes: ReadonlyMap<string, ChainNode>;
  /** Optional human-readable description — not used in execution. */
  readonly description?: string;
}

// ---------------------------------------------------------------------------
// Transcript — deterministic replay unit
// ---------------------------------------------------------------------------

export type ChainStopReason =
  | 'success'
  | 'budget-exhausted'
  | 'no-transition'
  | 'converged'
  | 'max-steps'
  | 'illegal-transition'
  | 'error';

export interface ChainStepLogEntry {
  readonly index: number;
  readonly stepId: string;
  readonly primitiveId: string;
  readonly category: ChainPrimitive['category'];
  readonly outcome: StepOutcome;
  /** Condition that was fired to reach the next step (if any). */
  readonly firedCondition?: EdgeCondition;
  /** Next step id (if transition happened). */
  readonly nextStepId?: string;
  /** Monotonic nanosecond-less timestamp relative to chain start. */
  readonly elapsedMs: number;
}

export interface ChainTranscript {
  readonly chainId: string;
  readonly targetId: string;
  readonly seed: string;
  readonly steps: readonly ChainStepLogEntry[];
  readonly stopReason: ChainStopReason;
  readonly totalCreditsConsumed: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly succeeded: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ChainConfigurationError extends Error {
  readonly code = 'BUSHIDO.CHAIN.CONFIG' as const;
  constructor(message: string) {
    super(message);
    this.name = 'ChainConfigurationError';
  }
}

export class IllegalTransitionError extends Error {
  readonly code = 'BUSHIDO.CHAIN.ILLEGAL_TRANSITION' as const;
  constructor(stepId: string, target: string) {
    super(`Illegal transition from step "${stepId}" to unknown step "${target}"`);
    this.name = 'IllegalTransitionError';
  }
}

/**
 * Thrown when a chain references a Gap 3 product-UI primitive that has
 * not yet been wired. Deferred by design — the v1 orchestrator is API-
 * only; product-UI delegation lands with Gap 3.
 */
export class Gap3NotReadyError extends Error {
  readonly code = 'BUSHIDO.GAP3.NOT_READY' as const;
  constructor(primitiveId: string) {
    super(
      `Primitive "${primitiveId}" delegates to a Gap 3 probe target that ` +
        'is not yet shipped. v1 chain-orchestrator ships API-only primitives; ' +
        'product-UI primitives will wire in once Gap 3 probe targets land.',
    );
    this.name = 'Gap3NotReadyError';
  }
}
