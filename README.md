# NODA — LLM Red Teaming & Security Testing Platform

<div align="center">

[![Version](https://img.shields.io/badge/version-4.0-blue.svg)](github/CHANGELOG.md)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Comprehensive prompt injection detection and LLM security testing based on the CrowdStrike TPI Taxonomy**

[Quick Start](#-quick-start) · [Features](#-features) · [Packages](#-packages) · [Documentation](#-documentation) · [Contributing](github/CONTRIBUTING.md)

</div>

---

## Overview

NODA is a full-stack platform for testing, evaluating, and benchmarking LLM security defenses. It uses a unified sidebar with 12 modules (Haiku Scanner, Armory, Bushido Book, LLM Dashboard, Atemi Lab, The Kumite, Amaterasu DNA, Hattori Guard, Ronin Hub, LLM Jutsu, and Admin). It provides:

- **505+ detection patterns** across 47 pattern groups
- **1,544 attack fixtures** across 30 categories
- **6 heuristic detectors** for advanced attack detection
- **100% OWASP LLM Top 10 coverage**
- **MITRE ATLAS** and **NIST AI RMF** alignment

The platform detects prompt injection attacks including:
- System override and role hijacking
- Jailbreak and DAN patterns
- Multilingual injection attempts
- Encoded payloads (Base64, ROT13, etc.)
- Hidden Unicode and homoglyph attacks
- Social engineering manipulation
- Agent output manipulation
- Supply chain and RAG poisoning

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/dojolm/dojolm.git
cd dojolm

# Install dependencies
npm install
```

### Run the Scanner API

```bash
# Start scanner server (port 8089)
npm start --workspace=packages/bu-tpi
```

### Run the Web UI

```bash
# Start Next.js development server (port 3000)
npm run dev:web
```

### Quick Test

```bash
# Scan text for prompt injection
curl "http://localhost:8089/api/scan?text=Ignore%20previous%20instructions"
```

**Scanner API:** `http://localhost:8089`
**Web UI:** `http://localhost:3000`

---

## ✨ Features

### Scanner Engine

| Feature | Details |
|---------|---------|
| **Pattern Detection** | 505+ regex patterns across 47 groups |
| **Heuristic Detectors** | Base64, HTML injection, Unicode, encoding, context overload |
| **Text Normalization** | NFKC, zero-width stripping, homoglyph mapping |
| **Verdict System** | BLOCK / WARN / ALLOW with severity levels |

### Attack Categories

| Category | TPI Stories | Examples |
|----------|-------------|----------|
| Prompt Injection | TPI-01 | System override, role hijacking |
| Jailbreak | TPI-01 | DAN, developer mode, unrestricted AI |
| Encoded Payloads | TPI-10/11/13/17 | Base64, ROT13, acrostic, whitespace |
| Multilingual | TPI-15 | 10+ languages |
| Social Engineering | TPI-06/07/08 | Authority, urgency, flattery |
| Media Injection | TPI-18/19/20 | EXIF, ID3, SVG, PNG metadata |
| Agent Security | TPI-03 | Fake tool calls, privilege escalation |
| Supply Chain | TPI-21 | Dependency poisoning, RAG attacks |

### Web Interface (NODA Modules)

- **Haiku Scanner** — Real-time text scanning with 505+ patterns
- **Armory** — Browse and test 1,544+ attack fixtures
- **Bushido Book** — Compliance center with 8 frameworks including BAISS
- **LLM Dashboard** — Multi-provider benchmarking with SSE streaming
- **Atemi Lab** — Adversarial testing with MCP and skills library
- **The Kumite** — Strategic analysis (SAGE, Arena, Mitsuke)
- **Amaterasu DNA** — Attack lineage analysis with Black Box Analysis
- **Hattori Guard** — Input/output protection (4 modes)
- **Ronin Hub** — Bug bounty researcher platform
- **LLM Jutsu** — Testing command center

---

## 📦 Packages

This is a monorepo containing multiple packages:

### Core Packages

| Package | Description | Port |
|---------|-------------|------|
| [`packages/bu-tpi`](packages/bu-tpi/README.md) | Core scanner engine with 505+ patterns | 8089 |
| [`packages/dojolm-scanner`](packages/dojolm-scanner/README.md) | Enhanced scanner with engine filtering | - |
| [`packages/dojolm-web`](packages/dojolm-web/README.md) | Next.js web application | 3000 |
| [`packages/dojolm-mcp`](packages/dojolm-mcp/README.md) | Model Context Protocol server | - |

### Framework

| Package | Description |
|---------|-------------|
| [`packages/bmad-cybersec`](packages/bmad-cybersec/README.md) | Multi-agent cybersecurity operations framework |

### Package Dependencies

```
dojolm-web ──► dojolm-scanner ──► bu-tpi
dojolm-mcp ─────────────────────► bu-tpi
bmad-cybersec ──────────────────► bu-tpi
```

---

## 🏗️ Architecture

```
dojolm/
├── packages/
│   ├── bu-tpi/                 # Core scanner (TypeScript, zero deps)
│   │   ├── src/
│   │   │   ├── scanner.ts      # Detection engine
│   │   │   ├── serve.ts        # HTTP server
│   │   │   └── types.ts        # Type definitions
│   │   └── fixtures/           # 1,544 attack artifacts
│   ├── dojolm-scanner/         # Enhanced scanner wrapper
│   ├── dojolm-web/             # Next.js application
│   ├── dojolm-mcp/             # MCP server for AI tools
│   └── bmad-cybersec/          # Multi-agent framework
├── docs/                       # Documentation
│   ├── user/                   # User-facing docs
│   ├── app/                    # App-specific docs
│   └── compliance/             # Compliance documentation
└── github/                     # GitHub templates
```

---

## 📚 Documentation

### User Documentation

| Document | Description |
|----------|-------------|
| [Platform Guide](docs/user/PLATFORM_GUIDE.md) | Complete user documentation |
| [FAQ](docs/user/FAQ.md) | Frequently asked questions |
| [LLM Provider Guide](docs/user/LLM-PROVIDER-GUIDE.md) | Provider setup instructions |
| [Multimodal Testing](docs/user/multimodal-testing-guide.md) | Image/audio testing |

### Developer Documentation

| Document | Description |
|----------|-------------|
| [Contributing](github/CONTRIBUTING.md) | Contribution guidelines |
| [Style Guide](docs/STYLE-GUIDE.md) | Documentation style guide |
| [Maintenance](docs/MAINTENANCE.md) | Documentation maintenance process |

### Compliance

| Document | Description |
|----------|-------------|
| [ISO 42001](docs/compliance/iso-42001/) | AI management system documentation |

---

## 🔧 Development

### Available Scripts

```bash
# Build all packages
npm run build

# Run tests across all packages
npm test

# Lint all packages
npm run lint

# Type check all packages
npm run type-check

# Security audit
npm run security:scan

# Generate SBOM
npm run sbom:generate
```

### Workspace Commands

```bash
# Run command in specific workspace
npm run <script> --workspace=packages/<package-name>

# Examples
npm test --workspace=packages/bu-tpi
npm run dev --workspace=packages/dojolm-web
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](github/CONTRIBUTING.md) for guidelines.

Key points:
- All PRs must include documentation updates
- Pattern contributions require corresponding test fixtures
- Run `npm run verify:docs` before submitting

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Individual packages may have additional license terms:

| Package | License |
|---------|---------|
| bu-tpi | UNLICENSED (source-available) |
| dojolm-scanner | MIT |
| dojolm-web | MIT |
| dojolm-mcp | MIT |
| bmad-cybersec | MIT |

---

## 🔗 Links

- [Changelog](github/CHANGELOG.md)
- [Issues](https://github.com/dojolm/dojolm/issues)
- [Repository](https://github.com/dojolm/dojolm)

---

<div align="center">

**Built by the NODA Team**

</div>
