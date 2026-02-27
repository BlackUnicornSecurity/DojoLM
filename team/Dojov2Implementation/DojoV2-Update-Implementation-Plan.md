# DojoV2-Update Implementation Plan

**Project:** BU-TPI Framework Enhancement to Industry Standard Alignment
**Version:** 1.0
**Date:** 2026-02-26
**Owner:** BlackUnicorn Laboratory

---

## Overview

This plan documents the systematic enhancement of the BU-TPI security testing framework from 72 controls to approximately 128 controls, aligning with OWASP LLM Top 10, MITRE ATLAS, NIST AI RMF, and ENISA AI Security guidelines.

### Current State
- **Controls:** 72
- **Test Cases:** 639
- **Framework Coverage:** ~60-70% of industry standards

### Target State
- **Controls:** ~128 (add 56 new controls)
- **Test Cases:** ~1,100 (add ~460 new test cases)
- **Framework Coverage:** ~95% of industry standards

---

## Phase 1: Critical Security Gaps

**Duration:** 2-3 weeks
**New Controls:** 20
**New Test Cases:** ~160
**Priority:** P0 - Critical

### 1.1 Model Denial of Service (DOS-01 to DOS-06)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| DOS-01 | Input Length Attacks | 9 | OWASP LLM04, MITRE AML.T0029 |
| DOS-02 | Recursive/Loop Attacks | 9 | OWASP LLM04 |
| DOS-03 | Context Window Overflow | 9 | OWASP LLM04 |
| DOS-04 | Output Limit Breaking (P-DoS) | 9 | OWASP LLM04 |
| DOS-05 | Concurrent Request Flooding | 9 | OWASP LLM04 |
| DOS-06 | Cost Harvesting Attacks | 9 | MITRE AML.T0034 |

**Implementation Tasks:**
1. Create test payloads for extreme-length inputs (100K+ characters)
2. Design recursive prompt patterns (JSON nesting, XML depth)
3. Test token limit boundaries (context window probing)
4. Implement P-DoS test cases (poisoned samples that expand output)
5. Create concurrent request simulation tests
6. Design cost harvesting scenarios (multi-step resource-intensive tasks)

**Acceptance Criteria:**
- [x] All 54 test cases defined with payloads
- [x] Detection mechanisms documented for each attack type (18 patterns in DOS_PATTERNS)
- [x] Evidence capture procedures defined (pattern descriptions, categories, severity)
- [x] Integration with existing scanner complete (DOS_PATTERNS in ALL_PATTERN_GROUPS, engine filter added)

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 54 DOS test fixtures (9 per control × 6 controls)
- Added 18 DOS detection patterns to scanner (DOS_PATTERNS)
- Added S-012 "Denial of Service Assessment" scenario
- Added "Denial of Service" to COVERAGE_DATA
- All 54 fixtures verified passing (42 attack + 12 clean/benign)

---

### 1.2 Supply Chain Vulnerabilities (SC-01 to SC-06)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| SC-01 | Third-Party Model Testing | 9 | OWASP LLM05 |
| SC-02 | Dependency Vulnerability Scanning | 9 | OWASP LLM05 |
| SC-03 | Plugin Security Testing | 9 | OWASP LLM05 |
| SC-04 | Data Source Verification | 9 | OWASP LLM05 |
| SC-05 | Typosquatting Detection | 9 | OWASP LLM05 |
| SC-06 | Model/Component Tampering | 9 | ENISA NAA |

**Implementation Tasks:**
1. Create model verification test suite (checksums, signatures)
2. Design dependency scanner integration (pip-audit, npm audit)
3. Build plugin security test cases (LangChain, LlamaIndex CVEs)
4. Create data source validation procedures
5. Design typosquatting attack scenarios
6. Implement model tampering detection tests

**Acceptance Criteria:**
- [x] All 54 test cases defined
- [x] Scanner patterns added (SUPPLY_CHAIN_PATTERNS)
- [x] Fixtures created for all 6 control areas
- [x] Integration with existing scanner complete

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 54 SC test fixtures (9 per control × 6 controls)
- Added 24+ supply chain detection patterns to scanner (SUPPLY_CHAIN_PATTERNS)
- All fixtures verified with 100% pass rate

