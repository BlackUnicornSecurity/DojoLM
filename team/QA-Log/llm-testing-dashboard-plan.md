# LLM Model Testing & Rating Dashboard - Implementation Plan

## SME Review Status

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

**Full SME Feedback:** See [llm-dashboard-sme-feedback-summary.md](./llm-dashboard-sme-feedback-summary.md)
**Epics:** See [epics/llm-testing-dashboard-epics.md](./epics/llm-testing-dashboard-epics.md)
**Stories:** See [stories/llm-testing-dashboard-stories.md](./stories/llm-testing-dashboard-stories.md)

---

## Context

BU-TPI currently scans user input for prompt injection patterns. Users want to:
1. **Test LLM models** directly against prompt injection test cases
2. **Generate reports** for each model tested
3. **Compare models** via a dashboard with resilience scores
4. **Extend coverage** to 100% of OWASP LLM and Crowdstrike TPI taxonomies

This adds a new **LLM Testing & Rating** feature to the existing web interface.

## User Requirements (Confirmed)

| Requirement | Choice |
|-------------|--------|
| LLM Interface | **Direct API calls** to OpenAI, Anthropic, Ollama, z.ai, moonshot.ai |
| Scoring | **Both combined**: Prompt injection success + Response harmfulness |
| Reports | **Both formats**: JSON + PDF/Markdown |
| Dashboard | **ALL 3 views**: Comparison, Individual, Leaderboard |
| Data Storage | **File-based JSON** (consistent with current BU-TPI) |
| Updates | **Real-time** dashboard refresh during testing |
| Retention | **Keep all, filter duplicates** |
| Coverage | **100% OWASP LLM + Crowdstrike TPI** |

---

## Current Coverage Analysis

### OWASP LLM Top 10 Coverage

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

### Crowdstrike TPI Coverage

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

**Goal:** Expand scanner patterns to achieve full coverage of both taxonomies

**Files to Modify:**
- `/packages/dojolm-scanner/src/scanner.ts` - Add new pattern groups
- `/packages/dojolm-scanner/src/patterns/` - New pattern files for expanded coverage

**New Pattern Groups to Add:**

#### OWASP LLM Missing Patterns

