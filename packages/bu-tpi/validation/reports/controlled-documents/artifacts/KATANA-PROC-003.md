# KATANA-PROC-003 — Validation Runner Procedure

Generated: 2026-03-28T13:35:50.103Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 7.2.2, 7.6, 7.8.6
- Source of Record: `src/validation/runner/validation-runner.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-003.ts`
- Frozen Source SHA-256: `c8a4196401fcccbc1e71d14c34750219e50d65debfd0d6a8c5641106e0815f03`

## Description

Core validation procedure: corpus loading, HMAC verification, sample processing, confusion matrix computation.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA Validation Runner Core (K3.6)
 *
 * Core validation harness producing ISO 17025-compliant evidence.
 *
 * Steps:
 * 1. Load corpus manifest, verify HMAC signatures and SHA-256 checksums
 * 2. Capture environment snapshot
 * 3. Run calibration check — abort if fail
 * 4. For each sample: run through appropriate abstraction level, compare against ground truth
 * 5. Checkpoint every 1000 samples for resume capability
 * 6. Compute per-module confusion matrices
 * 7. Compute metrics + uncertainty
 * 8. Apply decision rules for conformity
 * 9. Generate validation report
 * 10. Error isolation: single sample failure logged, doesn't abort run
 *
 * ISO 17025 Clauses: 7.2.2, 7.6, 7.8.6
 */

import { randomUUID } from 'node:crypto';
import {
  SCHEMA_VERSION,
  type ValidationRun,
  type ValidationResult,
  type GroundTruthSample,
  type GeneratedSample,
  type ConfusionMatrix,
  type ValidationMetrics,
  type DecisionRuleResult,
  type EnvironmentSnapshot,
} from '../types.js';
import { VALIDATION_CONFIG } from '../config.js';
import { captureEnvironmentSnapshot } from './environment-snapshot.js';
import {
  validateSample,
  toValidationSample,
  generatedToValidationSample,
  type ValidationSample,
} from './validation-abstraction.js';
import { buildConfusionMatrix } from './confusion-matrix.js';
import { calculateMetrics } from './metrics-calculator.js';
import {
  applyDecisionRule,
  computeOverallVerdict,
  countTotalNonConformities,
} from './decision-rules.js';
import {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  shouldCheckpoint,
  type CheckpointData,
} from './checkpoint-manager.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Module IDs to validate (if omitted, validates all) */
  modules?: string[];
  /** Include holdout set samples */
  includeHoldout?: boolean;
  /** Directory for checkpoint files */
  checkpointDir?: string;
  /** Resume from previous run ID */
  resumeRunId?: string;
  /** Corpus version string (e.g., git hash of corpus directory) */
  corpusVersion?: string;
  /** Progress callback */
  onProgress?: (progress: RunProgress) => void;
  /** Error callback for individual sample failures */
  onSampleError?: (sampleId: string, moduleId: string, error: Error) => void;
  /** Sample timeout in milliseconds */
  sampleTimeoutMs?: number;
}

export interface RunProgress {
  run_id: string;
  status: 'calibrating' | 'running' | 'completed' | 'failed';
  current_module: string;
  modules_completed: number;
  modules_total: number;
  samples_processed: number;
  samples_total: number;
  non_conformities: number;
  elapsed_ms: number;
}

/** Input sample that can be either ground-truth or generated */
export interface InputSample {
  type: 'ground-truth' | 'generated';
  groundTruth?: GroundTruthSample;
  generated?: GeneratedSample;
  content?: string; // For ground-truth samples (content loaded externally)
}

/** Per-module sample group for validation */
interface ModuleSampleGroup {
  moduleId: string;
  samples: ValidationSample[];
}

// ---------------------------------------------------------------------------
// Validation Runner
// ---------------------------------------------------------------------------

/**
 * Run a complete validation cycle.
 *
 * @param inputSamples - All samples to validate (ground-truth + generated)
 * @param moduleIds - List of module IDs from taxonomy
 * @param options - Run configuration
 * @returns Complete validation run with per-module metrics and decisions
 */
