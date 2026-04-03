import { describe, it, expect } from 'vitest';
import * as mod from '../fuzzing/index.js';

describe('fuzzing exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports grammar and fuzzer functions', () => {
    expect(mod.createGrammar).toBeTypeOf('function');
    expect(mod.generateInput).toBeTypeOf('function');
    expect(mod.createFuzzSession).toBeTypeOf('function');
    expect(mod.fuzz).toBeTypeOf('function');
  });

  it('exports benchmark and comparison functions', () => {
    expect(mod.runBenchmark).toBeTypeOf('function');
    expect(mod.compareBenchmarks).toBeTypeOf('function');
    expect(mod.isRegression).toBeTypeOf('function');
  });
});
