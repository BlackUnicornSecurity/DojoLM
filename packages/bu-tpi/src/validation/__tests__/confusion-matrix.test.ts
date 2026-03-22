/**
 * KATANA Confusion Matrix Tests (K3.3)
 *
 * Tests for buildConfusionMatrix and buildAllConfusionMatrices.
 */

import { describe, it, expect } from 'vitest';
import { buildConfusionMatrix, buildAllConfusionMatrices } from '../runner/confusion-matrix.js';
import { SCHEMA_VERSION, type ValidationResult } from '../types.js';

function makeResult(
  moduleId: string,
  expected: 'clean' | 'malicious',
  actual: 'clean' | 'malicious',
): ValidationResult {
  return {
    schema_version: SCHEMA_VERSION,
    sample_id: `sample-${Math.random().toString(36).slice(2, 8)}`,
    module_id: moduleId,
    expected_verdict: expected,
    actual_verdict: actual,
    correct: expected === actual,
    actual_severity: actual === 'malicious' ? 'CRITICAL' : null,
    actual_categories: [],
    actual_findings_count: actual === 'malicious' ? 1 : 0,
    elapsed_ms: 1.0,
  };
}

describe('buildConfusionMatrix', () => {
  it('should classify TP correctly (expected=malicious, actual=malicious)', () => {
    const results = [makeResult('mod-a', 'malicious', 'malicious')];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tp).toBe(1);
    expect(matrix.tn).toBe(0);
    expect(matrix.fp).toBe(0);
    expect(matrix.fn).toBe(0);
    expect(matrix.total).toBe(1);
  });

  it('should classify TN correctly (expected=clean, actual=clean)', () => {
    const results = [makeResult('mod-a', 'clean', 'clean')];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tn).toBe(1);
    expect(matrix.tp).toBe(0);
  });

  it('should classify FP correctly (expected=clean, actual=malicious)', () => {
    const results = [makeResult('mod-a', 'clean', 'malicious')];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.fp).toBe(1);
    expect(matrix.tp).toBe(0);
  });

  it('should classify FN correctly (expected=malicious, actual=clean)', () => {
    const results = [makeResult('mod-a', 'malicious', 'clean')];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.fn).toBe(1);
    expect(matrix.tp).toBe(0);
  });

  it('should count a balanced set correctly', () => {
    const results = [
      makeResult('mod-a', 'malicious', 'malicious'), // TP
      makeResult('mod-a', 'malicious', 'malicious'), // TP
      makeResult('mod-a', 'clean', 'clean'),          // TN
      makeResult('mod-a', 'clean', 'clean'),          // TN
      makeResult('mod-a', 'clean', 'clean'),          // TN
      makeResult('mod-a', 'clean', 'malicious'),      // FP
      makeResult('mod-a', 'malicious', 'clean'),      // FN
    ];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tp).toBe(2);
    expect(matrix.tn).toBe(3);
    expect(matrix.fp).toBe(1);
    expect(matrix.fn).toBe(1);
    expect(matrix.total).toBe(7);
  });

  it('should enforce tp+tn+fp+fn === total', () => {
    const results = Array.from({ length: 100 }, (_, i) => {
      const expected = i < 50 ? 'malicious' : 'clean' as const;
      const actual = i % 7 === 0 ? (expected === 'malicious' ? 'clean' : 'malicious') : expected;
      return makeResult('mod-a', expected, actual as 'clean' | 'malicious');
    });
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tp + matrix.tn + matrix.fp + matrix.fn).toBe(matrix.total);
    expect(matrix.total).toBe(100);
  });

  it('should include schema_version', () => {
    const results = [makeResult('mod-a', 'clean', 'clean')];
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.schema_version).toBe(SCHEMA_VERSION);
  });

  it('should throw on empty results', () => {
    expect(() => buildConfusionMatrix('mod-a', [])).toThrow('no results');
  });

  it('should handle all-TP case', () => {
    const results = Array.from({ length: 50 }, () => makeResult('mod-a', 'malicious', 'malicious'));
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tp).toBe(50);
    expect(matrix.tn).toBe(0);
    expect(matrix.fp).toBe(0);
    expect(matrix.fn).toBe(0);
  });

  it('should handle all-TN case', () => {
    const results = Array.from({ length: 50 }, () => makeResult('mod-a', 'clean', 'clean'));
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.tn).toBe(50);
    expect(matrix.tp).toBe(0);
  });

  it('should handle all-FP case', () => {
    const results = Array.from({ length: 50 }, () => makeResult('mod-a', 'clean', 'malicious'));
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.fp).toBe(50);
    expect(matrix.tn).toBe(0);
  });

  it('should handle all-FN case', () => {
    const results = Array.from({ length: 50 }, () => makeResult('mod-a', 'malicious', 'clean'));
    const matrix = buildConfusionMatrix('mod-a', results);
    expect(matrix.fn).toBe(50);
    expect(matrix.tp).toBe(0);
  });
});

describe('buildAllConfusionMatrices', () => {
  it('should group results by module_id', () => {
    const results = [
      makeResult('mod-a', 'malicious', 'malicious'),
      makeResult('mod-b', 'clean', 'clean'),
      makeResult('mod-a', 'clean', 'clean'),
      makeResult('mod-b', 'malicious', 'malicious'),
    ];
    const matrices = buildAllConfusionMatrices(results);
    expect(matrices.size).toBe(2);
    expect(matrices.get('mod-a')!.total).toBe(2);
    expect(matrices.get('mod-b')!.total).toBe(2);
  });

  it('should handle single module', () => {
    const results = [
      makeResult('mod-a', 'malicious', 'malicious'),
      makeResult('mod-a', 'clean', 'clean'),
    ];
    const matrices = buildAllConfusionMatrices(results);
    expect(matrices.size).toBe(1);
    expect(matrices.get('mod-a')!.tp).toBe(1);
    expect(matrices.get('mod-a')!.tn).toBe(1);
  });

  it('should handle many modules', () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult(`mod-${i}`, 'malicious', 'malicious'),
    );
    const matrices = buildAllConfusionMatrices(results);
    expect(matrices.size).toBe(10);
  });
});
