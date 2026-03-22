/**
 * KATANA Investigation Protocol Tests (K9.1)
 *
 * ISO 17025 Clause: 7.10 — Non-conforming work
 */

import { describe, it, expect } from 'vitest';
import {
  openInvestigation,
  updateInvestigation,
  reopenInvestigation,
  closeInvestigation,
  openInvestigationsFromDecisions,
  buildInvestigationStore,
  getOpenInvestigations,
  getModuleInvestigations,
  getSampleInvestigations,
  countByRootCause,
  allInvestigationsClosed,
  validateNoWontFix,
} from '../investigation/investigation-protocol.js';
import { SCHEMA_VERSION, type InvestigationRecord, type DecisionRuleResult } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecisionResult(overrides: Partial<DecisionRuleResult> = {}): DecisionRuleResult {
  return {
    schema_version: SCHEMA_VERSION,
    module_id: 'test-module',
    verdict: 'FAIL',
    total_samples: 100,
    false_positives: 1,
    false_negatives: 1,
    non_conformities: [
      { sample_id: 'fp-1', type: 'false_positive', expected: 'clean', actual: 'malicious' },
      { sample_id: 'fn-1', type: 'false_negative', expected: 'malicious', actual: 'clean' },
    ],
    ...overrides,
  };
}

