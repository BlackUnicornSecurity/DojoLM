# QA Gap Remediation Plan — Post-Adversarial Audit

**Date:** 2026-03-30
**Source:** QA-COMPREHENSIVE-GAP-ANALYSIS-20260330.md (Addendum: Adversarial Audit Corrections)
**Authority:** Subordinate to [QA/QA-MASTER-PLAN.md](QA/QA-MASTER-PLAN.md)
**Scope:** Addresses the **Revised Top 30 Critical Gaps** from the corrected gap analysis

---

## Net Assessment (Corrected)

| Area | Status | Coverage |
|------|--------|----------|
| bu-tpi core modules | **GOOD** | ~95% (38/38 modules tested) |
| bu-tpi validation generators | **GOOD** | 100% (15/15 tested) |
| bu-tpi shingan modules | **GOOD** | 100% (10/10 tested) |
| dojolm-web API routes | **GOOD** | 100% (89/89 tested) |
| dojolm-web components | GAP | 58% (136/232 tested) |
| dojolm-web providers | **CRITICAL** | 0% (0/9 tested) |
| dojolm-web repositories | **CRITICAL** | 0% (0/8 tested, excl. index) |
| dojolm-web auth infrastructure | **CRITICAL** | 0% (api-route-access, login-rate-limit untested) |
| bmad-cybersec validators | **CRITICAL** | 0% (0/58 source files tested) |
| E2E in CI/CD | **CRITICAL** | 0% (19 specs, never automated) |
| dojolm-web coverage thresholds | **HIGH** | None configured |
| Fixture category validation | CRITICAL | 25% (9/36) |

**Key insight:** The actual gap profile is narrower but deeper than originally reported. Core bu-tpi is ~95% (not ~60%), but the web app's security infrastructure (providers, repositories, auth whitelist, rate limiting) and the bmad-cybersec package are concentrated, high-severity blind spots.

---

## Remediation Phases

### Phase R0: Security Infrastructure — Zero Tests on Critical Auth/Access Paths (2-3 days)

**Rationale:** These files are single-point-of-failure for access control. A misconfiguration is undetectable without tests.

#### `SEC-INFRA-001 | api-route-access.ts whitelist tests` (Gap #12)
- **File:** `packages/dojolm-web/src/lib/api-route-access.ts`
- **Risk:** Auth bypass — this file defines which routes skip authentication
- Stories:
  - `SEC-INFRA-001a` — Test `isPublicApiRoute()`: every whitelisted route returns `true`, non-whitelisted routes return `false`, empty/malformed input returns `false`
  - `SEC-INFRA-001b` — Test `isPublicReadApiRoute()`: same boundary testing for read-only whitelist
  - `SEC-INFRA-001c` — Test `isPublicBrowserActionRoute()`: same boundary testing for browser action whitelist
  - `SEC-INFRA-001d` — Negative test: confirm that admin routes, write routes, and auth-gated paths are never in any public whitelist
  - `SEC-INFRA-001e` — Regression guard: snapshot the current whitelist contents and alert on unexpected additions
- Expected outcome: Any future whitelist change that accidentally exposes a protected route will fail tests
- Evidence: Test file at `packages/dojolm-web/src/lib/__tests__/api-route-access.test.ts`

#### `SEC-INFRA-002 | request-origin.ts origin validation tests`
- **File:** `packages/dojolm-web/src/lib/request-origin.ts`
- **Risk:** CORS bypass, SSRF via origin spoofing
- Stories:
  - `SEC-INFRA-002a` — Test `getConfiguredAppOrigin()`: returns correct origin from env, handles missing env gracefully
  - `SEC-INFRA-002b` — Test `isAllowedCorsOrigin()`: allowed origins pass, disallowed origins fail, null/undefined origin fails, case sensitivity, trailing slash handling
  - `SEC-INFRA-002c` — Test `isTrustedBrowserOriginRequest()`: valid Origin header passes, valid Referer passes, Sec-Fetch-Metadata passes, spoofed or missing headers fail
  - `SEC-INFRA-002d` — Test `isTrustedBrowserSessionRequest()`: session + origin compound validation
  - `SEC-INFRA-002e` — Adversarial inputs: empty strings, unicode normalization attacks, protocol-relative URLs, `javascript:` schemes, internal IP origins
