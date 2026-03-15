# @dojolm/scanner

Enhanced scanner package for DojoLM web integration.

## Purpose

Extends core `bu-tpi` scanner with web-friendly APIs and engine filtering:

- `ScanOptions` interface with optional `engines` parameter
- TypeScript declarations for clean imports
- Engine-level filtering at API layer
- Zero runtime dependencies

## Installation

```bash
npm install @dojolm/scanner
```

## Usage

### Basic Scanning

```typescript
import { scan } from '@dojolm/scanner';

const result = scan("Some text to analyze");
console.log(result.verdict); // 'BLOCK' | 'ALLOW'
console.log(result.findings); // Array of detected patterns
```

### Engine Filtering

```typescript
import { scan } from '@dojolm/scanner';

// Scan only for prompt injection patterns
const result = scan(text, { engines: ['Prompt Injection'] });

// Scan for multiple specific engines
const result = scan(text, { 
  engines: ['Prompt Injection', 'Jailbreak', 'Unicode'] 
});
```

### Available Engines

| Engine ID | Description |
|-----------|-------------|
| `Prompt Injection` | Core prompt injection detection |
| `Jailbreak` | DAN pattern detection |
| `TPI` | CrowdStrike TPI taxonomy patterns |
| `Unicode` | Hidden Unicode detection |
| `Encoding` | Base64, URL encoding, ROT |
| `Denial of Service` | DoS attack patterns |
| `Supply Chain` | Supply chain security |
| `Agent Security` | AI agent security |
| `Model Theft` | Model extraction detection |
| `Output Handling` | XSS, SQLi, command injection |
| `Vector & Embeddings` | RAG/vector DB attacks |

## API

### `scan(text: string, options?: ScanOptions): ScanResult`

Scan text for prompt injection patterns.

**Parameters:**
- `text` — Text to scan
- `options.engines` — Optional array of engine IDs to filter by

**Returns:** `ScanResult` with verdict and findings.

## Related Packages

- [bu-tpi](../bu-tpi/) - Core scanner engine
- [dojolm-web](../dojolm-web/) - Web interface

## License

MIT
