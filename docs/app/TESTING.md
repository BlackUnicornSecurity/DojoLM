# TPI Testing Instructions for LLM Agents

Instructions for automated testing of the TPI Security Test Lab.

---

## Quick Start

To run the complete automated test battery:

**Primary (API):**
```bash
curl http://localhost:8089/api/run-tests
```

**Fallback (CLI):**
```bash
npx tsx team/qa-tools/run-all-tests.ts
```

---

## Test Suite Composition

The automated test battery runs the following tests in order:

| Name | Description | Required |
|------|-------------|-----------|
| typecheck | TypeScript type validation | Yes |
| regression | Full fixture regression (all fixtures) | Yes |
| false-positive | False positive verification | Yes |
| epic4 | EPIC 4 coverage test | Yes |
| epic4-s44-s45 | EPIC 4 stories 44-45 | No |
| epic4-s46-s49 | EPIC 4 stories 46-49 | No |
| epic8-session | Session simulator | Yes |
| epic8-tool-output | Tool output validation | Yes |

---

## API Endpoint

### Endpoint
`GET /api/run-tests`

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `filter` | string | Comma-separated list of test names to run (e.g., `regression,epic4`) |
| `verbose` | boolean | Include full test output in response |

### Response Format

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
    },
    {
      "name": "regression",
      "status": "pass",
      "duration_ms": 876,
      "output": "Regression Results: 178/178 passed, 0 failed"
    },
    {
      "name": "epic8-session",
      "status": "fail",
      "duration_ms": 445,
      "output": "[FAIL] session/slow-drip-10-turns.json: verdict=ALLOW expected=BLOCK"
    }
  ],
  "timestamp": "2026-02-13T10:34:12.456Z"
}
```

### Status Codes

- `200 OK` - Tests completed successfully (check `summary.failed` for test results)
- `500` - Internal error (test runner crashed, not test failures)

---

## CLI Usage

### Run All Tests
```bash
npx tsx team/qa-tools/run-all-tests.ts
```

### Filter Specific Tests
```bash
npx tsx team/qa-tools/run-all-tests.ts --filter=regression,epic4
```

### Verbose Output
```bash
npx tsx team/qa-tools/run-all-tests.ts --verbose
```

### Available Tests
`typecheck`, `regression`, `false-positive`, `epic4`, `epic4-s44-s45`, `epic4-s46-s49`, `epic8-session`, `epic8-tool-output`

### Exit Codes

- `0` - All required tests passed
- `1` - One or more required tests failed

---

## Example Workflows

### For LLM Agents (Recommended)

1. Start the server: `npm start`
2. Run tests via API: `curl http://localhost:8089/api/run-tests`
3. Parse JSON response
4. If `summary.failed > 0`, review `results` for failures
5. Investigate failing tests, fix issues, re-run

### For Local Development

1. Make code changes
2. Run typecheck: `npm run typecheck`
3. Run all tests: `npm test` (or `npx tsx team/qa-tools/run-all-tests.ts`)
4. Review console output
5. Fix failures and re-run

---

## Interpreting Results

### Expected Behavior

| Test | Expected Result |
|------|-----------------|
| typecheck | No type errors |
| regression | All fixtures pass (attack→BLOCK, clean→ALLOW) |
| false-positive | Zero false positives on clean fixtures |
| epic4 | All EPIC 4 stories pass |
| epic8-session | Session tests pass (4/4) |
| epic8-tool-output | Tool output tests pass (7/7) |

### Failure Diagnosis

When a test fails, the output includes:
- Fixture name/path
- Expected verdict vs actual verdict
- Finding counts (C: critical, W: warning, I: info)

Common failure patterns:
- `FP findings:` indicates false positive (clean fixture blocked)
- `verdict=ALLOW expected=BLOCK` indicates missed detection

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Server not responding | Start server with `npm start` |
| Port 8089 in use | Start server on different port: `npx tsx src/serve.ts 9000` |
| Test timeout | Increase timeout in test config |
| Type check fails | Run `tsc --noEmit` to see specific errors |
| Binary files skipped | Run `npm run generate` to recreate fixtures |

---

## NPM Scripts

```bash
npm test              # Run all tests (CLI)
npm run typecheck     # TypeScript validation only
npm run generate      # Regenerate all fixtures
npm start             # Start server
```
