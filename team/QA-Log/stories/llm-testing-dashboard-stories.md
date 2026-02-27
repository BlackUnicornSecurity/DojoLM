# LLM Testing Dashboard - User Stories

**Project:** BU-TPI LLM Model Testing & Rating Dashboard
**Created:** 2026-02-25
**Epic File:** [llm-testing-dashboard-epics.md](../epics/llm-testing-dashboard-epics.md)

---

## Story Index

| Story ID | Title | Epic | Status | Points |
|----------|-------|------|--------|--------|
| STORY-001-01 | Add OWASP LLM Missing Patterns | EPI-001 | Pending | 8 |
| STORY-001-02 | Add Crowdstrike TPI Missing Patterns | EPI-001 | Pending | 8 |
| STORY-001-03 | Test Coverage Validation | EPI-001 | Pending | 5 |
| STORY-002-01 | Core Type Definitions | EPI-002 | Pending | 3 |
| STORY-002-02 | Test Execution & Report Data Models | EPI-002 | Pending | 3 |
| STORY-002-03 | Scoring Algorithm with Coverage Metrics | EPI-002 | Pending | 5 |
| STORY-002-04 | Provider Constants & Configurations | EPI-002 | Pending | 2 |
| STORY-003-01 | Provider Adapter Interface | EPI-003 | Pending | 3 |
| STORY-003-02 | OpenAI Provider (z.ai, moonshot.ai) | EPI-003 | Pending | 5 |
| STORY-003-03 | Anthropic Provider | EPI-003 | Pending | 5 |
| STORY-003-04 | Ollama Provider | EPI-003 | Pending | 3 |
| STORY-003-05 | Model Configuration UI Panel | EPI-003 | Pending | 5 |
| STORY-004-01 | State Management (LLMContext) | EPI-004 | Pending | 3 |
| STORY-004-02 | API Client Functions | EPI-004 | Pending | 5 |
| STORY-004-03 | Model Configs API Routes | EPI-004 | Pending | 3 |
| STORY-004-04 | Test Cases API Routes | EPI-004 | Pending | 3 |
| STORY-004-05 | Execution API Routes | EPI-004 | Pending | 8 |
| STORY-004-06 | Results API & SSE Streaming | EPI-004 | Pending | 8 |
| STORY-005-01 | Results View Container | EPI-005 | Pending | 3 |
| STORY-005-02 | Comparison View Component | EPI-005 | Pending | 5 |
| STORY-005-03 | Individual View Component | EPI-005 | Pending | 5 |
| STORY-005-04 | Leaderboard View Component | EPI-005 | Pending | 5 |
| STORY-005-05 | Coverage View Component | EPI-005 | Pending | 8 |
| STORY-005-06 | Response Evaluator (Manual Scoring) | EPI-005 | Pending | 3 |
| STORY-005-07 | Real-time Updater (SSE Client) | EPI-005 | Pending | 5 |
| STORY-006-01 | Report Generation Library | EPI-006 | Pending | 5 |
| STORY-006-02 | Report API Endpoint | EPI-006 | Pending | 3 |
| STORY-006-03 | Report Exporter UI Component | EPI-006 | Pending | 3 |
| STORY-007-01 | Main Application Integration | EPI-007 | Pending | 3 |
| STORY-007-02 | Security Hardening | EPI-007 | Pending | 5 |
| STORY-007-03 | Documentation & Deployment Guide | EPI-007 | Pending | 3 |

---

# EPI-001: Pattern Expansion to 100% Coverage

## STORY-001-01: Add OWASP LLM Missing Patterns

**As a** Security Researcher
**I want** All OWASP LLM Top 10 categories to have comprehensive test patterns
**So that** BU-TPI provides 100% coverage of the industry standard

**Acceptance Criteria:**
1. Create `/packages/dojolm-scanner/src/patterns/owasp-llm.ts`
2. Add ~200 new patterns covering:
   - LLM02: Insecure Output Handling (40% gap → 30+ patterns)
   - LLM03: Training Data Poisoning (70% gap → 25+ patterns)
   - LLM04: Model Denial of Service (50% gap → 15+ patterns)
   - LLM05: Supply Chain Vulnerabilities (60% gap → 20+ patterns)
   - LLM06: Sensitive Information Disclosure (30% gap → 15+ patterns)
   - LLM07: Insecure Plugin Design (55% gap → 25+ patterns)
   - LLM08: Excessive Agency (65% gap → 25+ patterns)
   - LLM09: Overreliance (80% gap → 15+ patterns)
   - LLM10: Model Theft (90% gap → 20+ patterns)
