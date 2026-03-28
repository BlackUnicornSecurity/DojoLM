# KATANA-POL-002 — Access Control & Separation of Duties

Generated: 2026-03-28T19:01:31.640Z

## Metadata

- Category: policy
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: Security Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 4.1
- Source of Record: `src/validation/governance/access-control.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-POL-002.ts`
- Frozen Source SHA-256: `0419f81f69d9d747103c57b5b15a4b532c5c500762d68c1de8252bab071d09cb`

## Description

Role definitions, SoD rules, branch protections, audit schedules.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

## Frozen rendered access control model

Frozen snapshot path: `validation/reports/controlled-documents/rendered/KATANA-POL-002.md`

# KATANA Access Control & Separation of Duties

**Document ID:** KATANA-AC-001
**Generated:** 2026-03-28T19:01:31.654Z
**ISO 17025 Clause:** 4.1 (Impartiality)

## Roles

| ID | Name | Permissions |
|-----|------|------------|
| sample-creator | Sample Creator | create_sample |
| corpus-curator | Corpus Curator | label_sample, review_label, challenge_label |
| validation-operator | Validation Operator | run_validation, modify_calibration |
| report-reviewer | Report Reviewer | approve_report, close_capa |
| key-custodian | Key Custodian | manage_keys |
| auditor | Auditor | audit_corpus |

## Separation of Duties Rules

| ID | Rule | Prohibited Combination |
|-----|------|------------------------|
| SOD-01 | No single person can create a sample AND label that sample. | create_sample + label_sample |
| SOD-02 | No single person can label a sample AND run validation using that sample. | label_sample + run_validation |
| SOD-03 | No single person can run validation AND approve the resulting report. | run_validation + approve_report |
| SOD-04 | No single person can manage keys AND run validation. | manage_keys + run_validation |
| SOD-05 | No single person can create a sample, label it, run validation, AND approve the report. | create_sample + label_sample + run_validation + approve_report |

## Branch Protections

| Path | Min Approvals | Required Reviewers |
|------|---------------|-------------------|
| validation/corpus/ground-truth/** | 2 | corpus-curator, report-reviewer |
| validation/calibration/reference-sets/** | 2 | validation-operator, report-reviewer |
| validation/corpus/holdout/** | 2 | corpus-curator, auditor |
| src/validation/** | 1 | validation-operator |

## Audit Schedules

| ID | Name | Frequency | Sample Size |
|-----|------|-----------|------------|
| AUDIT-01 | Quarterly Corpus Label Audit | quarterly | 50 |
| AUDIT-02 | Annual Key Rotation Review | annual | N/A |
| AUDIT-03 | Quarterly Dependency Review | quarterly | N/A |


## Source Record Snapshot

```ts
/**
 * KATANA Access Control & Separation of Duties (K10.3)
 *
 * Defines roles, permissions, and separation of duties for the
 * validation framework to satisfy ISO 17025 Clause 4.1 (Impartiality).
 *
 * ISO 17025 Clause: 4.1
 */

import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
}

export type Permission =
  | 'create_sample'
  | 'label_sample'
  | 'review_label'
  | 'run_validation'
  | 'approve_report'
  | 'manage_keys'
  | 'modify_calibration'
  | 'modify_holdout'
  | 'challenge_label'
  | 'close_capa'
  | 'audit_corpus';

export interface SeparationRule {
  readonly id: string;
  readonly description: string;
  readonly prohibited_combination: readonly Permission[];
  readonly rationale: string;
}

export interface BranchProtection {
  readonly path_pattern: string;
  readonly min_approvals: number;
  readonly required_reviewers: readonly string[];
  readonly description: string;
}

export interface AuditSchedule {
  readonly id: string;
  readonly name: string;
  readonly frequency: 'quarterly' | 'annual';
  readonly description: string;
  readonly sample_size: number;
}

