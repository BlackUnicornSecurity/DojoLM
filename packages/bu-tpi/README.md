# bu-tpi — Haiku Scanner Core Engine

Core prompt injection detection engine powering the NODA platform's Haiku Scanner.

Zero runtime dependencies. Pure TypeScript. Runs with `tsx`.

## Quick Start

```bash
npm install                # Install dev dependencies (tsx, typescript)
npm run generate           # Generate 1,544 fixture files (binary + text artifacts)
npm start                  # Start server on http://localhost:8089
```

## Architecture

```
src/
  types.ts                 # Core type definitions (Finding, ScanResult, Severity, etc.)
  scanner.ts               # Detection engine — 505+ patterns, 47 groups, 6 heuristic detectors
  serve.ts                 # Hardened HTTP server with API endpoints
  generate-fixtures.ts     # Generates 1,544 attack/clean fixture files across 30 categories
fixtures/                  # Generated attack artifacts (git-tracked)
```

All source is strict TypeScript. No build step — executed directly via `tsx`.

## Scanner Engine

The core of the lab. Scans arbitrary text for prompt injection indicators using:

### Pattern Groups (505+ patterns across 47 groups)

| Group | Count | Covers |
|-------|-------|--------|
| PI_PATTERNS | 33 | System override, role hijacking, instruction ignoring |
| JB_PATTERNS | 66 | DAN/jailbreak, developer mode, unrestricted AI |
| SETTINGS_WRITE_PATTERNS | 3 | Write attempts to .claude/settings.json (TPI-PRE-4) |
| AGENT_OUTPUT_PATTERNS | 5 | Fake tool calls, XML tag injection, privilege escalation (TPI-03) |
| SEARCH_RESULT_PATTERNS | 3 | SEO poisoning, snippet injection (TPI-05) |
| WEBFETCH_PATTERNS | 9 | Hidden text, meta tags, data attributes in HTML (TPI-02) |
| BOUNDARY_PATTERNS | 8 | Control tokens, system boundary markers (TPI-14) |
| MULTILINGUAL_PATTERNS | 107 | 10+ languages x multiple categories (TPI-15) |
| CODE_FORMAT_PATTERNS | 13 | Injection in comments, strings, variable names (TPI-09) |
| SOCIAL_PATTERNS | 15 | Authority, urgency, flattery, guilt, reciprocity (TPI-06/07/08) |
| SYNONYM_PATTERNS | 20 | Synonym substitution for common injection phrases (TPI-12) |
| WHITESPACE_PATTERNS | 7 | Zero-width chars, tab padding, exotic whitespace (TPI-17) |
| MEDIA_PATTERNS | 9 | EXIF, PNG tEXt, ID3, SVG injection (TPI-18/20) |
| UNTRUSTED_SOURCE_PATTERNS | 3 | Downloads folder, /tmp, external URLs (TPI-21) |

### Heuristic Detectors

Beyond regex patterns, the scanner includes specialized detectors:

- **Base64 decoder** — Decodes base64 strings and scans the decoded content
- **HTML injection detector** — Finds hidden text in CSS (`display:none`, `font-size:0`, offscreen positioning)
- **Context overload detector** — Flags token flooding (>15K chars with <30% unique words) and many-shot attacks (>15 instruction-like sentences)
- **Character encoding detector** — Decodes ROT13, ROT47, reversed text, pig latin, and acrostic messages
- **Math encoding detector** — Detects formal logic notation used to encode injection
- **Hidden Unicode detector** — Finds zero-width characters and Unicode confusables

### Text Normalization

All input is normalized before scanning:
- NFKC Unicode normalization
- Zero-width character stripping (20+ char types)
- Unicode confusable mapping (Cyrillic/Greek/fullwidth to ASCII)
- Combining mark removal
- Whitespace collapse

### Verdict Logic

| Verdict | Condition |
|---------|-----------|
| **BLOCK** | Any CRITICAL finding |
| **WARN** | Any WARNING finding (no CRITICAL) |
| **ALLOW** | No findings, or only INFO |

Cross-category escalation: >5 INFO findings across >3 different categories triggers a WARNING.

## Fixture Categories (1,544 files across 30 categories)

