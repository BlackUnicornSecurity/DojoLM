# @dojolm/mcp

Adversarial MCP server for local agent-security testing.

## Defaults

- host: `127.0.0.1`
- port: `18000`
- HTTP health endpoint: `/health`
- HTTP status endpoint: `/status`
- HTTP mode endpoint: `/mode`
- JSON-RPC endpoint: `/` or `/mcp`

## Running

The server is spawned on-demand by the web API (`POST /api/mcp/status { enabled: true }`), or can be run standalone:

```bash
# Production (compiled)
npm run start                # runs node dist/main.js

# Development (via tsx)
npx tsx src/main.ts
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_HOST` | `127.0.0.1` | Bind address (loopback only — `127.0.0.1`, `::1`, `localhost`) |
| `MCP_PORT` | `18000` | Listen port (1–65535) |
| `MCP_CONSENT` | — | Set `true` to auto-consent (required to start) |

## Safety Characteristics

- **SME HIGH-14:** Loopback-only binding enforced at startup (rejects non-loopback `MCP_HOST`)
- **SME HIGH-15:** Auto-shutdown timer (default 5 minutes)
- **SME CRIT-03:** Virtual filesystem — no real filesystem access
- Consent gate before start
- Graceful shutdown on SIGTERM/SIGINT

## Key Source Files

```text
src/
├── main.ts               Standalone entry point (spawned by web API or run directly)
├── server.ts              AdversarialMCPServer class (HTTP + JSON-RPC)
├── types.ts               Type definitions and DEFAULT_SERVER_CONFIG
├── index.ts               Library barrel export (types + classes)
├── attack-controller.ts
├── attack-engine.ts
├── attack-logger.ts
├── tool-registry.ts
├── virtual-fs.ts
├── observer.ts
├── fixture-generator.ts
├── mode-system.ts
├── scenarios/
├── tools/
└── pipeline/
```

## Docker

In the Docker production image, the compiled `dist/` is copied to the runner stage. The web API spawns it via `node packages/dojolm-mcp/dist/main.js` (no `tsx` dependency needed at runtime).

## Notes

This package is meant for adversarial testing. Do not point real production agents at it.
