/**
 * KATANA Performance Baseline (K7.3)
 *
 * Establishes performance baselines per module per ISO 17025 7.2.2:
 * - Mean, median, p95, p99, max execution time per module
 * - >20% regression = warning, >50% = failure
 *
 * ISO 17025 Clause 7.2.2
 */

import { VALIDATION_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Performance metrics for a single module. */
export interface PerformanceMetrics {
  readonly module_id: string;
  readonly sample_count: number;
  readonly mean_ms: number;
  readonly median_ms: number;
  readonly p95_ms: number;
  readonly p99_ms: number;
  readonly max_ms: number;
  readonly min_ms: number;
  readonly std_dev_ms: number;
}

/** Baseline snapshot across all measured modules. */
export interface PerformanceBaseline {
  readonly generated_at: string;
  readonly environment_hash: string;
  readonly modules: readonly PerformanceMetrics[];
  readonly total_samples: number;
  readonly total_elapsed_ms: number;
}

/** Regression comparison result for a single metric on a single module. */
export interface RegressionResult {
  readonly module_id: string;
  readonly metric: string;
  readonly baseline_ms: number;
  readonly current_ms: number;
  readonly change_pct: number;
  readonly status: 'ok' | 'warning' | 'failure';
}

/** Regression report across all modules and metrics. */
export interface RegressionReport {
  readonly generated_at: string;
  readonly results: readonly RegressionResult[];
  readonly warnings: number;
  readonly failures: number;
  readonly overall_status: 'ok' | 'warning' | 'failure';
}

/** Scan function signature for module performance measurement. */
export type ScanFn = (text: string) => { findings: Array<unknown>; verdict: string };

// ---------------------------------------------------------------------------
// Percentile Helper
// ---------------------------------------------------------------------------

/**
 * Compute a percentile from a sorted array using linear interpolation.
 *
 * @param sortedValues - Array of numbers sorted in ascending order.
 * @param percentile - Percentile to compute (0-100).
 * @returns The interpolated percentile value.
 */
export function computePercentile(
  sortedValues: readonly number[],
  percentile: number,
): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  // Clamp percentile to [0, 100]
  const p = Math.max(0, Math.min(100, percentile));

  // Linear interpolation index
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const fraction = index - lower;
  return sortedValues[lower] + fraction * (sortedValues[upper] - sortedValues[lower]);
}

// ---------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------

/**
 * Measure the performance of a module's scan function over multiple samples.
 *
 * @param moduleId - Identifier of the module being measured.
 * @param samples - Array of input texts to scan.
 * @param scanFn - The scan function to time.
 * @returns PerformanceMetrics with timing statistics.
 */
export function measureModulePerformance(
  moduleId: string,
  samples: readonly string[],
  scanFn: ScanFn,
): PerformanceMetrics {
  if (samples.length === 0) {
    return {
      module_id: moduleId,
      sample_count: 0,
      mean_ms: 0,
      median_ms: 0,
      p95_ms: 0,
      p99_ms: 0,
      max_ms: 0,
      min_ms: 0,
      std_dev_ms: 0,
    };
  }

  // Collect timings — immutable accumulation via map
  const timings = samples.map((sample) => {
    const start = performance.now();
    scanFn(sample);
    const end = performance.now();
    return end - start;
  });

  // Sort a copy for percentile calculations
  const sorted = [...timings].sort((a, b) => a - b);

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;

  // Standard deviation (population)
  const squaredDiffs = sorted.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / sorted.length;
  const stdDev = Math.sqrt(variance);

  return {
    module_id: moduleId,
    sample_count: sorted.length,
    mean_ms: mean,
    median_ms: computePercentile(sorted, 50),
    p95_ms: computePercentile(sorted, 95),
    p99_ms: computePercentile(sorted, 99),
    max_ms: sorted[sorted.length - 1],
    min_ms: sorted[0],
    std_dev_ms: stdDev,
  };
}

// ---------------------------------------------------------------------------
// Baseline Construction
// ---------------------------------------------------------------------------

/**
 * Build a PerformanceBaseline from a set of module metrics.
 *
 * @param metrics - Array of per-module performance metrics.
 * @param envHash - Hash identifying the environment (hardware, OS, runtime).
 * @returns Immutable PerformanceBaseline object.
 */
export function buildPerformanceBaseline(
  metrics: readonly PerformanceMetrics[],
  envHash: string,
): PerformanceBaseline {
  const totalSamples = metrics.reduce((acc, m) => acc + m.sample_count, 0);
  const totalElapsed = metrics.reduce((acc, m) => acc + m.mean_ms * m.sample_count, 0);

  return {
    generated_at: new Date().toISOString(),
    environment_hash: envHash,
    modules: [...metrics],
    total_samples: totalSamples,
    total_elapsed_ms: totalElapsed,
  };
}

