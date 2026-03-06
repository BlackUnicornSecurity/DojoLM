# BU-TPI Testing Documentation

**Version:** 3.0
**Last Updated:** 2026-03-06
**Organization:** BlackUnicorn Laboratory / NODA Platform

---

## Overview

This directory contains the complete testing documentation for the BU-TPI (BlackUnicorn Threat & Penetration Testing Instrument) security test suite. These documents support both day-to-day development workflows and formal laboratory-grade security assessments.

---

## Quick Navigation

### For Developers

| Document | Purpose | Quick Link |
|----------|---------|------------|
| **Developer Guide** | Pre-commit checks, test execution, daily workflows | [developer-guide.md](developer-guide.md) |

### For Security Auditors

| Document | Purpose | Quick Link |
|----------|---------|------------|
| **Testing Checklist** | Complete checklist with 639 test cases across 11 areas | [testing-checklist.md](testing-checklist.md) |
| **Audit Report Guide** | Laboratory-grade report requirements and structure | [audit-report-guide.md](audit-report-guide.md) |
| **Improvement Tracker** | Scanner improvement recommendations from testing cycles | [improvement-tracker.md](improvement-tracker.md) |

### Test Results & Evidence

| Directory | Purpose | Quick Link |
|-----------|---------|------------|
| **Testing Results** | Evidence, reports, and session data | [testing-results/](testing-results/) |

---

## Document Relationships

```
                    ┌─────────────────────────┐
                    │       README.md         │
                    │   (Entry Point/Nav)     │
                    └───────────┬─────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
    ┌───────▼────────┐  ┌──────▼───────┐  ┌───────▼────────┐
    │developer_guide │  │testing_checklist│ │audit_report_  │
    │      .md       │  │     .md        │ │   guide.md     │
    │ (Dev Workflow) │  │(639 Test Cases) │ │(Formal Reports)│
    └────────────────┘  └──────┬────────┘  └────────┬───────┘
                                │                     │
                        ┌───────▼─────────────────────▼──────┐
                        │    improvement-tracker.md          │
                        │  (Continuous Improvement Input)    │
                        └────────────────────────────────────┘
```

---

## Document Descriptions

### developer-guide.md

**Audience:** Developers, QA engineers, LLM agents

Quick reference for development and testing workflows:
- Pre-commit checklist
- EPIC completion verification
- Release readiness checks
- Test execution commands (CLI and API)
- Troubleshooting common issues

**Use when:** You're writing code, running tests, or preparing a release.

---

### testing-checklist.md

**Audience:** Security auditors, penetration testers

Comprehensive testing instrument containing:
- 11 Testing Areas (TA-01 through TA-11)
- 72 Security Controls
- 639 Test Cases with payloads
- Evidence capture requirements
- Status tracking tables

**Use when:** Conducting a formal security assessment of an LLM.

---

### audit-report-guide.md

**Audience:** Report authors, security assessors

Laboratory-grade deliverable requirements:
- Report structure specifications
- Executive summary requirements
- Model configuration documentation
- Evidence capture standards
- Quality assurance checklist

**Use when:** Creating a formal security assessment report for stakeholders.

---

### improvement-tracker.md

**Audience:** Security team, scanner developers

Continuous improvement mechanism tracking:
- New test case recommendations
- Detection algorithm improvements
- Multilingual expansion needs
- Multimodal testing gaps

**Use when:** Identifying gaps and planning enhancements to the test suite.

---

### testing-results/

**Audience:** All assessors

Directory for organizing test evidence and generated reports:
- Individual session folders (date + model naming)
- Evidence storage (screenshots, logs)
- Report templates and examples
- Session metadata (JSON)

**Use when:** Running tests and storing evidence.

---

## Quick Start

### Running Tests

```bash
# Primary (API)
curl http://localhost:8089/api/run-tests

# Fallback (CLI)
npm test

# Individual tests
npx tsx tools/test-regression.ts
npx tsx tools/test-fp-check.ts
```

### Creating a Report

1. Create session folder in [testing-results/](testing-results/)
2. Review [audit-report-guide.md](audit-report-guide.md) for requirements
3. Use [testing-checklist.md](testing-checklist.md) as your testing instrument
4. Store evidence in `evidence/` subdirectories
5. Log improvements in [improvement-tracker.md](improvement-tracker.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-26 | Document unification and restructure |
| 1.0 | 2026-02-13 | Initial documentation |

---

*This documentation is maintained by BlackUnicorn Laboratory*
*Last updated: 2026-03-06*

---

## NODA Platform Integration

These testing documents are used within the NODA platform's modules:
- **Armory** — Uses fixture library documented here
- **Bushido Book** — References compliance checklists
- **LLM Dashboard** — Executes test suites against LLM providers
- **Haiku Scanner** — Runs regression and false-positive tests
