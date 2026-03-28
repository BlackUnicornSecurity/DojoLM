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
