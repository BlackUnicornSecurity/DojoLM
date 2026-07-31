# Atemi Lab

Atemi Lab is the adversarial testing workspace for MCP and tool-integrated attack simulation.

## Important Scope Note

The current module is a testing workspace. It does not itself run the MCP server.

## Main Areas

- getting-started panel
- MCP connection status
- attack mode selector
- target model selector
- tabbed testing views
- configuration drawer
- session recording and history

## Attack Modes

The current modes are:

- `Passive`
- `Basic`
- `Advanced`
- `Aggressive`

They progressively enable more active attack behaviors and tool availability.

## Current Tabs

- `Attack Tools`
- `Playbooks`
- `Campaigns`
- `Arena`
- `Test Cases`

## Attack Tools

The module separates:

- MCP protocol attacks
- tool-integration attacks

The active set depends on the selected attack mode.

## Playbooks

The playbooks area currently contains:

- `Custom`
- `Protocol Fuzz`
- `Agentic`
- `WebMCP`

Current notes:

- `Protocol Fuzz` is still a placeholder.
- `WebMCP` currently shows an unavailable notice.

## Campaigns

This embeds the Sengoku campaign workflow for red-team execution.

## Arena

This embeds the Battle Arena workflow for adversarial matches.

## Test Cases

This is the current home for single and batch LLM test execution that older docs described under `LLM Dashboard -> Tests`.

## Best Use Cases

- evaluating MCP-adjacent risk scenarios
- rehearsing attack paths against tool-integrated models
- running direct test cases against configured models
- pairing adversarial work with [Bushido Book](BUSHIDO_BOOK.md) or [Model Lab](MODEL_LAB.md)

## Related Docs

- [Model Lab](MODEL_LAB.md)
- [Sengoku](SENGOKU.md)
- [Battle Arena](BATTLE_ARENA.md)
- [Bushido Book](BUSHIDO_BOOK.md)
- [Troubleshooting](../TROUBLESHOOTING.md)
