/**
 * K10.3 — Access Control & Separation of Duties Tests
 */
import { describe, it, expect } from 'vitest';
import {
  ROLES,
  SEPARATION_RULES,
  BRANCH_PROTECTIONS,
  AUDIT_SCHEDULES,
  buildAccessControlModel,
  checkSoDViolations,
  validateRoleSoD,
  getEffectivePermissions,
  exportAccessControlMarkdown,
} from '../governance/access-control.js';
import type { Permission, Role } from '../governance/access-control.js';
import { SCHEMA_VERSION } from '../types.js';

describe('K10.3 — Access Control & Separation of Duties', () => {
  describe('Role Definitions', () => {
    it('should define at least 6 roles', () => {
      expect(ROLES.length).toBeGreaterThanOrEqual(6);
    });

    it('should have unique role IDs', () => {
      const ids = ROLES.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should define sample-creator role', () => {
      const creator = ROLES.find(r => r.id === 'sample-creator');
      expect(creator).toBeDefined();
      expect(creator!.permissions).toContain('create_sample');
      expect(creator!.permissions).not.toContain('label_sample');
    });

    it('should define corpus-curator role', () => {
      const curator = ROLES.find(r => r.id === 'corpus-curator');
      expect(curator).toBeDefined();
      expect(curator!.permissions).toContain('label_sample');
      expect(curator!.permissions).not.toContain('create_sample');
      expect(curator!.permissions).not.toContain('run_validation');
      expect(curator!.permissions).not.toContain('approve_report');
    });

    it('should define validation-operator role', () => {
      const operator = ROLES.find(r => r.id === 'validation-operator');
      expect(operator).toBeDefined();
      expect(operator!.permissions).toContain('run_validation');
      expect(operator!.permissions).not.toContain('create_sample');
      expect(operator!.permissions).not.toContain('approve_report');
    });

    it('should define report-reviewer role', () => {
      const reviewer = ROLES.find(r => r.id === 'report-reviewer');
      expect(reviewer).toBeDefined();
      expect(reviewer!.permissions).toContain('approve_report');
      expect(reviewer!.permissions).not.toContain('run_validation');
      expect(reviewer!.permissions).not.toContain('create_sample');
    });

    it('should define key-custodian with only manage_keys', () => {
      const custodian = ROLES.find(r => r.id === 'key-custodian');
      expect(custodian).toBeDefined();
      expect(custodian!.permissions).toEqual(['manage_keys']);
    });
  });

  describe('Separation of Duties Rules', () => {
    it('should define at least 5 SoD rules', () => {
      expect(SEPARATION_RULES.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique rule IDs', () => {
      const ids = SEPARATION_RULES.map(r => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should prohibit create_sample + label_sample', () => {
      const rule = SEPARATION_RULES.find(r =>
        r.prohibited_combination.includes('create_sample') &&
        r.prohibited_combination.includes('label_sample')
      );
      expect(rule).toBeDefined();
    });

    it('should prohibit run_validation + approve_report', () => {
      const rule = SEPARATION_RULES.find(r =>
        r.prohibited_combination.includes('run_validation') &&
        r.prohibited_combination.includes('approve_report')
      );
      expect(rule).toBeDefined();
    });

    it('should prohibit manage_keys + run_validation', () => {
      const rule = SEPARATION_RULES.find(r =>
        r.prohibited_combination.includes('manage_keys') &&
        r.prohibited_combination.includes('run_validation')
      );
      expect(rule).toBeDefined();
    });
  });

  describe('checkSoDViolations', () => {
    it('should return no violations for single permission', () => {
      const violations = checkSoDViolations(['run_validation']);
      expect(violations).toEqual([]);
    });

    it('should detect create_sample + label_sample violation', () => {
      const violations = checkSoDViolations(['create_sample', 'label_sample']);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      expect(violations[0].rule_id).toBe('SOD-01');
    });

    it('should detect run_validation + approve_report violation', () => {
      const violations = checkSoDViolations(['run_validation', 'approve_report']);
      expect(violations.length).toBeGreaterThanOrEqual(1);
      const found = violations.find(v => v.rule_id === 'SOD-03');
      expect(found).toBeDefined();
    });

    it('should detect the full pipeline violation', () => {
      const violations = checkSoDViolations([
        'create_sample', 'label_sample', 'run_validation', 'approve_report',
      ]);
      const fullPipeline = violations.find(v => v.rule_id === 'SOD-05');
      expect(fullPipeline).toBeDefined();
    });

    it('should return no violations for non-overlapping permissions', () => {
      const violations = checkSoDViolations(['run_validation', 'audit_corpus']);
      expect(violations).toEqual([]);
    });
  });

  describe('validateRoleSoD', () => {
    it('should validate default roles have no SoD violations', () => {
      const violations = validateRoleSoD(ROLES);
      expect(violations).toEqual([]);
    });

    it('should detect violations in poorly designed roles', () => {
      const badRoles: Role[] = [{
        id: 'superuser',
        name: 'Superuser',
        description: 'Has all permissions',
        permissions: ['create_sample', 'label_sample', 'run_validation', 'approve_report', 'manage_keys'],
      }];
      const violations = validateRoleSoD(badRoles);
      expect(violations.length).toBeGreaterThan(0);
    });
  });

  describe('getEffectivePermissions', () => {
    it('should return empty for unknown role IDs', () => {
      const perms = getEffectivePermissions(['nonexistent']);
      expect(perms).toEqual([]);
    });

    it('should return single role permissions', () => {
      const perms = getEffectivePermissions(['corpus-curator']);
      expect(perms).toContain('label_sample');
      expect(perms).toContain('review_label');
    });

    it('should merge permissions from multiple roles', () => {
      const perms = getEffectivePermissions(['corpus-curator', 'validation-operator']);
      expect(perms).toContain('label_sample');
      expect(perms).toContain('run_validation');
    });

    it('should deduplicate permissions', () => {
      const perms = getEffectivePermissions(['corpus-curator', 'corpus-curator']);
      const uniquePerms = new Set(perms);
      expect(uniquePerms.size).toBe(perms.length);
    });
  });

  describe('Branch Protections', () => {
    it('should protect ground-truth path', () => {
      const gt = BRANCH_PROTECTIONS.find(bp => bp.path_pattern.includes('ground-truth'));
      expect(gt).toBeDefined();
      expect(gt!.min_approvals).toBeGreaterThanOrEqual(2);
    });

    it('should protect reference-sets path', () => {
      const rs = BRANCH_PROTECTIONS.find(bp => bp.path_pattern.includes('reference-sets'));
      expect(rs).toBeDefined();
      expect(rs!.min_approvals).toBeGreaterThanOrEqual(2);
    });

    it('should protect holdout path', () => {
      const ho = BRANCH_PROTECTIONS.find(bp => bp.path_pattern.includes('holdout'));
      expect(ho).toBeDefined();
      expect(ho!.min_approvals).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Audit Schedules', () => {
    it('should include quarterly corpus label audit', () => {
      const audit = AUDIT_SCHEDULES.find(a => a.frequency === 'quarterly' && a.name.includes('Label'));
      expect(audit).toBeDefined();
      expect(audit!.sample_size).toBe(50);
    });

    it('should include annual key rotation', () => {
      const audit = AUDIT_SCHEDULES.find(a => a.frequency === 'annual' && a.name.includes('Key'));
      expect(audit).toBeDefined();
    });
  });

  describe('buildAccessControlModel', () => {
    it('should produce a valid model', () => {
      const model = buildAccessControlModel();
      expect(model.schema_version).toBe(SCHEMA_VERSION);
      expect(model.document_id).toBe('KATANA-AC-001');
      expect(model.roles.length).toBeGreaterThanOrEqual(5);
      expect(model.separation_rules.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('exportAccessControlMarkdown', () => {
    it('should produce markdown with all sections', () => {
      const model = buildAccessControlModel();
      const md = exportAccessControlMarkdown(model);
      expect(md).toContain('# KATANA Access Control');
      expect(md).toContain('## Roles');
      expect(md).toContain('## Separation of Duties');
      expect(md).toContain('## Branch Protections');
      expect(md).toContain('## Audit Schedules');
      expect(md).toContain('ISO 17025 Clause:**');
    });
  });
});
