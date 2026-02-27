# DojoV2 Implementation Folder Index

**Last Updated:** 2026-02-26
**Purpose:** Token-efficient navigation for DojoV2 framework enhancement project

---

## File Overview

| File | Lines | Purpose | Key Sections |
|------|-------|---------|--------------|
| [DojoV2-Update-Implementation-Plan.md](DojoV2-Update-Implementation-Plan.md) | 446 | Master implementation plan from 72→132 controls | 3 phases, timeline, control distribution |
| [DojoV2-Coverage-Matrix.md](DojoV2-Coverage-Matrix.md) | 584 | Framework alignment mappings | OWASP, MITRE, NIST, ENISA coverage gaps |
| [dojo-v2-implementation.md](dojo-v2-implementation.md) | 1,408 | Detailed epic with 17 stories | Step-by-step tasks, acceptance criteria |
| [nist-ai-rmf-security-controls.md](nist-ai-rmf-security-controls.md) | 435 | NIST AI RMF 1.0 reference | 4 functions, 12 GenAI risks, testing areas |

---

## Quick Reference: Control Expansion

### Current → Target State
- **Controls:** 72 → 132 (+60)
- **Test Cases:** 639 → 1,140 (+501)
- **Testing Areas:** 11 → 20 (+9)
- **Framework Coverage:** ~60% → ~95%

### New Testing Areas (TA-12 to TA-20)
| ID | Name | Controls | Test Cases | Framework Source |
|----|------|----------|------------|------------------|
| TA-12 | Model Denial of Service | 6 (DOS-01→06) | 54 | OWASP LLM04 |
| TA-13 | Supply Chain | 6 (SC-01→06) | 54 | OWASP LLM05 |
| TA-14 | AI Agent Security | 8 (AG-01→08) | 72 | OWASP LLM07/08 |
| TA-15 | Model Theft | 6 (MT-01→06) | 54 | OWASP LLM10 |
| TA-16 | Output Handling | 6 (OUT-01→06) | 54 | OWASP LLM02 |
| TA-17 | Vector & Embeddings | 5 (VEC-01→05) | 45 | OWASP 2025 |
| TA-18 | Overreliance | 6 (OR-01→06) | 42 | OWASP LLM09 |
| TA-19 | Multimodal Security | 5 (MM-01→05) | 35 | MITRE ATLAS |
| TA-20 | Environmental Impact | 3 (ENV-01→03) | 15 | NIST AI 600-1 #5 |

---

## Phase Summary (Implementation Plan)

### Phase 1: Critical Gaps (Weeks 1-3) - P0
**20 controls, 180 test cases**
- Story 1.1: DOS controls (DOS-01→06)
- Story 1.2: Supply Chain (SC-01→06)
- Story 1.3: AI Agent Security (AG-01→08)

### Phase 2: Important Gaps (Weeks 4-6) - P1
**17 controls, 153 test cases**
- Story 2.1: Model Theft (MT-01→06)
- Story 2.2: Output Handling (OUT-01→06)
- Story 2.3: Vector & Embeddings (VEC-01→05)

### Phase 3: Enhancement (Weeks 7-8) - P2
**19 controls, 127 test cases**
- Story 3.1: Overreliance (OR-01→06)
- Story 3.2: Expanded Bias (BF-05→09)
- Story 3.3: Multimodal (MM-01→05)
- Story 3.4: Environmental (ENV-01→03)

### Phase 4: Integration (Week 9) - P0
- Scanner integration
- Documentation updates
- Quality assurance

### Phase 5: Release (Week 10) - P0
- Version 4.0.0 release

### Phase 6: Scenarios & Branding (Week 11) - P1
- 7 new standard-based scenarios (S-012→S-017)
- "Full Scope" → "BlackUnicorn AI Security Standard" (BAISS)

---

## Framework Coverage Gaps (Coverage Matrix)

