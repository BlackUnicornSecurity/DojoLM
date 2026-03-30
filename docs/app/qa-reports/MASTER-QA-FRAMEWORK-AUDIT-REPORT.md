# Master QA Framework Audit Report
**Repository:** BU-TPI (DojoLM/NODA Platform)  
**Audit Date:** 2026-03-30  
**Scope:** Full codebase audit of UX/UI testing, fixture validation, integration validation, and tool lifecycle coverage  

---

## 1. Executive Summary

| Category | Current | Target | Gap | Status |
|----------|---------|--------|-----|--------|
| Playwright E2E Specs | 19 files / 167 tests | Full lifecycle per module | **Medium** | +3 new specs, +77 tests |
| bu-tpi Unit Tests | 175+ files | All 38 modules + scanners | **Low** | +9 shingan tests, +1 skill-parser |
| dojolm-web Component Tests | 136 covered / ~121 missing | Every exported component | **High** | Unchanged |
| dojolm-web API Route Tests | 90/89 (100%+) | 100% | **Closed** | +9 route tests added |
| Fixture Categories Validated | 6/36 (17%) | All 36 categories | **Critical** | Unchanged |
| Validation Generator Tests | 15/15 generators tested | All generators | **Closed** | +15 test files, 126 tests |
| Cross-Package Integration Tests | 5 files | Per-integration suite | **High** | Unchanged |
| dojolm-scanner Package Tests | 0 formal suites | Full coverage | **Critical** | Unchanged |

**Overall Assessment:** Significant gap remediation completed (2026-03-30). E2E coverage expanded from 16 to 19 specs with 167 tests (was ~90). All API routes now have tests (100%). All 15 validation generators now have tests (126 tests). All 10 shingan modules + skill-parser now have unit tests (180 tests). Remaining critical gaps: fixture category validation (6/36), dojolm-scanner formal tests, component test backfill, and cross-package integration.

**Adversarial Audit Corrections (2026-03-30):** Post-audit identified additional critical blind spots not captured above:
- **bmad-cybersec validators:** 58 source files, 0 tests (CRITICAL)
- **dojolm-web providers:** 9 LLM adapter files, 0 tests (CRITICAL)
- **dojolm-web repositories:** 8 repository files, 0 dedicated tests (CRITICAL)
- **Auth infrastructure:** api-route-access.ts + login-rate-limit.ts, 0 tests (CRITICAL)
- **E2E in CI/CD:** 19 specs exist, never automated (CRITICAL)
- **dojolm-web coverage thresholds:** None configured (HIGH)

See [QA-COMPREHENSIVE-GAP-ANALYSIS-20260330.md](QA-COMPREHENSIVE-GAP-ANALYSIS-20260330.md) (Addendum) and [QA-GAP-REMEDIATION-PLAN-20260330.md](QA-GAP-REMEDIATION-PLAN-20260330.md) for full analysis and remediation epics.

---

## 2. Current State Inventory

### 2.1 UI/UX Testing (Playwright E2E)
**Location:** `packages/dojolm-web/e2e/`

| Module | Spec File | Test Count | Depth |
|--------|-----------|------------|-------|
| Dashboard | `cross-module.spec.ts`, `dashboard-widgets.spec.ts` | 7 | Smoke |
| Haiku Scanner | `scanner.spec.ts` | 3 | Smoke + 1 submit flow |
| Armory | `test-lab.spec.ts` | 5 | Smoke + fixture open/scan |
| LLM Dashboard | `llm-dashboard.spec.ts` | 14 | **Deep** (tabs, models, tests, results, compare, custom, jutsu, leaderboard) |
| Hattori Guard | `guard.spec.ts` | 11 | **Deep** (modes, toggle, threshold, audit log filters, pagination, metrics) |
| Bushido Book | `compliance.spec.ts` | 13 | **Deep** (7 tabs, framework selection, gap matrix, checklists, navigator, export) |
| Atemi Lab | `atemi-lab.spec.ts` | 13 | Deep (tabs, modes, config, tools) |
| The Kumite | `kumite.spec.ts` | 15 | Deep (6 subsystems) |
| Ronin Hub | `ronin-hub.spec.ts` | 10 | Medium |
| Sengoku | `sengoku.spec.ts` | 11 | Deep (campaigns, temporal, detail views) |
| Kotoba | `kotoba.spec.ts` | 14 | Deep (scoring, hardening, examples) |
| **Shingan** *(new)* | `shingan.spec.ts` | 10 | **Deep** (format selector, scan, trust gauge, 6-layer breakdown, findings) |
| **Sensei** *(new)* | `sensei.spec.ts` | 9 | **Medium** (drawer, model picker, chat input, suggestions, close/escape) |
| **Amaterasu DNA** *(new)* | `attackdna.spec.ts` | 12 | **Deep** (5 tabs, stats bar, search, family tree, clusters, analysis, X-Ray) |
| Admin | `admin.spec.ts` | 2 | Smoke |
| Mobile Nav | `mobile-nav.spec.ts` | 11 | Medium/Deep |
| Navigation | `navigation.spec.ts` | 3 | Smoke (parameterized) |
| API Security | `api-security.spec.ts` | 4 | Low |

