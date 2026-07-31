// SPDX-License-Identifier: Apache-2.0
/**
 * File: quarantine.ts
 * Purpose: Per-batch anomaly detector for community-feed ingestion.
 * Story: Gap 2 (INDUSTRY-TOOLS-PARITY §Gap 2 lines 327–330)
 *
 * Two independent checks run over a pending ingestion batch:
 *
 * 1. **Size spike** — batch size is ≥ `SIZE_SPIKE_MULTIPLIER` × the
 *    rolling baseline for the source. If the baseline is unset or zero
 *    we fall back to `MIN_BASELINE_FOR_SPIKE_CHECK` so an empty source
 *    can't bootstrap a 0-baseline false positive.
 *
 * 2. **Unknown-category ratio** — fraction of payloads whose community
 *    labels fail to map onto the Dojo taxonomy (see `taxonomy-bridge`)
 *    is strictly greater than `UNKNOWN_CATEGORY_RATIO_THRESHOLD`.
 *
 * Either trigger quarantines the whole batch. The verdict carries the
 * metric + threshold so telemetry can emit `amaterasu.batch.quarantined`
 * with a reason code.
 */

import { mapCommunityLabel, unknownCategoryRatio } from './taxonomy-bridge.js';

/** >3× normal size → quarantine (plan line 328). */
export const SIZE_SPIKE_MULTIPLIER = 3;
/** >10 % unknown categories → quarantine (plan line 328). */
export const UNKNOWN_CATEGORY_RATIO_THRESHOLD = 0.1;
/**
 * Baseline floor. Prevents a zero-baseline from triggering a spike alert
 * on the very first sync, while still catching obvious 1→1000 regressions.
 */
export const MIN_BASELINE_FOR_SPIKE_CHECK = 50;

/** Reason codes mirror the telemetry event schema. */
export type QuarantineReason =
  | 'size-spike'
  | 'unknown-category-ratio'
  | 'sanitizer-findings'
  | 'manual';

export interface QuarantineInput {
  readonly sourceId: string;
  readonly size: number;
  readonly labels: ReadonlyArray<string | readonly string[] | null | undefined>;
  /** Prior rolling-average batch size for this source. `null` / `0` → use floor. */
  readonly baselineSize?: number | null;
  /** If set, use this unknown-ratio threshold instead of the default. */
  readonly unknownRatioThreshold?: number;
  /** If set, use this size multiplier instead of the default. */
  readonly sizeMultiplier?: number;
}

export type QuarantineVerdict =
  | { readonly kind: 'clear' }
  | {
      readonly kind: 'quarantine';
      readonly reason: QuarantineReason;
      readonly metric: number;
      readonly threshold: number;
      readonly message: string;
    };

/**
 * Evaluate anomaly triggers and return a verdict. The check order
 * (size first, then category ratio) is stable; callers relying on the
 * first-trigger-wins semantics can chain additional checks after this.
 */
export function evaluateBatch(input: QuarantineInput): QuarantineVerdict {
  const multiplier = input.sizeMultiplier ?? SIZE_SPIKE_MULTIPLIER;
  const ratioThreshold = input.unknownRatioThreshold ?? UNKNOWN_CATEGORY_RATIO_THRESHOLD;
  const baseline = Math.max(input.baselineSize ?? 0, MIN_BASELINE_FOR_SPIKE_CHECK);
  const spikeThreshold = baseline * multiplier;

  if (input.size >= spikeThreshold && input.size > 0) {
    return {
      kind: 'quarantine',
      reason: 'size-spike',
      metric: input.size,
      threshold: spikeThreshold,
      message: `batch size ${input.size} ≥ ${multiplier}× baseline (${baseline}) for source ${input.sourceId}`,
    };
  }

  const ratio = unknownCategoryRatio(input.labels);
  if (ratio > ratioThreshold) {
    return {
      kind: 'quarantine',
      reason: 'unknown-category-ratio',
      metric: ratio,
      threshold: ratioThreshold,
      message: `unknown-category ratio ${(ratio * 100).toFixed(1)}% > ${(ratioThreshold * 100).toFixed(1)}% for source ${input.sourceId}`,
    };
  }

  return { kind: 'clear' };
}

/**
 * Convenience for callers that have raw label strings but want a
 * single-shot verdict; splits the ingress/evaluate concerns cleanly in
 * tests.
 */
export function classifyLabels(
  labels: ReadonlyArray<string | readonly string[] | null | undefined>,
): { readonly known: number; readonly unknown: number; readonly ratio: number } {
  let known = 0;
  let unknown = 0;
  for (const label of labels) {
    if (mapCommunityLabel(label) === 'unknown') unknown++;
    else known++;
  }
  const total = known + unknown;
  return { known, unknown, ratio: total === 0 ? 0 : unknown / total };
}
