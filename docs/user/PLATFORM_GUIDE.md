# NODA Platform Guide

**Version:** 4.0 (NODA-3)
**Last Updated:** 2026-03-06

**NODA** is an LLM red teaming and security testing platform. It gives you the tools to test, evaluate, and understand how language models respond to adversarial inputs — before those inputs reach your production systems.

This guide covers:
- What NODA does and how it works
- Web interface features
- Scanner API usage
- Integration with local LLMs
- Complete TPI coverage reference

---

## What NODA Does

NODA detects prompt injection attacks: attempts by adversarial text to hijack LLM behavior by overriding instructions, impersonating authority, encoding payloads, manipulating through social pressure, or exploiting the trust model of agentic systems.

The platform has two main modes, accessible as modules in the NODA sidebar:

**1. Scan mode** — Submit any text and get an immediate verdict (BLOCK / WARN / ALLOW) with a detailed breakdown of what patterns triggered, why, and how severe each finding is. Available via the **Haiku Scanner** module.

**2. LLM benchmark mode** — Test a local or cloud LLM against the full attack fixture library. See which attack categories your model is vulnerable to, which it resists, and how it compares to other models. Available via the **LLM Dashboard** and **LLM Jutsu** modules.

### Version 4.0 (NODA-3) Extensions

This release extends NODA with major platform enhancements:
- **OWASP LLM Top 10** — 100% coverage
- **MITRE ATLAS** tactics
- **NIST AI RMF** risks
- **ENISA AI** threats
- **Ronin Hub** — Bug bounty researcher platform
- **LLM Jutsu** — Testing command center
- **Belt color system** — 7 ranks (White through Black) based on security score
- **Adversarial Skills Library** — 40 skills across 6 playbooks
- **Audio/voice attack expansion** — Dual-layer scanning (vocal + metadata)
- **Black Box Analysis** — Ablation engine for attack lineage study
- **Unified sidebar navigation** — 12 modules in a single sidebar

---

## Quick Start

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install

# Option A: Scanner API only (port 8089, zero dependencies)
npm start --workspace=packages/bu-tpi

# Option B: Full web UI (port 3000)
npm run dev:web
```

**Scanner API:** `http://localhost:8089`  
**Web UI:** `http://localhost:3000`

---

## Architecture

```
packages/bu-tpi/
src/
  types.ts                 # Core type definitions (Finding, ScanResult, Severity, etc.)
  scanner.ts               # Detection engine — 505+ patterns, 47 groups, 6 heuristic detectors
  serve.ts                 # Hardened HTTP server with API endpoints
  generate-fixtures.ts     # Generates 1,545 attack/clean fixture files across 31 categories
fixtures/                  # Generated attack artifacts (git-tracked)
```

All source is strict TypeScript. No build step — executed directly via `tsx`.

---

## Scanner Engine

The core detection engine runs 505+ regex patterns plus 6 specialized heuristic detectors.

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
| MULTILINGUAL_PATTERNS | 107 | 10+ languages × multiple categories (TPI-15) |
| CODE_FORMAT_PATTERNS | 13 | Injection in comments, strings, variable names (TPI-09) |
| SOCIAL_PATTERNS | 15 | Authority, urgency, flattery, guilt, reciprocity (TPI-06/07/08) |
| SYNONYM_PATTERNS | 20 | Synonym substitution for common injection phrases (TPI-12) |
| WHITESPACE_PATTERNS | 7 | Zero-width chars, tab padding, exotic whitespace (TPI-17) |
| MEDIA_PATTERNS | 9 | EXIF, PNG tEXt, ID3, SVG injection (TPI-18/20) |
| UNTRUSTED_SOURCE_PATTERNS | 3 | Downloads folder, /tmp, external URLs (TPI-21) |
| DOS_PATTERNS | 21 | Denial of Service attacks (OWASP LLM04, MITRE AML.T0029) |
| SUPPLY_CHAIN_PATTERNS | 26 | Supply chain vulnerabilities (OWASP LLM05) |
| VEC_PATTERNS | 45 | Vector & embeddings weaknesses — indirect/poison/leak (OWASP 2025) |

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

