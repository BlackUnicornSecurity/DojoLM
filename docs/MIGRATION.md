# Monorepo Migration Guide

## Overview

This repository has been restructured as **DojoLM** - an LLM red teaming and security testing platform containing multiple workspaces.

## Repository Structure

```
dojolm/
├── packages/
│   ├── bmad-cybersec/          # MIT-licensed security framework
│   │   ├── framework/           # Core framework code
│   │   ├── validators/          # Security validators
│   │   └── package.json
│   ├── dojolm-scanner/         # Shared scanner package (PLANNED)
│   └── bu-tpi/                 # TPI Scanner - test fixtures and detection
│       ├── fixtures/            # 300+ test fixtures
│       ├── src/                 # Scanner, server, generator
│       ├── tools/               # Test suites
│       └── package.json
├── index.html                   # Web UI for TPI Lab (legacy)
├── tsconfig.json                # Shared TypeScript config
├── package.json                 # Monorepo root config
├── LICENSE                      # Dual-license documentation
└── team/planning/               # Working documents
```

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
```

## Package-Specific Information

### bmad-cybersec (MIT Licensed)

Production-ready security framework with:
- 139+ validators
- Multi-agent orchestration
- Cybersecurity, Intel, Legal, and Strategy teams

### bu-tpi (UNLICENSED)

TPI Security Test Lab for prompt injection testing:
- 300+ attack fixtures
- 139 detection patterns
- Interactive web UI at root `index.html`
- API server on port 8089

## Getting Started

### First Time Setup

```bash
# Install all dependencies (root + workspaces)
npm install

# Start the TPI Lab server
npm start --workspace=packages/bu-tpi

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
```

## License Summary

| Package | License | Public? |
|---------|---------|---------|
| bmad-cybersec | MIT | Yes |
| bu-tpi | UNLICENSED | No (private) |

See [LICENSE](../LICENSE) for full details.

## Migration Checklist

- [ ] Update fixture path references to `packages/bu-tpi/fixtures/`
- [ ] Update import aliases (remove `@src/*`, use `@bu-tpi/*`)
- [ ] Update CI/CD pipelines to use workspace commands
- [ ] Update documentation with new paths
- [ ] Verify API endpoints still work (they should!)
- [ ] Review and update any hardcoded paths

## Support

For issues or questions:
1. Check if the issue is workspace-specific
2. Verify you're using the correct workspace commands
3. Check the package-specific README in `packages/*/README.md`

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.3.0 | 2025-02-13 | Monorepo restructuring |
| 1.0.0 | 2025-02-01 | Initial standalone release |
