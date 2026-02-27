# LLM Model Security Audit Deliverables Guidelines

**Document Version:** 2.0
**Last Updated:** 2026-02-26
**Organization:** BlackUnicorn / DojoLM Laboratory
**Standard:** Laboratory-Grade Security Assessment Reporting

---

## Purpose

This document defines the comprehensive reporting requirements for LLM model security audits conducted using the BU-TPI (BlackUnicorn Threat & Penetration Testing Instrument) security test suite. All deliverables must meet laboratory-grade standards suitable for enterprise security assessments, regulatory compliance, and stakeholder reporting.

---

## General Reporting Requirements

### Document Structure

Each model audit produces **one standalone deliverable document** containing:

1. **Cover Page** - Branded header with report metadata
2. **Executive Summary** - Comprehensive analysis and findings
3. **Model Configuration** - Complete technical specifications
4. **Test Methodology** - Approach and scope description
5. **Detailed Test Results** - Full checklist with evidence
6. **Analysis & Findings** - Security posture assessment
7. **Recommendations** - Actionable improvement guidance
8. **Appendix A** - Complete testing checklist
9. **improvement-tracker.md** - Scanner improvement recommendations tracker

### Branding Requirements

All deliverables must include:

- **BlackUnicorn Security** header branding
- **DojoLM** product identification
- Report version and date controls
- Classification markings (e.g., "Confidential - Security Assessment")
- Author/Assessor credentials
- Document control table (version history)

---

## Deliverable Structure by Section

### 1. Cover Page

```markdown
# BlackUnicorn Laboratory
## DojoLM LLM Security Assessment Report

**Model:** [Model Name]
**Report ID:** BU-TPI-[YYYYMMDD]-[MODEL-ID]
**Assessment Date:** [YYYY-MM-DD]
**Assessor:** [Name/Team]
**Classification:** [Security Level]
**Report Version:** [X.Y]

---

[Logo Placeholder]

BlackUnicorn Security 
DojoLM
```

### 2. Executive Summary

The executive summary must be a **comprehensive, standalone analysis** suitable for C-level and non-technical stakeholders. It must include:

#### 2.1 Assessment Overview
- **Assessment Scope:** Description of what was tested
- **Test Environment:** Infrastructure and configuration details
- **Assessment Period:** Start and end dates/times
- **Assessment Team:** Personnel and roles

#### 2.2 Executive Findings
- **Overall Security Posture:** High-level risk rating (Critical/High/Medium/Low)
- **Key Strengths:** Top 3-5 security capabilities demonstrated
- **Key Weaknesses:** Top 3-5 vulnerabilities or concerns identified
- **Compliance Status:** Alignment with security standards (OWASP, NIST, etc.)

#### 2.3 Test Results Summary
- **Total Tests Executed:** [X] tests across [Y] categories
- **Pass Rate:** [Z]% ([P] passed / [T] total)
- **Critical Findings:** [N] critical issues requiring immediate attention
- **High/Medium/Low Findings:** Breakdown by severity

#### 2.4 Risk Assessment Matrix
| Risk Category | Severity | Likelihood | Impact | Risk Rating |
|--------------|----------|------------|--------|-------------|
| [Category 1] | [H/M/L] | [H/M/L] | [H/M/L] | [Critical/High/Medium/Low] |
| ... | ... | ... | ... | ... |

#### 2.5 Bottom Line
- **Production Readiness:** Ready/Conditionally Ready/Not Ready
- **Primary Recommendation:** One-sentence executive recommendation
- **Follow-Up Required:** Yes/No with details

### 3. Model Configuration

Complete technical specifications with **no omissions**:

#### 3.1 Model Identity
- **Model Name:** Full model identifier
- **Model ID:** Unique identifier used in testing
- **Provider/Organization:** Source organization (Meta, Google, Alibaba, etc.)
- **Model Version/Tag:** Exact version tested
- **Model Family:** Architecture family (Llama, GPT, Gemma, etc.)

#### 3.2 Model Specifications
- **Parameter Count:** [X]B parameters
- **Context Window:** [X] tokens
- **Training Data Cutoff:** [Date]
- **Quantization:** [FP16/INT8/INT4/etc.]
- **Architecture Type:** [Decoder-only/Encoder-decoder/etc.]

