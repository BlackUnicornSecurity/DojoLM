/**
 * KATANA Metrics Calculator Tests (K3.3 + K11.1 Meta-Validation)
 *
 * Known confusion matrices with hand-computed expected metrics.
 * This file serves DUAL purpose:
 * - K3.3: Unit tests for the metrics calculator
 * - K11.1: Meta-validation — proves the validation framework's own calculations are correct
 *
 * Edge cases: all TP, all TN, all FP, all FN, single sample, large imbalanced sets.
 * Must run as prerequisite before any validation run.
 *
 * ISO 17025 Clause 7.2.2
 */

import { describe, it, expect } from 'vitest';
import { calculateMetrics, calculateAllMetrics } from '../runner/metrics-calculator.js';
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
    tp,
    tn,
    fp,
    fn,
    total: tp + tn + fp + fn,
  };
}

describe('calculateMetrics', () => {
  // --------------------------------------------------------------------------
  // K11.1 — Hand-computed known cases
  // --------------------------------------------------------------------------

  describe('K11.1 Meta-Validation: Known confusion matrices', () => {
    it('perfect classifier: 100 TP, 100 TN, 0 FP, 0 FN', () => {
      const m = calculateMetrics(makeMatrix('perfect', 100, 100, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.precision).toBeCloseTo(1.0, 10);
      expect(m.recall).toBeCloseTo(1.0, 10);
      expect(m.f1).toBeCloseTo(1.0, 10);
      expect(m.mcc).toBeCloseTo(1.0, 10);
      expect(m.specificity).toBeCloseTo(1.0, 10);
      expect(m.fpr).toBeCloseTo(0.0, 10);
      expect(m.fnr).toBeCloseTo(0.0, 10);
    });

    it('worst classifier: 0 TP, 0 TN, 100 FP, 100 FN', () => {
      const m = calculateMetrics(makeMatrix('worst', 0, 0, 100, 100));
      expect(m.accuracy).toBeCloseTo(0.0, 10);
      expect(m.precision).toBeCloseTo(0.0, 10);
      expect(m.recall).toBeCloseTo(0.0, 10);
      expect(m.f1).toBeCloseTo(0.0, 10);
      expect(m.mcc).toBeCloseTo(-1.0, 10);
      expect(m.specificity).toBeCloseTo(0.0, 10);
      expect(m.fpr).toBeCloseTo(1.0, 10);
      expect(m.fnr).toBeCloseTo(1.0, 10);
    });

    it('random classifier: 50 TP, 50 TN, 50 FP, 50 FN', () => {
      // accuracy = 100/200 = 0.5
      // precision = 50/100 = 0.5
      // recall = 50/100 = 0.5
      // F1 = 2*0.5*0.5/(0.5+0.5) = 0.5
      // MCC = (50*50 - 50*50) / sqrt(100*100*100*100) = 0
      const m = calculateMetrics(makeMatrix('random', 50, 50, 50, 50));
      expect(m.accuracy).toBeCloseTo(0.5, 10);
      expect(m.precision).toBeCloseTo(0.5, 10);
      expect(m.recall).toBeCloseTo(0.5, 10);
      expect(m.f1).toBeCloseTo(0.5, 10);
      expect(m.mcc).toBeCloseTo(0.0, 10);
      expect(m.specificity).toBeCloseTo(0.5, 10);
      expect(m.fpr).toBeCloseTo(0.5, 10);
      expect(m.fnr).toBeCloseTo(0.5, 10);
    });

    it('hand-computed: 90 TP, 85 TN, 15 FP, 10 FN', () => {
      // accuracy = 175/200 = 0.875
      // precision = 90/105 = 6/7 ≈ 0.857143
      // recall = 90/100 = 0.9
      // F1 = 2*(6/7)*0.9 / ((6/7)+0.9) = 2*0.771429 / 1.757143 ≈ 0.878049
      // specificity = 85/100 = 0.85
      // FPR = 15/100 = 0.15
      // FNR = 10/100 = 0.1
      // MCC numerator = 90*85 - 15*10 = 7650 - 150 = 7500
      // MCC denominator = sqrt(105 * 100 * 100 * 95) = sqrt(99750000) ≈ 9987.49
      // MCC ≈ 7500 / 9987.49 ≈ 0.75094
      const m = calculateMetrics(makeMatrix('hand', 90, 85, 15, 10));
      expect(m.accuracy).toBeCloseTo(0.875, 6);
      expect(m.precision).toBeCloseTo(90 / 105, 6);
      expect(m.recall).toBeCloseTo(0.9, 6);
      expect(m.f1).toBeCloseTo(2 * (90 / 105) * 0.9 / ((90 / 105) + 0.9), 6);
      expect(m.specificity).toBeCloseTo(0.85, 6);
      expect(m.fpr).toBeCloseTo(0.15, 6);
      expect(m.fnr).toBeCloseTo(0.1, 6);
      expect(m.mcc).toBeCloseTo(7500 / Math.sqrt(105 * 100 * 100 * 95), 5);
    });

    it('highly imbalanced: 5 TP, 990 TN, 5 FP, 0 FN', () => {
      // accuracy = 995/1000 = 0.995
      // precision = 5/10 = 0.5
      // recall = 5/5 = 1.0
      // F1 = 2*0.5*1.0 / 1.5 = 2/3 ≈ 0.6667
      // specificity = 990/995 ≈ 0.994975
      // FPR = 5/995 ≈ 0.005025
      // FNR = 0/5 = 0
      // MCC num = 5*990 - 5*0 = 4950
      // MCC den = sqrt(10 * 5 * 995 * 990) = sqrt(49252500) ≈ 7018.01
      // MCC ≈ 0.70534
      const m = calculateMetrics(makeMatrix('imbalanced', 5, 990, 5, 0));
      expect(m.accuracy).toBeCloseTo(0.995, 6);
      expect(m.precision).toBeCloseTo(0.5, 6);
      expect(m.recall).toBeCloseTo(1.0, 6);
      expect(m.f1).toBeCloseTo(2 / 3, 6);
      expect(m.specificity).toBeCloseTo(990 / 995, 5);
      expect(m.fpr).toBeCloseTo(5 / 995, 5);
      expect(m.fnr).toBeCloseTo(0.0, 10);
      expect(m.mcc).toBeCloseTo(4950 / Math.sqrt(10 * 5 * 995 * 990), 4);
    });

    it('inverse imbalanced: 950 TP, 5 TN, 0 FP, 45 FN', () => {
      // accuracy = 955/1000 = 0.955
      // precision = 950/950 = 1.0
      // recall = 950/995 ≈ 0.95477
      // specificity = 5/5 = 1.0
      // FPR = 0/5 = 0
      // FNR = 45/995 ≈ 0.04523
      const m = calculateMetrics(makeMatrix('inv-imb', 950, 5, 0, 45));
      expect(m.accuracy).toBeCloseTo(0.955, 6);
      expect(m.precision).toBeCloseTo(1.0, 6);
      expect(m.recall).toBeCloseTo(950 / 995, 5);
      expect(m.specificity).toBeCloseTo(1.0, 6);
      expect(m.fpr).toBeCloseTo(0.0, 10);
      expect(m.fnr).toBeCloseTo(45 / 995, 5);
    });
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  describe('Edge cases', () => {
    it('single TP sample', () => {
      const m = calculateMetrics(makeMatrix('single-tp', 1, 0, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.precision).toBeCloseTo(1.0, 10);
      expect(m.recall).toBeCloseTo(1.0, 10);
      expect(m.f1).toBeCloseTo(1.0, 10);
      // MCC: denom has (TN+FP)=0 factor → denom=0 → MCC=0
      expect(m.mcc).toBe(0);
      expect(m.specificity).toBe(0); // no negatives
      expect(m.fpr).toBe(0);
      expect(m.fnr).toBe(0);
    });

    it('single TN sample', () => {
      const m = calculateMetrics(makeMatrix('single-tn', 0, 1, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.precision).toBe(0); // no positive predictions
      expect(m.recall).toBe(0); // no actual positives
      expect(m.f1).toBe(0);
      expect(m.mcc).toBe(0); // denom=0
      expect(m.specificity).toBeCloseTo(1.0, 10);
      expect(m.fpr).toBe(0);
      expect(m.fnr).toBe(0);
    });

    it('single FP sample', () => {
      const m = calculateMetrics(makeMatrix('single-fp', 0, 0, 1, 0));
      expect(m.accuracy).toBeCloseTo(0.0, 10);
      expect(m.precision).toBeCloseTo(0.0, 10);
      expect(m.recall).toBe(0); // no actual positives
      expect(m.specificity).toBeCloseTo(0.0, 10);
      expect(m.fpr).toBeCloseTo(1.0, 10);
    });

    it('single FN sample', () => {
      const m = calculateMetrics(makeMatrix('single-fn', 0, 0, 0, 1));
      expect(m.accuracy).toBeCloseTo(0.0, 10);
      expect(m.precision).toBe(0); // no positive predictions
      expect(m.recall).toBeCloseTo(0.0, 10);
      expect(m.fnr).toBeCloseTo(1.0, 10);
    });

    it('all-TP (50 samples)', () => {
      const m = calculateMetrics(makeMatrix('all-tp', 50, 0, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.precision).toBeCloseTo(1.0, 10);
      expect(m.recall).toBeCloseTo(1.0, 10);
    });

    it('all-TN (50 samples)', () => {
      const m = calculateMetrics(makeMatrix('all-tn', 0, 50, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.specificity).toBeCloseTo(1.0, 10);
    });

    it('all-FP (50 samples)', () => {
      const m = calculateMetrics(makeMatrix('all-fp', 0, 0, 50, 0));
      expect(m.accuracy).toBeCloseTo(0.0, 10);
      expect(m.fpr).toBeCloseTo(1.0, 10);
    });

    it('all-FN (50 samples)', () => {
      const m = calculateMetrics(makeMatrix('all-fn', 0, 0, 0, 50));
      expect(m.accuracy).toBeCloseTo(0.0, 10);
      expect(m.fnr).toBeCloseTo(1.0, 10);
    });

    it('large set: 10000 TP, 10000 TN, 0 FP, 0 FN', () => {
      const m = calculateMetrics(makeMatrix('large-perfect', 10000, 10000, 0, 0));
      expect(m.accuracy).toBeCloseTo(1.0, 10);
      expect(m.mcc).toBeCloseTo(1.0, 10);
    });

    it('large imbalanced set: 100 TP, 9800 TN, 50 FP, 50 FN', () => {
      const m = calculateMetrics(makeMatrix('large-imb', 100, 9800, 50, 50));
      expect(m.accuracy).toBeCloseTo(9900 / 10000, 6);
      expect(m.precision).toBeCloseTo(100 / 150, 6);
      expect(m.recall).toBeCloseTo(100 / 150, 6);
    });
  });

  // --------------------------------------------------------------------------
  // Metric properties
  // --------------------------------------------------------------------------

  describe('Metric properties', () => {
    it('accuracy is always in [0, 1]', () => {
      const cases = [
        makeMatrix('a', 10, 10, 5, 5),
        makeMatrix('b', 0, 0, 10, 10),
        makeMatrix('c', 10, 10, 0, 0),
      ];
      for (const matrix of cases) {
        const m = calculateMetrics(matrix);
        expect(m.accuracy).toBeGreaterThanOrEqual(0);
        expect(m.accuracy).toBeLessThanOrEqual(1);
      }
    });

    it('FPR = 1 - specificity', () => {
      const matrix = makeMatrix('fpr-spec', 90, 85, 15, 10);
      const m = calculateMetrics(matrix);
      expect(m.fpr).toBeCloseTo(1 - m.specificity, 10);
    });

    it('FNR = 1 - recall', () => {
      const matrix = makeMatrix('fnr-recall', 90, 85, 15, 10);
      const m = calculateMetrics(matrix);
      expect(m.fnr).toBeCloseTo(1 - m.recall, 10);
    });

    it('MCC is in [-1, 1]', () => {
      const cases = [
        makeMatrix('a', 100, 100, 0, 0),
        makeMatrix('b', 0, 0, 100, 100),
        makeMatrix('c', 50, 50, 50, 50),
        makeMatrix('d', 1, 1, 0, 0),
        makeMatrix('e', 90, 85, 15, 10),
      ];
      for (const matrix of cases) {
        const m = calculateMetrics(matrix);
        expect(m.mcc).toBeGreaterThanOrEqual(-1);
        expect(m.mcc).toBeLessThanOrEqual(1);
      }
    });

    it('F1 is harmonic mean of precision and recall', () => {
      const matrix = makeMatrix('f1-check', 80, 70, 20, 30);
      const m = calculateMetrics(matrix);
      if (m.precision + m.recall > 0) {
        const expectedF1 = 2 * m.precision * m.recall / (m.precision + m.recall);
        expect(m.f1).toBeCloseTo(expectedF1, 10);
      }
    });

    it('includes schema_version', () => {
      const m = calculateMetrics(makeMatrix('ver', 10, 10, 0, 0));
      expect(m.schema_version).toBe(SCHEMA_VERSION);
    });

    it('preserves module_id', () => {
      const m = calculateMetrics(makeMatrix('my-module', 10, 10, 0, 0));
      expect(m.module_id).toBe('my-module');
    });
  });
});

describe('calculateAllMetrics', () => {
  it('should compute metrics for multiple modules', () => {
    const matrices = new Map<string, ConfusionMatrix>([
      ['mod-a', makeMatrix('mod-a', 50, 50, 0, 0)],
      ['mod-b', makeMatrix('mod-b', 40, 40, 10, 10)],
    ]);
    const metricsMap = calculateAllMetrics(matrices);
    expect(metricsMap.size).toBe(2);
    expect(metricsMap.get('mod-a')!.accuracy).toBeCloseTo(1.0, 10);
    expect(metricsMap.get('mod-b')!.accuracy).toBeCloseTo(0.8, 6);
  });

  it('should handle empty map', () => {
    const metricsMap = calculateAllMetrics(new Map());
    expect(metricsMap.size).toBe(0);
  });
});
