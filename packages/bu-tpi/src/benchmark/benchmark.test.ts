/**
 * Benchmark Suite Tests
 * Tests for DOJOLM_BENCH_V1, BenchmarkRunner, and benchmark constants.
 */

import { describe, it, expect } from 'vitest';
import {
  DOJOLM_BENCH_V1,
  BenchmarkRunner,
  SCORING_METHODS,
  MAX_FIXTURES_PER_SUITE,
  DIFFICULTY_WEIGHTS,
} from './index.js';

// ---------------------------------------------------------------------------
// DOJOLM_BENCH_V1 suite
// ---------------------------------------------------------------------------

describe('DOJOLM_BENCH_V1', () => {
  it('has name, version, description, fixtureCount, scoringMethod, and categories', () => {
    expect(DOJOLM_BENCH_V1.name).toBe('DojoLM-Bench v1.0');
    expect(DOJOLM_BENCH_V1.version).toBe('v1.0');
    expect(typeof DOJOLM_BENCH_V1.description).toBe('string');
    expect(DOJOLM_BENCH_V1.description.length).toBeGreaterThan(0);
    expect(DOJOLM_BENCH_V1.fixtureCount).toBeGreaterThan(0);
    expect(DOJOLM_BENCH_V1.scoringMethod).toBe('weighted_category');
    expect(Array.isArray(DOJOLM_BENCH_V1.categories)).toBe(true);
    expect(DOJOLM_BENCH_V1.categories.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Suite categories
// ---------------------------------------------------------------------------

describe('Suite categories', () => {
  it('has 11 categories with correct names', () => {
    const names = DOJOLM_BENCH_V1.categories.map((c) => c.name);
    expect(names).toHaveLength(11);
    expect(names).toContain('prompt-injection');
    expect(names).toContain('jailbreak');
    expect(names).toContain('tool-manipulation');
    expect(names).toContain('output');
    expect(names).toContain('supply-chain');
    expect(names).toContain('agent');
    expect(names).toContain('model-theft');
    expect(names).toContain('vec');
    expect(names).toContain('bias');
    expect(names).toContain('dos');
    expect(names).toContain('encoded');
  });

  it('has weights that sum to 1.0', () => {
    const totalWeight = DOJOLM_BENCH_V1.categories.reduce(
      (sum, cat) => sum + cat.weight,
      0,
    );
    expect(totalWeight).toBeCloseTo(1.0, 5);
  });

  it('each category has a non-empty fixtureIds array', () => {
    for (const cat of DOJOLM_BENCH_V1.categories) {
      expect(Array.isArray(cat.fixtureIds)).toBe(true);
      expect(cat.fixtureIds.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// BenchmarkRunner
// ---------------------------------------------------------------------------

describe('BenchmarkRunner', () => {
  it('constructor accepts a suite', () => {
    const runner = new BenchmarkRunner(DOJOLM_BENCH_V1);
    expect(runner).toBeDefined();
  });

  it('run() returns a result with expected structure', () => {
    // Use a minimal suite to keep test fast
    const miniSuite = {
      ...DOJOLM_BENCH_V1,
      id: 'mini-suite',
      categories: [DOJOLM_BENCH_V1.categories[0]],
    };

    const runner = new BenchmarkRunner(miniSuite);
    const scanFn = () => ({ verdict: 'BLOCK' as const });
    const result = runner.run('test-model', scanFn);

    expect(result.suiteId).toBe('mini-suite');
    expect(result.modelId).toBe('test-model');
    expect(typeof result.overallScore).toBe('number');
    expect(typeof result.categoryScores).toBe('object');
    expect(Array.isArray(result.breakdown)).toBe(true);
    expect(typeof result.executedAt).toBe('string');
    expect(typeof result.elapsed).toBe('number');
  });

  it('run() scores a perfect scan correctly', () => {
    const miniSuite = {
      ...DOJOLM_BENCH_V1,
      id: 'mini-suite',
      categories: [DOJOLM_BENCH_V1.categories[0]],
    };
    const runner = new BenchmarkRunner(miniSuite);

    // Return the expected verdict for each fixture
    const cat = miniSuite.categories[0];
    const scanFn = (text: string) => ({
      verdict: (cat.expectedVerdicts[text] ?? 'BLOCK') as 'BLOCK' | 'ALLOW',
    });

    const result = runner.run('perfect-model', scanFn);
    // With 100% accuracy on a single category with weight 0.20, overall = 0.20 * 100 = 20
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.categoryScores[cat.name]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('Constants', () => {
  it('SCORING_METHODS contains expected methods', () => {
    expect(SCORING_METHODS).toContain('weighted_category');
    expect(SCORING_METHODS).toContain('binary_pass_fail');
    expect(SCORING_METHODS).toContain('severity_weighted');
    expect(SCORING_METHODS).toHaveLength(3);
  });

  it('MAX_FIXTURES_PER_SUITE is 1500', () => {
    expect(MAX_FIXTURES_PER_SUITE).toBe(1500);
  });

  it('DIFFICULTY_WEIGHTS has easy, medium, hard tiers', () => {
    expect(DIFFICULTY_WEIGHTS.easy).toBe(0.5);
    expect(DIFFICULTY_WEIGHTS.medium).toBe(1.0);
    expect(DIFFICULTY_WEIGHTS.hard).toBe(1.5);
  });
});
