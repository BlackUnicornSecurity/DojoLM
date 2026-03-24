# User API Reference

This guide covers the endpoints most useful to end users, local automation, and admin workflows. It focuses on routes backed by the current UI instead of listing every internal route.

## Base URLs

- Standalone scanner API: `http://localhost:8089`
- Web app: `http://localhost:42001`
- Web API base: `http://localhost:42001/api`

## Authentication

For the web API:

- same-origin browser requests are accepted automatically when headers and origin match `NEXT_PUBLIC_APP_URL`
- external or scripted callers should send `X-API-Key: $NODA_API_KEY`
- admin validation routes require admin access in addition to normal authentication
- if `NODA_API_KEY` is unset, development mode bypass applies
- in production, missing required auth configuration fails closed with `503`

Public or minimally protected routes include:

- `GET /api/admin/health`
- `GET /api/health`
- `GET /api/auth/me`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Rate limits enforced by the API proxy:

- external callers: `100` requests per minute per IP
- same-origin UI traffic: `300` requests per minute per IP
- repeated auth failures: `10` per minute per IP

The standalone scanner API is GET-only and does not use the web API key flow.

## Standalone Scanner API

Older docs that describe `POST /api/scan` on port `8089` are outdated. The standalone scanner on `:8089` is GET-only.

### Scan text

```bash
curl "http://localhost:8089/api/scan?text=ignore%20all%20previous%20instructions"
```

Notes:

- method: `GET`
- required query param: `text`
- max size: `100KB`

### Get fixture manifest

```bash
curl "http://localhost:8089/api/fixtures"
```

### Read a fixture

```bash
curl "http://localhost:8089/api/read-fixture?path=social/example.txt"
```

### Scan a fixture

```bash
curl "http://localhost:8089/api/scan-fixture?path=social/example.txt"
```

### Get scanner stats

```bash
curl "http://localhost:8089/api/stats"
```

### Run built-in test suites

```bash
curl "http://localhost:8089/api/run-tests"
curl "http://localhost:8089/api/run-tests?filter=regression&verbose=true"
```

## Web Scanner And Fixture Routes

Use these when you want to automate the same flows the web UI uses.

### Scan text

```bash
curl -X POST "http://localhost:42001/api/scan" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{"text":"ignore all previous instructions"}'
```

Notes:

- accepts `text` or `content`
- accepts optional `engines`
- max size: `10,000` characters
- rejects null bytes

### List fixtures

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/fixtures"
```

Optional filter:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/fixtures?category=multimodal"
```

### Read a fixture

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/read-fixture?path=multimodal/example.txt"
```

Notes:

- expected format: `category/filename`
- current max response size: `1MB`

### Scan a fixture

GET form:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/scan-fixture?path=multimodal/example.txt"
```

POST form:

```bash
curl -X POST "http://localhost:42001/api/scan-fixture" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{"path":"multimodal/example.txt"}'
```

Notes:

- current scan size limit: `100KB`
- binary fixture scanning is supported for selected formats

### Scanner stats

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/stats"
```

This route returns summary counts only, not detailed pattern group names.

### Test suite routes

List available suites:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/tests"
```

Run one or more suites:

```bash
curl -X POST "http://localhost:42001/api/tests" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{"filter":"regression,false-positive"}'
```

## Health Routes

Minimal health response:

```bash
curl "http://localhost:42001/api/health"
```

Authenticated detailed health response:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/health"
```

## Admin Validation Routes

These routes back `Admin -> Validation`. They require admin access.

### Start a validation run

```bash
curl -X POST "http://localhost:42001/api/admin/validation/run" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "fullCorpus": true,
    "modules": ["prompt-injection", "jailbreak"],
    "includeHoldout": true
  }'
```

Body fields:

- `fullCorpus`: boolean
- `modules`: optional array of module IDs
- `includeHoldout`: boolean

Current module IDs:

- `prompt-injection`
- `jailbreak`
- `data-exfiltration`
- `bias-detection`
- `toxicity`
- `hallucination`
- `pii-leakage`
- `compliance`

Notes:

- leave `modules` unset to run the full validation catalog
- only one validation run can be active at a time
- concurrent requests return `429` and include the existing `runId`

### List recent validation runs

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/runs?page=1&limit=10"
```