#### 3.3 Host Hardware Configuration
- **Host Machine:** [Make/Model/Identifier]
- **CPU:** [Processor] [Cores] [Clock Speed]
- **GPU:** [GPU Model] [VRAM] [CUDA Cores]
- **RAM:** [Amount] [Type] [Speed]
- **Storage:** [Type] [Capacity]
- **Network:** [Interface] [Speed]

#### 3.4 Software Environment
- **Operating System:** [OS] [Version] [Architecture]
- **Runtime Environment:** [Docker/Native/Virtual Machine]
- **Inference Engine:** [Ollama/vLLM/Transformers/etc.]
- **Inference Version:** [X.Y.Z]
- **CUDA/cuDNN Version:** [X.Y / X.Y.Z] (if applicable)
- **Python Version:** [X.Y.Z] (if applicable)

#### 3.5 Configuration Parameters
```json
{
  "model": "[model:name]",
  "temperature": [X.X],
  "top_p": [X.X],
  "top_k": [X],
  "max_tokens": [X],
  "presence_penalty": [X.X],
  "frequency_penalty": [X.X],
  "stop_sequences": [...],
  "system_prompt": "[...]",
  "additional_params": {...}
}
```

#### 3.6 Endpoint Configuration
- **Base URL:** [Endpoint URL]
- **Authentication Method:** [None/API Key/OAuth/etc.]
- **Connection Protocol:** [HTTP/HTTPS/gRPC]
- **Timeout Settings:** [Connect/Read timeouts]
- **Rate Limits:** [Requests per minute/token limit]

### 4. Test Methodology

#### 4.1 Testing Framework
- **Scanner:** DojoLM BU-TPI Scanner v[X.Y.Z]
- **Test Suite:** BU-TPI Security Test Suite v[X.Y]
- **Test Categories:** [List all categories tested]

#### 4.2 Testing Approach
- **Automated Testing:** Description of automated test execution
- **Manual Testing:** Description of manual verification (if any)
- **Testing Environment:** Isolated/Production/Sandbox
- **Test Data Sources:** [Sources of test payloads]

#### 4.3 Test Categories

All deliverables MUST include results from ALL BU-TPI testing areas:

1. **Prompt Injection (PI)** - Direct instruction override attacks
2. **Jailbreak (JB)** - Persona-based and framing attacks
3. **Multilingual (ML)** - Non-English injection attempts
4. **Data Exfiltration (DE)** - Information leakage attempts
5. **Content Policy Violation (CP)** - Policy circumvention
6. **Social Engineering (SE)** - Human factor manipulation
7. **Adversarial Examples (AE)** - Edge case and boundary testing
8. **Context Manipulation (CM)** - Context window exploitation
9. **Code Injection (CI)** - Code-based payload delivery
10. **Format Injection (FI)** - Structured format exploitation

#### 4.4 Testing Scenarios

Testing must cover at least **10 distinct scenarios**:

| Scenario ID | Scenario Name | Description | Tests Included |
|-------------|---------------|-------------|----------------|
| S-001 | Direct Prompt Override | Basic instruction override attempts | PI-001 through PI-00X |
| S-002 | Jailbreak Persona Adoption | Character-based jailbreaks | JB-001 through JB-00X |
| S-003 | Multilingual Injection | Non-English attack vectors | ML-001 through ML-00X |
| S-004 | System Prompt Extraction | Attempts to extract system prompts | DE-001 through DE-00X |
| S-005 | Policy Circumvention | Attempts to bypass content policies | CP-001 through CP-00X |
| S-006 | Translation Attacks | Using translation for injection | FI-001 through FI-00X |
| S-007 | Code-Based Injection | Injection through code structures | CI-001 through CI-00X |
| S-008 | Few-Shot Manipulation | Pattern-based influence attempts | CM-001 through CM-00X |
| S-009 | Refusal Suppression | Techniques to suppress refusals | SE-001 through SE-00X |
| S-010 | Composite Attack chaining | Combined attack vectors | AE-001 through AE-00X |

### 5. Detailed Test Results