---

### 1.3 AI Agent Security (AG-01 to AG-08)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| AG-01 | AI Agent Tool Credential Harvesting | 9 | MITRE AML.T0098 |
| AG-02 | AI Agent Context Poisoning | 9 | MITRE AML.T0080 |
| AG-03 | AI Agent Tool Data Poisoning | 9 | MITRE AML.T0099 |
| AG-04 | RAG Poisoning | 9 | MITRE AML.T0070 |
| AG-05 | RAG Credential Harvesting | 9 | MITRE AML.T0082 |
| AG-06 | False RAG Entry Injection | 9 | MITRE AML.T0071 |
| AG-07 | Multi-Agent Manipulation | 9 | MITRE ATLAS |
| AG-08 | Agent Memory Extraction | 9 | MITRE ATLAS |

**Implementation Tasks:**
1. Design agent tool credential harvesting prompts
2. Create context poisoning test scenarios
3. Build RAG poisoning attack vectors
4. Implement false RAG entry injection tests
5. Design multi-agent manipulation scenarios
6. Create agent memory extraction prompts

**Acceptance Criteria:**
- [x] All 72 test cases defined
- [x] RAG testing procedures documented
- [x] Multi-agent attack scenarios designed
- [x] Agent security testing guide created

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 72 AG test fixtures (9 per control × 8 controls)
- Added 40+ agent security detection patterns to scanner (AGENT_SECURITY_PATTERNS)
- All fixtures verified with 100% pass rate (56/56 malicious detected, 16/16 clean passed)
- RAG poisoning, credential harvesting, and multi-agent manipulation patterns implemented

---

## Phase 2: Important Security Gaps

**Duration:** 2-3 weeks
**New Controls:** 17
**New Test Cases:** ~150
**Priority:** P1 - High

### 2.1 Model Theft / Extraction (MT-01 to MT-06)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| MT-01 | API Extraction Attacks | 9 | OWASP LLM10 |
| MT-02 | Model Fingerprinting | 9 | OWASP LLM10 |
| MT-03 | Probability Distribution Extraction | 9 | OWASP LLM10 |
| MT-04 | Training Data Reconstruction | 9 | OWASP LLM10, MITRE AML.T0035 |
| MT-05 | Model Watermark Detection/Removal | 9 | OWASP LLM10 |
| MT-06 | Side-Channel Attacks | 9 | OWASP LLM10, MITRE AML.T0107 |

**Implementation Tasks:**
1. Design API extraction test patterns
2. Create model fingerprinting procedures
3. Build probability distribution extraction tests
4. Implement training data reconstruction prompts
5. Design watermark robustness tests
6. Create side-channel attack scenarios

**Acceptance Criteria:**
- [x] All 54 test cases defined
- [x] Model extraction detection guide created
- [x] Watermark testing procedures documented

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 54 MT test fixtures (9 per control × 6 controls)
- Added 30+ model theft detection patterns to scanner (MODEL_THEFT_PATTERNS)
- All fixtures verified with 100% pass rate (42/42 malicious detected, 12/12 clean passed)
- API extraction, fingerprinting, and side-channel attack patterns implemented

---

### 2.2 Insecure Output Handling (OUT-01 to OUT-06)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| OUT-01 | XSS via LLM Output | 9 | OWASP LLM02 |
| OUT-02 | SQL Injection via Output | 9 | OWASP LLM02 |
| OUT-03 | Command Injection via Output | 9 | OWASP LLM02 |
| OUT-04 | SSRF via Output | 9 | OWASP LLM02 |
| OUT-05 | Path Traversal via Output | 9 | OWASP LLM02 |
| OUT-06 | Open Redirect via Output | 9 | OWASP LLM02 |

**Implementation Tasks:**
1. Create XSS generation prompts
2. Design SQLi generation prompts
3. Build command injection scenarios
4. Implement SSRF test cases
5. Create path traversal prompts
6. Design open redirect scenarios

**Acceptance Criteria:**
- [x] All 54 test cases defined
- [x] Output validation procedures documented
- [x] Integration with existing DE controls

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 54 OUT test fixtures (9 per control × 6 controls)
- Added 40+ output handling detection patterns to scanner (OUTPUT_HANDLING_PATTERNS)
- All fixtures verified with 100% pass rate

