# DojoLM Documentation Index

**Version:** 2.0  
**Last Updated:** 2026-03-30  
**Status:** Active

---

## Quick Navigation

| If you're looking for... | Go to... |
|-------------------------|----------|
| **Getting Started** | [docs/user/GETTING_STARTED.md](./user/GETTING_STARTED.md) |
| **Architecture Overview** | [docs/ARCHITECTURE.md](./ARCHITECTURE.md) |
| **API Reference** | [docs/user/API_REFERENCE.md](./user/API_REFERENCE.md) |
| **Current Implementation Status** | [docs/compliance/IMPLEMENTATION-AUDIT-REPORT.md](./compliance/IMPLEMENTATION-AUDIT-REPORT.md) |
| **User Guides by Module** | [docs/user/modules/](./user/modules/) |
| **ISO 42001 Compliance** | [docs/compliance/iso-42001/](./compliance/iso-42001/) |

---

## Documentation Structure

```
docs/
├── README.md                          # Documentation homepage
├── ARCHITECTURE.md                    # System architecture overview
├── API_REFERENCE.md                   # API documentation
├── MAINTENANCE.md                     # Maintenance procedures
├── MIGRATION.md                       # Migration guides
├── STYLE-GUIDE.md                     # Coding standards
├── DOCUMENTATION-INDEX.md             # This file
│
├── compliance/                        # Compliance documentation
│   ├── IMPLEMENTATION-AUDIT-REPORT.md # Latest audit results
│   ├── P8-STRIDE-THREAT-MODEL.md      # Security threat model
│   └── iso-42001/                     # ISO 42001 compliance docs
│       ├── ai-management-policy.md
│       ├── ai-system-inventory.md
│       ├── risk-assessment-methodology.md
│       ├── incident-response-procedure.md
│       └── internal-audit-checklist.md
│
├── user/                              # User-facing documentation
│   ├── GETTING_STARTED.md             # Onboarding guide
│   ├── PLATFORM_GUIDE.md              # Platform overview
│   ├── API_REFERENCE.md               # User API guide
│   ├── COMMON_WORKFLOWS.md            # Common tasks
│   ├── GLOSSARY.md                    # Terminology
│   ├── FAQ.md                         # Frequently asked questions
│   ├── TROUBLESHOOTING.md             # Problem solving
│   ├── LLM-PROVIDER-GUIDE.md          # LLM provider setup
│   ├── green-ai-guidelines.md         # Sustainability guide
│   ├── multimodal-testing-guide.md    # Multimodal testing
│   └── modules/                       # Module-specific guides
│       ├── DASHBOARD.md
│       ├── HAIKU_SCANNER.md
│       ├── ARMORY.md
│       ├── ATEMI_LAB.md
│       ├── BUSHIDO_BOOK.md
│       ├── HATTORI_GUARD.md
│       ├── KOTOBA.md
│       ├── LLM_DASHBOARD.md
│       ├── RONIN_HUB.md
│       ├── SENGOKU.md
│       ├── THE_KUMITE.md
│       └── ADMIN.md
│
├── app/                               # Application docs
│   ├── developer-guide.md
│   ├── audit-report-guide.md
│   ├── testing-checklist.md
│   ├── improvement-tracker.md
│   └── testing-results/               # Test results archive
│
└── archive/                           # Archived documents
    └── README.md
```

---

## Implementation Documentation

Internal planning/QA docs live in the maintainer's private `team/` tree (gitignored, not shipped).

---

## Key Documents by Purpose

### Getting Started
| Document | Purpose |
|----------|---------|
| [Project README](../README.md) | Project overview and quick start |
| [docs/user/GETTING_STARTED.md](./user/GETTING_STARTED.md) | Detailed onboarding |
| [docs/user/PLATFORM_GUIDE.md](./user/PLATFORM_GUIDE.md) | Platform overview |

