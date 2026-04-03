/**
 * Tests for BenchmarkRunner
 */

import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from './runner.js';
import type { BenchmarkSuite, BenchmarkCategory } from './types.js';
import type { ScanFn } from './runner.js';

function makeSuite(categories: BenchmarkCategory[]): BenchmarkSuite {
  return {
    id: 'test-suite',
    name: 'Test Suite',
    version: '1.0',
    description: 'Test',
    fixtureCount: categories.reduce((s, c) => s + c.fixtureIds.length, 0),
    categories,
    scoringMethod: 'weighted_category',
    createdAt: new Date().toISOString(),
  };
}

describe('BenchmarkRunner', () => {
  it('scores 100 when all verdicts match', () => {
    const category: BenchmarkCategory = {
      name: 'test-cat',
      weight: 1.0,
      fixtureIds: ['f-1', 'f-2'],
      expectedVerdicts: { 'f-1': 'BLOCK', 'f-2': 'ALLOW' },
    };
    const suite = makeSuite([category]);
    const runner = new BenchmarkRunner(suite);
    const scanFn: ScanFn = () => ({ verdict: 'BLOCK' });
    // f-1 expects BLOCK (correct), f-2 expects ALLOW but gets BLOCK (wrong)
    // We need a smarter scan fn
    const smartScan: ScanFn = (text: string) => {
      if (text === 'f-2') return { verdict: 'ALLOW' };
      return { verdict: 'BLOCK' };
    };
    const result = runner.run('model-1', smartScan);
    expect(result.overallScore).toBe(100);
    expect(result.modelId).toBe('model-1');
    expect(result.suiteId).toBe('test-suite');
  });

  it('scores 0 when no verdicts match', () => {
    const category: BenchmarkCategory = {
      name: 'test-cat',
      weight: 1.0,
      fixtureIds: ['f-1', 'f-2'],
      expectedVerdicts: { 'f-1': 'BLOCK', 'f-2': 'ALLOW' },
    };
    const suite = makeSuite([category]);
    const runner = new BenchmarkRunner(suite);
    // Always returns the wrong verdict
    const wrongScan: ScanFn = (text: string) => {
      if (text === 'f-2') return { verdict: 'BLOCK' };
      return { verdict: 'ALLOW' };
    };
    const result = runner.run('model-1', wrongScan);
    expect(result.overallScore).toBe(0);
  });

  it('calls onProgress with correct totals', () => {
    const category: BenchmarkCategory = {
      name: 'cat-1',
      weight: 1.0,
      fixtureIds: ['f-1', 'f-2', 'f-3'],
      expectedVerdicts: { 'f-1': 'BLOCK', 'f-2': 'BLOCK', 'f-3': 'BLOCK' },
    };
    const suite = makeSuite([category]);
    const runner = new BenchmarkRunner(suite);
    const progress: { current: number; total: number }[] = [];
    runner.run('m', () => ({ verdict: 'BLOCK' }), (p) => progress.push(p));
    expect(progress).toHaveLength(3);
    expect(progress[2].current).toBe(3);
    expect(progress[2].total).toBe(3);
  });

  it('compareModels ranks by score descending', () => {
    const suite = makeSuite([]);
    const runner = new BenchmarkRunner(suite);
    const results = [
      { suiteId: 'x', modelId: 'low', modelName: 'low', provider: '', overallScore: 30, categoryScores: {}, breakdown: [], executedAt: '', elapsed: 0 },
      { suiteId: 'x', modelId: 'high', modelName: 'high', provider: '', overallScore: 90, categoryScores: {}, breakdown: [], executedAt: '', elapsed: 0 },
    ] as const;
    const comparison = runner.compareModels(results);
    expect(comparison.rankedModels[0].modelId).toBe('high');
    expect(comparison.rankedModels[0].rank).toBe(1);
    expect(comparison.rankedModels[1].modelId).toBe('low');
  });

  it('handles categories with empty fixtureIds', () => {
    const category: BenchmarkCategory = {
      name: 'empty',
      weight: 1.0,
      fixtureIds: [],
      expectedVerdicts: {},
    };
    const suite = makeSuite([category]);
    const runner = new BenchmarkRunner(suite);
    const result = runner.run('m', () => ({ verdict: 'BLOCK' }));
    expect(result.breakdown).toHaveLength(0);
    expect(result.overallScore).toBe(0);
  });
});