---

### 2.3 Vector & Embeddings Weaknesses (VEC-01 to VEC-05)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| VEC-01 | Indirect Prompt Injection via Embeddings | 9 | OWASP 2025 |
| VEC-02 | Embedding Poisoning | 9 | OWASP 2025 |
| VEC-03 | Vector Database Data Leakage | 9 | OWASP 2025 |
| VEC-04 | SEO-Optimized Poisoning | 9 | OWASP 2025 |
| VEC-05 | Embedding Similarity Attacks | 9 | OWASP 2025 |

**Implementation Tasks:**
1. Design embedding-based injection prompts
2. Create vector database poisoning scenarios
3. Build embedding similarity attack tests
4. Implement SEO-optimized poisoning tests
5. Design vector DB data extraction prompts

**Acceptance Criteria:**
- [x] All 45 test cases defined
- [x] Embedding security guide created
- [x] Vector database testing procedures documented

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 45 VEC test fixtures (9 per control × 5 controls)
- Added 30+ vector embedding detection patterns to scanner (VEC_PATTERNS)
- All fixtures verified with 100% pass rate (40/40 malicious detected, 5/5 clean passed)
- Indirect injection, embedding poisoning, and SEO attack patterns implemented

---

## Phase 3: Enhancement & Compliance

**Duration:** 1-2 weeks
**New Controls:** 19
**New Test Cases:** ~100
**Priority:** P2 - Medium

### 3.1 Overreliance & Misinformation (OR-01 to OR-06)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| OR-01 | Automated Decision Making | 7 | OWASP LLM09, NIST #7 |
| OR-02 | Code Execution Without Review | 7 | OWASP LLM09 |
| OR-03 | Professional Advice Without Verification | 7 | OWASP LLM09 |
| OR-04 | Confidence Calibration | 7 | NIST #2, #8 |
| OR-05 | Source Attribution Verification | 7 | NIST #8 |
| OR-06 | Consistency Testing | 7 | NIST #2 |

**Implementation Tasks:**
1. Design automated decision-making prompts
2. Create code execution scenarios
3. Build professional advice tests (medical, legal, financial)
4. Implement confidence calibration tests
5. Design source attribution validation
6. Create multi-turn consistency tests

**Acceptance Criteria:**
- [x] All 42 test cases defined
- [x] Hallucination detection procedures documented
- [x] Scanner patterns added (OR_PATTERNS)
- [x] S-015 scenario added
- [x] TA-25 testing area added
- [x] COVERAGE_DATA updated
- [x] ENGINE_FILTERS updated
- [x] Fixture manifest updated

**Status:** ✅ COMPLETED (2026-02-26)

---

### 3.2 Expanded Bias Testing (BF-05 to BF-09)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| BF-05 | Disability Bias | 7 | NIST AI 600-1 #6 |
| BF-06 | Socioeconomic Bias | 7 | NIST AI 600-1 #6 |
| BF-07 | Cultural Bias | 7 | NIST AI 600-1 #6 |
| BF-08 | Geographic Bias | 7 | NIST AI 600-1 #6 |
| BF-09 | Language Performance Bias | 7 | NIST AI 600-1 #6 |

**Implementation Tasks:**
1. Create disability discrimination test scenarios
2. Design socioeconomic bias prompts
3. Build cultural bias test cases
4. Implement geographic bias tests
5. Create language performance disparity tests

**Acceptance Criteria:**
- [x] All 35 test cases defined
- [x] Fairness metrics documented
- [x] Demographic testing procedures created
- [x] Scanner patterns added (BF_PATTERNS)
- [x] S-006 scenario updated (71 test cases)
- [x] COVERAGE_DATA updated
- [x] ENGINE_FILTERS updated
- [x] Fixture manifest updated (949 total)

**Status:** ✅ COMPLETED (2026-02-26)

---

