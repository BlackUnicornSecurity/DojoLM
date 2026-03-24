# User API Reference

This page focuses on the endpoints users and integrators are most likely to call directly.

## Base URLs

- Standalone scanner: `http://localhost:8089`
- Web API: `http://localhost:42001/api`

## Authentication

For the web API:

- browser requests from the same origin are handled by the app automatically
- programmatic requests usually need `X-API-Key`
- the key value must match `NODA_API_KEY`

The standalone scanner API is GET-only and does not use the web API key flow.

## Standalone Scanner API

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

## Web Scanner Route

Use this when you want to call the same scanner flow the web UI uses.

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

## Health Endpoints

```bash
curl "http://localhost:42001/api/health"
curl "http://localhost:42001/api/admin/health"
```

## Model Configuration Endpoints

### List models

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models"
```

### Create a model

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

### Test a model connection

```bash
curl -X POST \
  -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/models/model-123/test"
```

## LLM Execution Endpoints

### Run one test case

```bash
curl -X POST "http://localhost:42001/api/llm/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "modelId": "model-123",
    "testCaseId": "tc-001"
  }'
```

### Start a batch

```bash
curl -X POST "http://localhost:42001/api/llm/batch" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $NODA_API_KEY" \
  -d '{
    "modelIds": ["model-123"],
    "testCaseIds": ["tc-001", "tc-002"]
  }'
```

### Query batches

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/batch"
```

### Stream batch progress

```bash
curl -H "X-API-Key: $NODA_API_KEY" \
  "http://localhost:42001/api/llm/batch/batch-123/stream"
```

## Useful Read Routes

- `GET /api/llm/results`
- `GET /api/llm/reports`
- `GET /api/llm/summary`
- `GET /api/llm/coverage`
- `GET /api/llm/presets`
- `GET /api/ecosystem/findings`
- `GET /api/compliance`
- `GET /api/arena/export`

## Notes On Legacy Docs

Older documentation that describes `POST /api/scan` on port `8089` is outdated. The standalone scanner on `:8089` is GET-only; the POST scanner route lives in the web app on `:42001/api/scan`.

### GET /api/arena/:id

Get match details.

**Response:**
```json
{
  "id": "uuid",
  "status": "completed",
  "gameMode": "CTF",
  "fighterA": { ... },
  "fighterB": { ... },
  "rounds": [...],
  "scores": {
    "fighter-a-id": 125,
    "fighter-b-id": 75
  },
  "winnerId": "fighter-a-id"
}
```

### GET /api/arena/:id/stream

Stream match events via SSE.

---

## Guard API

### GET /api/guard/events

List guard events.

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| action | string | Filter by action (block/allow/log) |
| direction | string | Filter by direction (input/output) |
| limit | number | Max results |

### POST /api/guard/configs

Create guard configuration.

**Request:**
```json
{
  "name": "Production Guard",
  "mode": "block",
  "rules": [
    {
      "type": "pattern",
      "pattern": "ignore.*previous",
      "action": "block"
    }
  ]
}
```

---

## Admin API

### GET /api/admin/health

Platform health check.

**Response:**
```json
{
  "status": "healthy",
  "version": "5.0.0",
  "services": {
    "scanner": "healthy",
    "storage": "healthy",
    "llm": "healthy"
  },
  "timestamp": "2026-03-08T12:00:00Z"
}
```

### GET /api/admin/stats

Platform statistics.

**Response:**
```json
{
  "scans": {
    "total": 10000,
    "today": 150
  },
  "findings": {
    "total": 500,
    "bySeverity": {
      "critical": 10,
      "high": 50,
      "medium": 150,
      "low": 290
    }
  },
  "models": {
    "configured": 5,
    "tested": 3
  }
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable description",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

**HTTP Status Codes:**

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| General API | 100 req/min |
| Auth failures | 10/min |
| Batch execution | 5 concurrent |
| Arena SSE | 5 per IP, 50 global |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1646745600
```

---

## SDK Examples

### Python

```python
import requests

API_KEY = "your-api-key"
BASE_URL = "http://localhost:42001/api"

def scan_text(text):
    response = requests.post(
        f"{BASE_URL}/ecosystem/findings",
        headers={"X-API-Key": API_KEY},
        json={"text": text}
    )
    return response.json()

result = scan_text("Test prompt")
print(result["verdict"])
```

### JavaScript

```javascript
const API_KEY = 'your-api-key';
const BASE_URL = 'http://localhost:42001/api';

async function scanText(text) {
  const response = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ text })
  });
  return response.json();
}
```
