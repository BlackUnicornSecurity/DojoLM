# NODA Platform API Reference

**Version:** 4.0 (NODA-3)
**Last Updated:** 2026-03-06

---

## Overview

This document provides a comprehensive reference for all NODA platform APIs across packages:

- **bu-tpi Scanner API** — Core scanning endpoints (port 8089)
- **dojolm-scanner API** — Programmatic scanner interface
- **dojolm-mcp API** — Model Context Protocol server (port 3001)

---

## bu-tpi Scanner API

Base URL: `http://localhost:8089`

All endpoints are GET-only with CORS enabled (`Access-Control-Allow-Origin: *`).

### Endpoints

#### `GET /api/scan`

Scan arbitrary text for prompt injection patterns.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `text` | string | Yes | URL-encoded text to scan (max 100KB) |
| `engines` | string | No | Comma-separated engine filter |

**Response:**

```json
{
  "verdict": "BLOCK",
  "findings": [
    {
      "category": "SYSTEM_OVERRIDE",
      "severity": "CRITICAL",
      "description": "System prompt override attempt",
      "match": "ignore all previous instructions",
      "pattern_name": "system_override",
      "engine": "regex",
      "weight": 10
    }
  ],
  "counts": {
    "CRITICAL": 1,
    "WARNING": 0,
    "INFO": 0
  },
  "textLength": 52,
  "normalizedLength": 48,
  "elapsed": "3ms"
}
```

**Verdict Values:**

| Verdict | Condition |
|---------|-----------|
| `BLOCK` | Any CRITICAL finding detected |
| `WARN` | Any WARNING finding (no CRITICAL) |
| `ALLOW` | No findings, or only INFO |

**Example:**

```bash
curl "http://localhost:8089/api/scan?text=Ignore%20all%20previous%20instructions"
```

---

#### `GET /api/scan-fixture`

Scan a fixture file from the library.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Relative path within `fixtures/` |

**Response:** Same as `/api/scan` plus `path` field.

**Example:**

```bash
curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
```

---

#### `GET /api/read-fixture`

Read the raw content of a fixture file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | string | Yes | Relative path within `fixtures/` |

**Text File Response:**

```json
{
  "path": "social/authority-impersonation.txt",
  "content": "FROM: Head of AI Safety...",
  "size": 412
}
```

**Binary File Response:**

```json
{
  "path": "images/exif-injection.jpg",
  "size": 632,
  "hex_preview": "ffd8ffe100...",
  "metadata": {
    "format": ".jpg",
    "magic": "ffd8ffe100224578",
    "valid_jpeg": true,
    "extracted_text": "IGNORE ALL PREVIOUS INSTRUCTIONS..."
  }
}
```

**Example:**

```bash
curl "http://localhost:8089/api/read-fixture?path=images/exif-injection.jpg"
```

---

#### `GET /api/fixtures`

Returns the full fixture manifest.

**Response:**

```json
{
  "generated": "2026-02-12T14:52:43.595Z",
  "version": "2.0.0",
  "categories": {
    "social": {
      "story": "TPI-06, TPI-07, TPI-08",
      "desc": "Social engineering, trust exploitation, and emotional manipulation",
      "files": [
        {
          "file": "authority-impersonation.txt",
          "attack": "Authority impersonation",
          "severity": "CRITICAL",
          "clean": false
        },
        {
          "file": "clean-friendly-request.txt",
          "attack": null,
          "severity": null,
          "clean": true
        }
      ]
    }
  }
}
```

**Example:**

```bash
curl "http://localhost:8089/api/fixtures"
```

---

#### `GET /api/stats`

Returns scanner statistics.

**Response:**