| Category | Files | TPI Story | Description |
|----------|-------|-----------|-------------|
| images | 11 | TPI-18/19/20 | JPEG EXIF, PNG tEXt, SVG script/event/foreignObject |
| audio | 6 | TPI-20 | MP3 ID3v2, WAV RIFF, OGG Vorbis metadata injection |
| web | 7 | TPI-02/05 | HTML comment, hidden text, meta, data-attr, multilingual |
| context | 7 | TPI-04/PRE-4 | Memory files, agent defs, config, settings.json write attacks |
| malformed | 5 | TPI-19 | Format mismatches, polyglots (ELF-as-PNG, PE-as-JPG) |
| encoded | 14 | TPI-10/11/13/17 | ROT13, ROT47, base64, acrostic, token flooding, whitespace |
| agent-output | 6 | TPI-03 | Fake tool calls, XML tag injection, privilege escalation |
| search-results | 4 | TPI-05 | SEO poisoned results, malicious URLs, snippet injection |
| social | 12 | TPI-06/07/08 | Authority, urgency, flattery, guilt, reciprocity, sycophancy |
| code | 9 | TPI-09 | JS/Python/Shell/CSS/SQL comment injection, variable names |
| boundary | 4 | TPI-14 | Control tokens, system boundary markers, closing tags |
| untrusted-sources | 4 | TPI-21 | Image provenance indicators (Downloads, /tmp, URLs) |

Each category includes **clean/false-positive control files** to verify the scanner does not flag legitimate content.

## API Reference

All endpoints return JSON. CORS enabled (`Access-Control-Allow-Origin: *`).

### `GET /api/scan?text=<url-encoded-text>`

Scan arbitrary text for prompt injection patterns.

**Parameters:**
- `text` (required) — URL-encoded text to scan (max 100KB)

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
  "counts": { "CRITICAL": 1, "WARNING": 0, "INFO": 0 },
  "textLength": 52,
  "normalizedLength": 48,
  "elapsed": "3ms"
}
```

### `GET /api/scan-fixture?path=<category/filename>`

Scan a fixture file from the library. Text files are scanned directly; binary files have their metadata text extracted first.

**Parameters:**
- `path` (required) — Relative path within `fixtures/` (e.g., `social/authority-impersonation.txt`)

**Response:** Same as `/api/scan` plus `{ path: "..." }`

### `GET /api/read-fixture?path=<category/filename>`

Read the raw content of a fixture file.

**Text files response:**
```json
{
  "path": "social/authority-impersonation.txt",
  "content": "FROM: Head of AI Safety...",
  "size": 412
}
```

**Binary files response:**
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

### `GET /api/fixtures`

Returns the full fixture manifest with all categories, files, attack descriptions, and severity levels.

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
        { "file": "authority-impersonation.txt", "attack": "Authority impersonation", "severity": "CRITICAL", "clean": false },
        { "file": "clean-friendly-request.txt", "attack": null, "severity": null, "clean": true }
      ]
    }
  }
}
```

### `GET /api/stats`

Returns scanner statistics.

**Response:**
```json
{
  "patternCount": 505,
  "patternGroups": ["PI_PATTERNS", "JB_PATTERNS", "SETTINGS_WRITE_PATTERNS", ...]
}
```

## Server Security

The server is hardened for public-facing use:

- **CSP on fixtures** — `default-src 'none'; sandbox` prevents script execution
- **Rate limiting** — 120 requests per 60 seconds per IP
- **X-Content-Type-Options: nosniff** — Prevents MIME sniffing
- **X-Frame-Options: SAMEORIGIN** — Prevents framing
- **Path traversal prevention** — `..` blocked, paths validated against fixture root
- **Input size limit** — 100KB max on `/api/scan`
- **GET only** — No POST/PUT/DELETE, no uploads, no eval
- **MIME allowlist** — Only known safe content types served

## Using with a Local LLM

Give your local LLM (Ollama, LM Studio, etc.) these instructions to let it interact with the test lab:

---

**System prompt addition:**

