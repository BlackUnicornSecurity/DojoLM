/**
 * Tests for benchmark.ts — calculateMetrics, measureLatency, runBenchmark
 */

import { describe, it, expect } from 'vitest';
import { calculateMetrics, measureLatency, runBenchmark } from './benchmark.js';
import type { BenchmarkConfig } from './types.js';

// ---------- helpers ----------
const alwaysAllow = (_t: string) => ({ verdict: 'ALLOW' as const });
const alwaysBlock = (_t: string) => ({ verdict: 'BLOCK' as const });
const smartScanner = (t: string) => ({
  verdict: t.includes('attack') ? ('BLOCK' as const) : ('ALLOW' as const),
});

// ---------- tests ----------

describe('benchmark.ts', () => {
  // BM-001
  it('BM-001: calculateMetrics returns all zeros for empty input', () => {
    const m = calculateMetrics([]);
    expect(m.accuracy).toBe(0);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });

  // BM-002
  it('BM-002: calculateMetrics computes perfect accuracy when all correct', () => {
    const results = [
      { expected: 'BLOCK' as const, actual: 'BLOCK' as const },
      { expected: 'ALLOW' as const, actual: 'ALLOW' as const },
    ];
    const m = calculateMetrics(results);
    expect(m.accuracy).toBe(1);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(1);
    expect(m.f1).toBe(1);
  });

  // BM-003
  it('BM-003: calculateMetrics handles all false positives', () => {
    const results = [
      { expected: 'ALLOW' as const, actual: 'BLOCK' as const },
      { expected: 'ALLOW' as const, actual: 'BLOCK' as const },
    ];
    const m = calculateMetrics(results);
    expect(m.accuracy).toBe(0);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });

  // BM-004
  it('BM-004: calculateMetrics handles all false negatives', () => {
    const results = [
      { expected: 'BLOCK' as const, actual: 'ALLOW' as const },
      { expected: 'BLOCK' as const, actual: 'ALLOW' as const },
    ];
    const m = calculateMetrics(results);
    expect(m.accuracy).toBe(0);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });

  // BM-005
  it('BM-005: calculateMetrics computes 50% accuracy for mixed results', () => {
    const results = [
      { expected: 'BLOCK' as const, actual: 'BLOCK' as const },
      { expected: 'BLOCK' as const, actual: 'ALLOW' as const },
      { expected: 'ALLOW' as const, actual: 'ALLOW' as const },
      { expected: 'ALLOW' as const, actual: 'BLOCK' as const },
    ];
    const m = calculateMetrics(results);
    expect(m.accuracy).toBe(0.5);
    expect(m.precision).toBe(0.5);
    expect(m.recall).toBe(0.5);
    expect(m.f1).toBeCloseTo(0.5, 2);
  });

  // BM-006
  it('BM-006: calculateMetrics rounds to 4 decimal places', () => {
    const results = [
      { expected: 'BLOCK' as const, actual: 'BLOCK' as const },
      { expected: 'ALLOW' as const, actual: 'ALLOW' as const },
      { expected: 'BLOCK' as const, actual: 'ALLOW' as const },
    ];
    const m = calculateMetrics(results);
    // 2/3 = 0.6667 (rounded to 4 decimal places)
    const decimalPlaces = (n: number) => (String(n).split('.')[1] || '').length;
    expect(decimalPlaces(m.accuracy)).toBeLessThanOrEqual(4);
    expect(decimalPlaces(m.precision)).toBeLessThanOrEqual(4);
    expect(decimalPlaces(m.recall)).toBeLessThanOrEqual(4);
    expect(decimalPlaces(m.f1)).toBeLessThanOrEqual(4);
  });

  // BM-007
  it('BM-007: measureLatency returns non-negative avg, p95, p99', () => {
    const lat = measureLatency(alwaysAllow, ['hello', 'world'], 2);
    expect(lat.avg).toBeGreaterThanOrEqual(0);
    expect(lat.p95).toBeGreaterThanOrEqual(0);
    expect(lat.p99).toBeGreaterThanOrEqual(0);
  });

  // BM-008
  it('BM-008: measureLatency p95 >= avg and p99 >= p95', () => {
    const lat = measureLatency(smartScanner, ['normal', 'attack payload', 'safe text'], 3);
    expect(lat.p99).toBeGreaterThanOrEqual(lat.p95);
    expect(lat.p95).toBeGreaterThanOrEqual(lat.avg);
  });

  // BM-009
  it('BM-009: runBenchmark returns results for each test set', () => {
    const config: BenchmarkConfig = {
      testSets: [
        { name: 'set-a', inputs: [{ text: 'ok', expectedVerdict: 'ALLOW' }] },
        { name: 'set-b', inputs: [{ text: 'attack attempt', expectedVerdict: 'BLOCK' }] },
      ],
      iterations: 1,
      warmupIterations: 0,
    };
    const results = runBenchmark(config, smartScanner);
    expect(results).toHaveLength(2);
    expect(results[0].testSet).toBe('set-a');
    expect(results[1].testSet).toBe('set-b');
  });

  // BM-010
  it('BM-010: runBenchmark records correct sampleCount', () => {
    const config: BenchmarkConfig = {
      testSets: [
        {
          name: 'count-test',
          inputs: [
            { text: 'a', expectedVerdict: 'ALLOW' },
            { text: 'b', expectedVerdict: 'ALLOW' },
            { text: 'attack c', expectedVerdict: 'BLOCK' },
          ],
        },
      ],
      iterations: 2,
      warmupIterations: 1,
    };
    const results = runBenchmark(config, smartScanner);
    expect(results[0].sampleCount).toBe(3);
  });

  // BM-011
  it('BM-011: runBenchmark computes accuracy for smart scanner', () => {
    const config: BenchmarkConfig = {
      testSets: [
        {
          name: 'accuracy-test',
          inputs: [
            { text: 'normal text', expectedVerdict: 'ALLOW' },
            { text: 'attack payload', expectedVerdict: 'BLOCK' },
          ],
        },
      ],
      iterations: 1,
      warmupIterations: 0,
    };
    const results = runBenchmark(config, smartScanner);
    expect(results[0].accuracy).toBe(1);
  });

  // BM-012
  it('BM-012: runBenchmark returns empty array for no test sets', () => {
    const config: BenchmarkConfig = {
      testSets: [],
      iterations: 1,
      warmupIterations: 0,
    };
    const results = runBenchmark(config, alwaysAllow);
    expect(results).toHaveLength(0);
  });

  // BM-013
  it('BM-013: runBenchmark handles always-block scanner with expected ALLOW', () => {
    const config: BenchmarkConfig = {
      testSets: [
        {
          name: 'false-positive-test',
          inputs: [
            { text: 'safe content', expectedVerdict: 'ALLOW' },
            { text: 'also safe', expectedVerdict: 'ALLOW' },
          ],
        },
      ],
      iterations: 1,
      warmupIterations: 0,
    };
    const results = runBenchmark(config, alwaysBlock);
    expect(results[0].accuracy).toBe(0);
    expect(results[0].precision).toBe(0);
  });
});
