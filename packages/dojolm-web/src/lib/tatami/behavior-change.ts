// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/behavior-change — deterministic "what changed" explainer (OSS, Epic 7 / P2.3).
 *
 * Epic-7 acceptance: "Tatami says what changed WITHOUT freeform guessing." This
 * explainer is derived ENTIRELY from structured facts — the P2.1 {@link TatamiDelta}
 * strip (each carrying `n` + a dispersion band) plus an optional refusal-class
 * transition. It never invents a narrative: a sub-threshold delta is reported as
 * "single-observation, not significant" (via {@link describeDelta}) and does not
 * count as a behaviour change.
 *
 * Pure + deterministic: no I/O, no clock, no model call.
 */

import { type TatamiDelta, describeDelta } from './replay-delta';
import { type TatamiRefusalClass, isTatamiRefusalClass } from './refusal';

export interface BehaviorChangeInput {
  /** Structured metric deltas (P2.1). Sub-threshold ones are reported but not "changed". */
  readonly deltas?: readonly TatamiDelta[];
  /** Refusal class on the baseline run (P2.3), when known. */
  readonly refusalBefore?: TatamiRefusalClass;
  /** Refusal class on the compared run, when known. */
  readonly refusalAfter?: TatamiRefusalClass;
}

export interface BehaviorChangeExplanation {
  /** Deterministic, human-readable lines — each derived from a fact, in a stable order. */
  readonly statements: readonly string[];
  /** True iff a SIGNIFICANT change was observed (a refusal-class flip or a significant delta). */
  readonly changed: boolean;
}

/**
 * Explain the behaviour change between two runs from structured facts only.
 * Order is stable: the refusal-class transition first (when it flipped), then one
 * line per delta. `changed` is true iff the refusal class flipped OR at least one
 * delta is `significant` — a `single_observation` / `no_change` delta is reported
 * but does not, on its own, assert a change. Empty input → a single honest
 * "No behaviour change observed" line.
 */
export function explainBehaviorChange(input: BehaviorChangeInput): BehaviorChangeExplanation {
  const statements: string[] = [];
  let changed = false;

  const { refusalBefore, refusalAfter } = input;
  // Guard the enum values at runtime: an invalid value from an untyped/JS caller
  // or a deserialiser must not corrupt the statement (it is reported verbatim).
  if (
    isTatamiRefusalClass(refusalBefore)
    && isTatamiRefusalClass(refusalAfter)
    && refusalBefore !== refusalAfter
  ) {
    statements.push(`Refusal class changed: ${refusalBefore} → ${refusalAfter}`);
    changed = true;
  }

  for (const delta of input.deltas ?? []) {
    statements.push(describeDelta(delta));
    if (delta.significance === 'significant') changed = true;
  }

  if (statements.length === 0) {
    statements.push('No behaviour change observed');
  }
  return { statements, changed };
}
