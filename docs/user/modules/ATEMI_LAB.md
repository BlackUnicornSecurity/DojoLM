# Atemi Lab

Atemi Lab is the adversarial testing dashboard for MCP protocol and tool-integration attack simulation.

## Important Scope Note

The current module is a testing dashboard. It does not itself run the MCP server.

## Main Areas

- getting-started panel
- MCP connection status
- attack mode selector
- target model selector
- tabbed testing views
- configuration drawer
- session recording

## Attack Modes

The current modes are:

- `Passive`
- `Basic`
- `Advanced`
- `Aggressive`

They progressively enable more active attack behaviors and tool availability.

## Current Tabs

- `Attack Tools`
- `Skills`
- `MCP`
- `Protocol Fuzz`
- `WebMCP`

## Attack Tools

The module separates:

- MCP protocol attacks
- tool-integration attacks

The active set depends on the selected attack mode.

## Skills

Use `Skills` to execute reusable adversarial routines and push their results into the broader ecosystem.

## MCP

Use `MCP` to review protocol-level attack content and scenario readiness.

## Protocol Fuzz

`Protocol Fuzz` is currently a placeholder for a later integration. Treat it as planned work, not as a finished production feature.

## WebMCP

Use `WebMCP` when you want to:

- set a target URL
- choose transport and test categories
- confirm consent
- run the current mock or simulated WebMCP flow

## Best Use Cases

- evaluating MCP-adjacent risk scenarios
- rehearsing attack paths against tool-integrated models
- pairing adversarial work with [The Kumite](THE_KUMITE.md) or [Bushido Book](BUSHIDO_BOOK.md)

## Related Docs

- [The Kumite](THE_KUMITE.md)
- [Bushido Book](BUSHIDO_BOOK.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
