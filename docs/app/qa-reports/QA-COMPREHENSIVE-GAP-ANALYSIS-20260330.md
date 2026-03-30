# Comprehensive QA Gap Analysis — 100% Coverage Audit

**Date:** 2026-03-30
**Auditor:** Abdul (BMAD Project Manager) with BMM QA, BMGD QA, and Cybersec SMEs
**Scope:** Full application surface audit against MASTER-QA-FRAMEWORK for 100% coverage
**Method:** Cross-module expert review across 8 testing dimensions
**Status:** Gap analysis only — no modifications to the QA Master Framework

---

## Executive Summary

The existing MASTER-QA-FRAMEWORK-AUDIT-REPORT (2026-03-30) provides a strong foundation but was scoped primarily around **code-level coverage** (files, routes, components). This comprehensive gap analysis extends that scope to cover **all 8 testing dimensions** required for true 100% coverage:

1. Functionality Testing
2. Integration Testing
3. Security Testing (Code Review + App Testing + API Testing)
4. UX Review, Audit & Testing
5. UI Review, Audit & Testing
6. UAT (User Acceptance Testing)
7. QA (Quality Assurance process coverage)
8. Red Team / Attack / Defense / Lab Systems (Sage, Arena, etc.)

### Coverage Heat Map

| Dimension | Framework Coverage | Actual Execution | Gap Severity |
|-----------|-------------------|------------------|--------------|
| Functionality Testing | 70% planned | ~40% executed | **HIGH** |
| Integration Testing | 15% planned | ~5% executed | **CRITICAL** |
| Security Testing | 60% planned | ~30% executed | **HIGH** |
| UX Review & Testing | 80% planned | ~25% executed | **HIGH** |
| UI Review & Testing | 75% planned | ~30% executed | **HIGH** |
| UAT | 85% planned | ~20% executed | **CRITICAL** |
| QA Process Coverage | 90% planned | ~50% executed | **MEDIUM** |
| Red Team / Lab Systems | 40% planned | ~20% executed | **CRITICAL** |

---

## 1. FUNCTIONALITY TESTING — Gap Analysis

### 1.1 What the Framework Covers

The framework tracks source files, test files, and test counts per package. It identifies 7,550+ passing unit tests and ~90 Playwright E2E tests.

### 1.2 What's Missing

#### 1.2.1 bu-tpi Package — Module-Level Functionality Gaps

