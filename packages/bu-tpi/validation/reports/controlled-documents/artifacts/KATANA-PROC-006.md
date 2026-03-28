# KATANA-PROC-006 — Ground Truth Challenge Process

Generated: 2026-03-28T13:35:50.103Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 7.10
- Source of Record: `src/validation/investigation/ground-truth-challenge.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-006.ts`
- Frozen Source SHA-256: `e98c4d488d448d2984ceea93467bf22e12a598b40837b4e5551e16bfe34e506d`

## Description

Formal 3-reviewer majority vote process for disputed ground truth labels.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA Ground Truth Challenge Process (K9.2)
 *
 * Formal process when modules consistently fail on debatable samples.
 *
 * Trigger: Module fails on same sample across 3+ validation runs.
 * Process: Three independent reviewers re-evaluate the sample.
 * Resolution: Majority vote determines final label.
 * If label changes → update corpus + re-validate.
 * Track challenge rate as quality metric.
 *
 * ISO 17025 Clause: 7.10
 */

import {
  SCHEMA_VERSION,
  type ChallengeRecord,
  ChallengeStatus,
  type ValidationResult,
} from '../types.js';
import { INVESTIGATION_CONFIG } from '../config.js';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FailureHistory {
  readonly sample_id: string;
  readonly module_id: string;
  readonly failure_run_ids: readonly string[];
}

export interface ReviewerVote {
  readonly id: string;
  readonly verdict: 'clean' | 'malicious';
  readonly timestamp: string;
}

export interface ChallengeInput {
  readonly sample_id: string;
  readonly module_id: string;
  readonly original_verdict: 'clean' | 'malicious';
  readonly trigger_run_count: number;
  readonly reviewer_1: ReviewerVote;
  readonly reviewer_2: ReviewerVote;
  readonly reviewer_3: ReviewerVote;
}

export interface ChallengeQualityMetrics {
  readonly total_challenges: number;
  readonly labels_changed: number;
  readonly labels_confirmed: number;
  readonly challenge_rate: number;
  readonly by_module: ReadonlyMap<string, number>;
}

// ---------------------------------------------------------------------------
// Failure Tracking
// ---------------------------------------------------------------------------

/**
 * Identify samples that fail consistently across multiple validation runs.
 * Returns samples eligible for ground truth challenge (>= threshold failures).
 */
