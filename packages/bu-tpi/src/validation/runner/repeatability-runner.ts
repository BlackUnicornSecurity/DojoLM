/**
 * KATANA Repeatability Harness (K5.1)
 *
 * N consecutive runs on same machine. Full result comparison
 * (verdict + severity + categories + findings_count), not just verdict.
 *
 * Deterministic modules: 100% full-result agreement required.
 * Non-deterministic: within documented tolerance bands (mean +/- 3 sigma).
 *
 * ISO 17025 Clause: 7.2.2
 */

import {
  SCHEMA_VERSION,
  type ValidationResult,
  type RepeatabilityResult,
} from '../types.js';
import { VALIDATION_CONFIG } from '../config.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepeatabilityOptions {
  /** Number of consecutive runs (default: VALIDATION_CONFIG.REPEATABILITY_RUNS) */
  readonly runCount?: number;
  /** Whether the module is deterministic */
  readonly deterministic: boolean;
  /** Tolerance band for non-deterministic modules (from K5.3) */
  readonly toleranceBand?: {
    readonly mean: number;
    readonly std_dev: number;
    readonly lower: number;
    readonly upper: number;
  };
}

export interface RunFunction {
  (): Promise<readonly ValidationResult[]> | readonly ValidationResult[];
}

// ---------------------------------------------------------------------------
// Result Comparison
// ---------------------------------------------------------------------------

/**
 * Serialize a validation result to a canonical string for comparison.
 * Compares: verdict, severity, categories (sorted), findings_count.
 */
function canonicalizeResult(result: ValidationResult): string {
  const cats = [...result.actual_categories].sort().join(',');
  return `${result.actual_verdict}|${result.actual_severity ?? 'null'}|${cats}|${result.actual_findings_count}`;
}

/**
 * Compare two sets of results for full agreement on a specific module.
 * Returns disagreement details.
 */
function compareRuns(
  runA: readonly ValidationResult[],
  runB: readonly ValidationResult[],
  runIndex: number,
): { sample_id: string; field: string; values: string[] }[] {
  const disagreements: { sample_id: string; field: string; values: string[] }[] = [];

  const mapA = new Map(runA.map(r => [r.sample_id, r]));
  const mapB = new Map(runB.map(r => [r.sample_id, r]));

  for (const [sampleId, resultA] of mapA) {
    const resultB = mapB.get(sampleId);
    if (!resultB) {
      disagreements.push({
        sample_id: sampleId,
        field: 'missing',
        values: [`present_in_run_0`, `missing_in_run_${runIndex}`],
      });
      continue;
    }

    if (resultA.actual_verdict !== resultB.actual_verdict) {
      disagreements.push({
        sample_id: sampleId,
        field: 'actual_verdict',
        values: [resultA.actual_verdict, resultB.actual_verdict],
      });
    }

    if (resultA.actual_severity !== resultB.actual_severity) {
      disagreements.push({
        sample_id: sampleId,
        field: 'actual_severity',
        values: [
          resultA.actual_severity ?? 'null',
          resultB.actual_severity ?? 'null',
        ],
      });
    }

    const catsA = [...resultA.actual_categories].sort().join(',');
    const catsB = [...resultB.actual_categories].sort().join(',');
    if (catsA !== catsB) {
      disagreements.push({
        sample_id: sampleId,
        field: 'actual_categories',
        values: [catsA, catsB],
      });
    }

    if (resultA.actual_findings_count !== resultB.actual_findings_count) {
      disagreements.push({
        sample_id: sampleId,
        field: 'actual_findings_count',
        values: [
          String(resultA.actual_findings_count),
          String(resultB.actual_findings_count),
        ],
      });
    }
  }

  // Check for samples in B not in A
  for (const sampleId of mapB.keys()) {
    if (!mapA.has(sampleId)) {
      disagreements.push({
        sample_id: sampleId,
        field: 'missing',
        values: [`missing_in_run_0`, `present_in_run_${runIndex}`],
      });
    }
  }

  return disagreements;
}

// ---------------------------------------------------------------------------
// Verdict Agreement Check
// ---------------------------------------------------------------------------