### 3.3 Multimodal Security (MM-01 to MM-05)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| MM-01 | Image-Based Prompt Injection | 7 | MITRE ATLAS |
| MM-02 | Audio-Based Prompt Injection | 7 | MITRE ATLAS |
| MM-03 | Deepfake Generation Detection | 7 | MITRE AML.T0088 |
| MM-04 | Visual Adversarial Examples | 7 | MITRE ATLAS |
| MM-05 | Cross-Modal Injection | 7 | MITRE ATLAS |

**Implementation Tasks:**
1. Create image-based jailbreak test cases
2. Design audio-based attack scenarios
3. Build deepfake generation prompts
4. Implement visual adversarial examples
5. Create cross-modal injection tests

**Acceptance Criteria:**
- [x] All 35 test cases defined
- [x] Multimodal testing guide created
- [x] Image/audio test fixtures prepared

**Status:** ✅ COMPLETED (2026-02-26)

**Implementation Summary:**
- Created 35 multimodal test fixtures (7 per control area)
- Added 28 multimodal detection patterns to scanner (MM_PATTERNS)
- Updated manifest to 984 total fixtures
- Created comprehensive multimodal testing guide
- Framework mappings: MITRE ATLAS, OWASP LLM Top 10, NIST AI RMF

---

### 3.4 Environmental Impact (ENV-01 to ENV-03)

| Control ID | Control Name | Test Cases | Framework Mapping |
|------------|--------------|------------|-------------------|
| ENV-01 | Energy Consumption Testing | 5 | NIST AI 600-1 #5 |
| ENV-02 | Carbon Footprint Assessment | 5 | NIST AI 600-1 #5 |
| ENV-03 | Efficiency Optimization | 5 | NIST AI 600-1 #5 |

**Implementation Tasks:**
1. Design energy measurement procedures
2. Create carbon footprint assessment templates
3. Build efficiency optimization tests

**Acceptance Criteria:**
- [x] All 15 test cases defined
- [x] Green AI guidelines documented
- [x] Scanner patterns added (ENV_PATTERNS - 15 patterns)
- [x] S-ENV scenario added (15 fixtures)
- [x] TA-20 testing area added (Environmental Impact)
- [x] COVERAGE_DATA updated
- [x] ENGINE_FILTERS updated
- [x] Fixture manifest updated (999 total)

**Status:** ✅ COMPLETED (2026-02-27)

**Implementation Summary:**
- Created 15 environmental test fixtures (5 per control area)
- Added 15 environmental detection patterns to scanner (ENV_PATTERNS)
- Updated manifest to 999 total fixtures
- Created comprehensive Green AI guidelines documentation
- Framework mappings: NIST AI 600-1 #5, ISO/IEC TR 20226:2025, Green AI Principles

---

## Implementation Timeline

```
Week 1-3: Phase 1 - Critical Gaps
├── Week 1: DOS controls (6 controls, 54 tests)
├── Week 2: SC controls (6 controls, 54 tests)
└── Week 3: AG controls (8 controls, 72 tests)

Week 4-6: Phase 2 - Important Gaps
├── Week 4: MT controls (6 controls, 54 tests)
├── Week 5: OUT controls (6 controls, 54 tests)
└── Week 6: VEC controls (5 controls, 45 tests)

Week 7-8: Phase 3 - Enhancement
├── Week 7: OR + BF controls (11 controls, 77 tests)
└── Week 8: MM + ENV controls (8 controls, 50 tests)

Week 9: Integration & Validation
├── Scanner integration
├── Documentation updates
└── Quality assurance

Week 10: Release
├── Final testing
└── DojoV2 release
```

---

## Testing Area Consolidation

### Current Testing Areas (11)
1. TA-01: Prompt Injection (PI)
2. TA-02: Jailbreaks (JB)
3. TA-03: Data Extraction (DE)
4. TA-04: Harmful Content (HC)
5. TA-05: Content Policy (CP)
6. TA-06: Privacy Violations (PV)
7. TA-07: Bias & Fairness (BF)
8. TA-08: Misinformation (MI)
9. TA-09: Indirect Injection (II)
10. TA-10: Tool/Agent Abuse (TA)
11. TA-11: Context Confusion (CC)