Notes:

- `page` must be a positive integer
- `limit` must be between `1` and `100`

### Poll validation status

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/status/<runId>"
```

The status response includes:

- `status`
- `progress`
- `currentModule`
- `samplesProcessed`
- `samplesTotal`
- `nonConformities`
- `elapsed`
- `eta`

### Read a validation report

Full report:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/report/<runId>"
```

Summary-only form:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/report/<runId>?format=summary"
```

Notes:

- full mode returns the complete report payload when `report.json` is available
- summary mode strips the response down to report metadata, module verdicts, metrics, and confusion-matrix data
- if a run exists but the full report is not available yet, the response includes `report_available: false`

### Export a validation report

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/export/<runId>?format=markdown"
```

Supported export formats:

- `json`
- `csv`
- `markdown`

Notes:

- the export route requires a finished report file
- exports are rate-limited to `5` per minute

### List module calibration status

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/admin/validation/modules"
```

This route returns the stored validation modules with their last calibration date, tier, and current validity.

### Run a calibration pre-check

```bash
curl -X POST "http://localhost:42001/api/admin/validation/calibrate" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{}'
```

Notes:

- the response includes pass, fail, or skipped status per module
- validity is based on calibration presence and tool-hash matching
- the same endpoint also backs `Recalibrate All` from the UI

### Verify an exported report signature

```bash
curl -X POST "http://localhost:42001/api/admin/validation/verify" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "report": {
      "report_id": "rep-123",
      "run_id": "run-123",
      "generated_at": "2026-03-24T10:00:00.000Z",
      "overall_verdict": "PASS",
      "signature": "abcdef1234"
    }
  }'
```

Current verification note:

- this route performs structural validation and signature-format checks
- full cryptographic verification depends on `KATANA_VERIFY_KEY` and is not fully implemented yet

## LLM Routes

### Models

List models:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models"
```

Create a model:

```bash
curl -X POST "http://localhost:42001/api/llm/models" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "name": "OpenAI GPT-4o",
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "sk-..."
  }'
```

Get one model:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models/model-123"
```

Test a model connection:

```bash
curl -X POST \
  -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models/model-123/test"
```

Update a model:

```bash
curl -X PATCH "http://localhost:42001/api/llm/models/model-123" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{"enabled":false}'
```

Delete a model:

```bash
curl -X DELETE \
  -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models/model-123"
```

### Test cases

- `GET /api/llm/test-cases`
- `POST /api/llm/test-cases`
- `DELETE /api/llm/test-cases?id=...`

### Single execution

```bash
curl -X POST "http://localhost:42001/api/llm/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "modelId": "model-123",
    "testCaseId": "tc-001",
    "useCache": true
  }'
```

Required body fields:

- `modelId`
- `testCaseId`

### Batch execution

Start a batch:

```bash
curl -X POST "http://localhost:42001/api/llm/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "modelIds": ["model-123"],
    "testCaseIds": ["tc-001", "tc-002"]
  }'
```

Query all batches:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/batch"
```

Query one batch:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/batch?id=batch-123"
```

Filter by status:

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/batch?status=running"
```

### Useful read routes

- `GET /api/llm/results`
- `GET /api/llm/reports`
- `GET /api/llm/summary`
- `GET /api/llm/coverage`
- `GET /api/llm/presets`
- `GET /api/llm/local-models`
- `GET /api/llm/providers`

## Compliance, Arena, And Ronin Routes

Useful read routes for reporting and analysis:

- `GET /api/compliance`
- `GET /api/compliance/evidence`
- `GET /api/compliance/export`
- `GET /api/arena`
- `GET /api/arena/[id]`
- `GET /api/arena/[id]/stream`
- `GET /api/arena/export`
- `GET /api/ronin/programs`
- `GET /api/ronin/cves`
- `GET /api/ronin/submissions`

## Notes

- programmatic callers should still send `X-API-Key` even on routes that the browser can reach more easily through same-origin checks
- `GET /api/llm/models` is whitelisted in the API proxy for browser UX, but external automation is still best served by explicit API key usage
- for higher-level workflows, see [Common Workflows](COMMON_WORKFLOWS.md)
