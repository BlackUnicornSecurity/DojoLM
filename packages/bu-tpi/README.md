# bu-tpi — Haiku Scanner Core Engine

Core prompt injection detection engine powering the NODA platform's Haiku Scanner.

Zero runtime dependencies. Pure TypeScript. Runs with `tsx`.

## Quick Start

```bash
npm install                # Install dev dependencies (tsx, typescript)
npm run generate           # Generate 2,375 fixture files (binary + text artifacts)
npm start                  # Start server on http://localhost:8089
```

## Architecture

```
src/
  types.ts                 # Core type definitions (Finding, ScanResult, Severity, etc.)
  scanner.ts               # Detection engine — 534 patterns, 6 heuristic detectors
  serve.ts                 # Hardened HTTP server with API endpoints
  generate-fixtures.ts     # Generates 2,375 attack/clean fixture files
  modules/                 # 27 scanner modules
  sengoku/                 # Continuous red teaming (HAKONE)
  timechamber/             # Temporal attack simulation (HAKONE)
  kotoba/                  # Prompt optimizer (HAKONE)
  edgefuzz/                # Fuzzing engine (HAKONE)
  supplychain/             # Supply chain security (HAKONE)
  webmcp/                  # MCP attack vectors (HAKONE)
fixtures/                  # Generated attack artifacts (git-tracked)
```

All source is strict TypeScript. No build step — executed directly via `tsx`.

## Scanner Engine

The core detection system. Scans arbitrary text for prompt injection indicators using:

### Pattern Groups (534 patterns)

| Group | Count | Coverage |
|-------|-------|----------|
| PI_PATTERNS | 64 | System override, role hijacking, instruction ignoring |
| JB_PATTERNS | 120+ | DAN/jailbreak, developer mode, unrestricted AI |
| AGENT_PATTERNS | 45 | Fake tool calls, XML injection, privilege escalation |
| MULTILINGUAL_PATTERNS | 80+ | 10+ languages |
| MEDIA_PATTERNS | 60+ | EXIF, PNG, ID3, SVG injection |
| WHITESPACE_PATTERNS | 30 | Zero-width chars, invisible characters |
| SETTINGS_WRITE_PATTERNS | 3 | Settings.json write attempts |
| SEARCH_RESULT_PATTERNS | 3 | SEO poisoning, snippet injection |
| WEBFETCH_PATTERNS | 9 | Hidden text, meta tags, data attributes |
| BOUNDARY_PATTERNS | 8 | Control tokens, system boundary markers |
| CODE_FORMAT_PATTERNS | 13 | Comment injection, variable names |
| SOCIAL_PATTERNS | 15 | Authority, urgency, flattery, manipulation |
| SYNONYM_PATTERNS | 20 | Synonym substitution attacks |
| UNTRUSTED_SOURCE_PATTERNS | 3 | Downloads, /tmp, external URLs |

### Heuristic Detectors

Beyond regex patterns, specialized detectors:

- **Base64 detector** — Decodes and scans base64 content
- **HTML injection detector** — Finds hidden text in CSS
- **Context overload detector** — Flags token flooding, many-shot attacks
- **Character encoding detector** — ROT13, ROT47, reversed text, pig latin
- **Math encoding detector** — Formal logic notation encoding
- **Hidden Unicode detector** — Zero-width characters, Unicode confusables

### Text Normalization

All input normalized before scanning:
- NFKC Unicode normalization
- Zero-width character stripping (20+ char types)
- Unicode confusable mapping (Cyrillic/Greek/fullwidth to ASCII)
- Combining mark removal
- Whitespace collapse

### Verdict Logic

| Verdict | Condition |
|---------|-----------|
| **BLOCK** | Any CRITICAL finding |
| **ALLOW** | No findings or only INFO |

Cross-category escalation: >5 INFO findings across >3 categories triggers WARNING.

## Fixture Categories (2,375 files)

| Category | Files | Description |
|----------|-------|-------------|
| agent/ | 200+ | Agent-based attacks |
| agent-output/ | 50+ | Agent output manipulation |
| audio-attacks/ | 20+ | ASR evasion, steganography |
| clean/ | 200+ | Benign control files |
| injection/ | 300+ | Prompt injection attempts |
| jailbreak/ | 250+ | Jailbreak variants |
| encoding/ | 150+ | Base64, ROT13, hex |
| multilingual/ | 180+ | Non-English attacks |
| rag/ | 80+ | RAG exploitation |
| tool-poisoning/ | 70+ | MCP/tool attacks |
| supply-chain/ | 50+ | Dependency attacks |
| webmcp/ | 100+ | WebMCP vectors |
| images/ | 11 | JPEG EXIF, PNG tEXt, SVG |
| audio/ | 6 | MP3 ID3, WAV, OGG |
| social/ | 12 | Social engineering |
| code/ | 9 | Code format injection |
| boundary/ | 4 | Control tokens |
| dos/ | 44+ | DoS patterns |

Each category includes **clean/false-positive control files**.

## Modules (27 total)

Detection modules in `src/modules/`:

| Module | Purpose |
|--------|---------|
| enhanced-pi.ts | Prompt injection detection |
| encoding-engine.ts | Base64, ROT13, hex detection |
| webmcp-detector.ts | MCP tool attacks |
| ssrf-detector.ts | Server-side request forgery |
| pii-detector.ts | PII identification |
| env-detector.ts | Credential detection |
| dos-detector.ts | Denial of service |
| output-detector.ts | Output validation |
| overreliance-detector.ts | Hallucination detection |
| model-theft-detector.ts | Model extraction |
| token-analyzer.ts | Token limit analysis |
| bias-detector.ts | Bias detection |
| rag-analyzer.ts | RAG security |
| supply-chain-detector.ts | Supply chain risks |

New in HAKONE:
- `sengoku/` — Continuous red teaming
- `timechamber/` — Temporal attacks
- `kotoba/` — Prompt optimization
- `edgefuzz/` — Fuzzing engine
- `supplychain/` — Supply chain auditing
- `webmcp/` — MCP security

## API Reference

All endpoints return JSON. CORS enabled.

### `GET /api/scan?text=<url-encoded-text>`

Scan text for prompt injection patterns.

**Parameters:**
- `text` (required) — URL-encoded text (max 100KB)

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

### `GET /api/fixtures`

Returns full fixture manifest.

### `GET /api/stats`

Returns scanner statistics.

**Response:**
```json
{
  "patternCount": 534,
  "patternGroups": ["PI_PATTERNS", "JB_PATTERNS", ...]
}
```

## Server Security

- **CSP on fixtures** — `default-src 'none'; sandbox`
- **Rate limiting** — 120 requests per 60 seconds per IP
- **X-Content-Type-Options: nosniff**
- **X-Frame-Options: SAMEORIGIN**
- **Path traversal prevention** — `..` blocked
- **Input size limit** — 100KB max
- **GET only** — No POST/PUT/DELETE

## Testing

```bash
npm test                    # Run all tests
npm run test:api           # Run tests via API
```

Test endpoint: `GET /api/run-tests`

## Development

```bash
npm run generate           # Regenerate fixtures
npm run typecheck         # TypeScript checking
npm start                # Start server (port 8089)
```

## Related Packages

- [@dojolm/scanner](../dojolm-scanner/) - Web-friendly scanner
- [dojolm-web](../dojolm-web/) - Next.js web interface

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md)
- [Contributing Guide](../../github/CONTRIBUTING.md)

## License

DojoLM Research-Only License — See [LICENSE](../../LICENSE)
