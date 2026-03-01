# Scanner Feature Requirements for Expanded Fixture Coverage

**Document ID:** SCANNER-REQ-2026-03-01-001  
**Version:** 1.0  
**Date:** 2026-03-01  
**Owner:** BlackUnicorn Laboratory  

---

## Executive Summary

To support the expanded fixture plan (+634 fixtures across TA-01 through TA-23), the scanner requires significant new capabilities beyond the current regex-based pattern matching. This document outlines **15 new scanner modules** and **8 capability enhancements** required.

### Current Scanner Capabilities
- ✅ Regex-based pattern matching (PI_PATTERNS, JB_PATTERNS)
- ✅ Text normalization (NFKC, zero-width chars, confusables)
- ✅ Agent output validation
- ✅ Credential theft detection
- ✅ Settings write protection

### Required New Capabilities
| Module | Priority | Complexity | Fixtures Supported |
|--------|----------|------------|-------------------|
| MCP Protocol Parser | P0 | High | TA-21 (+25) |
| Document Parser Engine | P0 | High | TA-23 (+30) |
| Token Analyzer | P1 | High | TA-22 (+20) |
| RAG Context Analyzer | P1 | Medium | TA-07, TA-16 (+20) |
| Vector DB Interface | P1 | High | TA-16 (+15) |
| Email/MIME Parser | P2 | Medium | TA-04 (+5) |
| PDF JavaScript Extractor | P0 | Medium | TA-23 (+6) |
| Office Macro Detector | P0 | Medium | TA-23 (+10) |
| XXE Payload Detector | P1 | Low | TA-03 (+6) |
| Prototype Pollution Detector | P1 | Low | TA-03 (+5) |

---

## Table of Contents

