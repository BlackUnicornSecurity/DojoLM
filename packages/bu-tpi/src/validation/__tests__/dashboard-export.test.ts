/**
 * Tests for KATANA Dashboard Export (K6.3)
 *
 * Covers:
 * - extractTimeSeriesFromRuns with mock runs
 * - computeTrends with improving / stable / degrading scenarios
 * - CSV export formula injection prevention
 * - Dashboard data shape validation
 * - Empty runs edge case
 */

import { describe, it, expect } from 'vitest';
import {
  extractTimeSeriesFromRuns,
  computeTrends,
  buildDashboardData,
  exportDashboardCSV,
  exportDashboardJSON,
  formatDashboardSummary,
  type TimeSeriesPoint,
} from '../reports/dashboard-export.js';
import { SCHEMA_VERSION, type ValidationRun, type EnvironmentSnapshot } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnvironment(): EnvironmentSnapshot {
  return {
    schema_version: SCHEMA_VERSION,
    os: { platform: 'test', release: '1.0', arch: 'x64' },
    node: { version: 'v20.0.0', v8: '11.0' },
    cpu: { model: 'Test CPU', cores: 4 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'UTC',
    git: { hash: 'abc123def456', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: '2026-03-21T00:00:00.000Z',
  };
}

function makeRun(overrides: {
  run_id?: string;
  completed_at?: string;
  modules?: string[];
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  fpr?: number;
  fnr?: number;
  fp?: number;
  fn?: number;
  total?: number;
  verdict?: 'PASS' | 'FAIL';
} = {}): ValidationRun {
  const moduleId = overrides.modules?.[0] ?? 'enhanced-pi';
  const modules = overrides.modules ?? [moduleId];
  const tp = (overrides.total ?? 100) - (overrides.fp ?? 0) - (overrides.fn ?? 0);
  const tn = Math.floor(tp / 2);
  const actualTp = tp - tn;

  return {
    schema_version: SCHEMA_VERSION,
    run_id: overrides.run_id ?? 'run-1',
    status: 'completed',
    started_at: '2026-03-21T00:00:00.000Z',
    completed_at: overrides.completed_at ?? '2026-03-21T00:01:00.000Z',
    environment: makeEnvironment(),
    modules_validated: modules,
    corpus_version: 'corpus-v1',
    include_holdout: false,
    total_samples: overrides.total ?? 100,
    samples_processed: overrides.total ?? 100,
    results: [],
    per_module_matrices: Object.fromEntries(
      modules.map(id => [
        id,
        {
          schema_version: SCHEMA_VERSION,
          module_id: id,
          tp: actualTp,
          tn,
          fp: overrides.fp ?? 0,
          fn: overrides.fn ?? 0,
          total: overrides.total ?? 100,
        },
      ]),
    ),
    per_module_metrics: Object.fromEntries(
      modules.map(id => [
        id,
        {
          schema_version: SCHEMA_VERSION,
          module_id: id,
          accuracy: overrides.accuracy ?? 1.0,
          precision: overrides.precision ?? 1.0,
          recall: overrides.recall ?? 1.0,
          f1: overrides.f1 ?? 1.0,
          mcc: 1.0,
          specificity: 1.0,
          fpr: overrides.fpr ?? 0.0,
          fnr: overrides.fnr ?? 0.0,
        },
      ]),
    ),
    per_module_decisions: Object.fromEntries(
      modules.map(id => [
        id,
        {
          schema_version: SCHEMA_VERSION,
          module_id: id,
          verdict: overrides.verdict ?? 'PASS',
          total_samples: overrides.total ?? 100,
          false_positives: overrides.fp ?? 0,
          false_negatives: overrides.fn ?? 0,
          non_conformities: [],
        },
      ]),
    ),
    non_conformity_count: (overrides.fp ?? 0) + (overrides.fn ?? 0),
    overall_verdict: overrides.verdict ?? 'PASS',
    elapsed_ms: 1000,
  };
}

// ---------------------------------------------------------------------------
// extractTimeSeriesFromRuns
// ---------------------------------------------------------------------------

describe('extractTimeSeriesFromRuns', () => {
  it('converts a single run with one module to a single point', () => {
    const runs = [makeRun({ run_id: 'run-1', accuracy: 0.95, f1: 0.9 })];
    const points = extractTimeSeriesFromRuns(runs);

    expect(points).toHaveLength(1);
    expect(points[0]).toEqual(
      expect.objectContaining({
        run_id: 'run-1',
        module_id: 'enhanced-pi',
        accuracy: 0.95,
        f1: 0.9,
        verdict: 'PASS',
      }),
    );
  });

  it('converts multiple runs to multiple points', () => {
    const runs = [
      makeRun({ run_id: 'run-1' }),
      makeRun({ run_id: 'run-2' }),
      makeRun({ run_id: 'run-3' }),
    ];
    const points = extractTimeSeriesFromRuns(runs);

    expect(points).toHaveLength(3);
    expect(points.map(p => p.run_id)).toEqual(['run-1', 'run-2', 'run-3']);
  });

  it('handles a run with multiple modules', () => {
    const runs = [
      makeRun({ run_id: 'run-1', modules: ['mod-a', 'mod-b'] }),
    ];
    const points = extractTimeSeriesFromRuns(runs);

    expect(points).toHaveLength(2);
    expect(points.map(p => p.module_id)).toEqual(['mod-a', 'mod-b']);
  });

  it('uses completed_at as timestamp', () => {
    const runs = [
      makeRun({ run_id: 'run-1', completed_at: '2026-06-15T12:00:00.000Z' }),
    ];
    const points = extractTimeSeriesFromRuns(runs);

    expect(points[0]!.timestamp).toBe('2026-06-15T12:00:00.000Z');
  });

  it('returns an empty array for empty runs', () => {
    const points = extractTimeSeriesFromRuns([]);
    expect(points).toEqual([]);
  });

  it('includes false_positives, false_negatives, and total_samples', () => {
    const runs = [makeRun({ fp: 3, fn: 2, total: 100 })];
    const points = extractTimeSeriesFromRuns(runs);

    expect(points[0]).toEqual(
      expect.objectContaining({
        false_positives: 3,
        false_negatives: 2,
        total_samples: 100,
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// computeTrends
// ---------------------------------------------------------------------------

describe('computeTrends', () => {
  function makePoints(
    moduleId: string,
    accuracies: readonly number[],
  ): readonly TimeSeriesPoint[] {
    return accuracies.map((acc, i) => ({
      timestamp: `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      run_id: `run-${i + 1}`,
      module_id: moduleId,
      accuracy: acc,
      precision: acc,
      recall: acc,
      f1: acc,
      fpr: 1 - acc,
      fnr: 1 - acc,
      false_positives: 0,
      false_negatives: 0,
      total_samples: 100,
      verdict: 'PASS' as const,
    }));
  }

  it('detects improving trend when accuracy increases > 0.5%', () => {
    // First 5: 0.90, last 5: 0.96 → change = +0.06 > 0.005
    const points = makePoints('mod-a', [
      0.88, 0.89, 0.90, 0.91, 0.92,
      0.94, 0.95, 0.96, 0.97, 0.98,
    ]);
    const trends = computeTrends(points, 5);

    const accuracyTrend = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    expect(accuracyTrend).toBeDefined();
    expect(accuracyTrend!.direction).toBe('improving');
    expect(accuracyTrend!.change_pct).toBeGreaterThan(0);
  });

  it('detects degrading trend when accuracy decreases > 0.5%', () => {
    // First 5: ~0.96, last 5: ~0.90 → change = -0.06 < -0.005
    const points = makePoints('mod-a', [
      0.98, 0.97, 0.96, 0.95, 0.94,
      0.92, 0.91, 0.90, 0.89, 0.88,
    ]);
    const trends = computeTrends(points, 5);

    const accuracyTrend = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    expect(accuracyTrend).toBeDefined();
    expect(accuracyTrend!.direction).toBe('degrading');
    expect(accuracyTrend!.change_pct).toBeLessThan(0);
  });

  it('detects stable trend when change is within 0.5%', () => {
    // All values the same → change = 0
    const points = makePoints('mod-a', [
      0.95, 0.95, 0.95, 0.95, 0.95,
      0.95, 0.95, 0.95, 0.95, 0.95,
    ]);
    const trends = computeTrends(points, 5);

    const accuracyTrend = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    expect(accuracyTrend).toBeDefined();
    expect(accuracyTrend!.direction).toBe('stable');
    expect(accuracyTrend!.change_pct).toBe(0);
  });

  it('returns stable for a single point', () => {
    const points = makePoints('mod-a', [0.95]);
    const trends = computeTrends(points, 5);

    const accuracyTrend = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    expect(accuracyTrend).toBeDefined();
    expect(accuracyTrend!.direction).toBe('stable');
    expect(accuracyTrend!.change_pct).toBe(0);
    expect(accuracyTrend!.window_size).toBe(1);
  });

  it('computes trends for multiple modules independently', () => {
    const points = [
      ...makePoints('mod-a', [0.80, 0.82, 0.84, 0.86, 0.88, 0.90]),
      ...makePoints('mod-b', [0.95, 0.95, 0.95, 0.95, 0.95, 0.95]),
    ];
    const trends = computeTrends(points, 3);

    const trendA = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    const trendB = trends.find(
      t => t.module_id === 'mod-b' && t.metric === 'accuracy',
    );

    expect(trendA!.direction).toBe('improving');
    expect(trendB!.direction).toBe('stable');
  });

  it('uses default window size of 5', () => {
    const points = makePoints('mod-a', [
      0.80, 0.82, 0.84, 0.86, 0.88,
      0.90, 0.92, 0.94, 0.96, 0.98,
    ]);
    const trends = computeTrends(points);

    const accuracyTrend = trends.find(
      t => t.module_id === 'mod-a' && t.metric === 'accuracy',
    );
    expect(accuracyTrend!.window_size).toBe(5);
  });

  it('returns empty array for empty time series', () => {
    const trends = computeTrends([]);
    expect(trends).toEqual([]);
  });

  it('tracks all four metrics: accuracy, precision, recall, f1', () => {
    const points = makePoints('mod-a', [0.90, 0.92, 0.94, 0.96]);
    const trends = computeTrends(points, 2);

    const metrics = trends
      .filter(t => t.module_id === 'mod-a')
      .map(t => t.metric)
      .sort();
    expect(metrics).toEqual(['accuracy', 'f1', 'precision', 'recall']);
  });
});

// ---------------------------------------------------------------------------
// buildDashboardData
// ---------------------------------------------------------------------------

describe('buildDashboardData', () => {
  it('builds complete dashboard data from runs', () => {
    const runs = [
      makeRun({ run_id: 'run-1', accuracy: 0.90 }),
      makeRun({ run_id: 'run-2', accuracy: 0.95 }),
    ];
    const data = buildDashboardData(runs);

    expect(data.latest_run_id).toBe('run-2');
    expect(data.modules_total).toBe(1);
    expect(data.modules_passing).toBe(1);
    expect(data.time_series).toHaveLength(2);
    expect(data.trends.length).toBeGreaterThan(0);
    expect(data.generated_at).toBeTruthy();
  });

  it('returns empty dashboard data for empty runs', () => {
    const data = buildDashboardData([]);

    expect(data.time_series).toEqual([]);
    expect(data.trends).toEqual([]);
    expect(data.modules_total).toBe(0);
    expect(data.modules_passing).toBe(0);
    expect(data.latest_run_id).toBe('');
    expect(data.latest_run_date).toBe('');
  });

  it('counts passing modules from the latest run', () => {
    const passingRun = makeRun({
      run_id: 'run-latest',
      modules: ['mod-a'],
      verdict: 'PASS',
    });
    const data = buildDashboardData([passingRun]);

    expect(data.modules_passing).toBe(1);
    expect(data.modules_total).toBe(1);
  });

  it('counts failing modules correctly', () => {
    const failingRun = makeRun({
      run_id: 'run-latest',
      modules: ['mod-a'],
      verdict: 'FAIL',
      fp: 5,
    });
    const data = buildDashboardData([failingRun]);

    expect(data.modules_passing).toBe(0);
    expect(data.modules_total).toBe(1);
  });

  it('uses latest run date', () => {
    const runs = [
      makeRun({ run_id: 'run-1', completed_at: '2026-01-01T00:00:00.000Z' }),
      makeRun({ run_id: 'run-2', completed_at: '2026-06-15T12:00:00.000Z' }),
    ];
    const data = buildDashboardData(runs);

    expect(data.latest_run_date).toBe('2026-06-15T12:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// exportDashboardCSV
// ---------------------------------------------------------------------------

describe('exportDashboardCSV', () => {
  it('produces valid CSV with headers and rows', () => {
    const data = buildDashboardData([makeRun({ run_id: 'run-1' })]);
    const csv = exportDashboardCSV(data);

    const lines = csv.split('\n');
    expect(lines[0]).toBe(
      'timestamp,run_id,module_id,accuracy,precision,recall,f1,fpr,fnr,false_positives,false_negatives,total_samples,verdict',
    );
    expect(lines).toHaveLength(2); // header + 1 data row
  });

  it('escapes formula injection characters (=)', () => {
    const data = buildDashboardData([
      makeRun({ run_id: '=EVIL', modules: ['mod-a'] }),
    ]);
    const csv = exportDashboardCSV(data);

    // The apostrophe prefix neutralizes the formula
    expect(csv).toContain("'=EVIL");
    // Raw =EVIL without preceding apostrophe must not appear
    expect(csv).not.toMatch(/(?<!')=EVIL/);
  });

  it('escapes formula injection characters (+)', () => {
    const data = buildDashboardData([
      makeRun({ run_id: '+CMD("malicious")', modules: ['mod-a'] }),
    ]);
    const csv = exportDashboardCSV(data);

    expect(csv).not.toMatch(/(?<!')(\+CMD)/);
    expect(csv).toContain("'+CMD");
  });

  it('escapes formula injection characters (-)', () => {
    const data = buildDashboardData([
      makeRun({ run_id: '-CMD("malicious")', modules: ['mod-a'] }),
    ]);
    const csv = exportDashboardCSV(data);

    expect(csv).toContain("'-CMD");
  });

  it('escapes formula injection characters (@)', () => {
    const data = buildDashboardData([
      makeRun({ run_id: '@SUM(A1)', modules: ['mod-a'] }),
    ]);
    const csv = exportDashboardCSV(data);

    expect(csv).toContain("'@SUM");
  });

  it('returns only headers for empty data', () => {
    const data = buildDashboardData([]);
    const csv = exportDashboardCSV(data);

    const lines = csv.split('\n');
    expect(lines).toHaveLength(1); // header only
  });
});

// ---------------------------------------------------------------------------
// exportDashboardJSON
// ---------------------------------------------------------------------------

describe('exportDashboardJSON', () => {
  it('produces valid JSON', () => {
    const data = buildDashboardData([makeRun({ run_id: 'run-1' })]);
    const json = exportDashboardJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed.latest_run_id).toBe('run-1');
    expect(parsed.time_series).toHaveLength(1);
  });

  it('round-trips dashboard data correctly', () => {
    const data = buildDashboardData([
      makeRun({ run_id: 'run-1', accuracy: 0.95 }),
    ]);
    const json = exportDashboardJSON(data);
    const parsed = JSON.parse(json);

    expect(parsed.time_series[0].accuracy).toBe(0.95);
    expect(parsed.modules_total).toBe(data.modules_total);
    expect(parsed.modules_passing).toBe(data.modules_passing);
  });
});

// ---------------------------------------------------------------------------
// formatDashboardSummary
// ---------------------------------------------------------------------------

describe('formatDashboardSummary', () => {
  it('produces markdown with header and sections', () => {
    const data = buildDashboardData([makeRun({ run_id: 'run-1' })]);
    const md = formatDashboardSummary(data);

    expect(md).toContain('# Dashboard Summary');
    expect(md).toContain('## Trends');
    expect(md).toContain('## Time Series');
    expect(md).toContain('run-1');
  });

  it('handles empty data gracefully', () => {
    const data = buildDashboardData([]);
    const md = formatDashboardSummary(data);

    expect(md).toContain('# Dashboard Summary');
    expect(md).toContain('N/A');
    expect(md).toContain('0/0 passing');
    expect(md).toContain('No trend data available.');
    expect(md).toContain('No time-series data available.');
  });

  it('shows passing count', () => {
    const data = buildDashboardData([
      makeRun({ run_id: 'run-1', modules: ['mod-a'], verdict: 'PASS' }),
    ]);
    const md = formatDashboardSummary(data);

    expect(md).toContain('1/1 passing');
  });
});
