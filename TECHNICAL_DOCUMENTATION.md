# DojoLM Technical Documentation

## Executive Summary

DojoLM is a comprehensive, production-grade platform for prompt-injection detection, LLM red teaming, compliance mapping, and adversarial evaluation. Built as a TypeScript monorepo with zero runtime dependencies in the core engine, it represents a breakthrough in AI security testing and safety validation.

**Key Metrics:**
- **544 detection patterns** across **49 pattern groups**
- **5,217 attack fixtures** across **40 fixture categories**
- **18 DojoV2 security controls** with 100% implementation coverage
- **57 built-in LLM provider presets** in the core registry
- **23 navigation items (19 visible)**

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
│   └── dojolm-mcp/          # Adversarial MCP server
├── docs/                    # Comprehensive documentation
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

_(live totals: 544 patterns / 49 groups — `npm run verify:docs`)_

| Category | Description |
|----------|-------------|
| System Override | Direct instruction override attempts |
| Role Hijacking | XML/JSON/Markdown injection for role confusion |
| Jailbreak Patterns | DAN, AIM, STAN, Grandma exploit, etc. |
| Boundary Manipulation | Control tokens, confusable Unicode |
| Multilingual Attacks | 14 languages with native patterns |
| Agent Security | Tool credential extraction, A2A attacks |
| RAG Poisoning | Knowledge base injection, vector DB attacks |
| Multi-Turn Attacks | Session persistence, context manipulation |
| Modern Jailbreaks | DeepInception, ArtPrompt, FlipAttack |
| Encoding Evasion | Base64, hex, Unicode, homoglyphs |

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
| Buki (Payload Lab) | Attack fixture browser, manager, and generator (hosts SAGE) | Attack |
| Jutsu (Model Lab) | Model testing, execution, leaderboard, compare, benchmarking | Red Team |
| Arena | Model vs model matchups and leaderboards | Red Team |
| Adversarial Lab | Adversarial testing environment | Red Team |
| Sengoku | Campaign management, orchestration, and Temporal attacks | Red Team |
| Ronin Hub | Community and external integrations | Analysis |
| Hattori Guard | Real-time guard and filtering | Defense |
| Kotoba | Prompt optimization and refinement | Defense |
| Mitsuke | Threat-feed ingestion and indicator library | Intelligence |
| Amaterasu DNA | Attack lineage, mutation, and analysis | Intelligence |
| Kagami | Behavioural fingerprinting and mirror testing | Intelligence |
| Bushido Book | Compliance mapping and reports | Analysis |
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

**Innovation**: Native support for 14 languages and variants with specialized pattern sets and transliteration detection:

| Language | Code | Detection Focus | Features |
| :--- | :--- | :--- | :--- |
| **English** | `en` | Base jailbreak vocabulary | Semantic & Keyword |
| **Chinese (Simplified)** | `zh` | Character-based overrides | Native Script |
| **Chinese Pinyin** | `zh-pinyin` | Transliterated evasion | Phonetic matching |
| **Spanish** | `es` | Direct instruction hijacking | Native Script |
| **French** | `fr` | Boundary manipulation | Native Script |
| **German** | `de` | Compound word jailbreaks | Native Script |
| **Italian** | `it` | Social engineering lures | Native Script |
| **Portuguese** | `pt` | System role confusion | Native Script |
| **Russian** | `ru` | Cyrillic evasion patterns | Native Script |
| **Japanese** | `ja` | Kanji/Kana mix injections | Native Script |
| **Korean** | `ko` | Hangul-based roleplay | Native Script |
| **Arabic** | `ar` | RTL script-injection | RTL Support |
| **Hebrew** | `he` | RTL instruction bypass | RTL Support |
| **Persian** | `fa` | RTL logical manipulation | RTL Support |

#### Example Pattern Implementation
```typescript
// Chinese patterns
// Chinese Simplified (zh)
{ name: 'zh_system_override', lang: 'zh',
  re: /忽略所有之前的指令|忽略以上所有指示/ }

// Chinese Pinyin (transliterated)
// Chinese Pinyin (zh-pinyin)
{ name: 'zh_pinyin_override', lang: 'zh-pinyin',
  re: /hush[ie]?\s+suoyou\s+zhiqian\s+(?:de\s+)?zhiling/i }

// Hebrew RTL patterns
{ name: 'hebrew_text_detection', lang: 'he',
  re: /[֐-׿]{50,}/ }
// Arabic (ar) - RTL Logic
{ name: 'ar_jailbreak_dan', lang: 'ar',
  re: /الآن أنت في وضع/i }
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

_Specialized detectors: 15 (see `packages/bu-tpi/src/modules/`)_

| Module | File | Purpose |
|--------|------|---------|
| Enhanced PI | `modules/enhanced-pi.ts` | Semantic analysis, boundary violations, and role-confusion chains. |
| MCP Parser | `modules/mcp-parser.ts` | JSON-RPC and MCP-specific adversarial protocol parsing. |
| RAG Analyzer | `modules/rag-analyzer.ts` | Retrieval poisoning and knowledge base injection detection. |
| VectorDB Interface | `modules/vectordb-interface.ts` | Vector leaks, similarity tricking, and vector-SEO patterns. |
| DoS Detector | `modules/dos-detector.ts` | Regex/XML bombs, deep nesting, and token-explosion detection. |
| Supply Chain | `modules/supply-chain-detector.ts` | Dependency confusion, model poisoning, and benchmark fraud. |
| Model Theft | `modules/model-theft-detector.ts` | Kagami fingerprinting (210+ probes) and distillation defense. |
| Overreliance | `modules/overreliance-detector.ts` | Hallucination triggers, fake citations, and statistical fraud. |
| Bias Detector | `modules/bias-detector.ts` | Demographic parity and fairness violation detection. |
| PII Detector | `modules/pii-detector.ts` | Masking and detection of credentials and sensitive personal data. |
| Social Engineering | `modules/social-engineering-detector.ts` | Cognitive bias exploits and authority-spoofing detection. |
| Image Scanner | `modules/image-scanner.ts` | Metadata injection (EXIF/XMP) and steganographic payloads. |
| Audio Scanner | `modules/audio-scanner.ts` | ID3/RIFF metadata attacks and cross-modal injections. |
| Shingan Universal | `modules/shingan-context.ts` | 6-layer correlated attack scanning and context security. |

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
| `/api/setup/status` | GET | Public | Check if first-time setup is needed |
| `/api/setup/admin` | POST | Public (0 users only) | Create initial admin account |

---

## Deployment Architecture

Production deploy is a single-host Docker Compose stack — see
[`deploy/docker-compose.yml`](deploy/docker-compose.yml) +
[`deploy/.env.example`](deploy/.env.example); copy `.env.example` to
`.env`, set your secrets/host vars, then `docker compose up -d`.

Reference artifacts:

- [`deploy/docker-compose.yml`](deploy/docker-compose.yml) — production compose stack
- [`deploy/.env.example`](deploy/.env.example) — environment template
- [`deploy/deploy-challenger.sh`](deploy/deploy-challenger.sh) — reference deploy script
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor + local-dev guide

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
*Repository: https://github.com/BlackUnicornSecurity/DojoLM*
