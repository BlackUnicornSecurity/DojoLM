# DojoLM Architecture

This document reflects the live package layout and runtime boundaries in the repository as of 2026-03-24.

## System Shape

```text
Browser / API Client / MCP Client
        |             |             |
        v             v             v
  dojolm-web       bu-tpi      dojolm-mcp
   :42001           :8089      127.0.0.1:18000
      |
      v
dojolm-scanner
      |
      v
   bu-tpi
```

## Packages

### `packages/bu-tpi`

The canonical scanner engine.

- Owns the scanner logic, types, fixtures, heuristics, LLM types, and standalone HTTP API.
- Exposes subpaths such as `bu-tpi/scanner`, `bu-tpi/types`, `bu-tpi/llm`, `bu-tpi/attackdna`, `bu-tpi/compliance`, `bu-tpi/sengoku`, and more through `package.json`.
- Runs a hardened GET-only server from `src/serve.ts` on port `8089` by default.
- Current verified metrics: `510` patterns, `49` pattern groups, `2,960` fixtures, `37` fixture categories.

### `packages/dojolm-scanner`

A thin compatibility package.

- `src/scanner.ts` re-exports `bu-tpi/scanner`.
- `src/types.ts` re-exports `bu-tpi/types`.
- There is no separate scanner implementation here anymore.

### `packages/dojolm-web`

The Next.js web application.

- Uses Next.js `16.1.6`, React `19.2.3`, and Tailwind CSS `4`.
- `npm run dev` and `npm run start` run on port `42001`.
- Contains both UI modules and API routes under `src/app/api`.
- Uses file-backed application storage under `packages/dojolm-web/data`.

### `packages/dojolm-mcp`

An adversarial MCP server for agent-security testing.

- Default host: `127.0.0.1`
- Default port: `18000`
- Provides JSON-RPC at `/` or `/mcp`
- Provides supporting HTTP endpoints at `/health`, `/status`, and `/mode`
- Uses a virtual filesystem and auto-shutdown timer for safer local testing

### `packages/bmad-cybersec`

A vendored BMAD framework workspace.

- Top-level package delegates to `framework/`
- Companion validators live in `validators/`
- This package is present in the monorepo but is not part of the main scanner/web request path

## Web Application Surface

The current top-level nav items are defined in `packages/dojolm-web/src/lib/constants.ts`:

- `dashboard`
- `scanner`
- `armory`
- `llm`
- `guard`
- `compliance`
- `adversarial`
- `strategic`
- `ronin-hub`
- `sengoku`
- `kotoba`
- `admin`

Legacy aliases are still accepted for deep links:

- `jutsu` and `llm-jutsu` map to `llm`
- `attackdna` maps to `strategic`
- `kumite` maps to `strategic`
- `time-chamber` maps to `sengoku`

Important nesting:

- `LLM Dashboard` contains `Models`, `Tests`, `Results`, `Leaderboard`, `Compare`, `Custom Models`, and `Jutsu`.
- `Strategic Hub` contains `sage`, `arena`, `threatfeed`, `dna`, `kagami`, and `shingan`.
- `Sengoku` contains `Campaigns` and `Temporal`; Time Chamber content has been merged into the temporal path and related widgets.
- `Admin` contains `General`, `Users`, `Scoreboard`, `API Keys`, `Haiku Scanner & Guard`, `System Health`, `Export`, `Admin Settings`, and `Validation`.

## Storage

The web app persists operational data under `packages/dojolm-web/data`:

```text
packages/dojolm-web/data/
├── amaterasu-dna/    DNA graph data
├── arena/            Arena matches and warriors
├── audit/            API and security audit artifacts
├── ecosystem/        Findings and summary data
├── llm-results/      Models, test cases, executions, batches, reports
└── sengoku/          Campaign and run state
```

## Security Model

### Standalone scanner

`packages/bu-tpi/src/serve.ts` enforces:

- GET-only API methods
- `120` requests per `60` seconds per IP
- `100KB` max for `/api/scan`
- `50MB` max for binary fixture scans
- path traversal checks on fixture reads
- strict CSP on served fixture content

### Web API

`packages/dojolm-web` uses two layers:

- Per-route `checkApiAuth()` logic for many handlers
- Global `proxy.ts` on `/api/:path*`

Current behavior:

- verified same-origin browser requests can bypass `X-API-Key`
- external or programmatic calls use `X-API-Key` matched against `NODA_API_KEY`
- if `NODA_API_KEY` is unset in production, protected routes fail closed
- public routes include `/api/health`, `/api/admin/health`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, and `/api/llm/models`
- proxy rate limits default to `100` requests per minute per IP for external traffic and `300` for same-origin UI traffic

## Typical Data Flows

### 1. Text scan through the web app

```text
Browser
  -> POST /api/scan
  -> @dojolm/scanner
  -> bu-tpi scanner
  -> scan result
  -> optional ecosystem finding emission
```

### 2. Standalone fixture scan

```text
Client
  -> GET /api/scan-fixture?path=...
  -> bu-tpi fixture lookup
  -> text or binary extraction
  -> scanner verdict
```

### 3. LLM execution

```text
Browser or API client
  -> /api/llm/models + /api/llm/test-cases
  -> /api/llm/execute or /api/llm/batch
  -> provider adapter
  -> optional guard wrapping
  -> execution persistence in llm-results
  -> reports / results / leaderboard views
```

## Related Docs

- [Maintainer API Reference](API_REFERENCE.md)
- [User Platform Guide](user/PLATFORM_GUIDE.md)
- [Development Architecture Docs](../team/dev/architecture/SYSTEM-ARCHITECTURE.md)
