/**
 * S66: Fuzzing Engine + Benchmark Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createGrammar,
  generateInput,
  mutateInput,
  PROMPT_GRAMMAR,
  ENCODING_GRAMMAR,
  STRUCTURAL_GRAMMAR,
  createFuzzSession,
  fuzz,
  getFuzzCoverage,
  exportResults,
  detectAnomaly,
  calculateMetrics,
  measureLatency,
  runBenchmark,
  compareBenchmarks,
  formatComparison,
  isRegression,
} from './index.js';
import type { BenchmarkConfig } from './types.js';

describe('Grammar', () => {
  it('should create grammar from rules', () => {
    const grammar = createGrammar(PROMPT_GRAMMAR);
    expect(grammar.rules.length).toBe(PROMPT_GRAMMAR.length);
  });

  it('should generate deterministic input', () => {
    const grammar1 = createGrammar(PROMPT_GRAMMAR, 'seed1');
    const grammar2 = createGrammar(PROMPT_GRAMMAR, 'seed1');
    const input1 = generateInput(grammar1);
    const input2 = generateInput(grammar2);
    expect(input1).toBe(input2);
  });

  it('should generate from different grammars', () => {
    const g1 = createGrammar(ENCODING_GRAMMAR, 'enc');
    const g2 = createGrammar(STRUCTURAL_GRAMMAR, 'struct');
    const i1 = generateInput(g1);
    const i2 = generateInput(g2);
    expect(i1).not.toBe(i2);
  });

  it('should mutate existing input', () => {
    const original = 'Hello World';
    const mutated = mutateInput(original, 0.5, 'mut-seed');
    expect(mutated).not.toBe(original);
  });
});

describe('Fuzzer', () => {
  const mockScanner = (text: string) => ({
    verdict: text.length > 50 ? ('BLOCK' as const) : ('ALLOW' as const),
    findings: text.length > 50 ? [{ category: 'TEST' }] : [],
    counts: { critical: 0, warning: 0, info: 0 },
  });

  it('should create fuzz session', () => {
    const session = createFuzzSession({
      maxIterations: 10,
      timeoutMs: 10000,
      mutationRate: 0.5,
      grammarRules: PROMPT_GRAMMAR,
      seed: 'test',
    });
    expect(session.status).toBe('running');
  });

  it('should run fuzzing session', () => {
    const session = createFuzzSession({
      maxIterations: 20,
      timeoutMs: 10000,
      mutationRate: 0.3,
      grammarRules: PROMPT_GRAMMAR,
      seed: 'fuzz-test',
    });

    const completed = fuzz(session, mockScanner);
    expect(completed.status).toBe('completed');
    expect(completed.results.length).toBeGreaterThan(0);
  });

  it('should report coverage stats', () => {
    const session = createFuzzSession({
      maxIterations: 10,
      timeoutMs: 10000,
      mutationRate: 0.5,
      grammarRules: PROMPT_GRAMMAR,
      seed: 'coverage',
    });

    fuzz(session, mockScanner);
    const coverage = getFuzzCoverage(session);
    expect(coverage.totalInputs).toBeGreaterThan(0);
  });

  it('should export results as JSON', () => {
    const session = createFuzzSession({
      maxIterations: 5,
      timeoutMs: 10000,
      mutationRate: 0.3,
      grammarRules: PROMPT_GRAMMAR,
      seed: 'export',
    });

    fuzz(session, mockScanner);
    const json = exportResults(session);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe(session.id);
  });

  it('should detect anomalies', () => {
    // Performance degradation fires first when durationMs > avgDuration * 5
    expect(detectAnomaly(15000, 100)).toBe('performance-degradation');
    expect(detectAnomaly(600, 100)).toBe('performance-degradation');
    // Timeout only fires when avgDuration is 0 or not a perf-degradation
    expect(detectAnomaly(15000, 0)).toBe('timeout');
    expect(detectAnomaly(100, 100)).toBeNull();
  });
});

describe('Benchmark', () => {
  const mockScanner = (text: string) => ({
    verdict: text.includes('attack') ? ('BLOCK' as const) : ('ALLOW' as const),
  });

  it('should calculate classification metrics', () => {
    const results = [
      { expected: 'BLOCK' as const, actual: 'BLOCK' as const },
      { expected: 'BLOCK' as const, actual: 'ALLOW' as const },
      { expected: 'ALLOW' as const, actual: 'ALLOW' as const },
      { expected: 'ALLOW' as const, actual: 'BLOCK' as const },
    ];

    const metrics = calculateMetrics(results);
    expect(metrics.accuracy).toBe(0.5);
    expect(metrics.precision).toBeGreaterThanOrEqual(0);
    expect(metrics.recall).toBeGreaterThanOrEqual(0);
    expect(metrics.f1).toBeGreaterThanOrEqual(0);
  });

  it('should measure latency', () => {
    const latency = measureLatency(mockScanner, ['hello', 'attack payload'], 3);
    expect(latency.avg).toBeGreaterThanOrEqual(0);
    expect(latency.p95).toBeGreaterThanOrEqual(0);
  });

  it('should run benchmark suite', () => {
    const config: BenchmarkConfig = {
      testSets: [{
        name: 'basic',
        inputs: [
          { text: 'normal text', expectedVerdict: 'ALLOW' },
          { text: 'attack payload detected', expectedVerdict: 'BLOCK' },
        ],
      }],
      iterations: 2,
      warmupIterations: 1,
    };

    const results = runBenchmark(config, mockScanner);
    expect(results.length).toBe(1);
    expect(results[0].testSet).toBe('basic');
    expect(results[0].accuracy).toBeGreaterThan(0);
  });
});

describe('Benchmark Comparison', () => {
  it('should compare benchmarks', () => {
    const baseline = [{ testSet: 'basic', accuracy: 0.8, precision: 0.75, recall: 0.85, f1: 0.8, avgLatencyMs: 10, p95LatencyMs: 20, p99LatencyMs: 30, sampleCount: 100 }];
    const current = [{ testSet: 'basic', accuracy: 0.85, precision: 0.8, recall: 0.9, f1: 0.85, avgLatencyMs: 8, p95LatencyMs: 15, p99LatencyMs: 25, sampleCount: 100 }];

    const comparison = compareBenchmarks(baseline, current);
    expect(comparison.changes.length).toBeGreaterThan(0);
    expect(comparison.changes.every((c) => c.significance === 'improved')).toBe(true);
  });

  it('should detect regressions', () => {
    const baseline = [{ testSet: 'basic', accuracy: 0.9, precision: 0.85, recall: 0.9, f1: 0.87, avgLatencyMs: 5, p95LatencyMs: 10, p99LatencyMs: 15, sampleCount: 100 }];
    const current = [{ testSet: 'basic', accuracy: 0.7, precision: 0.6, recall: 0.65, f1: 0.62, avgLatencyMs: 50, p95LatencyMs: 100, p99LatencyMs: 200, sampleCount: 100 }];

    const comparison = compareBenchmarks(baseline, current);
    expect(isRegression(comparison)).toBe(true);
  });

  it('should format comparison as markdown', () => {
    const baseline = [{ testSet: 'basic', accuracy: 0.8, precision: 0.75, recall: 0.85, f1: 0.8, avgLatencyMs: 10, p95LatencyMs: 20, p99LatencyMs: 30, sampleCount: 100 }];
    const current = [{ testSet: 'basic', accuracy: 0.85, precision: 0.8, recall: 0.9, f1: 0.85, avgLatencyMs: 8, p95LatencyMs: 15, p99LatencyMs: 25, sampleCount: 100 }];

    const comparison = compareBenchmarks(baseline, current);
    const md = formatComparison(comparison);
    expect(md).toContain('Benchmark Comparison');
  });
});