- Expected outcome: Origin validation rejects all known bypass techniques
- Evidence: Test file at `packages/dojolm-web/src/lib/__tests__/request-origin.test.ts`

#### `SEC-INFRA-003 | login-rate-limit.ts brute-force protection tests` (Gap #13)
- **File:** `packages/dojolm-web/src/lib/auth/login-rate-limit.ts`
- **Risk:** Credential stuffing, brute-force authentication bypass
- Stories:
  - `SEC-INFRA-003a` — Test rate limit triggers after N failed attempts
  - `SEC-INFRA-003b` — Test rate limit reset after configured window
  - `SEC-INFRA-003c` — Test rate limit applies per-IP (not globally)
  - `SEC-INFRA-003d` — Test bypass conditions: successful login resets counter, different usernames track independently
  - `SEC-INFRA-003e` — Test edge cases: concurrent requests, clock boundary behavior
- Expected outcome: Brute-force protection works as documented
- Evidence: Test file at `packages/dojolm-web/src/lib/auth/__tests__/login-rate-limit.test.ts`

#### `SEC-INFRA-004 | route-guard.ts + rbac.ts regression expansion`
- **Files:** `packages/dojolm-web/src/lib/auth/route-guard.ts`, `packages/dojolm-web/src/lib/auth/rbac.ts`
- **Note:** These files have existing tests but the gap analysis flagged RBAC cross-tenant (Gap #23) and session lifecycle (Gap #22)
- Stories:
  - `SEC-INFRA-004a` — Cross-tenant access: user A cannot access user B's resources via direct API call
  - `SEC-INFRA-004b` — Session fixation: session ID changes after login
  - `SEC-INFRA-004c` — Session expiry: expired sessions are rejected, not silently refreshed
  - `SEC-INFRA-004d` — Concurrent session handling
- Evidence: Extend existing `route-guard.test.ts`

---

### Phase R1: Provider Layer — SSRF and Credential Exposure Risk (3-4 days)

**Rationale:** 9 LLM provider adapters make external API calls with user-configured URLs and API keys. Untested URL construction = SSRF. Untested credential handling = leaks.

#### `PROV-001 | Provider adapter unit test suite` (Gap #5)
- **Location:** `packages/dojolm-web/src/lib/providers/`
- **Files:** anthropic.ts, openai.ts, ollama.ts, lmstudio.ts, llamacpp.ts, moonshot.ts, zai.ts
- Stories (per provider):
  - `PROV-001a-{provider}` — URL construction: valid base URL produces correct endpoint, internal/private IPs rejected (SSRF), protocol enforcement (https only for cloud providers)
  - `PROV-001b-{provider}` — API key handling: key included in correct header, key never logged or exposed in error messages, missing key produces clear error
  - `PROV-001c-{provider}` — Error response parsing: 401 → credential error, 429 → rate limit, 500 → upstream error, timeout handling, malformed JSON response
  - `PROV-001d-{provider}` — Request payload: correct model parameter, correct message format, streaming vs non-streaming request construction
- Expected outcome: 7 providers × 4 story types = 28 test stories minimum
- Evidence: Test files at `packages/dojolm-web/src/lib/providers/__tests__/{provider}.test.ts`

#### `PROV-002 | Provider factory and error handling tests`
- **Files:** index.ts, errors.ts
- Stories:
  - `PROV-002a` — Factory returns correct provider instance for each registered type
  - `PROV-002b` — Factory rejects unknown provider types with clear error
  - `PROV-002c` — Error classes serialize correctly and do not leak internal state
  - `PROV-002d` — Provider timeout configuration applies correctly
- Evidence: Test files at `packages/dojolm-web/src/lib/providers/__tests__/index.test.ts`, `errors.test.ts`

---

### Phase R2: Database Repositories — Data Integrity and Encryption Risk (3-4 days)

**Rationale:** 8 repository files handle all persistent data operations including password hashing (user.repository.ts) and API key encryption (model-config.repository.ts). Untested = data corruption and credential exposure risk.

#### `REPO-001 | Security-critical repository tests` (Gap #6, #25)
- **Files:** user.repository.ts, model-config.repository.ts
- Stories:
  - `REPO-001a` — user.repository: password hashing uses correct algorithm, salt is unique per user, timing-safe comparison for authentication
  - `REPO-001b` — user.repository: SQL injection via username/email fields (parameterized queries verified)
  - `REPO-001c` — model-config.repository: API key encryption at rest, decryption returns original value, encrypted key never appears in query logs
  - `REPO-001d` — model-config.repository: key rotation — re-encrypt with new master key
- Expected outcome: Security-critical data operations verified
- Evidence: Test files at `packages/dojolm-web/src/lib/db/repositories/__tests__/`

#### `REPO-002 | CRUD repository tests`
- **Files:** audit.repository.ts, batch.repository.ts, execution.repository.ts, scoreboard.repository.ts, test-case.repository.ts
- Stories (per repository):
  - `REPO-002a-{repo}` — Create: valid input succeeds, required fields enforced, duplicate handling
  - `REPO-002b-{repo}` — Read: findById returns correct record, findAll with pagination, not-found returns null (not throws)
  - `REPO-002c-{repo}` — Update: partial updates work, optimistic locking if present, update non-existent record fails gracefully
  - `REPO-002d-{repo}` — Delete: soft vs hard delete behavior, cascade behavior documented
- Expected outcome: 5 repositories × 4 story types = 20 test stories
- Evidence: Test files at `packages/dojolm-web/src/lib/db/repositories/__tests__/{repo}.test.ts`

#### `REPO-003 | Base repository and query builder integration` (Gap #14)
- **Files:** base.repository.ts, query-builder.ts
- **Note:** base.repository.ts already has `base-repository.test.ts` — extend coverage
- Stories:
  - `REPO-003a` — Query builder: SQL injection via filter parameters (parameterized queries verified)
  - `REPO-003b` — Query builder: ORDER BY injection, LIMIT injection
  - `REPO-003c` — Base repository: transaction rollback on error
  - `REPO-003d` — Base repository: connection pool exhaustion handling
- Evidence: Extend `packages/dojolm-web/src/lib/db/__tests__/base-repository.test.ts`

---

### Phase R3: bmad-cybersec Validators — Largest Untested Security Surface (5-7 days)

**Rationale:** 58 source files across 7 security domains with zero tests. This is the single largest untested security surface in the project. Vitest is configured but no tests exist.

#### `CYBER-001 | AI Safety validators` (15 source files)
- **Location:** `packages/bmad-cybersec/validators/src/ai-safety/`
- Stories:
  - `CYBER-001a` — prompt-injection.ts: known injection patterns detected, benign prompts pass, unicode/encoding bypass attempts caught
  - `CYBER-001b` — jailbreak.ts: known jailbreak patterns detected (DAN, roleplay, hypothetical framing), benign conversation passes
  - `CYBER-001c` — output-validator.ts: harmful output flagged, safe output passes, edge cases (partial matches, context-dependent content)
  - `CYBER-001d` — boundary-detector.ts: trust boundary violations detected, legitimate cross-boundary calls pass
  - `CYBER-001e` — context-integrity.ts: context manipulation detected, normal context evolution passes
  - `CYBER-001f` — pattern-engine.ts: pattern matching accuracy, false positive rate, performance with large inputs
  - `CYBER-001g` — text-normalizer.ts: unicode normalization, homoglyph detection, encoding attack normalization
  - `CYBER-001h` — session-tracker.ts: session state tracking, multi-turn attack detection, session reset behavior
  - `CYBER-001i` — reformulation-detector.ts: reformulated prompt detection, paraphrase tolerance
  - `CYBER-001j` — media-validator.ts: image/audio content validation, EXIF stripping, polyglot file detection
  - `CYBER-001k` — multilingual-patterns.ts: non-English injection patterns, mixed-language attacks
  - `CYBER-001l` — web-content-patterns.ts & web-search-patterns.ts: web content injection patterns
  - `CYBER-001m` — agent-output-patterns.ts: agent-specific output validation
- Expected outcome: 15 test files covering all AI safety validators
- Evidence: `packages/bmad-cybersec/validators/src/ai-safety/__tests__/`

#### `CYBER-002 | Guards validators` (10 source files excl. index)
- **Location:** `packages/bmad-cybersec/validators/src/guards/`
- Stories:
  - `CYBER-002a` — bash-safety.ts: dangerous commands blocked (rm -rf, curl|bash, eval), safe commands pass, command injection via backticks/subshells caught
  - `CYBER-002b` — env-protection.ts: env var access controlled, sensitive vars masked, .env file read attempts blocked
  - `CYBER-002c` — secret.ts: API keys, tokens, passwords detected in content, false positive rate on benign strings
  - `CYBER-002d` — xss-safety.ts: XSS payloads in all major vectors (script, img, svg, event handlers, unicode), safe HTML passes
  - `CYBER-002e` — http-security.ts: header injection, response splitting, CRLF injection detection
  - `CYBER-002f` — outside-repo.ts: path traversal attempts blocked, symlink following controlled
  - `CYBER-002g` — production.ts: production-only safety checks enforced
  - `CYBER-002h` — settings-guard.ts: settings modification guarded
  - `CYBER-002i` — pii/patterns.ts + pii/validators.ts: PII detection (SSN, email, phone, credit card), false positive rate on similar-looking non-PII
- Expected outcome: 9 test files covering all guard validators
- Evidence: `packages/bmad-cybersec/validators/src/guards/__tests__/`

#### `CYBER-003 | Observability validators` (7 source files excl. index)
- **Location:** `packages/bmad-cybersec/validators/src/observability/`
- Stories:
  - `CYBER-003a` — audit-integrity.ts: log tamper detection, hash chain verification
  - `CYBER-003b` — audit-encryption.ts: log encryption at rest, key management
  - `CYBER-003c` — anomaly-detector.ts: statistical anomaly detection, baseline establishment, alert threshold behavior
  - `CYBER-003d` — confidence-tracker.ts: confidence score calculation, degradation detection
  - `CYBER-003e` — telemetry.ts: metrics collection, privacy-safe telemetry, opt-out behavior
  - `CYBER-003f` — log-archiver.ts + archival-scheduler.ts + archival-config.ts: log rotation, retention policy, schedule adherence
- Expected outcome: 7 test files
- Evidence: `packages/bmad-cybersec/validators/src/observability/__tests__/`

#### `CYBER-004 | Permissions validators` (3 source files excl. index)
- **Location:** `packages/bmad-cybersec/validators/src/permissions/`
- Stories:
  - `CYBER-004a` — token-validator.ts: JWT validation, expiry, signature verification, malformed token handling
  - `CYBER-004b` — plugin-permissions.ts: permission scope enforcement, least-privilege checks
  - `CYBER-004c` — supply-chain.ts: dependency integrity verification, known-vulnerability detection
- Expected outcome: 3 test files
- Evidence: `packages/bmad-cybersec/validators/src/permissions/__tests__/`

#### `CYBER-005 | Resource Management validators` (4 source files excl. index)
- **Location:** `packages/bmad-cybersec/validators/src/resource-management/`
- Stories:
  - `CYBER-005a` — rate-limiter.ts: rate limiting enforcement, window reset, per-client tracking
  - `CYBER-005b` — recursion-guard.ts: recursion depth limits, infinite loop prevention
  - `CYBER-005c` — resource-limits.ts: memory/CPU/time limits enforced, graceful degradation
  - `CYBER-005d` — context-manager.ts: context size limits, context poisoning prevention
- Expected outcome: 4 test files
- Evidence: `packages/bmad-cybersec/validators/src/resource-management/__tests__/`

#### `CYBER-006 | Common utilities and validation` (8 source files excl. index)
- **Location:** `packages/bmad-cybersec/validators/src/common/`, `src/validation/`
- Stories:
  - `CYBER-006a` — safe-regex.ts: ReDoS-safe regex validation, exponential backtracking prevention
  - `CYBER-006b` — audit-logger.ts: structured logging, sensitive data redaction
  - `CYBER-006c` — override-manager.ts: security override lifecycle, override expiry, audit trail
  - `CYBER-006d` — session-context.ts: session binding, context isolation
  - `CYBER-006e` — stdin-parser.ts: input parsing, injection via stdin
  - `CYBER-006f` — block-message.ts: user-facing block message formatting
  - `CYBER-006g` — alerting.ts: alert dispatch, severity routing
  - `CYBER-006h` — path-utils.ts: path normalization, traversal prevention
  - `CYBER-006i` — asvs-input-validator.ts: ASVS compliance validation rules
- Expected outcome: 9 test files
- Evidence: `packages/bmad-cybersec/validators/src/common/__tests__/`, `src/validation/__tests__/`

---

### Phase R4: E2E and CI/CD Infrastructure (3-4 days)

**Rationale:** 19 Playwright specs exist but never run in automation. Coverage thresholds exist for bu-tpi but not dojolm-web. Without CI enforcement, regressions go undetected.

#### `CICD-001 | Add E2E to CI pipeline` (Gap #10)
- **File:** `.github/workflows/ci.yml`
- Stories:
  - `CICD-001a` — Add Playwright install + run step to CI workflow
  - `CICD-001b` — Configure E2E to run on PR and push to main
  - `CICD-001c` — Upload Playwright HTML report as CI artifact
  - `CICD-001d` — Configure E2E timeout and retry policy for CI environment
  - `CICD-001e` — Verify all 19 specs pass in CI (headless Chromium)
- Expected outcome: E2E tests run on every PR
- Evidence: Green CI run with Playwright results

#### `CICD-002 | Add coverage thresholds to dojolm-web` (Gap #20)
- **File:** `packages/dojolm-web/vitest.config.ts`
- Stories:
  - `CICD-002a` — Configure coverage thresholds matching bu-tpi (80% lines/functions/statements, 75% branches)
  - `CICD-002b` — Add coverage report to CI workflow output
  - `CICD-002c` — Verify current coverage baseline and document starting point
  - `CICD-002d` — If current coverage is below threshold, set incremental targets with dates
- Expected outcome: Coverage thresholds enforced in CI for dojolm-web

#### `CICD-003 | Add SAST tooling to CI` (Gap #30)
- Stories:
  - `CICD-003a` — Evaluate: CodeQL vs semgrep vs Snyk (cost, TypeScript support, false positive rate)
  - `CICD-003b` — Configure chosen SAST tool in CI pipeline
  - `CICD-003c` — Triage initial findings — fix CRITICAL, document accepted risk for others
  - `CICD-003d` — Set SAST as blocking gate for CRITICAL/HIGH findings
- Expected outcome: Static analysis runs in CI

---

### Phase R5: Remaining Functional Gaps (5-7 days)

**Rationale:** These are the non-security functional gaps from the revised Top 30 that were not false positives.

#### `FUNC-001 | Fixture category validation expansion` (Gap #2)
- **Current:** 9/36 categories validated
- Stories: One story per unvalidated category (27 stories)
- Expected outcome: 36/36 fixture categories have validation tests

#### `FUNC-002 | Kagami probe type tests` (Gap #7)
- **Location:** `packages/bu-tpi/src/fingerprint/`
- Stories: One story per untested probe type (19 probes)
- Expected outcome: All Kagami probe types have unit tests

#### `FUNC-003 | Timechamber attack type tests` (Gap #8)
- **Location:** `packages/bu-tpi/src/timechamber/`
- Stories: One story per untested attack type (5 types)
- Expected outcome: All Timechamber attack types have unit tests

#### `FUNC-004 | adversarial-skill-engine.ts tests` (Gap #9)
- Stories:
  - `FUNC-004a` — Skill registration and lookup
  - `FUNC-004b` — Skill execution pipeline
  - `FUNC-004c` — Error handling and recovery
- Expected outcome: Skill engine fully tested

#### `FUNC-005 | Cross-package integration suite` (Gap #11)
- Stories:
  - `FUNC-005a` — bu-tpi <-> dojolm-web integration: scanner modules invoked via web API
  - `FUNC-005b` — bu-tpi <-> dojolm-mcp integration: MCP tool execution uses scanner
  - `FUNC-005c` — dojolm-web <-> dojolm-mcp integration: web frontend communicates with MCP server
- Expected outcome: Cross-package integration verified

#### `FUNC-006 | E2E full-lifecycle tests` (Gap #4)
- Stories: Expand each of the 19 existing Playwright specs from smoke → full lifecycle
  - Priority modules (deep lifecycle first): Scanner, LLM Dashboard, Hattori Guard, Sengoku, Atemi Lab
  - Each lifecycle spec covers: create → configure → execute → validate results → export/report
- Expected outcome: At least 5 modules have full-lifecycle E2E coverage

---

### Phase R6: UX, Accessibility, and Non-Functional (4-5 days)

**Rationale:** Zero accessibility coverage (Gap #16), zero visual regression (Gap #17), zero formal UAT (Gap #18-19).

#### `A11Y-001 | Accessibility audit` (Gap #16)
- Stories:
  - `A11Y-001a` — axe-core integration in Playwright specs
  - `A11Y-001b` — Keyboard-only navigation audit for all 14 modules (Gap #27)
  - `A11Y-001c` — Screen reader landmark and heading structure validation
  - `A11Y-001d` — Color contrast audit (WCAG 2.1 AA)
- Expected outcome: WCAG 2.1 AA baseline established

#### `VIS-001 | Visual regression baseline` (Gap #17)
- Stories:
  - `VIS-001a` — Evaluate: Playwright visual comparisons vs Percy vs Chromatic
  - `VIS-001b` — Capture baseline screenshots for all 14 module landing pages
  - `VIS-001c` — Add visual regression to CI (non-blocking initially)
- Expected outcome: Visual regression infrastructure configured

#### `UAT-001 | Formal UAT execution` (Gap #18, #19)
- Stories:
  - `UAT-001a` — Execute all module epics from QA-MASTER-PLAN.md (SHELL, DASH, SCAN, ARM, LLM, GUARD, BUSH, ATEMI, KUM, RONIN, SENG, KOTOBA, ADMIN)
  - `UAT-001b` — Document evidence per epic in QA-Log/
  - `UAT-001c` — Production UAT sign-off on Voyager deployment
- Expected outcome: Formal UAT complete with evidence

---

## Schedule Summary

| Phase | Scope | Duration | Priority |
|-------|-------|----------|----------|
| R0 | Auth whitelist, origin validation, rate limiting, RBAC | 2-3 days | **P0 — IMMEDIATE** |
| R1 | 9 LLM provider adapter tests | 3-4 days | **P0 — IMMEDIATE** |
| R2 | 8 database repository tests + query builder SQL injection | 3-4 days | **P1 — HIGH** |
| R3 | bmad-cybersec: 58 source files across 7 domains | 5-7 days | **P1 — HIGH** |
| R4 | E2E in CI, coverage thresholds, SAST | 3-4 days | **P1 — HIGH** |
| R5 | Fixtures, Kagami, Timechamber, cross-package, E2E lifecycle | 5-7 days | **P2 — MEDIUM** |
| R6 | A11Y, visual regression, formal UAT | 4-5 days | **P2 — MEDIUM** |

**Total estimated:** 25-34 days across all phases

---

## Gate Criteria

Each phase must pass before moving to the next priority tier:

### P0 Gate (after R0 + R1)
- [ ] All auth whitelist routes have positive and negative tests
- [ ] Origin validation rejects all known bypass vectors
- [ ] Rate limiting enforced and verified
- [ ] All 9 providers have URL construction, credential handling, and error parsing tests
- [ ] Zero SSRF vectors in provider URL construction
- [ ] All new tests pass in local dev

### P1 Gate (after R2 + R3 + R4)
- [ ] All repository CRUD operations tested
- [ ] SQL injection regression tests pass
- [ ] Password hashing and API key encryption verified
- [ ] bmad-cybersec: all 7 security domains have test coverage
- [ ] bmad-cybersec: prompt injection and jailbreak detection accuracy verified
- [ ] E2E runs in CI on every PR
- [ ] dojolm-web has coverage thresholds configured
- [ ] SAST tool integrated (at minimum, npm audit in CI)

### P2 Gate (after R5 + R6)
- [ ] All 36 fixture categories validated
- [ ] All Kagami probes and Timechamber attacks tested
- [ ] At least 5 modules have full-lifecycle E2E
- [ ] axe-core accessibility baseline captured
- [ ] Visual regression baseline captured
- [ ] Formal UAT evidence exists for all module epics

---

## Traceability: Gap → Epic → Phase

| Revised Gap # | Description | Epic | Phase |
|---------------|-------------|------|-------|
| 1 | bmad-cybersec 58 files, 0 tests | CYBER-001 to CYBER-006 | R3 |
| 2 | 27/36 fixture categories | FUNC-001 | R5 |
| 3 | dojolm-scanner 0 tests | (deferred — separate plan) | — |
| 4 | Zero E2E full-lifecycle | FUNC-006 | R5 |
| 5 | Provider layer 9 files, 0 tests | PROV-001, PROV-002 | R1 |
| 6 | Database repositories 9 files, 0 tests | REPO-001, REPO-002, REPO-003 | R2 |
| 7 | 19 Kagami probes untested | FUNC-002 | R5 |
| 8 | 5 Timechamber attacks untested | FUNC-003 | R5 |
| 9 | adversarial-skill-engine untested | FUNC-004 | R5 |
| 10 | E2E not in CI/CD | CICD-001 | R4 |
| 11 | Zero cross-package integration | FUNC-005 | R5 |
| 12 | api-route-access.ts untested | SEC-INFRA-001 | R0 |
| 13 | login-rate-limit.ts untested | SEC-INFRA-003 | R0 |
| 14 | SQL injection not integration tested | REPO-003 | R2 |
| 15 | File upload security untested | (deferred — Phase R5 stretch) | — |
| 16 | A11Y zero coverage | A11Y-001 | R6 |
| 17 | Visual regression not configured | VIS-001 | R6 |
| 18 | Zero formal UAT | UAT-001 | R6 |
| 19 | No production UAT sign-off | UAT-001c | R6 |
| 20 | No dojolm-web coverage thresholds | CICD-002 | R4 |
| 21 | Sage content-safety bypass | (extend CYBER-001 scope) | R3 |
| 22 | Session fixation/expiry | SEC-INFRA-004 | R0 |
| 23 | RBAC cross-tenant | SEC-INFRA-004 | R0 |
| 24 | 96 components untested | (incremental — each phase) | — |
| 25 | Database repos untested | REPO-001, REPO-002 | R2 |
| 26 | Sage genetic pipeline E2E | FUNC-006 | R5 |
| 27 | Keyboard navigation untested | A11Y-001b | R6 |
| 28 | Performance not executed | (deferred — separate plan) | — |
| 29 | Arena components 50% untested | (incremental — each phase) | — |
| 30 | No SAST in CI | CICD-003 | R4 |

---

## Metrics Dashboard — Target State

| Metric | Current | After P0+R1 | After P1 | After P2 | Target |
|--------|---------|-------------|----------|----------|--------|
| Auth infrastructure coverage | 0% | **100%** | 100% | 100% | 100% |
| Provider test coverage | 0% | **100%** | 100% | 100% | 100% |
| Repository test coverage | 0% | 0% | **100%** | 100% | 100% |
| bmad-cybersec coverage | 0% | 0% | **80%+** | 80%+ | 80%+ |
| E2E in CI | 0% | 0% | **100%** | 100% | 100% |
| Coverage thresholds (web) | None | None | **80%** | 80% | 80% |
| Fixture validation | 25% | 25% | 25% | **100%** | 100% |
| E2E lifecycle depth | Smoke | Smoke | Smoke | **5+ deep** | 14 deep |
| A11Y coverage | 0% | 0% | 0% | **WCAG 2.1 AA** | WCAG 2.1 AA |
| Visual regression | 0% | 0% | 0% | **Baseline** | Key flows |

---

*This remediation plan was produced by cross-referencing the adversarial audit corrections (U1-U8), the revised Top 30 gap list, and the QA Master Framework epics. File counts were verified against the current filesystem on 2026-03-30.*

*This plan is subordinate to QA-MASTER-PLAN.md. It does not modify the framework — it fills gaps identified by the gap analysis.*