### OWASP LLM Top 10
| Category | Current | DojoV2 |
|----------|---------|--------|
| LLM01 Prompt Injection | ✅ | ✅ |
| LLM02 Output Handling | ❌ | OUT-01→06 |
| LLM03 Training Poisoning | ⚠️ | SC-04, SC-06 |
| LLM04 Model DOS | ⚠️ | DOS-01→06 |
| LLM05 Supply Chain | ❌ | SC-01→06 |
| LLM06 Sensitive Disclosure | ✅ | ✅ |
| LLM07 Plugin Design | ⚠️ | AG-01→08 |
| LLM08 Excessive Agency | ⚠️ | AG-01→08 |
| LLM09 Overreliance | ⚠️ | OR-01→06 |
| LLM10 Model Theft | ⚠️ | MT-01→06 |

### MITRE ATLAS Tactics Coverage
- Current: 8/16 (50%)
- DojoV2: 14/16 (87%)
- Missing: Reconnaissance, Discovery (partial)

### NIST AI 600-1: 12 Risk Categories
1. CBRN Information → HC-01 expansion
2. Confabulation → OR-04→06
3. Dangerous Content → ✅
4. Data Privacy → MT-04, DE-03
5. **Environmental → ENV-01→03 (NEW)**
6. Harmful Bias → BF-05→09
7. **Human-AI Configuration → OR-01→03 (NEW)**
8. **Information Integrity → OR-04→06 (NEW)**
9. **Information Security → OUT-01→06 (NEW)**
10. **Intellectual Property → MT-01→06 (NEW)**
11. Obscene Content → ✅
12. **Value Chain → SC-01→06 (NEW)**

---

## Epic File Section Index (dojo-v2-implementation.md)

### Story Structure
Each story contains:
- **Story ID:** STORY-DOJOV2-XXX
- **Acceptance Criteria:** Checkbox list
- **Steps:** Numbered sub-tasks with checkboxes

### File Impact Analysis (Lines 28-54)
| File | Changes Required | Impact |
|------|-----------------|--------|
| `packages/dojolm-scanner/src/types.ts` | Add new control types | Medium |
| `packages/dojolm-scanner/src/scanner.ts` | Add detection patterns | High |
| `packages/dojolm-web/src/lib/constants.ts` | Update COVERAGE_DATA | Medium |
| `packages/dojolm-web/src/lib/llm-scenarios.ts` | Add 60 scenarios | High |

### Phase 1 Stories (Lines 57-401)
- **Story 1.1** (64-168): DOS controls - 54 fixtures
- **Story 1.2** (170-273): Supply Chain - 54 fixtures
- **Story 1.3** (276-401): AI Agent Security - 72 fixtures

### Phase 2 Stories (Lines 404-712)
- **Story 2.1** (412-513): Model Theft - 54 fixtures
- **Story 2.2** (516-618): Output Handling - 54 fixtures
- **Story 2.3** (621-712): Vector/Embeddings - 45 fixtures

### Phase 3 Stories (Lines 715-896)
- **Story 3.1** (723-764): Overreliance - 42 fixtures
- **Story 3.2** (768-807): Expanded Bias - 35 fixtures
- **Story 3.3** (811-853): Multimodal - 35 fixtures
- **Story 3.4** (857-896): Environmental - 15 fixtures

### Phase 4 Stories (Lines 899-996)
- **Story 4.1** (905-929): Scanner Integration
- **Story 4.2** (933-955): Documentation Updates
- **Story 4.3** (959-996): Quality Assurance

### Phase 5 Release (Lines 999-1038)
- **Story 5.1** (1004-1038): DojoV2 Release

### Phase 6 Scenarios & Branding (Lines 1083-1403)
- **Story 6.1** (1091-1184): Standard-Based Scenarios
- **Story 6.2** (1188-1256): BAISS Rebranding
- **Story 6.3** (1260-1300): Scenario Testing

---

## Scenario Summary (Epic Lines 1303-1357)

