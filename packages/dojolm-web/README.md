# dojolm-web

`dojolm-web` is the Next.js application that exposes the live UI and most of the programmatic web API surface.

## Runtime

- dev port: `42001`
- start port: `42001`
- framework: Next.js `16.2.1`
- React: `19.2.3`

## Scripts

```bash
npm run dev --workspace=packages/dojolm-web
npm run build --workspace=packages/dojolm-web
npm run start --workspace=packages/dojolm-web
npm test --workspace=packages/dojolm-web
```

## Top-Level Navigation

The current nav surface is:

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

Legacy alias notes:

- `LLM Jutsu` is inside `LLM Dashboard`
- `Amaterasu DNA` is inside `The Kumite`
- `Time Chamber` maps to Sengoku temporal features

## Structure

```text
src/
├── app/
│   ├── api/             Next.js route handlers
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin/
│   ├── adversarial/
│   ├── attackdna/
│   ├── compliance/
│   ├── dashboard/
│   ├── fixtures/
│   ├── guard/
│   ├── kagami/
│   ├── kotoba/
│   ├── llm/
│   ├── ronin/
│   ├── scanner/
│   ├── sengoku/
│   ├── sensei/
│   ├── shingan/
│   ├── strategic/
│   ├── timechamber/
│   └── ui/
├── lib/
└── proxy.ts
```

## Data Storage

File-backed operational data lives under:

```text
packages/dojolm-web/data/
├── ecosystem/
├── amaterasu-dna/
├── amaterasu-master/
├── arena/
├── guard/
└── llm-results/
```

## Auth Model

Protected API routes use `X-API-Key` for external callers and same-origin bypass for verified browser requests. The shared key is `NODA_API_KEY`.

## MCP Server Integration

The adversarial MCP server (`@dojolm/mcp`) is spawned on-demand via `POST /api/mcp/status { enabled: true }`.

- In production (Docker): spawns `node packages/dojolm-mcp/dist/main.js`
- In development: falls back to `npx tsx packages/dojolm-mcp/src/main.ts`
- Health probed at `http://127.0.0.1:18000/health`
- Mode switching validated against an allowlist before forwarding
- Concurrent spawn requests share a single Promise (no duplicate processes)

## Notes

- `npm run dev` automatically builds `packages/dojolm-scanner` first
- the optional secure server wrapper lives in `server.ts`
- Docker in the repo exposes `42001`, matching the current app port rather than the older local default mentioned in some historical notes