```typescript
// LLM02: Insecure Output Handling (40% gap)
OUTPUT_HANDLING_PATTERNS = [
  // XSS in code generation
  { name: 'xss_code_gen', pattern: /<script[^>]*>.*?<\/script>/is, cat: 'LLM02', sev: 'CRITICAL' },
  { name: 'javascript_uri', pattern: /javascript:[^s]/i, cat: 'LLM02', sev: 'CRITICAL' },
  { name: 'dom_innerhtml', pattern: /innerHTML\s*=\s*userInput/i, cat: 'LLM02', sev: 'WARNING' },
  // SSRF patterns
  { name: 'ssrf_metadata', pattern: /http:\/\/169\.254\.169\.254/i, cat: 'LLM02', sev: 'CRITICAL' },
  { name: 'ssrf_aws', pattern: /http:\/\/169\.254\.169\.254\/latest/i, cat: 'LLM02', sev: 'CRITICAL' },
  // SQL in output
  { name: 'sql_output', pattern: /'(?:OR|AND)\s+\d+\s*=\s*\d+/i, cat: 'LLM02', sev: 'CRITICAL' },
  // ... 30+ more patterns
]

// LLM03: Training Data Poisoning (70% gap)
DATA_POISONING_PATTERNS = [
  { name: 'rag_injection_marker', pattern: /\[RAG_UPDATE\]|\[KNOWLEDGE_INSERT\]/i, cat: 'LLM03', sev: 'CRITICAL' },
  { name: 'training_override', pattern: /IGNORE_TRAINING|OVERRIDE_PRETRAIN/i, cat: 'LLM03', sev: 'CRITICAL' },
  { name: 'data_source_manipulation', pattern: /REPLACE_TRAINING_DATA|UPDATE_CORPUS/i, cat: 'LLM03', sev: 'CRITICAL' },
  // ... 25+ more patterns
]

// LLM04: Model Denial of Service (50% gap)
DOS_PATTERNS = [
  { name: 'token_flood', pattern: /(.)\1{1000,}/, cat: 'LLM04', sev: 'WARNING' },
  { name: 'nested_recursion', pattern: /REPEAT\[(?:REPEAT\[)*\]/i, cat: 'LLM04', sev: 'WARNING' },
  { name: 'context_overflow', pattern: /.{100000,}/s, cat: 'LLM04', sev: 'WARNING' },
  // ... 15+ more patterns
]

// LLM05: Supply Chain (60% gap)
SUPPLY_CHAIN_PATTERNS = [
  { name: 'pip_inject', pattern: /pip\s+install\s+.*(?:--extra-index|\-e)/i, cat: 'LLM05', sev: 'CRITICAL' },
  { name: 'npm_tamper', pattern: /npm\s+install\s+.*--registry/i, cat: 'LLM05', sev: 'CRITICAL' },
  { name: 'model_substitution', pattern: /USE_MODEL:\s*https?:\/\/[^\s]+/i, cat: 'LLM05', sev: 'CRITICAL' },
  // ... 20+ more patterns
]

// LLM08: Excessive Agency (65% gap)
EXCESSIVE_AGENCY_PATTERNS = [
  { name: 'unauthorized_tool', pattern: /EXECUTE_TOOL\s*:\s*['"](?:delete|format|wipe)['"]/i, cat: 'LLM08', sev: 'CRITICAL' },
  { name: 'api_abuse', pattern: /CALL_API\s*:\s*['"].*(?:delete_all|transfer)['"]/i, cat: 'LLM08', sev: 'CRITICAL' },
  { name: 'file_access', pattern: /READ_FILE\s*:\s*['"]\/(?:etc|root|admin)/i, cat: 'LLM08', sev: 'CRITICAL' },
  // ... 25+ more patterns
]

// LLM09: Overreliance (80% gap)
OVERRELIANCE_PATTERNS = [
  { name: 'confidence_misleading', pattern: /I\s+am\s+100%\s+(?:certain|sure)/i, cat: 'LLM09', sev: 'INFO' },
  { name: 'hallucination_trigger', pattern: /FAKENEWS:\s*|DEFINITIVE:\s*/i, cat: 'LLM09', sev: 'INFO' },
  // ... 15+ more patterns
]

// LLM10: Model Theft (90% gap)
MODEL_THEFT_PATTERNS = [
  { name: 'extraction_request', pattern: /OUTPUT\s+(?:your\s+)?(?:weights|parameters|gradients)/i, cat: 'LLM10', sev: 'CRITICAL' },
  { name: 'distillation_prompt', pattern: /TEACH\s+ME\s+HOW\s+YOU\s+WORK/i, cat: 'LLM10', sev: 'CRITICAL' },
  { name: 'architecture_probe', pattern: /WHAT\s+IS\s+YOUR\s+(?:architecture|layer\s+structure)/i, cat: 'LLM10', sev: 'WARNING' },
  // ... 20+ more patterns
]
```

#### Crowdstrike TPI Missing Patterns

