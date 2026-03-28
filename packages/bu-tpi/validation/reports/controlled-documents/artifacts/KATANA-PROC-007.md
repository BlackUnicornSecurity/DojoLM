# KATANA-PROC-007 — Corpus Label Audit Procedure

Generated: 2026-03-28T13:35:50.103Z

## Metadata

- Category: procedure
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 8.8
- Source of Record: `src/validation/meta-validation/corpus-label-audit.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-PROC-007.ts`
- Frozen Source SHA-256: `39a47c0c0d57541ff2251aa430c452e678b2387ab1f1109d9edda87fc1346cc7`

## Description

Quarterly random sampling of ground truth labels for independent verification.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |
## Source Record Snapshot

```ts
/**
 * KATANA Corpus Label Audit (K11.2)
 *
 * Quarterly random sampling of ground truth labels for independent verification.
 * Tracks disagreement rate and triggers full re-audit if threshold exceeded.
 *
 * ISO 17025 Clause: 8.8 (Internal audits)
 */

import { SCHEMA_VERSION } from '../types.js';
import type { GroundTruthSample } from '../types.js';
import { SeededRNG } from '../generators/generator-registry.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditReviewVerdict {
  readonly sample_id: string;
  readonly reviewer_id: string;
  readonly original_verdict: 'clean' | 'malicious';
  readonly auditor_verdict: 'clean' | 'malicious';
  readonly agrees: boolean;
  readonly timestamp: string;
  readonly notes?: string;
}

export interface LabelAuditResult {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly audit_id: string;
  readonly generated_at: string;
  readonly audit_type: 'quarterly' | 'full';
  readonly total_corpus_size: number;
  readonly sample_size: number;
  readonly sampled_ids: readonly string[];
  readonly reviews: readonly AuditReviewVerdict[];
  readonly agreement_count: number;
  readonly disagreement_count: number;
  readonly agreement_rate: number;
  readonly disagreement_rate: number;
  readonly requires_full_reaudit: boolean;
  readonly reaudit_threshold: number;
}

export interface AuditHistory {
  readonly audits: readonly LabelAuditResult[];
  readonly total_audits: number;
  readonly reaudits_triggered: number;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const AUDIT_CONFIG = {
  DEFAULT_SAMPLE_SIZE: 50,
  DISAGREEMENT_THRESHOLD: 0.05,
  MAX_SAMPLE_SIZE: 500,
} as const;

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

/**
 * Select a stratified random sample of ground truth labels for audit.
 * Stratification by verdict to ensure proportional representation.
 */
export function selectAuditSample(
  samples: readonly GroundTruthSample[],
  sampleSize: number,
  seed: number,
): readonly GroundTruthSample[] {
  if (samples.length === 0) {
    return [];
  }

  const effectiveSize = Math.min(sampleSize, samples.length);
  if (effectiveSize <= 0) {
    return [];
  }

  // Stratify by verdict
  const clean = samples.filter(s => s.expected_verdict === 'clean');
  const malicious = samples.filter(s => s.expected_verdict === 'malicious');

  const cleanRatio = clean.length / samples.length;
  const cleanCount = clean.length > 0 ? Math.max(1, Math.round(effectiveSize * cleanRatio)) : 0;
  const maliciousCount = malicious.length > 0 ? Math.max(1, effectiveSize - cleanCount) : 0;

  const rng = new SeededRNG(seed);

  const shuffledClean = rng.shuffle(clean);
  const shuffledMalicious = rng.shuffle(malicious);

  const selectedClean = shuffledClean.slice(0, Math.min(cleanCount, shuffledClean.length));
  const selectedMalicious = shuffledMalicious.slice(0, Math.min(maliciousCount, shuffledMalicious.length));

  return [...selectedClean, ...selectedMalicious];
}

// ---------------------------------------------------------------------------
// Audit Execution
// ---------------------------------------------------------------------------

/**
 * Create an audit session with selected samples for review.
 * Returns sample IDs for the auditor to review independently.
 */
export function createAuditSession(
  samples: readonly GroundTruthSample[],
  seed: number,
  sampleSize: number = AUDIT_CONFIG.DEFAULT_SAMPLE_SIZE,
): {
  readonly audit_id: string;
  readonly sampled: readonly GroundTruthSample[];
  readonly total_corpus_size: number;
} {
  const sampled = selectAuditSample(samples, sampleSize, seed);
  const auditId = `AUDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${seed}`;

  return {
    audit_id: auditId,
    sampled,
    total_corpus_size: samples.length,
  };
}

/**
 * Compute audit results from reviewer verdicts.
 */
export function computeAuditResult(
  auditId: string,
  totalCorpusSize: number,
  reviews: readonly AuditReviewVerdict[],
  threshold: number = AUDIT_CONFIG.DISAGREEMENT_THRESHOLD,
  auditType: 'quarterly' | 'full' = 'quarterly',
): LabelAuditResult {
  const agreementCount = reviews.filter(r => r.agrees).length;
  const disagreementCount = reviews.length - agreementCount;
  const agreementRate = reviews.length > 0 ? agreementCount / reviews.length : 1;
  const disagreementRate = reviews.length > 0 ? disagreementCount / reviews.length : 0;

  return {
    schema_version: SCHEMA_VERSION,
    audit_id: auditId,
    generated_at: new Date().toISOString(),
    audit_type: auditType,
    total_corpus_size: totalCorpusSize,
    sample_size: reviews.length,
    sampled_ids: reviews.map(r => r.sample_id),
    reviews,
    agreement_count: agreementCount,
    disagreement_count: disagreementCount,
    agreement_rate: agreementRate,
    disagreement_rate: disagreementRate,
    requires_full_reaudit: disagreementRate > threshold,
    reaudit_threshold: threshold,
  };
}

// ---------------------------------------------------------------------------
// Audit Review Helper
// ---------------------------------------------------------------------------

/**
 * Create an audit review verdict for a sample.
 */
export function createReviewVerdict(
  sample: GroundTruthSample,
  auditorId: string,
  auditorVerdict: 'clean' | 'malicious',
  notes?: string,
): AuditReviewVerdict {
  return {
    sample_id: sample.id,
    reviewer_id: auditorId,
    original_verdict: sample.expected_verdict,
    auditor_verdict: auditorVerdict,
    agrees: sample.expected_verdict === auditorVerdict,
    timestamp: new Date().toISOString(),
    notes,
  };
}

// ---------------------------------------------------------------------------
// History & Trends
// ---------------------------------------------------------------------------

/**
 * Build audit history from multiple audit results.
 */
export function buildAuditHistory(
  audits: readonly LabelAuditResult[],
): AuditHistory {
  return {
    audits,
    total_audits: audits.length,
    reaudits_triggered: audits.filter(a => a.requires_full_reaudit).length,
  };
}

/**
 * Get disagreement trend across audits (latest N).
 */
export function getDisagreementTrend(
  history: AuditHistory,
  windowSize: number = 4,
): readonly { readonly audit_id: string; readonly disagreement_rate: number }[] {
  const recent = history.audits.slice(-windowSize);
  return recent.map(a => ({
    audit_id: a.audit_id,
    disagreement_rate: a.disagreement_rate,
  }));
}

/**
 * Get samples that were flagged as disagreements across multiple audits.
 */
export function getRecurrentDisagreements(
  history: AuditHistory,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const audit of history.audits) {
    for (const review of audit.reviews) {
      if (!review.agrees) {
        const current = counts.get(review.sample_id) ?? 0;
        counts.set(review.sample_id, current + 1);
      }
    }
  }

  return counts;
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportAuditMarkdown(result: LabelAuditResult): string {
  const lines: string[] = [
    '# KATANA Corpus Label Audit Report',
    '',
    `**Audit ID:** ${result.audit_id}`,
    `**Generated:** ${result.generated_at}`,
    `**Type:** ${result.audit_type}`,
    `**ISO 17025 Clause:** 8.8 (Internal audits)`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Corpus Size | ${result.total_corpus_size} |`,
    `| Sample Size | ${result.sample_size} |`,
    `| Agreements | ${result.agreement_count} |`,
    `| Disagreements | ${result.disagreement_count} |`,
    `| Agreement Rate | ${(result.agreement_rate * 100).toFixed(1)}% |`,
    `| Disagreement Rate | ${(result.disagreement_rate * 100).toFixed(1)}% |`,
    `| Threshold | ${(result.reaudit_threshold * 100).toFixed(1)}% |`,
    `| Full Re-audit Required | ${result.requires_full_reaudit ? '**YES**' : 'No'} |`,
    '',
  ];

  if (result.disagreement_count > 0) {
    lines.push('## Disagreements', '', '| Sample ID | Original | Auditor | Reviewer | Notes |', '|-----------|----------|---------|----------|-------|');
    for (const review of result.reviews) {
      if (!review.agrees) {
        lines.push(`| ${review.sample_id} | ${review.original_verdict} | ${review.auditor_verdict} | ${review.reviewer_id} | ${review.notes ?? '-'} |`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

```
