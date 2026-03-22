/**
 * KATANA CAPA Integration Tests (K9.3)
 *
 * ISO 17025 Clause: 8.7 — Corrective Action / Preventive Action
 */

import { describe, it, expect } from 'vitest';
import {
  openCAPA,
  updateCAPAStatus,
  addRootCauseAnalysis,
  addCorrectiveActionPlan,
  recordImplementation,
  recordRevalidation,
  recordEffectivenessReview,
  detectValidationFailureTriggers,
  detectRegressionTriggers,
  detectSystematicRootCauseTriggers,
  detectCalibrationFailureTriggers,
  buildCAPAStore,
  getOpenCAPAs,
  getModuleCAPAs,
  validateCAPAClosure,
  allCAPAsClosed,
  getCAPAsDueForReview,
} from '../investigation/capa-integration.js';
import {
  SCHEMA_VERSION,
  CAPATriggerType,
  CAPAStatus,
  type DecisionRuleResult,
  type ValidationMetrics,
  type InvestigationRecord,
  type CalibrationCertificate,
  type EnvironmentSnapshot,
} from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDecision(moduleId: string, verdict: 'PASS' | 'FAIL', fp = 0, fn = 0): DecisionRuleResult {
  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    verdict,
    total_samples: 100,
    false_positives: fp,
    false_negatives: fn,
    non_conformities: [],
  };
}

function makeMetrics(moduleId: string, accuracy: number): ValidationMetrics {
  return {
    schema_version: SCHEMA_VERSION,
    module_id: moduleId,
    accuracy,
    precision: accuracy,
    recall: accuracy,
    f1: accuracy,
    mcc: accuracy,
    specificity: accuracy,
    fpr: 1 - accuracy,
    fnr: 1 - accuracy,
  };
}

function makeInvestigation(moduleId: string, rootCause: string): InvestigationRecord {
  return {
    schema_version: SCHEMA_VERSION,
    investigation_id: `inv-${Math.random().toString(36).slice(2, 8)}`,
    sample_id: `sample-${Math.random().toString(36).slice(2, 8)}`,
    module_id: moduleId,
    false_type: 'false_positive',
    root_cause: rootCause as any,
    fix_applied: 'test fix',
    revalidation_passed: true,
    iteration_count: 1,
    opened_at: new Date().toISOString(),
    closed_at: new Date().toISOString(),
  };
}

function makeEnv(): EnvironmentSnapshot {
  return {
    schema_version: SCHEMA_VERSION,
    os: { platform: 'darwin', release: '25.2.0', arch: 'arm64' },
    node: { version: 'v22.0.0', v8: '12.0.0' },
    cpu: { model: 'Apple M2', cores: 8 },
    memory: { total_mb: 16384 },
    locale: 'en-US',
    timezone: 'UTC',
    git: { hash: 'abc123', dirty: false, branch: 'main' },
    package_version: '1.0.0',
    timestamp: new Date().toISOString(),
  };
}

