/**
 * KATANA Dashboard Export (K6.3)
 *
 * Exports time-series metrics for the dojolm-web dashboard:
 * - Time-series metrics per module per run
 * - Trend indicators (improving / stable / degrading)
 * - CSV export (with OWASP formula injection prevention)
 * - JSON export
 * - Markdown summary
 *
 * Integration point for dojolm-web dashboard widgets.
 */

import type { ValidationRun } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TimeSeriesPoint {
  readonly timestamp: string;
  readonly run_id: string;
  readonly module_id: string;
  readonly accuracy: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1: number;
  readonly fpr: number;
  readonly fnr: number;
  readonly false_positives: number;
  readonly false_negatives: number;
  readonly total_samples: number;
  readonly verdict: 'PASS' | 'FAIL';
}

export interface TrendIndicator {
  readonly module_id: string;
  readonly metric: string;
  readonly direction: 'improving' | 'stable' | 'degrading';
  readonly change_pct: number;
  readonly window_size: number;
}

export interface DashboardData {
  readonly generated_at: string;
  readonly time_series: readonly TimeSeriesPoint[];
  readonly trends: readonly TrendIndicator[];
  readonly modules_total: number;
  readonly modules_passing: number;
  readonly latest_run_id: string;
  readonly latest_run_date: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW_SIZE = 5;
const TREND_THRESHOLD = 0.005; // 0.5%

/** Metrics tracked for trend analysis. */
const TREND_METRICS = ['accuracy', 'precision', 'recall', 'f1'] as const;

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Convert an array of validation runs into time-series points.
 * Each module in each run produces one point.
 *
 * @param runs - Completed validation runs (order preserved)
 * @returns Flat array of time-series points
 */
export function extractTimeSeriesFromRuns(
  runs: readonly ValidationRun[],
): readonly TimeSeriesPoint[] {
  return runs.flatMap(run =>
    run.modules_validated.map(moduleId => {
      const metrics = run.per_module_metrics[moduleId];
      const decision = run.per_module_decisions[moduleId];
      const matrix = run.per_module_matrices[moduleId];

      if (!metrics || !decision || !matrix) {
        throw new Error(
          `Missing results for module '${moduleId}' in run '${run.run_id}'`,
        );
      }

      return {
        timestamp: run.completed_at ?? run.started_at,
        run_id: run.run_id,
        module_id: moduleId,
        accuracy: metrics.accuracy,
        precision: metrics.precision,
        recall: metrics.recall,
        f1: metrics.f1,
        fpr: metrics.fpr,
        fnr: metrics.fnr,
        false_positives: decision.false_positives,
        false_negatives: decision.false_negatives,
        total_samples: matrix.total,
        verdict: decision.verdict,
      } satisfies TimeSeriesPoint;
    }),
  );
}

/**
 * Compute trend indicators from time-series data.
 *
 * For each module and each tracked metric, compares the mean of the last
 * `windowSize` points against the mean of the preceding `windowSize` points.
 *
 * - Increase > 0.5%  → improving
 * - Decrease > 0.5%  → degrading
 * - Otherwise         → stable
 *
 * @param timeSeries - Time-series points (should be chronologically ordered)
 * @param windowSize - Number of recent points to compare (default 5)
 * @returns Array of trend indicators
 */
export function computeTrends(
  timeSeries: readonly TimeSeriesPoint[],
  windowSize: number = DEFAULT_WINDOW_SIZE,
): readonly TrendIndicator[] {
  // Group points by module
  const byModule = groupByModule(timeSeries);

  return Object.entries(byModule).flatMap(([moduleId, points]) => {
    // Need at least 2 points to compute a trend
    if (points.length < 2) {
      return TREND_METRICS.map(metric => ({
        module_id: moduleId,
        metric,
        direction: 'stable' as const,
        change_pct: 0,
        window_size: points.length,
      }));
    }

    const recentCount = Math.min(windowSize, Math.floor(points.length / 2));
    const recentSlice = points.slice(-recentCount);
    const previousSlice = points.slice(
      Math.max(0, points.length - recentCount * 2),
      points.length - recentCount,
    );

    return TREND_METRICS.map(metric => {
      const recentMean = mean(recentSlice.map(p => p[metric]));
      const previousMean = mean(previousSlice.map(p => p[metric]));
      const changePct = recentMean - previousMean;

      let direction: 'improving' | 'stable' | 'degrading';
      if (changePct > TREND_THRESHOLD) {
        direction = 'improving';
      } else if (changePct < -TREND_THRESHOLD) {
        direction = 'degrading';
      } else {
        direction = 'stable';
      }

      return {
        module_id: moduleId,
        metric,
        direction,
        change_pct: roundTo(changePct * 100, 4), // express as percentage
        window_size: recentCount,
      } satisfies TrendIndicator;
    });
  });
}

/**
 * Build the full dashboard data object from validation runs.
 *
 * @param runs - Completed validation runs (chronological order preferred)
 * @returns Complete dashboard data for the web UI
 */
export function buildDashboardData(
  runs: readonly ValidationRun[],
): DashboardData {
  if (runs.length === 0) {
    return {
      generated_at: new Date().toISOString(),
      time_series: [],
      trends: [],
      modules_total: 0,
      modules_passing: 0,
      latest_run_id: '',
      latest_run_date: '',
    };
  }

  const timeSeries = extractTimeSeriesFromRuns(runs);
  const trends = computeTrends(timeSeries);

  const latestRun = runs[runs.length - 1]!;
  const latestModuleIds = latestRun.modules_validated;
  const passingCount = latestModuleIds.filter(id => {
    const decision = latestRun.per_module_decisions[id];
    return decision?.verdict === 'PASS';
  }).length;

  return {
    generated_at: new Date().toISOString(),
    time_series: timeSeries,
    trends,
    modules_total: latestModuleIds.length,
    modules_passing: passingCount,
    latest_run_id: latestRun.run_id,
    latest_run_date: latestRun.completed_at ?? latestRun.started_at,
  };
}

// ---------------------------------------------------------------------------
// Export Functions
// ---------------------------------------------------------------------------

/**
 * Export dashboard data as CSV.
 *
 * Uses csvField() for formula injection prevention per OWASP guidelines.
 */
export function exportDashboardCSV(data: DashboardData): string {
  const headers = [
    'timestamp',
    'run_id',
    'module_id',
    'accuracy',
    'precision',
    'recall',
    'f1',
    'fpr',
    'fnr',
    'false_positives',
    'false_negatives',
    'total_samples',
    'verdict',
  ];

  const rows = data.time_series.map(point =>
    [
      csvField(point.timestamp),
      csvField(point.run_id),
      csvField(point.module_id),
      point.accuracy,
      point.precision,
      point.recall,
      point.f1,
      point.fpr,
      point.fnr,
      point.false_positives,
      point.false_negatives,
      point.total_samples,
      csvField(point.verdict),
    ].join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export dashboard data as JSON.
 */
export function exportDashboardJSON(data: DashboardData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format a markdown summary of the dashboard data.
 */
export function formatDashboardSummary(data: DashboardData): string {
  const lines: readonly string[] = [
    '# Dashboard Summary',
    '',
    `**Generated:** ${data.generated_at}`,
    `**Latest Run:** ${data.latest_run_id || 'N/A'}`,
    `**Latest Run Date:** ${data.latest_run_date || 'N/A'}`,
    `**Modules:** ${data.modules_passing}/${data.modules_total} passing`,
    '',
    '## Trends',
    '',
    ...(data.trends.length === 0
      ? ['No trend data available.', '']
      : [
          '| Module | Metric | Direction | Change |',
          '|--------|--------|-----------|--------|',
          ...data.trends.map(
            t =>
              `| ${escapeMd(t.module_id)} | ${t.metric} | ${t.direction} | ${t.change_pct >= 0 ? '+' : ''}${t.change_pct.toFixed(2)}% |`,
          ),
          '',
        ]),
    '## Time Series',
    '',
    ...(data.time_series.length === 0
      ? ['No time-series data available.', '']
      : [
          '| Timestamp | Run | Module | Accuracy | F1 | Verdict |',
          '|-----------|-----|--------|----------|----|---------|',
          ...data.time_series.map(
            p =>
              `| ${p.timestamp} | ${escapeMd(p.run_id)} | ${escapeMd(p.module_id)} | ${formatPct(p.accuracy)} | ${formatPct(p.f1)} | ${p.verdict} |`,
          ),
          '',
        ]),
    '---',
    '',
    '*Generated by KATANA Validation Framework*',
    '',
  ];

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape a string for safe inclusion in a CSV field.
 * Prevents formula injection (=, +, -, @, TAB, CR) per OWASP guidelines.
 */
function csvField(value: unknown): string {
  const s = String(value);
  const safe = s.replace(/^([=+\-@\t\r])/, "'$1");
  if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Escape a string for safe inclusion in a Markdown table cell.
 */
function escapeMd(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|');
}

/**
 * Format a number as a percentage string.
 */
function formatPct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Compute arithmetic mean of a numeric array.
 */
function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Round a number to a specified number of decimal places.
 */
function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Group time-series points by module_id (immutable).
 */
function groupByModule(
  points: readonly TimeSeriesPoint[],
): Record<string, readonly TimeSeriesPoint[]> {
  return points.reduce<Record<string, readonly TimeSeriesPoint[]>>(
    (acc, point) => ({
      ...acc,
      [point.module_id]: [...(acc[point.module_id] ?? []), point],
    }),
    {},
  );
}