### Architecture & Technical
| Document | Purpose |
|----------|---------|
| [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture |
| [docs/user/API_REFERENCE.md](./user/API_REFERENCE.md) | API documentation |

### Implementation Status
| Document | Purpose |
|----------|---------|
| [docs/compliance/IMPLEMENTATION-AUDIT-REPORT.md](./compliance/IMPLEMENTATION-AUDIT-REPORT.md) | Latest implementation audit |

### Compliance & Security
| Document | Purpose |
|----------|---------|
| [docs/compliance/iso-42001/ai-management-policy.md](./compliance/iso-42001/ai-management-policy.md) | AI management policy |
| [docs/compliance/iso-42001/ai-system-inventory.md](./compliance/iso-42001/ai-system-inventory.md) | System inventory |
| [docs/compliance/iso-42001/risk-assessment-methodology.md](./compliance/iso-42001/risk-assessment-methodology.md) | Risk assessment |
| [docs/compliance/iso-42001/incident-response-procedure.md](./compliance/iso-42001/incident-response-procedure.md) | Incident response |
| [docs/compliance/iso-42001/internal-audit-checklist.md](./compliance/iso-42001/internal-audit-checklist.md) | Audit checklist |
| [docs/compliance/P8-STRIDE-THREAT-MODEL.md](./compliance/P8-STRIDE-THREAT-MODEL.md) | Threat model |

### Module Documentation
| Module | User Guide |
|--------|------------|
| Dashboard | [DASHBOARD.md](./user/modules/DASHBOARD.md) |
| Haiku Scanner | [HAIKU_SCANNER.md](./user/modules/HAIKU_SCANNER.md) |
| Armory | [ARMORY.md](./user/modules/ARMORY.md) |
| Atemi Lab | [ATEMI_LAB.md](./user/modules/ATEMI_LAB.md) |
| Bushido Book | [BUSHIDO_BOOK.md](./user/modules/BUSHIDO_BOOK.md) |
| Hattori Guard | [HATTORI_GUARD.md](./user/modules/HATTORI_GUARD.md) |
| Kotoba | [KOTOBA.md](./user/modules/KOTOBA.md) |
| LLM Dashboard | [LLM_DASHBOARD.md](./user/modules/LLM_DASHBOARD.md) |
| Ronin Hub | [RONIN_HUB.md](./user/modules/RONIN_HUB.md) |
| Sengoku | [SENGOKU.md](./user/modules/SENGOKU.md) |
| The Kumite | [THE_KUMITE.md](./user/modules/THE_KUMITE.md) |
| Admin | [ADMIN.md](./user/modules/ADMIN.md) |

---

## Implementation Metrics (Verified 2026-06-12)

| Metric | Count | Status |
|--------|-------|--------|
| DojoV2 Controls | 18 | ✅ 100% Complete |
| Attack Fixtures | 5,281 | ✅ Verified |
| Fixture Categories | 40 | ✅ Verified |
| Detection Patterns | 544 | ✅ Verified |
| Pattern Groups | 49 | ✅ Verified |
| Specialized Detectors | 15 | ✅ Verified |
| LLM Provider Presets | 57 | ✅ Verified |
| Web Navigation Items | 23 (19 visible) | ✅ Verified |

---

## Document Version Reference

| Document | Version | Date | Status |
|----------|---------|------|--------|
| Implementation Audit Report | 1.0 | 2026-03-29 | Current |
| ISO 42001 AI Management Policy | 2.0 | 2026-03-30 | Active |
| ISO 42001 AI System Inventory | 2.0 | 2026-03-30 | Active |
| ISO 42001 Risk Assessment | 2.0 | 2026-03-30 | Active |
| ISO 42001 Incident Response | 2.0 | 2026-03-30 | Active |
| ISO 42001 Internal Audit Checklist | 3.0 | 2026-03-30 | Active |
| DojoV2 Implementation Plan | 2.0 | 2026-03-29 | Audited |
| DojoV2 Coverage Matrix | 4.0 | 2026-03-29 | Complete |

---

## Update History

| Date | Changes |
|------|---------|
| 2026-03-30 | v2.0 - Complete documentation audit and update. All DojoV2 controls verified 100% complete. Added cross-reference tables and implementation metrics. |
| 2026-03-24 | v1.0 - Initial documentation index |

---

## How to Update This Index

When adding new documentation:

1. Add the file path to the appropriate section in the structure diagram
2. Add an entry to the "Key Documents by Purpose" table if applicable
3. Update the version history at the bottom
4. Update metrics if affected by the new documentation

---

*For questions about this documentation structure, refer to the [docs/README.md](./README.md) or the project [README.md](../README.md).*
