/**
 * KATANA Performance Baseline Tests (K7.3)
 *
 * Verifies performance measurement, percentile computation,
 * regression detection, and report formatting.
 *
 * ISO 17025 Clause 7.2.2
 */

import { describe, it, expect, vi } from 'vitest';
import {
  computePercentile,
  measureModulePerformance,
  buildPerformanceBaseline,
  compareBaselines,
  formatPerformanceReport,
  type PerformanceMetrics,
  type PerformanceBaseline,
  type ScanFn,
} from '../runner/performance-baseline.js';

// ---------------------------------------------------------------------------
// computePercentile
// ---------------------------------------------------------------------------

describe('computePercentile', () => {
  it('returns 0 for empty array', () => {
    expect(computePercentile([], 50)).toBe(0);
  });

  it('returns the single value for array of length 1', () => {
    expect(computePercentile([42], 0)).toBe(42);
    expect(computePercentile([42], 50)).toBe(42);
    expect(computePercentile([42], 100)).toBe(42);
  });

  it('interpolates correctly for 2 values', () => {
    const sorted = [10, 20];
    // p0 → 10, p100 → 20, p50 → 15
    expect(computePercentile(sorted, 0)).toBe(10);
    expect(computePercentile(sorted, 100)).toBe(20);
    expect(computePercentile(sorted, 50)).toBe(15);
    expect(computePercentile(sorted, 25)).toBe(12.5);
    expect(computePercentile(sorted, 75)).toBe(17.5);
  });

  it('handles odd-length arrays (median is exact middle)', () => {
    const sorted = [1, 2, 3, 4, 5];
    // p50 → index 2.0 → value 3
    expect(computePercentile(sorted, 50)).toBe(3);
    // p0 → 1, p100 → 5
    expect(computePercentile(sorted, 0)).toBe(1);
    expect(computePercentile(sorted, 100)).toBe(5);
  });

  it('handles even-length arrays with interpolation', () => {
    const sorted = [10, 20, 30, 40];
    // p50 → index 1.5 → interpolate 20 + 0.5*(30-20) = 25
    expect(computePercentile(sorted, 50)).toBe(25);
  });

  it('clamps percentile to [0, 100]', () => {
    const sorted = [5, 10, 15];
    expect(computePercentile(sorted, -10)).toBe(5);
    expect(computePercentile(sorted, 200)).toBe(15);
  });

  it('computes p95 and p99 for larger arrays', () => {
    // 100 values: 1, 2, 3, ..., 100
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    // p95 → index 94.05 → 95 + 0.05*(96-95) = 95.05
    expect(computePercentile(sorted, 95)).toBeCloseTo(95.05, 6);
    // p99 → index 98.01 → 99 + 0.01*(100-99) = 99.01
    expect(computePercentile(sorted, 99)).toBeCloseTo(99.01, 6);
  });
});

// ---------------------------------------------------------------------------
// measureModulePerformance
// ---------------------------------------------------------------------------

describe('measureModulePerformance', () => {
  it('returns zeroed metrics for empty samples', () => {
    const scanFn: ScanFn = () => ({ findings: [], verdict: 'clean' });
    const result = measureModulePerformance('mod-empty', [], scanFn);

    expect(result.module_id).toBe('mod-empty');
    expect(result.sample_count).toBe(0);
    expect(result.mean_ms).toBe(0);
    expect(result.median_ms).toBe(0);
    expect(result.p95_ms).toBe(0);
    expect(result.p99_ms).toBe(0);
    expect(result.max_ms).toBe(0);
    expect(result.min_ms).toBe(0);
    expect(result.std_dev_ms).toBe(0);
  });

  it('computes correct stats for known timings', () => {
    // Mock performance.now to return predictable values
    // Simulate 5 samples with timings: 10, 20, 30, 40, 50 ms
    let callCount = 0;
    const mockTimes = [0, 10, 10, 30, 30, 60, 60, 100, 100, 150];
    vi.spyOn(performance, 'now').mockImplementation(() => {
      const val = mockTimes[callCount];
      callCount++;
      return val;
    });

    const scanFn: ScanFn = () => ({ findings: [], verdict: 'clean' });
    const samples = ['a', 'b', 'c', 'd', 'e'];
    const result = measureModulePerformance('mod-timed', samples, scanFn);

    expect(result.module_id).toBe('mod-timed');
    expect(result.sample_count).toBe(5);
    // Timings: 10, 20, 30, 40, 50 → sorted: [10, 20, 30, 40, 50]
    // Mean: (10+20+30+40+50)/5 = 30
    expect(result.mean_ms).toBeCloseTo(30, 6);
    // Median (p50): index 2 → 30
    expect(result.median_ms).toBeCloseTo(30, 6);
    // Max: 50, Min: 10
    expect(result.max_ms).toBeCloseTo(50, 6);
    expect(result.min_ms).toBeCloseTo(10, 6);
    // Std dev: sqrt(((10-30)^2 + (20-30)^2 + (30-30)^2 + (40-30)^2 + (50-30)^2) / 5)
    //        = sqrt((400+100+0+100+400)/5) = sqrt(200) ≈ 14.142
    expect(result.std_dev_ms).toBeCloseTo(Math.sqrt(200), 4);

    vi.restoreAllMocks();
  });

  it('calls the scan function with each sample', () => {
    const scanFn = vi.fn<ScanFn>().mockReturnValue({ findings: [], verdict: 'clean' });
    const samples = ['hello', 'world', 'test'];

    measureModulePerformance('mod-calls', samples, scanFn);

    expect(scanFn).toHaveBeenCalledTimes(3);
    expect(scanFn).toHaveBeenCalledWith('hello');
    expect(scanFn).toHaveBeenCalledWith('world');
    expect(scanFn).toHaveBeenCalledWith('test');
  });
});

