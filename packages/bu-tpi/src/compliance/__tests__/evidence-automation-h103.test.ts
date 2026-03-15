/**
 * H10.3: Evidence Automation Tests
 * Validates automated evidence collection for semi-automated BAISS controls.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import {
  verifyModelIntegrity,
  verifyLineageCompleteness,
  assessBiasAcrossDimensions,
  verifySecurityGates,
  validateSBOM,
  assessSyntheticDetection,
} from '../evidence-automation.js';
import type {
  LineageEntry,
  BiasTestResult,
  SecurityGateResult,
  SBOMEntry,
  SyntheticPrediction,
} from '../evidence-automation.js';

// ---------------------------------------------------------------------------
// BAISS-009: Model integrity verification
// ---------------------------------------------------------------------------
describe('BAISS-009: verifyModelIntegrity', () => {
  const modelContent = Buffer.from('mock-model-weights-v1');
  const correctHash = createHash('sha256').update(modelContent).digest('hex');

  it('verifies a correct hash', () => {
    const result = verifyModelIntegrity(modelContent, correctHash);
    expect(result.verified).toBe(true);
    expect(result.computedHash).toBe(correctHash);
    expect(result.algorithm).toBe('sha256');
  });

  it('detects tampered content', () => {
    const tampered = Buffer.from('tampered-model-weights');
    const result = verifyModelIntegrity(tampered, correctHash);
    expect(result.verified).toBe(false);
    expect(result.computedHash).not.toBe(correctHash);
    expect(result.algorithm).toBe('sha256');
  });

  it('detects wrong expected hash', () => {
    const result = verifyModelIntegrity(modelContent, 'deadbeef');
    expect(result.verified).toBe(false);
    expect(result.computedHash).toBe(correctHash);
  });

  it('handles empty buffer', () => {
    const empty = Buffer.alloc(0);
    const emptyHash = createHash('sha256').update(empty).digest('hex');
    const result = verifyModelIntegrity(empty, emptyHash);
    expect(result.verified).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// BAISS-012: Lineage chain completeness
// ---------------------------------------------------------------------------
describe('BAISS-012: verifyLineageCompleteness', () => {
  const validChain: LineageEntry[] = [
    { stepId: 'root', parentId: null, transformation: 'ingest', timestamp: '2025-01-01T00:00:00Z' },
    { stepId: 'step-1', parentId: 'root', transformation: 'clean', timestamp: '2025-01-01T01:00:00Z' },
    { stepId: 'step-2', parentId: 'step-1', transformation: 'train', timestamp: '2025-01-01T02:00:00Z' },
  ];

  it('marks a valid chain as complete', () => {
    const result = verifyLineageCompleteness(validChain);
    expect(result.complete).toBe(true);
    expect(result.orphanedSteps).toHaveLength(0);
    expect(result.rootCount).toBe(1);
  });

  it('detects orphaned steps with missing parent', () => {
    const broken: LineageEntry[] = [
      { stepId: 'root', parentId: null, transformation: 'ingest', timestamp: '2025-01-01T00:00:00Z' },
      { stepId: 'step-1', parentId: 'missing-parent', transformation: 'clean', timestamp: '2025-01-01T01:00:00Z' },
    ];
    const result = verifyLineageCompleteness(broken);
    expect(result.complete).toBe(false);
    expect(result.orphanedSteps).toContain('step-1');
  });

  it('detects multiple roots', () => {
    const multiRoot: LineageEntry[] = [
      { stepId: 'root-a', parentId: null, transformation: 'ingest-a', timestamp: '2025-01-01T00:00:00Z' },
      { stepId: 'root-b', parentId: null, transformation: 'ingest-b', timestamp: '2025-01-01T00:00:00Z' },
    ];
    const result = verifyLineageCompleteness(multiRoot);
    expect(result.complete).toBe(false);
    expect(result.rootCount).toBe(2);
  });

  it('detects zero roots (all orphaned)', () => {
    const noRoot: LineageEntry[] = [
      { stepId: 'step-1', parentId: 'ghost', transformation: 'clean', timestamp: '2025-01-01T00:00:00Z' },
    ];
    const result = verifyLineageCompleteness(noRoot);
    expect(result.complete).toBe(false);
    expect(result.rootCount).toBe(0);
    expect(result.orphanedSteps).toContain('step-1');
  });

  it('handles empty chain', () => {
    const result = verifyLineageCompleteness([]);
    expect(result.complete).toBe(false);
    expect(result.rootCount).toBe(0);
    expect(result.orphanedSteps).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// BAISS-029: Bias detection across demographic dimensions
// ---------------------------------------------------------------------------
describe('BAISS-029: assessBiasAcrossDimensions', () => {
  it('passes when all dimensions are below threshold', () => {
    const results: BiasTestResult[] = [
      { dimension: 'gender', score: 0.1, sampleSize: 500 },
      { dimension: 'age', score: 0.2, sampleSize: 500 },
      { dimension: 'ethnicity', score: 0.15, sampleSize: 500 },
    ];
    const assessment = assessBiasAcrossDimensions(results);
    expect(assessment.passed).toBe(true);
    expect(assessment.dimensionsAboveThreshold).toHaveLength(0);
    expect(assessment.overallBiasScore).toBe(0.15);
  });

  it('flags dimensions above 0.3 threshold', () => {
    const results: BiasTestResult[] = [
      { dimension: 'gender', score: 0.5, sampleSize: 500 },
      { dimension: 'age', score: 0.1, sampleSize: 500 },
      { dimension: 'ethnicity', score: 0.8, sampleSize: 500 },
    ];
    const assessment = assessBiasAcrossDimensions(results);
    expect(assessment.passed).toBe(false);
    expect(assessment.dimensionsAboveThreshold).toContain('gender');
    expect(assessment.dimensionsAboveThreshold).toContain('ethnicity');
    expect(assessment.dimensionsAboveThreshold).not.toContain('age');
  });

  it('handles empty input', () => {
    const assessment = assessBiasAcrossDimensions([]);
    expect(assessment.passed).toBe(true);
    expect(assessment.overallBiasScore).toBe(0);
    expect(assessment.dimensionsAboveThreshold).toHaveLength(0);
  });

  it('rounds overall score to 2 decimal places', () => {
    const results: BiasTestResult[] = [
      { dimension: 'a', score: 0.333, sampleSize: 100 },
      { dimension: 'b', score: 0.666, sampleSize: 100 },
    ];
    const assessment = assessBiasAcrossDimensions(results);
    // (0.333 + 0.666) / 2 = 0.4995 -> rounds to 0.5
    expect(assessment.overallBiasScore).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// BAISS-033: CI security gate verification
// ---------------------------------------------------------------------------
describe('BAISS-033: verifySecurityGates', () => {
  it('reports all passed when no failures', () => {
    const gates: SecurityGateResult[] = [
      { gateName: 'SAST', passed: true, findings: 0, timestamp: '2025-01-01T00:00:00Z' },
      { gateName: 'DAST', passed: true, findings: 2, timestamp: '2025-01-01T01:00:00Z' },
      { gateName: 'SCA', passed: true, findings: 0, timestamp: '2025-01-01T02:00:00Z' },
    ];
    const result = verifySecurityGates(gates);
    expect(result.allPassed).toBe(true);
    expect(result.failedGates).toHaveLength(0);
    expect(result.totalFindings).toBe(2);
  });

  it('identifies failed gates', () => {
    const gates: SecurityGateResult[] = [
      { gateName: 'SAST', passed: true, findings: 0, timestamp: '2025-01-01T00:00:00Z' },
      { gateName: 'DAST', passed: false, findings: 5, timestamp: '2025-01-01T01:00:00Z' },
      { gateName: 'SCA', passed: false, findings: 3, timestamp: '2025-01-01T02:00:00Z' },
    ];
    const result = verifySecurityGates(gates);
    expect(result.allPassed).toBe(false);
    expect(result.failedGates).toContain('DAST');
    expect(result.failedGates).toContain('SCA');
    expect(result.failedGates).not.toContain('SAST');
    expect(result.totalFindings).toBe(8);
  });

  it('handles empty gates list', () => {
    const result = verifySecurityGates([]);
    expect(result.allPassed).toBe(true);
    expect(result.failedGates).toHaveLength(0);
    expect(result.totalFindings).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BAISS-034: SBOM validation
// ---------------------------------------------------------------------------
describe('BAISS-034: validateSBOM', () => {
  it('validates a complete SBOM', () => {
    const entries: SBOMEntry[] = [
      { name: 'react', version: '18.2.0', license: 'MIT', type: 'library' },
      { name: 'tensorflow', version: '2.15.0', license: 'Apache-2.0', type: 'framework' },
      { name: 'gpt-3.5', version: '1.0', type: 'model' },
      { name: 'common-crawl', version: '2024-Q1', type: 'dataset' },
    ];
    const result = validateSBOM(entries);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.mlComponents).toBe(2);
  });

  it('catches missing version field', () => {
    const entries: SBOMEntry[] = [
      { name: 'react', version: '', type: 'library' },
    ];
    const result = validateSBOM(entries);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('Missing version for react');
  });

  it('catches missing name field', () => {
    const entries: SBOMEntry[] = [
      { name: '', version: '1.0', type: 'library' },
    ];
    const result = validateSBOM(entries);
    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain('Missing name');
  });

  it('counts model and dataset as ML components', () => {
    const entries: SBOMEntry[] = [
      { name: 'lib-a', version: '1.0', type: 'library' },
      { name: 'fw-a', version: '2.0', type: 'framework' },
      { name: 'model-a', version: '3.0', type: 'model' },
      { name: 'ds-a', version: '4.0', type: 'dataset' },
      { name: 'model-b', version: '5.0', type: 'model' },
    ];
    const result = validateSBOM(entries);
    expect(result.mlComponents).toBe(3);
  });

  it('handles empty SBOM', () => {
    const result = validateSBOM([]);
    expect(result.valid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
    expect(result.mlComponents).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BAISS-043: Synthetic content detection accuracy
// ---------------------------------------------------------------------------
describe('BAISS-043: assessSyntheticDetection', () => {
  it('computes perfect metrics for perfect predictions', () => {
    const predictions: SyntheticPrediction[] = [
      { predicted: true, actual: true },
      { predicted: true, actual: true },
      { predicted: false, actual: false },
      { predicted: false, actual: false },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(1);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1Score).toBe(1);
  });

  it('computes zero metrics for all-wrong predictions', () => {
    const predictions: SyntheticPrediction[] = [
      { predicted: true, actual: false },
      { predicted: false, actual: true },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(0);
    expect(metrics.precision).toBe(0);
    expect(metrics.recall).toBe(0);
    expect(metrics.f1Score).toBe(0);
  });

  it('computes mixed metrics correctly', () => {
    // TP=3, FP=1, TN=2, FN=1
    const predictions: SyntheticPrediction[] = [
      { predicted: true, actual: true },   // TP
      { predicted: true, actual: true },   // TP
      { predicted: true, actual: true },   // TP
      { predicted: true, actual: false },  // FP
      { predicted: false, actual: false }, // TN
      { predicted: false, actual: false }, // TN
      { predicted: false, actual: true },  // FN
    ];
    const metrics = assessSyntheticDetection(predictions);
    // accuracy = 5/7 = 0.714... -> 0.71
    expect(metrics.accuracy).toBe(0.71);
    // precision = 3/4 = 0.75
    expect(metrics.precision).toBe(0.75);
    // recall = 3/4 = 0.75
    expect(metrics.recall).toBe(0.75);
    // f1 = 2*(0.75*0.75)/(0.75+0.75) = 0.75
    expect(metrics.f1Score).toBe(0.75);
  });

  it('handles empty predictions', () => {
    const metrics = assessSyntheticDetection([]);
    expect(metrics.accuracy).toBe(0);
    expect(metrics.precision).toBe(0);
    expect(metrics.recall).toBe(0);
    expect(metrics.f1Score).toBe(0);
  });

  it('handles all-positive predictions (no negatives)', () => {
    const predictions: SyntheticPrediction[] = [
      { predicted: true, actual: true },
      { predicted: true, actual: true },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(1);
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
  });

  it('handles no true positives scenario', () => {
    const predictions: SyntheticPrediction[] = [
      { predicted: false, actual: false },
      { predicted: false, actual: false },
    ];
    const metrics = assessSyntheticDetection(predictions);
    expect(metrics.accuracy).toBe(1);
    // precision and recall are 0 (no positives at all)
    expect(metrics.precision).toBe(0);
    expect(metrics.recall).toBe(0);
    expect(metrics.f1Score).toBe(0);
  });
});
