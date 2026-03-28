# KATANA-REC-001 — Controlled Document Register

Generated: 2026-03-28T13:35:50.103Z

## Metadata

- Category: record
- Version: 1.0.0
- Author: KATANA Team
- Reviewer: QA Lead
- Approval Date: 2026-03-21
- Effective Date: 2026-03-21
- ISO Clauses: 8.3
- Source of Record: `src/validation/governance/document-register.ts`
- Frozen Source Snapshot: `validation/reports/controlled-documents/source-records/KATANA-REC-001.ts`
- Frozen Source SHA-256: `7a1f0955a3f74513db30ea5bc2ba3d370820c35e1d103174f5698fd19780756a`

## Description

This register. Tracks all controlled documents with version history.

## Change History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

## Frozen rendered document register

Frozen snapshot path: `validation/reports/controlled-documents/rendered/KATANA-REC-001.md`

# KATANA Controlled Document Register

**Register ID:** KATANA-REG-001
**Generated:** 2026-03-28T13:35:50.103Z
**ISO 17025 Clause:** 8.3 (Control of management system documents)

## Documents

| ID | Title | Category | Version | ISO Clauses | Effective Date |
|-----|-------|----------|---------|-------------|----------------|
| KATANA-PROC-001 | Ground Truth Labeling Procedure | procedure | 1.0.0 | 6.5, 7.2.1 | 2026-03-21 |
| KATANA-PROC-002 | Calibration Protocol | procedure | 1.0.0 | 6.4, 6.5 | 2026-03-21 |
| KATANA-PROC-003 | Validation Runner Procedure | procedure | 1.0.0 | 7.2.2, 7.6, 7.8.6 | 2026-03-21 |
| KATANA-PROC-004 | FP/FN Investigation Protocol | procedure | 1.0.0 | 7.10 | 2026-03-21 |
| KATANA-PROC-005 | CAPA Workflow | procedure | 1.0.0 | 8.7 | 2026-03-21 |
| KATANA-PROC-006 | Ground Truth Challenge Process | procedure | 1.0.0 | 7.10 | 2026-03-21 |
| KATANA-REF-001 | Module Taxonomy | reference | 1.0.0 | 7.2.1 | 2026-03-21 |
| KATANA-REF-002 | Decision Rules Documentation | reference | 1.0.0 | 7.8.6 | 2026-03-21 |
| KATANA-REF-003 | Uncertainty Estimation Method | reference | 1.0.0 | 7.6 | 2026-03-21 |
| KATANA-TMPL-001 | Validation Report Template | template | 1.0.0 | 7.8.6 | 2026-03-21 |
| KATANA-TMPL-002 | Dashboard Export Template | template | 1.0.0 | 7.7 | 2026-03-21 |
| KATANA-POL-001 | Threat Model | policy | 1.0.0 | 4.1 | 2026-03-21 |
| KATANA-POL-002 | Access Control & Separation of Duties | policy | 1.0.0 | 4.1 | 2026-03-21 |
| KATANA-REC-001 | Controlled Document Register | record | 1.0.0 | 8.3 | 2026-03-21 |
| KATANA-PROC-007 | Corpus Label Audit Procedure | procedure | 1.0.0 | 8.8 | 2026-03-21 |

## Document Details

### KATANA-PROC-001 — Ground Truth Labeling Procedure

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/corpus/fixture-labeler.ts`
- **Description:** Procedure for auto-labeling fixtures with ground-truth metadata including dual-reviewer verification.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-002 — Calibration Protocol

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/calibration/calibration-protocol.ts`
- **Description:** Pre-validation calibration procedure with Ed25519 signed certificates and git-hash-based validity.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-003 — Validation Runner Procedure

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/runner/validation-runner.ts`
- **Description:** Core validation procedure: corpus loading, HMAC verification, sample processing, confusion matrix computation.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-004 — FP/FN Investigation Protocol

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/investigation/investigation-protocol.ts`
- **Description:** Investigation procedure for false positive and false negative results. No "won't fix" allowed.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-005 — CAPA Workflow

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/investigation/capa-integration.ts`
- **Description:** Corrective and preventive action procedure with status machine workflow.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-006 — Ground Truth Challenge Process

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/investigation/ground-truth-challenge.ts`
- **Description:** Formal 3-reviewer majority vote process for disputed ground truth labels.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-REF-001 — Module Taxonomy

- **Category:** reference
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** Architect
- **File:** `validation/taxonomy/module-taxonomy.json`
- **Description:** Module classification: tier assignments, capability declarations, detection categories.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release with 29 modules |

### KATANA-REF-002 — Decision Rules Documentation

- **Category:** reference
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/runner/decision-rules.ts`
- **Description:** Zero-defect acceptance rules: 0 FP + 0 FN = PASS per ISO 7.8.6.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-REF-003 — Uncertainty Estimation Method

- **Category:** reference
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/runner/uncertainty-estimator.ts`
- **Description:** Wilson score CI with Clopper-Pearson cross-check. Rationale for Wilson over Wald documented.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-TMPL-001 — Validation Report Template

