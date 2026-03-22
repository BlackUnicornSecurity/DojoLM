/**
 * KATANA Repeatability Harness Tests (K5.1)
 *
 * ISO 17025 Clause: 7.2.2 — Repeatability
 */

import { describe, it, expect } from 'vitest';
import {
  runRepeatability,
  runAllRepeatability,
  allRepeatabilityPassed,
} from '../runner/repeatability-runner.js';
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

function makeInconsistentRunFn(runs: readonly (readonly ValidationResult[])[]) {
  let callIndex = 0;
  return () => {
    const result = runs[callIndex % runs.length];
    callIndex += 1;
    return result;
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K5.1 — Repeatability Harness', () => {
  describe('runRepeatability', () => {
    it('should pass for deterministic module with identical results', async () => {
      const results = [
        makeResult({ sample_id: 's1', actual_verdict: 'malicious' }),
        makeResult({ sample_id: 's2', actual_verdict: 'clean', expected_verdict: 'clean', correct: true }),
      ];

      const result = await runRepeatability('test-module', makeConsistentRunFn(results), {
        runCount: 5,
        deterministic: true,
      });

      expect(result.verdict).toBe('PASS');
      expect(result.full_agreement).toBe(true);
      expect(result.verdict_agreement).toBe(true);
      expect(result.disagreement_count).toBe(0);
      expect(result.disagreement_samples).toEqual([]);
      expect(result.run_count).toBe(5);
      expect(result.deterministic).toBe(true);
      expect(result.schema_version).toBe(SCHEMA_VERSION);
      expect(result.module_id).toBe('test-module');
    });

    it('should fail for deterministic module with verdict disagreement', async () => {
      const run1 = [makeResult({ sample_id: 's1', actual_verdict: 'malicious' })];
      const run2 = [makeResult({ sample_id: 's1', actual_verdict: 'clean' })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.verdict).toBe('FAIL');
      expect(result.full_agreement).toBe(false);
      expect(result.verdict_agreement).toBe(false);
      expect(result.disagreement_count).toBeGreaterThan(0);
    });

    it('should fail for deterministic module with severity disagreement', async () => {
      const run1 = [makeResult({ sample_id: 's1', actual_severity: 'CRITICAL' })];
      const run2 = [makeResult({ sample_id: 's1', actual_severity: 'WARNING' })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.verdict).toBe('FAIL');
      expect(result.full_agreement).toBe(false);
      expect(result.disagreement_samples.some(d => d.field === 'actual_severity')).toBe(true);
    });

    it('should fail for deterministic module with category disagreement', async () => {
      const run1 = [makeResult({ sample_id: 's1', actual_categories: ['injection'] })];
      const run2 = [makeResult({ sample_id: 's1', actual_categories: ['xss'] })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'actual_categories')).toBe(true);
    });

    it('should fail for deterministic module with findings_count disagreement', async () => {
      const run1 = [makeResult({ sample_id: 's1', actual_findings_count: 1 })];
      const run2 = [makeResult({ sample_id: 's1', actual_findings_count: 2 })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'actual_findings_count')).toBe(true);
    });

    it('should detect missing samples across runs', async () => {
      const run1 = [
        makeResult({ sample_id: 's1' }),
        makeResult({ sample_id: 's2' }),
      ];
      const run2 = [makeResult({ sample_id: 's1' })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.verdict).toBe('FAIL');
      expect(result.disagreement_samples.some(d => d.field === 'missing')).toBe(true);
    });

    it('should pass for non-deterministic module within tolerance band', async () => {
      const correct = [
        makeResult({ sample_id: 's1', correct: true }),
        makeResult({ sample_id: 's2', correct: true }),
        makeResult({ sample_id: 's3', correct: false, actual_verdict: 'clean', expected_verdict: 'malicious' }),
      ];

      const result = await runRepeatability('nondet-module', makeConsistentRunFn(correct), {
        runCount: 3,
        deterministic: false,
        toleranceBand: { mean: 0.67, std_dev: 0.1, lower: 0.37, upper: 0.97 },
      });

      expect(result.verdict).toBe('PASS');
    });

    it('should fail for non-deterministic module outside tolerance band', async () => {
      // All results correct => accuracy = 1.0, band is [0.4, 0.6]
      const allCorrect = [
        makeResult({ sample_id: 's1', correct: true }),
        makeResult({ sample_id: 's2', correct: true }),
      ];

      const result = await runRepeatability('nondet-module', makeConsistentRunFn(allCorrect), {
        runCount: 3,
        deterministic: false,
        toleranceBand: { mean: 0.5, std_dev: 0.033, lower: 0.4, upper: 0.6 },
      });

      expect(result.verdict).toBe('FAIL');
    });

    it('should use verdict agreement for non-deterministic without tolerance band', async () => {
      const results = [makeResult({ sample_id: 's1' })];

      const result = await runRepeatability('nondet-module', makeConsistentRunFn(results), {
        runCount: 3,
        deterministic: false,
      });

      expect(result.verdict).toBe('PASS');
      expect(result.verdict_agreement).toBe(true);
    });

    it('should throw for empty moduleId', async () => {
      await expect(
        runRepeatability('', () => [], { deterministic: true }),
      ).rejects.toThrow('moduleId must be non-empty');
    });

    it('should throw for runCount < 2', async () => {
      await expect(
        runRepeatability('test', () => [], { runCount: 1, deterministic: true }),
      ).rejects.toThrow('runCount must be >= 2');
    });

    it('should use default REPEATABILITY_RUNS from config', async () => {
      const results = [makeResult({ sample_id: 's1' })];
      const result = await runRepeatability('test-module', makeConsistentRunFn(results), {
        deterministic: true,
      });

      expect(result.run_count).toBe(10); // VALIDATION_CONFIG.REPEATABILITY_RUNS
    });

    it('should handle async run functions', async () => {
      const results = [makeResult({ sample_id: 's1' })];
      const asyncRunFn = async () => results;

      const result = await runRepeatability('test-module', asyncRunFn, {
        runCount: 3,
        deterministic: true,
      });

      expect(result.verdict).toBe('PASS');
    });

    it('should deduplicate disagreements by sample_id + field', async () => {
      // 3 runs: run 0 has verdict A, runs 1 and 2 have verdict B
      const run1 = [makeResult({ sample_id: 's1', actual_verdict: 'malicious' })];
      const run2 = [makeResult({ sample_id: 's1', actual_verdict: 'clean' })];
      const run3 = [makeResult({ sample_id: 's1', actual_verdict: 'clean' })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2, run3]),
        { runCount: 3, deterministic: true },
      );

      // Should have only 1 unique disagreement for s1::actual_verdict
      const verdictDisagreements = result.disagreement_samples.filter(
        d => d.sample_id === 's1' && d.field === 'actual_verdict',
      );
      expect(verdictDisagreements.length).toBe(1);
    });

    it('should include timestamp in result', async () => {
      const result = await runRepeatability('test-module', () => [], {
        runCount: 2,
        deterministic: true,
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should sort categories before comparison', async () => {
      // Same categories in different order should match
      const run1 = [makeResult({ sample_id: 's1', actual_categories: ['b', 'a'] })];
      const run2 = [makeResult({ sample_id: 's1', actual_categories: ['a', 'b'] })];

      const result = await runRepeatability(
        'test-module',
        makeInconsistentRunFn([run1, run2]),
        { runCount: 2, deterministic: true },
      );

      expect(result.full_agreement).toBe(true);
      expect(result.verdict).toBe('PASS');
    });
  });

  describe('runAllRepeatability', () => {
    it('should run repeatability for multiple modules', async () => {
      const modules = new Map([
        ['mod-a', { runFn: makeConsistentRunFn([makeResult({ sample_id: 's1' })]), deterministic: true }],
        ['mod-b', { runFn: makeConsistentRunFn([makeResult({ sample_id: 's2' })]), deterministic: true }],
      ]);

      const results = await runAllRepeatability(modules, 3);

      expect(results.size).toBe(2);
      expect(results.get('mod-a')?.verdict).toBe('PASS');
      expect(results.get('mod-b')?.verdict).toBe('PASS');
    });
  });

  describe('allRepeatabilityPassed', () => {
    it('should return true when all pass', async () => {
      const results = new Map([
        ['mod-a', { verdict: 'PASS' as const }],
        ['mod-b', { verdict: 'PASS' as const }],
      ]);

      expect(allRepeatabilityPassed(results as any)).toBe(true);
    });

    it('should return false when any fails', async () => {
      const results = new Map([
        ['mod-a', { verdict: 'PASS' as const }],
        ['mod-b', { verdict: 'FAIL' as const }],
      ]);

      expect(allRepeatabilityPassed(results as any)).toBe(false);
    });

    it('should return false for empty map', () => {
      expect(allRepeatabilityPassed(new Map())).toBe(false);
    });
  });
});
