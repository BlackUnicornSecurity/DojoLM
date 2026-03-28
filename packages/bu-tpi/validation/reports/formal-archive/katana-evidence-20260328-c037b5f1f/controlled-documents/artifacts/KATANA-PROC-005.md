# KATANA-PROC-005 — CAPA Workflow

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 8.7
- Source of Record: `src/validation/investigation/capa-integration.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-005.ts`
- Frozen Source SHA-256: `e854863099e9923ba8372bc18699f9730e206362f46df3bed8e55847dc6e7fea`

## Description

Corrective and preventive action procedure with status machine workflow.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA CAPA Integration (K9.3)
 *
 * Corrective Action / Preventive Action system per ISO 8.7.
 *
 * CAPA Triggers:
 * - Module fails validation (any metric below threshold)
 * - Regression detected in CI (> 0.5% drop)
 * - Investigation identifies systematic root cause
 * - Calibration failure
 *
 * CAPA Workflow:
 * a. Auto-open CAPA record with trigger context
 * b. Root cause analysis template
 * c. Corrective action plan
 * d. Implementation
 * e. Re-validation of affected module
 * f. Effectiveness review at 30 days
 *
 * CAPA closure requires:
 * - Root cause documented
 * - Action implemented
 * - Re-validation passed
 *
 * ISO 17025 Clause: 8.7
 */

import {
  SCHEMA_VERSION,
  type CAPARecord,
  CAPATriggerType,
  CAPAStatus,
  type DecisionRuleResult,
  type CalibrationCertificate,
  type InvestigationRecord,
  type ValidationMetrics,
} from '../types.js';
import { INVESTIGATION_CONFIG } from '../config.js';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CAPATriggerContext {
  readonly module_id?: string;
  readonly run_id?: string;
  readonly investigation_ids?: readonly string[];
  readonly description: string;
}

export interface CAPAStore {
  readonly records: readonly CAPARecord[];
  readonly open_count: number;
  readonly closed_count: number;
  readonly by_trigger: ReadonlyMap<string, number>;
}

// ---------------------------------------------------------------------------
// CAPA Record Management
// ---------------------------------------------------------------------------

/**
 * Open a new CAPA record with trigger context.
 */
export function openCAPA(
  triggerType: (typeof CAPATriggerType)[keyof typeof CAPATriggerType],
  context: CAPATriggerContext,
): CAPARecord {
  if (!context.description || context.description.length === 0) {
    throw new Error('CAPA trigger context description must be non-empty');
  }

  return {
    schema_version: SCHEMA_VERSION,
    capa_id: `capa-${crypto.randomUUID()}`,
    trigger_type: triggerType,
    trigger_context: {
      module_id: context.module_id,
      run_id: context.run_id,
      investigation_ids: context.investigation_ids ? [...context.investigation_ids] : undefined,
      description: context.description,
    },
    status: CAPAStatus.OPEN,
    opened_at: new Date().toISOString(),
  };
}

/**
 * Update CAPA status (immutable — returns new record).
 */
export function updateCAPAStatus(
  record: CAPARecord,
  status: (typeof CAPAStatus)[keyof typeof CAPAStatus],
): CAPARecord {
  // Validate status transitions
  const validTransitions: Record<string, readonly string[]> = {
    [CAPAStatus.OPEN]: [CAPAStatus.ROOT_CAUSE_ANALYSIS],
    [CAPAStatus.ROOT_CAUSE_ANALYSIS]: [CAPAStatus.ACTION_PLANNED],
    [CAPAStatus.ACTION_PLANNED]: [CAPAStatus.IMPLEMENTING],
    [CAPAStatus.IMPLEMENTING]: [CAPAStatus.REVALIDATING],
    [CAPAStatus.REVALIDATING]: [CAPAStatus.EFFECTIVENESS_REVIEW, CAPAStatus.IMPLEMENTING],
    [CAPAStatus.EFFECTIVENESS_REVIEW]: [CAPAStatus.CLOSED],
  };

  const allowed = validTransitions[record.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(
      `Invalid CAPA status transition: ${record.status} → ${status}`,
    );
  }

  return {
    ...record,
    status,
    closed_at: status === CAPAStatus.CLOSED ? new Date().toISOString() : record.closed_at,
  };
}

/**
 * Add root cause analysis to a CAPA record.
 */
export function addRootCauseAnalysis(
  record: CAPARecord,
  analysis: string,
): CAPARecord {
  if (!analysis || analysis.length === 0) {
    throw new Error('Root cause analysis must be non-empty');
  }
  if (record.status !== CAPAStatus.OPEN) {
    throw new Error(
      `Cannot add root cause analysis: CAPA must be in OPEN status, got ${record.status}`,
    );
  }

  return {
    ...record,
    root_cause_analysis: analysis,
    status: CAPAStatus.ROOT_CAUSE_ANALYSIS,
  };
}

