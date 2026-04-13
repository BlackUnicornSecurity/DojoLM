/**
 * File: transfer-analyzer.test.ts
 * Purpose: Tests for cross-model transfer analysis
 * Epic: OBLITERATUS (OBL) — T1.2
 */

import { describe, it, expect } from 'vitest';
import { computeTransferScores } from './transfer-analyzer.js';

describe('computeTransferScores', () => {
  it('returns empty array for fewer than 2 reports', () => {
    expect(computeTransferScores([])).toEqual([]);
    expect(computeTransferScores([
      { modelConfigId: 'model-1', byCategory: [{ category: 'safety', passRate: 0.3 }] },
    ])).toEqual([]);
  });

  it('computes high correlation for models failing same categories', () => {
    const reports = [
      {
        modelConfigId: 'model-a',
        byCategory: [
          { category: 'injection', passRate: 0.2 },
          { category: 'xss', passRate: 0.3 },
          { category: 'safety', passRate: 0.8 },
        ],
      },
      {
        modelConfigId: 'model-b',
        byCategory: [
          { category: 'injection', passRate: 0.1 },
          { category: 'xss', passRate: 0.4 },
          { category: 'safety', passRate: 0.9 },
        ],
      },
    ];

    const scores = computeTransferScores(reports);
    expect(scores).toHaveLength(1);
    expect(scores[0].sourceModelId).toBe('model-a');
    expect(scores[0].targetModelId).toBe('model-b');
    expect(scores[0].correlation).toBe(1); // Both fail injection and xss
    expect(scores[0].sharedVulnerabilities).toEqual(['injection', 'xss']);
    expect(scores[0].divergentVulnerabilities).toEqual([]);
  });

  it('computes zero correlation for models failing different categories', () => {
    const reports = [
      {
        modelConfigId: 'model-a',
        byCategory: [
          { category: 'injection', passRate: 0.2 },
          { category: 'xss', passRate: 0.8 },
        ],
      },
      {
        modelConfigId: 'model-b',
        byCategory: [
          { category: 'injection', passRate: 0.9 },
          { category: 'xss', passRate: 0.3 },
        ],
      },
    ];

    const scores = computeTransferScores(reports);
    expect(scores[0].correlation).toBe(0);
    expect(scores[0].sharedVulnerabilities).toEqual([]);
    expect(scores[0].divergentVulnerabilities).toContain('injection');
    expect(scores[0].divergentVulnerabilities).toContain('xss');
  });

  it('computes partial correlation for overlapping failures', () => {
    const reports = [
      {
        modelConfigId: 'model-a',
        byCategory: [
          { category: 'injection', passRate: 0.2 },
          { category: 'xss', passRate: 0.3 },
          { category: 'csrf', passRate: 0.1 },
        ],
      },
      {
        modelConfigId: 'model-b',
        byCategory: [
          { category: 'injection', passRate: 0.2 },
          { category: 'xss', passRate: 0.8 },
          { category: 'ssrf', passRate: 0.3 },
        ],
      },
    ];

    const scores = computeTransferScores(reports);
    // Shared: injection. Divergent: xss (a only), csrf (a only), ssrf (b only)
    expect(scores[0].correlation).toBeCloseTo(1 / 4); // 1 shared / 4 union
    expect(scores[0].sharedVulnerabilities).toEqual(['injection']);
  });

  it('handles three models with pairwise comparisons', () => {
    const reports = [
      { modelConfigId: 'a', byCategory: [{ category: 'cat1', passRate: 0.3 }] },
      { modelConfigId: 'b', byCategory: [{ category: 'cat1', passRate: 0.4 }] },
      { modelConfigId: 'c', byCategory: [{ category: 'cat2', passRate: 0.2 }] },
    ];

    const scores = computeTransferScores(reports);
    // 3 models = 3 pairs: (a,b), (a,c), (b,c)
    expect(scores).toHaveLength(3);
  });

  it('handles models with no failed categories', () => {
    const reports = [
      { modelConfigId: 'a', byCategory: [{ category: 'cat1', passRate: 0.9 }] },
      { modelConfigId: 'b', byCategory: [{ category: 'cat1', passRate: 0.8 }] },
    ];

    const scores = computeTransferScores(reports);
    expect(scores[0].correlation).toBe(0);
  });
});