3. Each pattern includes: name, regex, category (LLM01-LLM10), severity
4. Export patterns grouped by OWASP category
5. Update `/packages/dojolm-scanner/src/scanner.ts` to import and use new patterns

**Technical Tasks:**
- [ ] Create owasp-llm.ts with all pattern groups
- [ ] Define TypeScript interfaces for pattern structure
- [ ] Add patterns for LLM02 (XSS, SSRF, SQL in output)
- [ ] Add patterns for LLM03 (RAG injection, training overrides)
- [ ] Add patterns for LLM04 (token flood, recursion, context overflow)
- [ ] Add patterns for LLM05 (pip inject, npm tamper, model substitution)
- [ ] Add patterns for LLM06 (API keys, credentials, PII)
- [ ] Add patterns for LLM07 (plugin hijacking, unsafe tool use)
- [ ] Add patterns for LLM08 (unauthorized tools, API abuse)
- [ ] Add patterns for LLM09 (confidence misleading, hallucination)
- [ ] Add patterns for LLM10 (extraction, distillation, architecture probe)
- [ ] Update scanner.ts imports

**Definition of Done:**
- All ~200 patterns defined with proper categories
- TypeScript compiles without errors
- Patterns exportable for testing

---

## STORY-001-02: Add Crowdstrike TPI Missing Patterns

**As a** Security Researcher
**I want** All Crowdstrike TPI stories to have comprehensive test patterns
**So that** BU-TPI provides 100% coverage of the TPI taxonomy

**Acceptance Criteria:**
1. Create `/packages/dojolm-scanner/src/patterns/tpi-expansion.ts`
2. Add ~180 new patterns covering:
   - TPI-06: Emotional Manipulation (50% gap → 30+ patterns)
   - TPI-13: Tool/Function Hijacking (60% gap → 25+ patterns)
   - TPI-14: RAG Injection (70% gap → 20+ patterns)
   - TPI-15: Multimodal Injection (75% gap → 25+ patterns)
   - TPI-16: Steganography (80% gap → 20+ patterns)
   - TPI-17: Side-channel Attacks (85% gap → 15+ patterns)
   - TPI-18: Adversarial Examples (65% gap → 20+ patterns)
   - TPI-19: Cross-prompt Injection (55% gap → 15+ patterns)
   - TPI-20: Multi-turn Attacks (45% gap → 20+ patterns)
3. Create `/packages/dojolm-scanner/src/patterns/multimodal.ts` for multimodal-specific patterns
4. Create `/packages/dojolm-scanner/src/patterns/steganography.ts` for steganography detection

**Technical Tasks:**
- [ ] Create tpi-expansion.ts with missing TPI patterns
- [ ] Add TPI-06 patterns (empathy exploit, guilt trip, urgency)
- [ ] Add TPI-13 patterns (tool param injection, function override)
- [ ] Add TPI-14 patterns (document poison, context injection)
- [ ] Add TPI-15 patterns (image stego, audio injection, video embed)
- [ ] Add TPI-16 patterns (zero width, invisible chars, RTL override)
- [ ] Add TPI-17 patterns (timing probe, length extraction)
- [ ] Add TPI-18 patterns (universal adversary, gradient trigger)
- [ ] Add TPI-19 patterns (conversation leak, context bleed)
- [ ] Add TPI-20 patterns (stateful poisoning, cumulative override)
- [ ] Create multimodal.ts with specialized patterns
- [ ] Create steganography.ts with detection patterns
- [ ] Update scanner.ts imports

**Definition of Done:**
- All ~180 patterns defined with proper TPI categories
- Multimodal and steganography modules created
- TypeScript compiles without errors

---

## STORY-001-03: Test Coverage Validation & Documentation

**As a** QA Engineer
**I want** Test cases that validate all new patterns
**So that** We can verify 100% coverage is achieved

