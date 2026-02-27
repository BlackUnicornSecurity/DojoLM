# QA Testing Log

**Purpose:** QA testing outputs for verifying the DojoLM web application functionality.

**Last Updated:** 2026-02-26

---

## What Goes Here

This directory contains **QA testing outputs** - results from testing the DojoLM application itself (web UI, scanner package, LLM dashboard, API endpoints).

### QA Testing Outputs

| File Pattern | Description | Example |
|--------------|-------------|---------|
| `qa-report-YYYYMMDD.md` | Test execution report | qa-report-20260226.md |
| `qa-findings-handoff-YYYYMMDD.md` | Bug reports for developers | qa-findings-handoff-20260226.md |
| `qa-final-complete-report-YYYYMMDD.md` | Final test summary | qa-final-complete-report-20260226.md |
| `qa-screenshots-YYYYMMDD/` | Test screenshots | qa-screenshots-20260226/ |
| `qa-api-test-results.json` | API test results | qa-api-test-results.json |
| `build-results-YYYYMMDD.md` | Build verification results | build-results-20260226.md |

---

## What Does NOT Go Here

**Scanner Security Assessments** (formal LLM security audits using the 639-test checklist) belong in:

```
docs/app/testing-results/YYYY-MM-DD-model-name/
```

See [Scanner Assessment Documentation](../../docs/app/testing-results/README.md) for formal security assessment outputs.

---

## Difference: QA Testing vs Scanner Assessments

| Aspect | QA Testing (This Directory) | Scanner Assessments |
|--------|----------------------------|---------------------|
| **Purpose** | Verify application works correctly | Assess LLM security posture |
| **Target** | DojoLM web app, scanner package | External LLM models |
| **Test Cases** | QA-001 to QA-022, LLM-001 to LLM-020 | 639 test cases (testing-checklist.md) |
| **Output** | Bug reports, test logs | Security assessment reports |
| **Audience** | Developers | Security stakeholders |

---

## QA Test Categories

### Application Testing (QA-001 to QA-017)
- Smoke tests
- Scanner functionality
- Fixtures management
- Test payloads
- Coverage maps
- Navigation
- Responsive design
- Accessibility
- Performance
- State management
- Ollama integration

### LLM Dashboard Testing (QA-018 to QA-022)
- Models tab CRUD
- Tests tab management
- Results tab filtering
- Leaderboard display
- Test runner UI

### LLM API Testing (LLM-001 to LLM-020)
- Models API endpoints
- Execute API (single/batch)
- Results API
- Test cases API
- Coverage API
- Reports API
- Provider adapters

### Build Verification (BUILD-001 to BUILD-003)
- Export route verification
- Provider registry verification
- Component imports

---

## Creating QA Test Outputs

### Before Testing

```bash
# Create dated output directory
mkdir -p team/QA-Log/qa-screenshots-$(date +%Y%m%d)

# Set output file date
DATE=$(date +%Y%m%d)
```

### During Testing

```bash
# Run tests and capture results
npm test > team/QA-Log/qa-test-output-$DATE.txt 2>&1

# Take screenshots for UI tests
# Save to: team/QA-Log/qa-screenshots-$DATE/
```

### After Testing

```bash
# Generate QA report
cat > team/QA-Log/qa-report-$DATE.md << 'EOF'
# QA Test Report - $DATE

## Test Execution Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Blocked: N

## Bugs Found
| Bug ID | Severity | Description |
|--------|----------|-------------|
...

## Screenshots
See team/QA-Log/qa-screenshots-$DATE/
EOF

# Create findings handoff for developers
# (If bugs found)
cat > team/QA-Log/qa-findings-handoff-$DATE.md << 'EOF'
# QA Findings Handoff - $DATE

## Bugs Requiring Fixes

### Critical
...

### High
...

### Medium
...
EOF
```

---

## File Naming Conventions

### Reports
```
qa-report-YYYYMMDD.md
qa-findings-handoff-YYYYMMDD.md
qa-final-complete-report-YYYYMMDD.md
```

### Screenshots
```
qa-screenshots-YYYYMMDD/
├── QA-001-smoke-test-001.png
├── QA-002-scanner-basic-001.png
├── QA-003-filters-001.png
└── ...
```

### API Test Results
```
qa-api-test-results-YYYYMMDD.json
qa-api-endpoints-verified-YYYYMMDD.md
```

---

## Related Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| QA Framework | [../QA/qa-framework.md](../QA/qa-framework.md) | Overall QA strategy |
| Test Stories | [../QA/qa-test-stories.md](../QA/qa-test-stories.md) | Detailed test cases |
| Agile Stories | [../QA/qa-test-stories-agile.md](../QA/qa-test-stories-agile.md) | Agile-formatted stories |
| Developer Guide | [../../docs/app/developer-guide.md](../../docs/app/developer-guide.md) | Dev workflows |
| Scanner Assessments | [../../docs/app/testing-results/](../../docs/app/testing-results/) | Formal security assessments |

---

*Last updated: 2026-02-26*