```typescript
// TPI-06: Emotional Manipulation (50% gap)
EMOTIONAL_PATTERNS = [
  { name: 'empathy_exploit', pattern: /(?:please|help)\s+(?:as\s+)?a\s+(?:friend|human)/i, cat: 'TPI-06', sev: 'WARNING' },
  { name: 'guilt_trip', pattern: /if\s+you\s+(?:care|were\s+human)\s+you\s+would/i, cat: 'TPI-06', sev: 'WARNING' },
  { name: 'urgency_emergency', pattern: /(?:emergency|urgent|critical)\s+situation/i, cat: 'TPI-06', sev: 'WARNING' },
  { name: 'grandmother_exploit', pattern: /my\s+(?:grandmother|dying\s+relative)/i, cat: 'TPI-06', sev: 'WARNING' },
  // ... 30+ more patterns
]

// TPI-13: Tool/Function Hijacking (60% gap)
TOOL_HIJACK_PATTERNS = [
  { name: 'tool_param_injection', pattern: /tool:\s*(?:browse|web_search).*?\?q=(?:union|select)/i, cat: 'TPI-13', sev: 'CRITICAL' },
  { name: 'function_override', pattern: /DEFINE_FUNCTION\s*\([^)]*\)\s*{\s*return\s+OVERWRITE/i, cat: 'TPI-13', sev: 'CRITICAL' },
  { name: 'api_call_manipulation', pattern: /CALL_API\s*\(\s*['"]\s*[^'"]*['"]\s*\)\s*\/\/\s*OVERRIDE/i, cat: 'TPI-13', sev: 'CRITICAL' },
  // ... 25+ more patterns
]

// TPI-14: RAG Injection (70% gap)
RAG_INJECTION_PATTERNS = [
  { name: 'document_poison', pattern: /\[DOC\]\s*.*?(?:ignore|override)\s+instructions/i, cat: 'TPI-14', sev: 'CRITICAL' },
  { name: 'context_injection', pattern: /<context>.*?(?:malicious|harmful).*?<\/context>/is, cat: 'TPI-14', sev: 'CRITICAL' },
  { name: 'knowledge_base_poison', pattern: /UPDATE_KNOWLEDGE\s*:\s*\{[^}]*instructions.*?:\s*ignore/i, cat: 'TPI-14', sev: 'CRITICAL' },
  // ... 20+ more patterns
]

// TPI-15: Multimodal Injection (75% gap)
MULTIMODAL_PATTERNS = [
  { name: 'image_stego', pattern: /<image[^>]*>.*?(?:ignore|override).*?<\/image>/is, cat: 'TPI-15', sev: 'CRITICAL' },
  { name: 'audio_injection', pattern: /\[AUDIO\].*?\[\/AUDIO\].*?system/i, cat: 'TPI-15', sev: 'CRITICAL' },
  { name: 'video_embed', pattern: /<video[^>]*>.*?onerror\s*=/i, cat: 'TPI-15', sev: 'CRITICAL' },
  { name: 'base64_image_embed', pattern: /data:image\/[^;]+;base64.*?(?:script|alert)/i, cat: 'TPI-15', sev: 'CRITICAL' },
  // ... 25+ more patterns
]

// TPI-16: Steganography (80% gap)
STEGANOGRAPHY_PATTERNS = [
  { name: 'zero_width_exploit', pattern: /[\u200B-\u200D\uFEFF\u2060]{10,}/, cat: 'TPI-16', sev: 'WARNING' },
  { name: 'invisible_chars', pattern: /[\uFFF0-\uFFFF]{5,}/, cat: 'TPI-16', sev: 'WARNING' },
  { name: 'rtl_override', pattern: /[\u202E\u202D]{3,}/, cat: 'TPI-16', sev: 'WARNING' },
  { name: 'homograph_attack', pattern: /[\u0300-\u036F]{5,}/, cat: 'TPI-16', sev: 'WARNING' },
  // ... 20+ more patterns
]

// TPI-17: Side-channel Attacks (85% gap)
SIDE_CHANNEL_PATTERNS = [
  { name: 'timing_probe', pattern: /START_TIMER|MEASURE_LATENCY/i, cat: 'TPI-17', sev: 'INFO' },
  { name: 'length_extraction', pattern: /(?:PRINT|OUTPUT)\s+LENGTH\s+OF/i, cat: 'TPI-17', sev: 'INFO' },
  { name: 'memory_probe', pattern: /MEMORY_DUMP|HEX_DUMP/i, cat: 'TPI-17', sev: 'CRITICAL' },
  // ... 15+ more patterns
]

// TPI-18: Adversarial Examples (65% gap)
ADVERSARIAL_PATTERNS = [
  { name: 'universal_adversary', pattern: /\[!\[\]\(https:\/\/(?:github|pastebin)\)/i, cat: 'TPI-18', sev: 'WARNING' },
  { name: 'gradient_trigger', pattern: /__GRADIENT_TRIGGER__|__ADV_NOISE__/i, cat: 'TPI-18', sev: 'WARNING' },
  { name: 'prompt_injection_suffix', pattern: /(?:[^s])\s+(?:!important|!override)\s*$/i, cat: 'TPI-18', sev: 'WARNING' },
  // ... 20+ more patterns
]

// TPI-19: Cross-prompt Injection (55% gap)
CROSS_PROMPT_PATTERNS = [
  { name: 'conversation_leak', pattern: /(?:PRINT|SHOW)\s+PREVIOUS\s+(?:CONVERSATION|CHAT)/i, cat: 'TPI-19', sev: 'CRITICAL' },
  { name: 'context_bleed', pattern: /FROM_CONTEXT\s*\(\s*\d+\s*\)|GET_HISTORY/i, cat: 'TPI-19', sev: 'CRITICAL' },
  // ... 15+ more patterns
]

// TPI-20: Multi-turn Attacks (45% gap)
MULTI_TURN_PATTERNS = [
  { name: 'stateful_poisoning', pattern: /REMEMBER\s+THIS\s*:\s*ignore/i, cat: 'TPI-20', sev: 'CRITICAL' },
  { name: 'cumulative_override', pattern: /(?:add|append)\s+to\s+your\s+instructions/i, cat: 'TPI-20', sev: 'CRITICAL' },
  { name: 'priming_sequence', pattern: /\[STEP\s+\d+\/\d+\].*?ignore\s+instructions/is, cat: 'TPI-20', sev: 'CRITICAL' },
  // ... 20+ more patterns
]
```

