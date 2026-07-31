// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/replay-delta — baseline delta strip (OSS, Epic 6 / P2.1).
 *
 * Structured deltas only, derived from facts — never raw payload. The schema
 * carries the sample count `n` AND a dispersion measure so a single run can
 * never masquerade as a characterized result (audit F-Eval / F5): a delta below
 * {@link MIN_SIGNIFICANT_DELTA_N} renders as "single-observation, not
 * significant". Pure + deterministic: no I/O, no clock.
 *
 * A delta compares a numeric `baseline` (the original proof's metric) against a
 * set of replay `observations` of the same metric. With one observation we can
 * state the change but not its dispersion; with `n ≥ MIN_SIGNIFICANT_DELTA_N` we
 * also report the sample standard deviation as the dispersion band.
 */

/** Documented minimum sample count for a delta to claim significance. */
export const MIN_SIGNIFICANT_DELTA_N = 2;

/** Max length of a delta's `metric` label (bounded at the lib boundary). */
export const MAX_TATAMI_DELTA_METRIC_LEN = 128;

/**
 * Relative tolerance for the `no_change` verdict. `observedMean - baseline` is
 * computed floating-point arithmetic, so a true "no change" over float metrics
 * (e.g. 0.1 + 0.2) lands a few ULPs off zero; a fixed scale-relative epsilon
 * keeps that from being mislabelled `significant`.
 */
const NO_CHANGE_RELATIVE_EPSILON = 1e-9;

export type TatamiDeltaSignificance = 'single_observation' | 'no_change' | 'significant';
export type TatamiDispersionKind = 'none' | 'stddev';

/** A dispersion band over the observations. `none` when `n < 2` (undefined spread). */
export interface TatamiDispersion {
  readonly kind: TatamiDispersionKind;
  /** Sample standard deviation when `kind === 'stddev'`; `0` when `kind === 'none'`. */
  readonly value: number;
}

export interface TatamiDelta {
  readonly metric: string;
  readonly baseline: number;
  /** Mean of the observations. */
  readonly observedMean: number;
  /** `observedMean - baseline`. */
  readonly absoluteChange: number;
  /** `absoluteChange / baseline`; omitted when `baseline === 0` (undefined ratio). */
  readonly relativeChange?: number;
  /** Number of replay observations behind this delta. */
  readonly n: number;
  readonly dispersion: TatamiDispersion;
  readonly significance: TatamiDeltaSignificance;
}

function mean(xs: readonly number[]): number {
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** Sample (n-1) standard deviation. Caller guarantees `xs.length >= 2`. */
function sampleStddev(xs: readonly number[], mu: number): number {
  let acc = 0;
  for (const x of xs) acc += (x - mu) ** 2;
  return Math.sqrt(acc / (xs.length - 1));
}

/**
 * Build a structured delta of `metric` from its `baseline` and replay
 * `observations`. Throws on an empty observation set (a delta needs ≥1 fact) or
 * a non-finite input (NaN/±Infinity would silently corrupt the dispersion band).
 *
 * - `n < MIN_SIGNIFICANT_DELTA_N` → `single_observation` (dispersion `none`).
 * - `n ≥ MIN_SIGNIFICANT_DELTA_N`, mean equals baseline → `no_change`.
 * - otherwise → `significant`, with a sample-stddev dispersion band.
 */
export function buildDelta(
  metric: string,
  baseline: number,
  observations: readonly number[],
): TatamiDelta {
  if (metric.length === 0 || metric.length > MAX_TATAMI_DELTA_METRIC_LEN) {
    throw new Error(`buildDelta: metric must be 1..${MAX_TATAMI_DELTA_METRIC_LEN} chars`);
  }
  // The metric label flows verbatim into describeDelta / behaviour-change
  // statements; reject control characters (newlines, NUL, …) so it can't inject
  // into a log line or a one-line report.
  if (/[\u0000-\u001f\u007f]/.test(metric)) {
    throw new Error('buildDelta: metric must not contain control characters');
  }
  if (observations.length === 0) {
    throw new Error('buildDelta: at least one observation is required');
  }
  if (!Number.isFinite(baseline) || observations.some((x) => !Number.isFinite(x))) {
    throw new Error('buildDelta: baseline and observations must be finite numbers');
  }

  const n = observations.length;
  const observedMean = mean(observations);
  const absoluteChange = observedMean - baseline;

  const dispersion: TatamiDispersion =
    n >= MIN_SIGNIFICANT_DELTA_N
      ? { kind: 'stddev', value: sampleStddev(observations, observedMean) }
      : { kind: 'none', value: 0 };

  // Scale-relative tolerance: a change within a few ULPs of the magnitudes in
  // play is treated as no change rather than a spurious `significant`.
  const noChangeTolerance =
    NO_CHANGE_RELATIVE_EPSILON * Math.max(Math.abs(baseline), Math.abs(observedMean), 1);

  let significance: TatamiDeltaSignificance;
  if (n < MIN_SIGNIFICANT_DELTA_N) significance = 'single_observation';
  else if (Math.abs(absoluteChange) <= noChangeTolerance) significance = 'no_change';
  else significance = 'significant';

  const delta: TatamiDelta = {
    metric,
    baseline,
    observedMean,
    absoluteChange,
    n,
    dispersion,
    significance,
  };
  return baseline === 0 ? delta : { ...delta, relativeChange: absoluteChange / baseline };
}

/**
 * One-line, customer-safe description of a delta — the UI/receipt label. A
 * sub-threshold delta is explicitly NOT presented as a finding.
 */
export function describeDelta(delta: TatamiDelta): string {
  if (delta.significance === 'single_observation') {
    return `${delta.metric}: single-observation, not significant (n=${delta.n})`;
  }
  const band =
    delta.dispersion.kind === 'stddev' && delta.dispersion.value > 0
      ? ` ±${delta.dispersion.value.toFixed(2)}`
      : '';
  if (delta.significance === 'no_change') {
    return `${delta.metric}: no change${band} over n=${delta.n}`;
  }
  const sign = delta.absoluteChange > 0 ? '+' : '';
  return `${delta.metric}: ${sign}${delta.absoluteChange.toFixed(2)}${band} over n=${delta.n}`;
}
