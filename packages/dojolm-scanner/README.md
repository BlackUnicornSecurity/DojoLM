# @dojolm/scanner

Enhanced scanner package for DojoLM web integration.

## Purpose

This package extends the core `bu-tpi` scanner with web-friendly APIs and engine filtering capabilities. It provides:

- `ScanOptions` interface with optional `engines` parameter for targeted scanning
- TypeScript declarations for clean imports
- Engine-level filtering at the API layer
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
console.log(result.verdict); // 'BLOCK', 'ALLOW'
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
| `Prompt Injection` | Core prompt injection detection patterns |
| `Jailbreak` | Jailbreak and DAN pattern detection |
| `TPI` | CrowdStrike TPI taxonomy patterns |
| `Unicode` | Hidden Unicode character detection |
| `Encoding` | Base64, URL encoding, ROT detection |
| `Denial of Service` | DoS attack pattern detection |
| `Supply Chain` | Supply chain security patterns |
| `Agent Security` | AI agent security patterns |
| `Model Theft` | Model extraction detection |
| `Output Handling` | XSS, SQLi, command injection |
| `Vector & Embeddings` | RAG/vector DB attack patterns |
| `Overreliance` | Overreliance & misinformation |
| `Bias & Fairness` | Bias detection patterns |
| `Multimodal Security` | Image/audio/deepfake patterns |
| `Environmental Impact` | Energy/carbon footprint patterns |

## API Reference

### `scan(text: string, options?: ScanOptions): ScanResult`

Scans text for prompt injection patterns and security issues.

**Parameters:**
- `text` - The text to scan
- `options.engines` - Optional array of engine IDs to filter scanning

**Returns:** `ScanResult` object containing:
- `verdict`: 'BLOCK' | 'ALLOW'
- `findings`: Array of pattern matches
- `counts`: Summary of finding severities
- `elapsed`: Processing time in ms

### `normalizeText(text: string): string`

Normalizes text by applying security-focused preprocessing:
- Unicode normalization (NFKC)
- Homoglyph substitution
- Zero-width character removal
- Case normalization

### `getPatternCount(): number`

Returns the total number of detection patterns (504+).

### `getPatternGroups(): PatternGroupInfo[]`

Returns metadata about all pattern groups (47 groups).

## Types

```typescript
interface ScanOptions {
  /** Engine IDs to include in the scan. If not provided, all engines are used. */
  engines?: string[];
}

interface ScanResult {
  findings: Finding[];
  verdict: 'BLOCK' | 'ALLOW';
  elapsed: number;
  textLength: number;
  normalizedLength: number;
  counts: {
    critical: number;
    warning: number;
    info: number;
  };
}

interface Finding {
  category: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  description: string;
  match: string;
  engine: string;
  pattern_name?: string;
}
```

## Engine Filtering Behavior

When `engines` is provided in `ScanOptions`:
- Only patterns from specified engines are evaluated
- Special detectors (Unicode, encoding, etc.) are conditionally run
- If `engines` is omitted, all patterns and detectors run

```typescript
// Only Unicode-related patterns and detectors
scan(text, { engines: ['Unicode'] });

// All patterns (default behavior)
scan(text);
```

## Build

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode compilation
npm run typecheck  # Type checking without emit
```

## Relationship to bu-tpi

This package is a workspace dependency of the DojoLM monorepo. It provides:
- Web-friendly ES module exports
- TypeScript declarations for type safety
- Engine filtering for targeted scanning

The core detection logic is shared with `bu-tpi` package.

## Related Packages

- [bu-tpi](../bu-tpi/) - Core scanner with HTTP API
- [dojolm-web](../dojolm-web/) - Next.js web interface

## Documentation

- [Platform Guide](../../docs/user/PLATFORM_GUIDE.md) - Complete user documentation
- [Contributing Guide](../../github/CONTRIBUTING.md) - Contribution guidelines

## License

MIT
