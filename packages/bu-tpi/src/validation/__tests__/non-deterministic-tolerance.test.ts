/**
 * KATANA Non-Deterministic Module Tolerance Tests (K5.3)
 *
 * ISO 17025 Clause: 7.2.2 — Tolerance bands for non-deterministic modules
 */

import { describe, it, expect } from 'vitest';
import {
  runToleranceStudy,
  runAllToleranceStudies,
  extractRepeatabilityToleranceBand,
} from '../runner/non-deterministic-tolerance.js';
import { SCHEMA_VERSION, type ValidationResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    schema_version: SCHEMA_VERSION,
    sample_id: 'sample-001',
    module_id: 'test-module',
    expected_verdict: 'malicious',
    actual_verdict: 'malicious',
    correct: true,
    actual_severity: 'CRITICAL',
    actual_categories: ['injection'],
    actual_findings_count: 1,
    elapsed_ms: 10,
    ...overrides,
  };
}

function makeConsistentRunFn(results: readonly ValidationResult[]) {
  return () => results;
}

function makeVaryingRunFn(
  baseResults: readonly ValidationResult[],
  flipProbability: number,
) {
  let callCount = 0;
  return () => {
    callCount += 1;
    // Deterministically vary results based on call count
    return baseResults.map((r, i) => {
      if ((callCount + i) % Math.round(1 / flipProbability) === 0) {
        return {
          ...r,
          actual_verdict: r.actual_verdict === 'malicious' ? 'clean' as const : 'malicious' as const,
          correct: !r.correct,
        };
      }
      return r;
    });
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K5.3 — Non-Deterministic Module Tolerance', () => {
  describe('runToleranceStudy', () => {
    it('should compute tolerance bands for consistent results', async () => {
      const results = [
        makeResult({ sample_id: 's1', correct: true }),
        makeResult({ sample_id: 's2', correct: true }),
        makeResult({ sample_id: 's3', correct: true }),
      ];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 5,
        sigma: 3,
        metrics: ['accuracy'],
      });

      expect(study.module_id).toBe('test-module');
      expect(study.run_count).toBe(5);
      expect(study.sigma).toBe(3);
      expect(study.bands.length).toBe(1);

      const accuracyBand = study.bands[0];
      expect(accuracyBand.metric).toBe('accuracy');
      expect(accuracyBand.mean).toBeCloseTo(1.0, 5);
      expect(accuracyBand.std_dev).toBeCloseTo(0, 5);
      expect(accuracyBand.min).toBeCloseTo(1.0, 5);
      expect(accuracyBand.max).toBeCloseTo(1.0, 5);
      expect(accuracyBand.within_tolerance).toBe(true);
      expect(accuracyBand.schema_version).toBe(SCHEMA_VERSION);
    });

    it('should compute multiple metrics', async () => {
      const results = [
        makeResult({ sample_id: 's1', correct: true, expected_verdict: 'malicious', actual_verdict: 'malicious' }),
        makeResult({ sample_id: 's2', correct: true, expected_verdict: 'clean', actual_verdict: 'clean' }),
      ];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 3,
        metrics: ['accuracy', 'precision', 'recall', 'f1'],
      });

      expect(study.bands.length).toBe(4);
      const metricNames = study.bands.map(b => b.metric);
      expect(metricNames).toContain('accuracy');
      expect(metricNames).toContain('precision');
      expect(metricNames).toContain('recall');
      expect(metricNames).toContain('f1');
    });

    it('should use default metrics when not specified', async () => {
      const results = [makeResult({ sample_id: 's1', correct: true })];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 3,
      });

      expect(study.bands.length).toBe(4); // accuracy, precision, recall, f1
    });

    it('should detect when results vary outside tolerance', async () => {
      // Create a run fn that alternates accuracy between 100% and 0%
      let callCount = 0;
      const runFn = () => {
        callCount += 1;
        if (callCount % 2 === 0) {
          return [makeResult({ sample_id: 's1', correct: false, actual_verdict: 'clean', expected_verdict: 'malicious' })];
        }
        return [makeResult({ sample_id: 's1', correct: true })];
      };

      const study = await runToleranceStudy('test-module', runFn, {
        runCount: 4,
        sigma: 3,
        metrics: ['accuracy'],
      });

      const accuracyBand = study.bands[0];
      expect(accuracyBand.mean).toBeCloseTo(0.5, 1);
      expect(accuracyBand.std_dev).toBeGreaterThan(0);
      expect(accuracyBand.min).toBe(0);
      expect(accuracyBand.max).toBe(1);
    });

    it('should set within_tolerance to true for values within mean+/-3sigma', async () => {
      const results = [
        makeResult({ sample_id: 's1', correct: true }),
        makeResult({ sample_id: 's2', correct: true }),
      ];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 5,
        sigma: 3,
        metrics: ['accuracy'],
      });

      expect(study.bands[0].within_tolerance).toBe(true);
      expect(study.all_within_tolerance).toBe(true);
    });

    it('should use sample standard deviation (n-1 denominator)', async () => {
      // Two runs with accuracy 0 and 1 → sample std_dev = sqrt(0.5) ≈ 0.7071
      let callCount = 0;
      const runFn = () => {
        callCount += 1;
        if (callCount === 1) {
          return [makeResult({ sample_id: 's1', correct: true })];
        }
        return [makeResult({ sample_id: 's1', correct: false, actual_verdict: 'clean', expected_verdict: 'malicious' })];
      };

      const study = await runToleranceStudy('test-module', runFn, {
        runCount: 2,
        sigma: 3,
        metrics: ['accuracy'],
      });

      const band = study.bands[0];
      expect(band.mean).toBeCloseTo(0.5, 5);
      // Sample std dev with n-1: sqrt(((1-0.5)^2 + (0-0.5)^2) / (2-1)) = sqrt(0.5) ≈ 0.7071
      expect(band.std_dev).toBeCloseTo(Math.sqrt(0.5), 4);
    });

    it('should throw for empty moduleId', async () => {
      await expect(
        runToleranceStudy('', () => [], { runCount: 3 }),
      ).rejects.toThrow('moduleId must be non-empty');
    });

    it('should throw for runCount < 2', async () => {
      await expect(
        runToleranceStudy('test', () => [], { runCount: 1 }),
      ).rejects.toThrow('runCount must be >= 2');
    });

    it('should throw for sigma <= 0', async () => {
      await expect(
        runToleranceStudy('test', () => [], { runCount: 3, sigma: 0 }),
      ).rejects.toThrow('sigma must be > 0');
    });

    it('should throw for unknown metric', async () => {
      await expect(
        runToleranceStudy('test', () => [makeResult()], {
          runCount: 3,
          metrics: ['unknown_metric'],
        }),
      ).rejects.toThrow('Unknown metric: unknown_metric');
    });

    it('should use default runCount from config', async () => {
      const results = [makeResult({ sample_id: 's1', correct: true })];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results));

      expect(study.run_count).toBe(30); // VALIDATION_CONFIG.NON_DET_REPEATABILITY_RUNS
    });

    it('should include timestamp', async () => {
      const study = await runToleranceStudy('test-module', () => [], {
        runCount: 2,
        metrics: ['accuracy'],
      });

      expect(study.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should compute tolerance bands with lower and upper bounds', async () => {
      const results = [makeResult({ sample_id: 's1', correct: true })];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 5,
        sigma: 3,
        metrics: ['accuracy'],
      });

      const band = study.bands[0];
      expect(band.lower_bound).toBeLessThanOrEqual(band.mean);
      expect(band.upper_bound).toBeGreaterThanOrEqual(band.mean);
      expect(band.upper_bound - band.lower_bound).toBeCloseTo(2 * band.sigma * band.std_dev, 10);
    });

    it('should handle empty results', async () => {
      const study = await runToleranceStudy('test-module', () => [], {
        runCount: 3,
        metrics: ['accuracy'],
      });

      const band = study.bands[0];
      expect(band.mean).toBe(0);
      expect(band.std_dev).toBe(0);
    });
  });

  describe('runAllToleranceStudies', () => {
    it('should run studies for multiple modules', async () => {
      const modules = new Map([
        ['mod-a', makeConsistentRunFn([makeResult({ sample_id: 's1', correct: true })])],
        ['mod-b', makeConsistentRunFn([makeResult({ sample_id: 's2', correct: true })])],
      ]);

      const results = await runAllToleranceStudies(modules, { runCount: 3, metrics: ['accuracy'] });

      expect(results.size).toBe(2);
      expect(results.has('mod-a')).toBe(true);
      expect(results.has('mod-b')).toBe(true);
    });
  });

  describe('extractRepeatabilityToleranceBand', () => {
    it('should extract accuracy tolerance band for repeatability runner', async () => {
      const results = [makeResult({ sample_id: 's1', correct: true })];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 5,
        sigma: 3,
        metrics: ['accuracy'],
      });

      const band = extractRepeatabilityToleranceBand(study);

      expect(band).toBeDefined();
      expect(band!.mean).toBeCloseTo(1.0, 5);
      expect(band!.lower).toBeLessThanOrEqual(band!.mean);
      expect(band!.upper).toBeGreaterThanOrEqual(band!.mean);
    });

    it('should return undefined when no accuracy band exists', async () => {
      const results = [makeResult({ sample_id: 's1', correct: true })];

      const study = await runToleranceStudy('test-module', makeConsistentRunFn(results), {
        runCount: 3,
        metrics: ['precision'],
      });

      const band = extractRepeatabilityToleranceBand(study);
      expect(band).toBeUndefined();
    });
  });
});