**Acceptance Criteria:**
1. Create test cases in `/packages/dojolm-web/data/llm-test-cases.json`
2. Each new pattern maps to at least one test case
3. Test cases include OWASP category (LLM01-LLM10) or TPI story (TPI-01 to TPI-20)
4. Coverage report generates showing 100% for both taxonomies
5. Documentation updated with pattern counts per category

**Technical Tasks:**
- [ ] Create test case template with OWASP/TPI fields
- [ ] Map each OWASP LLM pattern to test case(s)
- [ ] Map each TPI pattern to test case(s)
- [ ] Create coverage verification script
- [ ] Generate baseline coverage report
- [ ] Update documentation with pattern counts

**Definition of Done:**
- All patterns have corresponding test cases
- Coverage report shows 100% for OWASP LLM and TPI
- Documentation complete

---

# EPI-002: Core Infrastructure

## STORY-002-01: Core Type Definitions

**As a** Developer
**I want** Core TypeScript types for LLM testing
**So that** We have type safety throughout the application

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-types.ts`
2. Define types:
   - `LLMProvider`: union type of 'openai' | 'anthropic' | 'ollama' | 'zai' | 'moonshot' | 'custom'
   - `LLMModelConfig`: { id, name, provider, model, apiKey?, baseUrl?, enabled }
   - `LLMPromptTestCase`: { id, name, category, prompt, expectedBehavior, severity, owaspCategory?, tpiStory? }
3. Export all types
4. Add JSDoc comments for each type

**Technical Tasks:**
- [ ] Create llm-types.ts
- [ ] Define LLMProvider union type
- [ ] Define LLMModelConfig interface
- [ ] Define LLMPromptTestCase interface with OWASP/TPI fields
- [ ] Add JSDoc comments
- [ ] Export all types

**Definition of Done:**
- Types compile without errors
- All types properly documented

---

## STORY-002-02: Test Execution & Report Data Models

**As a** Developer
**I want** Data models for test execution and reports
**So that** Results can be stored and retrieved consistently

**Acceptance Criteria:**
1. Add to `llm-types.ts`:
   - `LLMTestExecution`: Single test result with coverage tracking
   - `LLMModelReport`: Aggregated report per model
   - `LLMBatchExecution`: Batch test tracking
2. Include OWASP/TPI coverage fields
3. Add contentHash for duplicate detection

**Technical Tasks:**
- [ ] Define LLMTestExecution interface
- [ ] Add owaspCoverage and tpiCoverage fields
- [ ] Add contentHash field (SHA-256)
- [ ] Define LLMModelReport interface
- [ ] Define LLMBatchExecution interface
- [ ] Add JSDoc comments

**Definition of Done:**
- All data models defined
- Coverage tracking included
- Duplicate detection supported

---

## STORY-002-03: Scoring Algorithm with Coverage Metrics

**As a** Security Researcher
**I want** A scoring algorithm that combines multiple factors
**So that** Models get accurate resilience scores

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-scoring.ts`
2. Scoring weights:
   - Injection Success: 40%
   - Response Harmfulness: 40%
   - Scanner Detection: 20%
   - Coverage Bonus: +5% per full category passed
3. Output: 0-100 resilience score
4. Unit tests for edge cases

**Technical Tasks:**
- [ ] Create llm-scoring.ts
- [ ] Implement calculateResilienceScore function
- [ ] Implement calculateCoverageBonus function
- [ ] Implement aggregateCategoryScores function
- [ ] Add unit tests
- [ ] Verify 0-100 output range

**Definition of Done:**
- Scoring algorithm implemented
- Unit tests pass
- Coverage bonus calculated correctly

---

## STORY-002-04: Provider Constants & Configurations

**As a** Developer
**I want** Provider configuration constants
**So that** Providers can be configured consistently

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-constants.ts`
2. Define:
   - Provider base URLs
   - Default model names per provider
   - Rate limit defaults
   - Timeout defaults

**Technical Tasks:**
- [ ] Create llm-constants.ts
- [ ] Define PROVIDER_CONFIGS object
- [ ] Add base URLs for all 5 providers
- [ ] Add default model names
- [ ] Add rate limit and timeout constants
- [ ] Export constants

**Definition of Done:**
- All providers configured
- Constants exported

---

# EPI-003: LLM Provider Integration

## STORY-003-01: Provider Adapter Interface

**As a** Developer
**I want** A unified provider adapter interface
**So that** All LLM providers can be called consistently

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-providers.ts`
2. Define `LLMProviderAdapter` interface with:
   - `execute(prompt: string, model: string): Promise<string>`
   - `streamExecute(prompt: string, model: string): AsyncIterable<string>`
   - `validateConfig(config: LLMModelConfig): boolean`