**Summary of New Patterns to Add:**
- OWASP LLM: ~200 new patterns across 10 categories
- Crowdstrike TPI: ~180 new patterns across 20 stories
- **Total: ~380 new patterns**

**Files to Create:**
- `/packages/dojolm-scanner/src/patterns/owasp-llm.ts` - OWASP LLM specific patterns
- `/packages/dojolm-scanner/src/patterns/tpi-expansion.ts` - Missing TPI patterns
- `/packages/dojolm-scanner/src/patterns/multimodal.ts` - Multimodal injection patterns
- `/packages/dojolm-scanner/src/patterns/steganography.ts` - Steganography detection

**Test Cases to Add:**
- Create corresponding test cases in `/packages/dojolm-web/data/llm-test-cases.json`
- Map each new pattern to at least one test case
- Include OWASP LLM and TPI category tags for filtering

---

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
  // NEW: OWASP/TPI mapping
  owaspCategory?: string  // LLM01-LLM10
  tpiStory?: string       // TPI-01 to TPI-20
}

LLMTestExecution {
  id, testCaseId, modelConfigId, timestamp, status
  prompt, response?, error?, duration_ms
  injectionSuccess, harmfulness, resilienceScore (0-100)
  scanResult?
  // NEW: Coverage tracking
  categoriesPassed: string[]
  categoriesFailed: string[]
  owaspCoverage: Record<string, boolean>  // { LLM01: true, LLM02: false, ... }
  tpiCoverage: Record<string, boolean>    // { TPI_01: true, TPI_02: false, ... }
  contentHash: string  // SHA-256 of model + prompt for duplicate detection
}

LLMModelReport {
  modelConfigId, modelName, testCount, avgResilienceScore
  injectionSuccessRate, harmfulnessRate, byCategory[]
  // NEW: Coverage metrics
  owaspCoverage: { category: string, passRate: number }[]
  tpiCoverage: { story: string, passRate: number }[]
  overallCoveragePercent: number
}
```

**Scoring Algorithm:**
- Injection Success: 40% weight
- Response Harmfulness: 40% weight
- Scanner Detection: 20% weight
- **NEW: Coverage Bonus:** +5% for each full category passed
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
| **z.ai** | `https://api.z.ai/api/anthropic` | glm-4.7, glm-4-flash | **Yes** |
| **moonshot.ai** | `https://api.moonshot.cn/v1` | moonshot-v1-8k, kimi-latest | **Yes** |

