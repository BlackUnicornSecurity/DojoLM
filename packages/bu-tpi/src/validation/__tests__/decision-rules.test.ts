/**
 * KATANA Decision Rules Engine Tests (K3.7)
 *
 * Tests zero-defect acceptance rule per ISO 7.8.6.
 * Single FP → FAIL. Single FN → FAIL. Clean run → PASS.
 *
 * ISO 17025 Clause 7.8.6
 */

import { describe, it, expect } from 'vitest';
import {
  applyDecisionRule,
  applyAllDecisionRules,
  computeOverallVerdict,
  countTotalNonConformities,
  extractNonConformities,
} from '../runner/decision-rules.js';
import { SCHEMA_VERSION, type ConfusionMatrix, type ValidationResult } from '../types.js';

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

function makeResult(
  sampleId: string,
  moduleId: string,
  expected: 'clean' | 'malicious',
  actual: 'clean' | 'malicious',
): ValidationResult {
  return {
    schema_version: SCHEMA_VERSION,
    sample_id: sampleId,
    module_id: moduleId,
    expected_verdict: expected,
    actual_verdict: actual,
    correct: expected === actual,
    actual_severity: actual === 'malicious' ? 'CRITICAL' : null,
    actual_categories: actual === 'malicious' ? ['TEST'] : [],
    actual_findings_count: actual === 'malicious' ? 1 : 0,
    elapsed_ms: 5,
  };
}

// ---------------------------------------------------------------------------
// Extract Non-Conformities
// ---------------------------------------------------------------------------

