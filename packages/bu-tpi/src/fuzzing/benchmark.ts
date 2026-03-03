/**
 * S66: Benchmark Suite
 * Standardized test sets for scanner performance measurement.
 */

import type { BenchmarkConfig, BenchmarkResult, BenchmarkTestSet } from './types.js';
import { DEFAULT_BENCHMARK_CONFIG } from './types.js';

type ScannerFn = (text: string) => {
  verdict: 'BLOCK' | 'ALLOW';
};

/**
 * Calculate classification metrics.
 */
export function calculateMetrics(
  results: Array<{ expected: 'BLOCK' | 'ALLOW'; actual: 'BLOCK' | 'ALLOW' }>
): { accuracy: number; precision: number; recall: number; f1: number } {
  let tp = 0, fp = 0, tn = 0, fn = 0;

  for (const r of results) {
    if (r.expected === 'BLOCK' && r.actual === 'BLOCK') tp++;
    else if (r.expected === 'ALLOW' && r.actual === 'BLOCK') fp++;
    else if (r.expected === 'ALLOW' && r.actual === 'ALLOW') tn++;
    else if (r.expected === 'BLOCK' && r.actual === 'ALLOW') fn++;
  }

  const accuracy = results.length > 0 ? (tp + tn) / results.length : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    accuracy: Math.round(accuracy * 10000) / 10000,
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
  };
}

/**
 * Measure scanner latency.
 */
export function measureLatency(
  scanner: ScannerFn,
  inputs: string[],
  iterations: number
): { avg: number; p95: number; p99: number } {
  const allLatencies: number[] = [];

  for (let iter = 0; iter < iterations; iter++) {
    for (const input of inputs) {
      const start = performance.now();
      scanner(input);
      const end = performance.now();
      allLatencies.push(end - start);
    }
  }

  allLatencies.sort((a, b) => a - b);

  const avg = allLatencies.reduce((sum, l) => sum + l, 0) / allLatencies.length;
  const p95Index = Math.floor(allLatencies.length * 0.95);
  const p99Index = Math.floor(allLatencies.length * 0.99);

  return {
    avg: Math.round(avg * 100) / 100,
    p95: Math.round((allLatencies[p95Index] ?? 0) * 100) / 100,
    p99: Math.round((allLatencies[p99Index] ?? 0) * 100) / 100,
  };
}

/**
 * Run a benchmark suite against a scanner.
 */
export function runBenchmark(
  config: BenchmarkConfig,
  scanner: ScannerFn
): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];

  for (const testSet of config.testSets) {
    // Warmup
    for (let w = 0; w < config.warmupIterations; w++) {
      for (const item of testSet.inputs) {
        scanner(item.text);
      }
    }

    // Classification results
    const classificationResults = testSet.inputs.map((item) => ({
      expected: item.expectedVerdict,
      actual: scanner(item.text).verdict,
    }));

    const metrics = calculateMetrics(classificationResults);
    const latency = measureLatency(
      scanner,
      testSet.inputs.map((i) => i.text),
      config.iterations
    );

    results.push({
      testSet: testSet.name,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      avgLatencyMs: latency.avg,
      p95LatencyMs: latency.p95,
      p99LatencyMs: latency.p99,
      sampleCount: testSet.inputs.length,
    });
  }

  return results;
}