### Current Scenarios (S-001 to S-011)
| ID | Name | TA Focus | Cases |
|----|------|----------|-------|
| S-001 | Direct Override | TA-01 | 72 |
| S-002 | Persona Adoption | TA-02 | 72 |
| S-003 | Information Leakage | TA-03 | 72 |
| S-004 | Content Generation | TA-04,05 | 96 |
| S-005 | Privacy Violations | TA-06 | 48 |
| S-006 | Fairness Assessment | TA-07 | 36 |
| S-007 | False Content Creation | TA-08 | 36 |
| S-008 | Encoding Evasion | TA-09 | 60 |
| S-009 | Tool Exploitation | TA-10 | 48 |
| S-010 | Context Manipulation | TA-11 | 48 |
| **S-011** | **BlackUnicorn AI Security Standard** | **All 20** | **1,140** |

### New Standard-Based Scenarios (S-012 to S-017)
| ID | Framework | Cases | Time |
|----|-----------|-------|------|
| S-012 | OWASP LLM Top 10 | ~720 | 4h |
| S-013 | MITRE ATLAS | ~680 | 3h 40m |
| S-014 | NIST AI RMF 600-1 | ~650 | 3h 20m |
| S-015 | ENISA AI Security | ~600 | 3h 10m |
| S-016 | EU AI Act | ~400 | 2h |
| S-017 | ISO/IEC 42001 | ~450 | 2h 20m |

---

## NIST AI RMF Reference (nist-ai-rmf-security-controls.md)

### Four Core Functions
1. **GOVERN** - Risk management culture (org-level, out of scope)
2. **MAP** - Context establishment (org-level, out of scope)
3. **MEASURE** - Testing and monitoring (in scope for testing)
4. **MANAGE** - Risk treatment (org-level, out of scope)

### Trustworthy AI Characteristics (Lines 30-38)
1. Valid and Reliable
2. Safe
3. Secure and Resilient
4. Accountable and Transparent
5. Explainable and Interpretable
6. Privacy-Enhanced
7. Fair – with Harmful Bias Managed

### NIST AI 600-1: 12 GenAI Risk Categories (Lines 312-338)
| # | Risk | Relevant Controls |
|---|------|-------------------|
| 1 | CBRN Information | HC-01 |
| 2 | Confabulation | OR-04→06 |
| 3 | Dangerous Content | HC, CP |
| 4 | Data Privacy | PV, MT-04 |
| 5 | Environmental | ENV-01→03 |
| 6 | Harmful Bias | BF-01→09 |
| 7 | Human-AI Config | OR-01→03 |
| 8 | Information Integrity | OR-04→06, MI |
| 9 | Information Security | OUT-01→06 |
| 10 | Intellectual Property | MT-01→06 |
| 11 | Obscene Content | CP-06, HC-07 |
| 12 | Value Chain | SC-01→06 |

---

## Control ID Cross-Reference

### New Control Prefixes
- **DOS-** : Denial of Service (6 controls)
- **SC-** : Supply Chain (6 controls)
- **AG-** : AI Agent Security (8 controls)
- **MT-** : Model Theft (6 controls)
- **OUT-** : Output Handling (6 controls)
- **VEC-** : Vector/Embeddings (5 controls)
- **OR-** : Overreliance (6 controls)
- **BF-** : Bias (extended 5→9)
- **MM-** : Multimodal (5 controls)
- **ENV-** : Environmental (3 controls)

---

## Key Dependencies

| Dependency | Type | Blocker |
|------------|------|---------|
| Scanner architecture review | Technical | No |
| Test payload generation | Content | Yes |
| LLM API access | External | No |
| Scenario type definitions | Technical | No |
| Standard framework mappings | Documentation | No |

---

## File Reading Guide

### For Planning
Read: [DojoV2-Update-Implementation-Plan.md](DojoV2-Update-Implementation-Plan.md) (Lines 1-100 for overview)

### For Development Tasks
Read: [dojo-v2-implementation.md](dojo-v2-implementation.md) → Find Story ID → Read Steps

### For Coverage Verification
Read: [DojoV2-Coverage-Matrix.md](DojoV2-Coverage-Matrix.md) → Framework-specific sections

### For NIST Compliance
Read: [nist-ai-rmf-security-controls.md](nist-ai-rmf-security-controls.md) → Risk Categories section

---

*End of Index*
