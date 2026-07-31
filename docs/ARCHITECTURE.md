# DojoLM Architecture

This document reflects the live package layout and runtime boundaries in the repository as of 2026-07-08.

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
- Exposes subpaths such as `bu-tpi/scanner`, `bu-tpi/types`, `bu-tpi/llm`, `bu-tpi/attackdna`, `bu-tpi/compliance`, `bu-tpi/sengoku`, `bu-tpi/sensei`, `bu-tpi/benchmark`, and more through `package.json`.
- Runs a hardened GET-only server from `src/serve.ts` on port `8089` by default.
- Current verified metrics: **544 patterns**, **49 pattern groups**, **5,281 fixtures**, **40 fixture categories**.
- `src/sensei`: Sensei, a purpose-built, fine-tunable model subsystem for adversarial attack generation, mutation advising, multi-turn plan creation, and response judging — plus its training-data pipeline (extraction, curation, format conversion), tiered attacker-model routing, refusal classification, convergence detection, and probe executor.
- `src/benchmark` (CLI at `tools/benchmark-cli.ts`, #978): scanner-backed benchmark framework — suite registry, a scanner-backed evaluation adapter, and schema-versioned (`dojolm.benchmark.report/v1`) report generation/comparison; local deterministic smoke suites only (no imported external corpora). See `docs/user/BENCHMARKING.md`.
- **18 DojoV2 controls** fully implemented (100% coverage):
  - Prompt Injection (LLM-01, LLM-02)
  - System Prompt Extraction/Manipulation (LLM-03, LLM-04)
  - Multi-turn/Context Attacks (LLM-05, LLM-06)
  - Social Engineering (LLM-07)
  - Code/Tool Security (LLM-08, LLM-09)
  - Denial of Service (DoS)
  - Supply Chain
  - Agent Security 
  - Output Handling
  - Vector/Embed
  - Overreliance (Hallucination Triggers)
  - Bias/Fairness (Demographic Parity)
  - **Shingan Universal Scanner**: 6-layer cross-module correlation.
  - **Kagami Fingerprinting**: 210+ probes for model signature verification.

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
- **12 top-level navigation destinations** with 4 group categories (Attack, Defense, Red Team, Analysis).
- **18 DojoV2 security controls** implemented with 100% coverage.

### `packages/dojolm-mcp`

An adversarial MCP server for agent-security testing.

- Entry point: `src/main.ts` (standalone) / `src/index.ts` (library exports)
- Default host: `127.0.0.1` (loopback enforced — rejects non-loopback `MCP_HOST`)
- Default port: `18000`
- Provides JSON-RPC at `/` or `/mcp`
- Provides supporting HTTP endpoints at `/health`, `/status`, and `/mode`
- Uses a virtual filesystem and auto-shutdown timer (5 min) for safer local testing
- Spawned on-demand by the web API (`POST /api/mcp/status`) using compiled `dist/main.js` in production or `tsx src/main.ts` in development
- Valid attack modes: `basic`, `passive`, `prompt-injection`, `tool-poisoning`, `exfiltration`, `confused-deputy`, `advanced`, `aggressive`

## Web Application Surface

The current top-level nav items are defined in `packages/dojolm-web/src/lib/constants.ts`:

- `dashboard`
- `scanner`
- `buki`
- `jutsu`
- `arena`
- `adversarial`
- `sengoku`
- `ronin-hub`
- `guard`
- `kotoba`
- `mitsuke`
- `dna`
- `kagami`
- `compliance`
- `admin`

`strategic` is retained as a hidden back-compat NavId that renders a `KumiteRetiredNotice` — see `src/components/strategic/KumiteRetiredNotice.tsx`. Its children (`mitsuke`, `dna`, `kagami`, `arena`) are now first-class.

### Legacy Deep-Link Aliases (back-compat only)

These retired NavIds remain in `NAV_ID_ALIASES` so existing deep links continue to resolve. They MUST NOT appear as outgoing navigation targets in new code — the ESLint `no-restricted-syntax` rule in `packages/dojolm-web/eslint.config.mjs` enforces this.

- `llm` → `jutsu` (LLM Dashboard was renamed to Model Lab)
- `armory` → `buki` (Payload Lab)
- `attackdna` → `dna` (Amaterasu DNA is now first-class)
- `kumite` → `strategic` (retired hub; use the child module directly)
- `atemi` → `adversarial`
- `time-chamber` → `sengoku`
- `ronin` / `bounty` → `ronin-hub`
- `testing` / `attack` → `scanner`
- `arena-standalone` → `arena`

### Module composition

- `Jutsu` (Model Lab) contains `Models`, `Tests`, `Results`, `Leaderboard`, `Compare`, `Custom Models`, and `Jutsu` (the benchmarking tab).
- The former Kumite / strategic hub is retired; its subsystems are mounted directly: `mitsuke`, `dna`, `kagami`, `arena`, plus SAGE inside `buki` and Shingan inside `scanner`.
- `Sengoku` contains `Campaigns` and `Temporal`; Time Chamber content was merged into the temporal path. Campaign targets support three source modes: `external` (URL + API key/bearer), `dashboard` (Model Lab model with auto-resolved credentials), and `local` (Ollama with auto-detection).
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
- external or programmatic calls use `X-API-Key` matched against `TPI_API_KEY`
- if `TPI_API_KEY` is unset in production, protected routes fail closed
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

- [API Reference](user/API_REFERENCE.md)
- [User Platform Guide](user/PLATFORM_GUIDE.md)