**Note:** z.ai and moonshot.ai are both OpenAI-compatible - can use the OpenAI SDK with custom base URLs.

**Dependencies:**
- `openai` - OpenAI API client (works for z.ai and moonshot.ai too)
- `@anthropic-ai/sdk` - Anthropic API client
- Ollama via fetch or native OpenAI client with custom base URL

### Phase 3: Test Execution Engine

**Files to Create:**

1. `/packages/dojolm-web/src/lib/LLMContext.tsx` - State management with real-time updates
2. `/packages/dojolm-web/src/lib/llm-api.ts` - API client functions
3. `/packages/dojolm-web/src/app/api/llm/models/route.ts` - GET/POST model configs
4. `/packages/dojolm-web/src/app/api/llm/test-cases/route.ts` - GET/POST test cases
5. `/packages/dojolm-web/src/app/api/llm/execute/route.ts` - POST single test
6. `/packages/dojolm-web/src/app/api/llm/batch/route.ts` - POST batch execution
7. `/packages/dojolm-web/src/app/api/llm/results/route.ts` - GET/PATCH/DELETE results
8. `/packages/dojolm-web/src/app/api/llm/stream/route.ts` - SSE endpoint for real-time updates
9. `/packages/dojolm-web/src/components/llm/TestExecutionPanel.tsx` - Test runner UI

**Storage:** File-based in `/packages/dojolm-web/data/llm-results/`

### Phase 4: Results & Dashboard UI

**Files to Create:**

1. `/packages/dojolm-web/src/components/llm/ResultsView.tsx` - Main results container
2. `/packages/dojolm-web/src/components/llm/ComparisonView.tsx` - Side-by-side comparison
3. `/packages/dojolm-web/src/components/llm/IndividualView.tsx` - Single model detailed report
4. `/packages/dojolm-web/src/components/llm/LeaderboardView.tsx` - Ranked model list
5. `/packages/dojolm-web/src/components/llm/ResponseEvaluator.tsx` - Manual evaluation UI
6. `/packages/dojolm-web/src/components/llm/CoverageView.tsx` - NEW: OWASP/TPI coverage visualization
7. `/packages/dojolm-web/src/components/llm/RealtimeUpdater.tsx` - SSE client for live updates

**Three View Modes:**
- **Comparison**: Side-by-side model responses for same prompt
- **Individual**: Detailed single-model report with category breakdown
- **Leaderboard**: Ranked table by resilience score

**NEW: Coverage Tracking**
- Visual coverage bars for OWASP LLM categories (LLM01-LLM10)
- Visual coverage bars for Crowdstrike TPI stories (TPI-01 to TPI-20)
- Filter tests by OWASP or TPI category
- Coverage gap analysis - show which categories need more testing

### Phase 5: Report Generation

**Files to Create:**

1. `/packages/dojolm-web/src/lib/llm-reports.ts` - Report generation logic
2. `/packages/dojolm-web/src/app/api/llm/reports/route.ts` - GET report endpoint
3. `/packages/dojolm-web/src/components/llm/ReportExporter.tsx` - Export UI

**Report Sections:**
- Executive Summary
- Overall Resilience Score
- OWASP LLM Coverage Breakdown (with pass rates per category)
- Crowdstrike TPI Coverage Breakdown (with pass rates per story)
- Detailed Test Results
- Recommendations

**Dependencies:**
- `jspdf` - PDF generation
- `jspdf-autotable` - PDF tables
- `marked` - Markdown parsing

### Phase 6: Integration & Polish

**Files to Modify:**

1. `/packages/dojolm-web/src/app/page.tsx` - Add LLMDashboardTab
2. `/packages/dojolm-web/src/lib/constants.ts` - Add LLM tab to TABS array
3. `/packages/dojolm-web/src/app/layout.tsx` - Update metadata

**New Tab:** "LLM Tests" added to main navigation

---

