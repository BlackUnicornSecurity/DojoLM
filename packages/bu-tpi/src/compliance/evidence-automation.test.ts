/**
 * Tests for evidence-automation
 */

import { describe, it, expect } from 'vitest';
import {
  verifyModelIntegrity,
  verifyLineageCompleteness,
  assessBiasAcrossDimensions,
  verifySecurityGates,
  validateSBOM,
  assessSyntheticDetection,
} from './evidence-automation.js';

describe('verifyModelIntegrity', () => {
  it('verifies matching hash', () => {
    const content = Buffer.from('model-data');
    const { createHash } = require('node:crypto');
    const expectedHash = createHash('sha256').update(content).digest('hex');
    const result = verifyModelIntegrity(content, expectedHash);
    expect(result.verified).toBe(true);
    expect(result.algorithm).toBe('sha256');
  });

  it('rejects mismatched hash', () => {
    const content = Buffer.from('model-data');
    const result = verifyModelIntegrity(content, 'a'.repeat(64));
    expect(result.verified).toBe(false);
  });

  it('handles invalid hash gracefully', () => {
    const content = Buffer.from('data');
    const result = verifyModelIntegrity(content, 'not-a-valid-hex');
    expect(result.verified).toBe(false);
  });
});

describe('verifyLineageCompleteness', () => {
  it('returns complete for a single-root valid chain', () => {
    const chain = [
      { stepId: 'root', parentId: null, transformation: 'init', timestamp: '2026-01-01' },
      { stepId: 'step-2', parentId: 'root', transformation: 'transform', timestamp: '2026-01-02' },
    ];
    const result = verifyLineageCompleteness(chain);
    expect(result.complete).toBe(true);
    expect(result.orphanedSteps).toEqual([]);
    expect(result.rootCount).toBe(1);
  });

  it('detects orphaned steps', () => {
    const chain = [
      { stepId: 'root', parentId: null, transformation: 'init', timestamp: '2026-01-01' },
      { stepId: 'orphan', parentId: 'missing', transformation: 'x', timestamp: '2026-01-02' },
    ];
    const result = verifyLineageCompleteness(chain);
    expect(result.complete).toBe(false);
    expect(result.orphanedSteps).toContain('orphan');
  });

  it('detects multiple roots', () => {
    const chain = [
      { stepId: 'root1', parentId: null, transformation: 'init', timestamp: '2026-01-01' },
      { stepId: 'root2', parentId: null, transformation: 'init', timestamp: '2026-01-01' },
    ];
    const result = verifyLineageCompleteness(chain);
    expect(result.complete).toBe(false);
    expect(result.rootCount).toBe(2);
  });
});

describe('assessBiasAcrossDimensions', () => {
  it('passes when all scores are below threshold', () => {
    const results = [
      { dimension: 'gender', score: 0.1, sampleSize: 100 },
      { dimension: 'age', score: 0.2, sampleSize: 100 },
    ];
    const assessment = assessBiasAcrossDimensions(results);
    expect(assessment.passed).toBe(true);
    expect(assessment.dimensionsAboveThreshold).toHaveLength(0);
  });

  it('fails when a dimension exceeds threshold', () => {
    const results = [
      { dimension: 'gender', score: 0.5, sampleSize: 100 },
    ];
    const assessment = assessBiasAcrossDimensions(results);
    expect(assessment.passed).toBe(false);
    expect(assessment.dimensionsAboveThreshold).toContain('gender');
  });

  it('handles empty results', () => {
    const assessment = assessBiasAcrossDimensions([]);
    expect(assessment.passed).toBe(true);
    expect(assessment.overallBiasScore).toBe(0);
  });
});

describe('verifySecurityGates', () => {
  it('returns allPassed when all gates pass', () => {
    const gates = [
      { gateName: 'sast', passed: true, findings: 0, timestamp: '2026-01-01' },
      { gateName: 'dast', passed: true, findings: 2, timestamp: '2026-01-01' },
    ];
    const result = verifySecurityGates(gates);
    expect(result.allPassed).toBe(true);
    expect(result.failedGates).toEqual([]);
    expect(result.totalFindings).toBe(2);
  });

  it('reports failed gates', () => {
    const gates = [
      { gateName: 'sast', passed: false, findings: 5, timestamp: '2026-01-01' },
    ];
    const result = verifySecurityGates(gates);
    expect(result.allPassed).toBe(false);
    expect(result.failedGates).toContain('sast');
  });
});

describe('validateSBOM', () => {
  it('validates complete entries', () => {
    const entries = [
      { name: 'lib-a', version: '1.0.0', type: 'library' as const },
      { name: 'model-x', version: '2.0.0', type: 'model' as const },
    ];
    const result = validateSBOM(entries);
    expect(result.valid).toBe(true);
    expect(result.mlComponents).toBe(1);
  });

  it('detects missing fields', () => {
    const entries = [
      { name: '', version: '1.0.0', type: 'library' as const },
    ];
    const result = validateSBOM(entries);
    expect(result.valid).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });
});

describe('assessSyntheticDetection', () => {
  it('returns perfect scores for all correct predictions', () => {
    const predictions = [
      { predicted: true, actual: true },
      { predicted: false, actual: false },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(1);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1Score).toBe(1);
  });

  it('returns zero scores for all wrong predictions', () => {
    const predictions = [
      { predicted: true, actual: false },
      { predicted: false, actual: true },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(0);
    expect(metrics.precision).toBe(0);
    expect(metrics.recall).toBe(0);
  });
});