```json
{
  "patternCount": 505,
  "patternGroups": [
    "PI_PATTERNS",
    "JB_PATTERNS",
    "SETTINGS_WRITE_PATTERNS",
    "AGENT_OUTPUT_PATTERNS",
    "SEARCH_RESULT_PATTERNS",
    "WEBFETCH_PATTERNS",
    "BOUNDARY_PATTERNS",
    "MULTILINGUAL_PATTERNS",
    "CODE_FORMAT_PATTERNS",
    "SOCIAL_PATTERNS",
    "SYNONYM_PATTERNS",
    "WHITESPACE_PATTERNS",
    "MEDIA_PATTERNS",
    "UNTRUSTED_SOURCE_PATTERNS",
    "DOS_PATTERNS",
    "SUPPLY_CHAIN_PATTERNS",
    "VEC_PATTERNS"
  ]
}
```

**Example:**

```bash
curl "http://localhost:8089/api/stats"
```

---

#### `GET /api/run-tests`

Execute the test suite against all fixtures.

**Response:**

```json
{
  "passed": 7117,
  "failed": 0,
  "total": 7117,
  "duration": "12.5s",
  "results": [
    {
      "fixture": "social/authority-impersonation.txt",
      "expected": "BLOCK",
      "actual": "BLOCK",
      "passed": true
    }
  ]
}
```

**Example:**

```bash
curl "http://localhost:8089/api/run-tests"
```

---

### Server Security

| Feature | Details |
|---------|---------|
| Rate Limiting | 120 requests / 60 seconds per IP |
| Input Size | 100KB max on `/api/scan` |
| Methods | GET only (no POST/PUT/DELETE) |
| Path Traversal | `..` blocked, paths validated |
| CSP | Applied to fixture endpoints |
| Headers | X-Content-Type-Options, X-Frame-Options |

---

## dojolm-scanner API

Programmatic scanner interface for Node.js/TypeScript applications.

### Installation

```bash
npm install @dojolm/scanner
```

### Usage

#### Basic Scanning

```typescript
import { scan } from '@dojolm/scanner';

const result = scan("Some text to analyze");
console.log(result.verdict); // 'BLOCK', 'WARN', 'ALLOW'
console.log(result.findings); // Array of detected patterns
```

#### Engine Filtering

```typescript
import { scan } from '@dojolm/scanner';

// Scan only for prompt injection patterns
const result = scan(text, { engines: ['Prompt Injection'] });

// Scan for multiple specific engines
const result = scan(text, { 
  engines: ['Prompt Injection', 'Jailbreak', 'Unicode'] 
});
```

### Available Engines

| Engine ID | Description |
|-----------|-------------|
| `Prompt Injection` | Core prompt injection detection |
| `Jailbreak` | Jailbreak and DAN patterns |
| `TPI` | CrowdStrike TPI taxonomy patterns |
| `Unicode` | Hidden Unicode character detection |
| `Encoding` | Base64, URL encoding, ROT detection |
| `Denial of Service` | DoS attack patterns |
| `Supply Chain` | Supply chain security patterns |
| `Agent Security` | AI agent security patterns |
| `Model Theft` | Model extraction detection |
| `Output Handling` | XSS, SQLi, command injection |
| `Vector & Embeddings` | RAG/vector DB attack patterns |
| `Overreliance` | Overreliance & misinformation |
| `Bias & Fairness` | Bias detection patterns |
| `Multimodal Security` | Image/audio/deepfake patterns |
| `Environmental Impact` | Energy/carbon footprint patterns |

### API Reference

#### `scan(text: string, options?: ScanOptions): ScanResult`

Scans text for prompt injection patterns.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `text` | string | The text to scan |
| `options.engines` | string[] | Optional array of engine IDs |

**Returns:** `ScanResult`

```typescript
interface ScanResult {
  verdict: 'BLOCK' | 'WARN' | 'ALLOW';
  findings: Finding[];
  counts: {
    CRITICAL: number;
    WARNING: number;
    INFO: number;
  };
  elapsed: number;
}

interface Finding {
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  match: string;
  pattern_name: string;
  engine: string;
  weight: number;
}
```

#### `normalizeText(text: string): string`

Normalizes text for security scanning.

```typescript
import { normalizeText } from '@dojolm/scanner';

const normalized = normalizeText("Tëxt with ünïcödë");
// Returns normalized ASCII text
```