3. Define `ProviderError` class for consistent error handling

**Technical Tasks:**
- [ ] Define LLMProviderAdapter interface
- [ ] Define ProviderError class
- [ ] Add JSDoc comments
- [ ] Export interface and error class

**Definition of Done:**
- Interface defined
- Error class created
- Documentation complete

---

## STORY-003-02: OpenAI Provider (z.ai, moonshot.ai)

**As a** Developer
**I want** OpenAI provider adapter with z.ai and moonshot.ai support
**So that** Users can test these compatible APIs

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/providers/openai.ts`
2. Implement `LLMProviderAdapter` interface
3. Support custom base URLs (for z.ai, moonshot.ai)
4. Error handling for rate limits and auth failures
5. Install `openai` package

**Technical Tasks:**
- [ ] Install openai package
- [ ] Create openai.ts
- [ ] Implement OpenAIProvider class
- [ ] Add custom base URL support
- [ ] Add error handling
- [ ] Add retry logic for rate limits
- [ ] Export provider

**Definition of Done:**
- Provider connects to OpenAI API
- Custom base URLs work (z.ai, moonshot.ai)
- Errors handled gracefully

---

## STORY-003-03: Anthropic Provider

**As a** Developer
**I want** Anthropic provider adapter
**So that** Users can test Claude models

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/providers/anthropic.ts`
2. Implement `LLMProviderAdapter` interface
3. Support Claude 3.5 Sonnet and Haiku
4. Error handling for rate limits and auth failures
5. Install `@anthropic-ai/sdk` package

**Technical Tasks:**
- [ ] Install @anthropic-ai/sdk package
- [ ] Create anthropic.ts
- [ ] Implement AnthropicProvider class
- [ ] Add error handling
- [ ] Add retry logic for rate limits
- [ ] Export provider

**Definition of Done:**
- Provider connects to Anthropic API
- Errors handled gracefully

---

## STORY-003-04: Ollama Provider

**As a** Developer
**I want** Ollama provider adapter
**So that** Users can test local models

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/providers/ollama.ts`
2. Implement `LLMProviderAdapter` interface
3. Support configurable base URL (default: localhost:11434)
4. Error handling for connection failures
5. Use fetch or OpenAI client with custom base URL

**Technical Tasks:**
- [ ] Create ollama.ts
- [ ] Implement OllamaProvider class
- [ ] Add configurable base URL
- [ ] Add error handling
- [ ] Export provider

**Definition of Done:**
- Provider connects to Ollama
- Errors handled gracefully

---

## STORY-003-05: Model Configuration UI Panel

**As a** User
**I want** A UI to configure LLM models
**So that** I can set up models for testing

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/ModelConfigPanel.tsx`
2. Form fields: name, provider, model, API key (masked), base URL
3. Provider dropdown with options
4. Save/Delete model config buttons
5. Validation for required fields
6. API key masking in UI

**Technical Tasks:**
- [ ] Create ModelConfigPanel component
- [ ] Add form fields
- [ ] Implement provider dropdown
- [ ] Add API key masking
- [ ] Implement save functionality
- [ ] Implement delete functionality
- [ ] Add form validation

**Definition of Done:**
- UI renders correctly
- Models can be saved and deleted
- API keys are masked

---

# EPI-004: Test Execution Engine

## STORY-004-01: State Management (LLMContext)

**As a** Developer
**I want** React Context for LLM testing state
**So that** Components can access state globally

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/LLMContext.tsx`
2. Context provides: models, testCases, executions, results
3. Actions: addModel, removeModel, addExecution, updateResults
4. Support real-time updates

**Technical Tasks:**
- [ ] Create LLMContext
- [ ] Define state interface
- [ ] Implement context provider
- [ ] Add action creators
- [ ] Create useLLM hook
- [ ] Export context and hook

**Definition of Done:**
- Context provides all state
- Actions work correctly
- Hook exported

---

## STORY-004-02: API Client Functions

**As a** Developer
**I want** API client functions for LLM endpoints
**So that** Frontend can call backend APIs

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-api.ts`
2. Functions: getModels, saveModel, deleteModel, getTestCases, executeTest, getResults
3. Proper error handling
4. TypeScript types for requests/responses