function makeClosedInvestigation(): InvestigationRecord {
  return {
    schema_version: SCHEMA_VERSION,
    investigation_id: 'inv-001',
    sample_id: 'sample-1',
    module_id: 'test-module',
    false_type: 'false_positive',
    root_cause: 'pattern_gap',
    fix_applied: 'Added pattern for edge case',
    revalidation_passed: true,
    iteration_count: 2,
    opened_at: '2026-03-01T00:00:00.000Z',
    closed_at: '2026-03-02T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K9.1 — FP/FN Investigation Protocol', () => {
  describe('openInvestigation', () => {
    it('should create an investigation record with correct fields', () => {
      const record = openInvestigation({
        sample_id: 'sample-123',
        module_id: 'enhanced-pi',
        false_type: 'false_positive',
        expected_verdict: 'clean',
        actual_verdict: 'malicious',
      });

      expect(record.schema_version).toBe(SCHEMA_VERSION);
      expect(record.investigation_id).toMatch(/^inv-/);
      expect(record.sample_id).toBe('sample-123');
      expect(record.module_id).toBe('enhanced-pi');
      expect(record.false_type).toBe('false_positive');
      expect(record.iteration_count).toBe(1);
      expect(record.revalidation_passed).toBe(false);
      expect(record.closed_at).toBeUndefined();
      expect(record.opened_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw for empty sample_id', () => {
      expect(() => openInvestigation({
        sample_id: '',
        module_id: 'test',
        false_type: 'false_positive',
        expected_verdict: 'clean',
        actual_verdict: 'malicious',
      })).toThrow('sample_id must be non-empty');
    });

    it('should throw for empty module_id', () => {
      expect(() => openInvestigation({
        sample_id: 'test',
        module_id: '',
        false_type: 'false_positive',
        expected_verdict: 'clean',
        actual_verdict: 'malicious',
      })).toThrow('module_id must be non-empty');
    });

    it('should generate unique investigation IDs', () => {
      const r1 = openInvestigation({
        sample_id: 's1', module_id: 'm1',
        false_type: 'false_positive', expected_verdict: 'clean', actual_verdict: 'malicious',
      });
      const r2 = openInvestigation({
        sample_id: 's2', module_id: 'm1',
        false_type: 'false_negative', expected_verdict: 'malicious', actual_verdict: 'clean',
      });

      expect(r1.investigation_id).not.toBe(r2.investigation_id);
    });
  });

  describe('updateInvestigation', () => {
    it('should update root cause and fix, increment iteration', () => {
      const original = openInvestigation({
        sample_id: 's1', module_id: 'm1',
        false_type: 'false_positive', expected_verdict: 'clean', actual_verdict: 'malicious',
      });

      const updated = updateInvestigation(original, {
        root_cause: 'encoding_blind_spot',
        fix_applied: 'Added UTF-16 decoder',
        revalidation_passed: true,
      });

      expect(updated.root_cause).toBe('encoding_blind_spot');
      expect(updated.fix_applied).toBe('Added UTF-16 decoder');
      expect(updated.revalidation_passed).toBe(true);
      expect(updated.iteration_count).toBe(original.iteration_count + 1);
      expect(updated.closed_at).toBeDefined();
    });

    it('should not close if revalidation failed', () => {
      const original = openInvestigation({
        sample_id: 's1', module_id: 'm1',
        false_type: 'false_positive', expected_verdict: 'clean', actual_verdict: 'malicious',
      });

      const updated = updateInvestigation(original, {
        root_cause: 'pattern_gap',
        fix_applied: 'First attempt fix',
        revalidation_passed: false,
      });

      expect(updated.closed_at).toBeUndefined();
      expect(updated.revalidation_passed).toBe(false);
    });

    it('should be immutable (not modify original)', () => {
      const original = openInvestigation({
        sample_id: 's1', module_id: 'm1',
        false_type: 'false_positive', expected_verdict: 'clean', actual_verdict: 'malicious',
      });
      const originalId = original.investigation_id;

      updateInvestigation(original, {
        root_cause: 'threshold_issue',
        fix_applied: 'Lowered threshold',
        revalidation_passed: true,
      });

      expect(original.investigation_id).toBe(originalId);
      expect(original.root_cause).toBe('pattern_gap'); // placeholder
    });
  });

  describe('reopenInvestigation', () => {
    it('should reopen a closed investigation', () => {
      const closed = makeClosedInvestigation();
      const reopened = reopenInvestigation(closed);

      expect(reopened.revalidation_passed).toBe(false);
      expect(reopened.closed_at).toBeUndefined();
      expect(reopened.iteration_count).toBe(closed.iteration_count + 1);
    });
  });

  describe('closeInvestigation', () => {
    it('should close an investigation with passed revalidation', () => {
      const record: InvestigationRecord = {
        ...makeClosedInvestigation(),
        closed_at: undefined,
        revalidation_passed: true,
      };

      const closed = closeInvestigation(record);
      expect(closed.closed_at).toBeDefined();
    });

    it('should throw if revalidation not passed', () => {
      const record: InvestigationRecord = {
        ...makeClosedInvestigation(),
        closed_at: undefined,
        revalidation_passed: false,
      };

      expect(() => closeInvestigation(record)).toThrow('revalidation has not passed');
    });
  });

  describe('openInvestigationsFromDecisions', () => {
    it('should create investigations for all non-conformities', () => {
      const decisions = new Map([
        ['test-module', makeDecisionResult()],
      ]);

      const investigations = openInvestigationsFromDecisions(decisions);

      expect(investigations.length).toBe(2);
      expect(investigations[0].false_type).toBe('false_positive');
      expect(investigations[1].false_type).toBe('false_negative');
    });

    it('should skip passing modules', () => {
      const decisions = new Map([
        ['pass-module', makeDecisionResult({
          verdict: 'PASS',
          false_positives: 0,
          false_negatives: 0,
          non_conformities: [],
        })],
      ]);

      const investigations = openInvestigationsFromDecisions(decisions);
      expect(investigations.length).toBe(0);
    });

    it('should handle multiple modules', () => {
      const decisions = new Map([
        ['mod-a', makeDecisionResult({ module_id: 'mod-a' })],
        ['mod-b', makeDecisionResult({ module_id: 'mod-b', non_conformities: [
          { sample_id: 'fp-2', type: 'false_positive', expected: 'clean', actual: 'malicious' },
        ] })],
      ]);

      const investigations = openInvestigationsFromDecisions(decisions);
      expect(investigations.length).toBe(3); // 2 from mod-a + 1 from mod-b
    });
  });

  describe('buildInvestigationStore', () => {
    it('should compute correct counts', () => {
      const records = [
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), investigation_id: 'inv-002', closed_at: undefined },
      ];

      const store = buildInvestigationStore(records);

      expect(store.records.length).toBe(2);
      expect(store.open_count).toBe(1);
      expect(store.closed_count).toBe(1);
      expect(store.total_iterations).toBe(4); // 2 + 2
    });
  });

  describe('getOpenInvestigations', () => {
    it('should return only open investigations', () => {
      const records = [
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), investigation_id: 'inv-002', closed_at: undefined },
      ];

      const open = getOpenInvestigations(records);
      expect(open.length).toBe(1);
      expect(open[0].investigation_id).toBe('inv-002');
    });
  });

  describe('getModuleInvestigations', () => {
    it('should filter by module', () => {
      const records = [
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), investigation_id: 'inv-002', module_id: 'other-module' },
      ];

      const modInvestigations = getModuleInvestigations(records, 'test-module');
      expect(modInvestigations.length).toBe(1);
    });
  });

  describe('getSampleInvestigations', () => {
    it('should filter by sample', () => {
      const records = [
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), investigation_id: 'inv-002', sample_id: 'sample-2' },
      ];

      const sampleInvestigations = getSampleInvestigations(records, 'sample-1');
      expect(sampleInvestigations.length).toBe(1);
    });
  });

  describe('countByRootCause', () => {
    it('should group by root cause', () => {
      const records = [
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), investigation_id: 'inv-002', root_cause: 'pattern_gap' as const },
        { ...makeClosedInvestigation(), investigation_id: 'inv-003', root_cause: 'threshold_issue' as const },
      ];

      const counts = countByRootCause(records);
      expect(counts.get('pattern_gap')).toBe(2);
      expect(counts.get('threshold_issue')).toBe(1);
    });
  });

  describe('allInvestigationsClosed', () => {
    it('should return true when all are closed', () => {
      expect(allInvestigationsClosed([makeClosedInvestigation()])).toBe(true);
    });

    it('should return false when any is open', () => {
      expect(allInvestigationsClosed([
        makeClosedInvestigation(),
        { ...makeClosedInvestigation(), closed_at: undefined },
      ])).toBe(false);
    });

    it('should return true for empty list', () => {
      expect(allInvestigationsClosed([])).toBe(true);
    });
  });

  describe('validateNoWontFix', () => {
    it('should pass for proper fixes', () => {
      const result = validateNoWontFix([makeClosedInvestigation()]);
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it('should flag "won\'t fix" entries', () => {
      const record = { ...makeClosedInvestigation(), fix_applied: "Won't fix — edge case" };
      const result = validateNoWontFix([record]);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBe(1);
    });

    it('should flag "deferred" entries', () => {
      const record = { ...makeClosedInvestigation(), fix_applied: 'Deferred to next sprint' };
      const result = validateNoWontFix([record]);
      expect(result.valid).toBe(false);
    });

    it('should flag "accepted risk" entries', () => {
      const record = { ...makeClosedInvestigation(), fix_applied: 'Accepted risk — low impact' };
      const result = validateNoWontFix([record]);
      expect(result.valid).toBe(false);
    });
  });
});