function makeCert(moduleId: string, result: 'PASS' | 'FAIL'): CalibrationCertificate {
  return {
    schema_version: SCHEMA_VERSION,
    certificate_id: `cert-${moduleId}`,
    module_id: moduleId,
    tool_build_hash: 'abc123',
    reference_set_version: 'v1',
    environment: makeEnv(),
    result,
    samples_tested: 20,
    samples_passed: result === 'PASS' ? 20 : 18,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('K9.3 — CAPA Integration', () => {
  describe('openCAPA', () => {
    it('should create a CAPA record with correct fields', () => {
      const capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, {
        module_id: 'enhanced-pi',
        run_id: 'run-001',
        description: 'Module enhanced-pi failed validation',
      });

      expect(capa.schema_version).toBe(SCHEMA_VERSION);
      expect(capa.capa_id).toMatch(/^capa-/);
      expect(capa.trigger_type).toBe('validation_failure');
      expect(capa.status).toBe(CAPAStatus.OPEN);
      expect(capa.trigger_context.module_id).toBe('enhanced-pi');
      expect(capa.trigger_context.description).toBe('Module enhanced-pi failed validation');
      expect(capa.opened_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should throw for empty description', () => {
      expect(() => openCAPA(CAPATriggerType.VALIDATION_FAILURE, {
        description: '',
      })).toThrow('description must be non-empty');
    });
  });

  describe('CAPA workflow transitions', () => {
    it('should follow valid status transitions', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, {
        description: 'test failure',
      });
      expect(capa.status).toBe(CAPAStatus.OPEN);

      capa = addRootCauseAnalysis(capa, 'Pattern gap in unicode handling');
      expect(capa.status).toBe(CAPAStatus.ROOT_CAUSE_ANALYSIS);

      capa = addCorrectiveActionPlan(capa, 'Add unicode normalization before pattern matching');
      expect(capa.status).toBe(CAPAStatus.ACTION_PLANNED);

      capa = recordImplementation(capa, 'Implemented unicode NFC normalization');
      expect(capa.status).toBe(CAPAStatus.IMPLEMENTING);

      capa = recordRevalidation(capa, 'run-002', true);
      expect(capa.status).toBe(CAPAStatus.EFFECTIVENESS_REVIEW);
      expect(capa.revalidation_passed).toBe(true);

      capa = recordEffectivenessReview(capa, 'No recurrence in 30 days');
      expect(capa.status).toBe(CAPAStatus.CLOSED);
      expect(capa.closed_at).toBeDefined();
    });

    it('should go back to implementing on failed revalidation', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      capa = addRootCauseAnalysis(capa, 'Analysis');
      capa = addCorrectiveActionPlan(capa, 'Plan');
      capa = recordImplementation(capa, 'First attempt');
      capa = recordRevalidation(capa, 'run-002', false);

      expect(capa.status).toBe(CAPAStatus.IMPLEMENTING);
      expect(capa.revalidation_passed).toBe(false);
    });

    it('should reject invalid status transitions', () => {
      const capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });

      expect(() => updateCAPAStatus(capa, CAPAStatus.IMPLEMENTING)).toThrow('Invalid CAPA status transition');
    });

    it('should throw for empty root cause analysis', () => {
      const capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      expect(() => addRootCauseAnalysis(capa, '')).toThrow('Root cause analysis must be non-empty');
    });

    it('should throw for empty corrective action plan', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      capa = addRootCauseAnalysis(capa, 'Analysis');
      expect(() => addCorrectiveActionPlan(capa, '')).toThrow('Corrective action plan must be non-empty');
    });

    it('should throw for empty implementation notes', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      capa = addRootCauseAnalysis(capa, 'Analysis');
      capa = addCorrectiveActionPlan(capa, 'Plan');
      expect(() => recordImplementation(capa, '')).toThrow('Implementation notes must be non-empty');
    });

    it('should throw for empty effectiveness review notes', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      capa = addRootCauseAnalysis(capa, 'A');
      capa = addCorrectiveActionPlan(capa, 'P');
      capa = recordImplementation(capa, 'I');
      capa = recordRevalidation(capa, 'r', true);
      expect(() => recordEffectivenessReview(capa, '')).toThrow('Effectiveness review notes must be non-empty');
    });

    it('should be immutable (not modify original)', () => {
      const original = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      const updated = addRootCauseAnalysis(original, 'Analysis');

      expect(original.status).toBe(CAPAStatus.OPEN);
      expect(updated.status).toBe(CAPAStatus.ROOT_CAUSE_ANALYSIS);
    });
  });

  describe('detectValidationFailureTriggers', () => {
    it('should create CAPAs for failed modules', () => {
      const decisions = new Map([
        ['mod-a', makeDecision('mod-a', 'FAIL', 2, 1)],
        ['mod-b', makeDecision('mod-b', 'PASS')],
      ]);

      const capas = detectValidationFailureTriggers(decisions, 'run-001');

      expect(capas.length).toBe(1);
      expect(capas[0].trigger_type).toBe('validation_failure');
      expect(capas[0].trigger_context.module_id).toBe('mod-a');
    });

    it('should handle all-passing decisions', () => {
      const decisions = new Map([
        ['mod-a', makeDecision('mod-a', 'PASS')],
      ]);

      const capas = detectValidationFailureTriggers(decisions, 'run-001');
      expect(capas.length).toBe(0);
    });
  });

  describe('detectRegressionTriggers', () => {
    it('should detect accuracy regression > 0.5%', () => {
      const current = new Map([['mod-a', makeMetrics('mod-a', 0.98)]]);
      const previous = new Map([['mod-a', makeMetrics('mod-a', 0.99)]]);

      const capas = detectRegressionTriggers(current, previous, 'run-002');

      expect(capas.length).toBe(1);
      expect(capas[0].trigger_type).toBe('regression');
    });

    it('should not trigger for small regressions', () => {
      const current = new Map([['mod-a', makeMetrics('mod-a', 0.994)]]);
      const previous = new Map([['mod-a', makeMetrics('mod-a', 0.995)]]);

      const capas = detectRegressionTriggers(current, previous, 'run-002');
      expect(capas.length).toBe(0);
    });

    it('should not trigger for improvements', () => {
      const current = new Map([['mod-a', makeMetrics('mod-a', 1.0)]]);
      const previous = new Map([['mod-a', makeMetrics('mod-a', 0.95)]]);

      const capas = detectRegressionTriggers(current, previous, 'run-002');
      expect(capas.length).toBe(0);
    });

    it('should skip modules not in previous run', () => {
      const current = new Map([['mod-new', makeMetrics('mod-new', 0.5)]]);
      const previous = new Map<string, ValidationMetrics>();

      const capas = detectRegressionTriggers(current, previous, 'run-002');
      expect(capas.length).toBe(0);
    });
  });

  describe('detectSystematicRootCauseTriggers', () => {
    it('should detect systematic issues (3+ same root cause per module)', () => {
      const investigations = [
        makeInvestigation('mod-a', 'pattern_gap'),
        makeInvestigation('mod-a', 'pattern_gap'),
        makeInvestigation('mod-a', 'pattern_gap'),
      ];

      const capas = detectSystematicRootCauseTriggers(investigations);

      expect(capas.length).toBe(1);
      expect(capas[0].trigger_type).toBe('systematic_root_cause');
    });

    it('should not trigger for mixed root causes', () => {
      const investigations = [
        makeInvestigation('mod-a', 'pattern_gap'),
        makeInvestigation('mod-a', 'threshold_issue'),
        makeInvestigation('mod-a', 'encoding_blind_spot'),
      ];

      const capas = detectSystematicRootCauseTriggers(investigations);
      expect(capas.length).toBe(0);
    });

    it('should handle custom threshold', () => {
      const investigations = [
        makeInvestigation('mod-a', 'pattern_gap'),
        makeInvestigation('mod-a', 'pattern_gap'),
      ];

      const capas = detectSystematicRootCauseTriggers(investigations, 2);
      expect(capas.length).toBe(1);
    });
  });

  describe('detectCalibrationFailureTriggers', () => {
    it('should create CAPAs for failed calibrations', () => {
      const certs = [
        makeCert('mod-a', 'FAIL'),
        makeCert('mod-b', 'PASS'),
      ];

      const capas = detectCalibrationFailureTriggers(certs);

      expect(capas.length).toBe(1);
      expect(capas[0].trigger_type).toBe('calibration_failure');
      expect(capas[0].trigger_context.module_id).toBe('mod-a');
    });
  });

  describe('buildCAPAStore', () => {
    it('should compute correct store statistics', () => {
      const records = [
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test 1' }),
        { ...openCAPA(CAPATriggerType.REGRESSION, { description: 'test 2' }), status: CAPAStatus.CLOSED as const, closed_at: new Date().toISOString() },
      ];

      const store = buildCAPAStore(records);

      expect(store.records.length).toBe(2);
      expect(store.open_count).toBe(1);
      expect(store.closed_count).toBe(1);
      expect(store.by_trigger.get('validation_failure')).toBe(1);
      expect(store.by_trigger.get('regression')).toBe(1);
    });
  });

  describe('getOpenCAPAs', () => {
    it('should return only open CAPAs', () => {
      const records = [
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'open' }),
        { ...openCAPA(CAPATriggerType.REGRESSION, { description: 'closed' }), status: CAPAStatus.CLOSED as const },
      ];

      const open = getOpenCAPAs(records);
      expect(open.length).toBe(1);
    });
  });

  describe('getModuleCAPAs', () => {
    it('should filter by module', () => {
      const records = [
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { module_id: 'mod-a', description: 'test' }),
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { module_id: 'mod-b', description: 'test' }),
      ];

      const modCAPAs = getModuleCAPAs(records, 'mod-a');
      expect(modCAPAs.length).toBe(1);
    });
  });

  describe('validateCAPAClosure', () => {
    it('should pass when all requirements met', () => {
      let capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });
      capa = { ...capa,
        root_cause_analysis: 'RCA',
        corrective_action_plan: 'Plan',
        implementation_notes: 'Done',
        revalidation_passed: true,
      };

      const result = validateCAPAClosure(capa);
      expect(result.valid).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it('should list missing requirements', () => {
      const capa = openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' });

      const result = validateCAPAClosure(capa);
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('root_cause_analysis');
      expect(result.missing).toContain('corrective_action_plan');
      expect(result.missing).toContain('implementation_notes');
      expect(result.missing).toContain('revalidation_passed');
    });
  });

  describe('allCAPAsClosed', () => {
    it('should return true when all closed', () => {
      const records = [
        { ...openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' }), status: CAPAStatus.CLOSED as const },
      ];
      expect(allCAPAsClosed(records)).toBe(true);
    });

    it('should return false when any open', () => {
      const records = [
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' }),
      ];
      expect(allCAPAsClosed(records)).toBe(false);
    });

    it('should return true for empty list', () => {
      expect(allCAPAsClosed([])).toBe(true);
    });
  });

  describe('getCAPAsDueForReview', () => {
    it('should return CAPAs opened > 30 days ago', () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const records = [
        { ...openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'old' }), opened_at: oldDate },
        openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'new' }),
      ];

      const due = getCAPAsDueForReview(records);
      expect(due.length).toBe(1);
      expect(due[0].trigger_context.description).toBe('old');
    });

    it('should not include closed CAPAs', () => {
      const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
      const records = [
        { ...openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'old closed' }), opened_at: oldDate, status: CAPAStatus.CLOSED as const },
      ];

      const due = getCAPAsDueForReview(records);
      expect(due.length).toBe(0);
    });

    it('should support custom review days', () => {
      const fiveDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
      const records = [
        { ...openCAPA(CAPATriggerType.VALIDATION_FAILURE, { description: 'test' }), opened_at: fiveDaysAgo },
      ];

      const due = getCAPAsDueForReview(records, 5);
      expect(due.length).toBe(1);
    });
  });
});