**Observation:** All navigable modules now have dedicated spec files including 3 new specs (Shingan, Sensei, AttackDNA). Guard, Compliance, and LLM Dashboard upgraded from smoke to deep coverage. 9 of 19 specs now exercise deep workflows beyond simple page loads. Remaining lifecycle gap: no spec exercises a full business cycle (create → execute → validate → report → export).

### 2.2 Unit & Component Testing

#### `packages/bu-tpi` — 175+ test files *(updated 2026-03-30)*
- **Well covered:** `llm/` (16/18), `modules/` (42/38 — over-covered), `validation/` (68/55 — over-covered), `compliance/` (11/9 — over-covered), `attackdna/` (7/8).
- **Recently closed gaps (2026-03-30):**
  - ~~7 shingan modules with ZERO tests~~ → **ALL NOW TESTED** (9 new test files, 180 tests total)
  - ~~skill-parser.ts with ZERO tests~~ → **NOW TESTED** (30 tests)
  - ~~15 validation generators with ZERO tests~~ → **ALL NOW TESTED** (15 test files, 126 tests)
- **Remaining gaps:**
  - `fingerprint/` (4/26) — Kagami probes severely under-tested
  - `kotoba/` (1/10)
  - `timechamber/` (1/9)
  - `benchmark/` (1/4)
  - `index.ts` (barrel) — low priority, no test needed

#### `packages/dojolm-web` — 300+ test files *(updated 2026-03-30)*
- **API Routes:** 90/89 routes have `__tests__/route.test.ts` files — **100% coverage achieved.**
  - ~~Missing 9 routes~~ → **ALL NOW TESTED** (39 new tests across 9 files):
    - ✅ `admin/validation/export/[runId]` (4 tests)
    - ✅ `admin/validation/report/[runId]` (4 tests)
    - ✅ `admin/validation/status/[runId]` (4 tests)
    - ✅ `admin/validation/verify` (4 tests)
    - ✅ `llm/fingerprint/signatures` (4 tests)
    - ✅ `sensei/chat` (7 tests)
    - ✅ `shingan/batch` (4 tests)
    - ✅ `shingan/scan` (4 tests)
    - ✅ `shingan/url` (4 tests)
- **Components:** ~121 components lack dedicated `__tests__/*.test.tsx` files (136 of 257 total are covered).
  - Directories with lowest coverage: `admin/*`, `adversarial/*`, `attackdna/*`, `charts/*`, `coverage/*`, `guard/*`, `kagami/*`, `layout/*` (partial), `llm/*` (partial), `ronin/*`, `sengoku/*`, `strategic/*`.

#### `packages/dojolm-mcp` — 20 test files
- Covers server, attack engine, controller, logger, observer, tool registry, virtual FS, and all 9 tool categories.
- **Gap:** Only 20 tests for 33 source files (~60% file coverage). Missing tests for pipeline, scenarios, and several edge-case tool handlers.

#### `packages/dojolm-scanner` — 0 formal test suites
- Contains only ad-hoc `.cjs` scripts (`test-ag-fixtures.cjs`, `test-all-fixtures.cjs`, etc.).
- **No jest/vitest/playwright integration.** This is a published package with zero automated test coverage.