1. [Critical Priority Features (P0)](#1-critical-priority-features-p0)
2. [High Priority Features (P1)](#2-high-priority-features-p1)
3. [Medium Priority Features (P2)](#3-medium-priority-features-p2)
4. [Encoding & Obfuscation Engine](#4-encoding--obfuscation-engine)
5. [Integration Architecture](#5-integration-architecture)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Critical Priority Features (P0)

### 1.1 MCP Protocol Parser & Validator

**Supports:** TA-21 MCP Protocol Security (+25 fixtures)

#### Required Capabilities

```typescript
interface MCPScanner {
  // Parse MCP JSON-RPC 2.0 messages
  parseMessage(raw: string): MCPMessage;
  
  // Validate tool call structure
  validateToolCall(call: ToolCall): ValidationResult;
  
  // Check for capability spoofing
  detectCapabilitySpoofing(caps: ServerCapabilities): Finding[];
  
  // Detect sampling loop attacks
  detectSamplingLoop(messages: MCPMessage[]): Finding[];
  
  // Validate resource URIs
  validateResourceURI(uri: string): ValidationResult;
  
  // Check for tool name typosquatting
  detectToolNameConfusion(
    requestedTool: string,
    availableTools: string[]
  ): Finding[];
}
```

#### Detection Patterns

| Pattern | Description | Severity |
|---------|-------------|----------|
| `capability-spoofing` | Server claims tools/resources it doesn't have | CRITICAL |
| `sampling-loop` | Nested sampling requests > 3 levels deep | CRITICAL |
| `uri-traversal` | Resource URI contains `../` or absolute paths | CRITICAL |
| `tool-typosquatting` | Tool name similar to legitimate (Levenshtein < 3) | HIGH |
| `result-poisoning` | Tool result contains injection patterns | CRITICAL |
| `progress-exhaustion` | Excessive progress notifications | WARNING |
| `cross-server-leak` | References to other server resources | HIGH |

#### Implementation Notes
- Must support both stdio and SSE transport inspection
- Parse JSON-RPC 2.0 batch requests
- Handle MCP protocol version negotiation
- Track sampling context depth

---

### 1.2 Document Parser Engine

**Supports:** TA-23 Document Attacks (+30 fixtures)

#### Required Capabilities

```typescript
interface DocumentScanner {
  // PDF analysis
  parsePDF(buffer: Buffer): PDFDocument;
  extractPDFJavaScript(pdf: PDFDocument): string[];
  extractEmbeddedFiles(pdf: PDFDocument): EmbeddedFile[];
  detectOpenAction(pdf: PDFDocument): OpenAction[];
  
  // Office document analysis
  parseDOCX(buffer: Buffer): DOCXDocument;
  extractMacros(docx: DOCXDocument): Macro[];
  extractOLEObjects(docx: DOCXDocument): OLEObject[];
  detectExternalLinks(docx: DOCXDocument): ExternalLink[];
  
  // Excel analysis
  parseXLSX(buffer: Buffer): XLSXDocument;
  detectFormulaInjection(xlsx: XLSXDocument): Formula[];
  extractConnections(xlsx: XLSXDocument): Connection[];
  
  // Archive analysis
  extractZip(buffer: Buffer): ZipEntry[];
  detectZipSlip(entries: ZipEntry[]): Finding[];
  detectNestedBombs(entries: ZipEntry[], depth: number): Finding[];
}
```

#### File Format Support Matrix

| Format | Parse | Extract JS | Extract Macros | Detect Injection |
|--------|-------|------------|----------------|------------------|
| PDF | ✅ | ✅ | N/A | ✅ |
| DOCX | ✅ | N/A | ✅ | ✅ |
| XLSX | ✅ | N/A | ✅ | ✅ |
| PPTX | ✅ | N/A | ✅ | ⚠️ Partial |
| ODT/ODS | ✅ | N/A | ✅ | ⚠️ Partial |
| RTF | ✅ | N/A | ✅ | ⚠️ Partial |

#### Detection Patterns

| Pattern | File Types | Severity |
|---------|-----------|----------|
| `pdf-javascript` | PDF | CRITICAL |
| `pdf-embedded-exe` | PDF | CRITICAL |
| `pdf-openaction` | PDF | HIGH |
| `docx-macro-vba` | DOCX | CRITICAL |
| `docx-external-link` | DOCX | HIGH |
| `docx-ole-object` | DOCX | HIGH |
| `xlsx-formula-cmd` | XLSX | CRITICAL |
| `xlsx-external-query` | XLSX | HIGH |
| `zip-slip` | ZIP | CRITICAL |
| `archive-bomb` | ZIP, TAR, GZ | WARNING |

#### Dependencies to Add
```json
{
  "pdf-parse": "^1.1.1",
  "mammoth": "^1.6.0",
  "xlsx": "^0.18.5",
  "adm-zip": "^0.5.10",
  "node-unrtf": "^0.3.0"
}
```

---

### 1.3 Prompt Injection Detection Engine (Enhanced)

**Supports:** TA-01 Prompt Injection (+50 fixtures)

While basic PI detection exists, dedicated TA-01 support requires:

#### Enhanced Capabilities

```typescript
interface PromptInjectionScanner {
  // Direct injection detection
  detectDirectInjection(text: string): Finding[];
  
  // Indirect injection (context-aware)
  detectIndirectInjection(
    userInput: string,
    ragContext: string[],
    toolResults: ToolResult[]
  ): Finding[];
  
  // Delimiter analysis
  analyzeDelimiters(text: string): DelimiterAnalysis;
  
  // Multi-modal injection (image + text)
  detectMultimodalInjection(
    text: string,
    ocrText: string,
    metadata: Metadata
  ): Finding[];
  
  // Encoding-aware detection
  detectEncodedInjection(text: string): Finding[];
}
```

#### New Detection Categories

| Category | Patterns | Example |
|----------|----------|---------|
| `delimiter-confusion` | Quotes, comments, escape sequences | `"""system_prompt="""` |
| `context-window-pollution` | Filling buffer to flush instructions | 100K tokens of noise |
| `instruction-sequencing` | Multi-step payload delivery | Turn 1-5 benign, turn 6 attack |
| `rag-poisoning-indicators` | Malicious context patterns | Fake facts, source spoofing |
| `tool-result-poisoning` | Injection in tool outputs | `{"result": "ignore previous..."}` |

---

## 2. High Priority Features (P1)

### 2.1 Token-Level Analyzer

**Supports:** TA-22 Token-Level Attacks (+20 fixtures)

#### Required Capabilities

```typescript
interface TokenAnalyzer {
  // Tokenize text using model's tokenizer
  tokenize(text: string, model: string): Token[];
  
  // Detect token smuggling
  detectTokenSmuggling(tokens: Token[]): Finding[];
  
  // Analyze BPE boundaries
  analyzeBPEBoundaries(tokens: Token[]): BPEAnalysis;
  
  // Detect adversarial tokens (GCG-style)
  detectAdversarialTokens(tokens: Token[]): Finding[];
  
  // Unicode bidirectional analysis
  detectBidirectionalAttacks(text: string): Finding[];
  
  // Homoglyph analysis
  detectHomoglyphAttacks(text: string): Finding[];
}

interface Token {
  id: number;
  text: string;
  bytes: Uint8Array;
  position: number;
}
```

#### Tokenizer Support

| Model | Tokenizer | Library |
|-------|-----------|---------|
| GPT-4/o1/o3 | cl100k_base | tiktoken |
| Claude 3 | claude | @anthropic-ai/tokenizer |
| Llama 3 | llama-3 | @llama-models/tokenizer |
| Gemini | sentencepiece | sentencepiece |

#### Detection Patterns

| Pattern | Description | Severity |
|---------|-------------|----------|
| `token-boundary-split` | Payload split across token boundaries | HIGH |
| `bpe-fragmentation` | Adversarial BPE splitting | HIGH |
| `unicode-rlo` | Right-to-Left Override characters | CRITICAL |
| `unicode-lro` | Left-to-Right Override characters | CRITICAL |
| `homoglyph-cyrillic` | Cyrillic lookalikes | HIGH |
| `homoglyph-greek` | Greek lookalikes | MEDIUM |
| `zero-width-injection` | ZWSP, ZWNJ, ZWJ abuse | HIGH |
| `combining-char-flood` | Excessive combining marks | WARNING |

#### Implementation Example

```typescript
function detectBidirectionalAttacks(text: string): Finding[] {
  const findings: Finding[] = [];
  
  // Unicode directional formatting characters
  const RLO = '\u202E'; // Right-to-Left Override
  const LRO = '\u202D'; // Left-to-Right Override
  const PDF = '\u202C'; // Pop Directional Formatting
  
  const rloCount = (text.match(/\u202E/g) || []).length;
  const lroCount = (text.match(/\u202D/g) || []).length;
  const pdfCount = (text.match(/\u202C/g) || []).length;
  
  if (rloCount > 0 || lroCount > 0) {
    findings.push({
      name: 'unicode_bidirectional_override',
      severity: 'CRITICAL',
      description: `Bidirectional override detected: ${rloCount} RLO, ${lroCount} LRO`,
      position: text.indexOf(RLO) || text.indexOf(LRO),
    });
  }
  
  // Check for unclosed directional formatting
  if (rloCount + lroCount !== pdfCount) {
    findings.push({
      name: 'unclosed_bidirectional_formatting',
      severity: 'HIGH',
      description: 'Unclosed bidirectional formatting characters detected',
    });
  }
  
  return findings;
}
```

---

### 2.2 RAG Context Analyzer

**Supports:** TA-07 Agent Security, TA-16 Vector/Embeddings (+20 fixtures)

#### Required Capabilities

```typescript
interface RAGAnalyzer {
  // Analyze retrieved documents for poisoning
  analyzeRetrievedDocuments(
    query: string,
    documents: Document[],
    similarities: number[]
  ): RAGAnalysis;
  
  // Detect source spoofing
  detectSourceSpoofing(documents: Document[]): Finding[];
  
  // Detect factual inconsistencies
  detectFactualPoisoning(documents: Document[]): Finding[];
  
  // Analyze context window positioning
  analyzeContextPosition(
    documents: Document[],
    windowSize: number
  ): PositionAnalysis;
  
  // Detect multi-hop poisoning
  detectMultiHopPoisoning(
    query: string,
    documents: Document[],
    relationships: Relationship[]
  ): Finding[];
}
```

#### Detection Patterns

| Pattern | Description | Severity |
|---------|-------------|----------|
| `source-spoofing` | Fake source URLs, DOIs, citations | HIGH |
| `authority-impersonation` | Fake academic/institutional affiliation | HIGH |
| `fact-injection` | Subtly false facts in context | CRITICAL |
| `instruction-embedding` | Instructions hidden in documents | CRITICAL |
| `position-manipulation` | Placing poison at context boundaries | MEDIUM |
| `similarity-manipulation` | Adversarial embeddings to boost retrieval | HIGH |

---

### 2.3 Vector Database Interface

**Supports:** TA-16 Vector/Embeddings (+15 fixtures)

#### Required Capabilities

```typescript
interface VectorDBScanner {
  // Connect to vector DB
  connect(config: DBConfig): Connection;
  
  // Extract and analyze embeddings
  extractEmbeddings(
    connection: Connection,
    collection: string
  ): Promise<Embedding[]>;
  
  // Detect anomalous embeddings
  detectAnomalousEmbeddings(embeddings: Embedding[]): Finding[];
  
  // Test for multi-tenant isolation
  testTenantIsolation(
    connection: Connection,
    tenantA: string,
    tenantB: string
  ): Promise<IsolationTestResult>;
  
  // Detect poisoning via similarity analysis
  detectEmbeddingPoisoning(
    embeddings: Embedding[],
    baseline: Embedding[]
  ): Finding[];
}
```

#### Database-Specific Detectors

| Database | Specific Checks | Library |
|----------|-----------------|---------|
| **Pinecone** | Namespace traversal, metadata filtering | @pinecone-database/pinecone |
| **Weaviate** | GraphQL injection, class manipulation | weaviate-ts-client |
| **Chroma** | Collection traversal, persist attacks | chromadb |
| **Qdrant** | Payload injection, filter bypass | @qdrant/qdrant-js |
| **Milvus** | Partition key bypass, RBAC abuse | @zilliz/milvus2-sdk-node |
| **pgvector** | SQL injection via vectors | pg |

---

### 2.4 XXE & Prototype Pollution Detector

**Supports:** TA-03 Output Handling (+11 fixtures for XXE, Prototype Pollution, HPP, Log Injection)

#### XXE Detection

```typescript
interface XXEDetector {
  // Detect XXE in XML payloads
  detectXXE(xml: string): Finding[];
  
  // Detect parameter entities
  detectParameterEntities(xml: string): Finding[];
  
  // Detect XInclude attacks
  detectXInclude(xml: string): Finding[];
}
```

| Pattern | Example | Severity |
|---------|---------|----------|
| `external-entity` | `<!ENTITY xxe SYSTEM "file:///etc/passwd">` | CRITICAL |
| `parameter-entity` | `<!ENTITY % pe SYSTEM "http://evil.com">` | CRITICAL |
| `xinclude` | `<xi:include href="file:///etc/passwd">` | CRITICAL |
| `doctype-decl` | `<!DOCTYPE foo [<!ENTITY xxe...>` | WARNING |

#### Prototype Pollution Detection

```typescript
interface PrototypePollutionDetector {
  // Detect __proto__ pollution
  detectProtoPollution(input: string): Finding[];
  
  // Detect constructor.prototype pollution
  detectConstructorPollution(input: string): Finding[];
  
  // Detect lodash/merge style pollution
  detectMergePollution(input: string): Finding[];
}
```

| Pattern | Example | Severity |
|---------|---------|----------|
| `__proto__-pollution` | `{"__proto__": {"isAdmin": true}}` | CRITICAL |
| `constructor-prototype` | `{"constructor": {"prototype": {...}}}` | CRITICAL |
| `lodash-merge` | `merge({}, JSON.parse(payload))` | HIGH |

---

### 2.5 SSRF Cloud Metadata Detector

**Supports:** TA-03 Output Handling - Cloud SSRF (+12 fixtures)

#### Required Capabilities

```typescript
interface SSRFDetector {
  // Detect cloud metadata URLs
  detectCloudMetadataURLs(text: string): Finding[];
  
  // Detect Kubernetes internal URLs
  detectKubernetesURLs(text: string): Finding[];
  
  // Detect Docker socket access
  detectDockerSocketAccess(text: string): Finding[];
  
  // Detect internal service URLs
  detectInternalServices(text: string): Finding[];
}
```

#### Cloud Metadata Patterns

| Cloud | URL Pattern | Severity |
|-------|-------------|----------|
| **AWS** | `169.254.169.254/latest/meta-data/` | CRITICAL |
| **AWS IMDSv2** | `PUT /latest/api/token` | CRITICAL |
| **GCP** | `metadata.google.internal/computeMetadata/` | CRITICAL |
| **Azure** | `169.254.169.254/metadata/instance/` | CRITICAL |
| **DigitalOcean** | `169.254.169.254/metadata/v1/` | CRITICAL |
| **Oracle** | `192.0.0.192/opc/v1/` | CRITICAL |

#### Kubernetes Patterns

| Pattern | Example | Severity |
|---------|---------|----------|
| `kubernetes-api` | `https://kubernetes.default.svc` | CRITICAL |
| `etcd-access` | `http://etcd:2379` | CRITICAL |
| `kubelet-api` | `http://localhost:10250` | CRITICAL |
| `service-discovery` | `*.svc.cluster.local` | HIGH |

---

## 3. Medium Priority Features (P2)

### 3.1 Email/MIME Parser

**Supports:** TA-04 Delivery Vectors - Email (+5 fixtures)

```typescript
interface EmailScanner {
  // Parse MIME structure
  parseMIME(raw: string): MIMEMessage;
  
  // Extract headers
  analyzeHeaders(headers: Headers): Finding[];
  
  // Analyze body parts
  analyzeBodyParts(parts: MIMEPart[]): Finding[];
  
  // Detect header injection
  detectHeaderInjection(email: string): Finding[];
  
  // Extract and analyze attachments
  analyzeAttachments(attachments: Attachment[]): Finding[];
}
```

#### Detection Patterns

| Pattern | Description | Severity |
|---------|-------------|----------|
| `header-injection` | Newlines in header values | CRITICAL |
| `mime-boundary-manipulation` | Boundary confusion | HIGH |
| `content-type-confusion` | Mismatched content types | MEDIUM |
| `base64-encoded-injection` | Injection in base64 body | HIGH |
| `html-email-xss` | XSS in HTML email | HIGH |

---

### 3.2 WebFetch Security Analyzer

**Supports:** TA-02 WebFetch Expansion (+20 fixtures for CSP, Web Workers, Shadow DOM)

```typescript
interface WebFetchAnalyzer {
  // Analyze CSP headers
  analyzeCSP(headers: Headers): CSPAnalysis;
  
  // Detect CSP bypass attempts
  detectCSPBypass(html: string): Finding[];
  
  // Analyze Shadow DOM content
  analyzeShadowDOM(html: string): Finding[];
  
  // Detect Web Worker abuse
  detectWorkerAbuse(js: string): Finding[];
  
  // Detect ServiceWorker manipulation
  detectServiceWorkerAbuse(sw: string): Finding[];
}
```

#### CSP Bypass Patterns

| Pattern | Description | Severity |
|---------|-------------|----------|
| `unsafe-inline` | CSP allows inline scripts | WARNING |
| `unsafe-eval` | CSP allows eval() | WARNING |
| `wildcard` | CSP uses `*` wildcard | MEDIUM |
| `data-uri-js` | JavaScript in data: URIs | HIGH |
| `jsonp-callback` | JSONP callback manipulation | HIGH |

---

### 3.3 Session & Multi-Turn Analyzer

**Supports:** TA-08 Session Security (+15 fixtures)

```typescript
interface SessionAnalyzer {
  // Analyze conversation flow
  analyzeConversationFlow(turns: Turn[]): FlowAnalysis;
  
  // Detect gradual escalation
  detectGradualEscalation(turns: Turn[]): Finding[];
  
  // Detect context window attacks
  detectContextWindowAttack(turns: Turn[]): Finding[];
  
  // Detect cross-user contamination
  detectCrossUserContamination(
    sessionA: Turn[],
    sessionB: Turn[]
  ): Finding[];
  
  // Analyze attention patterns
  analyzeAttentionPositioning(text: string): PositionAnalysis;
}
```

---

## 4. Encoding & Obfuscation Engine

### 4.1 Multi-Layer Decoder

**Supports:** All categories with encoding variants (+82 fixtures)

```typescript
interface EncodingEngine {
  // Detect encoding type
  detectEncoding(text: string): EncodingType[];
  
  // Decode single layer
  decode(text: string, encoding: EncodingType): string;
  
  // Multi-layer decoding
  decodeRecursive(
    text: string,
    maxDepth: number
  ): DecodedResult[];
  
  // Score decoded content for injection
  scoreInjectionLikelihood(decoded: string): number;
}

type EncodingType = 
  | 'base64' | 'base64url' | 'base32' | 'base16'
  | 'url' | 'html-entity' | 'unicode-escape'
  | 'hex' | 'binary' | 'rot13' | 'rot47'
  | 'zero-width' | 'homoglyph' | 'leetspeak'
  | 'morse' | 'punycode';
```

#### Supported Encodings

| Encoding | Detection | Decode | Complexity |
|----------|-----------|--------|------------|
| Base64 | ✅ | ✅ | Low |
| Base64url | ✅ | ✅ | Low |
| URL encoding | ✅ | ✅ | Low |
| HTML entities | ✅ | ✅ | Low |
| Unicode escape | ✅ | ✅ | Low |
| Hex | ✅ | ✅ | Low |
| ROT13 | ✅ | ✅ | Low |
| ROT47 | ✅ | ✅ | Low |
| Zero-width | ✅ | Strip | Low |
| Homoglyph | ✅ | Normalize | Medium |
| Leetspeak | ✅ | Partial | High |
| Morse | ✅ | ✅ | Low |
| Punycode | ✅ | ✅ | Low |

### 4.2 Automatic Variant Generator

```typescript
interface VariantGenerator {
  // Generate encoding variants
  generateVariants(payload: string): Variant[];
  
  // Generate context variants
  generateContextVariants(
    payload: string,
    contexts: Context[]
  ): Variant[];
  
  // Generate combination attacks
  generateComboAttacks(
    attackA: string,
    attackB: string
  ): Variant[];
}
```

---

## 5. Integration Architecture

### 5.1 Scanner Pipeline

```
Input
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                    PREPROCESSING                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Encoding   │  │    MIME      │  │   File Format    │   │
│  │   Detection  │  │   Parser     │  │   Identification │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                    DETECTION LAYERS                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Pattern    │  │   Semantic   │  │   Behavioral     │   │
│  │   Matching   │  │   Analysis   │  │   Analysis       │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
┌─────────────────────────────────────────────────────────────┐
│                    POST-PROCESSING                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Severity   │  │   Category   │  │   Confidence     │   │
│  │   Scoring    │  │   Mapping    │  │   Calculation    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
  │
  ▼
Findings
```

### 5.2 Module Registration

```typescript
interface ScannerModule {
  name: string;
  version: string;
  supportedCategories: string[];
  
  // Main scan function
  scan(input: ScanInput): Promise<Finding[]>;
  
  // Preprocessing hook
  preprocess?(input: ScanInput): ScanInput;
  
  // Postprocessing hook
  postprocess?(findings: Finding[]): Finding[];
}

// Module registry
const scannerRegistry = new Map<string, ScannerModule>();

// Register modules
scannerRegistry.register('mcp', new MCPScannerModule());
scannerRegistry.register('document', new DocumentScannerModule());
scannerRegistry.register('token', new TokenAnalyzerModule());
scannerRegistry.register('rag', new RAGAnalyzerModule());
```

### 5.3 Configuration Schema

```typescript
interface ScannerConfig {
  // Enabled modules
  modules: {
    mcp: boolean;
    document: boolean;
    token: boolean;
    rag: boolean;
    vectorDB: boolean;
    email: boolean;
    webFetch: boolean;
    xxe: boolean;
    prototypePollution: boolean;
  };
  
  // Detection thresholds
  thresholds: {
    minSeverity: Severity;
    confidenceThreshold: number;
    encodingDepth: number;
  };
  
  // External integrations
  integrations: {
    tiktoken?: TiktokenConfig;
    vectorDB?: DBConfig;
    emailParser?: EmailConfig;
  };
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Task | Duration | Dependencies |
|------|----------|--------------|
| Document Parser Engine (PDF) | 1 week | pdf-parse |
| Document Parser Engine (Office) | 1 week | mammoth, xlsx |
| XXE Detector | 3 days | xml2js |
| Prototype Pollution Detector | 3 days | None |
| Enhanced PI Patterns | 1 week | None |

**Deliverable:** TA-23 (Documents), TA-03 (XXE/Prototype) support

### Phase 2: Protocol Support (Weeks 5-8)

| Task | Duration | Dependencies |
|------|----------|--------------|
| MCP Protocol Parser | 2 weeks | None |
| MCP Validators | 1 week | Phase 1 |
| Token Analyzer (Basic) | 1 week | tiktoken |
| Email/MIME Parser | 1 week | mailparser |

**Deliverable:** TA-21 (MCP), TA-22 (Token), TA-04 (Email) support

### Phase 3: Advanced Features (Weeks 9-14)

| Task | Duration | Dependencies |
|------|----------|--------------|
| RAG Context Analyzer | 2 weeks | Vector DB clients |
| Vector DB Interface | 2 weeks | DB-specific SDKs |
| Token Analyzer (Advanced) | 2 weeks | Tokenizer models |
| SSRF Cloud Detector | 1 week | None |
| WebFetch Analyzer | 1 week | None |

**Deliverable:** TA-07, TA-16 (Vector), TA-03 (SSRF), TA-02 (WebFetch) support

### Phase 4: Integration & Optimization (Weeks 15-18)

| Task | Duration | Dependencies |
|------|----------|--------------|
| Module Registry | 1 week | Phases 1-3 |
| Pipeline Architecture | 1 week | Module Registry |
| Performance Optimization | 2 weeks | All modules |
| Testing & Validation | 2 weeks | All modules |

**Deliverable:** Production-ready scanner with all features

---

## Resource Requirements

### Development Team

| Role | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|------|---------|---------|---------|---------|-------|
| Senior Security Engineer | 2 | 2 | 2 | 1 | 7 weeks |
| Backend Engineer | 1 | 2 | 2 | 2 | 7 weeks |
| ML Engineer | 0 | 0 | 1 | 0 | 2 weeks |
| QA Engineer | 0 | 1 | 1 | 2 | 4 weeks |

### Infrastructure

| Resource | Purpose | Cost Estimate |
|----------|---------|---------------|
| Vector DB instances | Testing TA-16 | $500/month |
| Tokenizer models | TA-22 testing | $200/month |
| CI/CD runners | Automated testing | $300/month |

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Fixture Coverage | 1,545 | 2,179 (+41%) |
| Detection Rate (known) | ~85% | >95% |
| False Positive Rate | ~5% | <3% |
| Avg Scan Time | <100ms | <200ms (with new features) |
| Module Count | 4 | 15 |

---

## Appendix: Dependency Impact

### New Runtime Dependencies

```json
{
  "production": {
    "@anthropic-ai/tokenizer": "^0.0.4",
    "adm-zip": "^0.5.10",
    "mailparser": "^3.6.5",
    "mammoth": "^1.6.0",
    "pdf-parse": "^1.1.1",
    "tiktoken": "^1.0.11",
    "weaviate-ts-client": "^1.6.0",
    "xlsx": "^0.18.5",
    "xml2js": "^0.6.2"
  },
  "optional": {
    "@pinecone-database/pinecone": "^2.0.0",
    "@qdrant/qdrant-js": "^1.7.0",
    "chromadb": "^1.8.0",
    "@zilliz/milvus2-sdk-node": "^2.3.0"
  }
}
```

### Bundle Size Impact

| Module | Size Increase |
|--------|--------------|
| Document Parser | +2.5 MB |
| Token Analyzer | +1.8 MB |
| MCP Parser | +50 KB |
| Email Parser | +800 KB |
| RAG Analyzer | +300 KB |
| **Total** | **~5.5 MB** |

---

**Document Status:** Requirements Complete  
**Next Action:** Prioritize Phase 1 implementation