**Cross-category escalation:** More than 5 INFO findings across more than 3 different categories automatically escalates to WARNING — even if no individual finding is high severity. This catches fragmented and multi-vector attacks.

---

## Fixture Categories (1,544 files)

### Original TPI Categories

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

### DojoV2 Categories (New in v3.0)

| Category | Files | Framework | Description |
|----------|-------|-----------|-------------|
| **dos** | 54 | OWASP LLM04, MITRE AML.T0029 | Denial of Service — input length, recursive, context overflow |
| **supply-chain** | 54 | OWASP LLM05 | Supply chain — model verification, dependency scanning, plugins |
| **agent** | 72 | MITRE ATLAS | AI Agent Security — credential harvesting, context poisoning, RAG |
| **model-theft** | 54 | OWASP LLM10 | Model Theft — API extraction, fingerprinting, side-channel |
| **output** | 54 | OWASP LLM02 | Insecure Output — XSS, SQLi, command injection, SSRF |
| **vec** | 45 | OWASP 2025 | Vector & Embeddings — indirect injection, poisoning, leakage |
| **overreliance** | 42 | OWASP LLM09 | Overreliance — automated decisions, code without review |
| **bias** | 67 | NIST AI 600-1 | Bias & Fairness — disability, socioeconomic, cultural |
| **multimodal** | 35 | MITRE ATLAS | Multimodal — image/audio injection, deepfake, adversarial |
| **environmental** | 15 | NIST AI 600-1 | Environmental — energy, carbon, efficiency |

Each category includes **clean/false-positive control files** to verify the scanner does not flag legitimate content.

---

## The NODA Web Interface

The NODA platform uses a unified sidebar navigation with 12 modules:

### NODA Dashboard
The configurable homepage with drag-and-drop widgets: System Health, Fixture Count, Quick Scan, Threat Radar, Ecosystem Pulse, Guard Stats, LLM Models, Dojo Readiness, Attack of the Day, and more.

### Haiku Scanner
Real-time text scanning. Paste any text and get a verdict (BLOCK/WARN/ALLOW) with detailed pattern breakdown. Supports engine filtering for targeted scans.

### Armory (formerly Test Lab)
Browse the 1,544+ attack fixture files. Filter by category, severity, TPI story. Scan any fixture directly, compare fixtures side-by-side, and export test sets.

### Bushido Book (formerly Compliance Center)
Compliance management with tabs: Overview, Coverage Map, Gap Matrix, Audit Trail, Checklists. Supports 8 frameworks: TPI, OWASP, NIST, MITRE, ISO, EU AI, ENISA, and BAISS (unified standard with 32 controls). Includes Coverage Delta View for snapshot comparison.

### LLM Dashboard
Multi-provider LLM benchmarking with SSE real-time streaming, executive summary with resilience gauge, report downloads (JSON/CSV/SARIF/PDF), vulnerability panel with severity-grouped findings, and leaderboard with sparklines.

### Atemi Lab (formerly Adversarial Lab)
Adversarial testing via the MCP server. Features include: getting started guide, MCP connector status, configuration panel, session recording with playback, and the Adversarial Skills Library (40 skills, 6 playbooks).

### The Kumite (formerly Strategic Hub)
Strategic analysis hub with three sub-modules:
- **SAGE** — Strategic Analysis and Guidance Engine
- **Arena** — Model comparison battles with live inference
- **Mitsuke** — Real-time threat feed stream

### Amaterasu DNA (formerly AttackDNA)
Attack lineage analysis with visualizations: Family Tree View, Cluster View, Mutation Timeline. Includes Black Box Analysis — an ablation study engine with token heatmap and impact charts. All views have legends, zoom controls, and cluster indicators.