#### `getPatternCount(): number`

Returns total pattern count (505+).

```typescript
import { getPatternCount } from '@dojolm/scanner';
console.log(getPatternCount()); // 505
```

#### `getPatternGroups(): PatternGroupInfo[]`

Returns metadata about pattern groups.

```typescript
import { getPatternGroups } from '@dojolm/scanner';

const groups = getPatternGroups();
// [{ name: 'PI_PATTERNS', count: 33 }, ...]
```

---

## dojolm-mcp API

Model Context Protocol server for AI agent security testing.

Base URL: `http://localhost:3001`

### Server Setup

```typescript
import { AdversarialMCPServer } from '@dojolm/mcp';

const server = new AdversarialMCPServer({
  defaultMode: 'basic',
  consentRequired: true,
  port: 3001,
});

// Required before attacks are enabled
server.giveConsent();

await server.start();
```

### MCP Protocol

The server implements JSON-RPC 2.0 over HTTP.

#### `initialize`

Initialize the MCP connection.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {}
  }
}
```

#### `tools/list`

List available tools.

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

#### `tools/call`

Execute a tool (may return adversarial content).

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "/data/config.json"
    }
  }
}
```

#### `resources/list`

List available resources.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/list"
}
```

#### `resources/read`

Read a resource (may return adversarial content).

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "resources/read",
  "params": {
    "uri": "file:///data/secret.txt"
  }
}
```

### Attack Modes

| Mode | Severity | Enabled Attacks |
|------|----------|-----------------|
| `passive` | Low | Logging only |
| `basic` | Medium | Simple payloads |
| `advanced` | High | Multi-step attacks |
| `aggressive` | Critical | All attack types |

### Programmatic API

```typescript
// Get attack controller
const controller = server.getController();
controller.setMode('advanced');

// Check attack status
const isEnabled = controller.isAttackEnabled('tool-poisoning');

// Access virtual filesystem
const vfs = server.getVirtualFs();
vfs.writeFile('/test.txt', 'content');

// Access logs
const logger = server.getLogger();
const logs = logger.getLogs();
```

---

## dojolm-web API Routes

The Next.js web application (`packages/dojolm-web`) exposes the following API routes on port 3000.

### Haiku Scanner

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/scan` | Scan text for prompt injection patterns |

### Armory

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/fixtures` | List all fixtures from the manifest |

### LLM Dashboard & Jutsu

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/llm/models` | List or register LLM models |
| `POST` | `/api/llm/execute` | Execute a single LLM test |
| `POST` | `/api/llm/batch` | Start a batch test with SSE streaming progress |
| `GET` | `/api/llm/results` | Query stored test results |
| `GET` | `/api/llm/export` | Export results (JSON, CSV, SARIF 2.1.0, PDF) |
| `GET` | `/api/llm/coverage` | Get coverage data for tested models |

### Hattori Guard

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/llm/guard` | Get or update Hattori Guard configuration |
| `GET` | `/api/llm/guard/audit` | Retrieve Guard audit log entries |

### Ecosystem

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/ecosystem/findings` | Query or submit cross-module ecosystem findings |

### Ronin Hub

| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/ronin/programs` | List or create bug bounty programs |
| `GET/POST` | `/api/ronin/submissions` | List or create vulnerability submissions |
| `GET` | `/api/ronin/cves` | Query CVE data for enrichment |

### Amaterasu DNA

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/attackdna/analyze` | Run Black Box Analysis (ablation engine) on attack patterns |

### Bushido Book

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/compliance` | Get compliance data including BAISS unified standard |

### Admin

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/admin/health` | System health check and status |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (missing parameters) |
| 404 | Not Found (fixture not found) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_PATH",
    "message": "Path traversal detected",
    "details": {}
  }
}
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 120 requests | 60 seconds |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 115
X-RateLimit-Reset: 1709715600
```

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md)
- [Platform Guide](./user/PLATFORM_GUIDE.md)
- [Package READMEs](../packages/)
