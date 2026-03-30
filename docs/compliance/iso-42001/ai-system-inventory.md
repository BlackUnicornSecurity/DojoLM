# AI System Inventory (ISO/IEC 42001 Clause 7)

**Document ID:** ISO42001-INV-001
**Version:** 2.0
**Date:** 2026-03-30
**Status:** Active
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document provides the AI system inventory for the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 7 (Support) requirements. All AI systems are registered and documented with current implementation status.

## 2. System Registry

### 2.1 DojoLM Scanner Engine (Haiku Scanner)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-SCAN-001 |
| **Name** | Haiku Scanner (Core Detection Engine) |
| **Type** | AI Security Testing Tool |
| **Risk Level** | Medium (testing/detection tool) |
| **Owner** | Scanner Engineering Team |
| **Version** | DojoV2 (18 controls) |
| **Status** | Active - 100% Implemented |
| **Pattern Groups** | 49 pattern groups |
| **Patterns** | 510+ detection patterns |
| **Fixtures** | 2,960+ across 37 categories |
| **Controls** | 18 DojoV2 controls (100% coverage) |
| **Data Processed** | Text prompts, JSON fixtures, session data |
| **PII Handling** | Hashed on input, redaction available |
| **Dependencies** | See SBOM (packages/bu-tpi/sbom.json) |
| **Last Assessment** | 2026-03-29 (Implementation Audit) |

**DojoV2 Control Coverage:**
- LLM-01: Direct Prompt Injection (148 fixtures)
- LLM-02: Indirect Prompt Injection (83 fixtures)
- LLM-03: System Prompt Extraction (shared)
- LLM-04: System Prompt Manipulation (shared)
- LLM-05: Multi-turn Attacks (112 fixtures)
- LLM-06: Context Window Attacks (87 fixtures)
- LLM-07: Social Engineering (73 fixtures)
- LLM-08: Code Injection (156 fixtures)
- LLM-09: Tool Poisoning (94 fixtures)
- DoS: Denial of Service (136 fixtures)
- Supply Chain: Supply Chain (89 fixtures)
- Agent: Agent Security (114 fixtures)
- Model Theft: Model Theft (78 fixtures)
- Output: Output Handling (128 fixtures)
- Vector: Vector/Embeddings (67 fixtures)
- Multimodal: Multimodal (179 fixtures)
- Overreliance: Overreliance (104 fixtures)
- Bias: Bias/Fairness (65 fixtures)

### 2.2 KATANA Validation Framework

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-KAT-001 |
| **Name** | KATANA Validation Framework |
| **Type** | Automated Compliance Verification |
| **Risk Level** | Medium |
| **Owner** | QA/Compliance Team |
| **Version** | 1.0 |
| **Status** | Operational |
| **Function** | Automated validation of DojoV2 control implementation |
| **Coverage** | 18/18 controls verified |
| **Data Processed** | Scan results, compliance metrics, audit trails |
| **Last Assessment** | 2026-03-29 |

### 2.3 LLM Provider Integration

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
| **Last Assessment** | 2026-03-29 |

### 2.4 Atemi Lab (Adversarial MCP Server)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-ADV-001 |
| **Name** | Atemi Lab (Adversarial MCP Server) |
| **Type** | AI Red Team Testing Tool |
| **Risk Level** | High (generates attack payloads) |
| **Owner** | Security Research Team |
| **Status** | Active |
| **Data Processed** | Attack fixtures, model responses |
| **Access Control** | RBAC-enforced (admin/analyst only) |
| **Last Assessment** | 2026-03-29 |

### 2.5 Bushido Book (Compliance Engine)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-BSH-001 |
| **Name** | Bushido Book (Compliance Center) |
| **Type** | Compliance Analysis Tool |
| **Risk Level** | Medium |
| **Owner** | Compliance Team |
| **Status** | Active |
| **Frameworks** | TPI, OWASP, NIST, MITRE, ISO, EU AI, ENISA, BAISS |
| **Data Processed** | Coverage data, audit trails, compliance checklists |
| **DojoV2 Status** | 18/18 controls tracked |

### 2.6 Hattori Guard (Input/Output Protection)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-HGD-001 |
| **Name** | Hattori Guard |
| **Type** | AI Defense System |
| **Risk Level** | High (intercepts I/O) |
| **Owner** | Security Engineering Team |
| **Status** | Active |
| **Modes** | Shinobi, Samurai, Sensei, Hattori |
| **Data Processed** | User inputs, model outputs, audit logs |

### 2.7 Ronin Hub (Bug Bounty Platform)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-RON-001 |
| **Name** | Ronin Hub |
| **Type** | Vulnerability Management |
| **Risk Level** | Medium |
| **Owner** | Security Research Team |
| **Status** | Active |
| **Data Processed** | Programs, submissions, CVE data |

### 2.8 LLM Jutsu (Testing Command Center)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-JUT-001 |
| **Name** | LLM Jutsu |
| **Type** | AI Testing Tool |
| **Risk Level** | Medium |
| **Owner** | QA Team |
| **Status** | Active |
| **Data Processed** | Model test results, aggregated scores |

### 2.9 Amaterasu DNA (Attack Analysis)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-AMA-001 |
| **Name** | Amaterasu DNA |
| **Type** | Attack Lineage Analysis |
| **Risk Level** | Medium |
| **Owner** | Security Research Team |
| **Status** | Active |
| **Data Processed** | Attack patterns, mutation data, ablation results |

### 2.10 The Kumite (Strategic Hub)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-KUM-001 |
| **Name** | The Kumite |
| **Type** | Strategic Analysis Tool |
| **Risk Level** | Medium |
| **Owner** | Security Engineering Team |
| **Status** | Active |
| **Sub-modules** | SAGE, Arena, Mitsuke |

### 2.11 Armory (Fixture Management)

| Field | Value |
|-------|-------|
| **System ID** | DOJOLM-ARM-001 |
| **Name** | Armory (formerly Test Lab) |
| **Type** | Test Fixture Management |
| **Risk Level** | Low |
| **Owner** | QA Team |
| **Status** | Active |
| **Fixtures Managed** | 2,960+ DojoV2 fixtures |
| **Data Processed** | Attack fixtures, comparison data |

## 3. Specialized Detector Modules

The following module-based detectors are implemented alongside the core scanner:

| Module | Location | Function | Status |
|--------|----------|----------|--------|
| dos-detector.ts | modules/ | Resource exhaustion, regex bombs | ✅ Implemented |
| supply-chain-detector.ts | modules/ | Dependency confusion, typosquatting | ✅ Implemented |
| model-theft-detector.ts | modules/ | Extraction, fingerprinting attacks | ✅ Implemented |
| overreliance-detector.ts | modules/ | Hallucination triggers, fake citations | ✅ Implemented |
| rag-analyzer.ts | modules/ | RAG context security | ✅ Implemented |
| image-scanner.ts | modules/ | Multimodal image processing | ✅ Implemented |
| audio-scanner.ts | modules/ | Multimodal audio processing | ✅ Implemented |

## 4. Inventory Template (New Systems)

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

## 5. Review Schedule

- Inventory reviewed quarterly
- New systems registered before deployment
- Decommissioned systems archived after 1 year
- Risk levels reassessed after major changes
- DojoV2 control coverage verified per implementation audit

## 6. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [Implementation Audit Report](../IMPLEMENTATION-AUDIT-REPORT.md)