- **Category:** template
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/reports/validation-report.ts`
- **Description:** Report template: JSON, Markdown, CSV formats with Ed25519 signature section.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-TMPL-002 — Dashboard Export Template

- **Category:** template
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/reports/dashboard-export.ts`
- **Description:** Time-series metrics and trend analysis export template.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-POL-001 — Threat Model

- **Category:** policy
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** Security Lead
- **File:** `src/validation/governance/threat-model.ts`
- **Description:** Framework threat model: actors, assets, threats, controls, residual risks.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-POL-002 — Access Control & Separation of Duties

- **Category:** policy
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** Security Lead
- **File:** `src/validation/governance/access-control.ts`
- **Description:** Role definitions, SoD rules, branch protections, audit schedules.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-REC-001 — Controlled Document Register

- **Category:** record
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/governance/document-register.ts`
- **Description:** This register. Tracks all controlled documents with version history.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |

### KATANA-PROC-007 — Corpus Label Audit Procedure

- **Category:** procedure
- **Version:** 1.0.0
- **Author:** KATANA Team
- **Reviewer:** QA Lead
- **File:** `src/validation/meta-validation/corpus-label-audit.ts`
- **Description:** Quarterly random sampling of ground truth labels for independent verification.

**Change History:**

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | 2026-03-21 | KATANA Team | Initial release |


## Source Record Snapshot

```ts
/**
 * KATANA Controlled Document Register (K10.4)
 *
 * Manages document control for all validation framework procedures
 * and reference files per ISO 17025 Clause 8.3.
 *
 * ISO 17025 Clause: 8.3 (Control of management system documents)
 */

import { SCHEMA_VERSION } from '../types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentEntry {
  readonly document_id: string;
  readonly title: string;
  readonly category: 'procedure' | 'reference' | 'template' | 'record' | 'policy';
  readonly version: string;
  readonly author: string;
  readonly reviewer: string;
  readonly approval_date: string;
  readonly effective_date: string;
  readonly file_path: string;
  readonly description: string;
  readonly iso_clauses: readonly string[];
  readonly change_history: readonly ChangeRecord[];
}

export interface ChangeRecord {
  readonly version: string;
  readonly date: string;
  readonly author: string;
  readonly description: string;
}

export interface DocumentRegister {
  readonly schema_version: typeof SCHEMA_VERSION;
  readonly register_id: string;
  readonly generated_at: string;
  readonly documents: readonly DocumentEntry[];
}

// ---------------------------------------------------------------------------
// Initial Register
// ---------------------------------------------------------------------------

