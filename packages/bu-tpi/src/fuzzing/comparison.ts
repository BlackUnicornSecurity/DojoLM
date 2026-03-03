/**
 * S66: Benchmark Comparison
 * Compare benchmark results across versions.
 */

import type { BenchmarkResult, BenchmarkComparison, MetricChange } from './types.js';

const METRIC_KEYS: Array<keyof BenchmarkResult> = [
  'accuracy', 'precision', 'recall', 'f1', 'avgLatencyMs', 'p95LatencyMs', 'p99LatencyMs',
];

const THRESHOLD = 0.01; // 1% change threshold

/**
 * Compare baseline and current benchmark results.
 */
export function compareBenchmarks(
  baseline: BenchmarkResult[],
  current: BenchmarkResult[]
): BenchmarkComparison {
  const changes: MetricChange[] = [];

  for (const curr of current) {
    const base = baseline.find((b) => b.testSet === curr.testSet);
    if (!base) continue;

    for (const metric of METRIC_KEYS) {
      const baseVal = base[metric] as number;
      const currVal = curr[metric] as number;
      const delta = currVal - baseVal;
      const relDelta = baseVal !== 0 ? Math.abs(delta / baseVal) : Math.abs(delta);

      let significance: MetricChange['significance'] = 'unchanged';
      if (relDelta > THRESHOLD) {
        // For latency, lower is better; for accuracy/precision/recall/f1, higher is better
        const isLatencyMetric = metric.includes('Latency');
        if (isLatencyMetric) {
          significance = delta < 0 ? 'improved' : 'degraded';
        } else {
          significance = delta > 0 ? 'improved' : 'degraded';
        }
      }

      if (significance !== 'unchanged') {
        changes.push({
          metric: String(metric),
          testSet: curr.testSet,
          baseline: baseVal,
          current: currVal,
          delta: Math.round(delta * 10000) / 10000,
          significance,
        });
      }
    }
  }

  return { baseline, current, changes };
}

/**
 * Format comparison as markdown table.
 */
export function formatComparison(comparison: BenchmarkComparison): string {
  const lines: string[] = [
    '# Benchmark Comparison',
    '',
    '| Test Set | Metric | Baseline | Current | Delta | Status |',
    '|----------|--------|----------|---------|-------|--------|',
  ];

  for (const change of comparison.changes) {
    const icon = change.significance === 'improved' ? '+' : change.significance === 'degraded' ? '-' : '=';
    lines.push(
      `| ${change.testSet} | ${change.metric} | ${change.baseline} | ${change.current} | ${icon}${change.delta} | ${change.significance} |`
    );
  }

  if (comparison.changes.length === 0) {
    lines.push('| - | - | - | - | - | No significant changes |');
  }

  return lines.join('\n');
}

/**
 * Check if comparison shows any regressions.
 */
export function isRegression(
  comparison: BenchmarkComparison,
  threshold: number = THRESHOLD
): boolean {
  return comparison.changes.some(
    (c) => c.significance === 'degraded' && Math.abs(c.delta) > threshold
  );
}
