# API Reference

## Overview

NODA provides RESTful APIs for scanner operations, LLM testing, and platform management.

**Base URLs:**
- Scanner API: `http://localhost:8089`
- Web API: `http://localhost:42001/api`

**Authentication:**
- API Key via `X-API-Key` header (for programmatic access)
- Session-based (for web UI)

---

## Scanner API

### POST /api/scan

Scan text for prompt injection attacks.

**Request:**
```bash
curl -X POST http://localhost:8089/api/scan \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Ignore previous instructions",
    "context": "user",
    "modelId": "gpt-4"
  }'
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Text to scan |
| context | string | No | Context type (system/user/assistant) |
| modelId | string | No | Model identifier |

**Response:**
```json
{
  "verdict": "BLOCK",
  "severity": 8,
  "confidence": 0.95,
  "findings": [
    {
      "type": "prompt_injection",
      "pattern": "ignore_previous",
      "matchedText": "Ignore previous instructions",
      "severity": 8,
      "confidence": 0.95
    }
  ],
  "metadata": {
    "scanDuration": 0.5,
    "patternsChecked": 505
  }
}
```

### GET /api/health

Check scanner health status.

**Response:**
```json
{
  "status": "healthy",
  "version": "5.0.0",
  "patternsLoaded": 505,
  "uptime": 3600
}
```

---

## Ecosystem API

### GET /api/ecosystem/findings

List ecosystem findings.

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| severity | number | Minimum severity (1-10) |
| category | string | Finding category |
| limit | number | Max results (default: 100) |
| offset | number | Pagination offset |

**Response:**
```json
{
  "findings": [
    {
      "id": "uuid",
      "type": "vulnerability",
      "severity": 8,
      "category": "prompt_injection",
      "sourceModule": "scanner",
      "description": "...",
      "detectedAt": "2026-03-08T12:00:00Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### POST /api/ecosystem/findings

Create a new finding.

**Request:**
```json
{
  "type": "vulnerability",
  "severity": 7,
  "category": "prompt_injection",
  "description": "Description of finding",
  "evidence": { ... },
  "recommendation": "Recommended fix"
}
```

---

## LLM API

### POST /api/llm/execute

Execute a single LLM test.

**Request:**
```bash
curl -X POST http://localhost:42001/api/llm/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "modelId": "gpt-4",
    "testCaseId": "prompt-injection-001",
    "prompt": "Test prompt",
    "temperature": 0.7
  }'
```

**Response:**
```json
{
  "executionId": "uuid",
  "status": "completed",
  "modelId": "gpt-4",
  "result": {
    "response": "Model response text",
    "scanResult": {
      "verdict": "BLOCK",
      "severity": 8
    },
    "injectionSuccess": 0.85,
    "resilienceScore": 0.15
  },
  "completedAt": "2026-03-08T12:00:00Z"
}
```

### POST /api/llm/batch

Execute batch LLM tests with SSE streaming.

**Request:**
```bash
curl -X POST http://localhost:42001/api/llm/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "modelIds": ["gpt-4", "claude-3"],
    "testCaseIds": ["test-001", "test-002"],
    "concurrentLimit": 5
  }'
```

**Response:**
```json
{
  "batchId": "uuid",
  "status": "running",
  "totalTests": 100,
  "streamUrl": "/api/llm/batch/uuid/stream"
}
```

### GET /api/llm/batch/:id/stream

Stream batch progress via SSE.

```bash
curl http://localhost:42001/api/llm/batch/uuid/stream
```

**Events:**
```
event: progress
data: {"completed": 10, "total": 100, "percent": 10}

event: result
data: {"executionId": "...", "status": "completed", ...}

event: complete
data: {"batchId": "...", "status": "completed"}
```

---

## Attack DNA API

### POST /api/attackdna/ingest

Trigger ingestion of ecosystem findings into DNA.

**Response:**
```json
{
  "status": "completed",
  "nodesIngested": 50,
  "edgesCreated": 25,
  "duration": 1200
}
```

### GET /api/attackdna/query/nodes

Query attack nodes.

**Query Parameters:**

| Name | Type | Description |
|------|------|-------------|
| sourceTier | string | Filter by tier (dojo-local/dojolm-global/master) |
| category | string | Attack category |
| severity | string | Severity level |
| search | string | Text search |

**Response:**
```json
{
  "nodes": [
    {
      "id": "uuid",
      "type": "attack_variant",
      "category": "prompt_injection",
      "severity": 8,
      "sourceTier": "dojo-local",
      "metadata": { ... }
    }
  ]
}
```

### POST /api/attackdna/sync

Trigger sync with external threat intel sources.

**Request:**
```json
{
  "source": "mitre-atlas"
}
```

**Response:**
```json
{
  "status": "completed",
  "source": "mitre-atlas",
  "entriesFetched": 100,
  "entriesAfterDedup": 85,
  "duration": 5000
}
```

---

## Arena API

### POST /api/arena

Create and start a new arena match.

**Request:**
```json
{
  "gameMode": "CTF",
  "attackMode": "kunai",
  "fighterA": {
    "modelId": "gpt-4",
    "role": "attacker"
  },
  "fighterB": {
    "modelId": "claude-3",
    "role": "defender"
  },
  "maxRounds": 10,
  "victoryPoints": 100
}
```

**Response:**
```json
{
  "matchId": "uuid",
  "status": "running",
  "streamUrl": "/api/arena/uuid/stream"
}
```

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
