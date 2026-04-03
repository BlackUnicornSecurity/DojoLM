/**
 * GUNKIMONO Phase 6.2: Benchmark Regression Tracker
 * Compares benchmark results across runs to detect score regressions.
 */

import type { BenchmarkResult } from './types.js';

// --- Types ---

export interface CategoryRegression {
  readonly category: string;
  readonly baselineScore: number;
  readonly currentScore: number;
  readonly delta: number;
  readonly severity: 'critical' | 'warning' | 'info';
}

export interface BenchmarkRegressionResult {
  readonly suiteId: string;
  readonly baselineModelId: string;
  readonly currentModelId: string;
  readonly baselineOverall: number;
  readonly currentOverall: number;
  readonly overallDelta: number;
  readonly regressions: readonly CategoryRegression[];
  readonly improvements: readonly CategoryRegression[];
  readonly unchanged: readonly string[];
  readonly hasRegression: boolean;
  readonly timestamp: string;
}

export interface RegressionThresholds {
  readonly critical: number;
  readonly warning: number;
  readonly tolerance: number;
}

// --- Constants ---

export const DEFAULT_THRESHOLDS: Readonly<RegressionThresholds> = {
  critical: 0.10,
  warning: 0.05,
  tolerance: 0.01,
} as const;

// --- Functions ---

/**
 * Classify the severity of a score drop.
 */
export function classifyRegression(
  delta: number,
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS,
): 'critical' | 'warning' | 'info' {
  const absDelta = Math.abs(delta);
  if (absDelta >= thresholds.critical) return 'critical';
  if (absDelta >= thresholds.warning) return 'warning';
  return 'info';
}

/**
 * Compare two benchmark results and detect category-level regressions.
 */
export function compareBenchmarkResults(
  baseline: BenchmarkResult,
  current: BenchmarkResult,
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS,
): BenchmarkRegressionResult {
  const regressions: CategoryRegression[] = [];
  const improvements: CategoryRegression[] = [];
  const unchanged: string[] = [];

  const allCategories = new Set([
    ...Object.keys(baseline.categoryScores),
    ...Object.keys(current.categoryScores),
  ]);

  for (const category of allCategories) {
    const baseScore = baseline.categoryScores[category] ?? 0;
    const currScore = current.categoryScores[category] ?? 0;
    const delta = currScore - baseScore;

    if (Math.abs(delta) <= thresholds.tolerance) {
      unchanged.push(category);
    } else if (delta < 0) {
      regressions.push({
        category,
        baselineScore: baseScore,
        currentScore: currScore,
        delta,
        severity: classifyRegression(delta, thresholds),
      });
    } else {
      improvements.push({
        category,
        baselineScore: baseScore,
        currentScore: currScore,
        delta,
        severity: 'info',
      });
    }
  }

  const overallDelta = current.overallScore - baseline.overallScore;

  return {
    suiteId: current.suiteId,
    baselineModelId: baseline.modelId,
    currentModelId: current.modelId,
    baselineOverall: baseline.overallScore,
    currentOverall: current.overallScore,
    overallDelta,
    regressions,
    improvements,
    unchanged,
    hasRegression: regressions.length > 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Detect regressions across multiple historical results.
 * Compares the latest result against each previous run and returns
 * any category that regressed vs. ANY prior baseline.
 */
export function detectBenchmarkRegressions(
  current: BenchmarkResult,
  history: readonly BenchmarkResult[],
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS,
): BenchmarkRegressionResult {
  if (history.length === 0) {
    return {
      suiteId: current.suiteId,
      baselineModelId: '',
      currentModelId: current.modelId,
      baselineOverall: 0,
      currentOverall: current.overallScore,
      overallDelta: current.overallScore,
      regressions: [],
      improvements: [],
      unchanged: Object.keys(current.categoryScores),
      hasRegression: false,
      timestamp: new Date().toISOString(),
    };
  }

  // Use the most recent historical result as primary baseline
  const sorted = [...history].sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
  );
  const latest = sorted[0];
  const comparison = compareBenchmarkResults(latest, current, thresholds);

  // Also check: did any category that was ever higher now regress?
  const peakScores = new Map<string, number>();
  for (const run of history) {
    for (const [cat, score] of Object.entries(run.categoryScores)) {
      const existing = peakScores.get(cat) ?? 0;
      if (score > existing) {
        peakScores.set(cat, score);
      }
    }
  }

  const additionalRegressions: CategoryRegression[] = [];
  const existingRegressedCategories = new Set(comparison.regressions.map((r) => r.category));

  for (const [category, peakScore] of peakScores) {
    if (existingRegressedCategories.has(category)) continue;
    const currScore = current.categoryScores[category] ?? 0;
    const delta = currScore - peakScore;
    if (delta < -thresholds.tolerance) {
      additionalRegressions.push({
        category,
        baselineScore: peakScore,
        currentScore: currScore,
        delta,
        severity: classifyRegression(delta, thresholds),
      });
    }
  }

  const allRegressions = [...comparison.regressions, ...additionalRegressions];

  return {
    ...comparison,
    regressions: allRegressions,
    hasRegression: allRegressions.length > 0,
  };
}

/**
 * Format a regression result as a markdown report.
 */
export function formatRegressionReport(result: BenchmarkRegressionResult): string {
  const lines: string[] = [
    '# Benchmark Regression Report',
    '',
    `**Suite**: ${result.suiteId}`,
    `**Baseline Model**: ${result.baselineModelId || 'N/A'}`,
    `**Current Model**: ${result.currentModelId}`,
    `**Overall Score**: ${result.baselineOverall} → ${result.currentOverall} (${result.overallDelta >= 0 ? '+' : ''}${result.overallDelta.toFixed(2)})`,
    `**Has Regression**: ${result.hasRegression ? 'YES' : 'NO'}`,
    '',
  ];

  if (result.regressions.length > 0) {
    lines.push('## Regressions', '');
    lines.push('| Category | Baseline | Current | Delta | Severity |');
    lines.push('|----------|----------|---------|-------|----------|');
    for (const r of result.regressions) {
      lines.push(
        `| ${r.category} | ${(r.baselineScore * 100).toFixed(1)}% | ${(r.currentScore * 100).toFixed(1)}% | ${(r.delta * 100).toFixed(1)}% | ${r.severity.toUpperCase()} |`,
      );
    }
    lines.push('');
  }

  if (result.improvements.length > 0) {
    lines.push('## Improvements', '');
    lines.push('| Category | Baseline | Current | Delta |');
    lines.push('|----------|----------|---------|-------|');
    for (const r of result.improvements) {
      lines.push(
        `| ${r.category} | ${(r.baselineScore * 100).toFixed(1)}% | ${(r.currentScore * 100).toFixed(1)}% | +${(r.delta * 100).toFixed(1)}% |`,
      );
    }
    lines.push('');
  }

  if (result.unchanged.length > 0) {
    lines.push(`## Unchanged (${result.unchanged.length} categories)`, '');
    lines.push(result.unchanged.join(', '));
    lines.push('');
  }

  return lines.join('\n');
}