/**
 * Add corrective action plan to a CAPA record.
 */
export function addCorrectiveActionPlan(
  record: CAPARecord,
  plan: string,
): CAPARecord {
  if (!plan || plan.length === 0) {
    throw new Error('Corrective action plan must be non-empty');
  }
  if (record.status !== CAPAStatus.ROOT_CAUSE_ANALYSIS) {
    throw new Error(
      `Cannot add corrective action plan: CAPA must be in ROOT_CAUSE_ANALYSIS status, got ${record.status}`,
    );
  }

  return {
    ...record,
    corrective_action_plan: plan,
    status: CAPAStatus.ACTION_PLANNED,
  };
}

/**
 * Record implementation details.
 */
export function recordImplementation(
  record: CAPARecord,
  notes: string,
): CAPARecord {
  if (!notes || notes.length === 0) {
    throw new Error('Implementation notes must be non-empty');
  }
  if (record.status !== CAPAStatus.ACTION_PLANNED) {
    throw new Error(
      `Cannot record implementation: CAPA must be in ACTION_PLANNED status, got ${record.status}`,
    );
  }

  return {
    ...record,
    implementation_notes: notes,
    status: CAPAStatus.IMPLEMENTING,
  };
}

/**
 * Record revalidation result.
 */
export function recordRevalidation(
  record: CAPARecord,
  runId: string,
  passed: boolean,
): CAPARecord {
  if (record.status !== CAPAStatus.IMPLEMENTING && record.status !== CAPAStatus.REVALIDATING) {
    throw new Error(
      `Cannot record revalidation: CAPA must be in IMPLEMENTING or REVALIDATING status, got ${record.status}`,
    );
  }

  return {
    ...record,
    revalidation_run_id: runId,
    revalidation_passed: passed,
    status: passed ? CAPAStatus.EFFECTIVENESS_REVIEW : CAPAStatus.IMPLEMENTING,
  };
}

/**
 * Record effectiveness review and close CAPA.
 */