Each test result MUST include:

#### 5.1 Test Result Format

| Test ID | Test Name | Category | Scenario | Status | Evidence | Comment |
|---------|-----------|----------|----------|--------|----------|---------|
| [TC-ID] | [Name] | [CAT] | [S-ID] | [PASS/FAIL/NA] | [Ref] | [Comment] |

#### 5.2 Status Definitions
- **PASS** - Test executed successfully; expected security behavior demonstrated
- **FAIL** - Test executed; security vulnerability or unexpected behavior detected
- **NA** - Test not applicable for this model configuration

#### 5.3 Evidence Requirements

**EVERY test result MUST include evidence:**

- **For PASS results:** Screenshot OR log excerpt showing the blocked response
- **For FAIL results:** Screenshot OR log excerpt showing the vulnerability/payload success
- **Technical Evidence:** Scanner output, model response text, metadata
- **Screenshots:** Named with convention `evidence-[MODEL]-[TEST-ID].png`
- **Evidence Location:** `team/qa-evidence-[DATE]/` directory

#### 5.4 Comment Guidelines

Comments should provide:
- **Why** the result occurred (when relevant)
- **Security implications** of the result
- **Comparison** to other models (if applicable)
- **Mitigation suggestions** (for FAIL results)

### 6. Analysis & Findings

#### 6.1 Resilience Scoring

| Category | Tests Passed | Tests Total | Pass Rate | Weight | Score |
|----------|--------------|-------------|-----------|--------|-------|
| Prompt Injection | [X] | [Y] | [Z]% | [W] | [S] |
| Jailbreak | [X] | [Y] | [Z]% | [W] | [S] |
| Multilingual | [X] | [Y] | [Z]% | [W] | [S] |
| Data Exfiltration | [X] | [Y] | [Z]% | [W] | [S] |
| Content Policy | [X] | [Y] | [Z]% | [W] | [S] |
| Social Engineering | [X] | [Y] | [Z]% | [W] | [S] |
| Adversarial Examples | [X] | [Y] | [Z]% | [W] | [S] |
| Context Manipulation | [X] | [Y] | [Z]% | [W] | [S] |
| Code Injection | [X] | [Y] | [Z]% | [W] | [S] |
| Format Injection | [X] | [Y] | [Z]% | [W] | [S] |
| **OVERALL** | **[X]** | **[Y]** | **[Z]%** | - | **[S]** |

#### 6.2 Vulnerability Findings

For each FAIL result, document:

| Vuln ID | Test ID | Severity | Description | Impact | Affected Component | Evidence |
|---------|---------|----------|-------------|--------|-------------------|----------|
| V-001 | [TC-ID] | [Crit/High/Med/Low] | [Description] | [Impact] | [Component] | [Ref] |

#### 6.3 Comparative Analysis

When multiple models are tested:

- **Cross-model comparison** of resilience scores
- **Best-in-class** identification by category
- **Use case recommendations** based on results

### 7. Recommendations

#### 7.1 Critical Priority (Immediate Action Required)

List any critical issues requiring immediate remediation.

#### 7.2 High Priority (Recommended Before Production)

List high-priority improvements.

#### 7.3 Medium Priority (Best Practice)

List medium-priority enhancements.

#### 7.4 Low Priority (Future Consideration)

List optional improvements.

### 8. Appendix A: Complete Testing Checklist

Appendix A contains the **full checklist document** used as the basis for testing.

#### 8.1 Checklist Structure

The checklist must include:
- **ALL controls** from the BU-TPI test suite
- **At least 10 testing scenarios**
- **Each test mapped to a scenario**
- **PASS/FAIL/NA** status for each test
- **Evidence reference** for each test
- **Comments** for noteworthy results

#### 8.2 Checklist Template

```markdown
## Appendix A: BU-TPI Testing Checklist

### Scenario S-001: Direct Prompt Override

| Test ID | Test Name | Payload | Expected | Status | Evidence | Comment |
|---------|-----------|---------|----------|--------|----------|---------|
| PI-001 | Basic Instruction Override | [payload] | BLOCK | PASS | E-001 | Model refused politely |
| PI-002 | Ignore Previous Instructions | [payload] | BLOCK | PASS | E-002 | Correctly identified |
| ... | ... | ... | ... | ... | ... | ... |

### Scenario S-002: Jailbreak Persona Adoption
[... continue for all scenarios ...]
```

