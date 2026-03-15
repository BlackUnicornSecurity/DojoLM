# NODA — LLM Red Teaming & Security Testing Platform

**Current Version:** HAKONE Update (KASHIWA v5.0 Complete)

[![Tests](https://img.shields.io/badge/tests-3596%20passing-brightgreen.svg)]()
[![Build](https://img.shields.io/badge/build-clean-brightgreen.svg)]()
[![Security](https://img.shields.io/badge/security-0%20findings-brightgreen.svg)]()

> Production-ready pattern-based prompt injection detection

---

## Overview

NODA is a comprehensive LLM security testing platform:

- **534 regex patterns** across attack categories
- **2,375 attack fixtures** for testing
- **27 scanner modules** for specialized detection
- **15 modules** (12 existing + 3 new in HAKONE)
- **3,596 tests** with 100% pass rate
- **Multi-provider LLM testing** (15+ providers)

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
│   ├── bu-tpi/              # Core scanner (TypeScript)
│   │   ├── scanner.ts       # 534 patterns, 3,958 lines
│   │   ├── modules/         # 27 detection modules
│   │   ├── fixtures/        # 2,375 test cases
│   │   ├── sengoku/         # Continuous red teaming (NEW)
│   │   ├── timechamber/     # Temporal attacks (NEW)
│   │   ├── kotoba/          # Prompt optimizer (NEW)
│   │   ├── edgefuzz/        # Fuzzing engine (NEW)
│   │   ├── supplychain/     # Supply chain security (NEW)
│   │   └── webmcp/          # MCP attack vectors (NEW)
│   ├── dojolm-web/          # Next.js 15 application
│   ├── dojolm-scanner/      # Web scanner wrapper
│   ├── dojolm-mcp/          # MCP server
│   └── bmad-cybersec/       # Multi-agent framework
├── team/                    # Internal documentation
└── docs/                    # User documentation
```

---

## Current Status: HAKONE Update

**Active Development:** March 2026

### Completed (7/14 phases)

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Critical Bug Fixes (14 items) | ✅ Complete |
| 2 | UI Foundation (SAKURA polish) | ✅ Complete |
| 3 | Content Updates | ✅ Complete |
| 4 | Core UX Patterns | ✅ Complete |
| 5 | Navigation Restructure | ✅ Complete |
| 6 | LLM Dashboard | ✅ Complete |
| 7 | Bushido Book & Compliance | ✅ Complete |

### In Progress

| Phase | Description |
|-------|-------------|
| 8 | Library Views |
| 9 | Module Enhancements + WebMCP |
| 10 | New Modules (Sengoku, Time Chamber, Kotoba) |

**Quality Gates:**
- ✅ 3,596 tests passing
- ✅ Build clean
- ✅ Security scan: 0 findings

---

## Modules

### Attack (4 modules)
- **Haiku Scanner** — Real-time text scanning
- **Armory** — Attack fixture browser
- **LLM Jutsu** — Testing command center
- **LLM Dashboard** — Multi-provider benchmarking

### Defense (3 modules)
- **Hattori Guard** — Input/output protection
- **Bushido Book** — Compliance center
- **Kotoba** — Prompt optimizer (NEW)

### Red Team (3 modules)
- **Sengoku** — Continuous red teaming (NEW)
- **Time Chamber** — Temporal attacks (NEW)
- **Atemi Lab** — Adversarial testing

### Analysis (5 modules)
- **Strategic Hub** — Arena, Mitsuke
- **Amaterasu DNA** — Attack lineage
- **Ronin Hub** — Bug bounty platform

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
POST /api/scan
Content-Type: application/json

{ "text": "input to analyze" }
```

Response:
```json
{
  "verdict": "BLOCK",
  "severity": "CRITICAL",
  "findings": [...],
  "elapsed": 8
}
```

### Web API (Port 3000)

- `GET /api/llm/models` — List providers
- `POST /api/llm/execute` — Execute test
- `POST /api/llm/batch` — Batch testing
- `GET /api/compliance/frameworks` — Compliance

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
- 243 test files
- 3,596 tests passing
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
| User Guide | `docs/user/PLATFORM_GUIDE.md` |
| API Reference | `docs/user/API_REFERENCE.md` |
| Architecture | `team/dev/architecture/SYSTEM-ARCHITECTURE.md` |
| HAKONE Plan | `team/docs/Hakone.md` |

---

## Packages

| Package | Description | Port |
|---------|-------------|------|
| [bu-tpi](packages/bu-tpi/) | Core scanner | 8089 |
| [dojolm-web](packages/dojolm-web/) | Web UI | 3000 |
| [dojolm-scanner](packages/dojolm-scanner/) | Scanner wrapper | - |
| [dojolm-mcp](packages/dojolm-mcp/) | MCP server | - |
| [bmad-cybersec](packages/bmad-cybersec/) | Multi-agent framework | - |

---

## License

| Package | License |
|---------|---------|
| bu-tpi | UNLICENSED |
| dojolm-web | MIT |
| dojolm-scanner | MIT |
| dojolm-mcp | MIT |
| bmad-cybersec | MIT |

---

**NODA Team — March 2026**
