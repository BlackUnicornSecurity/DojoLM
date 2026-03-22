/**
 * KATANA Metrics Calculator (K3.3)
 *
 * Computes validation metrics from confusion matrices:
 * accuracy, precision, recall, F1, MCC, specificity, FPR, FNR.
 *
 * ISO 17025 Clause 7.2.2
 */

import { SCHEMA_VERSION, type ConfusionMatrix, type ValidationMetrics } from '../types.js';

/**
 * Calculate all validation metrics from a confusion matrix.
 *
 * Handles edge cases:
 * - Division by zero returns 0 for rates (no samples → no rate)
 * - MCC returns 0 when denominator is 0 (undefined case)
 * - All metrics clamped to valid ranges
 */
export function calculateMetrics(matrix: ConfusionMatrix): ValidationMetrics {
  const { tp, tn, fp, fn, module_id } = matrix;
  const total = tp + tn + fp + fn;

  // Accuracy = (TP + TN) / total
  const accuracy = total > 0 ? (tp + tn) / total : 0;

  // Precision = TP / (TP + FP) — of predicted positives, how many correct
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0;

  // Recall (sensitivity) = TP / (TP + FN) — of actual positives, how many detected
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0;

  // F1 = 2 * precision * recall / (precision + recall)
  const f1 = (precision + recall) > 0
    ? (2 * precision * recall) / (precision + recall)
    : 0;

  // MCC = (TP*TN - FP*FN) / sqrt((TP+FP)(TP+FN)(TN+FP)(TN+FN))
  // Returns 0 if denominator is 0 (undefined case)
  const mcc = computeMCC(tp, tn, fp, fn);

  // Specificity = TN / (TN + FP) — of actual negatives, how many correctly identified
  const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0;

  // False Positive Rate = FP / (FP + TN) = 1 - specificity
  const fpr = (fp + tn) > 0 ? fp / (fp + tn) : 0;

  // False Negative Rate = FN / (FN + TP) = 1 - recall
  const fnr = (fn + tp) > 0 ? fn / (fn + tp) : 0;

  return {
    schema_version: SCHEMA_VERSION,
    module_id,
    accuracy,
    precision,
    recall,
    f1,
    mcc,
    specificity,
    fpr,
    fnr,
  };
}

/**
 * Matthews Correlation Coefficient.
 * Balanced measure even for imbalanced datasets.
 * Range: [-1, +1] where +1 is perfect, 0 is random, -1 is inverse.
 */
function computeMCC(tp: number, tn: number, fp: number, fn: number): number {
  const numerator = (tp * tn) - (fp * fn);
  const denominator = Math.sqrt(
    (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn),
  );

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

/**
 * Calculate metrics for multiple confusion matrices.
 */
export function calculateAllMetrics(
  matrices: ReadonlyMap<string, ConfusionMatrix>,
): Map<string, ValidationMetrics> {
  const metricsMap = new Map<string, ValidationMetrics>();
  for (const [moduleId, matrix] of matrices) {
    metricsMap.set(moduleId, calculateMetrics(matrix));
  }
  return metricsMap;
}