export function recordEffectivenessReview(
  record: CAPARecord,
  notes: string,
): CAPARecord {
  if (!notes || notes.length === 0) {
    throw new Error('Effectiveness review notes must be non-empty');
  }
  if (record.status !== CAPAStatus.EFFECTIVENESS_REVIEW) {
    throw new Error(
      `Cannot record effectiveness review: CAPA must be in EFFECTIVENESS_REVIEW status, got ${record.status}`,
    );
  }

  return {
    ...record,
    effectiveness_review_date: new Date().toISOString(),
    effectiveness_review_notes: notes,
    status: CAPAStatus.CLOSED,
    closed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// CAPA Trigger Detection
// ---------------------------------------------------------------------------

/**
 * Detect validation failure trigger: any module with FAIL verdict.
 */
export function detectValidationFailureTriggers(
  decisions: ReadonlyMap<string, DecisionRuleResult>,
  runId: string,
): readonly CAPARecord[] {
  const records: CAPARecord[] = [];

  for (const [moduleId, decision] of decisions) {
    if (decision.verdict === 'FAIL') {
      records.push(openCAPA(CAPATriggerType.VALIDATION_FAILURE, {
        module_id: moduleId,
        run_id: runId,
        description: `Module ${moduleId} failed validation: ${decision.false_positives} FP, ${decision.false_negatives} FN out of ${decision.total_samples} samples`,
      }));
    }
  }

  return records;
}

/**
 * Detect regression trigger: > 0.5% accuracy drop between runs.
 */
export function detectRegressionTriggers(
  currentMetrics: ReadonlyMap<string, ValidationMetrics>,
  previousMetrics: ReadonlyMap<string, ValidationMetrics>,
  runId: string,
): readonly CAPARecord[] {
  const records: CAPARecord[] = [];
  const threshold = INVESTIGATION_CONFIG.REGRESSION_THRESHOLD;

  for (const [moduleId, current] of currentMetrics) {
    const previous = previousMetrics.get(moduleId);
    if (!previous) continue;

    const drop = previous.accuracy - current.accuracy;
    if (drop > threshold) {
      records.push(openCAPA(CAPATriggerType.REGRESSION, {
        module_id: moduleId,
        run_id: runId,
        description: `Module ${moduleId} accuracy regression: ${(previous.accuracy * 100).toFixed(2)}% → ${(current.accuracy * 100).toFixed(2)}% (drop: ${(drop * 100).toFixed(2)}%, threshold: ${(threshold * 100).toFixed(2)}%)`,
      }));
    }
  }

  return records;
}

/**
 * Detect systematic root cause trigger from investigations.
 */
export function detectSystematicRootCauseTriggers(
  investigations: readonly InvestigationRecord[],
  threshold?: number,
): readonly CAPARecord[] {
  const effectiveThreshold = threshold ?? 3;
  const records: CAPARecord[] = [];

  // Group by module + root_cause
  const groups = new Map<string, InvestigationRecord[]>();
  for (const inv of investigations) {
    const key = `${inv.module_id}::${inv.root_cause}`;
    const existing = groups.get(key) ?? [];
    groups.set(key, [...existing, inv]);
  }

  for (const [key, invs] of groups) {
    if (invs.length >= effectiveThreshold) {
      const [moduleId, rootCause] = key.split('::');
      records.push(openCAPA(CAPATriggerType.SYSTEMATIC_ROOT_CAUSE, {
        module_id: moduleId,
        investigation_ids: invs.map(i => i.investigation_id),
        description: `Module ${moduleId} has ${invs.length} investigations with root cause "${rootCause}" — systematic issue detected`,
      }));
    }
  }

  return records;
}

/**
 * Detect calibration failure triggers.
 */
export function detectCalibrationFailureTriggers(
  certificates: readonly CalibrationCertificate[],
): readonly CAPARecord[] {
  const records: CAPARecord[] = [];

  for (const cert of certificates) {
    if (cert.result === 'FAIL') {
      records.push(openCAPA(CAPATriggerType.CALIBRATION_FAILURE, {
        module_id: cert.module_id,
        description: `Module ${cert.module_id} failed calibration: ${cert.samples_passed}/${cert.samples_tested} samples passed`,
      }));
    }
  }

  return records;
}

// ---------------------------------------------------------------------------
// CAPA Store Operations
// ---------------------------------------------------------------------------

/**
 * Build CAPA store from records.
 */
export function buildCAPAStore(
  records: readonly CAPARecord[],
): CAPAStore {
  let openCount = 0;
  let closedCount = 0;
  const byTrigger = new Map<string, number>();

  for (const record of records) {
    if (record.status === CAPAStatus.CLOSED) {
      closedCount += 1;
    } else {
      openCount += 1;
    }
    const current = byTrigger.get(record.trigger_type) ?? 0;
    byTrigger.set(record.trigger_type, current + 1);
  }

  return {
    records,
    open_count: openCount,
    closed_count: closedCount,
    by_trigger: byTrigger,
  };
}

/**
 * Get open CAPAs.
 */
export function getOpenCAPAs(
  records: readonly CAPARecord[],
): readonly CAPARecord[] {
  return records.filter(r => r.status !== CAPAStatus.CLOSED);
}

/**
 * Get CAPAs for a specific module.
 */
export function getModuleCAPAs(
  records: readonly CAPARecord[],
  moduleId: string,
): readonly CAPARecord[] {
  return records.filter(r => r.trigger_context.module_id === moduleId);
}

/**
 * Validate CAPA closure requirements.
 * A CAPA can only be closed if:
 * - Root cause is documented
 * - Action is implemented
 * - Revalidation passed
 */
export function validateCAPAClosure(
  record: CAPARecord,
): { valid: boolean; missing: readonly string[] } {
  const missing: string[] = [];

  if (!record.root_cause_analysis) {
    missing.push('root_cause_analysis');
  }
  if (!record.corrective_action_plan) {
    missing.push('corrective_action_plan');
  }
  if (!record.implementation_notes) {
    missing.push('implementation_notes');
  }
  if (!record.revalidation_passed) {
    missing.push('revalidation_passed');
  }

  return { valid: missing.length === 0, missing };
}

/**
 * Check if all CAPAs are closed.
 */
export function allCAPAsClosed(
  records: readonly CAPARecord[],
): boolean {
  if (records.length === 0) return true;
  return records.every(r => r.status === CAPAStatus.CLOSED);
}

/**
 * Get CAPAs due for effectiveness review (opened > 30 days ago).
 */
export function getCAPAsDueForReview(
  records: readonly CAPARecord[],
  reviewDays?: number,
): readonly CAPARecord[] {
  const days = reviewDays ?? INVESTIGATION_CONFIG.EFFECTIVENESS_REVIEW_DAYS;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  return records.filter(r => {
    if (r.status === CAPAStatus.CLOSED) return false;
    const openedAt = new Date(r.opened_at).getTime();
    return openedAt <= cutoff;
  });
}

```
