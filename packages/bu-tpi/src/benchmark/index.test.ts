import { describe, it, expect } from 'vitest';
import * as mod from '../benchmark/index.js';

describe('benchmark exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports benchmark suites', () => {
    expect(mod.DOJOLM_BENCH_V1).toBeDefined();
    expect(mod.AGENTIC_BENCHMARK_SUITE).toBeDefined();
    expect(mod.RAG_BENCHMARK_SUITE).toBeDefined();
  });

  it('exports runner and regression symbols', () => {
    expect(mod.BenchmarkRunner).toBeTypeOf('function');
    expect(mod.detectBenchmarkRegressions).toBeTypeOf('function');
    expect(mod.DEFAULT_THRESHOLDS).toBeDefined();
  });
});