### Hattori Guard (formerly LLM Guard)
Input/output protection system with 4 modes:
| Mode | Icon | Purpose |
|------|------|---------|
| Shinobi | Eye | Stealth monitoring — log only |
| Samurai | Shield | Active defense — block inputs |
| Sensei | ShieldAlert | Aggressive defense — block outputs |
| Hattori | ShieldCheck | Full protection — block both |

### Ronin Hub
Bug bounty researcher platform. Browse security programs, submit vulnerability findings, track submissions, and correlate with CVE data. Features AI-powered severity calculator.

### LLM Jutsu
LLM testing command center. View model cards with security scores, detailed test results per model, aggregated cross-model comparisons, and risk summaries.

### Admin
System health monitoring, API key management, export settings, and scanner configuration.

---

## Using the Scanner API

The scanner exposes a simple REST API. All endpoints are GET, all responses are JSON.

### Scan any text

```bash
curl "http://localhost:8089/api/scan?text=Ignore+all+previous+instructions"
```

```json
{
  "verdict": "BLOCK",
  "findings": [
    {
      "category": "SYSTEM_OVERRIDE",
      "severity": "CRITICAL",
      "description": "Attempt to override system instructions",
      "match": "Ignore all previous instructions",
      "engine": "Prompt Injection",
      "pattern_name": "ignore_instructions",
      "weight": 10
    }
  ],
  "counts": { "critical": 1, "warning": 0, "info": 0 },
  "textLength": 36,
  "normalizedLength": 36,
  "elapsed": "2ms"
}
```

### Scan a fixture file

```bash
curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
```

### Read fixture content

**Text files:**
```bash
curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
```

```json
{
  "path": "social/authority-impersonation.txt",
  "content": "FROM: Head of AI Safety...",
  "size": 412
}
```

**Binary files:**
```bash
curl "http://localhost:8089/api/read-fixture?path=images/exif-injection.jpg"
```

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

### List all fixtures

```bash
curl http://localhost:8089/api/fixtures
```

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

### Get scanner statistics

```bash
curl http://localhost:8089/api/stats
```

```json
{
  "patternCount": 505,
  "patternGroups": ["PI_PATTERNS", "JB_PATTERNS", "SETTINGS_WRITE_PATTERNS", ...]
}
```

### Run test suites via API

```bash
# All tests
curl "http://localhost:8089/api/run-tests"

# Specific suites with verbose output
curl "http://localhost:8089/api/run-tests?filter=regression,false-positive&verbose=true"
```

**Response:**
```json
{
  "summary": { "total": 8, "passed": 7, "failed": 1, "duration_ms": 3247 },
  "results": [...],
  "timestamp": "2026-02-13T10:34:12.456Z"
}
```

---

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

---

## Integrating with a Local LLM

To let a local LLM (Ollama, LM Studio, etc.) interact with NODA, add this to its system prompt:

```
You have access to the NODA TPI Security Lab at http://localhost:8089.

Available endpoints:
- List all fixtures: curl http://localhost:8089/api/fixtures
- Read a fixture: curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
- Scan a fixture: curl "http://localhost:8089/api/scan-fixture?path=social/authority-impersonation.txt"
- Scan arbitrary text: curl "http://localhost:8089/api/scan?text=<url-encoded-text>"
- Get scanner stats: curl http://localhost:8089/api/stats

Categories: images, audio, audio-attacks, web, context, malformed, encoded, agent-output,
search-results, social, code, boundary, untrusted-sources, vec, multimodal, dos,
supply-chain, agent, model-theft, output, overreliance, bias, environmental

Verdicts: BLOCK (critical injection), WARN (suspicious), ALLOW (clean)

Workflow: List fixtures → Read payload → Scan it → Compare to clean control files
```

---

## Development

```bash
npm run generate           # Regenerate all fixture files
npm run typecheck         # TypeScript type checking (tsc --noEmit)
npm start                # Start server (default port 8089)
npx tsx src/serve.ts 9000  # Start on custom port
```

---

## Testing

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