export interface AccessControlModel {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly document_id: string;
  readonly generated_at: string;
  readonly roles: readonly Role[];
  readonly separation_rules: readonly SeparationRule[];
  readonly branch_protections: readonly BranchProtection[];
  readonly audit_schedules: readonly AuditSchedule[];
}

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES: readonly Role[] = [
  {
    id: 'sample-creator',
    name: 'Sample Creator',
    description: 'Creates new ground truth samples. Cannot label, run validation, or approve reports.',
    permissions: ['create_sample'],
  },
  {
    id: 'corpus-curator',
    name: 'Corpus Curator',
    description: 'Labels, reviews, and manages ground truth samples. Cannot create samples, run validation, or approve reports.',
    permissions: ['label_sample', 'review_label', 'challenge_label'],
  },
  {
    id: 'validation-operator',
    name: 'Validation Operator',
    description: 'Executes validation runs and calibration. Cannot create/modify samples or approve reports.',
    permissions: ['run_validation', 'modify_calibration'],
  },
  {
    id: 'report-reviewer',
    name: 'Report Reviewer',
    description: 'Reviews and approves validation reports. Cannot create samples or run validation.',
    permissions: ['approve_report', 'close_capa'],
  },
  {
    id: 'key-custodian',
    name: 'Key Custodian',
    description: 'Manages cryptographic keys. Separate from all other validation roles.',
    permissions: ['manage_keys'],
  },
  {
    id: 'auditor',
    name: 'Auditor',
    description: 'Performs quarterly corpus label audits. Independent of labeling and validation.',
    permissions: ['audit_corpus'],
  },
] as const;

// ---------------------------------------------------------------------------
// Separation of Duties Rules
// ---------------------------------------------------------------------------

export const SEPARATION_RULES: readonly SeparationRule[] = [
  {
    id: 'SOD-01',
    description: 'No single person can create a sample AND label that sample.',
    prohibited_combination: ['create_sample', 'label_sample'],
    rationale: 'ISO 4.1: Prevents self-validation of sample quality.',
  },
  {
    id: 'SOD-02',
    description: 'No single person can label a sample AND run validation using that sample.',
    prohibited_combination: ['label_sample', 'run_validation'],
    rationale: 'ISO 4.1: Prevents biased labeling to achieve desired validation outcomes.',
  },
  {
    id: 'SOD-03',
    description: 'No single person can run validation AND approve the resulting report.',
    prohibited_combination: ['run_validation', 'approve_report'],
    rationale: 'ISO 4.1: Prevents self-certification of results.',
  },
  {
    id: 'SOD-04',
    description: 'No single person can manage keys AND run validation.',
    prohibited_combination: ['manage_keys', 'run_validation'],
    rationale: 'ISO 4.1: Prevents key holder from tampering with signed results.',
  },
  {
    id: 'SOD-05',
    description: 'No single person can create a sample, label it, run validation, AND approve the report.',
    prohibited_combination: ['create_sample', 'label_sample', 'run_validation', 'approve_report'],
    rationale: 'ISO 4.1: Full chain independence required. No single person controls the entire pipeline.',
  },
] as const;

// ---------------------------------------------------------------------------
// Branch Protection
// ---------------------------------------------------------------------------

export const BRANCH_PROTECTIONS: readonly BranchProtection[] = [
  {
    path_pattern: 'validation/corpus/ground-truth/**',
    min_approvals: 2,
    required_reviewers: ['corpus-curator', 'report-reviewer'],
    description: 'Ground truth changes require 2 approvals from different roles.',
  },
  {
    path_pattern: 'validation/calibration/reference-sets/**',
    min_approvals: 2,
    required_reviewers: ['validation-operator', 'report-reviewer'],
    description: 'Reference set changes require 2 approvals from different roles.',
  },
  {
    path_pattern: 'validation/corpus/holdout/**',
    min_approvals: 2,
    required_reviewers: ['corpus-curator', 'auditor'],
    description: 'Holdout set changes require 2 approvals including auditor.',
  },
  {
    path_pattern: 'src/validation/**',
    min_approvals: 1,
    required_reviewers: ['validation-operator'],
    description: 'Validation framework code changes require review.',
  },
] as const;

// ---------------------------------------------------------------------------
// Audit Schedules
// ---------------------------------------------------------------------------

