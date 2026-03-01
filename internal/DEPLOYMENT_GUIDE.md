# DojoLM — Deployment Guide

**Last updated:** 2026-02-28
**Audience:** Operators deploying DojoLM for lab or production use

---

## Quick Reference

| Component | Port | Command | Notes |
|-----------|------|---------|-------|
| Scanner API (bu-tpi) | 8089 | `npm start --workspace=packages/bu-tpi` | Zero deps, always start first |
| Web UI (dojolm-web) | 3000 | `npm run dev:web` or `npm run start:web` | Requires scanner API running |
| BMAD Framework | N/A | `npx bmad-cybersec install` | Standalone, optional |

---

## Prerequisites

| Requirement | Minimum Version |
|-------------|----------------|
| Node.js | 20.0.0 |
| npm | 10.0.0 |
| TypeScript | 5.3.0 (dev dependency) |

---

## Installation

```bash
git clone https://github.com/dojolm/dojolm.git
cd dojolm
npm install
```

This installs dependencies for all workspaces. Node modules are hoisted to the root where possible.

---

## Option 1 — Scanner API Only (Minimal)

The fastest deployment. No build step, no web UI, zero runtime dependencies.

```bash
# Start scanner on default port 8089
npm start --workspace=packages/bu-tpi

# Start on a custom port
npx tsx packages/bu-tpi/src/serve.ts 9000
```

### Verify

```bash
curl http://localhost:8089/api/stats
# → {"patternCount": 505, "patternGroups": [...]}

curl "http://localhost:8089/api/scan?text=ignore+all+previous+instructions"
# → {"verdict": "BLOCK", "findings": [...]}
```

### Fixtures (required for scan-fixture and run-tests)

```bash
npm run generate --workspace=packages/bu-tpi
# Generates 1,544 fixture files in packages/bu-tpi/fixtures/
```

> ⚠️ Always run `npm run generate` after clone and after any `generate-fixtures.ts` changes. The fixtures are git-tracked but must be present in the expected path for the server to serve them.

---

## Option 2 — Full Web UI (Development)

```bash
# Terminal 1: Scanner API (required by web app)
npm start --workspace=packages/bu-tpi

# Terminal 2: Next.js dev server
npm run dev:web
```

Web UI available at `http://localhost:3000`.

### Environment Variables (dojolm-web)

Create `packages/dojolm-web/.env.local` from `.env.example`:

```bash
cp packages/dojolm-web/.env.example packages/dojolm-web/.env.local
```

| Variable | Description | Default |
|----------|-------------|---------|
| `SCANNER_API_URL` | Scanner API base URL | `http://localhost:8089` |
| `ANTHROPIC_API_KEY` | Claude API key (for LLM Dashboard) | — |
| `OPENAI_API_KEY` | OpenAI API key (for LLM Dashboard) | — |
| `OLLAMA_BASE_URL` | Ollama API URL (for local LLM testing) | `http://localhost:11434` |

---

## Option 3 — Full Web UI (Production Build)

> ⚠️ Always clear the `.next` cache before building for production. Stale chunks cause 500 errors in the browser.

```bash
# Clean build
cd packages/dojolm-web
rm -rf .next
npm run build

# Start production server
npm run start:web
```

The production server runs on port 3000 by default. Set `PORT` environment variable to change.

---

## Option 4 — Docker (dojolm-web)

```bash
cd packages/dojolm-web
docker build -t dojolm-web .
docker run -p 3000:3000 \
  -e SCANNER_API_URL=http://host.docker.internal:8089 \
  -e ANTHROPIC_API_KEY=sk-... \
  dojolm-web
```

Note: `host.docker.internal` resolves to the host machine on Docker Desktop (Mac/Windows). On Linux, use `--network=host` or specify the host IP directly.

The scanner API (`bu-tpi`) must be running on the host or in a separate container.

---

## Option 5 — Vercel (dojolm-web)

The web app is Vercel-ready (`vercel.json` configured):

```bash
cd packages/dojolm-web
npx vercel --prod
```

