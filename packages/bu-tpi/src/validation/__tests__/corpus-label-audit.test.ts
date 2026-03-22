/**
 * K11.2 — Corpus Label Audit Tests
 */
import { describe, it, expect } from 'vitest';
import {
  AUDIT_CONFIG,
  selectAuditSample,
  createAuditSession,
  computeAuditResult,
  createReviewVerdict,
  buildAuditHistory,
  getDisagreementTrend,
  getRecurrentDisagreements,
  exportAuditMarkdown,
} from '../meta-validation/corpus-label-audit.js';
import type { GroundTruthSample } from '../types.js';
import { SCHEMA_VERSION } from '../types.js';

function makeSample(id: string, verdict: 'clean' | 'malicious'): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `text/test/${id}.txt`,
    content_hash: `hash-${id}`,
    content_type: 'text',
    expected_verdict: verdict,
    expected_modules: verdict === 'malicious' ? ['enhanced-pi'] : [],
    expected_severity: verdict === 'malicious' ? 'CRITICAL' : null,
    expected_categories: [],
    difficulty: 'trivial',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict, timestamp: '2026-01-01T00:00:00Z' },
    reviewer_2: { id: 'r2', verdict, timestamp: '2026-01-01T00:00:00Z' },
    independent_agreement: true,
    holdout: false,
  };
}

