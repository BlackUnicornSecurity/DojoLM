<div align="center">

<img src="assets/DojoLM- Text.jpg" alt="DojoLM Logo" width="400">

</div>

# DojoLM 🥋

<div align="center">

**LLM Red Teaming and Security Testing Platform**

🥋 Adversarial Testing 🛡️ TPI Taxonomy 🕵️ Prompt Injection Detection 🔒 AI Safety

</div>

<div align="center">

**Workspace Structure:** This repository contains specialized workspaces for LLM security testing:

- **[packages/bu-tpi](packages/bu-tpi/)** — Core scanner with 505 detection patterns
- **[packages/dojolm-scanner](packages/dojolm-scanner/)** — Web-friendly API wrapper for bu-tpi
- **[packages/dojolm-web](packages/dojolm-web/)** — Next.js web interface
- **[packages/bmad-cybersec](packages/bmad-cybersec/)** — Security automation tools

</div>

<div align="center">

<!-- Version & Compatibility -->
[![Version: 1.0.0](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![ES Module](https://img.shields.io/badge/module-ES%20Module-yellow.svg)](https://nodejs.org/api/esm.html)

<!-- LLM Provider Support -->
### 🤖 LLM Provider Support
[![Claude](https://img.shields.io/badge/LLM-Claude-purple.svg)](https://www.anthropic.com)
[![OpenAI](https://img.shields.io/badge/LLM-OpenAI-green.svg)](https://openai.com)
[![Ollama](https://img.shields.io/badge/LLM-Ollama-blue.svg)](https://ollama.com)

<!-- License & Status -->
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Research](https://img.shields.io/badge/status-Research%20Project-orange.svg)]()

<!-- Security & Compliance Badges -->
### 🛡️ Security Coverage
[![TPI-CrowdStrike](https://img.shields.io/badge/TPI--CrowdStrike-Compliant-brightgreen.svg)](packages/bu-tpi/README.md)
[![OWASP LLM](https://img.shields.io/badge/OWASP%20LLM-Top%2010-brightgreen.svg)](packages/bu-tpi/README.md)
[![300+ Test Cases](https://img.shields.io/badge/tests-300%2B-brightgreen.svg)](packages/bu-tpi/fixtures/)

<!-- Testing Coverage -->
### ✅ Testing & Quality
[![7,117+ Tests](https://img.shields.io/badge/tests-7117%2B-brightgreen.svg)](packages/bu-tpi/)
[![Zero Regressions](https://img.shields.io/badge/regressions-0-success.svg)]()

</div>

---

## 🧠 What is DojoLM?

**DojoLM** is a comprehensive LLM red teaming and security testing platform. The name combines "Dojo" (a place for immersive training and practice in martial arts) with "LM" (Language Models), representing a focused environment for testing, training, and hardening AI systems against adversarial attacks.

The platform provides:
- **TPI Taxonomy Coverage** — Complete implementation of CrowdStrike's Taxonomy of Prompt Injection
- **Interactive Test Lab** — Web-based scanner for real-time injection detection
- **1,545 Attack Fixtures** — Curated test cases across 31 categories
- **505+ Detection Patterns** — Regex and heuristic-based detection engine across 47 groups

---

## 🚀 Quick Start

### Install

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install
```

### Start the Test Lab

```bash
npm start --workspace=packages/bu-tpi
```

The scanner will be available at **http://localhost:8089**

---

## 📦 Modules

### TPI Security Scanner (`packages/bu-tpi`)

Prompt injection detection toolkit based on the **CrowdStrike Taxonomy of Prompt Injection (TPI)**.

```
packages/bu-tpi/
├── fixtures/        # 1,544 attack artifacts (test cases)
├── src/
│   ├── scanner.ts   # Detection engine — 505+ patterns, 47 groups
│   ├── serve.ts     # HTTP server with API endpoints
│   ├── types.ts     # TypeScript type definitions
│   └── generate-fixtures.ts  # Fixture generator
└── tools/           # Test suites
```

**Features:**
- Zero runtime dependencies
- Pure TypeScript
- 1,545 fixture files across 31 categories
- API endpoints for scanning, fixtures, and test execution

---

## 🛡️ TPI Coverage

| Story | Name | Coverage |
|-------|------|----------|
| TPI-PRE-4 | Settings.json Write Protection | ✅ Patterns + Fixtures |
| TPI-02 | WebFetch Output Injection | ✅ Patterns + Fixtures |
| TPI-03 | Agent-to-Agent Output Validation | ✅ Patterns + Fixtures |
| TPI-04 | Context Window Injection | ✅ Patterns + Fixtures |
| TPI-05 | WebSearch Output Validation | ✅ Patterns + Fixtures |
| TPI-06 | Social Engineering Detection | ✅ Patterns + Fixtures |
| TPI-07 | Trust & Rapport Exploitation | ✅ Patterns + Fixtures |
| TPI-08 | Emotional Manipulation | ✅ Patterns + Fixtures |
| TPI-09 | Code-Format Injection | ✅ Patterns + Fixtures |
| TPI-10 | Character-Level Encoding | ✅ Patterns + Decoders |
| TPI-11 | Context Overload | ✅ Patterns + Heuristics |
| TPI-12 | Synonym Substitution | ✅ Patterns + Fixtures |
| TPI-13 | Payload Fragmentation | ✅ Patterns + Fixtures |
| TPI-14 | Control Tokens & Boundaries | ✅ Patterns + Fixtures |
| TPI-15 | Multilingual Injection | ✅ 40 patterns (10 langs) |
| TPI-17 | Whitespace & Formatting Evasion | ✅ Patterns + Fixtures |
| TPI-18 | Image Metadata Injection | ✅ Patterns + Fixtures |
| TPI-19 | Format Mismatch / Polyglots | ✅ Patterns + Binary Analysis |
| TPI-20 | Audio/Media Metadata | ✅ Patterns + Fixtures |
| TPI-21 | Untrusted Source Indicators | ✅ Patterns + Fixtures |

---

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [Platform Guide](docs/user/PLATFORM_GUIDE.md) | Complete user documentation |
| [FAQ](docs/user/FAQ.md) | Frequently Asked Questions |
| [Scanner README](packages/bu-tpi/README.md) | Full scanner documentation |
| [API Reference](packages/bu-tpi/README.md#api-reference) | All API endpoints |
| [Testing Guide](packages/bu-tpi/README.md#testing) | Test suite documentation |
| [Migration Guide](docs/MIGRATION.md) | Monorepo migration info |

---

## 🔧 Requirements

- [Node.js](https://nodejs.org) 20+
- [npm](https://www.npmjs.com) 10+
- [TypeScript](https://www.typescriptlang.org) 5.7+

---

## 📊 Key Statistics

| Metric | Value |
|--------|-------|
| **Test Fixtures** | 1,545 |
| **Detection Patterns** | 505+ |
| **Pattern Groups** | 47 |
| **Test Files** | 8+ |
| **Passing Tests** | 7,117+ |
| **TPI Stories Covered** | 21/21 |

---

## 🏛️ License

**DojoLM** is released under the [MIT License](LICENSE).

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.

---

<div align="center">

**Built with ❤️ for AI Security Research**

*DojoLM extends TPI research with practical detection tools and comprehensive testing infrastructure.*

**⭐ Star us on GitHub — Join the DojoLM community!**

</div>
