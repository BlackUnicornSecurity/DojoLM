# LLM Testing Dashboard - Epics

**Project:** BU-TPI LLM Model Testing & Rating Dashboard
**Created:** 2026-02-25
**Status:** Ready for Implementation

---

## Epic Overview

| Epic ID | Name | Phase | Stories | Priority |
|---------|------|-------|---------|----------|
| EPI-001 | Pattern Expansion to 100% Coverage | 0 | 3 | CRITICAL |
| EPI-002 | Core Infrastructure | 1 | 4 | HIGH |
| EPI-003 | LLM Provider Integration | 2 | 5 | HIGH |
| EPI-004 | Test Execution Engine | 3 | 6 | HIGH |
| EPI-005 | Dashboard UI & Results | 4 | 7 | MEDIUM |
| EPI-006 | Report Generation | 5 | 3 | MEDIUM |
| EPI-007 | Integration & Polish | 6 | 3 | LOW |

---

## EPI-001: Pattern Expansion to 100% OWASP LLM & Crowdstrike TPI Coverage

**Goal:** Expand scanner patterns from ~60% to 100% coverage of both taxonomies

**Business Value:**
- Comprehensive security testing coverage
- Industry-standard compliance (OWASP LLM Top 10)
- Competitive differentiation with full Crowdstrike TPI coverage

**Success Criteria:**
- 100% of OWASP LLM Top 10 categories have test patterns
- 100% of Crowdstrike TPI stories have test patterns
- ~380 new patterns added and tested
- All patterns categorized and tagged

**Stories:** 3
- STORY-001-01: Add OWASP LLM Missing Patterns (LLM02-LLM10)
- STORY-001-02: Add Crowdstrike TPI Missing Patterns (TPI-06, TPI-13 to TPI-20)
- STORY-001-03: Test Coverage Validation & Documentation

**Dependencies:** None (can start immediately)

**Estimated Patterns:**
- OWASP LLM: ~200 new patterns
- Crowdstrike TPI: ~180 new patterns

---

## EPI-002: Core Infrastructure

**Goal:** Establish foundational types, constants, and scoring algorithms

**Business Value:**
- Type-safe development
- Consistent scoring across all tests
- Standardized data models

**Success Criteria:**
- All TypeScript types defined and exported
- Scoring algorithm produces 0-100 resilience scores
- Coverage metrics calculate correctly
- Unit tests pass for scoring logic

**Stories:** 4
- STORY-002-01: Core Type Definitions (LLMProvider, LLMModelConfig, LLMPromptTestCase)
- STORY-002-02: Test Execution & Report Data Models
- STORY-002-03: Scoring Algorithm with Coverage Metrics
- STORY-002-04: Provider Constants & Configurations

**Dependencies:** None

---

## EPI-003: LLM Provider Integration

**Goal:** Integrate 5 LLM providers (OpenAI, Anthropic, Ollama, z.ai, moonshot.ai)

**Business Value:**
- Multi-model testing capability
- Flexibility for users to test their preferred models
- Support for local (Ollama) and cloud providers

**Success Criteria:**
- All 5 providers connect successfully
- API calls execute and return responses
- Error handling for rate limits, auth failures
- Configurable via UI

**Stories:** 5
- STORY-003-01: Provider Adapter Interface
- STORY-003-02: OpenAI Provider (with z.ai, moonshot.ai compatibility)
- STORY-003-03: Anthropic Provider
- STORY-003-04: Ollama Provider
- STORY-003-05: Model Configuration UI Panel

**Dependencies:** EPI-002 (Core Infrastructure)

---

## EPI-004: Test Execution Engine

**Goal:** Build API routes and test runner with real-time updates

**Business Value:**
- Automated test execution
- Real-time progress visibility
- Batch testing capability

**Success Criteria:**
- Single test execution API
- Batch test execution API
- SSE streaming for real-time updates
- File-based result storage with deduplication

**Stories:** 6
- STORY-004-01: State Management (LLMContext)
- STORY-004-02: API Client Functions
- STORY-004-03: Model Configs API Routes
- STORY-004-04: Test Cases API Routes
- STORY-004-05: Execution API Routes (single & batch)
- STORY-004-06: Results API Routes & SSE Streaming

**Dependencies:** EPI-002, EPI-003

---

## EPI-005: Dashboard UI & Results

**Goal:** Build 4 view modes (Comparison, Individual, Leaderboard, Coverage)

**Business Value:**
- Visual test results comparison
- Coverage gap identification
- Resilience ranking across models

**Success Criteria:**
- Comparison view: side-by-side model responses
- Individual view: detailed single-model report
- Leaderboard view: ranked by resilience score
- Coverage view: OWASP LLM & TPI coverage bars
- Real-time dashboard updates via SSE

**Stories:** 7
- STORY-005-01: Results View Container
- STORY-005-02: Comparison View Component
- STORY-005-03: Individual View Component
- STORY-005-04: Leaderboard View Component
- STORY-005-05: Coverage View Component (OWASP & TPI)
- STORY-005-06: Response Evaluator (manual scoring)
- STORY-005-07: Real-time Updater (SSE client)

**Dependencies:** EPI-004

---

## EPI-006: Report Generation

**Goal:** Generate JSON, PDF, and Markdown reports

**Business Value:**
- Shareable test results
- Executive summary generation
- Recommendation engine

**Success Criteria:**
- JSON report export
- PDF report with tables and charts
- Markdown report for documentation
- Coverage breakdown included
- Recommendations generated

**Stories:** 3
- STORY-006-01: Report Generation Library
- STORY-006-02: Report API Endpoint
- STORY-006-03: Report Exporter UI Component

**Dependencies:** EPI-005

---

## EPI-007: Integration & Polish

**Goal:** Integrate LLM Testing tab into main application

**Business Value:**
- Seamless user experience
- Single application interface
- Production-ready deployment

**Success Criteria:**
- "LLM Tests" tab added to main navigation
- Routing works correctly
- Metadata updated
- Security review passed
- Documentation complete

**Stories:** 3
- STORY-007-01: Main Application Integration
- STORY-007-02: Security Hardening
- STORY-007-03: Documentation & Deployment Guide

**Dependencies:** EPI-006

---

## Epic Dependencies Graph

```
EPI-001 (Pattern Expansion)
    ↓
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
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pattern quality may vary | HIGH | Security audit of all new patterns |
| LLM API rate limits | MEDIUM | Configurable delays, retry logic |
| SSE connection stability | MEDIUM | Fallback to polling |
| File storage growth | LOW | Deduplication, pruning options |

---

## Acceptance Criteria per Epic

| Epic | AC |
|------|----|
| EPI-001 | All ~380 patterns added, categorized, tested |
| EPI-002 | Types compile, scoring produces 0-100, coverage tracked |
| EPI-003 | All 5 providers connect and return responses |
| EPI-004 | Tests execute, results persist, SSE streams work |
| EPI-005 | All 4 views render correctly, coverage bars display |
| EPI-006 | JSON/MD/PDF reports generate successfully |
| EPI-007 | Tab accessible, security review passed |

---

**Total Stories:** 31
**Estimated Patterns:** ~380 new
**Target Coverage:** 100% OWASP LLM + 100% Crowdstrike TPI
