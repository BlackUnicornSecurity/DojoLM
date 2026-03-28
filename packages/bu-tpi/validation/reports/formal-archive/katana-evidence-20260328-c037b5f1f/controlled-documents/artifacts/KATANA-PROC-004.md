# KATANA-PROC-004 — FP/FN Investigation Protocol

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 7.10
- Source of Record: `src/validation/investigation/investigation-protocol.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-004.ts`
- Frozen Source SHA-256: `1cce15be2c2c48c2aa21d99ed1c817e9a24cc7fc5006378ee7af42a5a64be894`

## Description

Investigation procedure for false positive and false negative results. No "won't fix" allowed.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA FP/FN Investigation Protocol (K9.1)
 *
 * ISO 17025 requires investigation of non-conforming work (Clause 7.10).
 * Zero-tolerance target means every single FP/FN must be resolved.
 *
 * Investigation steps:
 * 1. Re-verify ground truth (third expert review)
 * 2. If ground truth correct → classify root cause
 * 3. Fix the tool (new pattern, adjusted threshold, etc.)
 * 4. If ground truth wrong → correct label with documented rationale
 * 5. Re-validate the affected module — repeat until 0 FP + 0 FN
 * 6. Log full investigation record with fix evidence
 *
 * No investigation may be closed as "won't fix".
 */

import { type InvestigationRecord, SCHEMA_VERSION, type RootCauseCategory, type FalseType, type DecisionRuleResult } from '../types.js';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InvestigationInput {
  readonly sample_id: string;
  readonly module_id: string;
  readonly false_type: FalseType;
  readonly expected_verdict: 'clean' | 'malicious';
  readonly actual_verdict: 'clean' | 'malicious';
}

export interface InvestigationUpdate {
  readonly root_cause: RootCauseCategory;
  readonly fix_applied: string;
  readonly revalidation_passed: boolean;
}

export interface InvestigationStore {
  readonly records: readonly InvestigationRecord[];
  readonly open_count: number;
  readonly closed_count: number;
  readonly total_iterations: number;
}

// ---------------------------------------------------------------------------
// Investigation Record Management
// ---------------------------------------------------------------------------

/**
 * Open a new investigation for a false result.
 */
export function openInvestigation(
  input: InvestigationInput,
): InvestigationRecord {
  if (!input.sample_id || input.sample_id.length === 0) {
    throw new Error('sample_id must be non-empty');
  }
  if (!input.module_id || input.module_id.length === 0) {
    throw new Error('module_id must be non-empty');
  }

  return {
    schema_version: SCHEMA_VERSION,
    investigation_id: `inv-${crypto.randomUUID()}`,
    sample_id: input.sample_id,
    module_id: input.module_id,
    false_type: input.false_type,
    root_cause: 'pattern_gap', // placeholder — updated during investigation
    fix_applied: 'pending',
    revalidation_passed: false,
    iteration_count: 1,
    opened_at: new Date().toISOString(),
  };
}

/**
 * Update an investigation with root cause analysis and fix.
 * Returns a new record (immutable update).
 */
export function updateInvestigation(
  record: InvestigationRecord,
  update: InvestigationUpdate,
): InvestigationRecord {
  return {
    ...record,
    root_cause: update.root_cause,
    fix_applied: update.fix_applied,
    revalidation_passed: update.revalidation_passed,
    iteration_count: record.iteration_count + 1,
    closed_at: update.revalidation_passed ? new Date().toISOString() : undefined,
  };
}

/**
 * Reopen a closed investigation (revalidation found new issues).
 * Returns a new record with incremented iteration.
 */
export function reopenInvestigation(
  record: InvestigationRecord,
): InvestigationRecord {
  return {
    ...record,
    revalidation_passed: false,
    closed_at: undefined,
    iteration_count: record.iteration_count + 1,
  };
}

/**
 * Close an investigation after successful revalidation.
 */
export function closeInvestigation(
  record: InvestigationRecord,
): InvestigationRecord {
  if (!record.revalidation_passed) {
    throw new Error(
      `Cannot close investigation ${record.investigation_id}: revalidation has not passed`,
    );
  }

  return {
    ...record,
    closed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Batch Operations
// ---------------------------------------------------------------------------

/**
 * Extract non-conformities from decision rules and open investigations.
 */
export function openInvestigationsFromDecisions(
  decisions: ReadonlyMap<string, DecisionRuleResult>,
): readonly InvestigationRecord[] {
  const records: InvestigationRecord[] = [];

  for (const [, decision] of decisions) {
    for (const nc of decision.non_conformities) {
      records.push(openInvestigation({
        sample_id: nc.sample_id,
        module_id: decision.module_id,
        false_type: nc.type as FalseType,
        expected_verdict: nc.expected,
        actual_verdict: nc.actual,
      }));
    }
  }

  return records;
}

/**
 * Build investigation store from a list of records.
 */
export function buildInvestigationStore(
  records: readonly InvestigationRecord[],
): InvestigationStore {
  let openCount = 0;
  let closedCount = 0;
  let totalIterations = 0;

  for (const record of records) {
    if (record.closed_at) {
      closedCount += 1;
    } else {
      openCount += 1;
    }
    totalIterations += record.iteration_count;
  }

  return {
    records,
    open_count: openCount,
    closed_count: closedCount,
    total_iterations: totalIterations,
  };
}

/**
 * Get all open (unresolved) investigations.
 */
export function getOpenInvestigations(
  records: readonly InvestigationRecord[],
): readonly InvestigationRecord[] {
  return records.filter(r => !r.closed_at);
}

/**
 * Get investigations for a specific module.
 */
export function getModuleInvestigations(
  records: readonly InvestigationRecord[],
  moduleId: string,
): readonly InvestigationRecord[] {
  return records.filter(r => r.module_id === moduleId);
}

/**
 * Get investigations for a specific sample.
 */
export function getSampleInvestigations(
  records: readonly InvestigationRecord[],
  sampleId: string,
): readonly InvestigationRecord[] {
  return records.filter(r => r.sample_id === sampleId);
}

/**
 * Count investigations by root cause category.
 */
export function countByRootCause(
  records: readonly InvestigationRecord[],
): ReadonlyMap<RootCauseCategory, number> {
  const counts = new Map<RootCauseCategory, number>();
  for (const record of records) {
    // Skip open investigations — their root_cause is a placeholder
    if (!record.closed_at) continue;
    const current = counts.get(record.root_cause) ?? 0;
    counts.set(record.root_cause, current + 1);
  }
  return counts;
}

/**
 * Check if all investigations are closed (validation loop can close).
 */
export function allInvestigationsClosed(
  records: readonly InvestigationRecord[],
): boolean {
  if (records.length === 0) return true;
  return records.every(r => r.closed_at !== undefined);
}

/**
 * Validate that no investigation is marked "won't fix".
 * Per K9.1: every non-conformity must be resolved.
 */
export function validateNoWontFix(
  records: readonly InvestigationRecord[],
): { valid: boolean; violations: readonly string[] } {
  const violations: string[] = [];

  for (const record of records) {
    const fixLower = record.fix_applied.toLowerCase();
    if (
      fixLower.includes('wont fix') ||
      fixLower.includes("won't fix") ||
      fixLower.includes('will not fix') ||
      fixLower.includes('deferred') ||
      fixLower.includes('accepted risk')
    ) {
      violations.push(
        `Investigation ${record.investigation_id} (${record.sample_id}): fix_applied="${record.fix_applied}" — "won't fix" not allowed`,
      );
    }
  }

  return { valid: violations.length === 0, violations };
}

```
