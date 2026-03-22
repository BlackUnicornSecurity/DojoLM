/**
 * KATANA Non-Deterministic Module Tolerance (K5.3)
 *
 * 30 repetitions per non-deterministic module.
 * Compute mean, std dev, min, max.
 * Establish tolerance bands (mean +/- 3 sigma).
 * Separate uncertainty budget for LLM-dependent tools.
 *
 * ISO 17025 Clause: 7.2.2
 */

import {
  SCHEMA_VERSION,
  type ValidationResult,
  type ToleranceBand,
} from '../types.js';
import { VALIDATION_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToleranceOptions {
  /** Number of repetitions (default: VALIDATION_CONFIG.NON_DET_REPEATABILITY_RUNS = 30) */
  readonly runCount?: number;
  /** Sigma multiplier for tolerance bands (default: VALIDATION_CONFIG.NON_DET_SIGMA = 3) */
  readonly sigma?: number;
  /** Metrics to compute tolerance for */
  readonly metrics?: readonly string[];
}

export interface ToleranceStudyResult {
  readonly module_id: string;
  readonly run_count: number;
  readonly sigma: number;
  readonly bands: readonly ToleranceBand[];
  readonly all_within_tolerance: boolean;
  readonly timestamp: string;
}

export interface RunFunction {
  (): Promise<readonly ValidationResult[]> | readonly ValidationResult[];
}

// ---------------------------------------------------------------------------
// Metric Extraction
// ---------------------------------------------------------------------------

const DEFAULT_METRICS = ['accuracy', 'precision', 'recall', 'f1'] as const;

/**
 * Compute a metric from validation results.
 */
function computeMetric(
  results: readonly ValidationResult[],
  metric: string,
): number {
  if (results.length === 0) return 0;

  const total = results.length;
  const tp = results.filter(r => r.expected_verdict === 'malicious' && r.actual_verdict === 'malicious').length;
  const tn = results.filter(r => r.expected_verdict === 'clean' && r.actual_verdict === 'clean').length;
  const fp = results.filter(r => r.expected_verdict === 'clean' && r.actual_verdict === 'malicious').length;
  const fn = results.filter(r => r.expected_verdict === 'malicious' && r.actual_verdict === 'clean').length;

  switch (metric) {
    case 'accuracy':
      return (tp + tn) / total;
    case 'precision':
      return tp + fp > 0 ? tp / (tp + fp) : 0;
    case 'recall':
      return tp + fn > 0 ? tp / (tp + fn) : 0;
    case 'f1': {
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      return precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    }
    case 'specificity':
      return tn + fp > 0 ? tn / (tn + fp) : 0;
    case 'fpr':
      return tn + fp > 0 ? fp / (tn + fp) : 0;
    case 'fnr':
      return tp + fn > 0 ? fn / (tp + fn) : 0;
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function computeStats(values: readonly number[]): {
  mean: number;
  std_dev: number;
  min: number;
  max: number;
} {
  if (values.length === 0) {
    return { mean: 0, std_dev: 0, min: 0, max: 0 };
  }

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;

  // Sample standard deviation (n-1 denominator for unbiased estimate)
  const variance = n > 1
    ? values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n - 1)
    : 0;
  const std_dev = Math.sqrt(variance);

  return {
    mean,
    std_dev,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

/**
 * Run tolerance study for a single non-deterministic module.
 *
 * @param moduleId - Module under test
 * @param runFn - Function that executes a validation run and returns results
 * @param options - Tolerance study configuration
 * @returns ToleranceStudyResult with tolerance bands per metric
 */
export async function runToleranceStudy(
  moduleId: string,
  runFn: RunFunction,
  options?: ToleranceOptions,
): Promise<ToleranceStudyResult> {
  if (!moduleId || moduleId.length === 0) {
    throw new Error('moduleId must be non-empty');
  }

  const runCount = options?.runCount ?? VALIDATION_CONFIG.NON_DET_REPEATABILITY_RUNS;
  const sigma = options?.sigma ?? VALIDATION_CONFIG.NON_DET_SIGMA;
  const metrics = options?.metrics ?? DEFAULT_METRICS;

  if (runCount < 2) {
    throw new Error(`runCount must be >= 2, got ${runCount}`);
  }
  if (sigma <= 0) {
    throw new Error(`sigma must be > 0, got ${sigma}`);
  }

  // Collect results from all runs
  const allRuns: (readonly ValidationResult[])[] = [];
  for (let i = 0; i < runCount; i++) {
    const results = await runFn();
    allRuns.push(results);
  }

  // Compute tolerance bands per metric
  const bands: ToleranceBand[] = [];
  let allWithinTolerance = true;

  for (const metric of metrics) {
    const metricValues = allRuns.map(run => computeMetric(run, metric));
    const stats = computeStats(metricValues);

    const rawLower = stats.mean - sigma * stats.std_dev;
    const rawUpper = stats.mean + sigma * stats.std_dev;
    // Clamp to [0, 1] for bounded metrics (all supported metrics are ratios)
    const lowerBound = Math.max(0, rawLower);
    const upperBound = Math.min(1, rawUpper);

    const withinTolerance = metricValues.every(
      v => v >= lowerBound && v <= upperBound,
    );
    if (!withinTolerance) allWithinTolerance = false;

    bands.push({
      schema_version: SCHEMA_VERSION,
      module_id: moduleId,
      metric,
      run_count: runCount,
      mean: stats.mean,
      std_dev: stats.std_dev,
      min: stats.min,
      max: stats.max,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      sigma,
      within_tolerance: withinTolerance,
      timestamp: new Date().toISOString(),
    });
  }

  return {
    module_id: moduleId,
    run_count: runCount,
    sigma,
    bands,
    all_within_tolerance: allWithinTolerance,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run tolerance study for multiple non-deterministic modules.
 */
export async function runAllToleranceStudies(
  modules: ReadonlyMap<string, RunFunction>,
  options?: ToleranceOptions,
): Promise<Map<string, ToleranceStudyResult>> {
  const results = new Map<string, ToleranceStudyResult>();

  for (const [moduleId, runFn] of modules) {
    results.set(moduleId, await runToleranceStudy(moduleId, runFn, options));
  }

  return results;
}

/**
 * Extract tolerance bands suitable for the repeatability harness (K5.1).
 * Converts a ToleranceStudyResult to the tolerance band format expected
 * by the repeatability runner for accuracy.
 */
export function extractRepeatabilityToleranceBand(
  study: ToleranceStudyResult,
): { mean: number; std_dev: number; lower: number; upper: number } | undefined {
  const accuracyBand = study.bands.find(b => b.metric === 'accuracy');
  if (!accuracyBand) return undefined;

  return {
    mean: accuracyBand.mean,
    std_dev: accuracyBand.std_dev,
    lower: accuracyBand.lower_bound,
    upper: accuracyBand.upper_bound,
  };
}
