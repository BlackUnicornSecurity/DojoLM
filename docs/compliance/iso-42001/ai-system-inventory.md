# AI System Inventory Template (ISO/IEC 42001 Clause 7)

**Document ID:** ISO42001-INV-001
**Version:** 1.0
**Date:** 2026-03-02
**Status:** Draft
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document provides the AI system inventory template for the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 7 (Support) requirements. All AI systems must be registered and documented.

## 2. System Registry

### 2.1 DojoLM Scanner Engine

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-SCAN-001 |
| **Name** | DojoLM TPI Security Scanner |
| **Type** | AI Security Testing Tool |
| **Risk Level** | Medium (testing/detection tool) |
| **Owner** | Scanner Engineering Team |
| **Version** | See package.json |
| **Status** | Active |
| **Modules** | 23 scanner modules (P1+P2.6+P3) |
| **Pattern Count** | 500+ detection patterns |
| **Data Processed** | Text prompts, JSON fixtures, session data |
| **PII Handling** | Hashed on input, redaction available |
| **Dependencies** | See SBOM (packages/bu-tpi/sbom.json) |
| **Last Assessment** | _[Date of last risk assessment]_ |

### 2.2 LLM Provider Integration

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-LLM-001 |
| **Name** | DojoLM LLM Provider System |
| **Type** | AI Model Integration Layer |
| **Risk Level** | High (handles API keys, model responses) |
| **Owner** | Platform Engineering Team |
| **Providers** | 50+ LLM providers supported |
| **Data Processed** | Prompts, model responses, API credentials |
| **Encryption** | AES-256-GCM for credentials at rest |
| **Dependencies** | See dojolm-web/package.json |
| **Last Assessment** | _[Date of last risk assessment]_ |

### 2.3 Adversarial Testing Framework

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-ADV-001 |
| **Name** | DojoLM Adversarial MCP Server |
| **Type** | AI Red Team Testing Tool |
| **Risk Level** | High (generates attack payloads) |
| **Owner** | Security Research Team |
| **Status** | Planned (P4) |
| **Data Processed** | Attack fixtures, model responses |
| **Access Control** | RBAC-enforced (admin/analyst only) |
| **Last Assessment** | _[Date of last risk assessment]_ |

## 3. Inventory Template (Blank)

For registering new AI systems:

```yaml
system_id: "DOJOLM-XXX-NNN"
name: ""
type: ""  # Testing Tool | Integration | Analysis | Generation
risk_level: ""  # Low | Medium | High | Critical
owner: ""
version: ""
status: ""  # Active | Development | Deprecated | Decommissioned
description: ""
data_processed:
  - type: ""
    sensitivity: ""  # Public | Internal | Confidential | Restricted
    retention_days: 0
pii_handling:
  collects_pii: false
  pii_types: []
  redaction_available: false
  encryption: ""
dependencies:
  sbom_location: ""
  critical_deps: []
access_control:
  authentication: ""
  authorization: ""
  roles: []
risk_assessment:
  last_date: ""
  next_date: ""
  risk_score: 0
  mitigations: []
compliance_mapping:
  owasp: []
  nist: []
  iso: []
  eu_ai_act: ""
```

## 4. Review Schedule

- Inventory reviewed quarterly
- New systems registered before deployment
- Decommissioned systems archived after 1 year
- Risk levels reassessed after major changes

## 5. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