export async function runValidation(
  inputSamples: readonly InputSample[],
  moduleIds: readonly string[],
  options: RunOptions = {},
): Promise<ValidationRun> {
  const runId = options.resumeRunId ?? randomUUID();
  const startTime = performance.now();
  const startDate = new Date();
  const environment = captureEnvironmentSnapshot();
  const sampleTimeout = options.sampleTimeoutMs ?? VALIDATION_CONFIG.SAMPLE_TIMEOUT_MS;

  // Filter modules if specified
  const targetModules = options.modules
    ? moduleIds.filter(m => options.modules!.includes(m))
    : [...moduleIds];

  // Convert input samples to validation samples
  const validationSamples = convertInputSamples(inputSamples);

  // Group samples by module
  const moduleGroups = groupSamplesByModule(validationSamples, targetModules);

  // Calculate total sample count (samples × modules they belong to)
  const totalSamples = moduleGroups.reduce((sum, g) => sum + g.samples.length, 0);

  // Check for checkpoint to resume from
  let results: ValidationResult[] = [];
  let completedModules: string[] = [];
  let samplesProcessed = 0;

  if (options.resumeRunId && options.checkpointDir) {
    const checkpoint = loadCheckpoint(options.checkpointDir, options.resumeRunId);
    if (checkpoint) {
      results = checkpoint.results;
      completedModules = checkpoint.completed_modules;
      samplesProcessed = checkpoint.samples_processed;
    }
  }

  // Report progress
  const reportProgress = (
    status: RunProgress['status'],
    currentModule: string,
  ): void => {
    options.onProgress?.({
      run_id: runId,
      status,
      current_module: currentModule,
      modules_completed: completedModules.length,
      modules_total: targetModules.length,
      samples_processed: samplesProcessed,
      samples_total: totalSamples,
      non_conformities: results.filter(r => !r.correct).length,
      elapsed_ms: performance.now() - startTime,
    });
  };

  // Process each module
  for (const group of moduleGroups) {
    // Skip already-completed modules (from checkpoint)
    if (completedModules.includes(group.moduleId)) {
      continue;
    }

    reportProgress('running', group.moduleId);

    // Process samples for this module
    for (const sample of group.samples) {
      try {
        const result = await runWithTimeout(
          validateSample(sample, group.moduleId),
          sampleTimeout,
        );
        results = [...results, result];
      } catch (error: unknown) {
        // Error isolation: log and continue, don't abort run
        const err = error instanceof Error ? error : new Error(String(error));
        options.onSampleError?.(sample.id, group.moduleId, err);

        // Record as incorrect result for traceability
        results = [...results, {
          schema_version: SCHEMA_VERSION,
          sample_id: sample.id,
          module_id: group.moduleId,
          expected_verdict: sample.expected_verdict,
          actual_verdict: sample.expected_verdict === 'clean' ? 'malicious' : 'clean',
          correct: false,
          actual_severity: null,
          actual_categories: [],
          actual_findings_count: 0,
          elapsed_ms: 0,
        }];
      }

      samplesProcessed++;

      // Checkpoint periodically
      if (options.checkpointDir && shouldCheckpoint(samplesProcessed)) {
        saveCheckpoint(options.checkpointDir, {
          run_id: runId,
          timestamp: new Date().toISOString(),
          samples_processed: samplesProcessed,
          total_samples: totalSamples,
          current_module: group.moduleId,
          results,
          completed_modules: completedModules,
          elapsed_ms: performance.now() - startTime,
        });
      }
    }

    completedModules = [...completedModules, group.moduleId];
    reportProgress('running', group.moduleId);
  }

  // Compute per-module confusion matrices
  const perModuleMatrices: Record<string, ConfusionMatrix> = {};
  const perModuleMetrics: Record<string, ValidationMetrics> = {};
  const perModuleDecisions: Record<string, DecisionRuleResult> = {};

  for (const moduleId of targetModules) {
    const moduleResults = results.filter(r => r.module_id === moduleId);
    if (moduleResults.length === 0) continue;

    const matrix = buildConfusionMatrix(moduleId, moduleResults);
    perModuleMatrices[moduleId] = matrix;
    perModuleMetrics[moduleId] = calculateMetrics(matrix);
    perModuleDecisions[moduleId] = applyDecisionRule(matrix, moduleResults);
  }

  // Compute overall verdict
  const decisionsMap = new Map(Object.entries(perModuleDecisions));
  const overallVerdict = computeOverallVerdict(decisionsMap);
  const nonConformityCount = countTotalNonConformities(decisionsMap);

  const elapsed = performance.now() - startTime;

  // Clean up checkpoint only when all samples were processed
  if (options.checkpointDir && samplesProcessed >= totalSamples) {
    deleteCheckpoint(options.checkpointDir, runId);
  }

  reportProgress('completed', '');

  const run: ValidationRun = {
    schema_version: SCHEMA_VERSION,
    run_id: runId,
    status: 'completed',
    started_at: startDate.toISOString(),
    completed_at: new Date().toISOString(),
    environment,
    modules_validated: targetModules,
    corpus_version: options.corpusVersion ?? 'unknown',
    include_holdout: options.includeHoldout ?? false,
    total_samples: totalSamples,
    samples_processed: samplesProcessed,
    results,
    per_module_matrices: perModuleMatrices,
    per_module_metrics: perModuleMetrics,
    per_module_decisions: perModuleDecisions,
    non_conformity_count: nonConformityCount,
    overall_verdict: overallVerdict,
    elapsed_ms: elapsed,
  };

  return run;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert input samples to validation samples.
 */
function convertInputSamples(
  inputs: readonly InputSample[],
): ValidationSample[] {
  return inputs.map(input => {
    if (input.type === 'ground-truth' && input.groundTruth) {
      return toValidationSample(input.groundTruth, input.content ?? '');
    }
    if (input.type === 'generated' && input.generated) {
      return generatedToValidationSample(input.generated);
    }
    throw new Error(`Invalid input sample: type=${input.type}`);
  });
}

/**
 * Group validation samples by module.
 * Each sample is assigned to modules listed in its expected_modules field.
 * Clean samples (no expected_modules) are assigned to all modules.
 */
function groupSamplesByModule(
  samples: readonly ValidationSample[],
  moduleIds: readonly string[],
): ModuleSampleGroup[] {
  const groups = new Map<string, ValidationSample[]>();

  for (const moduleId of moduleIds) {
    groups.set(moduleId, []);
  }

  for (const sample of samples) {
    if (sample.expected_verdict === 'clean') {
      // Clean samples tested against all modules (should not trigger any)
      for (const moduleId of moduleIds) {
        groups.get(moduleId)?.push(sample);
      }
    } else {
      // Malicious samples tested against their expected modules
      for (const moduleId of sample.expected_modules) {
        if (groups.has(moduleId)) {
          groups.get(moduleId)!.push(sample);
        }
      }
    }
  }

  return [...groups.entries()].map(([moduleId, moduleSamples]) => ({
    moduleId,
    samples: moduleSamples,
  }));
}

/**
 * Run an async operation with a timeout.
 *
 * Note: If the underlying promise never settles, it will leak in memory
 * after the timeout fires. The current scanner is synchronous so this
 * cannot happen today. If async scanners are added, thread an AbortSignal.
 */
function runWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Sample validation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise.then(
      result => {
        clearTimeout(timer);
        resolve(result);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

```