function checkVerdictAgreement(
  runs: readonly (readonly ValidationResult[])[],
): boolean {
  if (runs.length < 2) return true;
  const baseline = runs[0];
  const baselineMap = new Map(baseline.map(r => [r.sample_id, r.actual_verdict]));

  for (let i = 1; i < runs.length; i++) {
    for (const result of runs[i]) {
      const baseVerdict = baselineMap.get(result.sample_id);
      if (baseVerdict !== result.actual_verdict) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Non-Deterministic Accuracy Check
// ---------------------------------------------------------------------------

function computeAccuracy(results: readonly ValidationResult[]): number {
  if (results.length === 0) return 0;
  const correct = results.filter(r => r.correct).length;
  return correct / results.length;
}

function checkWithinTolerance(
  accuracies: readonly number[],
  toleranceBand: { readonly lower: number; readonly upper: number },
): boolean {
  return accuracies.every(
    a => a >= toleranceBand.lower && a <= toleranceBand.upper,
  );
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------

/**
 * Run repeatability study for a single module.
 *
 * @param moduleId - Module under test
 * @param runFn - Function that executes a validation run and returns results
 * @param options - Repeatability configuration
 * @returns RepeatabilityResult with full comparison evidence
 */
export async function runRepeatability(
  moduleId: string,
  runFn: RunFunction,
  options: RepeatabilityOptions,
): Promise<RepeatabilityResult> {
  if (!moduleId || moduleId.length === 0) {
    throw new Error('moduleId must be non-empty');
  }

  const runCount = options.runCount ?? VALIDATION_CONFIG.REPEATABILITY_RUNS;
  if (runCount < 2) {
    throw new Error(`runCount must be >= 2, got ${runCount}`);
  }

  const runs: (readonly ValidationResult[])[] = [];
  for (let i = 0; i < runCount; i++) {
    const results = await runFn();
    runs.push(results);
  }

  // Compare all runs against the baseline (run 0)
  const allDisagreements: { sample_id: string; field: string; values: string[] }[] = [];
  for (let i = 1; i < runs.length; i++) {
    const disagreements = compareRuns(runs[0], runs[i], i);
    allDisagreements.push(...disagreements);
  }

  // Deduplicate by sample_id + field (keep first occurrence)
  const seen = new Set<string>();
  const uniqueDisagreements = allDisagreements.filter(d => {
    const key = `${d.sample_id}::${d.field}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const fullAgreement = uniqueDisagreements.length === 0;
  const verdictAgreement = checkVerdictAgreement(runs);

  // Determine verdict
  let verdict: 'PASS' | 'FAIL';
  let toleranceBandResult: RepeatabilityResult['tolerance_band'];

  if (options.deterministic) {
    // Deterministic: 100% full-result agreement required
    verdict = fullAgreement ? 'PASS' : 'FAIL';
  } else {
    // Non-deterministic: check tolerance bands
    if (options.toleranceBand) {
      const accuracies = runs.map(computeAccuracy);
      const withinTol = checkWithinTolerance(accuracies, options.toleranceBand);
      verdict = withinTol ? 'PASS' : 'FAIL';
      toleranceBandResult = { ...options.toleranceBand };
    } else {
      // No tolerance band provided — require verdict agreement at minimum
      verdict = verdictAgreement ? 'PASS' : 'FAIL';
    }
  }

  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    run_count: runCount,
    deterministic: options.deterministic,
    full_agreement: fullAgreement,
    verdict_agreement: verdictAgreement,
    disagreement_count: uniqueDisagreements.length,
    disagreement_samples: uniqueDisagreements,
    tolerance_band: toleranceBandResult,
    verdict,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Run repeatability study for multiple modules.
 */
export async function runAllRepeatability(
  modules: ReadonlyMap<string, { runFn: RunFunction; deterministic: boolean; toleranceBand?: RepeatabilityOptions['toleranceBand'] }>,
  runCount?: number,
): Promise<Map<string, RepeatabilityResult>> {
  const results = new Map<string, RepeatabilityResult>();

  for (const [moduleId, config] of modules) {
    const result = await runRepeatability(moduleId, config.runFn, {
      runCount,
      deterministic: config.deterministic,
      toleranceBand: config.toleranceBand,
    });
    results.set(moduleId, result);
  }

  return results;
}

/**
 * Check if all repeatability results pass.
 */
export function allRepeatabilityPassed(
  results: ReadonlyMap<string, RepeatabilityResult>,
): boolean {
  if (results.size === 0) return false;
  for (const result of results.values()) {
    if (result.verdict !== 'PASS') return false;
  }
  return true;
}