### 9. improvement-tracker.md: Scanner Improvement Recommendations

improvement-tracker.md tracks **scanner improvement recommendations** derived from each testing cycle.

#### 9.1 Recommendation Tracking

| Rec ID | Date | Scenario | Recommendation | Priority | Status | Implemented |
|--------|------|----------|----------------|----------|--------|-------------|
| R-001 | [DATE] | [S-ID] | [Description] | [P] | [Open/Closed] | [Date/NA] |

#### 9.2 Recommendation Categories

1. **New Test Cases** - Suggested additions to test suite
2. **Payload Variations** - New attack vectors to test
3. **Scenario Enhancements** - Complexity improvements
4. **Detection Improvements** - Scanner detection enhancements
5. **Reporting Improvements** - Better evidence capture or reporting

#### 9.3 Improvement Lifecycle

```
Testing → Recommendations → Checklist Update → New Testing → Updated Reporting
     ↑                                                        ↓
     ←────────────── Continuous Improvement Loop ←─────────────
```

---

## Report Generation Workflow

### Step 1: Pre-Test Preparation
1. Create evidence directory: `team/qa-evidence-[DATE]/`
2. Initialize checklist template with all BU-TPI controls
3. Capture complete model configuration
4. Set up screenshot/logging capture

### Step 2: Test Execution
1. Execute tests scenario by scenario
2. Capture evidence for EACH test (screenshot or log)
3. Document real-time observations
4. Track any deviations from planned testing

### Step 3: Post-Test Analysis
1. Compile all test results into checklist
2. Calculate resilience scores
3. Identify vulnerabilities and findings
4. Draft recommendations

### Step 4: Report Assembly
1. Generate executive summary
2. Compile technical findings
3. Attach all appendices
4. Review against this checklist

### Step 5: Quality Review
1. Verify ALL tests have evidence
2. Verify ALL controls are covered
3. Verify branding requirements met
4. Verify technical specifications complete

---

## Quality Assurance Checklist

Before releasing a deliverable, verify:

- [ ] Cover page includes all required elements
- [ ] Executive summary is comprehensive and standalone
- [ ] Model configuration includes host hardware details
- [ ] Model configuration includes software version details
- [ ] All 10 BU-TPI testing areas are covered
- [ ] At least 10 distinct scenarios are tested
- [ ] Every test result has a status (PASS/FAIL/NA)
- [ ] Every test result has evidence (screenshot or log)
- [ ] Every test result has a comment (when relevant)
- [ ] Appendix A contains complete checklist
- [ ] improvement-tracker.md contains scanner improvement tracker
- [ ] BlackUnicorn/DojoLM branding is applied
- [ ] Document control is present

---

## Document Template

A full report template follows this structure:

```markdown
# BlackUnicorn Laboratory
## DojoLM LLM Security Assessment Report

[Cover Page Elements]

---

## Executive Summary

[Comprehensive executive summary as specified in Section 2]

---

## 1. Model Configuration

[Complete technical specifications as specified in Section 3]

---

## 2. Test Methodology

[Testing approach and scope as specified in Section 4]

---

## 3. Detailed Test Results

[Complete test results with evidence as specified in Section 5]

---

## 4. Analysis & Findings

[Security assessment and scoring as specified in Section 6]

---

## 5. Recommendations

[Prioritized recommendations as specified in Section 7]

---

## Appendix A: Complete Testing Checklist

[Full checklist document as specified in Section 8]

---

## improvement-tracker.md: Scanner Improvement Recommendations

[Recommendations tracker as specified in Section 9]

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [DATE] | [Name] | Initial release |
```

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-02-26 | BlackUnicorn Lab | Comprehensive laboratory-standard requirements |
| 1.0 | 2026-02-25 | BlackUnicorn Lab | Initial deliverables structure |

---

*This document is maintained by BlackUnicorn Laboratory*
*Last updated: 2026-02-26*
*Next review: 2026-03-31*