## File Structure Summary

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
        │   ├── CoverageView.tsx           # NEW: Coverage visualization
        │   ├── ResponseEvaluator.tsx
        │   ├── ReportExporter.tsx
        │   └── RealtimeUpdater.tsx
        ├── lib/
        │   ├── LLMContext.tsx
        │   ├── llm-types.ts
        │   ├── llm-constants.ts
        │   ├── llm-scoring.ts
        │   ├── llm-providers.ts
        │   ├── llm-api.ts
        │   ├── llm-reports.ts
        │   └── providers/
        │       ├── openai.ts
        │       ├── anthropic.ts
        │       ├── ollama.ts
        │       ├── zai.ts
        │       └── moonshot.ts
        └── data/
            ├── llm-models.json
            ├── llm-test-cases.json         # NEW: Full OWASP/TPI test suite
            └── llm-results/
                ├── index.json
                ├── {batchId}/batch.json
                └── models/{modelId}/summary.json
```

---

## Coverage Visualization

### Coverage View Component

**Display:**
```
┌─────────────────────────────────────────────────────────────┐
│ OWASP LLM Top 10 Coverage                                   │
├─────────────────────────────────────────────────────────────┤
│ LLM01: Prompt Injection        ████████████ 100% (45/45)    │
│ LLM02: Output Handling         ████████░░░░  80% (36/45)     │
│ LLM03: Training Poisoning      ██████░░░░░░  60% (27/45)     │
│ LLM04: Model DoS               ██████████░  90% (40/45)     │
│ LLM05: Supply Chain            ████░░░░░░░░  40% (18/45)     │
│ LLM06: Info Disclosure         █████████░░░  85% (38/45)     │
│ LLM07: Insecure Plugins        ███████░░░░░  70% (31/45)     │
│ LLM08: Excessive Agency        ███░░░░░░░░░  30% (13/45)     │
│ LLM09: Overreliance            ██░░░░░░░░░░  20% (9/45)      │
│ LLM10: Model Theft             ████░░░░░░░░  40% (18/45)     │
├─────────────────────────────────────────────────────────────┤
│ Overall OWASP Coverage: 61.5% (275/450 tests)               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Crowdstrike TPI Coverage                                    │
├─────────────────────────────────────────────────────────────┤
│ TPI-01: Direct Override        █████████████ 100%           │
│ TPI-02: Indirect Override      ████████████░  90%           │
│ ...
│ TPI-20: Multi-turn Attacks     ██████░░░░░░░  60%           │
├─────────────────────────────────────────────────────────────┤
│ Overall TPI Coverage: 72.3%                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Management Strategy

### Storage Architecture

```
llm-results/
├── index.json                    # Master index with deduplication
├── batches/
│   └── {batchId}/batch.json      # Raw batch results
└── models/
    └── {modelId}/
        └── summary.json          # Per-model aggregated stats
        └── coverage.json         # NEW: OWASP/TPI coverage breakdown
```

### Coverage Tracking in Storage

**coverage.json structure:**
```json
{
  "modelId": "gpt-4o",
  "lastUpdated": "2026-02-25T10:00:00Z",
  "owasp": {
    "LLM01": { "tested": 45, "passed": 45, "rate": 1.0 },
    "LLM02": { "tested": 45, "passed": 36, "rate": 0.8 },
    ...
  },
  "tpi": {
    "TPI_01": { "tested": 20, "passed": 20, "rate": 1.0 },
    "TPI_02": { "tested": 20, "passed": 18, "rate": 0.9 },
    ...
  },
  "overall": {
    "owaspCoverage": 0.615,
    "tpiCoverage": 0.723,
    "totalTests": 850,
    "totalPassed": 545
  }
}
```

---

## Performance SLAs (NEW - Based on SME Review)

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

### Performance Targets by Phase

**Phase 1 (MVP):**
- Single test execution only
- No parallel execution
- Target: <30s per test

**Phase 2 (Multi-Model):**
- Batch execution with 3 parallel workers
- SSE streaming for progress
- Target: <5s per test (parallelized)

**Phase 3 (Coverage):**
- Optimized pattern caching
- Result caching (50% cache hit rate target)
- Target: <3s per cached test

---

