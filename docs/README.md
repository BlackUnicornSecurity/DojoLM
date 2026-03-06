# NODA Platform Documentation

**Version:** 4.0 (NODA-3)
**Last Updated:** 2026-03-06

---

## Quick Navigation

### By Audience

| Audience | Documents |
|----------|-----------|
| **Users** | [Platform Guide](user/PLATFORM_GUIDE.md), [FAQ](user/FAQ.md) |
| **Developers** | [Architecture](ARCHITECTURE.md), [API Reference](API_REFERENCE.md), [Contributing](../github/CONTRIBUTING.md) |
| **Security Auditors** | [Testing Checklist](app/testing-checklist.md), [Audit Guide](app/audit-report-guide.md) |
| **Compliance** | [ISO 42001](compliance/iso-42001/) |

---

## NODA Module Reference

| Module | Description |
|--------|-------------|
| **NODA Dashboard** | Homepage with configurable widgets |
| **Haiku Scanner** | Real-time text scanning |
| **Armory** | Fixture browser + test payloads |
| **Bushido Book** | Compliance center (Overview, Coverage, Gap Matrix, Audit Trail, Checklists) |
| **LLM Dashboard** | Multi-provider LLM benchmarking with SSE streaming, executive summary, SARIF export |
| **Atemi Lab** | Adversarial testing with MCP connector, skills library, session recording |
| **The Kumite** | Strategic hub: SAGE, Arena, Mitsuke threat feed |
| **Amaterasu DNA** | Attack DNA analysis: family tree, clusters, mutation timeline, Black Box Analysis |
| **Hattori Guard** | Input/output protection with 4 modes: Shinobi, Samurai, Sensei, Hattori |
| **Ronin Hub** | Bug bounty researcher platform with programs, submissions, CVE tracking |
| **LLM Jutsu** | LLM testing command center with model cards, aggregation, comparison |
| **Admin** | System health, API keys, export settings, scanner config |

---

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── ARCHITECTURE.md              # System architecture overview
├── API_REFERENCE.md             # Unified API documentation
├── MIGRATION.md                 # Monorepo migration guide
├── MAINTENANCE.md               # Documentation maintenance process
├── STYLE-GUIDE.md               # Documentation style guide
├── NEXTJS-MIGRATION-PLAN.md     # Next.js migration planning
│
├── user/                        # User-facing documentation
│   ├── README.md                # Redirect to PLATFORM_GUIDE
│   ├── PLATFORM_GUIDE.md        # Complete user guide
│   ├── FAQ.md                   # Frequently asked questions
│   ├── LLM-PROVIDER-GUIDE.md    # LLM provider setup
│   ├── green-ai-guidelines.md   # Environmental guidelines
│   └── multimodal-testing-guide.md
│
├── app/                         # Application documentation
│   ├── README.md                # Testing docs entry point
│   ├── developer-guide.md       # Developer workflow
│   ├── testing-checklist.md     # 639 test cases
│   ├── audit-report-guide.md    # Audit requirements
│   ├── improvement-tracker.md   # Scanner improvements
│   └── testing-results/         # Test evidence storage
│
└── compliance/                  # Compliance documentation
    ├── P8-STRIDE-THREAT-MODEL.md
    └── iso-42001/               # ISO 42001 documentation
        ├── ai-management-policy.md
        ├── ai-system-inventory.md
        ├── incident-response-procedure.md
        ├── internal-audit-checklist.md
        └── risk-assessment-methodology.md
```

---

## Core Documentation

### Architecture & APIs

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, package dependencies, data flow |
| [API_REFERENCE.md](API_REFERENCE.md) | Unified API reference for all packages |
| [MIGRATION.md](MIGRATION.md) | Monorepo migration guide and breaking changes |

### Processes

| Document | Description |
|----------|-------------|
| [MAINTENANCE.md](MAINTENANCE.md) | Documentation maintenance procedures |
| [STYLE-GUIDE.md](STYLE-GUIDE.md) | Writing style and formatting standards |

---

## User Documentation

| Document | Description |
|----------|-------------|
| [PLATFORM_GUIDE.md](user/PLATFORM_GUIDE.md) | Complete user documentation for NODA Platform |
| [FAQ.md](user/FAQ.md) | Frequently asked questions |
| [LLM-PROVIDER-GUIDE.md](user/LLM-PROVIDER-GUIDE.md) | Setting up LLM providers |
| [multimodal-testing-guide.md](user/multimodal-testing-guide.md) | Testing multimodal attacks |
| [green-ai-guidelines.md](user/green-ai-guidelines.md) | Environmental considerations |

---

## Developer Documentation

| Document | Description |
|----------|-------------|
| [Contributing](../github/CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](../github/CHANGELOG.md) | Version history |
| [developer-guide.md](app/developer-guide.md) | Development workflow |

### Package READMEs

| Package | Description |
|---------|-------------|
| [bu-tpi](../packages/bu-tpi/README.md) | Core scanner engine |
| [dojolm-scanner](../packages/dojolm-scanner/README.md) | Enhanced scanner wrapper |
| [dojolm-web](../packages/dojolm-web/README.md) | Next.js web application |
| [dojolm-mcp](../packages/dojolm-mcp/README.md) | MCP server |
| [bmad-cybersec](../packages/bmad-cybersec/README.md) | Multi-agent framework |

---

## Security & Compliance

### Testing

| Document | Description |
|----------|-------------|
| [testing-checklist.md](app/testing-checklist.md) | 639 test cases across 11 areas |
| [audit-report-guide.md](app/audit-report-guide.md) | Laboratory-grade report requirements |
| [improvement-tracker.md](app/improvement-tracker.md) | Scanner improvement recommendations |

### Compliance Frameworks

| Document | Description |
|----------|-------------|
| [ISO 42001](compliance/iso-42001/) | AI management system documentation |
| [STRIDE Threat Model](compliance/P8-STRIDE-THREAT-MODEL.md) | Threat modeling documentation |

---

## Quick Links

### Getting Started

1. [Platform Guide](user/PLATFORM_GUIDE.md) — Start here
2. [Architecture](ARCHITECTURE.md) — Understand the system
3. [API Reference](API_REFERENCE.md) — Use the APIs

### Contributing

1. [Contributing Guide](../github/CONTRIBUTING.md) — Before you start
2. [Style Guide](STYLE-GUIDE.md) — Writing standards
3. [Maintenance](MAINTENANCE.md) — Update procedures

### Reference

- [TPI Story Coverage](../github/CONTRIBUTING.md#tpi-story-coverage-reference)
- [Pattern Groups](API_REFERENCE.md#pattern-groups)
- [Engine List](API_REFERENCE.md#available-engines)

---

## Documentation Metrics

| Metric | Value |
|--------|-------|
| User documents | 5 |
| Developer documents | 8 |
| Compliance documents | 7 |
| Package READMEs | 5 |
| Total markdown files | 25+ |

---

## Contributing to Documentation

See [MAINTENANCE.md](MAINTENANCE.md) for:
- When to update documentation
- Documentation definition of done
- Update workflow
- Quality requirements

---

*For questions not covered in the documentation, please [open a GitHub Discussion](https://github.com/dojolm/dojolm/discussions).*