describe('extractNonConformities', () => {
  it('returns empty for all correct results', () => {
    const results = [
      makeResult('s1', 'mod-a', 'malicious', 'malicious'),
      makeResult('s2', 'mod-a', 'clean', 'clean'),
    ];
    const nc = extractNonConformities(results, 'mod-a');
    expect(nc).toHaveLength(0);
  });

  it('detects false positive', () => {
    const results = [
      makeResult('s1', 'mod-a', 'clean', 'malicious'),
    ];
    const nc = extractNonConformities(results, 'mod-a');
    expect(nc).toHaveLength(1);
    expect(nc[0].type).toBe('false_positive');
    expect(nc[0].expected).toBe('clean');
    expect(nc[0].actual).toBe('malicious');
  });

  it('detects false negative', () => {
    const results = [
      makeResult('s1', 'mod-a', 'malicious', 'clean'),
    ];
    const nc = extractNonConformities(results, 'mod-a');
    expect(nc).toHaveLength(1);
    expect(nc[0].type).toBe('false_negative');
    expect(nc[0].expected).toBe('malicious');
    expect(nc[0].actual).toBe('clean');
  });

  it('filters by module ID', () => {
    const results = [
      makeResult('s1', 'mod-a', 'clean', 'malicious'),
      makeResult('s2', 'mod-b', 'clean', 'malicious'),
    ];
    const nc = extractNonConformities(results, 'mod-a');
    expect(nc).toHaveLength(1);
    expect(nc[0].sample_id).toBe('s1');
  });

  it('captures multiple non-conformities', () => {
    const results = [
      makeResult('s1', 'mod-a', 'clean', 'malicious'),
      makeResult('s2', 'mod-a', 'malicious', 'clean'),
      makeResult('s3', 'mod-a', 'malicious', 'malicious'),
    ];
    const nc = extractNonConformities(results, 'mod-a');
    expect(nc).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Apply Decision Rule
// ---------------------------------------------------------------------------

describe('applyDecisionRule', () => {
  it('PASS: 0 FP and 0 FN (clean run)', () => {
    const matrix = makeMatrix('mod-a', 100, 100, 0, 0);
    const results = [
      makeResult('s1', 'mod-a', 'malicious', 'malicious'),
      makeResult('s2', 'mod-a', 'clean', 'clean'),
    ];
    const decision = applyDecisionRule(matrix, results);

    expect(decision.verdict).toBe('PASS');
    expect(decision.false_positives).toBe(0);
    expect(decision.false_negatives).toBe(0);
    expect(decision.non_conformities).toHaveLength(0);
    expect(decision.total_samples).toBe(200);
    expect(decision.schema_version).toBe(SCHEMA_VERSION);
    expect(decision.module_id).toBe('mod-a');
  });

  it('FAIL: single FP triggers failure', () => {
    const matrix = makeMatrix('mod-a', 100, 99, 1, 0);
    const results = [
      makeResult('s1', 'mod-a', 'clean', 'malicious'),
    ];
    const decision = applyDecisionRule(matrix, results);

    expect(decision.verdict).toBe('FAIL');
    expect(decision.false_positives).toBe(1);
    expect(decision.false_negatives).toBe(0);
    expect(decision.non_conformities).toHaveLength(1);
    expect(decision.non_conformities[0].type).toBe('false_positive');
  });

  it('FAIL: single FN triggers failure', () => {
    const matrix = makeMatrix('mod-a', 99, 100, 0, 1);
    const results = [
      makeResult('s1', 'mod-a', 'malicious', 'clean'),
    ];
    const decision = applyDecisionRule(matrix, results);

    expect(decision.verdict).toBe('FAIL');
    expect(decision.false_positives).toBe(0);
    expect(decision.false_negatives).toBe(1);
    expect(decision.non_conformities).toHaveLength(1);
    expect(decision.non_conformities[0].type).toBe('false_negative');
  });

  it('FAIL: both FP and FN', () => {
    const matrix = makeMatrix('mod-a', 90, 85, 15, 10);
    const results = [
      makeResult('s1', 'mod-a', 'clean', 'malicious'),
      makeResult('s2', 'mod-a', 'malicious', 'clean'),
    ];
    const decision = applyDecisionRule(matrix, results);

    expect(decision.verdict).toBe('FAIL');
    expect(decision.false_positives).toBe(15);
    expect(decision.false_negatives).toBe(10);
  });

  it('includes uncertainty estimate', () => {
    const matrix = makeMatrix('mod-a', 100, 100, 0, 0);
    const decision = applyDecisionRule(matrix, []);

    expect(decision.uncertainty).toBeDefined();
    expect(decision.uncertainty!.metric).toBe('accuracy');
    expect(decision.uncertainty!.point_estimate).toBe(1.0);
    expect(decision.uncertainty!.wilson_ci_lower).toBeGreaterThan(0.95);
  });

  it('throws for empty matrix (total=0)', () => {
    const matrix = makeMatrix('mod-a', 0, 0, 0, 0);
    // Override total to satisfy the helper but test the guard
    const zeroMatrix = { ...matrix, total: 0 };
    expect(() => applyDecisionRule(zeroMatrix as any, [])).toThrow('empty matrix');
  });

  it('uncertainty is informational, not tolerance', () => {
    // Even with wide uncertainty, FP=0 + FN=0 → PASS
    const matrix = makeMatrix('mod-a', 5, 5, 0, 0);
    const decision = applyDecisionRule(matrix, []);

    expect(decision.verdict).toBe('PASS');
    // Small sample → wide CI, but doesn't affect decision
    expect(decision.uncertainty!.expanded_uncertainty).toBeGreaterThan(0.05);
  });
});

// ---------------------------------------------------------------------------
// Apply All Decision Rules
// ---------------------------------------------------------------------------

describe('applyAllDecisionRules', () => {
  it('applies rules to all modules', () => {
    const matrices = new Map<string, ConfusionMatrix>();
    matrices.set('mod-a', makeMatrix('mod-a', 100, 100, 0, 0));
    matrices.set('mod-b', makeMatrix('mod-b', 50, 50, 0, 0));

    const results: ValidationResult[] = [];
    const decisions = applyAllDecisionRules(matrices, results);

    expect(decisions.size).toBe(2);
    expect(decisions.get('mod-a')!.verdict).toBe('PASS');
    expect(decisions.get('mod-b')!.verdict).toBe('PASS');
  });

  it('mixed pass/fail across modules', () => {
    const matrices = new Map<string, ConfusionMatrix>();
    matrices.set('mod-a', makeMatrix('mod-a', 100, 100, 0, 0));
    matrices.set('mod-b', makeMatrix('mod-b', 49, 50, 1, 0));

    const results = [
      makeResult('s1', 'mod-b', 'clean', 'malicious'),
    ];
    const decisions = applyAllDecisionRules(matrices, results);

    expect(decisions.get('mod-a')!.verdict).toBe('PASS');
    expect(decisions.get('mod-b')!.verdict).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------
// Overall Verdict
// ---------------------------------------------------------------------------

describe('computeOverallVerdict', () => {
  it('PASS when all modules pass', () => {
    const decisions = new Map();
    decisions.set('mod-a', { verdict: 'PASS', non_conformities: [] });
    decisions.set('mod-b', { verdict: 'PASS', non_conformities: [] });
    expect(computeOverallVerdict(decisions)).toBe('PASS');
  });

  it('FAIL when any module fails', () => {
    const decisions = new Map();
    decisions.set('mod-a', { verdict: 'PASS', non_conformities: [] });
    decisions.set('mod-b', { verdict: 'FAIL', non_conformities: [{}] });
    expect(computeOverallVerdict(decisions)).toBe('FAIL');
  });

  it('FAIL for empty decisions map (no modules validated)', () => {
    expect(computeOverallVerdict(new Map())).toBe('FAIL');
  });
});

// ---------------------------------------------------------------------------
// Count Non-Conformities
// ---------------------------------------------------------------------------

describe('countTotalNonConformities', () => {
  it('counts across all modules', () => {
    const decisions = new Map();
    decisions.set('mod-a', { non_conformities: [{}, {}] });
    decisions.set('mod-b', { non_conformities: [{}] });
    expect(countTotalNonConformities(decisions)).toBe(3);
  });

  it('returns 0 for clean run', () => {
    const decisions = new Map();
    decisions.set('mod-a', { non_conformities: [] });
    expect(countTotalNonConformities(decisions)).toBe(0);
  });
});
