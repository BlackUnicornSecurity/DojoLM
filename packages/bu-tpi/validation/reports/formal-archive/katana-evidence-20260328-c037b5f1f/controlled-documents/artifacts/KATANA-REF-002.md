# KATANA-REF-002 — Decision Rules Documentation

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: reference
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 7.8.6
- Source of Record: `src/validation/runner/decision-rules.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-REF-002.ts`
- Frozen Source SHA-256: `d3948eab94f81153d3bda560930b57583b859e6936160a69802c9e4fa66c5d0b`

## Description

Zero-defect acceptance rules: 0 FP + 0 FN = PASS per ISO 7.8.6.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA Decision Rules Engine (K3.7)
 *
 * ISO 17025 Clause 7.8.6: Decision rules for conformity statements.
 *
 * Implements zero-defect acceptance:
 * - PASS: 0 false positives AND 0 false negatives across entire corpus
 * - FAIL: Any FP or FN triggers investigation + fix cycle
 *
 * Uncertainty (Wilson CI) is computed and reported alongside but does NOT
 * create acceptance tolerance — the decision is binary.
 */

import {
  SCHEMA_VERSION,
  type ConfusionMatrix,
  type DecisionRuleResult,
  type UncertaintyEstimate,
  type ValidationResult,
} from '../types.js';
import { computeUncertainty } from './uncertainty-estimator.js';

// ---------------------------------------------------------------------------
// Non-Conformity Detection
// ---------------------------------------------------------------------------

interface NonConformity {
  sample_id: string;
  type: 'false_positive' | 'false_negative';
  expected: 'clean' | 'malicious';
  actual: 'clean' | 'malicious';
}

/**
 * Extract non-conformities from validation results for a specific module.
 */
export function extractNonConformities(
  results: readonly ValidationResult[],
  moduleId: string,
): NonConformity[] {
  const nonConformities: NonConformity[] = [];

  for (const result of results) {
    if (result.module_id !== moduleId) continue;
    if (result.correct) continue;

    const type = result.expected_verdict === 'clean'
      ? 'false_positive' as const
      : 'false_negative' as const;

    nonConformities.push({
      sample_id: result.sample_id,
      type,
      expected: result.expected_verdict,
      actual: result.actual_verdict,
    });
  }

  return nonConformities;
}

// ---------------------------------------------------------------------------
// Decision Rules
// ---------------------------------------------------------------------------

/**
 * Apply zero-defect decision rule to a module's validation results.
 *
 * Decision logic:
 * 1. Count FP and FN from confusion matrix
 * 2. PASS if and only if FP === 0 AND FN === 0
 * 3. List all non-conformities for investigation
 * 4. Compute accuracy uncertainty (for reporting, not tolerance)
 *
 * @param matrix - Module's confusion matrix
 * @param results - All validation results (filtered internally)
 * @returns Decision rule result with verdict and non-conformity list
 */
export function applyDecisionRule(
  matrix: ConfusionMatrix,
  results: readonly ValidationResult[],
): DecisionRuleResult {
  if (matrix.total === 0) {
    throw new Error(
      `Cannot apply decision rule to empty matrix for module '${matrix.module_id}'`,
    );
  }

  const nonConformities = extractNonConformities(results, matrix.module_id);

  // Compute accuracy uncertainty for reporting (informational, not tolerance)
  const accuracyUncertainty = computeUncertainty(
    matrix.module_id,
    'accuracy',
    matrix.tp + matrix.tn,
    matrix.total,
  ) ?? undefined;

  // Zero-defect decision: PASS if and only if 0 FP and 0 FN
  const verdict = matrix.fp === 0 && matrix.fn === 0 ? 'PASS' : 'FAIL';

  return {
    schema_version: SCHEMA_VERSION,
    module_id: matrix.module_id,
    verdict,
    total_samples: matrix.total,
    false_positives: matrix.fp,
    false_negatives: matrix.fn,
    uncertainty: accuracyUncertainty,
    non_conformities: nonConformities,
  };
}

/**
 * Apply decision rules to all modules.
 */
export function applyAllDecisionRules(
  matrices: ReadonlyMap<string, ConfusionMatrix>,
  results: readonly ValidationResult[],
): Map<string, DecisionRuleResult> {
  const decisions = new Map<string, DecisionRuleResult>();
  for (const [moduleId, matrix] of matrices) {
    decisions.set(moduleId, applyDecisionRule(matrix, results));
  }
  return decisions;
}

/**
 * Compute overall verdict across all modules.
 * PASS only if every module passes. FAIL if no modules were validated.
 */
export function computeOverallVerdict(
  decisions: ReadonlyMap<string, DecisionRuleResult>,
): 'PASS' | 'FAIL' {
  if (decisions.size === 0) return 'FAIL';
  for (const decision of decisions.values()) {
    if (decision.verdict === 'FAIL') return 'FAIL';
  }
  return 'PASS';
}

/**
 * Count total non-conformities across all modules.
 */
export function countTotalNonConformities(
  decisions: ReadonlyMap<string, DecisionRuleResult>,
): number {
  let count = 0;
  for (const decision of decisions.values()) {
    count += decision.non_conformities.length;
  }
  return count;
}

```