```
You have access to the Haiku Scanner API at http://localhost:8089.
Use curl or HTTP requests to interact with it.

Available endpoints:

1. List all fixtures:
   curl http://localhost:8089/api/fixtures

2. Read a fixture file:
   curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"

3. Scan a fixture for injection:
   curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"

4. Scan arbitrary text:
   curl "http://localhost:8089/api/scan?text=ignore+all+previous+instructions"

5. Get scanner stats:
   curl http://localhost:8089/api/stats

Categories: images, audio, audio-attacks, web, context, malformed, encoded,
agent-output, search-results, social, code, boundary, untrusted-sources, vec,
multimodal, dos, supply-chain, agent, model-theft, output, overreliance, bias,
environmental

Verdicts: BLOCK (critical injection found), WARN (suspicious patterns),
ALLOW (clean text)

Workflow:
- Call /api/fixtures to browse available test cases
- Call /api/read-fixture to see what an attack payload looks like
- Call /api/scan-fixture to test the scanner against known attacks
- Call /api/scan to test your own text inputs
- Compare attack fixtures vs clean fixtures to understand detection boundaries
```

---

## TPI Story Coverage

| Story | Name | Coverage |
|-------|------|----------|
| TPI-PRE-4 | Settings.json Write Protection | Fixtures + patterns |
| TPI-02 | WebFetch Output Injection | Fixtures + patterns |
| TPI-03 | Agent-to-Agent Output Validation | Fixtures + patterns |
| TPI-04 | Context Window Injection | Fixtures + patterns |
| TPI-05 | WebSearch Output Validation | Fixtures + patterns |
| TPI-06 | Social Engineering Detection | Fixtures + patterns |
| TPI-07 | Trust & Rapport Exploitation | Fixtures + patterns |
| TPI-08 | Emotional Manipulation | Fixtures + patterns |
| TPI-09 | Code-Format Injection | Fixtures + patterns |
| TPI-10 | Character-Level Encoding | Fixtures + decoders |
| TPI-11 | Context Overload | Fixtures + heuristics |
| TPI-12 | Synonym Substitution | Fixtures + patterns |
| TPI-13 | Payload Fragmentation | Fixtures + patterns |
| TPI-14 | Control Tokens & Boundaries | Fixtures + patterns |
| TPI-15 | Multilingual Injection | Fixtures + 40 patterns (10 langs) |
| TPI-17 | Whitespace & Formatting Evasion | Fixtures + patterns |
| TPI-18 | Image Metadata Injection | Fixtures + patterns |
| TPI-19 | Format Mismatch / Polyglots | Fixtures + binary analysis |
| TPI-20 | Audio/Media Metadata | Fixtures + patterns |
| TPI-21 | Untrusted Source Indicators | Fixtures + patterns |

See [TPI-TESTLAB-GAP-FILL.md](/team/planning/archive/TPI-TESTLAB-GAP-FILL.md) for the detailed gap analysis.

## Development

```bash
npm run generate           # Regenerate all fixture files
npm run typecheck         # TypeScript type checking (tsc --noEmit)
npm start                # Start server (default port 8089)
npx tsx src/serve.ts 9000  # Start on custom port
```

## Testing

The TPI Security Test Lab includes comprehensive testing for both humans and LLM agents.

### Quick Test Commands

```bash
# Run all tests (CLI - local development)
npm test

# Run all tests via API (server must be running)
npm run test:api

# Or directly via curl
curl http://localhost:8089/api/run-tests
```

### Test Suite

| Test | Description |
|------|-------------|
| typecheck | TypeScript validation |
| regression | Full fixture regression (all fixtures) |
| false-positive | False positive verification |
| epic4 | EPIC 4 coverage test |
| epic8-session | Session simulator |
| epic8-tool-output | Tool output validation |

### API Test Endpoint

**Endpoint:** `GET /api/run-tests`

**Query Parameters:**
- `filter` - Comma-separated test names (e.g., `regression,epic4`)
- `verbose` - Include full test output (`true`/`false`)

**Example:**
```bash
curl "http://localhost:8089/api/run-tests?filter=regression&verbose=true"
```

**Response:**
```json
{
  "summary": { "total": 8, "passed": 7, "failed": 1, "duration_ms": 3247 },
  "results": [...],
  "timestamp": "2026-02-13T10:34:12.456Z"
}
```

## Related Packages

- [@dojolm/scanner](../dojolm-scanner/) - Web-friendly scanner with engine filtering
- [dojolm-web](../dojolm-web/) - Next.js web interface

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md) - Complete user documentation
- [Contributing Guide](../../github/CONTRIBUTING.md) - Contribution guidelines
- [Testing Checklist](../../docs/app/testing-checklist.md) - Comprehensive testing guide

## License

UNLICENSED / Private
