# AI Risk Assessment Methodology (ISO/IEC 42001 Clause 6)

**Document ID:** ISO42001-RISK-001
**Version:** 2.0
**Date:** 2026-03-30
**Status:** Active
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document defines the risk assessment methodology for AI systems within the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 6 (Planning) requirements. All 18 DojoV2 controls are now implemented with verified mitigations.

## 2. Risk Assessment Framework

### 2.1 Risk Categories

| Category | Description | Assessment Method | DojoV2 Control | Status |
|----------|-------------|-------------------|----------------|--------|
| Prompt Injection (Direct) | Unauthorized instruction injection | Scanner pattern detection | LLM-01 | ✅ Implemented (148 fixtures) |
| Prompt Injection (Indirect) | Injection via external data | Indirect PI detection | LLM-02 | ✅ Implemented (83 fixtures) |
| System Prompt Extraction | Unauthorized prompt disclosure | Pattern detection | LLM-03 | ✅ Implemented |
| System Prompt Manipulation | Unauthorized prompt modification | Pattern detection | LLM-04 | ✅ Implemented |
| Multi-turn Attacks | Cross-turn context exploitation | Multi-turn detection | LLM-05 | ✅ Implemented (112 fixtures) |
| Context Window Attacks | Context overflow exploitation | Context injection patterns | LLM-06 | ✅ Implemented (87 fixtures) |
| Social Engineering | Psychological manipulation | Social engineering patterns | LLM-07 | ✅ Implemented (73 fixtures) |
| Code Injection | Malicious code in responses | Malicious code patterns | LLM-08 | ✅ Implemented (156 fixtures) |
| Tool Poisoning | Malicious tool manipulation | Tool poisoning patterns | LLM-09 | ✅ Implemented (94 fixtures) |
| Denial of Service | Resource exhaustion attacks | DoS detection module | DoS | ✅ Implemented (136 fixtures) |
| Supply Chain | Compromised dependencies/models | Supply chain detector | Supply Chain | ✅ Implemented (89 fixtures) |
| Model Theft | Extraction, distillation attacks | Model theft detection | Model Theft | ✅ Implemented (78 fixtures) |
| Output Manipulation | XSS, SQLi, SSRF in responses | Output handling patterns | Output | ✅ Implemented (128 fixtures) |
| Bias & Fairness | Discriminatory outputs | Bias detection module | Bias | ✅ Implemented (65 fixtures) |
| Privacy Violation | PII exposure in AI interactions | PII detection module | - | Integrated |
| Agent Security | RAG context, tool security | Agent security patterns | Agent | ✅ Implemented (114 fixtures) |
| Vector/Embeddings | Embedding-based attacks | Vector patterns | Vector | ✅ Implemented (67 fixtures) |
| Multimodal | Image/audio attacks | Multimodal detectors | Multimodal | ✅ Implemented (179 fixtures) |
| Overreliance | Hallucination, false authority | Overreliance detector | Overreliance | ✅ Implemented (104 fixtures) |

**Total: 18 DojoV2 controls (100% implemented), 2,960+ fixtures, 510+ patterns**

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

### 2.4 Implemented Mitigation Controls

All 18 DojoV2 controls are implemented with the following mitigation strategies:

| Control | Mitigation Strategy | Detection Method | Fixture Count |
|---------|---------------------|------------------|---------------|
| LLM-01 | Pattern-based detection with severity scoring | Regex patterns | 148 |
| LLM-02 | Indirect injection vector detection | INJECTION_PATTERNS variant | 83 |
| LLM-03 | System prompt extraction patterns | EXTRACTION_PATTERNS | 65 |
| LLM-04 | System prompt manipulation detection | EXTRACTION_PATTERNS | 65 |
| LLM-05 | Multi-turn conversation analysis | MULTITURN_PATTERNS | 112 |
| LLM-06 | Context window overflow detection | CONTEXT_INJECTION_PATTERNS | 87 |
| LLM-07 | Social engineering technique detection | SOCIAL_ENGINEERING_PATTERNS | 73 |
| LLM-08 | Malicious code pattern detection | MALICIOUS_CODE_PATTERNS | 156 |
| LLM-09 | Tool poisoning vector detection | TOOL_POISONING_PATTERNS | 94 |
| DoS | Resource exhaustion detection | dos-detector.ts (8 functions) | 136 |
| Supply Chain | Dependency security scanning | supply-chain-detector.ts (9 patterns) | 89 |
| Agent | RAG context security | rag-analyzer.ts, shingan-context.ts | 114 |
| Model Theft | Model extraction prevention | model-theft-detector.ts (9 patterns) | 78 |
| Output | Output validation and sanitization | SQL_INJECTION_PATTERNS, output patterns | 128 |
| Vector | Embedding attack detection | VEC_PATTERNS | 67 |
| Multimodal | Image/audio attack detection | MULTIMODAL_PATTERNS, AUDIO_ATTACK_PATTERNS | 179 |
| Overreliance | Hallucination trigger detection | overreliance-detector.ts (7 patterns) | 104 |
| Bias | Bias and fairness testing | BIAS_PATTERNS | 65 |

## 3. Assessment Process

### 3.1 Risk Identification
1. Review scanner findings across all 18 DojoV2 modules
2. Map findings to OWASP LLM Top 10 categories
3. Cross-reference with NIST AI RMF risk factors
4. Identify new/emerging threats from MITRE ATLAS
5. **Use KATANA validation framework for automated verification**

### 3.2 Risk Analysis
1. Determine likelihood based on detection frequency across 2,960+ fixtures
2. Assess impact based on severity classification (510+ patterns)
3. Calculate risk score (likelihood x impact)
4. Identify existing controls and their effectiveness (100% DojoV2 coverage)

### 3.3 Risk Evaluation
1. Compare risk scores against tolerance levels
2. Prioritize risks requiring treatment
3. Document risk acceptance decisions
4. **Reference Implementation Audit Report for control verification**

### 3.4 Risk Treatment
1. Define mitigation strategies (new patterns, modules, fixtures)
2. Assign ownership and timelines
3. Implement and verify effectiveness via KATANA framework
4. Update compliance dashboard with 18 DojoV2 control status

## 4. Monitoring and Review

- Risk register reviewed monthly
- Scanner pattern effectiveness reviewed per release
- New threat intelligence integrated within 2 weeks of publication
- Compliance coverage dashboard updated after each sprint
- **DojoV2 control status verified quarterly (100% target maintained)**

## 5. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [AI System Inventory](./ai-system-inventory.md)
- [Implementation Audit Report](../IMPLEMENTATION-AUDIT-REPORT.md)
- DojoLM Compliance Gap Analysis (source-docs/01-COMPLIANCE-GAP.md)