// ---------------------------------------------------------------------------
// buildPerformanceBaseline
// ---------------------------------------------------------------------------

describe('buildPerformanceBaseline', () => {
  it('creates baseline with correct totals', () => {
    const metrics: readonly PerformanceMetrics[] = [
      {
        module_id: 'mod-a',
        sample_count: 100,
        mean_ms: 10,
        median_ms: 9,
        p95_ms: 15,
        p99_ms: 18,
        max_ms: 20,
        min_ms: 5,
        std_dev_ms: 3,
      },
      {
        module_id: 'mod-b',
        sample_count: 200,
        mean_ms: 20,
        median_ms: 19,
        p95_ms: 30,
        p99_ms: 35,
        max_ms: 40,
        min_ms: 10,
        std_dev_ms: 5,
      },
    ];

    const baseline = buildPerformanceBaseline(metrics, 'env-abc123');

    expect(baseline.environment_hash).toBe('env-abc123');
    expect(baseline.total_samples).toBe(300);
    // total_elapsed = 10*100 + 20*200 = 1000 + 4000 = 5000
    expect(baseline.total_elapsed_ms).toBe(5000);
    expect(baseline.modules).toHaveLength(2);
    expect(baseline.generated_at).toBeTruthy();
  });

  it('handles empty metrics array', () => {
    const baseline = buildPerformanceBaseline([], 'env-empty');
    expect(baseline.total_samples).toBe(0);
    expect(baseline.total_elapsed_ms).toBe(0);
    expect(baseline.modules).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// compareBaselines — regression detection
// ---------------------------------------------------------------------------

describe('compareBaselines', () => {
  function makeMetrics(moduleId: string, meanMs: number): PerformanceMetrics {
    return {
      module_id: moduleId,
      sample_count: 100,
      mean_ms: meanMs,
      median_ms: meanMs * 0.95,
      p95_ms: meanMs * 1.5,
      p99_ms: meanMs * 1.8,
      max_ms: meanMs * 2,
      min_ms: meanMs * 0.5,
      std_dev_ms: meanMs * 0.1,
    };
  }

  function makeBaseline(modules: readonly PerformanceMetrics[]): PerformanceBaseline {
    return {
      generated_at: '2025-01-01T00:00:00.000Z',
      environment_hash: 'env-test',
      modules,
      total_samples: modules.reduce((acc, m) => acc + m.sample_count, 0),
      total_elapsed_ms: modules.reduce((acc, m) => acc + m.mean_ms * m.sample_count, 0),
    };
  }

  it('reports ok when no regression', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 100);
    const baseline = makeBaseline([baselineMetrics]);

    const report = compareBaselines([currentMetrics], baseline);

    expect(report.overall_status).toBe('ok');
    expect(report.warnings).toBe(0);
    expect(report.failures).toBe(0);
    expect(report.results.every((r) => r.status === 'ok')).toBe(true);
  });

  it('reports ok for minor improvement (negative change)', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 80); // 20% faster
    const baseline = makeBaseline([baselineMetrics]);

    const report = compareBaselines([currentMetrics], baseline);

    expect(report.overall_status).toBe('ok');
    expect(report.results.every((r) => r.change_pct < 0)).toBe(true);
  });

  it('reports warning for 25% regression (above 20% threshold)', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 125); // 25% slower
    const baseline = makeBaseline([baselineMetrics]);

    const report = compareBaselines([currentMetrics], baseline);

    expect(report.overall_status).toBe('warning');
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.failures).toBe(0);
    // All metrics should be warning since they all scale proportionally
    const warningResults = report.results.filter((r) => r.status === 'warning');
    expect(warningResults.length).toBeGreaterThan(0);
  });

  it('reports failure for 55% regression (above 50% threshold)', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 155); // 55% slower
    const baseline = makeBaseline([baselineMetrics]);

    const report = compareBaselines([currentMetrics], baseline);

    expect(report.overall_status).toBe('failure');
    expect(report.failures).toBeGreaterThan(0);
    const failureResults = report.results.filter((r) => r.status === 'failure');
    expect(failureResults.length).toBeGreaterThan(0);
  });

  it('uses custom thresholds when provided', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 112); // 12% slower
    const baseline = makeBaseline([baselineMetrics]);

    // With 10% warning and 30% failure thresholds
    const report = compareBaselines([currentMetrics], baseline, 0.10, 0.30);

    expect(report.overall_status).toBe('warning');
    expect(report.warnings).toBeGreaterThan(0);
  });

  it('handles modules not in baseline (new modules)', () => {
    const currentMetrics = makeMetrics('mod-new', 100);
    const baseline = makeBaseline([]);

    const report = compareBaselines([currentMetrics], baseline);

    expect(report.overall_status).toBe('ok');
    // All results should be ok since there is no baseline to compare against
    expect(report.results.every((r) => r.status === 'ok')).toBe(true);
    expect(report.results.every((r) => r.baseline_ms === 0)).toBe(true);
  });

  it('handles multiple modules with mixed statuses', () => {
    const baseline = makeBaseline([
      makeMetrics('mod-ok', 100),
      makeMetrics('mod-warn', 100),
      makeMetrics('mod-fail', 100),
    ]);

    const current = [
      makeMetrics('mod-ok', 100),     // no regression
      makeMetrics('mod-warn', 125),   // 25% warning
      makeMetrics('mod-fail', 155),   // 55% failure
    ];

    const report = compareBaselines(current, baseline);

    expect(report.overall_status).toBe('failure');
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.failures).toBeGreaterThan(0);
  });

  it('reports correct change_pct values', () => {
    const baselineMetrics = makeMetrics('mod-a', 100);
    const currentMetrics = makeMetrics('mod-a', 130); // 30% increase
    const baseline = makeBaseline([baselineMetrics]);

    const report = compareBaselines([currentMetrics], baseline);

    const meanResult = report.results.find(
      (r) => r.module_id === 'mod-a' && r.metric === 'mean_ms',
    );
    expect(meanResult).toBeDefined();
    expect(meanResult!.change_pct).toBeCloseTo(0.30, 6);
    expect(meanResult!.baseline_ms).toBe(100);
    expect(meanResult!.current_ms).toBe(130);
  });
});

