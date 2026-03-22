/**
 * KATANA Ground Truth Challenge Process Tests (K9.2)
 *
 * ISO 17025 Clause: 7.10
 */

import { describe, it, expect } from 'vitest';
import {
  identifyChallengeCandidates,
  createChallenge,
  openChallenge,
  resolveChallenge,
  computeChallengeMetrics,
  getLabelChanges,
} from '../investigation/ground-truth-challenge.js';
import { SCHEMA_VERSION, type ValidationResult, ChallengeStatus } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    schema_version: SCHEMA_VERSION,
    sample_id: 'sample-001',
    module_id: 'test-module',
    expected_verdict: 'malicious',
    actual_verdict: 'malicious',
    correct: true,
    actual_severity: 'CRITICAL',
    actual_categories: ['injection'],
    actual_findings_count: 1,
    elapsed_ms: 10,
    ...overrides,
  };
}

function makeReviewer(id: string, verdict: 'clean' | 'malicious') {
  return { id, verdict, timestamp: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K9.2 — Ground Truth Challenge Process', () => {
  describe('identifyChallengeCandidates', () => {
    it('should identify samples failing across 3+ runs', () => {
      const runResults = [
        { run_id: 'r1', results: [makeResult({ sample_id: 's1', correct: false })] },
        { run_id: 'r2', results: [makeResult({ sample_id: 's1', correct: false })] },
        { run_id: 'r3', results: [makeResult({ sample_id: 's1', correct: false })] },
      ];

      const candidates = identifyChallengeCandidates(runResults);

      expect(candidates.length).toBe(1);
      expect(candidates[0].sample_id).toBe('s1');
      expect(candidates[0].failure_run_ids.length).toBe(3);
    });

    it('should not include samples failing fewer than threshold times', () => {
      const runResults = [
        { run_id: 'r1', results: [makeResult({ sample_id: 's1', correct: false })] },
        { run_id: 'r2', results: [makeResult({ sample_id: 's1', correct: false })] },
        { run_id: 'r3', results: [makeResult({ sample_id: 's1', correct: true })] },
      ];

      const candidates = identifyChallengeCandidates(runResults);
      expect(candidates.length).toBe(0);
    });

    it('should support custom threshold', () => {
      const runResults = [
        { run_id: 'r1', results: [makeResult({ sample_id: 's1', correct: false })] },
        { run_id: 'r2', results: [makeResult({ sample_id: 's1', correct: false })] },
      ];

      const candidates = identifyChallengeCandidates(runResults, 2);
      expect(candidates.length).toBe(1);
    });

    it('should track per module_id', () => {
      const runResults = [
        { run_id: 'r1', results: [
          makeResult({ sample_id: 's1', module_id: 'mod-a', correct: false }),
          makeResult({ sample_id: 's1', module_id: 'mod-b', correct: false }),
        ]},
        { run_id: 'r2', results: [
          makeResult({ sample_id: 's1', module_id: 'mod-a', correct: false }),
          makeResult({ sample_id: 's1', module_id: 'mod-b', correct: false }),
        ]},
        { run_id: 'r3', results: [
          makeResult({ sample_id: 's1', module_id: 'mod-a', correct: false }),
          makeResult({ sample_id: 's1', module_id: 'mod-b', correct: true }),
        ]},
      ];

      const candidates = identifyChallengeCandidates(runResults);

      // Only mod-a should qualify (3 failures), mod-b only has 2
      expect(candidates.length).toBe(1);
      expect(candidates[0].module_id).toBe('mod-a');
    });

    it('should handle empty runs', () => {
      const candidates = identifyChallengeCandidates([]);
      expect(candidates.length).toBe(0);
    });
  });

  describe('createChallenge', () => {
    it('should create a resolved challenge with majority vote', () => {
      const challenge = createChallenge({
        sample_id: 's1',
        module_id: 'enhanced-pi',
        original_verdict: 'malicious',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('rev-1', 'clean'),
        reviewer_2: makeReviewer('rev-2', 'clean'),
        reviewer_3: makeReviewer('rev-3', 'malicious'),
      });

      expect(challenge.schema_version).toBe(SCHEMA_VERSION);
      expect(challenge.challenge_id).toMatch(/^chal-/);
      expect(challenge.majority_verdict).toBe('clean');
      expect(challenge.label_changed).toBe(true);
      expect(challenge.status).toBe(ChallengeStatus.RESOLVED);
      expect(challenge.resolved_at).toBeDefined();
    });

    it('should compute correct majority for 2 malicious votes', () => {
      const challenge = createChallenge({
        sample_id: 's1',
        module_id: 'mod',
        original_verdict: 'clean',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('r1', 'malicious'),
        reviewer_2: makeReviewer('r2', 'malicious'),
        reviewer_3: makeReviewer('r3', 'clean'),
      });

      expect(challenge.majority_verdict).toBe('malicious');
      expect(challenge.label_changed).toBe(true);
    });

    it('should detect when label is confirmed (no change)', () => {
      const challenge = createChallenge({
        sample_id: 's1',
        module_id: 'mod',
        original_verdict: 'malicious',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('r1', 'malicious'),
        reviewer_2: makeReviewer('r2', 'malicious'),
        reviewer_3: makeReviewer('r3', 'clean'),
      });

      expect(challenge.label_changed).toBe(false);
      expect(challenge.majority_verdict).toBe('malicious');
    });

    it('should handle unanimous vote', () => {
      const challenge = createChallenge({
        sample_id: 's1',
        module_id: 'mod',
        original_verdict: 'clean',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('r1', 'clean'),
        reviewer_2: makeReviewer('r2', 'clean'),
        reviewer_3: makeReviewer('r3', 'clean'),
      });

      expect(challenge.majority_verdict).toBe('clean');
      expect(challenge.label_changed).toBe(false);
    });

    it('should throw for empty sample_id', () => {
      expect(() => createChallenge({
        sample_id: '',
        module_id: 'mod',
        original_verdict: 'malicious',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('r1', 'malicious'),
        reviewer_2: makeReviewer('r2', 'malicious'),
        reviewer_3: makeReviewer('r3', 'malicious'),
      })).toThrow('sample_id must be non-empty');
    });

    it('should throw for duplicate reviewers', () => {
      expect(() => createChallenge({
        sample_id: 's1',
        module_id: 'mod',
        original_verdict: 'malicious',
        trigger_run_count: 3,
        reviewer_1: makeReviewer('r1', 'malicious'),
        reviewer_2: makeReviewer('r1', 'malicious'), // same as r1
        reviewer_3: makeReviewer('r3', 'malicious'),
      })).toThrow('All three reviewers must be different');
    });

    it('should throw for trigger_run_count below threshold', () => {
      expect(() => createChallenge({
        sample_id: 's1',
        module_id: 'mod',
        original_verdict: 'malicious',
        trigger_run_count: 1, // below 3
        reviewer_1: makeReviewer('r1', 'malicious'),
        reviewer_2: makeReviewer('r2', 'malicious'),
        reviewer_3: makeReviewer('r3', 'malicious'),
      })).toThrow('trigger_run_count must be >= 3');
    });
  });

  describe('openChallenge', () => {
    it('should create an open challenge awaiting review', () => {
      const challenge = openChallenge('s1', 'mod', 'malicious', 3);

      expect(challenge.status).toBe(ChallengeStatus.OPEN);
      expect(challenge.label_changed).toBe(false);
      expect(challenge.resolved_at).toBeUndefined();
    });

    it('should throw for empty sampleId', () => {
      expect(() => openChallenge('', 'mod', 'malicious', 3)).toThrow('sampleId must be non-empty');
    });

    it('should throw for empty moduleId', () => {
      expect(() => openChallenge('s1', '', 'malicious', 3)).toThrow('moduleId must be non-empty');
    });
  });

  describe('resolveChallenge', () => {
    it('should resolve an open challenge with reviewer votes', () => {
      const open = openChallenge('s1', 'mod', 'malicious', 3);

      const resolved = resolveChallenge(
        open,
        makeReviewer('r1', 'clean'),
        makeReviewer('r2', 'clean'),
        makeReviewer('r3', 'malicious'),
      );

      expect(resolved.status).toBe(ChallengeStatus.RESOLVED);
      expect(resolved.majority_verdict).toBe('clean');
      expect(resolved.label_changed).toBe(true);
      expect(resolved.resolved_at).toBeDefined();
    });

    it('should throw for duplicate reviewers', () => {
      const open = openChallenge('s1', 'mod', 'malicious', 3);

      expect(() => resolveChallenge(
        open,
        makeReviewer('r1', 'clean'),
        makeReviewer('r1', 'clean'),
        makeReviewer('r3', 'clean'),
      )).toThrow('All three reviewers must be different');
    });
  });

  describe('computeChallengeMetrics', () => {
    it('should compute correct quality metrics', () => {
      const challenges = [
        createChallenge({
          sample_id: 's1', module_id: 'mod-a', original_verdict: 'malicious', trigger_run_count: 3,
          reviewer_1: makeReviewer('r1', 'clean'), reviewer_2: makeReviewer('r2', 'clean'), reviewer_3: makeReviewer('r3', 'malicious'),
        }),
        createChallenge({
          sample_id: 's2', module_id: 'mod-a', original_verdict: 'malicious', trigger_run_count: 3,
          reviewer_1: makeReviewer('r1', 'malicious'), reviewer_2: makeReviewer('r2', 'malicious'), reviewer_3: makeReviewer('r3', 'clean'),
        }),
        createChallenge({
          sample_id: 's3', module_id: 'mod-b', original_verdict: 'clean', trigger_run_count: 3,
          reviewer_1: makeReviewer('r1', 'malicious'), reviewer_2: makeReviewer('r2', 'malicious'), reviewer_3: makeReviewer('r3', 'clean'),
        }),
      ];

      const metrics = computeChallengeMetrics(challenges, 1000);

      expect(metrics.total_challenges).toBe(3);
      expect(metrics.labels_changed).toBe(2); // s1 and s3 changed
      expect(metrics.labels_confirmed).toBe(1); // s2 confirmed
      expect(metrics.challenge_rate).toBeCloseTo(0.003, 5);
      expect(metrics.by_module.get('mod-a')).toBe(2);
      expect(metrics.by_module.get('mod-b')).toBe(1);
    });

    it('should handle zero totalSamples safely', () => {
      const metrics = computeChallengeMetrics([], 0);
      expect(metrics.challenge_rate).toBe(0);
    });
  });

  describe('getLabelChanges', () => {
    it('should return only challenges with changed labels', () => {
      const challenges = [
        createChallenge({
          sample_id: 's1', module_id: 'mod', original_verdict: 'malicious', trigger_run_count: 3,
          reviewer_1: makeReviewer('r1', 'clean'), reviewer_2: makeReviewer('r2', 'clean'), reviewer_3: makeReviewer('r3', 'malicious'),
        }),
        createChallenge({
          sample_id: 's2', module_id: 'mod', original_verdict: 'malicious', trigger_run_count: 3,
          reviewer_1: makeReviewer('r1', 'malicious'), reviewer_2: makeReviewer('r2', 'malicious'), reviewer_3: makeReviewer('r3', 'clean'),
        }),
      ];

      const changes = getLabelChanges(challenges);
      expect(changes.length).toBe(1);
      expect(changes[0].sample_id).toBe('s1');
    });
  });
});
