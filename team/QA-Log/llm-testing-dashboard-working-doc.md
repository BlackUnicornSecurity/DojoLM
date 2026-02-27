# LLM Testing Dashboard - Master Working Document

**Project:** BU-TPI LLM Model Testing & Rating Dashboard
**Last Updated:** 2026-02-25
**Status:** PENDING USER VALIDATION

---

## INDEX

| Section | Description | Line |
|---------|-------------|------|
| [SME Review Summary](#sme-review-summary) | Key findings and recommendations | 8 |
| [Context & Requirements](#context--requirements) | User requirements and coverage analysis | 45 |
| [Implementation Plan](#implementation-plan) | 7 phases with file structure | 150 |
| [Epics Breakdown](#epics-breakdown) | 7 epics with dependencies | 250 |
| [Stories Detail](#stories-detail) | 31 user stories with AC | 380 |
| [Performance SLAs](#performance-slas) | Service level agreements | 800 |
| [User Personas](#user-personas) | 3 primary personas | 850 |
| [Security Requirements](#security-requirements) | Updated security with STRIDE | 950 |
| [Success Metrics](#success-metrics) | Phase-by-phase metrics | 1050 |
| [API Endpoints](#api-endpoints) | Complete API reference | 1150 |
| [Dependencies](#dependencies) | NPM packages to install | 1200 |

**Quick Navigation:** Use Ctrl+F / Cmd+F to search section headers

---

## SME Review Summary

**Last Reviewed:** 2026-02-25
**Reviewers:** BMM Architect, BMM Analyst, BMM PM, Security Expert
**Overall Assessment:** 7.5/10 - Strong foundation with critical improvements needed

### Key Findings

| Category | Finding | Severity | Action |
|----------|---------|----------|--------|
| Architecture | LLMContext won't scale with 7,600+ executions | CRITICAL | Partition into 3 contexts |
| Architecture | File storage has no migration path | HIGH | Create storage abstraction layer |
| Product | Pattern expansion blocks all value delivery | CRITICAL | Move to Phase 3 |
| Product | Current plan is v1.0, not MVP | HIGH | Ship single-model testing first |
| Security | API keys in plain JSON | CRITICAL | Implement AES-256 encryption |
| Security | No authentication on endpoints | CRITICAL | Add API key or user auth |
| Security | No rate limiting | CRITICAL | Implement rate limiting |
| Requirements | No user personas documented | CRITICAL | Create 3 detailed personas |
| Requirements | No performance SLAs defined | CRITICAL | Define max test time, refresh rate |
| Business | No success metrics defined | HIGH | Define adoption, engagement targets |

### Recommendations Summary

**Must Fix Before Implementation:**
1. Partition LLMContext into 3 contexts (Models, Execution, Results)
2. Create storage abstraction layer for database migration
3. Implement API key encryption (AES-256)
4. Add authentication/authorization middleware
5. Define performance SLAs (max 30s per test)
6. Create user personas and validate with interviews

**Recommended Approach - MVP First:**
- **Phase 1 (MVP):** Single-model testing, OpenAI + Anthropic only, 2-3 sprints (~50 points)
- **Phase 2:** Multi-model, batch testing, comparison views, 2-3 sprints (~40 points)
- **Phase 3:** Coverage view and pattern expansion to 100%, 2-3 sprints (~45 points)
- **Phase 4:** Security hardening and polish, 2-3 sprints (~50 points)

**Revised Total:** ~185 points across 8-10 sprints (with new security/architecture stories: ~237 points)

---

## Context & Requirements

### User Requirements (Confirmed)

| Requirement | Choice |
|-------------|--------|
| LLM Interface | **Direct API calls** to OpenAI, Anthropic, Ollama, z.ai, moonshot.ai |
| Scoring | **Both combined**: Prompt injection success + Response harmfulness |
| Reports | **Both formats**: JSON + PDF/Markdown |
| Dashboard | **ALL 4 views**: Comparison, Individual, Leaderboard, Coverage |
| Data Storage | **File-based JSON** (consistent with current BU-TPI) |
| Updates | **Real-time** dashboard refresh during testing |
| Retention | **Keep all, filter duplicates** |
| Coverage | **100% OWASP LLM + Crowdstrike TPI** |

### Current Coverage Analysis

#### OWASP LLM Top 10 Coverage

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| LLM01: Prompt Injection | 85% | 100% | +15% |
| LLM02: Insecure Output Handling | 60% | 100% | +40% |
| LLM03: Training Data Poisoning | 30% | 100% | +70% |
| LLM04: Model Denial of Service | 50% | 100% | +50% |
| LLM05: Supply Chain Vulnerabilities | 40% | 100% | +60% |
| LLM06: Sensitive Information Disclosure | 70% | 100% | +30% |
| LLM07: Insecure Plugin Design | 45% | 100% | +55% |
| LLM08: Excessive Agency | 35% | 100% | +65% |
| LLM09: Overreliance | 20% | 100% | +80% |
| LLM10: Model Theft | 10% | 100% | +90% |

#### Crowdstrike TPI Coverage

| Story | Current | Target | Gap |
|-------|---------|--------|-----|
| TPI-01: Direct Instruction Override | 95% | 100% | +5% |
| TPI-02: Indirect Instruction Override | 75% | 100% | +25% |
| TPI-03: Personality/Role Adoption | 90% | 100% | +10% |
| TPI-04: Cognitive Distortion | 70% | 100% | +30% |
| TPI-05: Authority Exploitation | 80% | 100% | +20% |
| TPI-06: Emotional Manipulation | 50% | 100% | +50% |
| TPI-07: Boundary Testing | 85% | 100% | +15% |
| TPI-08: Context Manipulation | 60% | 100% | +40% |
| TPI-09: Format Exploitation | 75% | 100% | +25% |
| TPI-10: Encoding Obfuscation | 80% | 100% | +20% |
| TPI-11: Multilingual Attacks | 95% | 100% | +5% |
| TPI-12: Few-shot Prompt Injection | 65% | 100% | +35% |
| TPI-13: Tool/Function Hijacking | 40% | 100% | +60% |
| TPI-14: RAG Injection | 30% | 100% | +70% |
| TPI-15: Multimodal Injection | 25% | 100% | +75% |
| TPI-16: Steganography | 20% | 100% | +80% |
| TPI-17: Side-channel Attacks | 15% | 100% | +85% |
| TPI-18: Adversarial Examples | 35% | 100% | +65% |
| TPI-19: Cross-prompt Injection | 45% | 100% | +55% |
| TPI-20: Multi-turn Attacks | 55% | 100% | +45% |

---

## Implementation Plan

### Phase 0: Pattern Expansion - 100% OWASP LLM & Crowdstrike TPI Coverage

**MOVED TO PHASE 3** per SME feedback - MVP should ship first with existing patterns.

**Original Goal:** Expand scanner patterns to achieve full coverage of both taxonomies

**Files to Modify:**
- `/packages/dojolm-scanner/src/scanner.ts` - Add new pattern groups
- `/packages/dojolm-scanner/src/patterns/` - New pattern files for expanded coverage

**Files to Create:**
- `/packages/dojolm-scanner/src/patterns/owasp-llm.ts` - OWASP LLM specific patterns
- `/packages/dojolm-scanner/src/patterns/tpi-expansion.ts` - Missing TPI patterns
- `/packages/dojolm-scanner/src/patterns/multimodal.ts` - Multimodal injection patterns
- `/packages/dojolm-scanner/src/patterns/steganography.ts` - Steganography detection

**Summary of New Patterns to Add:**
- OWASP LLM: ~200 new patterns across 10 categories
- Crowdstrike TPI: ~180 new patterns across 20 stories
- **Total: ~380 new patterns**

### Phase 1: Core Infrastructure

**Files to Create:**

1. `/packages/dojolm-web/src/lib/llm-types.ts` - Core type definitions
2. `/packages/dojolm-web/src/lib/llm-constants.ts` - Provider configurations
3. `/packages/dojolm-web/src/lib/llm-scoring.ts` - Scoring algorithm

**Data Models:**
```typescript
// Core types
LLMProvider = 'openai' | 'anthropic' | 'ollama' | 'google' | 'cohere' | 'zai' | 'moonshot' | 'custom'

LLMModelConfig {
  id, name, provider, model, apiKey?, baseUrl?, enabled
}

LLMPromptTestCase {
  id, name, category, prompt, expectedBehavior, severity
  owaspCategory?: string  // LLM01-LLM10
  tpiStory?: string       // TPI-01 to TPI-20
}

LLMTestExecution {
  id, testCaseId, modelConfigId, timestamp, status
  prompt, response?, error?, duration_ms
  injectionSuccess, harmfulness, resilienceScore (0-100)
  scanResult?
  categoriesPassed: string[]
  categoriesFailed: string[]
  owaspCoverage: Record<string, boolean>
  tpiCoverage: Record<string, boolean>
  contentHash: string
}

LLMModelReport {
  modelConfigId, modelName, testCount, avgResilienceScore
  injectionSuccessRate, harmfulnessRate, byCategory[]
  owaspCoverage: { category: string, passRate: number }[]
  tpiCoverage: { story: string, passRate: number }[]
  overallCoveragePercent: number
}
```

**Scoring Algorithm:**
- Injection Success: 40% weight
- Response Harmfulness: 40% weight
- Scanner Detection: 20% weight
- Coverage Bonus: +5% for each full category passed (max 20% total)
- Final score: 0-100 (higher = more resilient)

### Phase 2: LLM Provider Integration

**Files to Create:**

1. `/packages/dojolm-web/src/lib/llm-providers.ts` - Provider adapter interface
2. `/packages/dojolm-web/src/lib/providers/openai.ts` - OpenAI adapter
3. `/packages/dojolm-web/src/lib/providers/anthropic.ts` - Anthropic adapter
4. `/packages/dojolm-web/src/lib/providers/ollama.ts` - Ollama adapter
5. `/packages/dojolm-web/src/lib/providers/zai.ts` - z.ai (GLM) adapter
6. `/packages/dojolm-web/src/lib/providers/moonshot.ts` - Moonshot.ai adapter
7. `/packages/dojolm-web/src/components/llm/ModelConfigPanel.tsx` - Model config UI

**Provider Details:**

| Provider | Base URL | Models | OpenAI Compatible |
|----------|----------|--------|-------------------|
| OpenAI | `https://api.openai.com/v1` | gpt-4o, gpt-4o-mini | Native |
| Anthropic | `https://api.anthropic.com` | claude-3-5-sonnet, claude-3-haiku | Native SDK |
| Ollama | `http://localhost:11434` | llama3, mistral, etc. | Custom |
| z.ai | `https://api.z.ai/api/anthropic` | glm-4.7, glm-4-flash | Yes |
| moonshot.ai | `https://api.moonshot.cn/v1` | moonshot-v1-8k, kimi-latest | Yes |

### Phase 3: Test Execution Engine

**Files to Create:**

1. `/packages/dojolm-web/src/lib/LLMContext.tsx` - State management (PARTITIONED)
2. `/packages/dojolm-web/src/lib/storage/storage-interface.ts` - Storage abstraction
3. `/packages/dojolm-web/src/lib/storage/file-storage.ts` - File-based implementation
4. `/packages/dojolm-web/src/lib/llm-api.ts` - API client functions
5. `/packages/dojolm-web/src/app/api/llm/models/route.ts` - GET/POST model configs
6. `/packages/dojolm-web/src/app/api/llm/test-cases/route.ts` - GET/POST test cases
7. `/packages/dojolm-web/src/app/api/llm/execute/route.ts` - POST single test
8. `/packages/dojolm-web/src/app/api/llm/batch/route.ts` - POST batch execution
9. `/packages/dojolm-web/src/app/api/llm/results/route.ts` - GET/PATCH/DELETE results
10. `/packages/dojolm-web/src/app/api/llm/stream/route.ts` - SSE endpoint
11. `/packages/dojolm-web/src/components/llm/TestExecutionPanel.tsx` - Test runner UI

**Storage:** File-based in `/packages/dojolm-web/data/llm-results/`

### Phase 4: Dashboard UI & Results

**Files to Create:**

1. `/packages/dojolm-web/src/components/llm/ResultsView.tsx` - Main container
2. `/packages/dojolm-web/src/components/llm/ComparisonView.tsx` - Side-by-side
3. `/packages/dojolm-web/src/components/llm/IndividualView.tsx` - Single model
4. `/packages/dojolm-web/src/components/llm/LeaderboardView.tsx` - Ranked list
5. `/packages/dojolm-web/src/components/llm/CoverageView.tsx` - Coverage bars
6. `/packages/dojolm-web/src/components/llm/ResponseEvaluator.tsx` - Manual scoring
7. `/packages/dojolm-web/src/components/llm/RealtimeUpdater.tsx` - SSE client

### Phase 5: Report Generation

**Files to Create:**

1. `/packages/dojolm-web/src/lib/llm-reports.ts` - Report generation
2. `/packages/dojolm-web/src/app/api/llm/reports/route.ts` - GET report endpoint
3. `/packages/dojolm-web/src/components/llm/ReportExporter.tsx` - Export UI

### Phase 6: Integration & Polish

**Files to Modify:**

1. `/packages/dojolm-web/src/app/page.tsx` - Add LLMDashboardTab
2. `/packages/dojolm-web/src/lib/constants.ts` - Add LLM tab to TABS array
3. `/packages/dojolm-web/src/app/layout.tsx` - Update metadata

---

## Epics Breakdown

| Epic ID | Name | Phase | Stories | Priority |
|---------|------|-------|---------|----------|
| EPI-001 | Pattern Expansion to 100% Coverage | 3 | 3 | CRITICAL |
| EPI-002 | Core Infrastructure | 1 | 6 | HIGH |
| EPI-003 | LLM Provider Integration | 1 | 6 | HIGH |
| EPI-004 | Test Execution Engine | 2 | 9 | HIGH |
| EPI-005 | Dashboard UI & Results | 2 | 7 | MEDIUM |
| EPI-006 | Report Generation | 2 | 3 | MEDIUM |
| EPI-007 | Integration & Polish | 3 | 6 | LOW |

### Epic Dependencies

```
EPI-002 (Core Infrastructure)
    ↓
EPI-003 (Provider Integration) ─┐
    ↓                           │
EPI-004 (Test Execution) <──────┘
    ↓
EPI-005 (Dashboard UI)
    ↓
EPI-006 (Report Generation)
    ↓
EPI-007 (Integration & Polish)

EPI-001 (Pattern Expansion) - Can run parallel to EPI-002-004
```

---

## Stories Detail

### EPI-001: Pattern Expansion (3 stories, 21 points)

**Moved to Phase 3 per MVP feedback**

#### STORY-001-01: Add OWASP LLM Missing Patterns (8→13 points)
- Create `/packages/dojolm-scanner/src/patterns/owasp-llm.ts`
- Add ~200 new patterns covering LLM02-LLM10
- Each pattern: name, regex, category, severity

#### STORY-001-02: Add Crowdstrike TPI Missing Patterns (8→13 points)
- Create `/packages/dojolm-scanner/src/patterns/tpi-expansion.ts`
- Add ~180 new patterns covering TPI-06, TPI-13 to TPI-20
- Create multimodal.ts and steganography.ts

#### STORY-001-03: Test Coverage Validation (5 points)
- Create test cases in `llm-test-cases.json`
- Each pattern maps to at least one test case
- Coverage report shows 100%

### EPI-002: Core Infrastructure (6 stories, 18 points)

#### STORY-002-01: Core Type Definitions (3 points)
- Create `llm-types.ts`
- Define LLMProvider, LLMModelConfig, LLMPromptTestCase

#### STORY-002-02: Test Execution & Report Data Models (3 points)
- Define LLMTestExecution, LLMModelReport, LLMBatchExecution
- Include OWASP/TPI coverage fields, contentHash

#### STORY-002-03: Scoring Algorithm with Coverage Metrics (5 points)
- Create `llm-scoring.ts`
- 40/40/20 weights + 5% coverage bonus (max 20%)
- Score capping at 100, edge case handling

#### STORY-002-04: Provider Constants & Configurations (2 points)
- Create `llm-constants.ts`
- Provider base URLs, default models, rate limits

#### STORY-002-05: Storage Abstraction Layer (NEW, 5 points)
- Create `storage-interface.ts`
- IStorageBackend interface for future database migration

#### STORY-002-06: Provider Error Types (NEW, 3 points)
- Create ProviderError class hierarchy
- RateLimitError, AuthError, NetworkError

### EPI-003: LLM Provider Integration (6 stories, 26 points)

#### STORY-003-01: Provider Adapter Interface (3 points)
- Create `llm-providers.ts`
- LLMProviderAdapter interface with execute, streamExecute, validateConfig

#### STORY-003-02: OpenAI Provider (z.ai, moonshot.ai) (5 points)
- Create `providers/openai.ts`
- Support custom base URLs, error handling, retry logic

#### STORY-003-03: Anthropic Provider (5 points)
- Create `providers/anthropic.ts`
- Claude 3.5 Sonnet and Haiku support

#### STORY-003-04: Ollama Provider (3 points)
- Create `providers/ollama.ts`
- Configurable base URL, localhost default

#### STORY-003-05: Model Configuration UI Panel (5 points)
- Create `ModelConfigPanel.tsx`
- Form fields, API key masking, validation

#### STORY-003-06: Cost Management UI (NEW, 5 points)
- Cost calculator before execution
- Budget alerts at 80%, 90%
- Cost tracking per model

### EPI-004: Test Execution Engine (9 stories, 48 points)

#### STORY-004-01: State Management - Partitioned (3 points)
- Create 3 contexts: LLMModelContext, LLMExecutionContext, LLMResultsContext
- Prevents performance issues with 7,600+ executions

#### STORY-004-02: API Client Functions (5 points)
- Create `llm-api.ts`
- getModels, saveModel, executeTest, getResults

#### STORY-004-03: Model Configs API Routes (3 points)
- Create `api/llm/models/route.ts`
- GET/POST/DELETE, file storage

#### STORY-004-04: Test Cases API Routes (3 points)
- Create `api/llm/test-cases/route.ts`
- GET with OWASP/TPI filters

#### STORY-004-05: Execution API Routes (8→10 points)
- Create `api/llm/execute/route.ts` and `api/llm/batch/route.ts`
- Single and batch execution, deduplication

#### STORY-004-06: Results API & SSE Streaming (8→10 points)
- Create `api/llm/results/route.ts` and `api/llm/stream/route.ts`
- GET/PATCH/DELETE, SSE with event IDs for reconnection

#### STORY-004-07: Rate Limiting Middleware (NEW, 5 points)
- 100 requests per 15 minutes per IP
- Per-model budget limits

#### STORY-004-08: Result Caching (NEW, 5 points)
- Cache LLM responses by contentHash
- Cache hit rate tracking

#### STORY-004-09: File Storage Implementation (NEW, 3 points)
- Create `storage/file-storage.ts`
- Implement IStorageBackend interface

### EPI-005: Dashboard UI & Results (7 stories, 37 points)

#### STORY-005-01: Results View Container (3 points)
- Create `ResultsView.tsx`
- Tab navigation for 4 views

#### STORY-005-02: Comparison View Component (5 points)
- Create `ComparisonView.tsx`
- Side-by-side model responses

#### STORY-005-03: Individual View Component (5 points)
- Create `IndividualView.tsx`
- Single model detailed report

#### STORY-005-04: Leaderboard View Component (5 points)
- Create `LeaderboardView.tsx`
- Ranked table by score

#### STORY-005-05: Coverage View Component (8 points)
- Create `CoverageView.tsx`
- OWASP/TPI coverage bars, gap analysis

#### STORY-005-06: Response Evaluator (Manual Scoring) (3 points)
- Create `ResponseEvaluator.tsx`
- Manual override with audit trail

#### STORY-005-07: Real-time Updater (SSE Client) (5 points)
- Create `RealtimeUpdater.tsx`
- SSE connection with reconnection

#### STORY-005-08: Score Interpretation Guide (NEW, 3 points)
- Score bands: 90-100 Excellent, 75-89 Good, 60-74 Fair, <60 Poor
- Peer comparison, remediation guidance

### EPI-006: Report Generation (3 stories, 11 points)

#### STORY-006-01: Report Generation Library (5 points)
- Create `llm-reports.ts`
- JSON, Markdown, PDF generation

#### STORY-006-02: Report API Endpoint (3 points)
- Create `api/llm/reports/route.ts`
- GET with modelId and format params

#### STORY-006-03: Report Exporter UI Component (3 points)
- Create `ReportExporter.tsx`
- Model/format selectors, download

### EPI-007: Integration & Polish (6 stories, 47 points)

#### STORY-007-01: Main Application Integration (3 points)
- Modify `page.tsx` and `constants.ts`
- Add "LLM Tests" tab

#### STORY-007-02: Security Hardening (5→13 points)
- API key AES-256 encryption
- Input/output sanitization with DOMPurify
- SSRF protection (Ollama URL allowlist)

#### STORY-007-03: Authentication Layer (NEW, 8 points)
- API key or user authentication (NextAuth.js)
- RBAC for team environments

#### STORY-007-04: CSRF Protection (NEW, 3 points)
- CSRF tokens on state-changing forms

#### STORY-007-05: Audit Logging (NEW, 5 points)
- Log executions, config changes, manual overrides

#### STORY-007-06: Security Audit (NEW, 13 points)
- OWASP ASVS Level 1 verification
- Penetration testing, zero critical findings

#### STORY-007-07: Documentation & Deployment Guide (3 points)
- User docs, API reference, troubleshooting
- Update main README

#### STORY-007-08: Data Privacy Controls (NEW, 5 points)
- Auto-delete after 90 days
- Privacy notice, "Delete All" button

**Total Stories:** 41 (31 original + 10 new based on SME feedback)
**Total Points:** ~237 (168 original + 69 new security/architecture stories)

---

## Performance SLAs

### Service Level Agreements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Single Test Execution | <30 seconds | End-to-end including LLM API call |
| Dashboard Refresh Rate | <2 seconds | UI update after SSE event |
| Report Generation (JSON) | <5 seconds | For 100 test results |
| Report Generation (PDF) | <30 seconds | For 100 test results |
| API Response Time | <500ms | p95 for non-execution endpoints |
| SSE Reconnect Time | <5 seconds | Automatic reconnection after drop |

### Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Max Tests per Batch | 100 tests | Prevent API quota exhaustion |
| Max Batch Size | 50MB input | Prevent memory issues |
| Max Concurrent Batches | 5 per user | Fair resource allocation |
| Max Results per Model | 10,000 | Auto-archive older results |
| File Storage Growth | 10GB maximum | Prune/cache old results |

---

## User Personas

### Primary Persona: Security Engineer (Alex)

**Demographics:**
- Role: Application Security Engineer
- Experience: 5+ years in security testing
- Tools: Burp Suite, OWASP ZAP, custom scripts

**Goals:**
- Evaluate LLM models before enterprise deployment
- Identify specific vulnerabilities (OWASP/TPI categories)
- Generate reports for management and compliance

**Pain Points:**
- Manual LLM testing is time-consuming
- No standardized way to compare models
- Need audit trail for compliance

**Workflow:**
1. Select model for evaluation
2. Run critical-only test suite first
3. Review failures by category
4. Export PDF report for stakeholders

### Secondary Persona: ML Researcher (Sarah)

**Demographics:**
- Role: Machine Learning Researcher
- Experience: Building and evaluating LLM applications
- Tools: Hugging Face, LangChain, OpenAI Evals

**Goals:**
- Compare multiple models for same use case
- Understand model weaknesses in safety categories
- Track model performance over time

**Pain Points:**
- A/B testing models manually is tedious
- Need visual comparison of responses
- Want to identify regression after model updates

**Workflow:**
1. Configure 2-3 models
2. Run full test suite across all
3. Use Comparison view for side-by-side analysis
4. Export JSON for further analysis

### Tertiary Persona: DevOps Engineer (Mike)

**Demographics:**
- Role: DevOps / SRE
- Experience: Deploying and monitoring production systems
- Tools: CI/CD pipelines, monitoring tools

**Goals:**
- Integrate LLM testing into CI/CD pipeline
- Automated testing on model updates
- Fail build if resilience score below threshold

**Pain Points:**
- Need API-based testing (no UI required)
- Need pass/fail criteria for automation
- Want test results in CI logs

**Workflow:**
1. Call `/api/llm/execute` from pipeline
2. Parse resilience score from response
3. Fail build if score < 70
4. Upload results to artifact storage

---

## Security Requirements

### Updated Requirements (Based on SME Review)

**CRITICAL (Must Implement):**

1. **API Key Storage:**
   - **BEFORE:** Keys stored in plain JSON files
   - **NOW:** AES-256 encryption at rest with environment variable references
   - Implementation: Store only encrypted key references, decrypt at runtime

2. **Authentication & Authorization:**
   - **BEFORE:** No authentication on endpoints
   - **NOW:** API key or user authentication (NextAuth.js)
   - All state-changing operations require valid authentication
   - Role-based access control (RBAC) for team environments

3. **Rate Limiting:**
   - **BEFORE:** Mentioned but not specified
   - **NOW:** 100 requests per 15 minutes per IP (configurable)
   - Per-model budget limits with alerts at 80%, 90%
   - Max batch size: 100 tests per batch

4. **Input/Output Sanitization:**
   - **BEFORE:** Basic sanitization mentioned
   - **NOW:** DOMPurify for all HTML output
   - Scan all prompts before sending to LLMs
   - Validate URLs before rendering (SSRF protection)
   - Ollama base URL allowlist for internal network protection

**HIGH Priority:**

5. **Cross-Site Request Forgery (CSRF):**
   - Add CSRF tokens to all state-changing forms
   - Validate tokens on POST/PATCH/DELETE operations

6. **Security Headers:**
   - Content-Security-Policy: default-src 'self'
   - Strict-Transport-Security: max-age=31536000
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY

7. **Audit Logging:**
   - Log all test executions with user, IP, timestamp
   - Log all configuration changes
   - Log manual score overrides with reason

**MEDIUM Priority:**

8. **Data Retention:**
   - Auto-delete results after 90 days (configurable)
   - "Delete All Results" button for manual cleanup
   - Privacy notice about data storage location

9. **Insecure Direct Object References (IDOR):**
   - Validate ownership before allowing result access
   - Use UUID-based IDs instead of sequential

### STRIDE Threat Analysis

| Threat | Risk Level | Mitigation |
|--------|------------|------------|
| Spoofing | HIGH | Authentication required |
| Tampering | MEDIUM | Audit logging, digital signatures |
| Repudiation | HIGH | Comprehensive audit trail |
| Information Disclosure | HIGH | Encryption at rest, access controls |
| Denial of Service | HIGH | Rate limiting, resource quotas |
| Elevation of Privilege | MEDIUM | RBAC, least privilege |

### OWASP ASVS Level 1 Requirements

- [ ] All inputs validated (length, type, format)
- [ ] All outputs encoded (XSS prevention)
- [ ] Authentication for all sensitive operations
- [ ] Authorization checks for all resources
- [ ] Security logging for critical operations
- [ ] Error handling does not leak information

---

## Success Metrics

### Phase 1 (MVP) Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Adoption | 50+ unique users configure 1+ models | 30 days |
| Engagement | 10+ tests executed per configured model | Ongoing |
| Retention | 40% of users return within 7 days | 30 days |
| Technical | <5% test execution failure rate | Ongoing |
| Satisfaction | NPS 30+ (baseline) | 60 days |

### Phase 2 (Multi-Model) Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Usage Growth | 2x increase in tests vs Phase 1 | 30 days |
| Comparison Usage | 60% of users with 2+ models use Comparison view | Ongoing |
| Provider Distribution | Track provider popularity (OpenAI, Anthropic, Ollama) | Ongoing |
| Batch Adoption | 40% of users run batch tests | 30 days |

### Phase 3 (Coverage) Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Coverage Expansion | 80%+ OWASP/TPI coverage | End of phase |
| Pattern Quality | <10% false positive rate | Ongoing |
| Gap Follow-up | 50% of users run recommended tests | Ongoing |
| Category Focus | Top 5 categories identified by usage | 30 days |

### Phase 4 (Production) Metrics

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Report Usage | 30% of sessions export reports | Ongoing |
| Satisfaction | NPS 40+ | 90 days |
| Security | Zero critical vulnerabilities | Audit |
| Uptime | 99.5% availability | Ongoing |

---

## API Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/llm/models` | GET/POST | List/create model configs | YES |
| `/api/llm/test-cases` | GET/POST | List/create test cases (filter by OWASP/TPI) | NO |
| `/api/llm/execute` | POST | Run single test | YES |
| `/api/llm/batch` | POST/GET | Create/run batch tests | YES |
| `/api/llm/results` | GET | Query results (by view type) | YES |
| `/api/llm/results` | PATCH | Update manual evaluation | YES |
| `/api/llm/results` | DELETE | Clear old results | YES |
| `/api/llm/reports` | GET | Generate report (JSON/PDF/MD) | YES |
| `/api/llm/coverage` | GET | Get coverage breakdown | YES |
| `/api/llm/stream` | GET | SSE stream for real-time updates | YES |

---

## Dependencies

### NPM Packages to Install

```json
{
  "openai": "^4.x",
  "@anthropic-ai/sdk": "^0.x",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x",
  "marked": "^12.x",
  "dompurify": "^3.x",
  "next-auth": "^4.x",
  "better-sqlite3": "^9.x"
}
```

### File Structure Summary

```
packages/
├── dojolm-scanner/
│   └── src/
│       ├── patterns/
│       │   ├── owasp-llm.ts           # NEW: OWASP LLM patterns
│       │   ├── tpi-expansion.ts       # NEW: Missing TPI patterns
│       │   ├── multimodal.ts          # NEW: Multimodal injection
│       │   └── steganography.ts       # NEW: Steganography detection
│       └── scanner.ts                 # MODIFY: Add new pattern groups
└── dojolm-web/
    └── src/
        ├── app/
        │   ├── api/llm/
        │   │   ├── models/route.ts
        │   │   ├── test-cases/route.ts
        │   │   ├── execute/route.ts
        │   │   ├── batch/route.ts
        │   │   ├── results/route.ts
        │   │   ├── reports/route.ts
        │   │   └── stream/route.ts
        │   └── page.tsx (modify)
        ├── components/llm/
        │   ├── LLMDashboard.tsx
        │   ├── ModelConfigPanel.tsx
        │   ├── TestCasePanel.tsx
        │   ├── TestExecutionPanel.tsx
        │   ├── ResultsView.tsx
        │   ├── ComparisonView.tsx
        │   ├── IndividualView.tsx
        │   ├── LeaderboardView.tsx
        │   ├── CoverageView.tsx
        │   ├── ResponseEvaluator.tsx
        │   ├── ReportExporter.tsx
        │   └── RealtimeUpdater.tsx
        ├── lib/
        │   ├── LLMModelContext.tsx      # PARTITIONED: Models only
        │   ├── LLMExecutionContext.tsx   # PARTITIONED: Executions only
        │   ├── LLMResultsContext.tsx    # PARTITIONED: Results only
        │   ├── storage/
        │   │   ├── storage-interface.ts # NEW: Abstraction layer
        │   │   └── file-storage.ts      # NEW: File implementation
        │   ├── providers/
        │   │   ├── errors.ts           # NEW: Error types
        │   │   ├── openai.ts
        │   │   ├── anthropic.ts
        │   │   ├── ollama.ts
        │   │   ├── zai.ts
        │   │   └── moonshot.ts
        │   ├── llm-types.ts
        │   ├── llm-constants.ts
        │   ├── llm-scoring.ts
        │   ├── llm-providers.ts
        │   ├── llm-api.ts
        │   └── llm-reports.ts
        └── data/
            ├── llm-models.json
            ├── llm-test-cases.json
            └── llm-results/
                ├── index.json
                ├── batches/{batchId}/batch.json
                └── models/{modelId}/summary.json
```

---

## Next Steps

1. **User Interviews (Week 1)**
   - Interview 5-10 security researchers
   - Validate MVP scope and provider priorities

2. **Prototypes (Week 1)**
   - Create storage abstraction layer prototype
   - Create partitioned context prototype

3. **Security Review (Week 2)**
   - Complete STRIDE threat model
   - Document OWASP ASVS Level 1 requirements

4. **Go/No-Go Decision (Week 2)**
   - Review interview results
   - Validate technical risks
   - Decide whether to proceed

---

**End of Master Working Document**