// ---------------------------------------------------------------------------
// formatPerformanceReport
// ---------------------------------------------------------------------------

describe('formatPerformanceReport', () => {
  it('produces valid markdown with header and table', () => {
    const baseline: PerformanceBaseline = {
      generated_at: '2025-06-01T12:00:00.000Z',
      environment_hash: 'env-hash-xyz',
      modules: [
        {
          module_id: 'mod-test',
          sample_count: 50,
          mean_ms: 12.5,
          median_ms: 11.0,
          p95_ms: 20.0,
          p99_ms: 25.0,
          max_ms: 30.0,
          min_ms: 5.0,
          std_dev_ms: 4.2,
        },
      ],
      total_samples: 50,
      total_elapsed_ms: 625.0,
    };

    const report = formatPerformanceReport(baseline);

    expect(report).toContain('# Performance Baseline Report');
    expect(report).toContain('**Generated:** 2025-06-01T12:00:00.000Z');
    expect(report).toContain('**Environment:** env-hash-xyz');
    expect(report).toContain('**Total Samples:** 50');
    expect(report).toContain('625.00 ms');
    expect(report).toContain('mod-test');
    expect(report).toContain('12.50');
    expect(report).toContain('11.00');
    expect(report).toContain('20.00');
    expect(report).toContain('25.00');
    expect(report).toContain('| Module |');
    expect(report).toContain('ISO 17025');
    expect(report).toContain('20%');
    expect(report).toContain('50%');
  });

  it('handles empty modules list', () => {
    const baseline: PerformanceBaseline = {
      generated_at: '2025-06-01T12:00:00.000Z',
      environment_hash: 'env-empty',
      modules: [],
      total_samples: 0,
      total_elapsed_ms: 0,
    };

    const report = formatPerformanceReport(baseline);

    expect(report).toContain('# Performance Baseline Report');
    expect(report).toContain('**Total Samples:** 0');
    // Table header should still be present
    expect(report).toContain('| Module |');
  });
});
