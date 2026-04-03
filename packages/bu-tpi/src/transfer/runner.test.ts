/**
 * Tests for H25.1: Transfer Test Runner
 */

import { describe, it, expect, vi } from 'vitest';
import { TransferTestRunner } from './runner.js';

describe('Transfer Test Runner', () => {
  it('run produces results for all model-fixture pairs', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1', 'f2'],
      modelIds: ['m1', 'm2'],
    });

    const scanFn = vi.fn().mockReturnValue({ verdict: 'BLOCK' });
    const results = runner.run(scanFn);

    // 2 models * 2 models * 2 fixtures = 8 pair results
    expect(results).toHaveLength(8);
    expect(scanFn).toHaveBeenCalledTimes(4); // 2 models * 2 fixtures = 4 scans
  });

  it('run correctly identifies transferred vulnerabilities', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1'],
      modelIds: ['m1', 'm2'],
    });

    const scanFn = vi.fn().mockImplementation((fixtureId: string, modelId: string) => {
      if (modelId === 'm1') return { verdict: 'BLOCK' };
      return { verdict: 'ALLOW' };
    });

    const results = runner.run(scanFn);
    const m1ToM2 = results.find(r => r.sourceModelId === 'm1' && r.targetModelId === 'm2');

    expect(m1ToM2).toBeDefined();
    expect(m1ToM2!.transferred).toBe(false); // source BLOCK but target ALLOW
  });

  it('buildMatrix creates NxN matrix with diagonal always 1.0', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1', 'f2'],
      modelIds: ['m1', 'm2'],
    });

    const scanFn = vi.fn().mockReturnValue({ verdict: 'BLOCK' });
    const results = runner.run(scanFn);
    const matrix = runner.buildMatrix(results);

    expect(matrix.modelIds).toEqual(['m1', 'm2']);
    expect(matrix.matrix[0][0]).toBe(1.0); // diagonal
    expect(matrix.matrix[1][1]).toBe(1.0); // diagonal
  });

  it('generateSummary computes averages and finds highest/lowest pairs', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1'],
      modelIds: ['m1', 'm2'],
    });

    const scanFn = vi.fn().mockReturnValue({ verdict: 'BLOCK' });
    const results = runner.run(scanFn);
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);

    expect(summary.totalModels).toBe(2);
    expect(summary.totalFixtures).toBe(1);
    expect(summary.averageTransferRate).toBeGreaterThanOrEqual(0);
    expect(summary.highestPair).toBeDefined();
    expect(summary.lowestPair).toBeDefined();
  });

  it('run reports progress when callback is provided', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1'],
      modelIds: ['m1'],
    });

    const scanFn = vi.fn().mockReturnValue({ verdict: 'BLOCK' });
    const onProgress = vi.fn();
    runner.run(scanFn, onProgress);

    expect(onProgress).toHaveBeenCalledWith({ completed: 1, total: 1 });
  });

  it('generateSummary handles single model edge case', () => {
    const runner = new TransferTestRunner({
      fixtureIds: ['f1'],
      modelIds: ['m1'],
    });

    const scanFn = vi.fn().mockReturnValue({ verdict: 'BLOCK' });
    const results = runner.run(scanFn);
    const matrix = runner.buildMatrix(results);
    const summary = runner.generateSummary(matrix);

    expect(summary.totalModels).toBe(1);
    expect(summary.averageTransferRate).toBe(1.0);
  });
});
