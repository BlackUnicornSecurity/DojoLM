# KATANA Controlled Document Register

**Register ID:** KATANA-REG-001
**Generated:** 2026-03-28T19:01:31.640Z
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
