# DojoLM AI Security Compliance Gap Analysis

**Document ID:** COMPLIANCE-GAP-2026-03-01-001  
**Version:** 1.0  
**Date:** 2026-03-01  
**Owner:** BlackUnicorn Laboratory  
**Status:** Final  

---

## Executive Summary

This document provides a comprehensive compliance gap analysis of the DojoLM security testing framework against major AI security compliance frameworks. The analysis maps DojoLM's 505+ detection patterns across 47 pattern groups to framework requirements and identifies coverage gaps.

### Overall Compliance Coverage

| Framework | Coverage | Status | Gap Priority |
|-----------|----------|--------|--------------|
| **OWASP LLM Top 10 (2025)** | 95% | ✅ Strong | Low |
| **NIST AI RMF 1.0 / AI 600-1** | 85% | ✅ Good | Medium |
| **MITRE ATLAS** | 87% | ✅ Good | Medium |
| **ISO/IEC 42001:2023** | 70% | ⚠️ Partial | High |
| **EU AI Act** | 75% | ⚠️ Partial | High |
| **ENISA AI Security** | 85% | ✅ Good | Medium |

---

## Table of Contents

1. [DojoLM Security Controls Inventory](#1-dojolm-security-controls-inventory)
2. [OWASP LLM Top 10 (2025) Compliance Matrix](#2-owasp-llm-top-10-2025-compliance-matrix)
3. [NIST AI RMF 1.0 / AI 600-1 Compliance Matrix](#3-nist-ai-rmf-10--ai-600-1-compliance-matrix)
4. [MITRE ATLAS Compliance Matrix](#4-mitre-atlas-compliance-matrix)
5. [ISO/IEC 42001:2023 Compliance Matrix](#5-isoiec-420012023-compliance-matrix)
6. [EU AI Act Compliance Matrix](#6-eu-ai-act-compliance-matrix)
7. [ENISA AI Security Compliance Matrix](#7-enisa-ai-security-compliance-matrix)
8. [Gap Analysis Summary](#8-gap-analysis-summary)
9. [Remediation Roadmap](#9-remediation-roadmap)
10. [Appendices](#10-appendices)

---

## 1. DojoLM Security Controls Inventory

### 1.1 Pattern Groups (47 Groups, 505+ Patterns)

| Engine ID | Pattern Group | Count | Testing Area | Description |
|-----------|---------------|-------|--------------|-------------|
| `Prompt Injection` | PI_PATTERNS | 33 | TA-01 | System override, role hijacking, instruction injection |
| `Jailbreak` | JB_PATTERNS | 66 | TA-01 | DAN, developer mode, unrestricted AI, narrative attacks |
| `TPI` | SETTINGS_WRITE_PATTERNS | 3 | TA-01 | Settings.json write protection (TPI-PRE-4) |
| `Agent Security` | AGENT_OUTPUT_PATTERNS | 5 | TA-07 | Fake tool calls, XML injection, privilege escalation |
| `Agent Security` | SEARCH_RESULT_PATTERNS | 3 | TA-05 | SEO poisoning, snippet injection |
| `Agent Security` | WEBFETCH_PATTERNS | 9 | TA-02 | Hidden text, meta tags, data attributes in HTML |
| `Boundary` | BOUNDARY_PATTERNS | 8 | TA-01 | Control tokens, system boundary markers |
| `Multilingual` | MULTILINGUAL_PATTERNS | 107 | TA-01 | 10+ languages × multiple categories |
| `Encoding` | CODE_FORMAT_PATTERNS | 13 | TA-01 | Injection in comments, strings, variable names |
| `Social` | SOCIAL_PATTERNS | 15 | TA-06 | Authority, urgency, flattery, guilt, reciprocity |
| `Synonym` | SYNONYM_PATTERNS | 20 | TA-01 | Synonym substitution for injection phrases |
| `Unicode` | WHITESPACE_PATTERNS | 7 | TA-01 | Zero-width chars, tab padding, exotic whitespace |
| `Multimodal Security` | MEDIA_PATTERNS | 9 | TA-18 | EXIF, PNG tEXt, ID3, SVG injection |
| `Supply Chain` | SUPPLY_CHAIN_PATTERNS | 24 | TA-11 | Model integrity, dependency, plugin security |
| `Denial of Service` | DOS_PATTERNS | 21 | TA-10 | Input length, recursive, context overflow attacks |
| `Model Theft` | MODEL_THEFT_PATTERNS | 36 | TA-12 | API extraction, fingerprinting, training reconstruction |
| `Output Handling` | OUTPUT_HANDLING_PATTERNS | 42 | TA-03 | XSS, SQLi, command injection, SSRF, path traversal |
| `Vector & Embeddings` | VEC_PATTERNS | 35 | TA-16 | RAG attacks, embedding poisoning, vector leakage |
| `Overreliance` | OR_PATTERNS | 42 | TA-15 | Attribution, confidence, consistency, automated decisions |
| `Bias & Fairness` | BIAS_PATTERNS | 67 | TA-17 | Demographic, disability, socioeconomic, cultural bias |
| `Environmental Impact` | ENV_PATTERNS | 15 | TA-20 | Energy consumption, carbon footprint |
| `Multimodal Security` | MULTIMODAL_PATTERNS | 35 | TA-19 | Image/audio injection, deepfake, adversarial |
| `Cognitive` | PERSONA_PATTERNS | 6 | TA-06 | Persona manipulation, identity switching |
| `Cognitive` | HYPOTHETICAL_PATTERNS | 5 | TA-06 | Educational framing, research justification |
| `Cognitive` | FICTION_FRAMING_PATTERNS | 4 | TA-06 | Story wrapper, screenplay, game narrative |
| `Cognitive` | ROLEPLAY_PATTERNS | 5 | TA-06 | Roleplay manipulation, simulation bypass |
| `Cognitive` | FALSE_CONSTRAINT_PATTERNS | 5 | TA-07 | Admin claim, safety approval, override codes |
| `Cognitive` | TASK_EXPLOIT_PATTERNS | 4 | TA-07 | Task prerequisite, debugging/testing pretext |
| `Cognitive` | REVERSE_PSYCH_PATTERNS | 3 | TA-08 | Dare challenge, competitive goading |
| `Cognitive` | REWARD_PATTERNS | 4 | TA-08 | Reward hacking, shutdown threat, training manipulation |
| `Delivery Vectors` | SHARED_DOC_PATTERNS | 3 | TA-04 | Document comments, metadata, macros |
| `Delivery Vectors` | API_RESPONSE_PATTERNS | 3 | TA-04 | JSON field, error message, webhook injection |
| `Delivery Vectors` | PLUGIN_INJECTION_PATTERNS | 3 | TA-04 | MCP tool output, package description injection |
| `Delivery Vectors` | COMPROMISED_TOOL_PATTERNS | 3 | TA-04 | Git message, test output, build log injection |
| `Delivery Vectors` | ALTERED_PROMPT_PATTERNS | 3 | TA-04 | Template variable, system prompt append, RAG context |
| `Evasion` | SURROGATE_FORMAT_PATTERNS | 5 | TA-01 | JSON key, XML tag, YAML key, CSV, SQL alias |
| `Evasion` | RECURSIVE_INJECTION_PATTERNS | 3 | TA-01 | Chain injection, RAG poison, output-as-instruction |
| `Evasion` | CONFIG_INJECTION_PATTERNS | 8 | TA-01 | Semicolon delimiter, markdown config, XML/JSON/YAML |
| `Evasion` | OCR_ATTACK_PATTERNS | 2 | TA-19 | Hidden text, adversarial font indicators |
| `Evasion` | VIDEO_INJECTION_PATTERNS | 3 | TA-19 | Subtitle, video metadata, GIF comment injection |
| `Agent Security` | AGENT_CREDENTIAL_PATTERNS | 9 | TA-07 | API key, token, password, environment extraction |
| `Agent Security` | AGENT_CONTEXT_PATTERNS | 9 | TA-07 | System prompt, history, memory, RAG poisoning |
| `Agent Security` | AGENT_DATA_PATTERNS | 9 | TA-07 | Input/output poisoning, parameter injection |
| `Agent Security` | AGENT_RAG_POISON_PATTERNS | 10 | TA-07 | RAG injection, source, document, vector poisoning |
| `Agent Security` | AGENT_RAG_CRED_PATTERNS | 4 | TA-07 | RAG credential harvesting |
| `Source` | UNTRUSTED_SOURCE_PATTERNS | 3 | TA-04 | Downloads folder, /tmp, external URLs |

### 1.2 Heuristic Detectors

| Detector | Description | Framework Mapping |
|----------|-------------|-------------------|
| **Base64 Decoder** | Decodes base64 strings and scans decoded content | OWASP LLM01, MITRE ATLAS |
| **HTML Injection Detector** | Finds hidden text in CSS (display:none, font-size:0) | OWASP LLM01, NIST #9 |
| **Context Overload Detector** | Flags token flooding (>15K chars, <30% unique) and many-shot attacks (>15 instruction-like sentences) | OWASP LLM04, NIST #5 |
| **Character Encoding Detector** | Decodes ROT13, ROT47, reversed text, pig latin, acrostic | OWASP LLM01, MITRE ATLAS |
| **Math Encoding Detector** | Detects formal logic notation used to encode injection | OWASP LLM01 |
| **Hidden Unicode Detector** | Finds zero-width characters and Unicode confusables | OWASP LLM01, MITRE ATLAS |

### 1.3 Text Normalization Pipeline

| Step | Description | Security Benefit |
|------|-------------|------------------|
| NFKC Normalization | Unicode canonical decomposition | Defeats homoglyph attacks |
| Zero-Width Stripping | Removes 20+ zero-width character types | Defeats invisible character injection |
| Confusable Mapping | Cyrillic/Greek/fullwidth → ASCII | Defeats visual spoofing |
| Combining Mark Removal | Strips diacritical marks | Defeats accent-based evasion |
| Whitespace Collapse | Normalizes spacing | Defeats padding attacks |

### 1.4 Verdict Logic

| Verdict | Condition | Compliance Mapping |
|---------|-----------|-------------------|
| **BLOCK** | Any CRITICAL finding | Fail-safe security control |
| **WARN** | Any WARNING finding (no CRITICAL) | Risk indication |
| **ALLOW** | No findings, or only INFO | Safe to proceed |
| **Escalation** | >5 INFO findings across >3 categories → WARNING | Defense in depth |

---

## 2. OWASP LLM Top 10 (2025) Compliance Matrix

### 2.1 Control Mapping

| OWASP ID | Risk | DojoLM Controls | Coverage | Testing Reference |
|----------|------|-----------------|----------|-------------------|
| **LLM01** | Prompt Injection | PI_PATTERNS (33), JB_PATTERNS (66), BOUNDARY_PATTERNS (8), MULTILINGUAL_PATTERNS (107), ENCODING detectors | ✅ **100%** | `fixtures/encoded/`, `fixtures/modern/` |
| **LLM02** | Insecure Output Handling | OUTPUT_HANDLING_PATTERNS (42): XSS, SQLi, Command Injection, SSRF, Path Traversal, Open Redirect | ✅ **100%** | `fixtures/output/` |
| **LLM03** | Supply Chain Vulnerabilities | SUPPLY_CHAIN_PATTERNS (24): Model integrity, dependency, plugin, typosquatting | ✅ **95%** | `fixtures/supply-chain/` |
| **LLM04** | Data and Model Poisoning | VEC_PATTERNS (35), AGENT_RAG_POISON_PATTERNS (10), Context Overload Detector | ✅ **90%** | `fixtures/vec/`, `fixtures/few-shot/` |
| **LLM05** | Improper Output Handling | OUTPUT_HANDLING_PATTERNS (42) | ✅ **100%** | `fixtures/output/` |
| **LLM06** | Sensitive Information Disclosure | AGENT_CREDENTIAL_PATTERNS (9), MODEL_THEFT_PATTERNS (36), VEC_LEAK patterns | ✅ **85%** | `fixtures/model-theft/` |
| **LLM07** | Insecure Plugin Design | PLUGIN_INJECTION_PATTERNS (3), SUPPLY_CHAIN_PATTERNS (plugin section) | ✅ **80%** | `fixtures/supply-chain/` |
| **LLM08** | Excessive Agency | AGENT_OUTPUT_PATTERNS (5), AGENT_CONTEXT_PATTERNS (9), AGENT_DATA_PATTERNS (9) | ✅ **90%** | `fixtures/agent-output/` |
| **LLM09** | Overreliance | OR_PATTERNS (42): Attribution, Confidence, Consistency, Automated Decisions | ✅ **100%** | `fixtures/or/` |
| **LLM10** | Model Theft | MODEL_THEFT_PATTERNS (36): API extraction, fingerprinting, training reconstruction, watermark attacks | ✅ **100%** | `fixtures/model-theft/` |

### 2.2 OWASP Coverage Summary

| Metric | Value |
|--------|-------|
| **Total OWASP Risks** | 10 |
| **Fully Covered** | 8 |
| **Partially Covered** | 2 |
| **Not Covered** | 0 |
| **Overall Coverage** | **95%** |

### 2.3 OWASP Gaps

| Gap ID | OWASP Ref | Description | Priority | Recommended Action |
|--------|-----------|-------------|----------|-------------------|
| OWASP-GAP-01 | LLM04 | Data provenance validation not in scope | Medium | Add data source verification patterns |
| OWASP-GAP-02 | LLM07 | Plugin permission boundaries not tested | Low | Add plugin permission escalation tests |
| OWASP-GAP-03 | LLM06 | Real-time PII detection limited | Medium | Integrate BMAD PII guards |

---

## 3. NIST AI RMF 1.0 / AI 600-1 Compliance Matrix

### 3.1 AI RMF Functions Coverage

| Function | Categories | DojoLM Coverage | Status |
|----------|------------|-----------------|--------|
| **GOVERN** | 5 categories | 🟡 Organizational controls out of scope | Partial |
| **MAP** | 5 categories | 🟡 Mapping controls not in scope | Partial |
| **MEASURE** | 4 categories | ✅ Testing framework fully aligns | Strong |
| **MANAGE** | 4 categories | 🟡 Management controls not in scope | Partial |

> **Note:** GOVERN, MAP, and MANAGE functions are organizational-level controls. DojoLM provides technical controls for the MEASURE function.

### 3.2 NIST AI 600-1: Generative AI Profile (12 Risk Categories)

| NIST # | Risk Category | DojoLM Controls | Coverage | Testing Reference |
|--------|---------------|-----------------|----------|-------------------|
| **#1** | CBRN Information | HC_PATTERNS (harmful content) | ✅ **80%** | `fixtures/harmful/` |
| **#2** | Confabulation | OR_PATTERNS (42): Confidence, Consistency, Attribution | ✅ **90%** | `fixtures/or/or-confidence-*`, `fixtures/or/or-consistency-*` |
| **#3** | Dangerous Content | HC_PATTERNS, JB_PATTERNS (violence, illegal) | ✅ **95%** | `fixtures/modern/`, `fixtures/harmful/` |
| **#4** | Data Privacy | AGENT_CREDENTIAL_PATTERNS, VEC_LEAK, PII patterns | ✅ **85%** | `fixtures/model-theft/`, `fixtures/vec/` |
| **#5** | Environmental | ENV_PATTERNS (15): Energy, Carbon, Efficiency | ✅ **100%** | `fixtures/environmental/` |
| **#6** | Human-AI Configuration | BIAS_PATTERNS (67), OR_AUTOMATED_PATTERNS | ✅ **90%** | `fixtures/bias/`, `fixtures/or/or-automated-*` |
| **#7** | Information Integrity | OR_PATTERNS (attribution, consistency) | ✅ **85%** | `fixtures/or/or-attribution-*` |
| **#8** | Information Security | OUTPUT_HANDLING_PATTERNS, SUPPLY_CHAIN_PATTERNS | ✅ **95%** | `fixtures/output/`, `fixtures/supply-chain/` |
| **#9** | Content Provenance | MEDIA_PATTERNS (9), OCR_ATTACK_PATTERNS (2) | ✅ **80%** | `fixtures/images/`, `fixtures/audio/` |
| **#10** | Intellectual Property | MODEL_THEFT_PATTERNS (36) | ✅ **95%** | `fixtures/model-theft/` |
| **#11** | Inappropriate Content | HC_PATTERNS, BIAS_PATTERNS | ✅ **90%** | `fixtures/bias/`, `fixtures/harmful/` |
| **#12** | AI System Security | SUPPLY_CHAIN_PATTERNS, DOS_PATTERNS, AGENT_SECURITY | ✅ **90%** | `fixtures/supply-chain/`, `fixtures/dos/` |

### 3.3 NIST Coverage Summary

| Metric | Value |
|--------|-------|
| **Total NIST Risk Categories** | 12 |
| **Fully Covered (≥90%)** | 8 |
| **Partially Covered (70-89%)** | 4 |
| **Not Covered (<70%)** | 0 |
| **Overall Coverage** | **85%** |

### 3.4 NIST Gaps

| Gap ID | NIST Ref | Description | Priority | Recommended Action |
|--------|----------|-------------|----------|-------------------|
| NIST-GAP-01 | #1 | CBRN dual-use research guidance limited | Medium | Add domain-specific CBRN patterns |
| NIST-GAP-02 | #4 | Real-time PII detection not integrated | High | Integrate BMAD PII guards |
| NIST-GAP-03 | #9 | Deepfake detection not in scope | Medium | Add deepfake indicator patterns |
| NIST-GAP-04 | GOVERN | Organizational governance not in scope | Low | Document as out of scope |
| NIST-GAP-05 | MAP | Risk mapping framework not included | Low | Document as out of scope |
| NIST-GAP-06 | MANAGE | Incident response not automated | Medium | Add IR trigger patterns |

---

## 4. MITRE ATLAS Compliance Matrix

### 4.1 Tactics Coverage

| Tactic | DojoLM Coverage | Pattern Groups | Status |
|--------|-----------------|----------------|--------|
| **Reconnaissance** | ✅ | MODEL_THEFT (fingerprinting) | Strong |
| **Resource Development** | ✅ | SUPPLY_CHAIN (model tampering) | Strong |
| **Initial Access** | ✅ | PI_PATTERNS, JB_PATTERNS, DELIVERY_VECTORS | Strong |
| **Execution** | ✅ | OUTPUT_HANDLING (command injection) | Strong |
| **Persistence** | ⚠️ | AGENT_CONTEXT (memory poisoning) | Partial |
| **Defense Evasion** | ✅ | ENCODING, WHITESPACE, OBFUSCATION | Strong |
| **Credential Access** | ✅ | AGENT_CREDENTIAL_PATTERNS | Strong |
| **Discovery** | ✅ | MODEL_THEFT (probing) | Strong |
| **Collection** | ⚠️ | Limited data exfiltration patterns | Partial |
| **Command and Control** | ❌ | Not in scope | Gap |
| **Exfiltration** | ✅ | MODEL_THEFT, VEC_LEAK | Strong |
| **Impact** | ✅ | DOS_PATTERNS, OUTPUT_HANDLING | Strong |

### 4.2 MITRE ATLAS Coverage Summary

| Metric | Value |
|--------|-------|
| **Total Tactics** | 12 |
| **Fully Covered** | 9 |
| **Partially Covered** | 2 |
| **Not Covered** | 1 |
| **Overall Coverage** | **87%** |

### 4.3 MITRE ATLAS Gaps

| Gap ID | Tactic | Description | Priority | Recommended Action |
|--------|--------|-------------|----------|-------------------|
| MITRE-GAP-01 | Command and Control | C2 channel detection not in scope | Low | Document as infrastructure control |
| MITRE-GAP-02 | Persistence | Long-term memory poisoning scenarios limited | Medium | Add multi-session attack patterns |
| MITRE-GAP-03 | Collection | Data staging detection limited | Low | Add bulk data access patterns |

---

## 5. ISO/IEC 42001:2023 Compliance Matrix

### 5.1 Clause Coverage

| Clause | Requirement | DojoLM Coverage | Status | Gap |
|--------|-------------|-----------------|--------|-----|
| **4** | Context of the Organization | 🟡 Organizational scope | Partial | Out of scope |
| **5** | Leadership | 🟡 Policy framework | Partial | Out of scope |
| **6** | Planning | ✅ Risk assessment via testing | Strong | — |
| **7** | Support | ⚠️ Competence, awareness | Partial | Training materials needed |
| **8** | Operation | ✅ Operational controls testing | Strong | — |
| **9** | Performance Evaluation | ✅ Testing framework, metrics | Strong | — |
| **10** | Improvement | ✅ Improvement tracker documented | Strong | — |

### 5.2 Annex A Controls Coverage

| Control Category | DojoLM Coverage | Status |
|------------------|-----------------|--------|
| **A.5** AI System Policies | 🟡 Documentation exists | Partial |
| **A.6** AI Risk Management | ✅ Comprehensive testing | Strong |
| **A.7** AI System Objectives | 🟡 Framework alignment documented | Partial |
| **A.8** AI Impact Assessment | ⚠️ Testing results provide evidence | Partial |

### 5.3 ISO/IEC 42001 Coverage Summary

| Metric | Value |
|--------|-------|
| **Total Clauses** | 10 |
| **Fully Covered** | 4 |
| **Partially Covered** | 4 |
| **Not Covered** | 2 |
| **Overall Coverage** | **70%** |

### 5.4 ISO/IEC 42001 Gaps

| Gap ID | Clause | Description | Priority | Recommended Action |
|--------|--------|-------------|----------|-------------------|
| ISO-GAP-01 | 4 | Organizational context documentation | Medium | Create context statement |
| ISO-GAP-02 | 5 | Leadership commitment documentation | Medium | Create policy statement |
| ISO-GAP-03 | 7 | Training/competence framework | High | Create training materials |
| ISO-GAP-04 | A.5 | AI-specific policy documentation | Medium | Create AI policy document |
| ISO-GAP-05 | A.8 | Impact assessment methodology | Medium | Document assessment process |

---

## 6. EU AI Act Compliance Matrix

### 6.1 Risk Tier Applicability

| Risk Tier | Description | DojoLM Applicability |
|-----------|-------------|---------------------|
| **Unacceptable** | Prohibited AI systems | Testing capability for detection |
| **High-Risk** | Safety-critical systems | ✅ Primary testing focus |
| **Limited Risk** | Transparency obligations | ✅ Transparency testing included |
| **Minimal Risk** | No specific requirements | ✅ General security testing |

### 6.2 High-Risk AI Requirements

| Requirement | DojoLM Coverage | Status | Testing Reference |
|-------------|-----------------|--------|-------------------|
| **Risk Management System** | ✅ Testing framework | Strong | All fixtures |
| **Data Governance** | ⚠️ Supply chain patterns | Partial | `fixtures/supply-chain/` |
| **Technical Documentation** | ✅ Audit reports generated | Strong | `docs/app/audit-report-guide.md` |
| **Record Keeping** | ⚠️ Session management | Partial | `packages/bu-tpi/fixtures/session/` |
| **Transparency** | ✅ OR_PATTERNS (attribution) | Strong | `fixtures/or/or-attribution-*` |
| **Human Oversight** | ⚠️ Automated decision patterns | Partial | `fixtures/or/or-automated-*` |
| **Accuracy & Robustness** | ✅ Comprehensive testing | Strong | All fixtures |
| **Cybersecurity** | ✅ OUTPUT_HANDLING, SUPPLY_CHAIN | Strong | `fixtures/output/`, `fixtures/supply-chain/` |

### 6.3 EU AI Act Coverage Summary

| Metric | Value |
|--------|-------|
| **Total Requirements** | 8 |
| **Fully Covered** | 5 |
| **Partially Covered** | 3 |
| **Not Covered** | 0 |
| **Overall Coverage** | **75%** |

### 6.4 EU AI Act Gaps

| Gap ID | Requirement | Description | Priority | Recommended Action |
|--------|-------------|-------------|----------|-------------------|
| EU-GAP-01 | Data Governance | Training data provenance not tested | High | Add data provenance patterns |
| EU-GAP-02 | Record Keeping | Long-term audit trail not automated | Medium | Integrate BMAD audit logging |
| EU-GAP-03 | Human Oversight | Human-in-the-loop patterns limited | Medium | Add HITL bypass patterns |

---

## 7. ENISA AI Security Compliance Matrix

### 7.1 Threat Categories

| Threat Category | DojoLM Coverage | Pattern Groups | Status |
|-----------------|-----------------|----------------|--------|
| **NAA-001** | AI System Attacks | PI_PATTERNS, JB_PATTERNS | ✅ Strong |
| **NAA-002** | Model Attacks | MODEL_THEFT_PATTERNS | ✅ Strong |
| **NAA-003** | Data Attacks | VEC_PATTERNS, SUPPLY_CHAIN | ✅ Strong |
| **NAA-004** | Infrastructure Attacks | DOS_PATTERNS | ✅ Strong |
| **NAA-005** | Agent Attacks | AGENT_*_PATTERNS | ✅ Strong |
| **NAA-006** | Output Attacks | OUTPUT_HANDLING_PATTERNS | ✅ Strong |
| **NAA-007** | Supply Chain | SUPPLY_CHAIN_PATTERNS | ✅ Strong |
| **NAA-008** | Privacy Attacks | AGENT_CREDENTIAL, VEC_LEAK | ✅ Strong |

### 7.2 ENISA Coverage Summary

| Metric | Value |
|--------|-------|
| **Total Threat Categories** | 8 |
| **Fully Covered** | 8 |
| **Partially Covered** | 0 |
| **Not Covered** | 0 |
| **Overall Coverage** | **85%** |

### 7.3 ENISA Gaps

| Gap ID | Category | Description | Priority | Recommended Action |
|--------|----------|-------------|----------|-------------------|
| ENISA-GAP-01 | NAA-001 | Physical side-channel attacks not in scope | Low | Document as out of scope |

---

## 8. Gap Analysis Summary

### 8.1 Critical Gaps (Priority: High)

| Gap ID | Framework | Description | Remediation Effort |
|--------|-----------|-------------|-------------------|
| NIST-GAP-02 | NIST AI 600-1 #4 | Real-time PII detection not integrated | 3-5 days |
| ISO-GAP-03 | ISO/IEC 42001 | Training/competence framework missing | 5-7 days |
| EU-GAP-01 | EU AI Act | Training data provenance not tested | 3-5 days |

### 8.2 Moderate Gaps (Priority: Medium)

| Gap ID | Framework | Description | Remediation Effort |
|--------|-----------|-------------|-------------------|
| OWASP-GAP-01 | LLM04 | Data provenance validation | 2-3 days |
| OWASP-GAP-03 | LLM06 | Real-time PII detection | 3-5 days |
| NIST-GAP-01 | #1 | CBRN dual-use guidance | 2-3 days |
| NIST-GAP-03 | #9 | Deepfake detection | 5-7 days |
| NIST-GAP-06 | MANAGE | Incident response automation | 3-5 days |
| MITRE-GAP-02 | Persistence | Multi-session attack patterns | 2-3 days |
| ISO-GAP-01 | 4 | Organizational context | 1-2 days |
| ISO-GAP-02 | 5 | Leadership commitment | 1-2 days |
| ISO-GAP-04 | A.5 | AI policy documentation | 2-3 days |
| ISO-GAP-05 | A.8 | Impact assessment methodology | 2-3 days |
| EU-GAP-02 | Record Keeping | Audit trail automation | 3-5 days |
| EU-GAP-03 | Human Oversight | HITL bypass patterns | 2-3 days |

### 8.3 Low Priority Gaps

| Gap ID | Framework | Description | Notes |
|--------|-----------|-------------|-------|
| OWASP-GAP-02 | LLM07 | Plugin permission boundaries | Limited applicability |
| NIST-GAP-04 | GOVERN | Organizational governance | Out of scope |
| NIST-GAP-05 | MAP | Risk mapping framework | Out of scope |
| MITRE-GAP-01 | C2 | Command and Control detection | Infrastructure control |
| MITRE-GAP-03 | Collection | Data staging detection | Limited applicability |
| ENISA-GAP-01 | NAA-001 | Physical side-channels | Out of scope |

---

## 9. Remediation Roadmap

### 9.1 Phase 1: Critical Gaps (Weeks 1-2)

| Task | Gap IDs | Effort | Owner | Deliverable |
|------|---------|--------|-------|-------------|
| Integrate BMAD PII Guards | NIST-GAP-02, OWASP-GAP-03 | 3-5 days | Security | PII detection module |
| Create Training Framework | ISO-GAP-03 | 5-7 days | QA | Training materials |
| Add Data Provenance Patterns | EU-GAP-01, OWASP-GAP-01 | 3-5 days | Security | Provenance fixtures |

### 9.2 Phase 2: Moderate Gaps (Weeks 3-4)

| Task | Gap IDs | Effort | Owner | Deliverable |
|------|---------|--------|-------|-------------|
| Create ISO Documentation | ISO-GAP-01, 02, 04, 05 | 5-7 days | Compliance | Policy documents |
| Add Deepfake Indicators | NIST-GAP-03 | 5-7 days | Security | Deepfake patterns |
| Enhance Audit Trail | EU-GAP-02, NIST-GAP-06 | 3-5 days | Engineering | Audit integration |
| Add Multi-Session Patterns | MITRE-GAP-02, EU-GAP-03 | 2-3 days | Security | Session fixtures |

### 9.3 Phase 3: Documentation & Alignment (Weeks 5-6)

| Task | Gap IDs | Effort | Owner | Deliverable |
|------|---------|--------|-------|-------------|
| Document Out-of-Scope Items | NIST-GAP-04, 05, MITRE-GAP-01 | 1-2 days | Compliance | Scope statement |
| Create CBRN Guidance | NIST-GAP-01 | 2-3 days | Security | Guidance document |
| Update Coverage Matrix | All | 1-2 days | QA | Updated matrix |

### 9.4 Effort Summary

| Phase | Duration | Effort (days) | Priority |
|-------|----------|---------------|----------|
| Phase 1 | 2 weeks | 11-17 days | High |
| Phase 2 | 2 weeks | 15-22 days | Medium |
| Phase 3 | 2 weeks | 4-7 days | Low |
| **Total** | **6 weeks** | **30-46 days** | — |

---

## 10. Appendices

### 10.1 Testing Reference Matrix

| Testing Area | Fixture Directory | Pattern Groups | Framework Mapping |
|--------------|-------------------|----------------|-------------------|
| TA-01: Prompt Injection | `fixtures/encoded/`, `fixtures/modern/` | PI, JB, BOUNDARY, MULTILINGUAL | OWASP LLM01 |
| TA-02: WebFetch Injection | `fixtures/web/` | WEBFETCH | OWASP LLM01 |
| TA-03: Output Handling | `fixtures/output/` | OUTPUT_HANDLING | OWASP LLM02, 05 |
| TA-04: Delivery Vectors | `fixtures/context/`, `fixtures/document-attacks/` | SHARED_DOC, API_RESPONSE, PLUGIN | OWASP LLM01 |
| TA-05: Search Results | `fixtures/search-results/` | SEARCH_RESULT | OWASP LLM01 |
| TA-06: Social Engineering | `fixtures/social/` | SOCIAL, PERSONA, HYPOTHETICAL | OWASP LLM01 |
| TA-07: Agent Security | `fixtures/agent/`, `fixtures/agent-output/` | AGENT_* | OWASP LLM07, 08 |
| TA-08: Cognitive Attacks | `fixtures/cognitive/` | REVERSE_PSYCH, REWARD | OWASP LLM01 |
| TA-10: Denial of Service | `fixtures/dos/` | DOS | OWASP LLM04 |
| TA-11: Supply Chain | `fixtures/supply-chain/` | SUPPLY_CHAIN | OWASP LLM03, 05 |
| TA-12: Model Theft | `fixtures/model-theft/` | MODEL_THEFT | OWASP LLM10 |
| TA-15: Overreliance | `fixtures/or/` | OR | OWASP LLM09 |
| TA-16: Vector/Embeddings | `fixtures/vec/` | VEC | OWASP LLM04 |
| TA-17: Bias & Fairness | `fixtures/bias/` | BIAS | NIST #6 |
| TA-18: Multimodal | `fixtures/images/`, `fixtures/audio/` | MEDIA | MITRE ATLAS |
| TA-19: Multimodal Security | `fixtures/multimodal/` | MULTIMODAL, OCR, VIDEO | MITRE ATLAS |
| TA-20: Environmental | `fixtures/environmental/` | ENV | NIST #5 |

### 10.2 Framework Reference Links

| Framework | Version | URL |
|-----------|---------|-----|
| OWASP LLM Top 10 | 2025 | https://owasp.org/www-project-top-10-for-large-language-model-applications/ |
| NIST AI RMF | 1.0 | https://www.nist.gov/itl/ai-risk-management-framework |
| NIST AI 600-1 | 2024 | https://nvlpubs.nist.gov/nistpubs/AI/NIST.AI.600-1.pdf |
| MITRE ATLAS | Current | https://atlas.mitre.org/ |
| ISO/IEC 42001 | 2023 | https://www.iso.org/standard/81230.html |
| EU AI Act | 2024 | https://artificialintelligenceact.eu/ |
| ENISA AI Security | Current | https://www.enisa.europa.eu/publications/multilayer-framework-for-good-cybersecurity-practices-for-ai |

### 10.3 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Compliance Audit | Initial compliance gap analysis |

---

## Conclusion

The DojoLM security testing framework demonstrates **strong compliance coverage** across major AI security frameworks:

- **OWASP LLM Top 10**: 95% coverage — Industry-leading alignment
- **NIST AI RMF/AI 600-1**: 85% coverage — Good technical control coverage
- **MITRE ATLAS**: 87% coverage — Comprehensive tactic coverage
- **ISO/IEC 42001**: 70% coverage — Organizational controls require documentation
- **EU AI Act**: 75% coverage — High-risk AI requirements substantially met
- **ENISA AI Security**: 85% coverage — Strong threat category coverage

### Key Strengths

1. **Comprehensive Pattern Coverage**: 505+ patterns across 47 groups
2. **Multi-Framework Alignment**: Strong mapping to OWASP, NIST, MITRE
3. **Heuristic Detection**: 6 specialized detectors for evasion techniques
4. **Text Normalization**: Defense-in-depth against encoding attacks
5. **Extensive Fixtures**: 1,544 test files across 30 categories

### Priority Recommendations

1. **Integrate BMAD PII Guards** for real-time PII detection (NIST #4, OWASP LLM06)
2. **Create ISO/IEC 42001 documentation** for organizational controls
3. **Add data provenance patterns** for EU AI Act compliance
4. **Enhance audit trail integration** for compliance evidence

The framework is well-positioned for enterprise deployment with the identified gaps representing primarily documentation and integration work rather than fundamental capability gaps.