| Module | Source Files | Test Files | Gap | Severity |
|--------|-------------|------------|-----|----------|
| **Shingan** (7 untested modules) | 10 | 3 | 7 modules with ZERO tests | **CRITICAL** |
| shingan-context.ts | 1 | 0 | Context-aware scanning untested | CRITICAL |
| shingan-exfiltration.ts | 1 | 0 | Data exfiltration detection untested | CRITICAL |
| shingan-metadata.ts | 1 | 0 | Metadata extraction untested | CRITICAL |
| shingan-payloads.ts | 1 | 0 | Payload analysis untested | CRITICAL |
| shingan-scanner.ts | 1 | 0 | Core scanner orchestration untested | CRITICAL |
| shingan-social.ts | 1 | 0 | Social engineering detection untested | CRITICAL |
| shingan-supply-chain.ts | 1 | 0 | Supply chain attack detection untested | CRITICAL |
| **Fingerprint/Kagami** | 26 | 4 | 22 files untested (19 probe types) | **CRITICAL** |
| - 19 probe types (api-metadata through watermark) | 19 | 0 | Zero probe-level tests | CRITICAL |
| - features.ts, types.ts | 2 | 0 | Supporting logic untested | HIGH |
| **Kotoba** | 10 | 1 | 9 files untested | **HIGH** |
| - scorer.ts | 1 | 0 | Scoring logic untested | HIGH |
| - generator.ts | 1 | 0 | Generation logic untested | HIGH |
| - 6 rule files (boundary, defense, output, priority, role, index) | 6 | 0 | All rule sets untested | HIGH |
| **Timechamber** | 9 | 1 | 8 files untested | **HIGH** |
| - simulator.ts | 1 | 0 | Core simulator untested | HIGH |
| - 5 attack types (accumulation, context-overflow, delayed-activation, persona-drift, session-persistence) | 5 | 0 | All temporal attack types untested | CRITICAL |
| **Benchmark** | 4 | 1 | 3 files untested | **MEDIUM** |
| - runner.ts, suites/*, types.ts | 3 | 0 | Benchmark runner and suites untested | MEDIUM |
| **Defense** | 3 | 1 | 2 files untested | **HIGH** |
| - recommender.ts | 1 | 0 | Defense recommendation engine untested | HIGH |
| **Sage** | 11 | 8 | 3 files untested | **MEDIUM** |
| - edgefuzz-mutations.ts | 1 | 0 | EdgeFuzz mutation strategies untested | MEDIUM |
| - webmcp-mutations.ts | 1 | 0 | WebMCP mutation strategies untested | MEDIUM |
| - index.ts (barrel) | 1 | 0 | Export barrel untested | LOW |
| **EdgeFuzz** | 3 | 1 | 2 files untested | **MEDIUM** |
| - generators.ts | 1 | 0 | Edge case generators untested | MEDIUM |
| **Fuzzing** | 7 | 4 | 3 files untested | **MEDIUM** |
| - protocol-fuzzer.ts | 1 | 0 | Protocol fuzzing untested | HIGH |
| **Validation Generators** | 15 | 0 | ALL 15 generators untested | **CRITICAL** |
| **Validation Corpus Utilities** | 4 | 0 | ALL 4 corpus utilities untested | **CRITICAL** |
| **skill-parser.ts** | 1 | 0 | Skill parsing untested | MEDIUM |

**Total bu-tpi gaps: ~75 source files lacking tests**

#### 1.2.2 dojolm-web — Component Functionality Gaps

| Component Category | Total | Tested | Untested | Severity |
|-------------------|-------|--------|----------|----------|
| admin/* | 9+ | ~2 | ~7 | HIGH |
| adversarial/* | 11+ | ~3 | ~8 | HIGH |
| attackdna/* | 12+ | ~4 | ~8 | HIGH |
| charts/* | 8+ | ~2 | ~6 | MEDIUM |
| coverage/* | 5+ | ~1 | ~4 | MEDIUM |
| guard/* | 6+ | ~2 | ~4 | HIGH |
| kagami/* | 5+ | ~1 | ~4 | HIGH |
| layout/* | 8+ | ~4 | ~4 | MEDIUM |
| llm/* | 25+ | ~10 | ~15 | HIGH |
| ronin/* | 6+ | ~2 | ~4 | HIGH |
| sengoku/* | 8+ | ~3 | ~5 | HIGH |
| strategic/* | 15+ | ~5 | ~10 | HIGH |
| Other categories | 28+ | ~15 | ~13 | MEDIUM |

**Total untested components: ~121 of ~257 (47%)**

#### 1.2.3 dojolm-web — API Route Functionality Gaps

9 API routes with ZERO tests:

| Route | Methods | Risk | Severity |
|-------|---------|------|----------|
| `/api/admin/validation/export/[runId]` | GET | Export injection | HIGH |
| `/api/admin/validation/report/[runId]` | GET | Report generation | HIGH |
| `/api/admin/validation/status/[runId]` | GET | State exposure | MEDIUM |
| `/api/admin/validation/verify` | POST | Validation bypass | HIGH |
| `/api/llm/fingerprint/signatures` | GET | Signature data exposure | MEDIUM |
| `/api/sensei/chat` | POST | LLM proxy, injection risk | **CRITICAL** |
| `/api/shingan/batch` | POST | Batch scanning | HIGH |
| `/api/shingan/scan` | POST | Core scan endpoint | **CRITICAL** |
| `/api/shingan/url` | POST | URL scanning, SSRF risk | **CRITICAL** |

#### 1.2.4 dojolm-scanner Package — ZERO Tests

| Item | Status | Severity |
|------|--------|----------|
| Entire `dojolm-scanner` package | 0 formal test suites | **CRITICAL** |
| Only ad-hoc `.cjs` scripts exist | Not integrated into test runner | CRITICAL |
| Published package with zero automated coverage | Risk of silent regressions | CRITICAL |

#### 1.2.5 dojolm-mcp Package — Partial Coverage

| Item | Source Files | Test Files | Gap | Severity |
|------|-------------|------------|-----|----------|
| Total | 33 | 20 | 13 files (~40%) | **HIGH** |
| Pipeline logic | ? | 0 | Untested | HIGH |
| Scenario handlers | ? | 0 | Untested | HIGH |
| Edge-case tool handlers | ? | 0 | Untested | MEDIUM |

#### 1.2.6 E2E Full-Lifecycle Functionality — ZERO Coverage

The existing Playwright specs are predominantly smoke-level. **No spec exercises a complete business workflow:**

| Workflow | Status | Severity |
|----------|--------|----------|
| Scanner: submit payload -> findings -> export | NOT TESTED | **CRITICAL** |
| LLM: add provider -> batch test -> results -> report | NOT TESTED | **CRITICAL** |
| Guard: switch mode -> check -> audit log -> export | NOT TESTED | HIGH |
| Compliance: select framework -> evidence -> PDF export | NOT TESTED | HIGH |
| Atemi Lab: select skill -> execute -> attack log | NOT TESTED | HIGH |
| Sengoku: create campaign -> run -> findings -> report | NOT TESTED | **CRITICAL** |
| Kumite: create match -> execute -> battle log | NOT TESTED | **CRITICAL** |
| Ronin: submit bug -> track -> detail view | NOT TESTED | HIGH |
| Kotoba: score prompt -> harden -> verify improvement | NOT TESTED | HIGH |
| Admin: run validation -> status -> calibrate -> verify | NOT TESTED | HIGH |
| Sensei: open drawer -> ask question -> verify response | NOT TESTED | MEDIUM |
| Kagami: fingerprint -> select target -> run -> results | NOT TESTED | **CRITICAL** |
| Shingan: deep scan -> configure -> execute -> report | NOT TESTED | **CRITICAL** |

---

## 2. INTEGRATION TESTING — Gap Analysis

### 2.1 What the Framework Covers

5 integration test files exist:
- `bu-tpi/src/llm/integration.test.ts`
- `bu-tpi/src/validation/__tests__/capa-integration.test.ts`
- `dojolm-web/src/lib/__tests__/cross-module-integration.test.ts`
- `dojolm-web/src/lib/db/__tests__/integration.test.ts`
- `dojolm-web/src/lib/db/__tests__/migrations-integration.test.ts`

### 2.2 What's Missing

#### 2.2.1 Cross-Package Integration — NOT TESTED

| Integration Path | Status | Severity |
|-----------------|--------|----------|
| dojolm-web frontend <-> dojolm-mcp backend | NOT TESTED | **CRITICAL** |
| dojolm-web frontend <-> dojolm-scanner | NOT TESTED | **CRITICAL** |
| bu-tpi scanner <-> dojolm-mcp tool execution | NOT TESTED | **CRITICAL** |
| Sengoku full pipeline (campaign -> bu-tpi -> web) | NOT TESTED | **CRITICAL** |
| Arena full pipeline (match create -> execute -> score -> display) | NOT TESTED | **CRITICAL** |
| Sage genetic pipeline (seed -> mutate -> score -> quarantine -> evolve) | NOT TESTED | HIGH |
| Kotoba pipeline (score -> rules -> harden -> re-score) | NOT TESTED | HIGH |
| Kagami pipeline (probe -> analyze -> signature match -> display) | NOT TESTED | HIGH |
| Timechamber pipeline (attack schedule -> simulate -> detect -> report) | NOT TESTED | HIGH |
| AttackDNA pipeline (ingest -> graph -> mutation -> lineage -> display) | NOT TESTED | HIGH |

#### 2.2.2 API Integration — NOT TESTED

| Gap | Description | Severity |
|-----|-------------|----------|
| True API integration tests | 80/89 routes have unit tests but ALL are mocked handler tests | **CRITICAL** |
| Real database interaction | No tests hit running Next.js with real SQLite | **CRITICAL** |
| Real MCP connection | No tests verify MCP server tool execution via API | HIGH |
| SSE streaming endpoints | `/api/llm/batch/[id]/stream`, `/api/arena/[id]/stream` untested end-to-end | HIGH |
| Cross-API workflows | No tests chain multiple API calls (e.g., create model -> run test -> get results) | **CRITICAL** |

#### 2.2.3 Storage Integration — Gaps

| Storage Layer | Unit Tested | Integration Tested | Severity |
|--------------|-------------|-------------------|----------|
| master-storage.ts | Yes | No | HIGH |
| file-storage.ts | Yes | No | HIGH |
| db-storage.ts | Partial | No | HIGH |
| arena-storage.ts | Yes | No | MEDIUM |
| guard-storage.ts | Yes | No | MEDIUM |
| sengoku-storage.ts | Partial | No | HIGH |
| ecosystem-storage.ts | No | No | HIGH |
| dna-storage.ts | Partial | No | MEDIUM |

#### 2.2.4 Database Integration

| Gap | Description | Severity |
|-----|-------------|----------|
| Migration path testing | Only 1 migration integration test exists | HIGH |
| Repository CRUD integration | Repositories tested in isolation, not with real DB | HIGH |
| Encryption round-trip | encryption.ts tested in isolation | MEDIUM |
| Retention policy integration | retention.ts not integration tested | MEDIUM |
| Query builder SQL injection | query-builder.ts not integration tested against real DB | **CRITICAL** |
| Concurrent access patterns | No concurrent read/write tests | HIGH |

---

## 3. SECURITY TESTING — Gap Analysis

### 3.1 What the Framework Covers

- Security test plan exists (`plans/security-test-plan.md`) with local + production checks
- SEC-01 through SEC-14 (HAKONE hardening) documented
- 4 Playwright API security tests
- Security audit report exists in `QA/security/audit-results/`
- XSS test tool exists (`tools/test-xss.ts`)
- Security hardening test (`lib/__tests__/security-hardening.test.ts`)
- Guard storage security test exists

### 3.2 What's Missing

#### 3.2.1 Code Review / Static Analysis Gaps

| Area | Status | Severity |
|------|--------|----------|
| Automated SAST (Static Application Security Testing) | NOT CONFIGURED | **CRITICAL** |
| Dependency vulnerability scanning (npm audit CI gate) | No CI enforcement | HIGH |
| Secret scanning (hardcoded keys, tokens) | No automated scanning | HIGH |
| CSP policy validation testing | Headers documented but not regression tested | HIGH |
| CORS policy testing | Only manual curl commands documented | HIGH |

#### 3.2.2 Application Security Testing Gaps

| Test Category | Current | Target | Gap | Severity |
|--------------|---------|--------|-----|----------|
| Authentication flow testing | Partial (login/logout) | Full auth lifecycle | Missing: token expiry, session fixation, concurrent sessions, password reset | **CRITICAL** |
| Authorization / RBAC testing | route-guard tested | Full RBAC matrix | Missing: role escalation, cross-tenant access, admin impersonation | **CRITICAL** |
| Input validation / injection | Partial (some Zod) | All 88 endpoints | Missing: 50%+ routes lack injection tests | HIGH |
| XSS prevention | 1 tool exists | Comprehensive | Missing: stored XSS, DOM XSS, reflected XSS per component | HIGH |
| CSRF protection | Mentioned in route-guard | Tested | No dedicated CSRF test suite | HIGH |
| Rate limiting | Documented | Tested | No rate-limit regression tests | HIGH |
| File upload security | Not tested | Tested | Image/audio/document upload paths untested for malicious files | **CRITICAL** |
| SSRF prevention | validateProviderUrl exists | Tested | Provider URL validation not regression tested | **CRITICAL** |
| Path traversal | fixture-reading paths | Tested | Only mentioned, no dedicated suite | HIGH |
| Error information leakage | api-error.ts exists | Tested | No systematic test for stack traces in responses | MEDIUM |

#### 3.2.3 API Security Testing Gaps

| Test Category | Current | Target | Gap | Severity |
|--------------|---------|--------|-----|----------|
| API authentication on all 88 routes | 4 Playwright tests | All routes | 84 routes lack auth boundary tests | **CRITICAL** |
| Method enforcement (TRACE, OPTIONS) | Documented as manual | Automated | No automated HTTP method fuzzing | HIGH |
| Request size limits | 256KB limit mentioned | Tested | No test verifies limit enforcement | MEDIUM |
| Response sanitization | Code exists | Tested | No tests verify PII/key redaction in responses | HIGH |
| Export injection prevention | Code exists for CSV | Tested | No test for formula injection in exports | HIGH |
| Streaming endpoint security | SSE endpoints exist | Tested | No auth/injection tests on streaming endpoints | **CRITICAL** |
| API key redaction | Code exists | Tested | No regression test for key exposure | HIGH |

#### 3.2.4 LLM-Specific Security Gaps

| Test Category | Status | Severity |
|--------------|--------|----------|
| Prompt injection via `/api/sensei/chat` | UNTESTED (route has no tests at all) | **CRITICAL** |
| Prompt injection via `/api/llm/chat` | Partial | HIGH |
| Model output sanitization | guard-middleware.ts partially tested | HIGH |
| Tool-use abuse in Sensei | tool-executor.ts tested but no abuse scenarios | **CRITICAL** |
| Adversarial skill engine sandboxing | adversarial-skill-engine.ts untested | **CRITICAL** |
| Guard bypass attempts | No dedicated bypass test suite | HIGH |
| PII leakage through LLM responses | No test suite | HIGH |

#### 3.2.5 Production Security Gaps

| Area | Status | Severity |
|------|--------|----------|
| Production security header validation | Manual curl only | HIGH |
| Production CORS enforcement | Manual curl only | HIGH |
| Production rate-limit under real proxy | NOT TESTED | HIGH |
| TLS/HTTPS enforcement | Documented, not automated | MEDIUM |
| Container security scanning | NOT CONFIGURED | MEDIUM |

---

## 4. UX REVIEW, AUDIT & TESTING — Gap Analysis

### 4.1 What the Framework Covers

- UAT-UX-COVERAGE-MATRIX.generated.md provides comprehensive inventory
- uat-ux-testing-plan.md defines Playwright-first policy, control-level standards
- 20 Playwright E2E specs cover all navigable modules
- Module-level QA UI plans exist in archive for most modules

### 4.2 What's Missing

#### 4.2.1 UX Heuristic Evaluation — NOT PERFORMED

| Heuristic | Status | Severity |
|-----------|--------|----------|
| Visibility of system status | No systematic evaluation | HIGH |
| Match between system and real world | No evaluation | MEDIUM |
| User control and freedom (undo/cancel) | No evaluation | HIGH |
| Consistency and standards | No cross-module consistency audit | HIGH |
| Error prevention | No proactive error prevention audit | HIGH |
| Recognition rather than recall | No evaluation | MEDIUM |
| Flexibility and efficiency of use | No evaluation | MEDIUM |
| Aesthetic and minimalist design | No evaluation | LOW |
| Help users recognize and recover from errors | No error recovery audit | HIGH |
| Help and documentation | Only Sensei chat exists | MEDIUM |

#### 4.2.2 UX Flow Completeness — Gaps

| Flow | Status | Gap | Severity |
|------|--------|-----|----------|
| First-time user onboarding | No tests | No onboarding flow tested | HIGH |
| Cross-module navigation continuity | Partial (nav tested) | Context loss between modules not tested | HIGH |
| Loading/skeleton state consistency | Not audited | No standard loading pattern verified | MEDIUM |
| Error state consistency | Not audited | Error handling varies per module | HIGH |
| Empty state messaging | Not audited | Empty states not verified for helpfulness | MEDIUM |
| Keyboard-only navigation | Mentioned in plan | No Playwright keyboard-only suite | HIGH |
| Screen reader compatibility | NOT TESTED | No accessibility testing at all | **CRITICAL** |
| Mobile UX patterns | 1 mobile nav spec | Mobile interactions beyond nav untested | HIGH |

#### 4.2.3 UX Interaction Pattern Gaps

| Pattern | Current Coverage | Gap | Severity |
|---------|-----------------|-----|----------|
| Form validation feedback | No systematic test | Inline validation UX not verified | HIGH |
| Multi-step wizard UX | Wizards exist (Ronin, Arena) | No wizard flow UX tests | HIGH |
| Drawer/modal behavior | Partial | Focus trap, escape, overlay tested only in mobile-nav | HIGH |
| Toast/notification UX | Not tested | Notification timing, stacking, dismissal untested | MEDIUM |
| Data table interactions | Not tested | Sort, filter, paginate, row actions untested | HIGH |
| Search UX | Not tested | Search across modules not evaluated | MEDIUM |
| Real-time update UX | Not tested | SSE/streaming UI feedback untested | HIGH |

---

## 5. UI REVIEW, AUDIT & TESTING — Gap Analysis

### 5.1 What the Framework Covers

- Component inventory (257 total, 136 tested)
- shadcn/ui base components
- UAT screenshots exist for 11 modules
- Style guide page exists (`/style-guide`)

### 5.2 What's Missing

#### 5.2.1 Visual Regression Testing — ZERO Coverage

| Area | Status | Severity |
|------|--------|----------|
| Automated visual regression (Percy, Chromatic, etc.) | NOT CONFIGURED | **CRITICAL** |
| Screenshot comparison baseline | No baseline exists | HIGH |
| Cross-browser rendering | Not tested (Playwright only runs Chromium) | HIGH |
| Dark mode / theme consistency | Not applicable currently but no theme tests | LOW |

#### 5.2.2 Responsive Design Testing — Minimal

| Viewport | Status | Severity |
|----------|--------|----------|
| Desktop (1280+) | Smoke tested via Playwright | MEDIUM |
| Tablet (768-1024) | NOT TESTED | HIGH |
| Mobile (320-767) | Only mobile-nav.spec.ts + prod config | HIGH |
| Ultra-wide (1920+) | NOT TESTED | LOW |

#### 5.2.3 Component UI State Testing — Gaps

| State | Framework Coverage | Execution | Severity |
|-------|-------------------|-----------|----------|
| Default/resting state | Smoke tests only | ~40% components | HIGH |
| Hover state | NOT TESTED | 0% | MEDIUM |
| Active/pressed state | NOT TESTED | 0% | MEDIUM |
| Focused state | Mentioned in plan | 0% executed | HIGH |
| Disabled state | NOT TESTED | 0% | HIGH |
| Loading/skeleton state | NOT TESTED | 0% | HIGH |
| Error state | NOT TESTED | 0% | HIGH |
| Empty state | NOT TESTED | 0% | HIGH |

#### 5.2.4 Design System Consistency — NOT AUDITED

| Area | Status | Severity |
|------|--------|----------|
| Typography consistency across modules | No audit | MEDIUM |
| Color palette compliance | No audit | MEDIUM |
| Spacing/layout grid consistency | No audit | MEDIUM |
| Icon usage consistency | No audit | LOW |
| Button variant consistency | No audit | MEDIUM |
| Form element styling | No audit | MEDIUM |

---

## 6. UAT (User Acceptance Testing) — Gap Analysis

### 6.1 What the Framework Covers

- QA-MASTER-PLAN.md defines 100% coverage standard including UAT
- Module-by-module epic structure (SHELL-001 through SHELL-004, DASH-001 through DASH-004, SCAN-001+, etc.)
- UAT screenshot evidence exists for 11 modules
- Production UAT process defined (E2E_TARGET=prod)

### 6.2 What's Missing

#### 6.2.1 UAT Epic Execution Status

| Epic Group | Epics Defined | Epics Executed | Gap | Severity |
|------------|--------------|----------------|-----|----------|
| SHELL (Navigation) | 4 | 0 formally executed | 4 pending | HIGH |
| DASH (Dashboard) | 4 | 0 formally executed | 4 pending | HIGH |
| SCAN (Scanner) | 3+ | 0 formally executed | 3+ pending | **CRITICAL** |
| LLM (LLM Dashboard) | 3+ | 0 formally executed | 3+ pending | **CRITICAL** |
| GUARD (Hattori Guard) | 2+ | 0 formally executed | 2+ pending | HIGH |
| COMP (Bushido Book) | 2+ | 0 formally executed | 2+ pending | HIGH |
| ATEMI (Atemi Lab) | 3+ | 0 formally executed | 3+ pending | HIGH |
| KUMITE (Arena) | 3+ | 0 formally executed | 3+ pending | **CRITICAL** |
| RONIN (Bug Bounty) | 2+ | 0 formally executed | 2+ pending | HIGH |
| SENGOKU (Campaigns) | 3+ | 0 formally executed | 3+ pending | **CRITICAL** |
| KOTOBA (Knowledge) | 2+ | 0 formally executed | 2+ pending | HIGH |
| ADMIN (Admin Panel) | 3+ | 0 formally executed | 3+ pending | HIGH |
| SENSEI (AI Chat) | 2+ | 0 formally executed | 2+ pending | MEDIUM |
| KAGAMI (Fingerprint) | 2+ | 0 formally executed | 2+ pending | HIGH |
| SHINGAN (Deep Scan) | 2+ | 0 formally executed | 2+ pending | **CRITICAL** |

**Note:** Epics are well-defined in QA-MASTER-PLAN.md but execution evidence is missing. The smoke-level Playwright tests do NOT satisfy epic requirements (which demand full lifecycle, recovery paths, cross-module handoffs, and system outcome verification).

#### 6.2.2 UAT Environment Gaps

| Gap | Description | Severity |
|-----|-------------|----------|
| Production UAT sign-off | No formal production UAT run documented | **CRITICAL** |
| UAT with real data | All tests use mocked/empty state | HIGH |
| UAT with real LLM providers | No UAT against live LLM APIs | HIGH |
| UAT with real MCP server | No UAT with running MCP tools | HIGH |
| Multi-user UAT | No concurrent user testing | MEDIUM |
| UAT acceptance criteria sign-off | No formal stakeholder sign-off process | HIGH |

---

## 7. QA PROCESS COVERAGE — Gap Analysis

### 7.1 What the Framework Covers

- QA-MASTER-PLAN.md (comprehensive, well-structured)
- QA-PROCEDURES.md (standard operating flow)
- Testing execution checklist
- Generated coverage matrices (QA + UAT/UX)
- QA-Log with evidence artifacts
- Module-by-module coverage epics
- Adversarial guardrails

### 7.2 What's Missing

#### 7.2.1 CI/CD Quality Gates — Gaps

| Gate | Status | Severity |
|------|--------|----------|
| Unit test pass gate | ci.yml exists | LOW |
| Coverage threshold gate (80%+) | NOT CONFIGURED | HIGH |
| Fixture validation gate | NOT CONFIGURED | **CRITICAL** |
| dojolm-scanner test gate | NOT POSSIBLE (0 tests) | CRITICAL |
| E2E test gate | NOT IN CI | HIGH |
| SAST security gate | NOT CONFIGURED | HIGH |
| Dependency vulnerability gate | dependabot exists but no blocking gate | MEDIUM |
| Visual regression gate | NOT CONFIGURED | MEDIUM |
| Performance regression gate | NOT CONFIGURED | MEDIUM |

#### 7.2.2 Test Data Management — Gaps

| Area | Status | Severity |
|------|--------|----------|
| Fixture data versioning | manifest.json exists | LOW |
| Test database seeding | `/api/llm/seed` exists | LOW |
| Test data isolation | No formal strategy | HIGH |
| Test environment parity | Local != Production (documented) | MEDIUM |
| Fixture file integrity validation | Only 6/36 categories validated | **CRITICAL** |

#### 7.2.3 Non-Functional Testing — ZERO Coverage

| Area | Framework Mention | Execution | Severity |
|------|------------------|-----------|----------|
| Accessibility (A11Y) | Mentioned as 0% in audit report | NOT TESTED | **CRITICAL** |
| Performance testing | performance-testing-guide.md exists (PERF-001 to PERF-020) | NOT EXECUTED | HIGH |
| Visual regression | Listed as optional in Phase 5 | NOT CONFIGURED | MEDIUM |
| Load/stress testing | NOT MENTIONED | NOT TESTED | HIGH |
| Contract testing (API schema) | Listed as 0% | NOT CONFIGURED | MEDIUM |

---

## 8. RED TEAM / ATTACK / DEFENSE / LAB SYSTEMS — Gap Analysis

This is the most domain-specific and critical section for the BU-TPI platform, which IS a red-teaming and security testing tool.

### 8.1 Arena System (The Kumite)

#### Source Files (bu-tpi/src/arena/):
| File | Test | Gap | Severity |
|------|------|-----|----------|
| arena.ts | arena.test.ts | COVERED | - |
| match-runner.ts | match-runner.test.ts | COVERED | - |
| game-modes.ts | game-modes.test.ts | COVERED | - |
| referee.ts | referee.test.ts | COVERED | - |
| sandbox.ts | sandbox.test.ts | COVERED | - |
| environment.ts | environment.test.ts | COVERED | - |
| types.ts | N/A (types only) | N/A | - |
| index.ts | N/A (barrel) | N/A | - |

**Unit coverage: GOOD (6/6 core files tested)**

#### Arena Integration Gaps:

| Gap | Description | Severity |
|-----|-------------|----------|
| Arena E2E lifecycle | Create match -> execute -> score -> view results NOT TESTED | **CRITICAL** |
| Arena web components | ~15 strategic/* components (50%+ untested) | HIGH |
| Arena API routes | `/api/arena/[id]`, `/api/arena/[id]/stream`, `/api/arena/export` tested but streaming not E2E tested | HIGH |
| Arena <-> bu-tpi integration | Web frontend calling bu-tpi arena engine not integration tested | **CRITICAL** |
| Arena audio/commentary | `arena-audio.ts`, `arena-commentary.ts` in dojolm-web — untested | MEDIUM |
| Arena sage integration | `arena-sage.ts` in dojolm-web — untested | HIGH |
| Match replay/comparison | Not tested | MEDIUM |
| Game mode matrix | 6 game modes tested in unit but not validated end-to-end | HIGH |

### 8.2 Sage System (Genetic Attack Evolution)

#### Source Files (bu-tpi/src/sage/):
| File | Test | Gap | Severity |
|------|------|-----|----------|
| sage.ts | sage.test.ts | COVERED | - |
| genetic-core.ts | genetic-core.test.ts | COVERED | - |
| mutation-engine.ts | mutation-engine.test.ts | COVERED | - |
| content-safety.ts | content-safety.test.ts | COVERED | - |
| reasoning-lab.ts | reasoning-lab.test.ts | COVERED | - |
| seed-library.ts | seed-library.test.ts | COVERED | - |
| quarantine.ts | quarantine.test.ts | COVERED | - |
| embeddings-explorer.ts | embeddings-explorer.test.ts | COVERED | - |
| edgefuzz-mutations.ts | NONE | NOT TESTED | **HIGH** |
| webmcp-mutations.ts | NONE | NOT TESTED | **HIGH** |
| types.ts | N/A | N/A | - |

**Unit coverage: GOOD (8/9 core files tested, 2 mutation strategy files missing)**

#### Sage Integration Gaps:

| Gap | Description | Severity |
|-----|-------------|----------|
| Sage full genetic pipeline | seed -> mutate -> score -> quarantine -> evolve NOT TESTED end-to-end | **CRITICAL** |
| Sage <-> Scanner integration | Generated variants not tested against scanner for detection validation | **CRITICAL** |
| EdgeFuzz mutation strategies | edgefuzz-mutations.ts has 0 tests | HIGH |
| WebMCP mutation strategies | webmcp-mutations.ts has 0 tests | HIGH |
| Sage UI (web) | arena-sage.ts, Sage dashboard components untested | HIGH |
| Reasoning lab effectiveness | Semantic reasoning quality not measured | MEDIUM |
| Quarantine escape testing | Quarantine bypass attempts not tested | HIGH |
| Content safety bypass | Safety filter adversarial robustness not tested | **CRITICAL** |

### 8.3 Atemi Lab (Adversarial Skill Engine)

| Gap | Description | Severity |
|-----|-------------|----------|
| adversarial-skill-engine.ts | UNTESTED (in dojolm-web lib) | **CRITICAL** |
| Adversarial skill definitions | adversarial-skills-*.ts files untested | HIGH |
| Atemi Lab E2E lifecycle | Select skill -> execute -> verify attack log NOT TESTED | **CRITICAL** |
| Atemi Lab components | adversarial/* components ~70% untested | HIGH |
| Ablation engine | ablation-engine.ts untested | HIGH |
| Skill sandboxing security | No sandbox escape tests | **CRITICAL** |

### 8.4 Timechamber (Temporal Attacks)

| File | Test | Severity |
|------|------|----------|
| simulator.ts | NONE | **CRITICAL** |
| attacks/accumulation.ts | NONE | **CRITICAL** |
| attacks/context-overflow.ts | NONE | **CRITICAL** |
| attacks/delayed-activation.ts | NONE | **CRITICAL** |
| attacks/persona-drift.ts | NONE | **CRITICAL** |
| attacks/session-persistence.ts | NONE | **CRITICAL** |
| timechamber.test.ts | EXISTS | Only covers orchestrator, not individual attacks |

**Coverage: CRITICAL — 5 unique temporal attack types with ZERO individual tests. The timechamber.test.ts only covers the top-level orchestrator.**

### 8.5 Fingerprint/Kagami System

| Component | Source Files | Tests | Gap | Severity |
|-----------|------------|-------|-----|----------|
| Core engine | engine.ts | engine.test.ts | COVERED | - |
| Probe runner | probe-runner.ts | probe-runner.test.ts | COVERED | - |
| Response analyzer | response-analyzer.ts | response-analyzer.test.ts | COVERED | - |
| Signature matcher | signature-matcher.ts | signature-matcher.test.ts | COVERED | - |
| **19 probe types** | 19 files in probes/ | NONE | **ALL 19 UNTESTED** | **CRITICAL** |
| - api-metadata | 1 | 0 | UNTESTED | CRITICAL |
| - capability | 1 | 0 | UNTESTED | CRITICAL |
| - censorship | 1 | 0 | UNTESTED | CRITICAL |
| - context-window | 1 | 0 | UNTESTED | CRITICAL |
| - fine-tuning | 1 | 0 | UNTESTED | CRITICAL |
| - knowledge-boundary | 1 | 0 | UNTESTED | CRITICAL |
| - model-lineage | 1 | 0 | UNTESTED | CRITICAL |
| - multi-turn | 1 | 0 | UNTESTED | CRITICAL |
| - multimodal | 1 | 0 | UNTESTED | CRITICAL |
| - parameter-sensitivity | 1 | 0 | UNTESTED | CRITICAL |
| - quantization | 1 | 0 | UNTESTED | CRITICAL |
| - safety-boundary | 1 | 0 | UNTESTED | CRITICAL |
| - self-disclosure | 1 | 0 | UNTESTED | CRITICAL |
| - style-analysis | 1 | 0 | UNTESTED | CRITICAL |
| - timing-latency | 1 | 0 | UNTESTED | CRITICAL |
| - tokenizer | 1 | 0 | UNTESTED | CRITICAL |
| - watermark | 1 | 0 | UNTESTED | CRITICAL |
| - presets | 1 | 0 | UNTESTED | HIGH |
| features.ts | 1 | 0 | UNTESTED | HIGH |
| Kagami signatures DB | kagami-signatures.json | N/A | Integrity not validated | MEDIUM |

### 8.6 Fixture Validation System

| Category | Total Categories | Validated | Gap | Severity |
|----------|-----------------|-----------|-----|----------|
| Fixture pass-through validation | 36 | 6 (17%) | 30 categories | **CRITICAL** |
| Fixture cross-module validation | 36 | 5 categories | 31 categories | **CRITICAL** |

**30 unvalidated fixture categories:**
`agent-output`, `audio`, `audio-attacks`, `boundary`, `code`, `cognitive`, `delivery-vectors`, `document-attacks`, `email-webfetch`, `environmental`, `few-shot`, `images`, `malformed`, `mcp`, `model-theft`, `modern`, `multimodal`, `or`, `output`, `rag`, `search-results`, `session`, `supply-chain` (partial), `tool-manipulation`, `translation`, `untrusted-sources`, `vec`, `video`, `web`, `webmcp`

### 8.7 Validation Generator System

| Generator | Test | Severity |
|-----------|------|----------|
| binary-variations.ts | NONE | **CRITICAL** |
| boundary-variations.ts | NONE | **CRITICAL** |
| combination-variations.ts | NONE | **CRITICAL** |
| corpus-generation-pipeline.ts | NONE | **CRITICAL** |
| default-generators.ts | NONE | **CRITICAL** |
| encoding-variations.ts | NONE | **CRITICAL** |
| generator-registry.ts | NONE | **CRITICAL** |
| indirect-injection-variations.ts | NONE | **CRITICAL** |
| multi-turn-variations.ts | NONE | **CRITICAL** |
| multilingual-variations.ts | NONE | **CRITICAL** |
| paraphrase-variations.ts | NONE | **CRITICAL** |
| semantic-evasion-variations.ts | NONE | **CRITICAL** |
| stress-variations.ts | NONE | **CRITICAL** |
| structural-variations.ts | NONE | **CRITICAL** |
| unicode-variations.ts | NONE | **CRITICAL** |

**Plus 4 corpus utilities:** `corpus-expander.ts`, `fixture-labeler.ts`, `gap-analysis.ts`, `holdout-separator.ts` — ALL UNTESTED.

### 8.8 Attack DNA System

| File | Test | Severity |
|------|------|----------|
| bu-tpi attackdna/* | 7/8 tested | LOW |
| graph-builder.ts | UNTESTED | HIGH |
| dojolm-web attackdna components | ~67% untested | HIGH |
| AttackDNA API routes | Tested | LOW |
| AttackDNA E2E lifecycle | NOT TESTED | HIGH |

### 8.9 Defense System

| File | Test | Severity |
|------|------|----------|
| defense.ts | defense.test.ts | COVERED |
| recommender.ts | NONE | **HIGH** |
| Defense <-> Scanner integration | NOT TESTED | HIGH |
| Defense recommendation accuracy | NOT VALIDATED | HIGH |

### 8.10 Fuzzing System

| File | Test | Severity |
|------|------|----------|
| fuzzer.ts | fuzzer.test.ts | COVERED |
| grammar.ts | grammar.test.ts | COVERED |
| fuzzing.test.ts | EXISTS | COVERED |
| benchmark.test.ts | EXISTS | COVERED |
| comparison.ts | comparison.test.ts | COVERED |
| protocol-fuzzer.ts | NONE | **HIGH** |
| Full fuzzing pipeline E2E | NOT TESTED | HIGH |

### 8.11 EdgeFuzz System

| File | Test | Severity |
|------|------|----------|
| edgefuzz.test.ts | EXISTS (top-level) | COVERED |
| generators.ts | NONE | **HIGH** |
| EdgeFuzz <-> Sage mutation integration | NOT TESTED | HIGH |

### 8.12 Sengoku Campaign System

| Component | Unit Tested | E2E Tested | Integration Tested | Severity |
|-----------|------------|------------|-------------------|----------|
| Campaign CRUD | Partial | Smoke only | No | HIGH |
| Campaign execution | Partial | No | No | **CRITICAL** |
| Webhook delivery | No | No | No | HIGH |
| Campaign <-> bu-tpi scanner | No | No | No | **CRITICAL** |
| Report generation | No | No | No | HIGH |

### 8.13 MCP Adversarial System

| Component | Tested | Gap | Severity |
|-----------|--------|-----|----------|
| MCP server core | 20 tests | ~40% file coverage | HIGH |
| Attack engine | Partial | Edge cases untested | HIGH |
| Tool execution pipeline | Partial | No pipeline tests | **CRITICAL** |
| MCP <-> bu-tpi integration | No | No cross-package tests | **CRITICAL** |
| MCP <-> web frontend | No | No integration tests | **CRITICAL** |

---

## 9. SUMMARY: Top 30 Critical Gaps

Prioritized by impact and risk:

| # | Gap | Dimension | Severity |
|---|-----|-----------|----------|
| 1 | 15 validation generators with ZERO tests | Functionality | CRITICAL |
| 2 | 30/36 fixture categories unvalidated (83%) | Red Team | CRITICAL |
| 3 | dojolm-scanner package: 0 formal tests | Functionality | CRITICAL |
| 4 | ZERO E2E full-lifecycle tests (all 14 modules) | Functionality | CRITICAL |
| 5 | ZERO true API integration tests (all 88 routes mocked) | Integration | CRITICAL |
| 6 | 19 Kagami probe types with ZERO tests | Red Team | CRITICAL |
| 7 | 7 Shingan modules with ZERO tests | Red Team | CRITICAL |
| 8 | 5 Timechamber attack types with ZERO tests | Red Team | CRITICAL |
| 9 | adversarial-skill-engine.ts UNTESTED | Red Team | CRITICAL |
| 10 | ZERO cross-package integration tests | Integration | CRITICAL |
| 11 | `/api/sensei/chat` route UNTESTED (SSRF/injection risk) | Security | CRITICAL |
| 12 | `/api/shingan/scan` and `/api/shingan/url` UNTESTED | Security | CRITICAL |
| 13 | Query builder SQL injection not integration tested | Security | CRITICAL |
| 14 | File upload security (malicious file testing) UNTESTED | Security | CRITICAL |
| 15 | Accessibility (A11Y) testing: ZERO coverage | UX | CRITICAL |
| 16 | Automated visual regression: NOT CONFIGURED | UI | CRITICAL |
| 17 | ZERO formal UAT epic executions | UAT | CRITICAL |
| 18 | No production UAT sign-off documented | UAT | CRITICAL |
| 19 | Coverage threshold CI gate NOT CONFIGURED | QA | CRITICAL |
| 20 | Sage content-safety bypass testing UNTESTED | Red Team | CRITICAL |
| 21 | Authentication lifecycle gaps (session fixation, expiry) | Security | CRITICAL |
| 22 | RBAC cross-tenant access testing UNTESTED | Security | CRITICAL |
| 23 | 121 components untested (47% of total) | Functionality | HIGH |
| 24 | Sage full genetic pipeline not E2E tested | Red Team | HIGH |
| 25 | Kotoba: 9/10 source files untested | Functionality | HIGH |
| 26 | Timechamber: 8/9 source files untested | Functionality | HIGH |
| 27 | Keyboard-only navigation testing UNTESTED | UX | HIGH |
| 28 | Tablet viewport NOT TESTED | UI | HIGH |
| 29 | Performance testing: defined but NOT EXECUTED | QA | HIGH |
| 30 | Arena web components 50%+ untested | Red Team | HIGH |

---

## 10. RECOMMENDED REMEDIATION PHASES

### Phase 0: Immediate / Zero-Risk Quick Wins (1-2 days)
- Fix 9 missing API route tests
- Add dojolm-scanner formal test suite scaffold
- Configure coverage threshold CI gate (80%)
- Run `npm audit` and document findings

### Phase 1: Red Team & Lab System Hardening (Week 1-2)
- Test all 15 validation generators
- Test all 19 Kagami probe types
- Test all 5 Timechamber attack types
- Test 7 untested Shingan modules
- Test adversarial-skill-engine.ts
- Expand fixture validation to all 36 categories
- Test Sage edgefuzz-mutations and webmcp-mutations

### Phase 2: Security Hardening (Week 3-4)
- Full auth lifecycle test suite (session fixation, expiry, concurrent, CSRF)
- RBAC escalation/cross-tenant test suite
- API authentication boundary tests for all 88 routes
- File upload security testing
- SSRF regression testing
- LLM-specific security suite (prompt injection, tool abuse, guard bypass)
- Streaming endpoint security tests
- SAST tooling integration

### Phase 3: Full-Lifecycle E2E (Week 5-6)
- 14 full-lifecycle Playwright specs (one per module)
- Cross-module handoff tests
- Error/recovery path tests
- Export/download verification tests

### Phase 4: Integration Testing (Week 7-8)
- Cross-package integration suite (web <-> mcp, web <-> scanner, bu-tpi <-> mcp)
- True API integration tests with real database
- Full pipeline tests (Sengoku, Arena, Sage, Kagami)
- Storage integration validation
- SSE streaming end-to-end tests

### Phase 5: UAT Execution & UX Audit (Week 9-10)
- Execute all UAT epics defined in QA-MASTER-PLAN.md
- Formal production UAT run with evidence capture
- UX heuristic evaluation (Nielsen's 10 heuristics)
- Accessibility audit (WCAG 2.1 AA)
- Keyboard-only navigation audit
- Component state matrix testing (disabled, loading, error, empty)

### Phase 6: UI Polish & Non-Functional (Week 11-12)
- Configure visual regression testing
- Responsive design testing (tablet, ultra-wide)
- Performance test execution (PERF-001 to PERF-020)
- Design system consistency audit
- Cross-browser testing (Firefox, Safari)
- Load/stress testing for critical endpoints

---

## 11. METRICS DASHBOARD

### Current State vs Target

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| bu-tpi file coverage | ~60% | 95%+ | GAP |
| dojolm-web component coverage | 53% | 95%+ | GAP |
| dojolm-web API route coverage | 90% | 100% | NEAR |
| dojolm-scanner coverage | 0% | 80%+ | CRITICAL |
| dojolm-mcp coverage | ~60% | 80%+ | GAP |
| Fixture category validation | 17% | 100% | CRITICAL |
| Validation generator tests | 0% | 100% | CRITICAL |
| Kagami probe tests | 0% | 100% | CRITICAL |
| E2E lifecycle coverage | 0% | 100% (14 modules) | CRITICAL |
| Integration test coverage | ~5% | 80%+ | CRITICAL |
| Security test coverage | ~30% | 90%+ | GAP |
| UAT epic execution | 0% | 100% | CRITICAL |
| Accessibility coverage | 0% | WCAG 2.1 AA | CRITICAL |
| Visual regression | 0% | Key flows | GAP |
| Performance testing | 0% | PERF-001 to PERF-020 | GAP |

---

*This gap analysis was produced by cross-referencing the full application source tree (5 packages, 1,452 source files, 505 test files, 88 API routes, 322 components, 36 fixture categories, 19 probe types, 15 validation generators, 5 temporal attack types) against the existing MASTER-QA-FRAMEWORK-AUDIT-REPORT, QA-MASTER-PLAN, QA-GAP-ANALYSIS, security-test-plan, and uat-ux-testing-plan.*

*SME contributors: BMM QA (Quinn), BMGD QA (GLaDOS), Cybersec (Bastion, Ghost, Sentinel)*

*This document does NOT modify the QA Master Framework. It provides findings for review and prioritization.*

---
---

# ADDENDUM: Adversarial Audit Corrections (2026-03-30)

**Audit method:** Four parallel adversarial agents cross-verified every claim in the gap analysis against the actual filesystem. This addendum corrects errors, identifies false claims, and surfaces gaps the original analysis missed entirely.

## ERRATA — Claims That Were WRONG

### E1. "15 validation generators with ZERO tests" — FALSE

**All 15 generators have dedicated test files.** Tests are located in `generators/__tests__/`:
- binary-variations.test.ts, boundary-variations.test.ts, combination-variations.test.ts
- corpus-generation-pipeline.test.ts, default-generators.test.ts, encoding-variations.test.ts
- generator-registry.test.ts, indirect-injection-variations.test.ts, multi-turn-variations.test.ts
- multilingual-variations.test.ts, paraphrase-variations.test.ts, semantic-evasion-variations.test.ts
- stress-variations.test.ts, structural-variations.test.ts, unicode-variations.test.ts

**Impact:** This was listed as the #1 critical gap. It is not a gap at all. Generator coverage is 100%.

### E2. "4 corpus utilities with ZERO tests" — FALSE

All 4 corpus utilities have tests: corpus-expander, fixture-labeler, gap-analysis, holdout-separator.

### E3. "9 API routes with ZERO tests" — FALSE

**All 89 API routes have corresponding test files.** The original analysis failed to detect:
- Tests using consolidated `__tests__/route.test.ts` at parent directory level (shingan/scan, shingan/url share one test file)
- Tests in dynamic route directories (admin/validation/export/[runId], admin/validation/report/[runId], etc.)
- The sensei/chat route test (188 lines)
- The shingan/batch route test (94 lines)

**Corrected: API route test coverage is 89/89 = 100%, not 80/89 = 90%**

### E4. "7 Shingan modules with ZERO tests" — FALSE

All Shingan modules now have tests:
- shingan-context.ts, shingan-exfiltration.ts, shingan-metadata.ts, shingan-payloads.ts
- shingan-scanner.ts, shingan-social.ts, shingan-supply-chain.ts
- Plus the previously acknowledged: shingan-trust, shingan-parser, shingan-patterns

**All 10 shingan modules are tested.**

### E5. "skill-parser.ts untested" — FALSE

skill-parser.ts has a test file.

### E6. E2E spec count: "16 files" — INCORRECT

There are **19** Playwright spec files, not 16. The following three were listed as "missing quick-wins" but **already exist**:
- `sensei.spec.ts` — EXISTS
- `shingan.spec.ts` — EXISTS
- `attackdna.spec.ts` — EXISTS

### E7. Component count: "257 total, 121 untested (47%)" — INFLATED

| Metric | Original Claim | Actual | Correction |
|--------|---------------|--------|------------|
| Total components | 257 | 232 | -25 (overcounted) |
| Untested components | 121 (47%) | 96 (41%) | -25 (overcounted) |
| Tested components | 136 | 136 | Accurate |

### E8. "30/36 fixture categories unvalidated" — SLIGHTLY OVERSTATED

Cross-module tests validate 3 additional categories (agent, context, supply-chain) beyond the 6 in fixture-validation.test.ts. **Corrected: 27/36 unvalidated (75%), not 30/36 (83%).**

---

## ERRATA — Claims That Were UNDERSTATED

### U1. bmad-cybersec Package: 91 Files, ZERO Tests — ENTIRELY MISSED

The gap analysis barely mentioned `bmad-cybersec`. This is a **standalone security validation framework** with:
- **91 TypeScript source files** in `packages/bmad-cybersec/validators/src/`
- **7 security domains:** ai-safety (25+ files), guards (21 files), observability (29 files), permissions (14 files), resource-management (17 files), common (19 files), types (6 files)
- **ZERO test files**
- Contains critical validators: xss-safety.ts, bash-safety.ts, env-protection.ts, prompt-injection.ts, pii-detection
- Has vitest.config.ts (test infrastructure planned but never implemented)

**This is the single largest untested security surface in the entire project.**

### U2. dojolm-web Provider Layer: 9 Files, ZERO Tests — MISSED

All 9 LLM provider implementations in `packages/dojolm-web/src/lib/providers/` have ZERO tests:
- anthropic.ts, openai.ts, ollama.ts, lmstudio.ts, llamacpp.ts, moonshot.ts, zai.ts, errors.ts, index.ts

These are the adapters that make real API calls to external LLM services. Untested provider code means:
- SSRF vulnerabilities in URL construction unverified
- API key handling unverified
- Error response parsing unverified
- Timeout and retry logic unverified

### U3. dojolm-web Database Repositories: 9 Files, ZERO Dedicated Tests — UNDERSTATED

All 9 repository files lack dedicated unit tests:
- audit.repository.ts, base.repository.ts, batch.repository.ts, execution.repository.ts
- model-config.repository.ts, scoreboard.repository.ts, test-case.repository.ts
- user.repository.ts, index.ts

The gap analysis mentioned "repository CRUD integration" as a general concern but did not enumerate the 9 untested files or flag the user.repository.ts (password hashing) and model-config.repository.ts (API key encryption) as critical security gaps.

### U4. api-route-access.ts — Critical Security File, ZERO Tests — MISSED

`packages/dojolm-web/src/lib/api-route-access.ts` defines which routes bypass authentication. This is a **security-critical whitelist** with zero test coverage. A misconfiguration here would expose protected endpoints without detection.

### U5. login-rate-limit.ts — ZERO Tests — MISSED

`packages/dojolm-web/src/lib/auth/login-rate-limit.ts` implements brute-force protection on the authentication endpoint. Untested rate limiting means:
- Bypass conditions unverified
- Rate limit reset behavior unverified
- Distributed attack protection unverified

### U6. sengoku-webhook.ts and sengoku-storage.ts — MISSED

- `sengoku-webhook.ts` — zero tests (webhook delivery logic)
- `sengoku-storage.ts` — confirmed untested (campaign data persistence)

### U7. E2E Tests NOT in CI/CD — UNDERSTATED

19 Playwright spec files exist but are **completely absent from the CI pipeline** (`.github/workflows/ci.yml`). The gap analysis mentioned this as a CI gate issue but did not emphasize that E2E tests literally never run in automation.

### U8. dojolm-web Coverage Thresholds — MISSING

bu-tpi has coverage thresholds enforced (80% lines/functions/statements, 75% branches). **dojolm-web has NO coverage thresholds** configured at all — neither in vitest.config nor in CI.

---

## REVISED METRICS DASHBOARD

| Metric | Original Claim | Corrected | Status |
|--------|---------------|-----------|--------|
| bu-tpi module test coverage | ~60% | **~95%** (all 38 modules tested) | GOOD |
| bu-tpi validation generator tests | 0% | **100%** (all 15 tested) | GOOD |
| bu-tpi corpus utility tests | 0% | **100%** (all 4 tested) | GOOD |
| bu-tpi shingan module tests | 30% | **100%** (all 10 tested) | GOOD |
| dojolm-web API route coverage | 90% | **100%** (89/89 tested) | GOOD |
| dojolm-web component coverage | 53% | **58%** (136/232 tested) | GAP |
| dojolm-web provider coverage | Not assessed | **0%** (0/9 tested) | **CRITICAL** |
| dojolm-web repository coverage | Understated | **0%** (0/9 tested) | **CRITICAL** |
| bmad-cybersec coverage | Not assessed | **0%** (0/91 tested) | **CRITICAL** |
| Fixture category validation | 17% (6/36) | **25%** (9/36 incl. cross-module) | CRITICAL |
| E2E spec files | 16 | **19** | CORRECTED |
| E2E lifecycle coverage | 0% | **0%** (still smoke-only) | CRITICAL |
| E2E in CI/CD | Not assessed | **0%** (not in pipeline) | **CRITICAL** |
| dojolm-web coverage thresholds | Not assessed | **None configured** | **HIGH** |

---

## REVISED TOP 30 CRITICAL GAPS (Post-Audit)

Items struck from original list are marked ~~strikethrough~~. New items from audit are marked **[NEW]**.

| # | Gap | Severity |
|---|-----|----------|
| ~~1~~ | ~~15 validation generators with ZERO tests~~ | ~~REMOVED — all tested~~ |
| 1 | **[NEW]** bmad-cybersec package: 91 security validator files, 0 tests | **CRITICAL** |
| 2 | 27/36 fixture categories unvalidated (was 30) | **CRITICAL** |
| 3 | dojolm-scanner package: 0 formal tests | **CRITICAL** |
| 4 | ZERO E2E full-lifecycle tests (all modules smoke-only) | **CRITICAL** |
| 5 | **[NEW]** dojolm-web provider layer: 9 files, 0 tests | **CRITICAL** |
| 6 | **[NEW]** dojolm-web database repositories: 9 files, 0 tests | **CRITICAL** |
| 7 | 19 Kagami probe types with ZERO tests | **CRITICAL** |
| 8 | 5 Timechamber attack types with ZERO tests | **CRITICAL** |
| 9 | adversarial-skill-engine.ts UNTESTED | **CRITICAL** |
| 10 | **[NEW]** E2E tests not in CI/CD pipeline (19 specs, never automated) | **CRITICAL** |
| 11 | ZERO cross-package integration tests | **CRITICAL** |
| ~~12~~ | ~~7 Shingan modules with ZERO tests~~ | ~~REMOVED — all tested~~ |
| ~~13~~ | ~~9 API routes untested~~ | ~~REMOVED — all tested~~ |
| 12 | **[NEW]** api-route-access.ts (auth whitelist) UNTESTED | **CRITICAL** |
| 13 | **[NEW]** login-rate-limit.ts (brute-force protection) UNTESTED | **CRITICAL** |
| 14 | Query builder SQL injection not integration tested | **CRITICAL** |
| 15 | File upload security (malicious file testing) UNTESTED | **CRITICAL** |
| 16 | Accessibility (A11Y) testing: ZERO coverage | **CRITICAL** |
| 17 | Automated visual regression: NOT CONFIGURED | CRITICAL |
| 18 | ZERO formal UAT epic executions | CRITICAL |
| 19 | No production UAT sign-off documented | CRITICAL |
| 20 | **[NEW]** dojolm-web has NO coverage thresholds (bu-tpi has 80%) | HIGH |
| 21 | Sage content-safety bypass testing UNTESTED | HIGH |
| 22 | Authentication lifecycle gaps (session fixation, expiry) | HIGH |
| 23 | RBAC cross-tenant access testing UNTESTED | HIGH |
| 24 | 96 components untested (41% of 232 total) | HIGH |
| 25 | **[NEW]** All 9 database repository files untested (user, audit, batch, etc.) | HIGH |
| 26 | Sage full genetic pipeline not E2E tested | HIGH |
| 27 | Keyboard-only navigation testing UNTESTED | HIGH |
| 28 | Performance testing: defined but NOT EXECUTED | HIGH |
| 29 | Arena web components ~50% untested | HIGH |
| 30 | **[NEW]** No SAST tools in CI (only npm audit, no CodeQL/semgrep/Snyk) | HIGH |

---

## AUDIT VERDICT

The original gap analysis contained **8 material errors** (E1-E8), all of which **overstated gaps that had already been resolved**. This is likely because the analysis relied on the MASTER-QA-FRAMEWORK-AUDIT-REPORT (which itself appears to have been based on an older codebase snapshot), rather than verifying claims against the current filesystem.

Conversely, the audit identified **8 understated or entirely missed gaps** (U1-U8), several of which are more severe than the false positives that were removed:

- **bmad-cybersec** (91 untested security validators) is arguably the most critical gap in the entire project
- **Provider layer** (9 untested LLM API adapters) represents a direct SSRF/credential exposure risk
- **Database repositories** (9 untested files including user and encryption repos) represent data integrity risk
- **api-route-access.ts** (auth whitelist with 0 tests) is a single-point-of-failure for access control

The net effect: **the actual gap profile is narrower but deeper than originally reported.** Core bu-tpi testing is significantly better than claimed (~95% module coverage, not ~60%), but the web application's security-critical infrastructure layer (providers, repositories, auth whitelist, rate limiting) and the bmad-cybersec package represent concentrated, high-severity blind spots.

*Adversarial audit completed 2026-03-30 by 4 parallel verification agents.*

---

## REMEDIATION

**Corrected remediation plan:** [QA-GAP-REMEDIATION-PLAN-20260330.md](QA-GAP-REMEDIATION-PLAN-20260330.md)

The original remediation phases (Section 10) are superseded by the corrected plan, which:
- Removes false-positive gaps (E1-E8) from the remediation schedule
- Adds the 8 missed gaps (U1-U8) as new epics
- Corrects the bmad-cybersec file count from 91 to **58 source files** (verified against filesystem)
- Re-prioritizes Phase R0 around auth infrastructure (highest blast radius per line of untested code)
- Structures all stories using the QA Master Framework epic authoring rules (success + deny paths, cross-module truth checks, evidence requirements)