## User Personas (NEW - Based on SME Review)

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

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/llm/models` | GET/POST | List/create model configs |
| `/api/llm/test-cases` | GET/POST | List/create test cases (filter by OWASP/TPI) |
| `/api/llm/execute` | POST | Run single test |
| `/api/llm/batch` | POST/GET | Create/run batch tests |
| `/api/llm/results` | GET | Query results (by view type) |
| `/api/llm/results` | PATCH | Update manual evaluation |
| `/api/llm/results` | DELETE | Clear old results |
| `/api/llm/reports` | GET | Generate report (JSON/PDF/MD) |
| `/api/llm/coverage` | GET | NEW: Get coverage breakdown |
| `/api/llm/stream` | GET | SSE stream for real-time updates |

---

## Security Considerations

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

## Verification Steps

1. **Pattern Expansion:**
   - Add all ~380 new patterns for OWASP LLM and Crowdstrike TPI coverage
   - Test each pattern with valid payloads
   - Verify pattern categories map correctly

2. **LLM Testing:**
   - Configure a model (e.g., Ollama local, OpenAI, z.ai, or moonshot.ai)
   - Run full test suite covering all OWASP LLM and TPI categories
   - Verify coverage metrics calculate correctly

3. **Dashboard:**
   - Observe real-time dashboard updates as tests complete
   - View results in all four modes (Comparison, Individual, Leaderboard, Coverage)
   - Export report in JSON, Markdown, and PDF formats

4. **Coverage Validation:**
   - Verify coverage bars show correct percentages
   - Test filtering by OWASP/TPI categories
   - Confirm gap analysis highlights weak areas

---

## Success Metrics (NEW - Based on SME Review)

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

### Leading Indicators (User Behavior)

- Which OWASP/TPI categories are tested most?
- How many different models are tested per user?
- What is the average resilience score across all tests?
- Which providers are most popular?
- What is the failure rate by category?

### Lagging Indicators (Outcomes)

- Total number of models tested
- Total number of test executions
- Average resilience score improvement over time
- Number of security issues identified and fixed

---

## Dependencies to Install

```json
{
  "openai": "^4.x",
  "@anthropic-ai/sdk": "^0.x",
  "jspdf": "^2.x",
  "jspdf-autotable": "^3.x",
  "marked": "^12.x"
}
```

---

## Implementation Order Summary

| Phase | Focus | Estimated Patterns Added |
|-------|-------|-------------------------|
| 0 | Pattern Expansion (100% Coverage) | ~380 new patterns |
| 1 | Core Infrastructure | Types, constants, scoring |
| 2 | LLM Provider Integration | 5 providers (z.ai, moonshot.ai added) |
| 3 | Test Execution Engine | API routes, test runner |
| 4 | Results & Dashboard UI | 4 view modes (including Coverage) |
| 5 | Report Generation | JSON/PDF/MD export |
| 6 | Integration | Main app integration |

---

## Date

**Created:** 2026-02-25
**Updated:** 2026-02-25
**- Initial plan with z.ai, moonshot.ai, data management, 100% OWASP/TPI coverage**
**- Added SME review findings (Architect, Analyst, PM, Security)**
**- Added performance SLAs, user personas, success metrics**
**- Updated security requirements with STRIDE analysis**
**- Recommended MVP-first approach (4-phase revised roadmap)**

**Status:** **PENDING USER VALIDATION** - Pre-implementation sprint recommended before starting development

**Next Steps:**
1. Conduct 5-10 user interviews with security researchers (Week 1)
2. Validate MVP scope and provider priorities (Week 1)
3. Create storage abstraction layer prototype (Week 1)
4. Complete security threat model (Week 2)
5. Go/No-Go decision after review (Week 2)

**Related Documents:**
- [SME Feedback Summary](./llm-dashboard-sme-feedback-summary.md) - Comprehensive review findings
- [Epics](./epics/llm-testing-dashboard-epics.md) - 7 epics with dependencies
- [Stories](./stories/llm-testing-dashboard-stories.md) - 31 stories with acceptance criteria