---

## TPI Coverage Reference

NODA implements the full CrowdStrike Taxonomy of Prompt Injection:

| Story | Attack Class | Detection Method |
|-------|-------------|-----------------|
| TPI-PRE-4 | Settings.json Write Protection | Regex patterns + fixtures |
| TPI-02 | WebFetch Output Injection | Regex patterns + fixtures |
| TPI-03 | Agent-to-Agent Output Validation | Regex patterns + fixtures |
| TPI-04 | Context Window Injection | Regex patterns + fixtures |
| TPI-05 | WebSearch Output Validation | Regex patterns + fixtures |
| TPI-06 | Social Engineering Detection | Regex patterns + fixtures |
| TPI-07 | Trust & Rapport Exploitation | Regex patterns + fixtures |
| TPI-08 | Emotional Manipulation | Regex patterns + fixtures |
| TPI-09 | Code-Format Injection | Regex patterns + fixtures |
| TPI-10 | Character-Level Encoding | Regex + decoder heuristics |
| TPI-11 | Context Overload | Heuristic detectors |
| TPI-12 | Synonym Substitution | Regex patterns + fixtures |
| TPI-13 | Payload Fragmentation | Regex patterns + fixtures |
| TPI-14 | Control Tokens & Boundaries | Regex patterns + fixtures |
| TPI-15 | Multilingual Injection | 40+ patterns across 10 languages |
| TPI-17 | Whitespace & Formatting Evasion | Regex + Unicode normalization |
| TPI-18 | Image Metadata Injection | Binary extraction + patterns |
| TPI-19 | Format Mismatch / Polyglots | Binary analysis |
| TPI-20 | Audio/Media Metadata | Binary extraction + patterns |
| TPI-21 | Untrusted Source Indicators | Regex patterns + fixtures |

All TPI stories have complete coverage via patterns and fixtures.

---

## Understanding Findings

Each finding in a scan result includes:

| Field | Description |
|-------|-------------|
| `category` | What type of attack was detected (e.g., `SYSTEM_OVERRIDE`, `JAILBREAK`, `SOCIAL_ENGINEERING`) |
| `severity` | `CRITICAL` (triggers BLOCK), `WARNING` (triggers WARN), `INFO` (informational) |
| `description` | Human-readable description of what was detected |
| `match` | The substring that triggered the pattern |
| `engine` | Which detection engine found it (Prompt Injection, Jailbreak, Unicode, Encoding, TPI) |
| `pattern_name` | The specific pattern name — searchable in the Armory module |
| `weight` | Detection weight (higher = stronger signal) |

---

## What NODA Is Not

NODA is a detection and testing tool, not a production firewall. Key limitations:

- The scanner operates on text content — it does not have context about how text will be used in your specific application
- Zero false positives on the built-in fixture library does not guarantee zero false positives on your production traffic
- New attack techniques not covered by the fixture library require new patterns to detect
- NODA's LLM Dashboard benchmarks model behavior against known attacks — it cannot predict how a model will behave against novel, zero-day injection techniques

Use NODA as part of a defense-in-depth strategy: it's a powerful red-team and detection tool, not a complete security solution.

---

## Additional Documentation

| Guide | Description |
|-------|-------------|
| [FAQ](./FAQ.md) | Frequently Asked Questions |
| [Testing Checklist](../app/testing-checklist.md) | Human-readable testing checklists |
| [Developer Guide](../app/developer-guide.md) | Developer documentation |
| [LLM Provider Guide](./LLM-PROVIDER-GUIDE.md) | LLM provider setup instructions |
| [Multimodal Testing](./multimodal-testing-guide.md) | Image/audio testing guide |

Each NODA module includes built-in onboarding guides and contextual help accessible from the module header.

---

*For technical architecture details, see `../../internal/TECHNICAL_OVERVIEW.md`. For deployment instructions, see `../../internal/DEPLOYMENT_GUIDE.md`.*

---

## License

UNLICENSED / Private
