# AI Incident Response Procedure (ISO/IEC 42001 Clause 8)

**Document ID:** ISO42001-IR-001
**Version:** 2.0
**Date:** 2026-03-30
**Status:** Active
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document defines the incident response procedure for AI-related security events within the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 8 (Operation) requirements. This procedure leverages the fully implemented DojoV2 control framework (18/18 controls).

## 2. Incident Classification

### 2.1 AI-Specific Incident Types

| Type | Description | Severity | DojoV2 Control |
|------|-------------|----------|----------------|
| Prompt Injection Bypass | Scanner fails to detect known injection | Critical | LLM-01, LLM-02 |
| PII Exposure | Personal data leaked through AI interaction | Critical | - (PII Module) |
| Model Theft Attempt | Unauthorized model extraction detected | High | Model Theft |
| Bias Incident | Discriminatory output from tested model | High | Bias |
| Deepfake Generation | Synthetic content used for deception | High | Multimodal |
| Supply Chain Compromise | Compromised dependency or model | Critical | Supply Chain |
| DoS via AI | Resource exhaustion through crafted input | Medium | DoS |
| Session Manipulation | Cross-session persistence exploit | High | LLM-05 |
| False Negative | Scanner misses an attack it should catch | Medium | All controls |
| False Positive | Scanner flags benign content incorrectly | Low | All controls |
| Tool Poisoning | Malicious tool manipulation detected | High | LLM-09 |
| System Prompt Leak | Unauthorized prompt extraction | High | LLM-03 |
| Code Injection | Malicious code in model output | Critical | LLM-08 |
| Vector Embedding Attack | Embedding-based attack detected | Medium | Vector |
| Overreliance Trigger | Hallucination or false authority detected | Medium | Overreliance |

### 2.2 Severity Levels

| Level | Response Time | Escalation |
|-------|--------------|------------|
| Critical | 1 hour | Immediate team notification, leadership briefing |
| High | 4 hours | Team lead notification, remediation plan |
| Medium | 24 hours | Ticket creation, scheduled fix |
| Low | 1 week | Backlog prioritization |

## 3. Response Phases

### Phase 1: Detection & Triage (0-1 hour)
1. **Alert received** from scanner audit log, KATANA validation, monitoring, or user report
2. **Classify incident** using type and severity tables above
3. **Assign incident commander** (Security Lead for Critical/High)
4. **Identify affected DojoV2 control(s)** from the 18 implemented controls
5. **Create incident record** in audit log with:
   - Incident ID (auto-generated: IR-YYYY-MM-NNN)
   - Timestamp
   - Classification (Type / Severity / Control ID)
   - Initial assessment
   - Assigned responders

### Phase 2: Containment (1-4 hours)
1. **Isolate affected system**:
   - Disable specific detector module if malfunctioning
   - Quarantine affected fixture category
   - Switch to backup detection patterns if available
2. **Preserve evidence** (audit log export, finding snapshots, fixture samples)
3. **Assess blast radius**:
   - Which of the 18 DojoV2 controls are affected
   - Which fixtures/modules are impacted
   - Which model integrations are at risk
4. **Notify stakeholders** per escalation matrix

### Phase 3: Investigation (4-24 hours)
1. **Root cause analysis** using:
   - Scanner findings and audit trail
   - KATANA validation framework output
   - Fixture comparison against 2,960+ test cases
   - Pattern effectiveness review (510+ patterns)
2. **Timeline reconstruction** from audit log entries
3. **Impact assessment** (data exposure, service degradation, false negative rate)
4. **Document findings** in incident report with specific DojoV2 control references

### Phase 4: Remediation (24-72 hours)
1. **Develop fix**:
   - New patterns for affected control(s)
   - Updated detector modules
   - Patched or additional fixtures
2. **Test fix** against:
   - Regression suite (require 100% pass)
   - KATANA validation framework
   - All 18 DojoV2 control test cases
3. **Deploy fix** following standard release process
4. **Verify fix** with targeted testing against the specific incident type

### Phase 5: Recovery & Lessons Learned (1 week)
1. **Restore normal operations**
2. **Update compliance dashboard** with new coverage metrics
3. **Post-incident review**:
   - What detection gaps existed
   - Why the control didn't catch it initially
   - How the 18 DojoV2 framework can be strengthened
4. **Update procedures** based on lessons learned
5. **Log to team/lessonslearned.md**

## 4. Detection Capabilities (DojoV2 Framework)

The following detection capabilities are operational:

| Capability | Module | Fixture Count | Pattern Groups |
|------------|--------|---------------|----------------|
| Direct Prompt Injection | Core Scanner | 148 | INJECTION_PATTERNS |
| Indirect Prompt Injection | Core Scanner | 83 | INDIRECT_PI_PATTERNS |
| System Prompt Extraction | Core Scanner | 65 | EXTRACTION_PATTERNS |
| Multi-turn Attacks | Core Scanner | 112 | MULTITURN_PATTERNS |
| Context Window Attacks | Core Scanner | 87 | CONTEXT_INJECTION_PATTERNS |
| Social Engineering | Core Scanner | 73 | SOCIAL_ENGINEERING_PATTERNS |
| Code Injection | Core Scanner | 156 | MALICIOUS_CODE_PATTERNS |
| Tool Poisoning | Core Scanner | 94 | TOOL_POISONING_PATTERNS |
| Denial of Service | dos-detector.ts | 136 | 8 detection functions |
| Supply Chain | supply-chain-detector.ts | 89 | 9 pattern groups |
| Agent Security | rag-analyzer.ts | 114 | RAG/Tools patterns |
| Model Theft | model-theft-detector.ts | 78 | 9 pattern groups |
| Output Handling | Core Scanner | 128 | SQL_INJECTION_PATTERNS |
| Vector/Embeddings | Core Scanner | 67 | VEC_PATTERNS |
| Multimodal | image/audio-scanner.ts | 179 | MULTIMODAL_PATTERNS |
| Overreliance | overreliance-detector.ts | 104 | 7 pattern groups |
| Bias/Fairness | Core Scanner | 65 | BIAS_PATTERNS |

## 5. Communication Templates

### Internal Notification
```
Subject: [SEVERITY] AI Security Incident - [TYPE]
Incident ID: [ID]
Time Detected: [TIMESTAMP]
Classification: [TYPE] / [SEVERITY]
Affected DojoV2 Control: [CONTROL_ID]
Status: [Detection|Containment|Investigation|Remediation|Resolved]
Summary: [Brief description]
Action Required: [What team members need to do]
```

### Stakeholder Update
```
Subject: AI Incident Update - [ID]
Current Status: [Phase]
Affected Control: [DojoV2 Control ID]
Impact: [Description of impact]
ETA Resolution: [Estimated time]
Next Update: [When]
```

## 6. Metrics and Reporting

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | <1 hour | Audit log timestamp analysis |
| Mean Time to Respond (MTTR) | <4 hours | Incident record analysis |
| Mean Time to Resolve | <72 hours | Incident lifecycle tracking |
| False Negative Rate | <0.5% | Regression test results |
| Incident Recurrence | 0% | Post-fix validation |
| DojoV2 Control Coverage | 100% | KATANA validation framework |
| Pattern Effectiveness | >99% | Fixture detection rate |

## 7. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [Internal Audit Checklist](./internal-audit-checklist.md)
- [Implementation Audit Report](../IMPLEMENTATION-AUDIT-REPORT.md)