// ---------------------------------------------------------------------------
// Regression Comparison
// ---------------------------------------------------------------------------

/** Metrics compared for regression detection. */
const COMPARED_METRICS = ['mean_ms', 'median_ms', 'p95_ms', 'p99_ms'] as const;

/**
 * Classify a percentage change as ok, warning, or failure.
 */
function classifyChange(
  changePct: number,
  warningThreshold: number,
  failureThreshold: number,
): 'ok' | 'warning' | 'failure' {
  if (changePct >= failureThreshold) {
    return 'failure';
  }
  if (changePct >= warningThreshold) {
    return 'warning';
  }
  return 'ok';
}

/**
 * Compare current metrics against a baseline and detect regressions.
 *
 * @param current - Current performance metrics per module.
 * @param baseline - Previously recorded baseline.
 * @param warningThreshold - Fractional threshold for warning (default: config value).
 * @param failureThreshold - Fractional threshold for failure (default: config value).
 * @returns RegressionReport with per-metric results and overall status.
 */
export function compareBaselines(
  current: readonly PerformanceMetrics[],
  baseline: PerformanceBaseline,
  warningThreshold: number = VALIDATION_CONFIG.PERF_WARNING_THRESHOLD,
  failureThreshold: number = VALIDATION_CONFIG.PERF_FAILURE_THRESHOLD,
): RegressionReport {
  // Index baseline modules by id
  const baselineIndex = new Map(
    baseline.modules.map((m) => [m.module_id, m]),
  );

  // Build regression results — immutable via flatMap
  const results: readonly RegressionResult[] = current.flatMap((currentModule) => {
    const baselineModule = baselineIndex.get(currentModule.module_id);
    if (!baselineModule) {
      // No baseline to compare — report as ok
      return COMPARED_METRICS.map((metric) => ({
        module_id: currentModule.module_id,
        metric,
        baseline_ms: 0,
        current_ms: currentModule[metric],
        change_pct: 0,
        status: 'ok' as const,
      }));
    }

    return COMPARED_METRICS.map((metric) => {
      const baselineVal = baselineModule[metric];
      const currentVal = currentModule[metric];
      const changePct = baselineVal > 0
        ? (currentVal - baselineVal) / baselineVal
        : 0;
      const status = classifyChange(changePct, warningThreshold, failureThreshold);

      return {
        module_id: currentModule.module_id,
        metric,
        baseline_ms: baselineVal,
        current_ms: currentVal,
        change_pct: changePct,
        status,
      };
    });
  });

  const warnings = results.filter((r) => r.status === 'warning').length;
  const failures = results.filter((r) => r.status === 'failure').length;

  const overallStatus: 'ok' | 'warning' | 'failure' =
    failures > 0 ? 'failure' : warnings > 0 ? 'warning' : 'ok';

  return {
    generated_at: new Date().toISOString(),
    results,
    warnings,
    failures,
    overall_status: overallStatus,
  };
}

// ---------------------------------------------------------------------------
// Report Formatting
// ---------------------------------------------------------------------------

/**
 * Format a PerformanceBaseline as a markdown report.
 *
 * @param baseline - The baseline to format.
 * @returns Markdown string.
 */
export function formatPerformanceReport(baseline: PerformanceBaseline): string {
  const lines: readonly string[] = [
    '# Performance Baseline Report',
    '',
    `**Generated:** ${baseline.generated_at}`,
    `**Environment:** ${baseline.environment_hash}`,
    `**Total Samples:** ${baseline.total_samples}`,
    `**Total Elapsed:** ${baseline.total_elapsed_ms.toFixed(2)} ms`,
    '',
    '## Module Performance',
    '',
    '| Module | Samples | Mean (ms) | Median (ms) | P95 (ms) | P99 (ms) | Max (ms) | Min (ms) | Std Dev (ms) |',
    '|--------|---------|-----------|-------------|----------|----------|----------|----------|--------------|',
    ...baseline.modules.map((m) =>
      `| ${m.module_id} | ${m.sample_count} | ${m.mean_ms.toFixed(2)} | ${m.median_ms.toFixed(2)} | ${m.p95_ms.toFixed(2)} | ${m.p99_ms.toFixed(2)} | ${m.max_ms.toFixed(2)} | ${m.min_ms.toFixed(2)} | ${m.std_dev_ms.toFixed(2)} |`,
    ),
    '',
    '---',
    `*ISO 17025 7.2.2 — Warning threshold: ${VALIDATION_CONFIG.PERF_WARNING_THRESHOLD * 100}% | Failure threshold: ${VALIDATION_CONFIG.PERF_FAILURE_THRESHOLD * 100}%*`,
    '',
  ];

  return lines.join('\n');
}
