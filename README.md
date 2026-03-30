# DojoLM

DojoLM is a monorepo for prompt-injection detection, LLM red teaming, compliance mapping, and adversarial evaluation. The current codebase consists of a standalone scanner engine, a Next.js web application, an MCP adversarial server, and a vendored BMAD security framework.

This repository was audited against the codebase on 2026-03-24. Older NODA, KASHIWA, and HAKONE planning language is historical and has been archived where it no longer reflects the live product surface.

## Current Snapshot

- **510 patterns** across **49 pattern groups**
- **2,960 fixtures** across **37 fixture categories**
- **18 DojoV2 controls** fully implemented (100% coverage)
- **57** built-in LLM provider presets in the core registry
- **12** top-level web navigation destinations
- Next.js **16.1.6** with React **19.2.3** and Tailwind CSS **4**
- Standalone scanner API on `:8089`
- Web app on `:42001`

## Quick Start

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install

# Terminal 1: standalone scanner API
npm start --workspace=packages/bu-tpi

# Terminal 2: web app
npm run dev:web
```

Open `http://localhost:42001`, or test the scanner directly:

```bash
curl "http://localhost:8089/api/scan?text=ignore%20all%20previous%20instructions"
```

## Repository Layout

```text
packages/
├── bu-tpi/          Core scanner engine and standalone HTTP API
├── dojolm-scanner/  Thin package that re-exports bu-tpi scanner/types
├── dojolm-web/      Next.js 16 application and API routes
├── dojolm-mcp/      Adversarial MCP server for agent testing
└── bmad-cybersec/   Vendored BMAD framework and validators
```

## Web Product Surface

The live top-level navigation in `packages/dojolm-web` is:

- Dashboard
- Haiku Scanner
- Armory
- LLM Dashboard
- Hattori Guard
- Bushido Book
- Atemi Lab
- The Kumite
- Ronin Hub
- Sengoku
- Kotoba
- Admin

Important nesting that older docs got wrong:

- `LLM Jutsu` is a tab inside `LLM Dashboard`, not a separate top-level module.
- `Amaterasu DNA` is a subsystem inside `The Kumite`.
- `Time Chamber` is represented by Sengoku temporal features and widgets, not a separate top-level nav item.

## Core Runtime Notes

- `packages/bu-tpi` serves a hardened, GET-only API.
- `packages/dojolm-web` uses Next.js App Router plus API routes and file-backed storage under `packages/dojolm-web/data`.
- `packages/dojolm-mcp` defaults to `127.0.0.1:18000`.
- Programmatic web API access uses `X-API-Key` when the request is not a verified same-origin browser request.

## Documentation

- [📚 Documentation Index](docs/DOCUMENTATION-INDEX.md) — Complete navigation guide
- [Getting Started](docs/user/GETTING_STARTED.md)
- [Platform Guide](docs/user/PLATFORM_GUIDE.md)
- [User API Reference](docs/user/API_REFERENCE.md)
- [LLM Provider Guide](docs/user/LLM-PROVIDER-GUIDE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Maintainer API Reference](docs/API_REFERENCE.md)
- [Team Documentation](team/README.md)

## Verification

Useful repo-level checks:

```bash
npm run verify:docs
npm run lint:md
npm test
```

## License

See [LICENSE](LICENSE).