export const AUDIT_SCHEDULES: readonly AuditSchedule[] = [
  {
    id: 'AUDIT-01',
    name: 'Quarterly Corpus Label Audit',
    frequency: 'quarterly',
    description: 'Random sample of 50 ground truth labels verified by independent reviewer (K11.2).',
    sample_size: 50,
  },
  {
    id: 'AUDIT-02',
    name: 'Annual Key Rotation Review',
    frequency: 'annual',
    description: 'Review and rotate HMAC and Ed25519 keys. Verify no key material in code or logs.',
    sample_size: 0,
  },
  {
    id: 'AUDIT-03',
    name: 'Quarterly Dependency Review',
    frequency: 'quarterly',
    description: 'Review pinned dependency versions, run npm audit, regenerate SBOM.',
    sample_size: 0,
  },
] as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildAccessControlModel(): AccessControlModel {
  return {
    schema_version: SCHEMA_VERSION,
    document_id: 'KATANA-AC-001',
    generated_at: new Date().toISOString(),
    roles: ROLES,
    separation_rules: SEPARATION_RULES,
    branch_protections: BRANCH_PROTECTIONS,
    audit_schedules: AUDIT_SCHEDULES,
  };
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

export interface SoDViolation {
  readonly rule_id: string;
  readonly description: string;
  readonly violating_permissions: readonly Permission[];
}

/**
 * Check if a set of permissions violates any separation of duties rules.
 */
export function checkSoDViolations(
  userPermissions: readonly Permission[],
): readonly SoDViolation[] {
  const permSet = new Set(userPermissions);
  const violations: SoDViolation[] = [];

  for (const rule of SEPARATION_RULES) {
    const hasAll = rule.prohibited_combination.every(p => permSet.has(p));
    if (hasAll) {
      violations.push({
        rule_id: rule.id,
        description: rule.description,
        violating_permissions: rule.prohibited_combination,
      });
    }
  }

  return violations;
}

/**
 * Validate that no role violates separation of duties rules.
 */
export function validateRoleSoD(
  roles: readonly Role[],
): readonly SoDViolation[] {
  const violations: SoDViolation[] = [];

  for (const role of roles) {
    const roleViolations = checkSoDViolations(role.permissions);
    for (const v of roleViolations) {
      violations.push({
        ...v,
        description: `Role "${role.name}" violates: ${v.description}`,
      });
    }
  }

  return violations;
}

/**
 * Get permissions for a user with multiple roles (union of all role permissions).
 */
export function getEffectivePermissions(
  roleIds: readonly string[],
  allRoles: readonly Role[] = ROLES,
): readonly Permission[] {
  const roleMap = new Map(allRoles.map(r => [r.id, r]));
  const permSet = new Set<Permission>();

  for (const roleId of roleIds) {
    const role = roleMap.get(roleId);
    if (role) {
      for (const perm of role.permissions) {
        permSet.add(perm);
      }
    }
  }

  return [...permSet];
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportAccessControlMarkdown(model: AccessControlModel): string {
  const lines: string[] = [
    '# KATANA Access Control & Separation of Duties',
    '',
    `**Document ID:** ${model.document_id}`,
    `**Generated:** ${model.generated_at}`,
    `**ISO 17025 Clause:** 4.1 (Impartiality)`,
    '',
    '## Roles',
    '',
    '| ID | Name | Permissions |',
    '|-----|------|------------|',
  ];

  for (const role of model.roles) {
    lines.push(`| ${role.id} | ${role.name} | ${role.permissions.join(', ')} |`);
  }

  lines.push('', '## Separation of Duties Rules', '', '| ID | Rule | Prohibited Combination |', '|-----|------|------------------------|');
  for (const rule of model.separation_rules) {
    lines.push(`| ${rule.id} | ${rule.description} | ${rule.prohibited_combination.join(' + ')} |`);
  }

  lines.push('', '## Branch Protections', '', '| Path | Min Approvals | Required Reviewers |', '|------|---------------|-------------------|');
  for (const bp of model.branch_protections) {
    lines.push(`| ${bp.path_pattern} | ${bp.min_approvals} | ${bp.required_reviewers.join(', ')} |`);
  }

  lines.push('', '## Audit Schedules', '', '| ID | Name | Frequency | Sample Size |', '|-----|------|-----------|------------|');
  for (const audit of model.audit_schedules) {
    lines.push(`| ${audit.id} | ${audit.name} | ${audit.frequency} | ${audit.sample_size || 'N/A'} |`);
  }

  lines.push('');
  return lines.join('\n');
}

```