**Technical Tasks:**
- [ ] Create llm-api.ts
- [ ] Implement getModels
- [ ] Implement saveModel
- [ ] Implement deleteModel
- [ ] Implement getTestCases
- [ ] Implement executeTest
- [ ] Implement getResults
- [ ] Add error handling

**Definition of Done:**
- All API functions implemented
- Error handling works
- Types defined

---

## STORY-004-03: Model Configs API Routes

**As a** Developer
**I want** API routes for model configuration
**So that** Models can be stored and retrieved

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/app/api/llm/models/route.ts`
2. GET: List all model configs
3. POST: Create new model config
4. DELETE: Delete model config
5. File storage: `/packages/dojolm-web/data/llm-models.json`

**Technical Tasks:**
- [ ] Create models/route.ts
- [ ] Implement GET handler
- [ ] Implement POST handler
- [ ] Implement DELETE handler
- [ ] Add validation
- [ ] Set up file storage

**Definition of Done:**
- All methods work
- Models persist to file

---

## STORY-004-04: Test Cases API Routes

**As a** Developer
**I want** API routes for test case management
**So that** Test cases can be queried and filtered

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/app/api/llm/test-cases/route.ts`
2. GET: List test cases with optional OWASP/TPI filter
3. POST: Create new test case
4. File storage: `/packages/dojolm-web/data/llm-test-cases.json`

**Technical Tasks:**
- [ ] Create test-cases/route.ts
- [ ] Implement GET with filters
- [ ] Implement POST handler
- [ ] Add OWASP/TPI filtering
- [ ] Set up file storage

**Definition of Done:**
- Test cases can be listed
- Filtering by OWASP/TPI works
- New test cases can be added

---

## STORY-004-05: Execution API Routes

**As a** Developer
**I want** API routes for test execution
**So that** Tests can be run against LLMs

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/app/api/llm/execute/route.ts` - single test
2. Create `/packages/dojolm-web/src/app/api/llm/batch/route.ts` - batch tests
3. POST endpoints that execute prompts against configured models
4. Return results with scores
5. File storage in `/packages/dojolm-web/data/llm-results/`

**Technical Tasks:**
- [ ] Create execute/route.ts
- [ ] Implement POST for single test
- [ ] Create batch/route.ts
- [ ] Implement POST for batch tests
- [ ] Add provider selection logic
- [ ] Store results with deduplication
- [ ] Return scored results

**Definition of Done:**
- Single tests execute
- Batch tests execute
- Results are stored

---

## STORY-004-06: Results API & SSE Streaming

**As a** Developer
**I want** Results API and SSE streaming
**So that** Real-time updates are possible

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/app/api/llm/results/route.ts` - GET/PATCH/DELETE
2. Create `/packages/dojolm-web/src/app/api/llm/stream/route.ts` - SSE endpoint
3. GET results by view type (comparison, individual, leaderboard)
4. PATCH for manual evaluation updates
5. SSE stream emits progress updates

**Technical Tasks:**
- [ ] Create results/route.ts
- [ ] Implement GET with view type
- [ ] Implement PATCH for manual eval
- [ ] Implement DELETE
- [ ] Create stream/route.ts
- [ ] Implement SSE endpoint
- [ ] Emit progress events

**Definition of Done:**
- Results can be queried
- Manual eval updates work
- SSE stream sends updates

---

# EPI-005: Dashboard UI & Results

## STORY-005-01: Results View Container

**As a** User
**I want** A main container for results views
**So that** I can navigate between different view modes

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/ResultsView.tsx`
2. Tab navigation: Comparison, Individual, Leaderboard, Coverage
3. Active tab state management
4. Responsive layout

**Technical Tasks:**
- [ ] Create ResultsView component
- [ ] Add tab navigation
- [ ] Implement tab state
- [ ] Add responsive styling
- [ ] Route to sub-components

**Definition of Done:**
- Tabs work correctly
- Layout is responsive

---

## STORY-005-02: Comparison View Component

**As a** User
**I want** Side-by-side model comparison
**So that** I can compare responses across models

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/ComparisonView.tsx`
2. Select: test case, models to compare
3. Display: model name, response, score, passed/failed
4. Highlight differences in responses