export const KATANA_DOCUMENTS: readonly DocumentEntry[] = [
  {
    document_id: 'KATANA-PROC-001',
    title: 'Ground Truth Labeling Procedure',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/corpus/fixture-labeler.ts',
    description: 'Procedure for auto-labeling fixtures with ground-truth metadata including dual-reviewer verification.',
    iso_clauses: ['6.5', '7.2.1'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-002',
    title: 'Calibration Protocol',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/calibration/calibration-protocol.ts',
    description: 'Pre-validation calibration procedure with Ed25519 signed certificates and git-hash-based validity.',
    iso_clauses: ['6.4', '6.5'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-003',
    title: 'Validation Runner Procedure',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/runner/validation-runner.ts',
    description: 'Core validation procedure: corpus loading, HMAC verification, sample processing, confusion matrix computation.',
    iso_clauses: ['7.2.2', '7.6', '7.8.6'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-004',
    title: 'FP/FN Investigation Protocol',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/investigation/investigation-protocol.ts',
    description: 'Investigation procedure for false positive and false negative results. No "won\'t fix" allowed.',
    iso_clauses: ['7.10'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-005',
    title: 'CAPA Workflow',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/investigation/capa-integration.ts',
    description: 'Corrective and preventive action procedure with status machine workflow.',
    iso_clauses: ['8.7'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-006',
    title: 'Ground Truth Challenge Process',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/investigation/ground-truth-challenge.ts',
    description: 'Formal 3-reviewer majority vote process for disputed ground truth labels.',
    iso_clauses: ['7.10'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-REF-001',
    title: 'Module Taxonomy',
    category: 'reference',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'Architect',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'validation/taxonomy/module-taxonomy.json',
    description: 'Module classification: tier assignments, capability declarations, detection categories.',
    iso_clauses: ['7.2.1'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release with 29 modules' }],
  },
  {
    document_id: 'KATANA-REF-002',
    title: 'Decision Rules Documentation',
    category: 'reference',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/runner/decision-rules.ts',
    description: 'Zero-defect acceptance rules: 0 FP + 0 FN = PASS per ISO 7.8.6.',
    iso_clauses: ['7.8.6'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-REF-003',
    title: 'Uncertainty Estimation Method',
    category: 'reference',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/runner/uncertainty-estimator.ts',
    description: 'Wilson score CI with Clopper-Pearson cross-check. Rationale for Wilson over Wald documented.',
    iso_clauses: ['7.6'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-TMPL-001',
    title: 'Validation Report Template',
    category: 'template',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/reports/validation-report.ts',
    description: 'Report template: JSON, Markdown, CSV formats with Ed25519 signature section.',
    iso_clauses: ['7.8.6'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-TMPL-002',
    title: 'Dashboard Export Template',
    category: 'template',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/reports/dashboard-export.ts',
    description: 'Time-series metrics and trend analysis export template.',
    iso_clauses: ['7.7'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-POL-001',
    title: 'Threat Model',
    category: 'policy',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'Security Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/governance/threat-model.ts',
    description: 'Framework threat model: actors, assets, threats, controls, residual risks.',
    iso_clauses: ['4.1'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-POL-002',
    title: 'Access Control & Separation of Duties',
    category: 'policy',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'Security Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/governance/access-control.ts',
    description: 'Role definitions, SoD rules, branch protections, audit schedules.',
    iso_clauses: ['4.1'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-REC-001',
    title: 'Controlled Document Register',
    category: 'record',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/governance/document-register.ts',
    description: 'This register. Tracks all controlled documents with version history.',
    iso_clauses: ['8.3'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
  {
    document_id: 'KATANA-PROC-007',
    title: 'Corpus Label Audit Procedure',
    category: 'procedure',
    version: '1.0.0',
    author: 'KATANA Team',
    reviewer: 'QA Lead',
    approval_date: '2026-03-21',
    effective_date: '2026-03-21',
    file_path: 'src/validation/meta-validation/corpus-label-audit.ts',
    description: 'Quarterly random sampling of ground truth labels for independent verification.',
    iso_clauses: ['8.8'],
    change_history: [{ version: '1.0.0', date: '2026-03-21', author: 'KATANA Team', description: 'Initial release' }],
  },
] as const;

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildDocumentRegister(): DocumentRegister {
  return {
    schema_version: SCHEMA_VERSION,
    register_id: 'KATANA-REG-001',
    generated_at: new Date().toISOString(),
    documents: KATANA_DOCUMENTS,
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getDocumentById(
  register: DocumentRegister,
  documentId: string,
): DocumentEntry | undefined {
  return register.documents.find(d => d.document_id === documentId);
}

export function getDocumentsByCategory(
  register: DocumentRegister,
  category: DocumentEntry['category'],
): readonly DocumentEntry[] {
  return register.documents.filter(d => d.category === category);
}

export function getDocumentsByClause(
  register: DocumentRegister,
  clause: string,
): readonly DocumentEntry[] {
  return register.documents.filter(d => d.iso_clauses.includes(clause));
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface RegisterValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateRegister(register: DocumentRegister): RegisterValidationResult {
  const errors: string[] = [];
  const ids = new Set<string>();

  for (const doc of register.documents) {
    if (ids.has(doc.document_id)) {
      errors.push(`Duplicate document ID: ${doc.document_id}`);
    }
    ids.add(doc.document_id);

    if (doc.change_history.length === 0) {
      errors.push(`${doc.document_id}: No change history entries`);
    }

    const latestChange = doc.change_history[doc.change_history.length - 1];
    if (latestChange && latestChange.version !== doc.version) {
      errors.push(`${doc.document_id}: Version mismatch — document says ${doc.version} but latest change says ${latestChange.version}`);
    }

    if (!doc.title.trim()) {
      errors.push(`${doc.document_id}: Empty title`);
    }

    if (doc.iso_clauses.length === 0) {
      errors.push(`${doc.document_id}: No ISO clauses referenced`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

export function exportRegisterMarkdown(register: DocumentRegister): string {
  const lines: string[] = [
    '# KATANA Controlled Document Register',
    '',
    `**Register ID:** ${register.register_id}`,
    `**Generated:** ${register.generated_at}`,
    `**ISO 17025 Clause:** 8.3 (Control of management system documents)`,
    '',
    '## Documents',
    '',
    '| ID | Title | Category | Version | ISO Clauses | Effective Date |',
    '|-----|-------|----------|---------|-------------|----------------|',
  ];

  for (const doc of register.documents) {
    lines.push(`| ${doc.document_id} | ${doc.title} | ${doc.category} | ${doc.version} | ${doc.iso_clauses.join(', ')} | ${doc.effective_date} |`);
  }

  lines.push('', '## Document Details', '');

  for (const doc of register.documents) {
    lines.push(`### ${doc.document_id} — ${doc.title}`, '');
    lines.push(`- **Category:** ${doc.category}`);
    lines.push(`- **Version:** ${doc.version}`);
    lines.push(`- **Author:** ${doc.author}`);
    lines.push(`- **Reviewer:** ${doc.reviewer}`);
    lines.push(`- **File:** \`${doc.file_path}\``);
    lines.push(`- **Description:** ${doc.description}`);
    lines.push('');

    if (doc.change_history.length > 0) {
      lines.push('**Change History:**', '');
      lines.push('| Version | Date | Author | Description |', '|---------|------|--------|-------------|');
      for (const ch of doc.change_history) {
        lines.push(`| ${ch.version} | ${ch.date} | ${ch.author} | ${ch.description} |`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

```
