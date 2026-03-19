# DojoLM — LLM Red Teaming & Security Research Platform

**Current Version:** HAKONE (Complete)

[![Tests](https://img.shields.io/badge/tests-5771%20passing-brightgreen.svg)]()
[![Build](https://img.shields.io/badge/build-clean-brightgreen.svg)]()
[![Security](https://img.shields.io/badge/security-0%20findings-brightgreen.svg)]()

> Production-ready pattern-based prompt injection detection

---

## Overview

NODA is a comprehensive LLM security testing platform:

- **534 regex patterns** across 14 pattern groups
- **2,375 attack fixtures** for regression testing
- **27 scanner modules** for specialized detection
- **15 modules** for scanning, testing, compliance, and red teaming
- **5,771 tests** with 100% pass rate
- **19 LLM providers** supported (cloud and local)

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/dojolm/dojolm.git
cd dojolm

# Install dependencies
npm install

# Run tests (required: 100% pass)
npm test

# Start development servers
npm run dev:web          # Web UI (port 3000)
npm start --workspace=packages/bu-tpi  # Scanner API (port 8089)
```

---

## Architecture

```
dojolm/
├── packages/
│   ├── bu-tpi/              # Core scanner engine (TypeScript)
│   │   ├── scanner.ts       # 534 patterns, 6 heuristic detectors
│   │   ├── modules/         # 27 detection modules
│   │   ├── fixtures/        # 2,375 test cases
│   │   ├── sengoku/         # Continuous red teaming
│   │   ├── timechamber/     # Temporal attack simulation
│   │   ├── kotoba/          # Prompt optimizer
│   │   ├── edgefuzz/        # Fuzzing engine
│   │   ├── supplychain/     # Supply chain security
│   │   └── webmcp/          # MCP attack vectors
│   ├── dojolm-web/          # Next.js 16 application
│   ├── dojolm-scanner/      # Web scanner wrapper
│   └── dojolm-mcp/          # Adversarial MCP server
├── docs/                    # User documentation
│   ├── user/                # Guides, FAQ, API reference
│   └── compliance/          # ISO 42001 docs
└── github/                  # Contributing guide, changelog
```

---

## Modules

### Attack (4 modules)
- **Haiku Scanner** — Real-time text scanning with 534 patterns
- **Armory** — Browse 2,375 attack fixtures across 30 categories
- **LLM Jutsu** — Testing command center
- **LLM Dashboard** — Multi-provider benchmarking with belt rankings

### Defense (3 modules)
- **Hattori Guard** — Input/output protection (Shinobi, Samurai, Sensei, Hattori modes)
- **Bushido Book** — Compliance center (8 frameworks, BAISS v2.0)
- **Kotoba** — Prompt optimizer

### Red Team (3 modules)
- **Sengoku** — Continuous red teaming campaigns
- **Time Chamber** — Temporal attack simulation
- **Atemi Lab** — Adversarial testing with MCP integration

### Analysis (3 modules)
- **The Kumite** — Strategic analysis (SAGE, Arena battles, Mitsuke threat feed)
- **Amaterasu DNA** — Attack lineage and intelligence
- **Ronin Hub** — Bug bounty researcher platform

---

## Scanner Engine

### Detection Pipeline

```
Input → NFKC Normalization → Zero-Width Stripping
      → Homoglyph Mapping → Pattern Matching → Verdict
```

### Pattern Categories (534 total)

| Category | Count | Coverage |
|----------|-------|----------|
| PI_PATTERNS | 64 | Prompt injection |
| JB_PATTERNS | 120+ | Jailbreak/DAN |
| AGENT_PATTERNS | 45 | Agent attacks |
| MULTILINGUAL_PATTERNS | 80+ | 10+ languages |
| MEDIA_PATTERNS | 60+ | EXIF, PNG, SVG |
| WHITESPACE_PATTERNS | 30 | Invisible chars |

### Verdict System

| Verdict | Condition |
|---------|-----------|
| **BLOCK** | Any CRITICAL finding |
| **ALLOW** | No findings |

---

## API

### Scanner API (Port 8089)

```bash
# Scan text (GET-only API)
curl "http://localhost:8089/api/scan?text=ignore%20all%20previous%20instructions"
```

Response:
```json
{
  "verdict": "BLOCK",
  "severity": "CRITICAL",
  "findings": [...],
  "elapsed": "3ms"
}
```

### Web API (Port 3000)

- `POST /api/llm/execute` — Execute LLM test
- `POST /api/llm/batch` — Batch testing
- `GET /api/llm/models` — List providers
- `GET /api/compliance` — Compliance data
- `GET /api/admin/health` — System health

---

## Testing

```bash
# Run all tests
npm test

# Security scan
npm run security:scan

# Build
npm run build
```

**Metrics:**
- 5,771 tests passing (2,111 bu-tpi + 3,613 dojolm-web)
- 100% pass rate required

---

## Security Requirements

| ID | Requirement |
|----|-------------|
| SEC-G1 | All API routes use `withAuth()` |
| SEC-G2 | URL validation with SSRF protection |
| SEC-G3 | SafeCodeBlock for all payloads |
| SEC-G4 | AES-256-GCM credential encryption |
| SEC-G5 | Input sanitization |
| SEC-G6 | Credential redaction in logs |
| SEC-G7 | Entity encoding |
| SEC-G8 | `Object.hasOwn()` for hash lookups |
| SEC-G9 | Bounded regex quantifiers |
| SEC-G10 | Path traversal validation |
| SEC-G11 | Security scan 0 findings pre-commit |

---

## Documentation

| Document | Location |
|----------|----------|
| Platform Guide | [docs/user/PLATFORM_GUIDE.md](docs/user/PLATFORM_GUIDE.md) |
| Getting Started | [docs/user/GETTING_STARTED.md](docs/user/GETTING_STARTED.md) |
| API Reference | [docs/user/API_REFERENCE.md](docs/user/API_REFERENCE.md) |
| FAQ | [docs/user/FAQ.md](docs/user/FAQ.md) |
| LLM Providers | [docs/user/LLM-PROVIDER-GUIDE.md](docs/user/LLM-PROVIDER-GUIDE.md) |
| Contributing | [github/CONTRIBUTING.md](github/CONTRIBUTING.md) |

---

## Packages

| Package | Description | Port |
|---------|-------------|------|
| [bu-tpi](packages/bu-tpi/) | Core scanner engine | 8089 |
| [dojolm-web](packages/dojolm-web/) | Web UI (Next.js 16) | 3000 |
| [dojolm-scanner](packages/dojolm-scanner/) | Web scanner wrapper | - |
| [dojolm-mcp](packages/dojolm-mcp/) | Adversarial MCP server | - |

---

## License

DojoLM Research-Only License — See [LICENSE](LICENSE)

Permitted: Academic research, education, personal security testing.
Prohibited: Commercial use, enterprise use, bug bounty monetization.

---

**NODA Team — March 2026**