**Technical Tasks:**
- [ ] Create ComparisonView component
- [ ] Add test case selector
- [ ] Add model multi-select
- [ ] Display comparison table
- [ ] Add score display
- [ ] Add difference highlighting

**Definition of Done:**
- Models can be compared
- Responses display side-by-side
- Scores show correctly

---

## STORY-005-03: Individual View Component

**As a** User
**I want** Detailed single-model report
**So that** I can see full test results for one model

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/IndividualView.tsx`
2. Select: model
3. Display: model name, overall score, category breakdown, all test results
4. Expandable test details

**Technical Tasks:**
- [ ] Create IndividualView component
- [ ] Add model selector
- [ ] Display overall score
- [ ] Display category breakdown (OWASP/TPI)
- [ ] Display test results table
- [ ] Add expandable details

**Definition of Done:**
- Model selected shows results
- Categories display with pass rates
- Tests are expandable

---

## STORY-005-04: Leaderboard View Component

**As a** User
**I want** Ranked leaderboard by resilience score
**So that** I can see which models perform best

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/LeaderboardView.tsx`
2. Table: rank, model name, score, tests passed, tests failed
3. Sortable by score, tests passed
4. Click row to view individual details

**Technical Tasks:**
- [ ] Create LeaderboardView component
- [ ] Display ranking table
- [ ] Add sorting
- [ ] Add row click handler
- [ ] Style leaderboard

**Definition of Done:**
- Models ranked by score
- Sorting works
- Row clicks navigate to details

---

## STORY-005-05: Coverage View Component

**As a** User
**I want** Visual coverage bars for OWASP and TPI categories
**So that** I can identify coverage gaps

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/CoverageView.tsx`
2. OWASP LLM coverage bars (LLM01-LLM10)
3. TPI coverage bars (TPI-01 to TPI-20)
4. Percentage and count display
5. Filter tests by category
6. Gap analysis highlights weak areas

**Technical Tasks:**
- [ ] Create CoverageView component
- [ ] Display OWASP coverage bars
- [ ] Display TPI coverage bars
- [ ] Add percentage labels
- [ ] Add category filter
- [ ] Add gap analysis
- [ ] Style coverage visualization

**Definition of Done:**
- OWASP bars display correctly
- TPI bars display correctly
- Filtering works
- Gaps highlighted

---

## STORY-005-06: Response Evaluator (Manual Scoring)

**As a** Security Researcher
**I want** Manual evaluation UI for responses
**So that** I can override automated scoring

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/ResponseEvaluator.tsx`
2. Display: prompt, response, current score
3. Controls: injection success toggle, harmfulness slider, scanner detection toggle
4. Save button updates result

**Technical Tasks:**
- [ ] Create ResponseEvaluator component
- [ ] Display prompt and response
- [ ] Add current score display
- [ ] Add injection success toggle
- [ ] Add harmfulness slider
- [ ] Add scanner detection toggle
- [ ] Implement save functionality

**Definition of Done:**
- Responses can be manually scored
- Save updates the result

---

## STORY-005-07: Real-time Updater (SSE Client)

**As a** User
**I want** Real-time dashboard updates during testing
**So that** I can see progress as tests run

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/RealtimeUpdater.tsx`
2. Connect to SSE endpoint
3. Update progress bar
4. Update results table as tests complete
5. Handle disconnections gracefully

**Technical Tasks:**
- [ ] Create RealtimeUpdater component
- [ ] Implement SSE connection
- [ ] Parse progress events
- [ ] Update progress bar
- [ ] Update results table
- [ ] Handle disconnections

**Definition of Done:**
- SSE connection works
- Progress updates in real-time
- Disconnections handled

---

# EPI-006: Report Generation

## STORY-006-01: Report Generation Library

**As a** User
**I want** Report generation functions
**So that** I can export test results

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/lib/llm-reports.ts`
2. Functions: generateJSONReport, generateMarkdownReport, generatePDFReport
3. Report sections: Executive Summary, Overall Score, OWASP/TPI Coverage, Detailed Results, Recommendations
4. Install dependencies: jspdf, jspdf-autotable, marked