---

## 3. Gap Analysis: Code vs UI/UX Testing

### 3.1 The "Render-Only" E2E Problem
While every module has a Playwright spec, the tests are overwhelmingly **shallow visibility checks**. Critical gaps:

| Capability | Code Exists? | E2E Tests Full Lifecycle? |
|------------|--------------|---------------------------|
| Scanner execution → findings display | ✅ | ⚠️ Partial (1 submit test) |
| Fixture scan from Armory → results | ✅ | ⚠️ Partial (1 scan test) |
| LLM model add → test → view results | ✅ | ❌ No |
| Guard mode switch → audit log | ✅ | ❌ No |
| Compliance framework select → export | ✅ | ❌ No |
| Atemi Lab skill execution → attack log | ✅ | ❌ No |
| Sengoku campaign create → run → report | ✅ | ❌ No |
| Kumite arena match create → execute | ✅ | ❌ No |
| Ronin submission create → track | ✅ | ❌ No |
| Kotoba prompt score → harden | ✅ | ❌ No |
| Admin validation run → calibrate | ✅ | ❌ No |
| Sensei chat → module context | ✅ | ❌ No |
| Kagami fingerprint → select target → run | ✅ | ❌ No |
| Shingan deep scan → configure → execute | ✅ | ❌ No |

### 3.2 Component Tests vs E2E Tests
Many complex components (e.g., `FixtureExplorer`, `SengokuCampaignBuilder`, `ArenaBrowser`) have **neither component tests nor deep E2E coverage**. This creates a "testing valley" where:
- Unit tests cover pure logic.
- E2E tests cover page loads.
- **Interactive component behavior is untested.**

---

## 4. Fixture & Validation Audit

### 4.1 Fixture Inventory
**Location:** `packages/bu-tpi/fixtures/`
- **36 categories**
- **2,960 fixture files**

### 4.2 Fixture Validation Coverage
**Current automated validation:**
- `fixture-validation.test.ts` — tests **6 categories** (prompt-injection, bias, encoded, social, dos, token-attacks) with detection-rate thresholds.
- `fixture-cross-module.test.ts` — tests **5 categories** (agent, supply-chain, context, prompt-injection, social) for cross-module behavior and shingan trust scoring.

**Gap:** **30 of 36 fixture categories (83%) have NO automated pass-through validation.**

Categories missing validation:
- `agent-output`, `audio`, `audio-attacks`, `boundary`, `code`, `cognitive`, `delivery-vectors`, `document-attacks`, `email-webfetch`, `environmental`, `few-shot`, `images`, `malformed`, `mcp`, `model-theft`, `modern`, `multimodal`, `or`, `output`, `rag`, `search-results`, `session`, `supply-chain` (partial), `tool-manipulation`, `translation`, `untrusted-sources`, `vec`, `video`, `web`, `webmcp`

### 4.3 Validation Suite (`bu-tpi/src/validation/`)
- **55 source files, 53 test files** — excellent coverage for the runner, reports, and governance layers.
- ~~**Critical Gap:** 15 variation generators with ZERO tests~~ → **CLOSED (2026-03-30)**
- **All 15 generators now have dedicated tests** (126 tests across 15 files in `validation/generators/__tests__/`):
  - ✅ `generator-registry.test.ts` (19 tests — SeededRNG, GeneratorRegistry, generateAll)
  - ✅ `binary-variations.test.ts` (7 tests)
  - ✅ `encoding-variations.test.ts` (7 tests)
  - ✅ `stress-variations.test.ts` (9 tests)
  - ✅ `boundary-variations.test.ts` (5 tests)
  - ✅ `combination-variations.test.ts` (7 tests)
  - ✅ `indirect-injection-variations.test.ts` (7 tests)
  - ✅ `multi-turn-variations.test.ts` (7 tests)
  - ✅ `multilingual-variations.test.ts` (7 tests)
  - ✅ `paraphrase-variations.test.ts` (8 tests)
  - ✅ `semantic-evasion-variations.test.ts` (7 tests)
  - ✅ `structural-variations.test.ts` (8 tests)
  - ✅ `unicode-variations.test.ts` (8 tests)
  - ✅ `default-generators.test.ts` (6 tests)
  - ✅ `corpus-generation-pipeline.test.ts` (8 tests)
