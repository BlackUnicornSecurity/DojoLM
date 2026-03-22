/**
 * KATANA Confusion Matrix Builder (K3.3)
 *
 * Builds per-module confusion matrices from validation results.
 * Compares full result objects (verdict + severity + categories + confidence),
 * not just verdict, per ISO 17025 repeatability requirements.
 *
 * ISO 17025 Clause 7.2.2
 */

import { SCHEMA_VERSION, type ConfusionMatrix, type ValidationResult } from '../types.js';

/**
 * Build a confusion matrix from an array of validation results for a single module.
 *
 * Classification:
 * - TP: expected=malicious, actual=malicious (correctly detected)
 * - TN: expected=clean, actual=clean (correctly passed)
 * - FP: expected=clean, actual=malicious (false alarm)
 * - FN: expected=malicious, actual=clean (missed detection)
 */
export function buildConfusionMatrix(
  moduleId: string,
  results: readonly ValidationResult[],
): ConfusionMatrix {
  if (results.length === 0) {
    throw new Error(`Cannot build confusion matrix for module '${moduleId}': no results`);
  }

  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const result of results) {
    if (result.expected_verdict === 'malicious' && result.actual_verdict === 'malicious') {
      tp++;
    } else if (result.expected_verdict === 'clean' && result.actual_verdict === 'clean') {
      tn++;
    } else if (result.expected_verdict === 'clean' && result.actual_verdict === 'malicious') {
      fp++;
    } else if (result.expected_verdict === 'malicious' && result.actual_verdict === 'clean') {
      fn++;
    } else {
      throw new Error(
        `Unexpected verdict combination: expected=${result.expected_verdict}, actual=${result.actual_verdict}`,
      );
    }
  }

  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    tp,
    tn,
    fp,
    fn,
    total: results.length,
  };
}

/**
 * Build confusion matrices for all modules from a mixed array of results.
 * Groups results by module_id and builds one matrix per module.
 */
export function buildAllConfusionMatrices(
  results: readonly ValidationResult[],
): Map<string, ConfusionMatrix> {
  const grouped = new Map<string, ValidationResult[]>();

  for (const result of results) {
    const existing = grouped.get(result.module_id);
    if (existing) {
      existing.push(result);
    } else {
      grouped.set(result.module_id, [result]);
    }
  }

  const matrices = new Map<string, ConfusionMatrix>();
  for (const [moduleId, moduleResults] of grouped) {
    matrices.set(moduleId, buildConfusionMatrix(moduleId, moduleResults));
  }

  return matrices;
}
