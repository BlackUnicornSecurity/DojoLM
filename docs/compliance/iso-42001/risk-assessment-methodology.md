# AI Risk Assessment Methodology (ISO/IEC 42001 Clause 6)

**Document ID:** ISO42001-RISK-001
**Version:** 1.0
**Date:** 2026-03-02
**Status:** Draft
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document defines the risk assessment methodology for AI systems within the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 6 (Planning) requirements.

## 2. Risk Assessment Framework

### 2.1 Risk Categories

| Category | Description | Assessment Method |
|----------|-------------|-------------------|
| Prompt Injection | Unauthorized instruction injection | Scanner pattern detection |
| Data Poisoning | Training/inference data corruption | Provenance tracking |
| Model Theft | Extraction, distillation attacks | Model theft detection module |
| Output Manipulation | XSS, SQLi, SSRF in responses | Output handling patterns |
| Bias & Fairness | Discriminatory outputs | Bias detection module |
| Privacy Violation | PII exposure in AI interactions | PII detection module |
| Deepfake/Synthetic | Synthetic content generation | Deepfake indicator detection |
| Supply Chain | Compromised dependencies/models | Supply chain detector |
| Denial of Service | Resource exhaustion attacks | DoS detection module |
| Session Manipulation | Multi-session persistence, HITL bypass | Session bypass module |

### 2.2 Risk Scoring Matrix

| Impact \ Likelihood | Rare (1) | Unlikely (2) | Possible (3) | Likely (4) | Almost Certain (5) |
|---------------------|----------|--------------|--------------|------------|---------------------|
| **Catastrophic (5)** | 5 | 10 | 15 | 20 | 25 |
| **Major (4)** | 4 | 8 | 12 | 16 | 20 |
| **Moderate (3)** | 3 | 6 | 9 | 12 | 15 |
| **Minor (2)** | 2 | 4 | 6 | 8 | 10 |
| **Insignificant (1)** | 1 | 2 | 3 | 4 | 5 |

### 2.3 Risk Tolerance Levels

| Score Range | Level | Action Required |
|-------------|-------|-----------------|
| 20-25 | Critical | Immediate mitigation, escalate to leadership |
| 12-19 | High | Mitigation plan within 1 week |
| 6-11 | Medium | Mitigation plan within 1 month |
| 1-5 | Low | Accept or monitor |

## 3. Assessment Process

### 3.1 Risk Identification
1. Review scanner findings across all modules
2. Map findings to OWASP LLM Top 10 categories
3. Cross-reference with NIST AI RMF risk factors
4. Identify new/emerging threats from MITRE ATLAS

### 3.2 Risk Analysis
1. Determine likelihood based on detection frequency
2. Assess impact based on severity classification
3. Calculate risk score (likelihood x impact)
4. Identify existing controls and their effectiveness

### 3.3 Risk Evaluation
1. Compare risk scores against tolerance levels
2. Prioritize risks requiring treatment
3. Document risk acceptance decisions

### 3.4 Risk Treatment
1. Define mitigation strategies (new patterns, modules, fixtures)
2. Assign ownership and timelines
3. Implement and verify effectiveness
4. Update compliance dashboard

## 4. Monitoring and Review

- Risk register reviewed monthly
- Scanner pattern effectiveness reviewed per release
- New threat intelligence integrated within 2 weeks of publication
- Compliance coverage dashboard updated after each sprint

## 5. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [AI System Inventory](./ai-system-inventory.md)
- DojoLM Compliance Gap Analysis (source-docs/01-COMPLIANCE-GAP.md)
