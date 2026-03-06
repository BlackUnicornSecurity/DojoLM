# BU-TPI Developer Guide

**Version:** 2.0
**Last Updated:** 2026-03-06
**Organization:** BlackUnicorn Laboratory / NODA Platform

---

## Purpose

This guide provides quick reference for developers and QA engineers working with the BU-TPI security test suite. For formal security assessment documentation, see [audit-report-guide.md](audit-report-guide.md).

---

## Table of Contents

1. [Running Tests](#running-tests)
2. [Pre-Commit Checklist](#pre-commit-checklist)
3. [EPIC Completion Checklist](#epic-completion-checklist)
4. [Release Readiness Checklist](#release-readiness-checklist)
5. [Test Suite Reference](#test-suite-reference)
6. [Troubleshooting](#troubleshooting)
7. [NPM Scripts](#npm-scripts)

---

## Running Tests

### Quick Start

**Primary (API):**
```bash
curl http://localhost:8089/api/run-tests
```

**Fallback (CLI):**
```bash
npm test
```

### API Endpoint

**Endpoint:** `GET /api/run-tests`

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | string | Comma-separated test names (e.g., `regression,epic4`) |
| `verbose` | boolean | Include full test output in response |

**Examples:**
```bash
# Run all tests
curl http://localhost:8089/api/run-tests

# Filter specific tests
curl http://localhost:8089/api/run-tests?filter=regression,epic4

# Verbose output
curl "http://localhost:8089/api/run-tests?verbose=true"
```

**Response Format:**
```json
{
  "summary": {
    "total": 8,
    "passed": 7,
    "failed": 1,
    "duration_ms": 3247
  },
  "results": [
    {
      "name": "typecheck",
      "status": "pass",
      "duration_ms": 234,
      "output": ""
    }
  ],
  "timestamp": "2026-02-26T10:34:12.456Z"
}
```

### CLI Usage

```bash
# Run all tests
npm test

# Filter specific tests
npm test -- --filter=regression,epic4

# Verbose output
npm test -- --verbose
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All required tests passed |
| `1` | One or more required tests failed |

---

## Pre-Commit Checklist

Run this checklist before committing changes to verify basic correctness.

### Code Quality
- [ ] TypeScript type checking passes: `npm run typecheck` (or `tsc --noEmit`)
- [ ] No console.log or debug statements left in production code
- [ ] New code follows existing patterns and conventions
- [ ] Comments added for non-obvious logic

### Testing
- [ ] All new fixtures have corresponding clean control files
- [ ] New patterns tested against false positives on existing clean fixtures
- [ ] Regression tests pass: `npm test`
- [ ] False positive check passes: `npm test -- --filter=false-positive`

### Documentation
- [ ] README.md updated if new features added
- [ ] fixtures/manifest.json updated with new fixtures
- [ ] Version number incremented if breaking changes

---

## EPIC Completion Checklist

Use this checklist when completing an EPIC to ensure full coverage.

### Fixtures
- [ ] All stories in EPIC have corresponding fixture files
- [ ] Each attack category has at least one clean control fixture
- [ ] Fixtures generate correctly: `npm run generate`
- [ ] Binary fixtures (images, audio) have valid format/metadata

### Scanner Coverage
- [ ] All attack fixtures trigger BLOCK or WARN verdict
- [ ] All clean fixtures return ALLOW verdict (zero false positives)
- [ ] New patterns added to appropriate pattern groups
- [ ] Pattern names follow naming convention: `category_description`

### Testing
- [ ] Story-specific test file created (e.g., `test-epic4.ts`)
- [ ] All tests pass: attack→BLOCK/WARN, clean→ALLOW
- [ ] No regressions on existing fixtures
- [ ] Test output includes pass/fail counts

### Documentation
- [ ] EPIC marked COMPLETE in planning document
- [ ] New patterns documented in README.md pattern table
- [ ] New fixture categories added to fixture table
- [ ] TPI story coverage updated (if applicable)

---

## Release Readiness Checklist

Use this checklist before cutting a release.

### Test Coverage
- [ ] All test suites pass: `npm test`
- [ ] Zero false positives across all clean fixtures
- [ ] Zero regressions across all existing fixtures
- [ ] All required EPICs marked COMPLETE

### Documentation
- [ ] README.md reflects current state
- [ ] API documentation is complete and accurate
- [ ] Changelog updated with version notes
- [ ] Breaking changes documented

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Rate limiting configured appropriately
- [ ] CSP headers present on fixture endpoints
- [ ] Path traversal prevention tested

### Infrastructure
- [ ] Server starts without errors: `npm start`
- [ ] All API endpoints respond correctly
- [ ] Fixture metadata extraction works for binary files
- [ ] Type checking passes with no errors

---

## Testing Session Workflow

For formal security assessments, use the session management tools:

### Creating a Session

```bash
# Create a new testing session
npm run session:create -- -m qwen2.5

# With model variant
npm run session:create -- -m llama3 -v 70b
```

This creates:
- `docs/app/testing-results/YYYY-MM-DD-model-name/`
- `session.json` with metadata
- `evidence/screenshots/` and `evidence/logs/` directories
- `reports/` directory for generated reports

### Managing Sessions

```bash
# List all sessions
npm run session:list

# Show session details
npm run session:show 2026-02-26-qwen2.5

# Update session metadata
npm run session:update 2026-02-26-qwen2.5 --model-provider "Alibaba"
npm run session:update 2026-02-26-qwen2.5 --summary-passed 545
npm run session:update 2026-02-26-qwen2.5 --findings-critical 0

# Mark session complete
npm run session:close 2026-02-26-qwen2.5
```

### Generating Reports

```bash
# Generate all reports
npm run report:generate docs/app/testing-results/2026-02-26-qwen2.5

# Reports generated:
# - reports/executive-summary.md
# - reports/detailed-findings.md
# - reports/checklist-results.md
```

For more details, see [testing-results/](testing-results/).

---

## Test Suite Reference

### Test Suite Composition

| Name | Description | Required |
|------|-------------|-----------|
| `typecheck` | TypeScript type validation | Yes |
| `regression` | Full fixture regression (all fixtures) | Yes |
| `false-positive` | False positive verification | Yes |
| `epic4` | EPIC 4 coverage test | Yes |
| `epic4-s44-s45` | EPIC 4 stories 44-45 | No |
| `epic4-s46-s49` | EPIC 4 stories 46-49 | No |
| `epic8-session` | Session simulator | Yes |
| `epic8-tool-output` | Tool output validation | Yes |

### Expected Behavior

| Test | Expected Result |
|------|-----------------|
| typecheck | No type errors |
| regression | All fixtures pass (attack→BLOCK, clean→ALLOW) |
| false-positive | Zero false positives on clean fixtures |
| epic4 | All EPIC 4 stories pass |
| epic8-session | Session tests pass (4/4) |
| epic8-tool-output | Tool output tests pass (7/7) |

### Interpreting Results

**Failure Patterns:**
- `FP findings:` indicates false positive (clean fixture blocked)
- `verdict=ALLOW expected=BLOCK` indicates missed detection

**When a test fails, the output includes:**
- Fixture name/path
- Expected verdict vs actual verdict
- Finding counts (C: critical, W: warning, I: info)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not responding | Start server with `npm start` |
| Port 8089 in use | Start server on different port: `npx tsx src/serve.ts 9000` |
| Test timeout | Increase timeout in test config |
| Type check fails | Run `tsc --noEmit` to see specific errors |
| Binary files skipped | Run `npm run generate` to recreate fixtures |
| False positive on clean fixture | New pattern too broad; narrow regex, add word boundaries |
| Attack fixture not detected | Missing pattern or heuristic; add new pattern to appropriate group |
| Regression test fails | Check if new changes broke existing functionality |

---

## NPM Scripts

```bash
npm test              # Run all tests (CLI)
npm run typecheck     # TypeScript validation only
npm run generate      # Regenerate all fixtures
npm start             # Start server
```

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [testing-checklist.md](testing-checklist.md) | Complete 582-test case checklist for formal audits |
| [audit-report-guide.md](audit-report-guide.md) | Laboratory-grade report requirements |
| [improvement-tracker.md](improvement-tracker.md) | Scanner improvement recommendations |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | 2026-02-26 | Merged from checklists.md and TESTING.md |
| 1.0 | 2026-02-13 | Initial developer documentation |

---

*This guide is maintained by BlackUnicorn Laboratory*
*Last updated: 2026-02-26*