describe('K11.2 — Corpus Label Audit', () => {
  const samples: GroundTruthSample[] = [
    ...Array.from({ length: 30 }, (_, i) => makeSample(`clean-${i}`, 'clean')),
    ...Array.from({ length: 70 }, (_, i) => makeSample(`mal-${i}`, 'malicious')),
  ];

  describe('AUDIT_CONFIG', () => {
    it('should have default sample size of 50', () => {
      expect(AUDIT_CONFIG.DEFAULT_SAMPLE_SIZE).toBe(50);
    });

    it('should have disagreement threshold of 5%', () => {
      expect(AUDIT_CONFIG.DISAGREEMENT_THRESHOLD).toBe(0.05);
    });
  });

  describe('selectAuditSample', () => {
    it('should select the requested number of samples', () => {
      const selected = selectAuditSample(samples, 20, 42);
      expect(selected.length).toBe(20);
    });

    it('should not exceed corpus size', () => {
      const selected = selectAuditSample(samples, 200, 42);
      expect(selected.length).toBe(100);
    });

    it('should return empty for empty corpus', () => {
      const selected = selectAuditSample([], 50, 42);
      expect(selected).toEqual([]);
    });

    it('should be deterministic with same seed', () => {
      const s1 = selectAuditSample(samples, 20, 42);
      const s2 = selectAuditSample(samples, 20, 42);
      expect(s1.map(s => s.id)).toEqual(s2.map(s => s.id));
    });

    it('should produce different samples with different seeds', () => {
      const s1 = selectAuditSample(samples, 20, 42);
      const s2 = selectAuditSample(samples, 20, 99);
      const ids1 = s1.map(s => s.id);
      const ids2 = s2.map(s => s.id);
      expect(ids1).not.toEqual(ids2);
    });

    it('should include both clean and malicious samples (stratified)', () => {
      const selected = selectAuditSample(samples, 20, 42);
      const hasClean = selected.some(s => s.expected_verdict === 'clean');
      const hasMalicious = selected.some(s => s.expected_verdict === 'malicious');
      expect(hasClean).toBe(true);
      expect(hasMalicious).toBe(true);
    });

    it('should handle zero sample size', () => {
      const selected = selectAuditSample(samples, 0, 42);
      expect(selected).toEqual([]);
    });
  });

  describe('createAuditSession', () => {
    it('should create a session with audit ID', () => {
      const session = createAuditSession(samples, 42, 20);
      expect(session.audit_id).toMatch(/^AUDIT-\d{8}-42$/);
      expect(session.sampled.length).toBe(20);
      expect(session.total_corpus_size).toBe(100);
    });

    it('should use default sample size', () => {
      const session = createAuditSession(samples, 42);
      expect(session.sampled.length).toBe(50);
    });
  });

  describe('createReviewVerdict', () => {
    it('should create agreeing verdict', () => {
      const sample = makeSample('test-1', 'malicious');
      const verdict = createReviewVerdict(sample, 'auditor-1', 'malicious');
      expect(verdict.agrees).toBe(true);
      expect(verdict.original_verdict).toBe('malicious');
      expect(verdict.auditor_verdict).toBe('malicious');
    });

    it('should create disagreeing verdict', () => {
      const sample = makeSample('test-2', 'clean');
      const verdict = createReviewVerdict(sample, 'auditor-1', 'malicious', 'Suspicious content');
      expect(verdict.agrees).toBe(false);
      expect(verdict.notes).toBe('Suspicious content');
    });

    it('should include timestamp', () => {
      const sample = makeSample('test-3', 'clean');
      const verdict = createReviewVerdict(sample, 'auditor-1', 'clean');
      expect(verdict.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('computeAuditResult', () => {
    it('should compute perfect agreement', () => {
      const reviews = [
        createReviewVerdict(makeSample('s1', 'clean'), 'a1', 'clean'),
        createReviewVerdict(makeSample('s2', 'malicious'), 'a1', 'malicious'),
      ];
      const result = computeAuditResult('AUDIT-001', 100, reviews);
      expect(result.agreement_count).toBe(2);
      expect(result.disagreement_count).toBe(0);
      expect(result.agreement_rate).toBe(1);
      expect(result.disagreement_rate).toBe(0);
      expect(result.requires_full_reaudit).toBe(false);
    });

    it('should detect disagreements exceeding threshold', () => {
      const reviews = [
        createReviewVerdict(makeSample('s1', 'clean'), 'a1', 'malicious'),
        createReviewVerdict(makeSample('s2', 'clean'), 'a1', 'malicious'),
        createReviewVerdict(makeSample('s3', 'malicious'), 'a1', 'malicious'),
      ];
      const result = computeAuditResult('AUDIT-002', 100, reviews, 0.05);
      expect(result.disagreement_rate).toBeCloseTo(2 / 3, 5);
      expect(result.requires_full_reaudit).toBe(true);
    });

    it('should handle empty reviews', () => {
      const result = computeAuditResult('AUDIT-003', 100, []);
      expect(result.agreement_rate).toBe(1);
      expect(result.disagreement_rate).toBe(0);
      expect(result.requires_full_reaudit).toBe(false);
    });

    it('should include schema version', () => {
      const result = computeAuditResult('AUDIT-004', 100, []);
      expect(result.schema_version).toBe(SCHEMA_VERSION);
    });

    it('should not trigger reaudit at exactly threshold', () => {
      const reviews = Array.from({ length: 20 }, (_, i) => {
        const sample = makeSample(`s-${i}`, 'malicious');
        // 1 disagreement out of 20 = 5% exactly (at threshold, not above)
        return createReviewVerdict(sample, 'a1', i === 0 ? 'clean' : 'malicious');
      });
      const result = computeAuditResult('AUDIT-005', 100, reviews, 0.05);
      expect(result.disagreement_rate).toBeCloseTo(0.05, 5);
      expect(result.requires_full_reaudit).toBe(false);
    });
  });

  describe('buildAuditHistory', () => {
    it('should track audit history', () => {
      const audit1 = computeAuditResult('A1', 100, [
        createReviewVerdict(makeSample('s1', 'clean'), 'a1', 'clean'),
      ]);
      const audit2 = computeAuditResult('A2', 100, [
        createReviewVerdict(makeSample('s2', 'clean'), 'a1', 'malicious'),
      ], 0.01);
      const history = buildAuditHistory([audit1, audit2]);
      expect(history.total_audits).toBe(2);
      expect(history.reaudits_triggered).toBe(1);
    });
  });

  describe('getDisagreementTrend', () => {
    it('should return recent disagreement rates', () => {
      const audits = Array.from({ length: 6 }, (_, i) => {
        const reviews = [
          createReviewVerdict(makeSample(`s-${i}`, 'clean'), 'a1', i % 2 === 0 ? 'clean' : 'malicious'),
        ];
        return computeAuditResult(`A-${i}`, 100, reviews);
      });
      const history = buildAuditHistory(audits);
      const trend = getDisagreementTrend(history, 4);
      expect(trend.length).toBe(4);
    });

    it('should handle empty history', () => {
      const history = buildAuditHistory([]);
      const trend = getDisagreementTrend(history);
      expect(trend).toEqual([]);
    });
  });

  describe('getRecurrentDisagreements', () => {
    it('should identify samples with recurring disagreements', () => {
      const r1 = computeAuditResult('A1', 100, [
        createReviewVerdict(makeSample('recurring-1', 'clean'), 'a1', 'malicious'),
        createReviewVerdict(makeSample('ok-1', 'clean'), 'a1', 'clean'),
      ]);
      const r2 = computeAuditResult('A2', 100, [
        createReviewVerdict(makeSample('recurring-1', 'clean'), 'a2', 'malicious'),
        createReviewVerdict(makeSample('ok-2', 'malicious'), 'a2', 'malicious'),
      ]);
      const history = buildAuditHistory([r1, r2]);
      const recurrents = getRecurrentDisagreements(history);
      expect(recurrents.get('recurring-1')).toBe(2);
      expect(recurrents.has('ok-1')).toBe(false);
      expect(recurrents.has('ok-2')).toBe(false);
    });

    it('should handle empty history', () => {
      const history = buildAuditHistory([]);
      const recurrents = getRecurrentDisagreements(history);
      expect(recurrents.size).toBe(0);
    });
  });

  describe('exportAuditMarkdown', () => {
    it('should produce markdown with summary section', () => {
      const reviews = [
        createReviewVerdict(makeSample('s1', 'clean'), 'a1', 'clean'),
        createReviewVerdict(makeSample('s2', 'malicious'), 'a1', 'clean'),
      ];
      const result = computeAuditResult('AUDIT-MD', 1000, reviews);
      const md = exportAuditMarkdown(result);
      expect(md).toContain('# KATANA Corpus Label Audit Report');
      expect(md).toContain('AUDIT-MD');
      expect(md).toContain('ISO 17025 Clause:**');
      expect(md).toContain('## Summary');
    });

    it('should include disagreement details when present', () => {
      const reviews = [
        createReviewVerdict(makeSample('bad-1', 'clean'), 'a1', 'malicious', 'Looks suspicious'),
      ];
      const result = computeAuditResult('AUDIT-DIS', 100, reviews);
      const md = exportAuditMarkdown(result);
      expect(md).toContain('## Disagreements');
      expect(md).toContain('bad-1');
      expect(md).toContain('Looks suspicious');
    });

    it('should not include disagreement section when all agree', () => {
      const reviews = [
        createReviewVerdict(makeSample('ok-1', 'clean'), 'a1', 'clean'),
      ];
      const result = computeAuditResult('AUDIT-OK', 100, reviews);
      const md = exportAuditMarkdown(result);
      expect(md).not.toContain('## Disagreements');
    });
  });
});