**Technical Tasks:**
- [ ] Install jspdf, jspdf-autotable, marked
- [ ] Create llm-reports.ts
- [ ] Implement generateJSONReport
- [ ] Implement generateMarkdownReport
- [ ] Implement generatePDFReport
- [ ] Add all report sections

**Definition of Done:**
- JSON report generates
- Markdown report generates
- PDF report generates

---

## STORY-006-02: Report API Endpoint

**As a** Developer
**I want** API endpoint for report generation
**So that** Frontend can request reports

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/app/api/llm/reports/route.ts`
2. GET with query params: modelId, format (json/pdf/md)
3. Return report in requested format
4. Cache reports for performance

**Technical Tasks:**
- [ ] Create reports/route.ts
- [ ] Implement GET handler
- [ ] Parse query params
- [ ] Generate report based on format
- [ ] Add caching
- [ ] Return report

**Definition of Done:**
- JSON format works
- PDF format works
- Markdown format works

---

## STORY-006-03: Report Exporter UI Component

**As a** User
**I want** UI to export reports
**So that** I can download reports in different formats

**Acceptance Criteria:**
1. Create `/packages/dojolm-web/src/components/llm/ReportExporter.tsx`
2. Select: model, format
3. Download button
4. Loading state during generation
5. Success/error messages

**Technical Tasks:**
- [ ] Create ReportExporter component
- [ ] Add model selector
- [ ] Add format selector (JSON/PDF/MD)
- [ ] Implement download functionality
- [ ] Add loading state
- [ ] Add success/error messages

**Definition of Done:**
- Reports download correctly
- All formats work
- User feedback shows

---

# EPI-007: Integration & Polish

## STORY-007-01: Main Application Integration

**As a** User
**I want** LLM Testing tab in main navigation
**So that** I can access the dashboard easily

**Acceptance Criteria:**
1. Modify `/packages/dojolm-web/src/app/page.tsx`
2. Add "LLM Tests" to TABS array in constants.ts
3. Import and render LLMDashboard component
4. Routing works correctly
5. Tab styling matches existing tabs

**Technical Tasks:**
- [ ] Update constants.ts with LLM tab
- [ ] Modify page.tsx to include LLM tab
- [ ] Import LLMDashboard component
- [ ] Test routing
- [ ] Match existing tab styles

**Definition of Done:**
- Tab appears in navigation
- Clicking tab loads dashboard
- Styling matches

---

## STORY-007-02: Security Hardening

**As a** Security Engineer
**I want** Security review and hardening
**So that** The feature is production-ready

**Acceptance Criteria:**
1. API keys never logged or exposed in responses
2. All prompts scanned before sending to LLMs
3. LLM responses sanitized for XSS
4. Rate limiting implemented
5. File permissions for data directory
6. Security audit passed

**Technical Tasks:**
- [ ] Mask API keys in logs and responses
- [ ] Add input scanning for prompts
- [ ] Add XSS sanitization for responses
- [ ] Implement rate limiting
- [ ] Set file permissions
- [ ] Conduct security audit
- [ ] Fix security issues

**Definition of Done:**
- API keys masked
- Inputs scanned
- Responses sanitized
- Rate limiting active
- Security audit passed

---

## STORY-007-03: Documentation & Deployment Guide

**As a** Developer
**I want** Complete documentation
**So that** The feature can be deployed and maintained

**Acceptance Criteria:**
1. Create `/docs/user/llm-testing-dashboard.md`
2. Document: setup, configuration, usage, API reference
3. Create deployment guide
4. Add troubleshooting section
5. Update main README

**Technical Tasks:**
- [ ] Create user documentation
- [ ] Document setup steps
- [ ] Document configuration options
- [ ] Document API endpoints
- [ ] Create deployment guide
- [ ] Add troubleshooting
- [ ] Update main README

**Definition of Done:**
- Documentation complete
- Deployment guide written
- README updated

---

**Total Stories:** 31
**Estimated Story Points:** 168
**Target Release:** After all epics complete and security audit passed