export function identifyChallengeCandidates(
  runResults: readonly { readonly run_id: string; readonly results: readonly ValidationResult[] }[],
  threshold?: number,
): readonly FailureHistory[] {
  const effectiveThreshold = threshold ?? INVESTIGATION_CONFIG.CHALLENGE_TRIGGER_RUN_COUNT;

  // Track failures: key = "sample_id::module_id", value = run_ids that failed
  const failureMap = new Map<string, { sample_id: string; module_id: string; run_ids: readonly string[] }>();

  for (const run of runResults) {
    for (const result of run.results) {
      if (!result.correct) {
        const key = `${result.sample_id}::${result.module_id}`;
        const existing = failureMap.get(key);
        if (existing) {
          failureMap.set(key, { ...existing, run_ids: [...existing.run_ids, run.run_id] });
        } else {
          failureMap.set(key, {
            sample_id: result.sample_id,
            module_id: result.module_id,
            run_ids: [run.run_id],
          });
        }
      }
    }
  }

  // Filter to samples meeting threshold
  const candidates: FailureHistory[] = [];
  for (const entry of failureMap.values()) {
    if (entry.run_ids.length >= effectiveThreshold) {
      candidates.push({
        sample_id: entry.sample_id,
        module_id: entry.module_id,
        failure_run_ids: entry.run_ids,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Challenge Record Management
// ---------------------------------------------------------------------------

/**
 * Compute majority verdict from three reviewers.
 */
function computeMajorityVerdict(
  r1: ReviewerVote,
  r2: ReviewerVote,
  r3: ReviewerVote,
): 'clean' | 'malicious' {
  const votes = [r1.verdict, r2.verdict, r3.verdict];
  const maliciousCount = votes.filter(v => v === 'malicious').length;
  return maliciousCount >= 2 ? 'malicious' : 'clean';
}

/**
 * Create a challenge record from three reviewer votes.
 */
export function createChallenge(input: ChallengeInput): ChallengeRecord {
  if (!input.sample_id || input.sample_id.length === 0) {
    throw new Error('sample_id must be non-empty');
  }
  if (!input.module_id || input.module_id.length === 0) {
    throw new Error('module_id must be non-empty');
  }
  if (input.trigger_run_count < INVESTIGATION_CONFIG.CHALLENGE_TRIGGER_RUN_COUNT) {
    throw new Error(
      `trigger_run_count must be >= ${INVESTIGATION_CONFIG.CHALLENGE_TRIGGER_RUN_COUNT}, got ${input.trigger_run_count}`,
    );
  }

  // Validate all three reviewers are different
  const reviewerIds = new Set([input.reviewer_1.id, input.reviewer_2.id, input.reviewer_3.id]);
  if (reviewerIds.size < 3) {
    throw new Error('All three reviewers must be different');
  }

  const majorityVerdict = computeMajorityVerdict(
    input.reviewer_1,
    input.reviewer_2,
    input.reviewer_3,
  );

  const labelChanged = majorityVerdict !== input.original_verdict;

  return {
    schema_version: SCHEMA_VERSION,
    challenge_id: `chal-${crypto.randomUUID()}`,
    sample_id: input.sample_id,
    module_id: input.module_id,
    trigger_run_count: input.trigger_run_count,
    reviewer_1: { ...input.reviewer_1 },
    reviewer_2: { ...input.reviewer_2 },
    reviewer_3: { ...input.reviewer_3 },
    majority_verdict: majorityVerdict,
    original_verdict: input.original_verdict,
    label_changed: labelChanged,
    status: ChallengeStatus.RESOLVED,
    opened_at: new Date().toISOString(),
    resolved_at: new Date().toISOString(),
    rationale: labelChanged
      ? `Majority vote (${majorityVerdict}) overrides original label (${input.original_verdict})`
      : `Majority vote confirms original label (${input.original_verdict})`,
  };
}

/**
 * Create an open challenge (awaiting reviewer votes).
 */
export function openChallenge(
  sampleId: string,
  moduleId: string,
  originalVerdict: 'clean' | 'malicious',
  triggerRunCount: number,
): ChallengeRecord {
  if (!sampleId || sampleId.length === 0) {
    throw new Error('sampleId must be non-empty');
  }
  if (!moduleId || moduleId.length === 0) {
    throw new Error('moduleId must be non-empty');
  }

  if (triggerRunCount < INVESTIGATION_CONFIG.CHALLENGE_TRIGGER_RUN_COUNT) {
    throw new Error(
      `triggerRunCount must be >= ${INVESTIGATION_CONFIG.CHALLENGE_TRIGGER_RUN_COUNT}, got ${triggerRunCount}`,
    );
  }

  const now = new Date().toISOString();
  // Create placeholder reviewers with unique IDs — will be replaced during resolveChallenge
  const placeholder1: ReviewerVote = { id: 'pending-1', verdict: originalVerdict, timestamp: now };
  const placeholder2: ReviewerVote = { id: 'pending-2', verdict: originalVerdict, timestamp: now };
  const placeholder3: ReviewerVote = { id: 'pending-3', verdict: originalVerdict, timestamp: now };

  return {
    schema_version: SCHEMA_VERSION,
    challenge_id: `chal-${crypto.randomUUID()}`,
    sample_id: sampleId,
    module_id: moduleId,
    trigger_run_count: triggerRunCount,
    reviewer_1: placeholder1,
    reviewer_2: placeholder2,
    reviewer_3: placeholder3,
    majority_verdict: originalVerdict,
    original_verdict: originalVerdict,
    label_changed: false,
    status: ChallengeStatus.OPEN,
    opened_at: now,
  };
}

/**
 * Resolve a challenge with reviewer votes.
 */
export function resolveChallenge(
  challenge: ChallengeRecord,
  reviewer1: ReviewerVote,
  reviewer2: ReviewerVote,
  reviewer3: ReviewerVote,
): ChallengeRecord {
  const reviewerIds = new Set([reviewer1.id, reviewer2.id, reviewer3.id]);
  if (reviewerIds.size < 3) {
    throw new Error('All three reviewers must be different');
  }

  const majorityVerdict = computeMajorityVerdict(reviewer1, reviewer2, reviewer3);
  const labelChanged = majorityVerdict !== challenge.original_verdict;

  return {
    ...challenge,
    reviewer_1: { ...reviewer1 },
    reviewer_2: { ...reviewer2 },
    reviewer_3: { ...reviewer3 },
    majority_verdict: majorityVerdict,
    label_changed: labelChanged,
    status: ChallengeStatus.RESOLVED,
    resolved_at: new Date().toISOString(),
    rationale: labelChanged
      ? `Majority vote (${majorityVerdict}) overrides original label (${challenge.original_verdict})`
      : `Majority vote confirms original label (${challenge.original_verdict})`,
  };
}

// ---------------------------------------------------------------------------
// Quality Metrics
// ---------------------------------------------------------------------------

/**
 * Compute challenge quality metrics.
 *
 * @param challenges - All challenge records
 * @param totalSamples - Total samples in corpus (for challenge rate computation)
 */
export function computeChallengeMetrics(
  challenges: readonly ChallengeRecord[],
  totalSamples: number,
): ChallengeQualityMetrics {
  const byModule = new Map<string, number>();
  let labelsChanged = 0;
  let labelsConfirmed = 0;

  for (const challenge of challenges) {
    const current = byModule.get(challenge.module_id) ?? 0;
    byModule.set(challenge.module_id, current + 1);

    if (challenge.status === ChallengeStatus.RESOLVED) {
      if (challenge.label_changed) {
        labelsChanged += 1;
      } else {
        labelsConfirmed += 1;
      }
    }
  }

  const safeTotalSamples = totalSamples > 0 ? totalSamples : 1;

  return {
    total_challenges: challenges.length,
    labels_changed: labelsChanged,
    labels_confirmed: labelsConfirmed,
    challenge_rate: challenges.length / safeTotalSamples,
    by_module: byModule,
  };
}

/**
 * Get challenges that resulted in label changes.
 */
export function getLabelChanges(
  challenges: readonly ChallengeRecord[],
): readonly ChallengeRecord[] {
  return challenges.filter(c => c.label_changed && c.status === ChallengeStatus.RESOLVED);
}

```
