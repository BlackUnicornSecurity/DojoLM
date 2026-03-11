/**
 * Tests for comparison.ts — compareBenchmarks, formatComparison, isRegression
 */

import { describe, it, expect } from 'vitest';
import { compareBenchmarks, formatComparison, isRegression } from './comparison.js';
import type { BenchmarkResult, BenchmarkComparison } from './types.js';

// ---------- helpers ----------
function makeResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    testSet: 'basic',
    accuracy: 0.9,
    precision: 0.85,
    recall: 0.9,
    f1: 0.87,
    avgLatencyMs: 10,
    p95LatencyMs: 20,
    p99LatencyMs: 30,
    sampleCount: 100,
    ...overrides,
  };
}

// ---------- tests ----------

describe('comparison.ts', () => {
  // CMP-001
  it('CMP-001: compareBenchmarks returns empty changes when values are identical', () => {
    const base = [makeResult()];
    const curr = [makeResult()];
    const comparison = compareBenchmarks(base, curr);
    expect(comparison.changes).toHaveLength(0);
    expect(comparison.baseline).toBe(base);
    expect(comparison.current).toBe(curr);
  });

  // CMP-002
  it('CMP-002: compareBenchmarks detects improved accuracy metrics', () => {
    const base = [makeResult({ accuracy: 0.8, precision: 0.75, recall: 0.8, f1: 0.77 })];
    const curr = [makeResult({ accuracy: 0.95, precision: 0.92, recall: 0.95, f1: 0.93 })];
    const comparison = compareBenchmarks(base, curr);
    const accuracyMetrics = comparison.changes.filter(
      (c) => !c.metric.includes('Latency')
    );
    expect(accuracyMetrics.length).toBeGreaterThan(0);
    expect(accuracyMetrics.every((c) => c.significance === 'improved')).toBe(true);
  });

  // CMP-003
  it('CMP-003: compareBenchmarks detects degraded accuracy metrics', () => {
    const base = [makeResult({ accuracy: 0.95 })];
    const curr = [makeResult({ accuracy: 0.7 })];
    const comparison = compareBenchmarks(base, curr);
    const accChange = comparison.changes.find((c) => c.metric === 'accuracy');
    expect(accChange).toBeDefined();
    expect(accChange!.significance).toBe('degraded');
    expect(accChange!.delta).toBeLessThan(0);
  });

  // CMP-004
  it('CMP-004: compareBenchmarks treats lower latency as improved', () => {
    const base = [makeResult({ avgLatencyMs: 50, p95LatencyMs: 100, p99LatencyMs: 200 })];
    const curr = [makeResult({ avgLatencyMs: 10, p95LatencyMs: 20, p99LatencyMs: 40 })];
    const comparison = compareBenchmarks(base, curr);
    const latencyChanges = comparison.changes.filter((c) => c.metric.includes('Latency'));
    expect(latencyChanges.length).toBeGreaterThan(0);
    expect(latencyChanges.every((c) => c.significance === 'improved')).toBe(true);
  });

  // CMP-005
  it('CMP-005: compareBenchmarks treats higher latency as degraded', () => {
    const base = [makeResult({ avgLatencyMs: 5 })];
    const curr = [makeResult({ avgLatencyMs: 50 })];
    const comparison = compareBenchmarks(base, curr);
    const avgLatency = comparison.changes.find((c) => c.metric === 'avgLatencyMs');
    expect(avgLatency).toBeDefined();
    expect(avgLatency!.significance).toBe('degraded');
  });

  // CMP-006
  it('CMP-006: compareBenchmarks skips test sets missing in baseline', () => {
    const base = [makeResult({ testSet: 'alpha' })];
    const curr = [makeResult({ testSet: 'beta', accuracy: 0.5 })];
    const comparison = compareBenchmarks(base, curr);
    expect(comparison.changes).toHaveLength(0);
  });

  // CMP-007
  it('CMP-007: compareBenchmarks handles zero baseline value', () => {
    const base = [makeResult({ avgLatencyMs: 0 })];
    const curr = [makeResult({ avgLatencyMs: 5 })];
    const comparison = compareBenchmarks(base, curr);
    const change = comparison.changes.find((c) => c.metric === 'avgLatencyMs');
    expect(change).toBeDefined();
    expect(change!.significance).toBe('degraded');
  });

  // CMP-008
  it('CMP-008: formatComparison produces markdown table with header', () => {
    const comparison = compareBenchmarks(
      [makeResult({ accuracy: 0.8 })],
      [makeResult({ accuracy: 0.95 })]
    );
    const md = formatComparison(comparison);
    expect(md).toContain('# Benchmark Comparison');
    expect(md).toContain('| Test Set |');
    expect(md).toContain('| basic |');
  });

  // CMP-009
  it('CMP-009: formatComparison shows placeholder row when no changes', () => {
    const comparison: BenchmarkComparison = {
      baseline: [makeResult()],
      current: [makeResult()],
      changes: [],
    };
    const md = formatComparison(comparison);
    expect(md).toContain('No significant changes');
  });

  // CMP-010
  it('CMP-010: formatComparison uses + for improved and - for degraded', () => {
    const base = [makeResult({ accuracy: 0.8, p99LatencyMs: 10 })];
    const curr = [makeResult({ accuracy: 0.95, p99LatencyMs: 50 })];
    const comparison = compareBenchmarks(base, curr);
    const md = formatComparison(comparison);
    expect(md).toContain('+');
    expect(md).toContain('-');
  });

  // CMP-011
  it('CMP-011: isRegression returns false when all metrics improve', () => {
    const base = [makeResult({ accuracy: 0.7, avgLatencyMs: 50 })];
    const curr = [makeResult({ accuracy: 0.95, avgLatencyMs: 5 })];
    const comparison = compareBenchmarks(base, curr);
    expect(isRegression(comparison)).toBe(false);
  });

  // CMP-012
  it('CMP-012: isRegression returns true when any metric degrades', () => {
    const base = [makeResult({ accuracy: 0.95 })];
    const curr = [makeResult({ accuracy: 0.7 })];
    const comparison = compareBenchmarks(base, curr);
    expect(isRegression(comparison)).toBe(true);
  });

  // CMP-013
  it('CMP-013: isRegression respects custom threshold', () => {
    const base = [makeResult({ accuracy: 0.90 })];
    const curr = [makeResult({ accuracy: 0.88 })];
    const comparison = compareBenchmarks(base, curr);
    // delta is -0.02 which is > 0.01 default threshold, so there's a change
    // But with threshold=0.05, the delta doesn't exceed it
    expect(isRegression(comparison, 0.05)).toBe(false);
    expect(isRegression(comparison, 0.01)).toBe(true);
  });

  // CMP-014
  it('CMP-014: compareBenchmarks rounds delta to 4 decimal places', () => {
    const base = [makeResult({ accuracy: 0.33333 })];
    const curr = [makeResult({ accuracy: 0.66666 })];
    const comparison = compareBenchmarks(base, curr);
    const change = comparison.changes.find((c) => c.metric === 'accuracy');
    expect(change).toBeDefined();
    // Check that delta has at most 4 decimal places
    const decimalPart = String(change!.delta).split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(4);
  });
});
