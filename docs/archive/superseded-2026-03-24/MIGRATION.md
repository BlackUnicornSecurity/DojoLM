# Monorepo Migration Guide

**Last Updated:** 2026-03-06
**Version:** 3.0

---

## Overview

This repository has been restructured as **NODA Platform (DojoLM)** - an LLM red teaming and security testing platform containing multiple workspaces.

---

## Repository Structure

```
dojolm/
├── packages/
│   ├── bu-tpi/                 # TPI Scanner - test fixtures and detection
│   │   ├── fixtures/            # 1,544+ attack fixtures
│   │   ├── src/                 # Scanner, server, generator
│   │   │   ├── scanner.ts       # 505+ patterns, 47 groups
│   │   │   ├── serve.ts         # HTTP server (port 8089)
│   │   │   └── types.ts         # Type definitions
│   │   ├── tools/               # Test suites
│   │   └── package.json
│   ├── dojolm-scanner/         # Enhanced scanner package
│   │   └── src/
│   │       └── scanner.ts       # Engine filtering wrapper
│   ├── dojolm-web/             # Next.js web application (port 42001)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # React components
│   │   │   └── lib/             # Utilities
│   │   └── package.json
│   ├── dojolm-mcp/             # Model Context Protocol server
│   │   └── src/
│   │       ├── server.ts        # MCP server
│   │       └── attack-engine.ts # Attack scenarios
│   └── bmad-cybersec/          # MIT-licensed security framework
│       ├── framework/           # Core framework code
│       ├── validators/          # Security validators
│       └── package.json
├── docs/                       # Documentation
│   ├── user/                   # User-facing docs
│   ├── app/                    # App-specific docs
│   └── compliance/             # Compliance docs
├── github/                     # GitHub templates
├── package.json                # Monorepo root config
├── LICENSE                     # License information
└── README.md                   # Project overview
```

---

## Breaking Changes

### 1. Fixture Location Changed

**Old:** `/fixtures/` (root level)
**New:** `/packages/bu-tpi/fixtures/`

**Impact:** Any code referencing `fixtures/` from root must be updated.

**Fix:** Update paths to reference `packages/bu-tpi/fixtures/` or use the API:
```bash
# Old (no longer works)
./fixtures/social/authority-impersonation.txt

# New (use the API)
curl "http://localhost:8089/api/read-fixture?path=social/authority-impersonation.txt"
```

### 2. Source Code Location

**Old:** `/src/` (root level)
**New:** `/packages/bu-tpi/src/`

All TypeScript source files have moved to the package.

### 3. Test Scripts

**Old:** Run from root
```bash
npm test
npm start
```

**New:** Use workspace commands
```bash
# From root - runs in bu-tpi workspace
npm test --workspace=packages/bu-tpi
npm start --workspace=packages/bu-tpi

# Or use the convenience scripts
npm run dev:web      # Start web UI
npm run start:web    # Start web production

# Or cd into the package
cd packages/bu-tpi
npm test
npm start
```

### 4. TypeScript Path Mappings

The `@src/*` alias has been removed. Use new aliases:

```typescript
// Old (broken)
import { scanner } from '@src/scanner';

// New
import { scanner } from '@bu-tpi/scanner';
// or
import { scan } from '@dojolm/scanner';
```

---

## Package-Specific Information

### bu-tpi (UNLICENSED)

Haiku Scanner core engine for prompt injection testing:
- **1,544+ attack fixtures** across 30 categories
- **505+ detection patterns** across 47 groups
- **6 heuristic detectors** (Base64, HTML injection, Unicode, etc.)
- API server on port 8089
- 100% OWASP LLM Top 10 coverage

### dojolm-scanner (MIT)

Enhanced scanner package for web integration:
- Engine-level filtering API
- TypeScript declarations
- Zero runtime dependencies

### dojolm-web (MIT)

Next.js web application:
- 12-module interface with unified sidebar (Haiku Scanner, Armory, Bushido Book, LLM Dashboard, Atemi Lab, The Kumite, Amaterasu DNA, Hattori Guard, Ronin Hub, LLM Jutsu, Admin)
- Multi-provider LLM support
- Real-time scanning and benchmarking
- Port 42001

### dojolm-mcp (MIT)

Model Context Protocol server:
- Adversarial attack scenarios
- Virtual filesystem
- Tool registry for AI agents

### bmad-cybersec (MIT)

Production-ready security framework:
- Multi-agent orchestration
- Cybersecurity, Intel, Legal, and Strategy teams
- Multiple LLM provider support

---

## Getting Started

### First Time Setup

```bash
# Install all dependencies (root + workspaces)
npm install

# Start the scanner API server (port 8089)
npm start --workspace=packages/bu-tpi

# Start the web UI (port 42001)
npm run dev:web

# Or from the package directory
cd packages/bu-tpi && npm start
```

### Development Workflow

```bash
# Run tests for specific workspace
npm test --workspace=packages/bu-tpi

# Type check all workspaces
npm run type-check

# Build all workspaces
npm run build

# Lint all workspaces
npm run lint
```

---

## License Summary

| Package | License | Public? |
|---------|---------|---------|
| bu-tpi | UNLICENSED | No (source-available) |
| dojolm-scanner | MIT | Yes |
| dojolm-web | MIT | Yes |
| dojolm-mcp | MIT | Yes |
| bmad-cybersec | MIT | Yes |

See [LICENSE](../LICENSE) for full details.

---

## Migration Checklist

- [ ] Update fixture path references to `packages/bu-tpi/fixtures/`
- [ ] Update import aliases (remove `@src/*`, use `@bu-tpi/*`)
- [ ] Update CI/CD pipelines to use workspace commands
- [ ] Update documentation with new paths
- [ ] Verify API endpoints still work (they should!)
- [ ] Review and update any hardcoded paths
- [ ] Use `npm run dev:web` instead of old web UI commands

---

## Support

For issues or questions:
1. Check if the issue is workspace-specific
2. Verify you're using the correct workspace commands
3. Check the package-specific README in `packages/*/README.md`
4. Consult the [Platform Guide](user/PLATFORM_GUIDE.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | 2026-03-06 | NODA-3 rebranding, 12 modules, Ronin Hub, LLM Jutsu, BAISS, Belt system |
| 3.0 | 2026-03-06 | Updated metrics (505+ patterns, 1,544+ fixtures), added new packages |
| 2.3.0 | 2025-02-13 | Monorepo restructuring |
| 1.0.0 | 2025-02-01 | Initial standalone release |
