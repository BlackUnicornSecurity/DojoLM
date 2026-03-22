<div align="center">

# DojoLM

### LLM Red Teaming & Security Research Platform

[![Tests](https://img.shields.io/badge/tests-5%2C771%20passing-brightgreen?style=flat-square)]()
[![Patterns](https://img.shields.io/badge/patterns-534-blue?style=flat-square)]()
[![Fixtures](https://img.shields.io/badge/attack%20fixtures-2%2C375-orange?style=flat-square)]()
[![License](https://img.shields.io/badge/license-Research%20Only-red?style=flat-square)](LICENSE)

**Scan. Test. Red Team. Harden.**

[Getting Started](docs/user/GETTING_STARTED.md) · [Platform Guide](docs/user/PLATFORM_GUIDE.md) · [FAQ](docs/user/FAQ.md) · [Contributing](github/CONTRIBUTING.md)

</div>

---

DojoLM is an open-source platform for testing LLM resilience against prompt injection, jailbreaks, and adversarial attacks. It combines a high-performance regex scanner engine with a 15-module web interface for red teaming, compliance auditing, and continuous security testing.

> **Research use only.** See [LICENSE](LICENSE) for permitted use.

## What's Inside

```
534 detection patterns    ·    27 scanner modules    ·    6 heuristic detectors
2,375 attack fixtures     ·    19 LLM providers      ·    8 compliance frameworks
```

## Quick Start

```bash
git clone https://github.com/BlackUnicornSecurity/DojoLM.git
cd DojoLM && npm install

# Run the scanner
npm start --workspace=packages/bu-tpi    # API on :8089

# Run the web UI
npm run dev:web                           # UI on :42001

# Run tests
npm test                                  # 5,771 tests, 100% pass rate
```

**Scan something:**

```bash
curl "http://localhost:8089/api/scan?text=ignore%20all%20previous%20instructions"
```
```json
{ "verdict": "BLOCK", "severity": "CRITICAL", "findings": [...], "elapsed": "3ms" }
```

## Platform Modules

<table>
<tr>
<td width="25%" valign="top">

### Attack
**Haiku Scanner** — Real-time scanning with 534 patterns<br>
**Armory** — 2,375 attack fixtures across 30 categories<br>
**LLM Jutsu** — Testing command center<br>
**LLM Dashboard** — Multi-provider benchmarking

</td>
<td width="25%" valign="top">

### Defense
**Hattori Guard** — 4-mode input/output protection<br>
**Bushido Book** — Compliance (BAISS, NIST AI RMF, ISO 42001)<br>
**Kotoba** — Prompt hardening optimizer

</td>
<td width="25%" valign="top">

### Red Team
**Sengoku** — Continuous campaign orchestration<br>
**Time Chamber** — Temporal attack simulation<br>
**Atemi Lab** — Adversarial testing with MCP

</td>
<td width="25%" valign="top">

### Analysis
**The Kumite** — Arena battles & threat intelligence<br>
**Amaterasu DNA** — Attack lineage mapping<br>
**Ronin Hub** — Researcher platform

</td>
</tr>
</table>

## Scanner Engine

```
Input → NFKC Normalize → Strip Zero-Width → Map Homoglyphs → Match 534 Patterns → Verdict
```

| Category | Examples |
|----------|----------|
| Prompt Injection | 64 patterns — role hijacking, instruction override, context manipulation |
| Jailbreak / DAN | 120+ patterns — persona exploits, capability unlocking |
| Agent Security | 45 patterns — tool poisoning, capability spoofing |
| Multilingual | 80+ patterns — attacks in 10+ languages |
| Media Injection | 60+ patterns — EXIF, PNG chunks, SVG payloads |
| Encoding / Evasion | 30+ patterns — base64, ROT, invisible unicode |

## Architecture

```
packages/
├── bu-tpi/            Core scanner engine — patterns, modules, fixtures, heuristics
├── dojolm-web/        Next.js 16 web interface — 15 modules, API routes
├── dojolm-scanner/    Lightweight wrapper for web integration
└── dojolm-mcp/        Adversarial MCP server for agent security testing
```

## Guard Modes

Hattori Guard provides four protection levels:

| Mode | Behavior |
|------|----------|
| **Shinobi** | Stealth — log only, no blocking |
| **Samurai** | Defend inputs — scan and block inbound prompts |
| **Sensei** | Defend outputs — scan and block LLM responses |
| **Hattori** | Full protection — block both directions |

## LLM Providers

Supports 19 providers including OpenAI, Anthropic, Google, Mistral, Cohere, AWS Bedrock, Azure, Groq, Together AI, Fireworks, Replicate, Perplexity, DeepSeek, xAI, AI21, Ollama, LM Studio, vLLM, and llama.cpp.

## Documentation

| | |
|---|---|
| **[Getting Started](docs/user/GETTING_STARTED.md)** | Installation, first scan, module walkthrough |
| **[Platform Guide](docs/user/PLATFORM_GUIDE.md)** | Complete module reference |
| **[LLM Provider Guide](docs/user/LLM-PROVIDER-GUIDE.md)** | Provider setup and configuration |
| **[FAQ](docs/user/FAQ.md)** | Common questions and troubleshooting |
| **[Contributing](github/CONTRIBUTING.md)** | Development setup and contribution guidelines |
| **[Architecture](docs/ARCHITECTURE.md)** | System design and technical overview |

## License

**DojoLM Research-Only License** — [Read full license](LICENSE)

Permitted for academic research, education, personal security testing, and individual bug bounty research.
Not permitted for commercial use, enterprise deployment, or commercial bug bounty operations.

---

<div align="center">
<sub>Built by <a href="https://blackunicorn.tech">Black Unicorn Security</a></sub>
</div>