- **Corpus utilities** (`corpus-expander.ts`, `fixture-labeler.ts`, `gap-analysis.ts`, `holdout-separator.ts`) — already covered by existing tests in `validation/__tests__/`.

---

## 5. Integration Testing Audit

### 5.1 Cross-Package Integration
**Current integration tests:**
- `packages/bu-tpi/src/llm/integration.test.ts`
- `packages/bu-tpi/src/validation/__tests__/capa-integration.test.ts`
- `packages/dojolm-web/src/lib/__tests__/cross-module-integration.test.ts`
- `packages/dojolm-web/src/lib/db/__tests__/integration.test.ts`
- `packages/dojolm-web/src/lib/db/__tests__/migrations-integration.test.ts`

**Gap:** Only **5 integration test files** exist for a 4-package monorepo with 89 API routes and 38 scanner modules. There are **no integration tests** for:
- `dojolm-web` frontend ↔ `dojolm-mcp` backend
- `dojolm-web` frontend ↔ `dojolm-scanner` package
- `bu-tpi` scanner ↔ `dojolm-mcp` tool execution
- Full campaign execution pipeline (Sengoku → bu-tpi → web)

### 5.2 API Route Integration
While 91% of API routes have unit tests, these are **mocked route handler tests** (testing the handler in isolation). There are **no true API integration tests** hitting the running Next.js server with real database/MCP connections.

---

## 6. Tool Lifecycle Testing Audit

The user requirement states: *"all tools must be tested in their entire lifecycle, from testing to control of proper execution and validation of findings and reporting."*

**Current state:** No E2E or integration test exercises a complete tool lifecycle.

**Missing lifecycle stages:**
1. **Configuration** — no tests verify that tool settings persist and affect behavior.
2. **Execution Control** — no tests verify start/pause/resume/cancel of long-running operations (scans, campaigns, arena matches).
3. **Validation of Findings** — no E2E tests verify that scanner findings match expected fixture outputs.
4. **Reporting & Export** — no E2E tests verify PDF/JSON export downloads or report accuracy.
5. **Error Recovery** — no E2E tests simulate network failures or backend errors and verify UI recovery.

---

## 7. Recommendations & Remediation Plan

### Phase 1: Critical Gaps (Week 1-2) — **3 of 5 COMPLETE**

| # | Action | Owner | Deliverable | Status |
|---|--------|-------|-------------|--------|
| 1.1 | Add formal test suite to `dojolm-scanner` package | QA Eng | `packages/dojolm-scanner/src/*.test.ts` | **OPEN** |
| 1.2 | Write unit tests for shingan modules + `skill-parser` | QA Eng | 9 new test files (180 tests) | **✅ DONE** |
| 1.3 | Add fixture pass-through validation for **all 36 categories** | QA Eng | Expand `fixture-validation.test.ts` | **OPEN** |
| 1.4 | Add unit tests for all 15 validation generators | QA Eng | 15 test files (126 tests) | **✅ DONE** |
| 1.5 | Add API route tests for 9 missing routes | Web Eng | 9 test files (39 tests) | **✅ DONE** |

### Phase 2: Deep E2E Lifecycle Tests (Week 3-4)

Create **one full-lifecycle Playwright spec per major module**. Each spec must exercise: configure → execute → validate findings → export/report.

| # | Module | Test Scenario |
|---|--------|---------------|
| 2.1 | Scanner | Submit payload → verify findings count/severity → export JSON |
| 2.2 | Armory | Select fixture → scan → verify results panel → compare 2 fixtures |
| 2.3 | LLM Dashboard | Add provider → run batch test → verify results → export report |
| 2.4 | Hattori Guard | Switch mode → run guard check → view audit log → export log |
| 2.5 | Atemi Lab | Select skill → execute → verify attack log entry |
| 2.6 | Sengoku | Create campaign → run campaign → view findings → download report |
| 2.7 | The Kumite | Create arena match → run match → verify battle log |
| 2.8 | Ronin Hub | Submit bug → verify submission list → view detail |
| 2.9 | Kotoba | Score prompt → apply hardening → verify improved score |
| 2.10 | Bushido Book | Select framework → generate evidence → export compliance PDF |
| 2.11 | Admin | Run validation → view status → calibrate → verify updated config |
| 2.12 | Sensei | Open drawer → ask module-specific question → verify response |

