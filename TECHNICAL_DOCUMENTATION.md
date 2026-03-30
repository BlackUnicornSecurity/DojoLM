# DojoLM Technical Documentation

## Executive Summary

DojoLM is a comprehensive, production-grade platform for prompt-injection detection, LLM red teaming, compliance mapping, and adversarial evaluation. Built as a TypeScript monorepo with zero runtime dependencies in the core engine, it represents a breakthrough in AI security testing and safety validation.

**Key Metrics:**
- **510+ detection patterns** across **49 pattern groups**
- **2,960+ attack fixtures** across **37 fixture categories**
- **18 DojoV2 security controls** with 100% implementation coverage
- **57 built-in LLM provider presets** in the core registry
- **12 top-level web navigation destinations**

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Technical Innovations](#technical-innovations)
4. [Module Deep Dive](#module-deep-dive)
5. [Security Model](#security-model)
6. [API Reference](#api-reference)
7. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level System Shape

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                   │
├─────────────────┬─────────────────┬─────────────────────────────────────┤
│  Browser/App    │   API Client    │        MCP Client                   │
│    :42001       │    (Direct)     │      127.0.0.1:18000                │
└────────┬────────┴────────┬────────┴──────────────┬──────────────────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────┐ ┌──────────────┐  ┌──────────────────────────────┐
│   dojolm-web    │ │   bu-tpi     │  │        dojolm-mcp            │
│  (Next.js App)  │ │  (Scanner)   │  │   (Adversarial MCP Server)   │
│                 │ │   :8089      │  │                              │
└────────┬────────┘ └──────┬───────┘  └──────────────────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────┐ ┌─────────────────────────────────────────────────┐
│ dojolm-scanner  │ │              Core Engine (bu-tpi)                │
│  (Thin Re-export)│ │  • Pattern Engine    • LLM Adapters            │
└─────────────────┘ │  • Module Registry   • Compliance Framework      │
                    │  • Attack DNA        • Validation Suite          │
                    └─────────────────────────────────────────────────┘
```

### Repository Structure

```text
dojolm/
├── packages/
│   ├── bu-tpi/              # Core scanner engine (canonical source)
│   ├── dojolm-scanner/      # Thin compatibility package
│   ├── dojolm-web/          # Next.js 16 web application
│   ├── dojolm-mcp/          # Adversarial MCP server
│   └── bmad-cybersec/       # Vendored BMAD security framework
├── docs/                    # Comprehensive documentation
├── team/                    # Internal dev/QA docs (gitignored)
├── data/                    # Operational data storage
└── tools/                   # Utility scripts and validators
```

---

## Core Components

### 1. bu-tpi: The Canonical Scanner Engine

The heart of DojoLM is `bu-tpi` — a hardened, zero-dependency scanner engine written in pure TypeScript.

#### Key Characteristics
- **Zero Runtime Dependencies**: No external packages required for core detection
- **Self-Registering Module System**: Pluggable architecture for detection modules
- **Multi-Modal Support**: Text, binary, image, audio, and document scanning
- **Hardened HTTP API**: GET-only API with rate limiting and path traversal protection

#### Core Detection Capabilities

| Category | Description | Pattern Count |
|----------|-------------|---------------|
| System Override | Direct instruction override attempts | 45+ |
| Role Hijacking | XML/JSON/Markdown injection for role confusion | 30+ |
| Jailbreak Patterns | DAN, AIM, STAN, Grandma exploit, etc. | 60+ |
| Boundary Manipulation | Control tokens, confusable Unicode | 40+ |
| Multilingual Attacks | 12+ languages with 4 patterns each | 50+ |
| Agent Security | Tool credential extraction, A2A attacks | 80+ |
| RAG Poisoning | Knowledge base injection, vector DB attacks | 35+ |
| Multi-Turn Attacks | Session persistence, context manipulation | 40+ |
| Modern Jailbreaks | DeepInception, ArtPrompt, FlipAttack | 30+ |
| Encoding Evasion | Base64, hex, Unicode, homoglyphs | 50+ |

#### Standalone API Endpoints

```typescript
// GET /api/scan?text={input}
// Rate limit: 120 requests/60 seconds per IP
// Max input: 100KB

interface ScanResponse {
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
```

### 2. dojolm-web: Next.js Application

Modern web interface built with Next.js 16, React 19, and Tailwind CSS 4.

#### Web Navigation Surface

| Module | Purpose | Category |
|--------|---------|----------|
| Dashboard | Overview, metrics, recent activity | Overview |
| Haiku Scanner | Lightweight quick-scan interface | Attack |
| Armory | Attack fixture browser and manager | Attack |
| LLM Dashboard | Model testing, execution, leaderboard | Red Team |
| Hattori Guard | Real-time guard and filtering | Defense |
| Bushido Book | Compliance mapping and reports | Analysis |
| Atemi Lab | Adversarial testing environment | Red Team |
| The Kumite | Arena for model vs model battles | Red Team |
| Ronin Hub | Community and external integrations | Analysis |
| Sengoku | Campaign management and orchestration | Red Team |
| Kotoba | Prompt optimization and refinement | Defense |
| Admin | System administration | Admin |

#### Storage Architecture

```text
packages/dojolm-web/data/
├── ecosystem/           # Findings and summary data
├── amaterasu-dna/       # DNA graph data
├── amaterasu-master/    # Master synchronization data
├── arena/               # Arena matches and warriors
├── guard/               # Guard configurations
├── llm-results/         # Models, test cases, executions
└── sengoku/             # Campaign and run state
```

### 3. dojolm-mcp: Adversarial MCP Server

A specialized MCP (Model Context Protocol) server for adversarial agent-security testing.

#### Safety Characteristics
- **Localhost Binding**: Default to `127.0.0.1` only
- **Virtual Filesystem**: No real filesystem access
- **Consent Gate**: Requires explicit user confirmation
- **Auto-Shutdown**: Automatic cleanup timer

### 4. Pattern Registry System

The scanner uses a sophisticated pattern registry with multiple pattern groups:

```typescript
// Core Pattern Groups (excerpt from scanner.ts)
export const PI_PATTERNS: RegexPattern[] = [
  // System Override
  { name: 'ignore_instructions', cat: 'SYSTEM_OVERRIDE', 
    re: /ignore\s+all\s+previous\s+instructions/i,
    sev: SEVERITY.CRITICAL, desc: 'System override attempt' },
  // ... 500+ more patterns
];

export const JB_PATTERNS: RegexPattern[] = [
  // DAN Jailbreak
  { name: 'dan_classic', cat: 'DAN', weight: 8,
    re: /DAN\s+mode\s+enabled/i, sev: SEVERITY.CRITICAL },
  // ... jailbreak patterns
];

export const AGENT_CREDENTIAL_PATTERNS: RegexPattern[] = [
  // API Key Extraction
  { name: 'ag_cred_api_key_extract', cat: 'AGENT_CREDENTIAL_THEFT',
    re: /extract\s+(?:the\s+)?api\s+key/i, sev: SEVERITY.CRITICAL },
  // ... agent security patterns
];
```

---

## Technical Innovations

### 1. Zero-Dependency Core Engine

**Innovation**: The scanner core (`bu-tpi`) operates with absolutely zero npm dependencies, achieving:
- **Supply Chain Security**: No third-party vulnerability exposure
- **Auditability**: Every line of code is reviewable
- **Performance**: No dependency resolution overhead
- **Reliability**: Zero risk of dependency deprecation or breaking changes

```typescript
// Pure TypeScript with zero imports (except local modules)
import { scannerRegistry } from './modules/registry.js';
import type { Finding, ScanResult } from './types.js';

export function scan(text: string): ScanResult {
  // All processing done with native JavaScript/TypeScript
  const normalized = normalizeText(text);
  const findings = scannerRegistry.scanAll(text, normalized);
  return compileResult(findings, text.length, normalized.length);
}
```

### 2. Self-Registering Module System

**Innovation**: Pluggable architecture where modules auto-register on import.

```typescript
// modules/enhanced-pi.ts
import { scannerRegistry } from './registry.js';

const enhancedPIModule: ScannerModule = {
  name: 'enhanced-pi',
  version: '1.0.0',
  description: 'Semantic injection detection',
  scan(text, normalized) {
    return [
      ...detectSemanticAttackChains(text),
      ...detectInstructionBoundaryViolation(text),
      ...detectRoleConfusion(text),
    ];
  },
  getPatternCount() { return 156; },
  getPatternGroups() { /* ... */ }
};

scannerRegistry.register(enhancedPIModule);
```

### 3. Multi-Layer Normalization Engine

**Innovation**: Sophisticated text normalization that defeats evasion attempts:

```typescript
export function normalizeText(text: string): string {
  let t = text;
  // 1. Strip combining marks BEFORE NFKC composition
  t = t.replace(/[\u0300-\u036F]/g, '');
  // 2. NFKC normalization
  t = t.normalize('NFKC');
  // 3. Remove zero-width characters
  t = t.replace(ZW_RE, '');
  // 4. Map confusable Unicode to ASCII
  for (const [from, to] of Object.entries(CONFUSABLE_MAP)) {
    t = t.split(from).join(to);
  }
  // 5. Normalize whitespace
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}
```

### 4. Semantic Attack Chain Detection

**Innovation**: Beyond regex — detecting attack semantics through multi-factor pattern correlation:

```typescript
function detectSemanticAttackChains(text: string): Finding[] {
  const findings: Finding[] = [];
  
  // Multi-factor detection
  const overrideDirective = /system[_\s-]*override|ignore\s+all\s+previous/i.test(text);
  const promptOrSecretGoal = /system\s+prompt|api\s+keys?|credentials/i.test(text);
  const directOverrideGoal = /developer\s+mode|unrestricted|disable\s+safety/i.test(text);
  
  // Semantic correlation
  if (overrideDirective && (promptOrSecretGoal || directOverrideGoal)) {
    findings.push({
      category: 'SEMANTIC_INJECTION',
      severity: SEVERITY.CRITICAL,
      description: 'Direct role/mode override semantics detected',
      weight: 10,
    });
  }
  
  return findings;
}
```

### 5. Agent-to-Agent Security Framework

**Innovation**: First comprehensive detection framework for multi-agent attack vectors:

```typescript
// Detecting A2A attacks
export const AGENT_CREDENTIAL_PATTERNS: RegexPattern[] = [
  // Handoff poisoning
  { name: 'handoff_poisoning', cat: 'AGENT_CREDENTIAL_THEFT',
    re: /handoff\s+poisoning|poisoned\s+handoff/i },
  // Chain infection
  { name: 'multi_agent_chain', cat: 'AGENT_CREDENTIAL_THEFT',
    re: /chain\s+poisoning|agent\s+chain\s+infection/i },
  // Consensus exploitation
  { name: 'consensus_bypass', cat: 'AGENT_CREDENTIAL_THEFT',
    re: /consensus\s+(?:bypassing|exploit)/i },
];
```

### 6. Multilingual Attack Detection

**Innovation**: Native support for 12+ languages with transliteration detection:

```typescript
// Chinese patterns
{ name: 'zh_system_override', lang: 'zh',
  re: /忽略所有之前的指令|忽略以上所有指示/ }

// Chinese Pinyin (transliterated)
{ name: 'zh_pinyin_override', lang: 'zh-pinyin',
  re: /hush[ie]?\s+suoyou\s+zhiqian\s+(?:de\s+)?zhiling/i }

// Hebrew RTL patterns
{ name: 'hebrew_text_detection', lang: 'he',
  re: /[֐-׿]{50,}/ }
```

### 7. Binary Content Scanning

**Innovation**: Deep inspection of binary files for hidden injection payloads:

```typescript
// Supported binary formats
const SUPPORTED_FORMATS = {
  // Images
  jpeg: { magic: [0xFF, 0xD8], extractors: ['EXIF', 'XMP'] },
  png: { magic: [0x89, 0x50, 0x4E, 0x47], extractors: ['tEXt', 'iTXt', 'zTXt'] },
  // Audio
  mp3: { magic: [0xFF, 0xFB], extractors: ['ID3v1', 'ID3v2'] },
  wav: { magic: [0x52, 0x49, 0x46, 0x46], extractors: ['RIFF', 'INFO'] },
  // Documents
  pdf: { magic: [0x25, 0x50, 0x44, 0x46], extractors: ['/Metadata', '/JS'] },
};

export function scanBinary(buffer: Buffer): BinaryScanResult {
  const format = detectFormat(buffer);
  const metadata = extractMetadata(buffer, format);
  const findings = scan(metadata.extractedText);
  return { ...findings, metadata };
}
```

---

## Module Deep Dive

### Detection Modules (Self-Registering)

| Module | File | Purpose | Pattern Count |
|--------|------|---------|---------------|
| Enhanced PI | `modules/enhanced-pi.ts` | Semantic injection, boundaries, role confusion | 156 |
| MCP Parser | `modules/mcp-parser.ts` | MCP protocol-specific attacks | 45 |
| Document PDF | `modules/document-pdf.ts` | PDF-based injection vectors | 32 |
| Document Office | `modules/document-office.ts` | DOCX/XLSX attacks | 28 |
| SSRF Detector | `modules/ssrf-detector.ts` | Server-side request forgery | 24 |
| Encoding Engine | `modules/encoding-engine.ts` | Base64, hex, URL encoding | 38 |
| Token Analyzer | `modules/token-analyzer.ts` | Token-level attacks | 19 |
| RAG Analyzer | `modules/rag-analyzer.ts` | Retrieval poisoning | 42 |
| VectorDB Interface | `modules/vectordb-interface.ts` | Vector database attacks | 35 |
| DoS Detector | `modules/dos-detector.ts` | Denial of service | 67 |
| Supply Chain | `modules/supply-chain-detector.ts` | Supply chain attacks | 23 |
| Bias Detector | `modules/bias-detector.ts` | Bias and fairness | 41 |
| PII Detector | `modules/pii-detector.ts` | Personal information | 52 |
| Deepfake Detector | `modules/deepfake-detector.ts` | Synthetic media | 18 |
| Social Engineering | `modules/social-engineering-detector.ts` | Social attacks | 36 |
| Image Scanner | `modules/image-scanner.ts` | Visual attacks | 29 |
| Audio Scanner | `modules/audio-scanner.ts` | Audio-based attacks | 31 |

### Validation Framework (Katana)

Comprehensive validation suite for testing the scanner itself:

```typescript
// validation/runner/validation-runner.ts
export interface ValidationConfig {
  // ISO 17025 inspired
  repeatability: boolean;
  reproducibility: boolean;
  uncertainty: boolean;
  traceability: boolean;
  // Custom
  redTeam: boolean;
  corpusAudit: boolean;
}

export async function runValidation(
  config: ValidationConfig
): Promise<ValidationReport> {
  // Runs comprehensive test suite
}
```

### Compliance Framework

Built-in compliance mapping for major frameworks:

```typescript
// compliance/frameworks/nist-ai-rmf.ts
export const NIST_AIRMF_MAPPING = {
  'MAP-1': ['attackdna/lineage-engine', 'compliance/evidence-automation'],
  'MEAS-1': ['validation/confusion-matrix', 'validation/metrics-calculator'],
  'MANAGE-1': ['sengoku/finding-tracker', 'compliance/delta-reporter'],
};
```

---

## Security Model

### Scanner API Security

```typescript
// serve.ts - Hardened HTTP API
const SECURITY_CONFIG = {
  // Rate limiting
  maxRequests: 120,
  windowMs: 60 * 1000,
  
  // Input limits
  maxTextLength: 100 * 1024,      // 100KB text
  maxBinarySize: 50 * 1024 * 1024, // 50MB binary
  
  // Path security
  pathTraversalCheck: true,
  allowedExtensions: ['.txt', '.md', '.json'],
  
  // Response headers
  csp: "default-src 'none'; frame-ancestors 'none'",
};
```

### Web API Authentication

Two-layer authentication model:

```typescript
// lib/api-auth.ts
export async function checkApiAuth(request: Request): Promise<AuthResult> {
  // Layer 1: Same-origin verification
  const isSameOrigin = verifySameOrigin(request);
  if (isSameOrigin) {
    return { allowed: true, method: 'same-origin' };
  }
  
  // Layer 2: API Key validation
  const apiKey = request.headers.get('X-API-Key');
  if (apiKey && await verifyApiKey(apiKey)) {
    return { allowed: true, method: 'api-key' };
  }
  
  return { allowed: false, reason: 'unauthorized' };
}
```

---

## API Reference

### Standalone Scanner API

| Endpoint | Method | Description | Rate Limit |
|----------|--------|-------------|------------|
| `/api/scan` | GET | Scan text for injections | 120/60s |
| `/api/scan-fixture` | GET | Scan fixture file | 120/60s |
| `/api/fixtures` | GET | List fixture categories | 60/60s |
| `/api/read-fixture` | GET | Read fixture content | 60/60s |
| `/api/stats` | GET | Scanner statistics | 60/60s |
| `/api/run-tests` | GET | Run test suite | 10/60s |

### Web API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/scan` | POST | API Key/Same-Origin | Main scan endpoint |
| `/api/llm/models` | GET | Public | List available models |
| `/api/llm/execute` | POST | API Key | Execute LLM test |
| `/api/llm/batch` | POST | API Key | Batch execution |
| `/api/guard/check` | POST | API Key | Guard middleware check |
| `/api/health` | GET | Public | Health check |

---

## Deployment Architecture

### Docker Deployment

```dockerfile
# Multi-stage build for minimal attack surface
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
EXPOSE 42001 8089
CMD ["npm", "start"]
```

### Port Configuration

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Web App | 42001 | HTTP/HTTPS | User interface |
| Scanner | 8089 | HTTP | Standalone API |
| MCP Server | 18000 | HTTP/MCP | Agent testing |

---

## Performance Characteristics

### Scanner Performance

| Metric | Value | Notes |
|--------|-------|-------|
| Throughput | ~10,000 scans/second | Single-threaded |
| Latency (p99) | <5ms | For text <1KB |
| Memory | ~50MB baseline | Core engine |
| Pattern Compilation | Once at startup | Pre-compiled regex |

### Benchmark Suite

```typescript
// benchmark/suites/dojolm-bench.ts
export const BENCHMARKS = {
  'text-100': generateText(100),
  'text-1k': generateText(1000),
  'text-10k': generateText(10000),
  'fixtures-all': loadAllFixtures(),
};
```

---

## Development Workflow

### Testing

```bash
# Unit tests
npm test --workspace=bu-tpi

# Integration tests
npm test --workspace=dojolm-web

# Validation suite
npm run test:validation --workspace=bu-tpi

# Coverage
npm run test:coverage --workspace=bu-tpi
```

### Code Quality

```bash
# Linting
npm run lint

# Type checking
npm run type-check

# Security audit
npm run security:scan

# Documentation validation
npm run verify:docs
```

---

## Conclusion

DojoLM represents a significant advancement in AI security testing technology. Its zero-dependency core, comprehensive pattern library, and modular architecture make it suitable for:

- **Enterprise AI Security**: Production-grade protection for LLM deployments
- **Red Team Operations**: Comprehensive adversarial testing capabilities
- **Compliance Validation**: ISO 42001, NIST AI RMF, and custom framework mapping
- **Research**: Open platform for studying prompt injection attacks

The project's breakthrough innovations in semantic detection, multi-agent security, and multilingual support establish it as the most comprehensive open-source solution for LLM security testing available today.

---

*Document Version: 1.0*
*Last Updated: 2026-03-30*
*Repository: https://github.com/dojolm/dojolm*
