# @dojolm/mcp

Adversarial Model Context Protocol (MCP) server for LLM security testing.

## Overview

Adversarial MCP server for testing LLM agents against attack scenarios. Implements MCP specification with malicious tools and resources for security research.

### Purpose

- Test LLM agent resilience against tool poisoning
- Evaluate malicious resource content handling
- Simulate capability spoofing and typosquatting
- Research sampling loop vulnerabilities

⚠️ **Warning:** For security testing only. Never connect to production systems.

## Installation

```bash
npm install @dojolm/mcp
```

## Architecture

```
src/
  index.ts              # Public exports
  server.ts             # MCP JSON-RPC 2.0 server
  types.ts              # Type definitions
  attack-controller.ts  # Attack mode management
  attack-engine.ts      # Payload generation
  attack-logger.ts      # Attack logging
  tool-registry.ts      # Tool definitions
  virtual-fs.ts         # Sandboxed filesystem
  fixture-generator.ts  # Test fixture generation
  observer.ts           # Attack observation
  mode-system.ts        # Mode configuration
```

## Attack Types

### MCP Protocol Attacks

| Attack Type | Description |
|-------------|-------------|
| `capability-spoofing` | False capability claims |
| `tool-poisoning` | Malicious tool responses |
| `uri-traversal` | Path traversal in URIs |
| `sampling-loop` | Recursive sampling exploitation |
| `name-typosquatting` | Mimicking legitimate tools |
| `cross-server-leak` | Data leakage between servers |
| `notification-flood` | DoS via notification spam |
| `prompt-injection` | Injection via tool arguments |

## Usage

### Start Server

```bash
npx @dojolm/mcp
```

### Configure Client

```json
{
  "mcpServers": {
    "security": {
      "command": "npx",
      "args": ["-y", "@dojolm/mcp"]
    }
  }
}
```

### Advanced Tool Scenarios

9 adversarial tool scenarios for testing real-world attack vectors:

| Scenario | Target |
|----------|--------|
| `vector-db` | Vector DB poisoning |
| `browser` | Browser exploitation |
| `api-gateway` | API gateway attacks |
| `file-system` | Filesystem exploitation |
| `model-endpoint` | Model endpoint poisoning |
| `email-server` | Email server attacks |
| `code-repo` | Repository poisoning |
| `message-queue` | Message queue exploitation |
| `search-engine` | Search engine poisoning |

### Attack Modes

| Mode | Behavior |
|------|----------|
| `passive` | Observation only |
| `basic` | Subset of core attacks |
| `advanced` | Full attack portfolio |
| `aggressive` | Intensive attack patterns |

### Security Features

- Sandboxed virtual filesystem (no real FS access)
- Localhost binding only (127.0.0.1)
- Auto-shutdown timeout (default 5 min)
- Attack logging and metrics collection

## Related Packages

- [bu-tpi](../bu-tpi/) - Core scanner engine
- [dojolm-web](../dojolm-web/) - Web interface

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md)
- [Contributing Guide](../../github/CONTRIBUTING.md)

## License

DojoLM Research-Only License — See [LICENSE](../../LICENSE)
