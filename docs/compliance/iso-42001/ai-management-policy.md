# AI Management System Policy (ISO/IEC 42001 Clause 5)

**Document ID:** ISO42001-POL-001
**Version:** 2.0
**Date:** 2026-03-30
**Status:** Active
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document establishes the AI Management System (AIMS) policy for the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 5 (Leadership) requirements. It defines organizational commitment to responsible AI development, deployment, and governance.

## 2. Scope

This policy applies to all AI systems developed, deployed, and managed within the DojoLM platform, including:
- Prompt injection detection and scanning engines
- AI model security testing tools
- Adversarial testing frameworks
- LLM provider integrations
- KATANA validation framework for automated compliance verification

## 3. Policy Statements

### 3.1 Leadership Commitment
- Senior leadership is committed to establishing, implementing, and maintaining the AIMS
- Adequate resources will be allocated for AI governance activities
- AI-related roles and responsibilities are defined and communicated
- **100% DojoV2 control implementation has been achieved and verified**

### 3.2 Responsible AI Principles
- **Transparency**: AI system capabilities and limitations are documented
- **Fairness**: Bias detection and mitigation are integrated into all testing (BIAS_PATTERNS: 65 fixtures)
- **Safety**: Security testing covers OWASP LLM Top 10, NIST AI RMF, and DojoV2 controls (18/18 implemented)
- **Accountability**: All AI operations are auditable with full trail logging
- **Privacy**: PII detection and redaction are built into the scanner pipeline

### 3.3 DojoV2 Control Coverage

The following 18 DojoV2 controls are **fully implemented** as of March 2026:

| Category | Control ID | Status | Fixtures |
|----------|------------|--------|----------|
| Prompt Injection | LLM-01, LLM-02 | ✅ Implemented | 231 files |
| System Prompt | LLM-03, LLM-04 | ✅ Implemented | 65 files |
| Multi-turn/Context | LLM-05, LLM-06 | ✅ Implemented | 199 files |
| Social Engineering | LLM-07 | ✅ Implemented | 73 files |
| Code/Tool Security | LLM-08, LLM-09 | ✅ Implemented | 250 files |
| Denial of Service | DoS | ✅ Implemented | 136 files |
| Supply Chain | Supply Chain | ✅ Implemented | 89 files |
| Agent Security | Agent | ✅ Implemented | 114 files |
| Model Theft | Model Theft | ✅ Implemented | 78 files |
| Output Handling | Output | ✅ Implemented | 128 files |
| Vector/Embeddings | Vector | ✅ Implemented | 67 files |
| Multimodal | Multimodal | ✅ Implemented | 179 files |
| Overreliance | Overreliance | ✅ Implemented | 104 files |
| Bias/Fairness | Bias | ✅ Implemented | 65 files |

**Total:** 2,960+ fixtures, 510+ patterns, 49 pattern groups

### 3.4 Stakeholder Engagement
- Regular compliance reviews with framework mapping
- Transparent reporting of coverage gaps and remediation status
- Incident response procedures for AI-related security events
- **Implementation Audit Report available for verification**

## 4. Roles and Responsibilities

| Role | Responsibility |
|------|---------------|
| AI Security Lead | Overall AIMS governance and compliance |
| Scanner Engineers | Pattern development, module quality (18 DojoV2 controls) |
| QA/Testing | Fixture validation, regression testing, KATANA validation |
| Compliance Officer | Framework mapping, audit coordination, ISO 42001 maintenance |

## 5. Review Cycle

This policy is reviewed quarterly or upon significant changes to:
- AI system capabilities
- Regulatory requirements (EU AI Act, NIST frameworks)
- Organizational structure
- Implementation status (currently: 100% DojoV2 coverage)

## 6. Related Documents

- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [AI System Inventory](./ai-system-inventory.md)
- [Incident Response Procedure](./incident-response-procedure.md)
- [Internal Audit Checklist](./internal-audit-checklist.md)
- [Implementation Audit Report](../IMPLEMENTATION-AUDIT-REPORT.md)