### New Testing Areas (DojoV2)
1. TA-01: Prompt Injection (PI) - *Existing*
2. TA-02: Jailbreaks (JB) - *Existing*
3. TA-03: Data Extraction (DE) - *Existing*
4. TA-04: Harmful Content (HC) - *Existing*
5. TA-05: Content Policy (CP) - *Existing*
6. TA-06: Privacy Violations (PV) - *Enhanced*
7. TA-07: Bias & Fairness (BF) - *Expanded*
8. TA-08: Misinformation (MI) - *Enhanced*
9. TA-09: Indirect Injection (II) - *Existing*
10. TA-10: Tool/Agent Abuse (TA) - *Enhanced*
11. TA-11: Context Confusion (CC) - *Enhanced*
12. **TA-12: Model Denial of Service (DOS)** - *NEW*
13. **TA-13: Supply Chain (SC)** - *NEW*
14. **TA-14: AI Agent Security (AG)** - *NEW*
15. **TA-15: Model Theft (MT)** - *NEW*
16. **TA-16: Output Handling (OUT)** - *NEW*
17. **TA-17: Vector & Embeddings (VEC)** - *NEW*
18. **TA-18: Overreliance (OR)** - *NEW*
19. **TA-19: Multimodal Security (MM)** - *NEW*
20. **TA-20: Environmental Impact (ENV)** - *NEW*

---

## Control Distribution Summary

| Testing Area | Controls | Test Cases | Status |
|--------------|----------|------------|--------|
| PI | 8 | 72 | Existing |
| JB | 8 | 72 | Existing |
| DE | 8 | 72 | Existing |
| HC | 8 | 72 | Existing |
| CP | 6 | 54 | Existing |
| PV | 6 | 54 | Existing |
| BF | 9 | 67 | COMPLETED |
| MI | 10 | 78 | Expanded (+6) |
| II | 8 | 72 | Existing |
| TA | 14 | 126 | Expanded (+8) |
| CC | 12 | 108 | Expanded (+6) |
| **DOS** | **6** | **54** | **COMPLETED** |
| **SC** | **6** | **54** | **NEW** |
| **AG** | **8** | **72** | **NEW** |
| **MT** | **6** | **54** | **NEW** |
| **OUT** | **6** | **54** | **NEW** |
| **VEC** | **5** | **45** | **NEW** |
| **OR** | **6** | **42** | **COMPLETED** |
| **MM** | **5** | **35** | **NEW** |
| **ENV** | **3** | **15** | **NEW** |
| **TOTAL** | **132** | **1,140** | **+60 controls, +501 tests** |

---

## Success Metrics

| Metric | Current | Target | Success Criteria |
|--------|---------|--------|------------------|
| Framework Coverage | 60-70% | 95%+ | All major standards mapped |
| OWASP LLM Top 10 | 7/10 | 10/10 | 100% coverage |
| MITRE ATLAS Tactics | 8/16 | 14/16 | 87%+ coverage |
| NIST AI 600-1 Risks | 7/12 | 12/12 | 100% coverage |
| ENISA Threats | 5/8 | 8/8 | 100% coverage |
| Total Controls | 72 | 132 | +60 controls |
| Total Test Cases | 639 | 1,140 | +501 test cases |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Scope creep | Medium | Medium | Strict phase boundaries |
| Test case quality | Low | High | Peer review process |
| Scanner integration issues | Medium | High | Early integration testing |
| Documentation lag | High | Medium | Docs-as-code approach |
| Timeline slippage | Medium | Medium | Buffer time in Week 9 |

---

## Dependencies

| Dependency | Type | Owner | Status |
|------------|------|-------|--------|
| Scanner architecture review | Technical | Dev Team | Pending |
| Test payload generation | Content | Security Team | Pending |
| Documentation templates | Process | Docs Team | Pending |
| QA procedures | Process | QA Team | Pending |
| Framework documentation | External | N/A | Complete |

---

## Next Steps

1. **Review and approve this plan** - Stakeholder sign-off
2. **Create detailed test payloads** - Security team
3. **Update scanner architecture** - Dev team
4. **Begin Phase 1 implementation** - Week 1 start
5. **Weekly progress reviews** - Every Friday

---

*Document Version: 1.0*
*Last Updated: 2026-02-26*
*Owner: BlackUnicorn Laboratory*
