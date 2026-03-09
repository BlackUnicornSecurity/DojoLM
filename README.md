# NODA — LLM Red Teaming & Security Testing Platform

<div align="center">

[![Version](https://img.shields.io/badge/version-5.0_KASHIWA-blue.svg)](github/CHANGELOG.md)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Comprehensive prompt injection detection and LLM security testing based on the CrowdStrike TPI Taxonomy**

[Quick Start](#-quick-start) · [Features](#-features) · [Documentation](#-documentation) · [Changelog](github/CHANGELOG.md)

</div>

---

## Overview

NODA is a full-stack platform for testing, evaluating, and benchmarking LLM security defenses. Built with a modern tech stack and a refined dark UI (KASHIWA design system), it provides comprehensive security testing capabilities across 12 integrated modules.

### What's New in KASHIWA (v5.0)

- **Complete Visual Overhaul:** Near-true-black design with Torii Vermillion accents
- **Bento-Box Dashboard:** Flexible 12-column widget grid
- **Plus Jakarta Sans:** Modern typography with refined hierarchy
- **Amaterasu DNA Upgrade:** Three-tier intelligence system with external threat feeds
- **Arena Rework:** Gamified AI model combat system
- **Enhanced Security:** Hardened authentication and rate limiting

### Key Capabilities

- **505+ detection patterns** across 47 pattern groups
- **1,544 attack fixtures** across 30 categories
- **6 heuristic detectors** for advanced attack detection
- **100% OWASP LLM Top 10 coverage**
- **MITRE ATLAS** and **NIST AI RMF** alignment
- **Multi-provider LLM testing** (OpenAI, Anthropic, Ollama, and more)

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

### Run the Platform

```bash
# Terminal 1: Start scanner API (port 8089)
npm start --workspace=packages/bu-tpi

# Terminal 2: Start web UI (port 3000)
npm run dev:web
```

Access the platform at `http://localhost:3000`

### Quick API Test

```bash
# Scan text for prompt injection
curl -X POST http://localhost:8089/api/scan \
  -H "Content-Type: application/json" \
  -d '{"text": "Ignore previous instructions"}'
```

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

| Module | Description | Status |
|--------|-------------|--------|
| **Haiku Scanner** | Real-time text scanning with 505+ patterns | ✅ |
| **Armory** | Browse and test 1,544+ attack fixtures | ✅ |
| **Bushido Book** | Compliance center with 8 frameworks | ✅ |
| **LLM Dashboard** | Multi-provider benchmarking with SSE streaming | ✅ |
| **Atemi Lab** | Adversarial testing with MCP integration | ✅ |
| **The Kumite** | Strategic analysis with Arena battles | 🔄 |
| **Amaterasu DNA** | Attack lineage with 3-tier intelligence | 🔄 |
| **Hattori Guard** | Input/output protection (4 modes) | ✅ |
| **Ronin Hub** | Bug bounty researcher platform | ✅ |
| **LLM Jutsu** | Testing command center | ✅ |
| **Admin Panel** | Configuration and management | ✅ |

---

## 📦 Packages

### Core Packages

| Package | Description | Port |
|---------|-------------|------|
| [`packages/bu-tpi`](packages/bu-tpi/README.md) | Core scanner engine with 505+ patterns | 8089 |
| [`packages/dojolm-scanner`](packages/dojolm-scanner/README.md) | Enhanced scanner with engine filtering | - |
| [`packages/dojolm-web`](packages/dojolm-web/README.md) | Next.js 15 web application | 3000 |
| [`packages/dojolm-mcp`](packages/dojolm-mcp/README.md) | Model Context Protocol server | - |

### Framework

| Package | Description |
|---------|-------------|
| [`packages/bmad-cybersec`](packages/bmad-cybersec/README.md) | Multi-agent cybersecurity operations framework |

### Dependencies

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
│   ├── dojolm-scanner/         # Enhanced scanner wrapper
│   ├── dojolm-web/             # Next.js 15 application
│   ├── dojolm-mcp/             # MCP server
│   └── bmad-cybersec/          # Multi-agent framework
├── docs/                       # User documentation
├── team/                       # Team documentation
│   ├── dev/                    # Development docs
│   ├── ops/                    # Operations docs
│   ├── security/               # Security docs
│   └── testing/                # Testing docs
└── github/                     # GitHub templates
```

---

## 📚 Documentation

### User Documentation

| Document | Description |
|----------|-------------|
| [Platform Guide](docs/user/PLATFORM_GUIDE.md) | Complete user documentation |
| [Getting Started](docs/user/GETTING_STARTED.md) | Quick start guide |
| [FAQ](docs/user/FAQ.md) | Frequently asked questions |
| [LLM Provider Guide](docs/user/LLM-PROVIDER-GUIDE.md) | Provider setup instructions |
| [API Reference](docs/user/API-REFERENCE.md) | API documentation |

### Developer Documentation

| Document | Description |
|----------|-------------|
| [Team Docs](team/README.md) | Internal documentation index |
| [Architecture](team/dev/architecture/SYSTEM-ARCHITECTURE.md) | System architecture |
| [Development Guide](team/dev/guides/GETTING-STARTED.md) | Developer setup |
| [Contributing](github/CONTRIBUTING.md) | Contribution guidelines |

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
- Follow [code standards](team/dev/guides/CODE-STANDARDS.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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

KASHIWA Update — March 2026

</div>
