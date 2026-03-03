# Internal Audit Checklist for AI Operations (ISO/IEC 42001 Clause 9)

**Document ID:** ISO42001-AUD-001
**Version:** 1.0
**Date:** 2026-03-02
**Status:** Draft
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document provides the internal audit checklist for AI operations within the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 9 (Performance Evaluation) requirements.

## 2. Audit Schedule

| Audit Type | Frequency | Owner |
|-----------|-----------|-------|
| Scanner Pattern Effectiveness | Per release | QA Team |
| Compliance Coverage | Monthly | Compliance Officer |
| Security Vulnerability Scan | Per release | Security Lead |
| Dependency Audit | Monthly | Engineering Lead |
| PII Handling Review | Quarterly | Privacy Officer |
| Incident Response Drill | Quarterly | Security Lead |
| Full AIMS Audit | Annually | External Auditor |

## 3. Audit Checklists

### 3.1 Scanner Operations Audit

- [ ] All scanner modules registered and active
- [ ] Module count matches expected (currently 23)
- [ ] Pattern count documented and matches actual
- [ ] Regression test pass rate >= 99.5%
- [ ] No unaddressed CRITICAL findings in test results
- [ ] Audit logger operational and recording scans
- [ ] Performance benchmarks within targets (<100ms scan)

### 3.2 Compliance Coverage Audit

- [ ] OWASP LLM Top 10 coverage >= 95%
- [ ] NIST AI RMF coverage >= 85%
- [ ] MITRE ATLAS coverage >= 87%
- [ ] ISO 42001 coverage >= 70%
- [ ] EU AI Act coverage >= 75%
- [ ] ENISA AI Security coverage >= 85%
- [ ] All CRITICAL gaps have active remediation plans
- [ ] Compliance dashboard data current (within 7 days)

### 3.3 Data Protection Audit

- [ ] PII detection module active and configured
- [ ] PII types enabled per organizational policy
- [ ] Redaction available for all detected PII types
- [ ] Input content hashed (not stored) in audit logs
- [ ] Encryption at rest for stored credentials (AES-256-GCM)
- [ ] Session tokens hashed in database
- [ ] No plaintext secrets in codebase or configuration

### 3.4 Access Control Audit

- [ ] RBAC enforcement active on all API routes
- [ ] Three roles defined: admin, analyst, viewer
- [ ] Session-based authentication operational
- [ ] CSRF protection active
- [ ] Rate limiting configured (5 attempts / 15 min)
- [ ] Inactive sessions expire within configured timeout
- [ ] User management restricted to admin role

### 3.5 Incident Response Readiness

- [ ] Incident response procedure documented and current
- [ ] Incident classification matrix defined
- [ ] Escalation contacts up to date
- [ ] Communication templates available
- [ ] Last incident drill within 90 days
- [ ] Post-incident reviews documented in lessons learned

### 3.6 Supply Chain Security

- [ ] SBOM generated and current
- [ ] No CRITICAL CVEs in dependencies
- [ ] No HIGH CVEs older than 30 days unpatched
- [ ] Dependency update automation configured (Dependabot)
- [ ] No deprecated packages in use
- [ ] License compliance verified

### 3.7 Documentation Completeness

- [ ] AI Management Policy current
- [ ] Risk Assessment Methodology current
- [ ] AI System Inventory complete
- [ ] Incident Response Procedure current
- [ ] This checklist current
- [ ] Compliance gap analysis within 90 days
- [ ] User documentation current

## 4. Non-Conformity Handling

### 4.1 Classification

| Type | Definition | Required Action |
|------|-----------|-----------------|
| Major | Systemic failure of a control | Corrective action within 2 weeks |
| Minor | Isolated deviation from procedure | Corrective action within 1 month |
| Observation | Improvement opportunity | Optional action, review at next audit |

### 4.2 Corrective Action Process

1. Document non-conformity with evidence
2. Determine root cause
3. Define corrective action and timeline
4. Assign owner
5. Implement corrective action
6. Verify effectiveness at next audit
7. Close non-conformity

## 5. Audit Report Template

```yaml
audit_id: "AIMS-AUD-YYYY-NNN"
audit_date: "YYYY-MM-DD"
audit_type: ""  # Scanner | Compliance | Security | Full
auditor: ""
scope: ""
findings:
  - id: "F-NNN"
    area: ""
    type: ""  # Major | Minor | Observation
    description: ""
    evidence: ""
    corrective_action: ""
    owner: ""
    due_date: ""
    status: ""  # Open | In Progress | Closed
summary:
  total_checks: 0
  passed: 0
  failed: 0
  observations: 0
  overall_assessment: ""  # Conforming | Non-Conforming | Partially Conforming
next_audit_date: ""
```

## 6. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [AI System Inventory](./ai-system-inventory.md)
- [Incident Response Procedure](./incident-response-procedure.md)
