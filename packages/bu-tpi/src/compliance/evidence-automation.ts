/**
 * H10.3: Evidence Automation Utilities
 * Automated evidence collection for semi-automated BAISS controls.
 *
 * BAISS-009: SHA-256 model integrity verification + tamper detection
 * BAISS-012: Lineage-engine provenance chain completeness
 * BAISS-029: Automated bias detection across demographic dimensions
 * BAISS-033: CI security gate verification + SLSA provenance
 * BAISS-034: CycloneDX SBOM validation + ML-BOM field population
 * BAISS-043: AI-generated content labeling + synthetic detection accuracy
 */

import { createHash, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------------------
// BAISS-009: Model integrity verification
// ---------------------------------------------------------------------------

export interface ModelIntegrityResult {
  readonly verified: boolean;
  readonly computedHash: string;
  readonly algorithm: 'sha256';
}

/** Verify a model blob against an expected SHA-256 hash. */
export function verifyModelIntegrity(
  modelContent: Buffer,
  expectedHash: string,
): ModelIntegrityResult {
  const computedHash = createHash('sha256').update(modelContent).digest('hex');
  let verified = false;
  try {
    verified = timingSafeEqual(
      Buffer.from(computedHash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  } catch {
    verified = false;
  }
  return {
    verified,
    computedHash,
    algorithm: 'sha256',
  };
}

// ---------------------------------------------------------------------------
// BAISS-012: Lineage chain completeness
// ---------------------------------------------------------------------------

export interface LineageEntry {
  readonly stepId: string;
  readonly parentId: string | null;
  readonly transformation: string;
  readonly timestamp: string;
}

export interface LineageCompletenessResult {
  readonly complete: boolean;
  readonly orphanedSteps: string[];
  readonly rootCount: number;
}

/** Check that every non-root entry references an existing parent and exactly one root exists. */
export function verifyLineageCompleteness(
  chain: readonly LineageEntry[],
): LineageCompletenessResult {
  const ids = new Set(chain.map((e) => e.stepId));
  const orphaned: string[] = [];
  let rootCount = 0;

  for (const entry of chain) {
    if (entry.parentId === null) {
      rootCount++;
    } else if (!ids.has(entry.parentId)) {
      orphaned.push(entry.stepId);
    }
  }

  return {
    complete: orphaned.length === 0 && rootCount === 1,
    orphanedSteps: orphaned,
    rootCount,
  };
}

// ---------------------------------------------------------------------------
// BAISS-029: Bias detection across demographic dimensions
// ---------------------------------------------------------------------------

export interface BiasTestResult {
  readonly dimension: string;
  readonly score: number; // 0-1, lower = less bias
  readonly sampleSize: number;
}

export interface BiasAssessmentResult {
  readonly overallBiasScore: number;
  readonly dimensionsAboveThreshold: string[];
  readonly passed: boolean;
}

const BIAS_THRESHOLD = 0.3;

/** Aggregate bias scores and flag dimensions exceeding the threshold. */
export function assessBiasAcrossDimensions(
  results: readonly BiasTestResult[],
): BiasAssessmentResult {
  const above = results.filter((r) => r.score > BIAS_THRESHOLD);
  const overall =
    results.length > 0
      ? results.reduce((s, r) => s + r.score, 0) / results.length
      : 0;

  return {
    overallBiasScore: Math.round(overall * 100) / 100,
    dimensionsAboveThreshold: above.map((r) => r.dimension),
    passed: above.length === 0,
  };
}

// ---------------------------------------------------------------------------
// BAISS-033: CI security gate verification
// ---------------------------------------------------------------------------

export interface SecurityGateResult {
  readonly gateName: string;
  readonly passed: boolean;
  readonly findings: number;
  readonly timestamp: string;
}

export interface SecurityGateVerification {
  readonly allPassed: boolean;
  readonly failedGates: string[];
  readonly totalFindings: number;
}

/** Verify that all CI security gates passed. */
export function verifySecurityGates(
  gates: readonly SecurityGateResult[],
): SecurityGateVerification {
  const failed = gates.filter((g) => !g.passed);
  return {
    allPassed: failed.length === 0,
    failedGates: failed.map((g) => g.gateName),
    totalFindings: gates.reduce((s, g) => s + g.findings, 0),
  };
}

// ---------------------------------------------------------------------------
// BAISS-034: SBOM validation
// ---------------------------------------------------------------------------

export interface SBOMEntry {
  readonly name: string;
  readonly version: string;
  readonly license?: string;
  readonly type: 'library' | 'framework' | 'model' | 'dataset';
}

export interface SBOMValidationResult {
  readonly valid: boolean;
  readonly missingFields: string[];
  readonly mlComponents: number;
}

/** Validate an SBOM for completeness and count ML-specific components. */
export function validateSBOM(
  entries: readonly SBOMEntry[],
): SBOMValidationResult {
  const missing: string[] = [];
  let mlCount = 0;

  for (const entry of entries) {
    if (!entry.name) missing.push('Missing name');
    if (!entry.version) missing.push(`Missing version for ${entry.name}`);
    if (entry.type === 'model' || entry.type === 'dataset') mlCount++;
  }

  return {
    valid: missing.length === 0,
    missingFields: missing,
    mlComponents: mlCount,
  };
}

// ---------------------------------------------------------------------------
// BAISS-043: Synthetic content detection accuracy
// ---------------------------------------------------------------------------

export interface SyntheticPrediction {
  readonly predicted: boolean;
  readonly actual: boolean;
}

export interface SyntheticDetectionMetrics {
  readonly accuracy: number;
  readonly precision: number;
  readonly recall: number;
  readonly f1Score: number;
}

/** Compute accuracy, precision, recall, and F1 for synthetic content detection. */
export function assessSyntheticDetection(
  predictions: readonly SyntheticPrediction[],
): SyntheticDetectionMetrics {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const p of predictions) {
    if (p.predicted && p.actual) tp++;
    else if (p.predicted && !p.actual) fp++;
    else if (!p.predicted && p.actual) fn++;
    else tn++;
  }

  const accuracy = (tp + tn) / (tp + fp + tn + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1Score =
    precision + recall > 0
      ? (2 * (precision * recall)) / (precision + recall)
      : 0;

  return {
    accuracy: Math.round(accuracy * 100) / 100,
    precision: Math.round(precision * 100) / 100,
    recall: Math.round(recall * 100) / 100,
    f1Score: Math.round(f1Score * 100) / 100,
  };
}