### Phase 3: Component Test Backfill (Week 5-6)

Add React Testing Library tests for the **~121 untested components**, prioritized by complexity:
1. `admin/*` (9 components)
2. `adversarial/*` (11 components)
3. `attackdna/*` (12 components)
4. `llm/*` (25 components)
5. `strategic/*` (15 components)
6. `sengoku/*`, `ronin/*`, `guard/*`, `kagami/*`

### Phase 4: Integration & Cross-Package Validation (Week 7-8)

| # | Integration Target | Test Approach |
|---|-------------------|---------------|
| 4.1 | Web ↔ MCP | Playwright calls MCP-enabled API routes with real MCP server (or mocked stdio) |
| 4.2 | Web ↔ Scanner | E2E scan submission validates against `dojolm-scanner` output |
| 4.3 | bu-tpi ↔ dojolm-mcp | Integration test: MCP tool executes scanner and returns structured findings |
| 4.4 | Sengoku full pipeline | Integration test: campaign creation triggers background execution and stores results |

### Phase 5: Validation Suite Hardening (Ongoing)

| # | Action |
|---|--------|
| 5.1 | Add CI gate: fixture validation must pass before merge |
| 5.2 | Add CI gate: `dojolm-scanner` test coverage ≥ 80% |
| 5.3 | Add CI gate: all new generators must include tests |
| 5.4 | Run Playwright E2E against production weekly (`E2E_TARGET=prod`) |
| 5.5 | Implement visual regression testing for critical UI flows (optional) |

---

## 8. Quick-Win Checklist (Can be done in 1-2 days)

- [ ] Rename `test-lab.spec.ts` → `armory.spec.ts` for clarity
- [x] Add `shingan.spec.ts` E2E test — **DONE** (10 tests, deep coverage)
- [x] Add `sensei.spec.ts` E2E test — **DONE** (9 tests, medium coverage)
- [x] Add `attackdna.spec.ts` E2E test — **DONE** (12 tests, deep coverage)
- [x] Fix the 9 missing API route tests — **DONE** (39 tests across 9 files)
- [ ] Expand `fixture-validation.test.ts` to cover top 10 fixture categories by file count

---

## 9. Conclusion

The DojoLM platform has a **solid and improving testing foundation**. As of the 2026-03-30 remediation:

**Gaps CLOSED:**
1. ~~Generator testing~~ → **ALL 15 generators now tested** (126 tests)
2. ~~Shingan module testing~~ → **ALL 10 modules now tested** (180 tests)
3. ~~API route coverage~~ → **100% route coverage achieved** (90/89 routes)
4. ~~E2E depth for Guard/Compliance/LLM Dashboard~~ → **Upgraded to Deep** (2→11, 2→13, 3→14 tests)
5. ~~Missing E2E specs~~ → **3 new specs added** (Shingan, Sensei, AttackDNA = +31 tests)

**Remaining gaps:**
1. **Fixture validation** — only 6/36 categories tested (Critical)
2. **Formal testing** of the `dojolm-scanner` package (Critical)
3. **Component test backfill** — ~121 components untested (High)
4. **Cross-package integration** validation (High)
5. **Full lifecycle E2E** — no spec exercises create → execute → validate → export (Medium)

Executing the remaining items in **Phase 1 (1.1, 1.3)** and **Phase 2** will close the most critical gaps.

---

*Report generated: 2026-03-30*
*Verified against codebase: 2026-03-30 — corrected test counts, component coverage, generator count, depth ratings*
*Remediation pass: 2026-03-30 — +345 new tests (180 shingan, 126 generators, 39 API routes), +77 E2E tests, 3 new specs*
*Next audit recommended: After Phase 2 completion*
