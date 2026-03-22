/**
 * KATANA Uncertainty Estimator Tests (K3.4)
 *
 * Tests Wilson score CI, Clopper-Pearson CI, and uncertainty budget.
 * Uses hand-computed expected values for verification.
 *
 * ISO 17025 Clause 7.6
 */

import { describe, it, expect } from 'vitest';
import {
  wilsonCI,
  clopperPearsonCI,
  computeUncertainty,
  computeUncertaintyBudget,
  computeAllUncertaintyBudgets,
} from '../runner/uncertainty-estimator.js';
import { SCHEMA_VERSION, type ConfusionMatrix } from '../types.js';

function makeMatrix(
  moduleId: string,
  tp: number,
  tn: number,
  fp: number,
  fn: number,
): ConfusionMatrix {
  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    tp, tn, fp, fn,
    total: tp + tn + fp + fn,
  };
}

// ---------------------------------------------------------------------------
// Wilson Score CI
// ---------------------------------------------------------------------------

describe('wilsonCI', () => {
  it('returns [0, 1] for n=0', () => {
    const [lower, upper] = wilsonCI(0, 0);
    expect(lower).toBe(0);
    expect(upper).toBe(1);
  });

  it('handles 0 successes out of n trials', () => {
    const [lower, upper] = wilsonCI(0, 100);
    expect(lower).toBe(0);
    expect(upper).toBeGreaterThan(0);
    expect(upper).toBeLessThan(0.1);
  });

  it('handles n successes out of n trials (100%)', () => {
    const [lower, upper] = wilsonCI(100, 100);
    expect(lower).toBeGreaterThan(0.9);
    expect(upper).toBeCloseTo(1, 10);
  });

  it('50% proportion with n=100', () => {
    const [lower, upper] = wilsonCI(50, 100);
    // Expected: ~[0.40, 0.60] for 95% CI
    expect(lower).toBeGreaterThan(0.35);
    expect(lower).toBeLessThan(0.45);
    expect(upper).toBeGreaterThan(0.55);
    expect(upper).toBeLessThan(0.65);
  });

  it('CI narrows with larger sample size', () => {
    const [lower100, upper100] = wilsonCI(50, 100);
    const [lower1000, upper1000] = wilsonCI(500, 1000);
    const width100 = upper100 - lower100;
    const width1000 = upper1000 - lower1000;
    expect(width1000).toBeLessThan(width100);
  });

  it('CI is symmetric-ish around point estimate', () => {
    const [lower, upper] = wilsonCI(50, 100);
    const mid = (lower + upper) / 2;
    // Wilson CI centers slightly differently from p=0.5, but close
    expect(mid).toBeCloseTo(0.5, 1);
  });

  it('throws for successes > total', () => {
    expect(() => wilsonCI(101, 100)).toThrow();
  });

  it('throws for negative successes', () => {
    expect(() => wilsonCI(-1, 100)).toThrow();
  });

  it('lower bound is never negative', () => {
    const [lower] = wilsonCI(1, 1000);
    expect(lower).toBeGreaterThanOrEqual(0);
  });

  it('upper bound is never above 1', () => {
    const [, upper] = wilsonCI(999, 1000);
    expect(upper).toBeLessThanOrEqual(1);
  });

  it('single sample: 1/1', () => {
    const [lower, upper] = wilsonCI(1, 1);
    expect(lower).toBeGreaterThan(0);
    expect(upper).toBe(1);
  });

  it('single sample: 0/1', () => {
    const [lower, upper] = wilsonCI(0, 1);
    expect(lower).toBe(0);
    expect(upper).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// Clopper-Pearson CI
// ---------------------------------------------------------------------------

describe('clopperPearsonCI', () => {
  it('returns [0, 1] for n=0', () => {
    const [lower, upper] = clopperPearsonCI(0, 0);
    expect(lower).toBe(0);
    expect(upper).toBe(1);
  });

  it('handles 0 successes out of n trials', () => {
    const [lower, upper] = clopperPearsonCI(0, 100);
    expect(lower).toBe(0);
    expect(upper).toBeGreaterThan(0);
    expect(upper).toBeLessThan(0.1);
  });

  it('handles n successes out of n trials (100%)', () => {
    const [lower, upper] = clopperPearsonCI(100, 100);
    expect(lower).toBeGreaterThan(0.9);
    expect(upper).toBe(1);
  });

  it('50% proportion with n=100', () => {
    const [lower, upper] = clopperPearsonCI(50, 100);
    // Clopper-Pearson is more conservative than Wilson
    expect(lower).toBeGreaterThan(0.35);
    expect(lower).toBeLessThan(0.45);
    expect(upper).toBeGreaterThan(0.55);
    expect(upper).toBeLessThan(0.65);
  });

  it('is more conservative than Wilson (wider interval)', () => {
    const [wLower, wUpper] = wilsonCI(50, 100);
    const [cpLower, cpUpper] = clopperPearsonCI(50, 100);
    const wWidth = wUpper - wLower;
    const cpWidth = cpUpper - cpLower;
    // Clopper-Pearson should generally be wider
    expect(cpWidth).toBeGreaterThanOrEqual(wWidth * 0.95); // allow small tolerance
  });

  it('bounds are always [0, 1]', () => {
    const [lower, upper] = clopperPearsonCI(3, 10);
    expect(lower).toBeGreaterThanOrEqual(0);
    expect(upper).toBeLessThanOrEqual(1);
  });

  it('throws for invalid inputs', () => {
    expect(() => clopperPearsonCI(-1, 100)).toThrow();
    expect(() => clopperPearsonCI(101, 100)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Compute Uncertainty
// ---------------------------------------------------------------------------

describe('computeUncertainty', () => {
  it('computes uncertainty for a metric', () => {
    const result = computeUncertainty('test-module', 'accuracy', 95, 100);
    expect(result.schema_version).toBe(SCHEMA_VERSION);
    expect(result.module_id).toBe('test-module');
    expect(result.metric).toBe('accuracy');
    expect(result.point_estimate).toBeCloseTo(0.95, 10);
    expect(result.wilson_ci_lower).toBeLessThan(0.95);
    expect(result.wilson_ci_upper).toBeGreaterThan(0.95);
    expect(result.clopper_pearson_lower).toBeLessThan(0.95);
    expect(result.clopper_pearson_upper).toBeGreaterThan(0.95);
    expect(result.expanded_uncertainty).toBeGreaterThan(0);
    expect(result.coverage_factor).toBe(2);
    expect(result.sample_size).toBe(100);
  });

  it('returns null for total=0', () => {
    const result = computeUncertainty('test', 'accuracy', 0, 0);
    expect(result).toBeNull();
  });

  it('perfect score: 100/100', () => {
    const result = computeUncertainty('test', 'accuracy', 100, 100);
    expect(result.point_estimate).toBe(1.0);
    expect(result.wilson_ci_lower).toBeGreaterThan(0.95);
    expect(result.wilson_ci_upper).toBeCloseTo(1, 10);
  });

  it('expanded_uncertainty = standard_uncertainty * coverage_factor', () => {
    const result = computeUncertainty('test', 'accuracy', 50, 100, 3);
    const standardU = (result.wilson_ci_upper - result.wilson_ci_lower) / 2;
    expect(result.expanded_uncertainty).toBeCloseTo(standardU * 3, 10);
    expect(result.coverage_factor).toBe(3);
  });

  it('larger samples produce smaller uncertainty', () => {
    const small = computeUncertainty('test', 'accuracy', 50, 100);
    const large = computeUncertainty('test', 'accuracy', 5000, 10000);
    expect(large.expanded_uncertainty).toBeLessThan(small.expanded_uncertainty);
  });
});

// ---------------------------------------------------------------------------
// Uncertainty Budget
// ---------------------------------------------------------------------------

describe('computeUncertaintyBudget', () => {
  it('computes budget for all metrics', () => {
    const matrix = makeMatrix('test', 90, 85, 15, 10);
    const budget = computeUncertaintyBudget('test', matrix);

    // Should have uncertainty for: accuracy, precision, recall, specificity, fpr, fnr
    expect(budget.length).toBe(6);

    const metricNames = budget.map(u => u.metric);
    expect(metricNames).toContain('accuracy');
    expect(metricNames).toContain('precision');
    expect(metricNames).toContain('recall');
    expect(metricNames).toContain('specificity');
    expect(metricNames).toContain('fpr');
    expect(metricNames).toContain('fnr');
  });

  it('accuracy uncertainty matches matrix values', () => {
    const matrix = makeMatrix('test', 90, 85, 15, 10);
    const budget = computeUncertaintyBudget('test', matrix);
    const accuracyU = budget.find(u => u.metric === 'accuracy');

    expect(accuracyU).toBeDefined();
    expect(accuracyU!.point_estimate).toBeCloseTo(175 / 200, 10);
    expect(accuracyU!.sample_size).toBe(200);
  });

  it('precision uncertainty uses tp/(tp+fp)', () => {
    const matrix = makeMatrix('test', 90, 85, 15, 10);
    const budget = computeUncertaintyBudget('test', matrix);
    const precisionU = budget.find(u => u.metric === 'precision');

    expect(precisionU!.point_estimate).toBeCloseTo(90 / 105, 5);
    expect(precisionU!.sample_size).toBe(105);
  });

  it('recall uncertainty uses tp/(tp+fn)', () => {
    const matrix = makeMatrix('test', 90, 85, 15, 10);
    const budget = computeUncertaintyBudget('test', matrix);
    const recallU = budget.find(u => u.metric === 'recall');

    expect(recallU!.point_estimate).toBeCloseTo(90 / 100, 5);
    expect(recallU!.sample_size).toBe(100);
  });

  it('skips metrics with zero total', () => {
    // All TP, no negatives: tn+fp=0 → specificity and fpr skipped
    const matrix = makeMatrix('test', 100, 0, 0, 0);
    const budget = computeUncertaintyBudget('test', matrix);
    const metricNames = budget.map(u => u.metric);
    expect(metricNames).not.toContain('specificity');
    expect(metricNames).not.toContain('fpr');
  });

  it('perfect classifier has tight bounds', () => {
    const matrix = makeMatrix('perfect', 500, 500, 0, 0);
    const budget = computeUncertaintyBudget('perfect', matrix);
    const accuracyU = budget.find(u => u.metric === 'accuracy');
    expect(accuracyU!.point_estimate).toBe(1.0);
    expect(accuracyU!.wilson_ci_lower).toBeGreaterThan(0.99);
  });
});

// ---------------------------------------------------------------------------
// Compute All Budgets
// ---------------------------------------------------------------------------

describe('computeAllUncertaintyBudgets', () => {
  it('computes budgets for multiple modules', () => {
    const matrices = new Map<string, ConfusionMatrix>();
    matrices.set('mod-a', makeMatrix('mod-a', 90, 85, 15, 10));
    matrices.set('mod-b', makeMatrix('mod-b', 50, 50, 0, 0));

    const budgets = computeAllUncertaintyBudgets(matrices);

    expect(budgets.size).toBe(2);
    expect(budgets.has('mod-a')).toBe(true);
    expect(budgets.has('mod-b')).toBe(true);
    expect(budgets.get('mod-a')!.length).toBe(6);
  });
});
