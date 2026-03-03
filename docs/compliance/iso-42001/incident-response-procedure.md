# AI Incident Response Procedure (ISO/IEC 42001 Clause 8)

**Document ID:** ISO42001-IR-001
**Version:** 1.0
**Date:** 2026-03-02
**Status:** Draft
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This document defines the incident response procedure for AI-related security events within the DojoLM platform, aligned with ISO/IEC 42001:2023 Clause 8 (Operation) requirements.

## 2. Incident Classification

### 2.1 AI-Specific Incident Types

| Type | Description | Severity |
|------|-------------|----------|
| Prompt Injection Bypass | Scanner fails to detect known injection | Critical |
| PII Exposure | Personal data leaked through AI interaction | Critical |
| Model Theft Attempt | Unauthorized model extraction detected | High |
| Bias Incident | Discriminatory output from tested model | High |
| Deepfake Generation | Synthetic content used for deception | High |
| Supply Chain Compromise | Compromised dependency or model | Critical |
| DoS via AI | Resource exhaustion through crafted input | Medium |
| Session Manipulation | Cross-session persistence exploit | High |
| False Negative | Scanner misses an attack it should catch | Medium |
| False Positive | Scanner flags benign content incorrectly | Low |

### 2.2 Severity Levels

| Level | Response Time | Escalation |
|-------|--------------|------------|
| Critical | 1 hour | Immediate team notification, leadership briefing |
| High | 4 hours | Team lead notification, remediation plan |
| Medium | 24 hours | Ticket creation, scheduled fix |
| Low | 1 week | Backlog prioritization |

## 3. Response Phases

### Phase 1: Detection & Triage (0-1 hour)
1. **Alert received** from scanner audit log, monitoring, or user report
2. **Classify incident** using type and severity tables above
3. **Assign incident commander** (Security Lead for Critical/High)
4. **Create incident record** in audit log with:
   - Incident ID (auto-generated)
   - Timestamp
   - Classification
   - Initial assessment
   - Assigned responders

### Phase 2: Containment (1-4 hours)
1. **Isolate affected system** (disable module, quarantine fixture)
2. **Preserve evidence** (audit log export, finding snapshots)
3. **Assess blast radius** (which models/fixtures/modules affected)
4. **Notify stakeholders** per escalation matrix

### Phase 3: Investigation (4-24 hours)
1. **Root cause analysis** using scanner findings and audit trail
2. **Timeline reconstruction** from audit log entries
3. **Impact assessment** (data exposure, service degradation)
4. **Document findings** in incident report

### Phase 4: Remediation (24-72 hours)
1. **Develop fix** (new patterns, updated modules, patched fixtures)
2. **Test fix** against regression suite (require 100% pass)
3. **Deploy fix** following standard release process
4. **Verify fix** with targeted testing

### Phase 5: Recovery & Lessons Learned (1 week)
1. **Restore normal operations**
2. **Update compliance dashboard** with new coverage
3. **Post-incident review** (what went wrong, what worked)
4. **Update procedures** based on lessons learned
5. **Log to team/lessonslearned.md**

## 4. Communication Templates

### Internal Notification
```
Subject: [SEVERITY] AI Security Incident - [TYPE]
Incident ID: [ID]
Time Detected: [TIMESTAMP]
Classification: [TYPE] / [SEVERITY]
Status: [Detection|Containment|Investigation|Remediation|Resolved]
Summary: [Brief description]
Action Required: [What team members need to do]
```

### Stakeholder Update
```
Subject: AI Incident Update - [ID]
Current Status: [Phase]
Impact: [Description of impact]
ETA Resolution: [Estimated time]
Next Update: [When]
```

## 5. Metrics and Reporting

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Detect (MTTD) | <1 hour | Audit log timestamp analysis |
| Mean Time to Respond (MTTR) | <4 hours | Incident record analysis |
| Mean Time to Resolve | <72 hours | Incident lifecycle tracking |
| False Negative Rate | <0.5% | Regression test results |
| Incident Recurrence | 0% | Post-fix validation |

## 6. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [Internal Audit Checklist](./internal-audit-checklist.md)