Set environment variables in the Vercel dashboard:
- `SCANNER_API_URL` — your deployed scanner URL
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` as needed

> Note: The scanner API (`packages/bu-tpi`) is a long-running Node.js process and is not suited for serverless deployment. Host it on a persistent server and point the web app's `SCANNER_API_URL` at it.

---

## Production Deployment: Remote Server (Linux)

The scanner API is a long-running Node.js process. For persistent deployment:

```bash
# Install Node.js 20+ and npm 10+ on target server
# Clone repo and install dependencies
git clone https://github.com/dojolm/dojolm.git
cd dojolm && npm install
npm run generate --workspace=packages/bu-tpi

# Start with nohup and log to file
nohup npm start --workspace=packages/bu-tpi > logs/scanner.log 2>&1 &
echo "Scanner PID: $!"
```

**Check logs:**
```bash
tail -f logs/scanner.log
```

**Restart:**
```bash
# Find PID
pgrep -f "packages/bu-tpi"
kill <PID>
nohup npm start --workspace=packages/bu-tpi > logs/scanner.log 2>&1 &
```

---

## Deployment Checklist

Before going live:

```bash
# 1. TypeScript compiles clean
npm run typecheck

# 2. Fixtures generated
npm run generate --workspace=packages/bu-tpi
ls packages/bu-tpi/fixtures/ | wc -l  # Should be 12+ directories

# 3. Scanner API starts and responds
npm start --workspace=packages/bu-tpi &
sleep 2
curl http://localhost:8089/api/stats  # Should return JSON

# 4. Scan test (verify detection works)
curl "http://localhost:8089/api/scan?text=ignore+all+previous+instructions"
# verdict must be "BLOCK"

# 5. Full regression suite
curl "http://localhost:8089/api/run-tests?filter=regression"
# All tests must pass

# 6. False positive check
curl "http://localhost:8089/api/run-tests?filter=false-positive"
# All clean fixtures must return ALLOW

# 7. Web app: clean build
cd packages/dojolm-web && rm -rf .next && npm run build
```

---

## Integrating Scanner API with Majutsu (Lab Server)

When deploying to the lab server (Majutsu or equivalent Linux host):

```bash
# Use the server's npm path if system npm is unavailable
/usr/share/nodejs/corepack/shims/npm install
/usr/share/nodejs/corepack/shims/npm start --workspace=packages/bu-tpi

# SSH with password (lab automation)
export SSHPASS="<password>"
sshpass -e ssh user@majutsu "..."
```

---

## BMAD Cybersec Framework

The BMAD framework is standalone and installed separately:

```bash
npx bmad-cybersec install
```

This installs the Abdul orchestrator and specialist team agents. API keys are configured per-agent in `config/`.

---

## Running All Tests

```bash
# All workspaces
npm test

# Scanner-specific tests via API (scanner must be running)
npm run test:api --workspace=packages/bu-tpi

# Individual suites
curl "http://localhost:8089/api/run-tests?filter=regression&verbose=true"
curl "http://localhost:8089/api/run-tests?filter=false-positive"
curl "http://localhost:8089/api/run-tests?filter=epic4"

# TypeScript validation
npm run typecheck
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `api/fixtures` returns empty or 404 | Manifest not generated | Run `npm run generate --workspace=packages/bu-tpi` |
| Engine filters have no effect | Stale build or wrong engine IDs in constants.ts | Verify ENGINE_FILTERS use exact engine names; rebuild |
| Scan returns ALLOW for obvious injection | Empty engines array passed to scanner | Check `engines && engines.length > 0` guard in scan API route |
| Web app shows 500 for static JS chunk | Stale `.next` cache | `rm -rf .next && npm run build` |
| Scanner detects injection in clean content | False positive in fixtures or new pattern too broad | Run false-positive suite; check new patterns against clean English text |
| EEXIST error on LLM execution | `path.join` on file path instead of directory | Use `path.dirname()` for file-path constants |
| TypeScript errors on build | Strict mode — buffer indexing, optional properties | Use `buf.readUInt8(i)`, conditional spread for optional properties |
| Fixture scan returns empty findings for binary | Binary read as UTF-8 | Read as Buffer, check magic bytes before decode |
