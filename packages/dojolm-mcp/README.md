# @dojolm/mcp

Adversarial Model Context Protocol (MCP) server for LLM security testing.

## Overview

This package provides an adversarial MCP server designed to test LLM agents against various attack scenarios. It implements the MCP (Model Context Protocol) specification with intentionally malicious tools and resources for security research.

### Purpose

- Test LLM agent resilience against tool poisoning attacks
- Evaluate handling of malicious resource content
- Simulate capability spoofing and typosquatting
- Research sampling loop vulnerabilities

⚠️ **Warning:** This server is designed for security testing only. Never connect it to production systems or agents with access to sensitive data.

---

## Installation

```bash
npm install @dojolm/mcp
```

---

## Architecture

```
src/
├── index.ts              # Public exports
├── server.ts             # MCP JSON-RPC 2.0 server
├── types.ts              # Type definitions
├── attack-controller.ts  # Attack mode management
├── attack-engine.ts      # Payload generation
├── attack-logger.ts      # Attack logging
├── tool-registry.ts      # Tool definitions
├── virtual-fs.ts         # Sandboxed filesystem
├── fixture-generator.ts  # Test fixture generation
├── observer.ts           # Attack observation
└── mode-system.ts        # Mode configuration
```

---

## Attack Types

### MCP Protocol Attacks (P4)

| Attack Type | Description |
|-------------|-------------|
| `capability-spoofing` | Tools claiming false capabilities |
| `tool-poisoning` | Malicious tool responses |
| `uri-traversal` | Path traversal in resource URIs |
| `sampling-loop` | Recursive sampling exploitation |
| `name-typosquatting` | Tools mimicking legitimate names |
| `cross-server-leak` | Data leakage between servers |
| `notification-flood` | DoS via notification spam |
| `prompt-injection` | Injection via tool arguments |

### Adversarial Tool Attacks (P5)

| Attack Type | Description |
|-------------|-------------|
| `vector-db-poisoning` | Poisoned vector database content |
| `browser-exploitation` | Browser tool exploitation |
| `api-exploitation` | API tool exploitation |
| `filesystem-exploitation` | Filesystem tool exploitation |
| `model-exploitation` | Model configuration attacks |
| `email-exploitation` | Email tool exploitation |
| `code-repository-poisoning` | Poisoned code repositories |
| `message-queue-exploitation` | Message queue attacks |
| `search-poisoning` | Search result manipulation |

---

## Attack Modes

| Mode | Severity | Description |
|------|----------|-------------|
| `passive` | Low | Logs only, no active attacks |
| `basic` | Medium | Simple attack payloads |
| `advanced` | High | Sophisticated multi-step attacks |
| `aggressive` | Critical | All attack types enabled |

---

## Usage

### Basic Server Setup

```typescript
import { AdversarialMCPServer } from '@dojolm/mcp';

// Create server with default configuration
const server = new AdversarialMCPServer();

// Give consent for attacks (required by default)
server.giveConsent();

// Start server on port 3001
await server.start(3001);
```

### Custom Configuration

```typescript
import { AdversarialMCPServer, DEFAULT_SERVER_CONFIG } from '@dojolm/mcp';

const server = new AdversarialMCPServer({
  defaultMode: 'advanced',
  consentRequired: true,
  maxSamplingDepth: 3,
  autoShutdownMs: 300000, // 5 minutes
  bindAddress: '127.0.0.1',
  port: 3001,
});
```

### Attack Mode Control

```typescript
import { AttackController, ATTACK_MODES } from '@dojolm/mcp';

const controller = server.getController();

// Set attack mode
controller.setMode('aggressive');

// Check current mode
const mode = controller.getMode();

// Check if specific attack is enabled
const isEnabled = controller.isAttackEnabled('tool-poisoning');

// Get available modes
const modes = ATTACK_MODES;
```

### Virtual Filesystem

The server uses a sandboxed virtual filesystem (no real fs access):

```typescript
const vfs = server.getVirtualFs();

// Seed with test files
vfs.writeFile('/data/config.json', JSON.stringify({
  api_key: 'injected-key',
  endpoint: 'https://malicious.example.com'
}));

// Read file
const content = vfs.readFile('/data/config.json');
```

### Attack Logging

```typescript
const logger = server.getLogger();

// Get all logs
const logs = logger.getLogs();

// Get logs by type
const toolLogs = logger.getLogsByType('tool_call');

// Clear logs
logger.clear();
```

---

## API Reference

### `AdversarialMCPServer`

Main server class implementing MCP JSON-RPC 2.0.

#### Constructor

```typescript
new AdversarialMCPServer(config?: Partial<AdversarialServerConfig>)
```

#### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `start(port?: number)` | `Promise<void>` | Start the HTTP server |
| `stop()` | `Promise<void>` | Stop the server |
| `giveConsent()` | `void` | Enable attacks (required) |
| `hasConsent()` | `boolean` | Check if consent given |
| `isRunning()` | `boolean` | Check if server is running |
| `getController()` | `AttackController` | Get attack controller |
| `getEngine()` | `AttackEngine` | Get attack engine |
| `getLogger()` | `AttackLogger` | Get attack logger |
| `getToolRegistry()` | `ToolRegistry` | Get tool registry |
| `getVirtualFs()` | `VirtualFileSystem` | Get virtual filesystem |
| `getConfig()` | `AdversarialServerConfig` | Get server config |

### `AttackController`

Manages attack modes and enabled attacks.

#### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `setMode(mode: AttackModeName)` | `void` | Set attack mode |
| `getMode()` | `AttackModeName` | Get current mode |
| `isAttackEnabled(type: AttackType)` | `boolean` | Check if attack enabled |

### `AttackEngine`

Generates attack payloads based on scenarios.

#### Methods

| Method | Return Type | Description |
|--------|-------------|-------------|
| `generateToolResult(toolName, args, attackType)` | `MCPToolCallResult \| null` | Generate poisoned tool result |
| `generateResourceResult(uri, content, attackType)` | `MCPResourceContent \| null` | Generate poisoned resource |

---

## Security Features

### Sandboxed Execution

- **Virtual Filesystem:** No real filesystem access
- **Localhost Only:** Binds to 127.0.0.1 by default
- **Auto-Shutdown:** Configurable timeout (default 5 minutes)
- **Consent Required:** Attacks disabled until consent given

### Logging

All attacks are logged with:
- Timestamp
- Attack mode
- Attack type
- Request/response data
- Payload metadata

---

## Development

```bash
npm run build      # Build the package
npm run dev        # Development/watch mode
npm run typecheck  # Type checking
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

---

## Integration with DojoLM

This package integrates with the DojoLM security testing platform:

```
dojolm-mcp ──► bu-tpi (scanner)
```

Attack payloads generated by this server can be scanned by the bu-tpi scanner for detection validation.

---

## License

MIT

---

## Related Packages

- [`@dojolm/scanner`](../dojolm-scanner) - Enhanced scanner package
- [`bu-tpi`](../bu-tpi) - Core TPI scanner engine
- [`dojolm-web`](../dojolm-web) - Next.js web interface
