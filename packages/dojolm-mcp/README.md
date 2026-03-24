# @dojolm/mcp

Adversarial MCP server for local agent-security testing.

## Defaults

- host: `127.0.0.1`
- port: `18000`
- HTTP health endpoint: `/health`
- HTTP status endpoint: `/status`
- JSON-RPC endpoint: `/` or `/mcp`

## Safety Characteristics

- localhost binding by default
- virtual filesystem instead of real filesystem access
- consent gate before start
- auto-shutdown timer

## Key Source Files

```text
src/
├── server.ts
├── types.ts
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

## Notes

This package is meant for adversarial testing. Do not point real production agents at it.
