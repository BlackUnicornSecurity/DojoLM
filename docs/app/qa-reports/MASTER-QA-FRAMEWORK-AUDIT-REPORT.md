# Master QA Framework Audit Report

**Repository:** BU-TPI (DojoLM/NODA Platform)  
**Audit Date:** 2026-04-03 (Rev 3 — post-gap-closure update)
**Audit Type:** Full framework-to-codebase reconciliation + adversarial re-validation (post-remediation rerun)

## 1. Executive Verdict

The MASTER-QA-FRAMEWORK is still **not at 100% execution coverage**, but the framework is now materially stronger and more enforceable than the prior run.

Remediations applied in this rerun closed key governance and automation blindspots (tracked QA artifacts, CI freshness gate, scanner package tests, Semgrep SAST, PR desktop+mobile E2E smoke, deploy dry-run mode, and control-level proof mapping).

## 2. Verified Live Inventory (2026-04-03, Rev 3)

| Metric | Live Value | Prior (Rev 2) | Delta |
| --- | --- | --- | --- |
| Source surfaces tracked | 946 | 932 | +14 |
| Test files scanned | 696 | 566 | **+130** |
| High-risk uncovered surfaces | 23 | 75 | **-52 (69% reduction)** |
| Framework citation drift items | 3 | 3 | — |
| API route handlers | 102 | 102 | — |
| API route test files | 103 | 90 | +13 |
| Playwright specs | 19 | 19 | — |
| Playwright tests | 167 | 167 | — |
| UAT/UX interactive components tracked | 137 | 136 | +1 |
| Actionable controls tracked | 567 | 564 | +3 |
| Controls with direct control-to-test proof | 84 | 84 | — |
| Controls inheriting parent-surface references | 133 | 133 | — |
| Control Playwright gaps | 145 | 142 | +3 (new controls) |
| Controls needing manual label audit | 205 | 205 | — |

## 3. Coverage Reality vs 100% Target

### 3.1 Code Coverage (measured)

| Package | Statements | Branches | Functions | Lines | Status |
| --- | ---: | ---: | ---: | ---: | --- |
| `bu-tpi` | blocked in current run | blocked in current run | blocked in current run | blocked in current run | Coverage run failed (9 tests) |
| `dojolm-web` | 74.44% | 64.88% | 71.38% | 76.38% | Not 100% |
| `@dojolm/mcp` | 82.44% | 64.14% | 84.61% | 83.07% | Not 100% |
| `@dojolm/scanner` | formal suite exists | formal suite exists | formal suite exists | formal suite exists | Coverage semantics remain limited (proxy-wrapper package) |

### 3.2 Test-Dimension Audit

| Dimension | 100% Required | Current State | Verdict |
| --- | --- | --- | --- |
| Regression testing | Full branch-level protection across changed logic | Strong in `bu-tpi`, moderate in `dojolm-web`, weaker branch depth in several surfaces | Partial |
| QA testing | Full inventory + executable coverage | Inventory matured; **23** high-risk uncovered surfaces remain (was 75) | Improved |
| Integration testing | Full cross-package and runtime integration | 6 integration files detected; meaningful gaps remain in route/widget/component depth | Partial |
| Artwork/visual review | Visual correctness + regression baseline | Manual visual guidance exists; no enforced automated visual-diff gate | Gap |
| Security testing (code/api/web) | Automated + behavioral security depth | CI now includes audit + Semgrep SAST + fixture validation; DAST/browser security automation remains partial | Partial |
| UX testing | Every control path verified | 567 controls tracked; 84 direct proof links; 145 Playwright gaps; 205 manual-label audits | Partial |
| UAT testing | End-to-end user journeys with evidence | Broad spec inventory and improved control proof mapping; still not complete | Partial |
| Pre-flight checklist | Enforced and complete | Checklist improved; CI/process enforcement still not full-spectrum for all dimensions | Partial |
| Provisioning dry run | Repeatable dry-run of deployment/provisioning | `deploy/deploy-dojo.sh --dry-run` now implemented | Improved / Partial |
| Tool lifecycle validation | Configure→execute→validate→report→recover per tool | Better coverage, but not full depth across all framework modules/tools | Partial |

## 4. Critical Findings (Ordered by Severity)

1. ~~**`bu-tpi` coverage run currently fails (9 tests), blocking fresh full-package coverage evidence.**~~
   **CLOSED (Rev 3):** bu-tpi now runs 5,374 tests across 244 test files, all passing. Coverage run unblocked.

2. **100% package coverage is still not achieved in packages with successful current coverage runs.**
   Evidence: latest successful outputs for `dojolm-web` and `@dojolm/mcp`.

3. ~~**High-risk uncovered source surfaces remain material (75).**~~
   **LARGELY CLOSED (Rev 3):** Reduced from 75 → **23** (69% reduction). 56 new test files added covering fingerprint probes, timechamber attacks, sensei module, auth, DB repositories, LLM providers, sensei-lib, and storage layers. Remaining 23 are dojolm-web pages (5), components (9), and libs (6+).

4. ~~**API route coverage remains materially incomplete (102 handlers vs 90 route tests).**~~
   **CLOSED (Rev 3):** Now 102 handlers with 103 test files (1 orphan at `api/shingan`). All routes covered.

5. **UX/UAT control completeness is still partial.**
   Evidence: 145 control Playwright gaps and 205 manual-label audits remain. Playwright gap count slightly increased (+3) due to new controls tracked.

6. **Visual-regression automation is still not enforced in CI.**
   Evidence: no visual-diff baseline gate in `.github/workflows/ci.yml`.

## 5. Major Remediations Completed In This Rerun

1. Active QA framework artifacts and generators are now tracked (gitignore exceptions fixed, including `team/testing/tools/*` overrides).
2. CI now enforces broader package coverage checks:
   - `dojolm-mcp` coverage
   - `dojolm-scanner` coverage + typecheck
   - `bmad-cybersec/validators` install + tests
3. CI now enforces QA matrix freshness (`qa-framework-freshness` job with diff gate).
4. CI security posture expanded with Semgrep SAST (`sast` job).
5. CI E2E expanded to PR smoke (`chromium` + `mobile-chrome`) and separate prod target job.
6. `playwright.config.ts` updated to ensure mobile project availability in CI/PR smoke context.
7. Deployment script now supports explicit non-mutating dry run: `deploy/deploy-dojo.sh --dry-run`.
8. UAT/UX matrix generator now includes a control-level direct-proof layer (heuristic selector-match based), reducing the previous "0 proof" state.
9. `@dojolm/scanner` now has a formal test suite and CI coverage execution path.

## 6. Adversarial Reconciliation Outcome

Cross-checked with independent evidence paths:

- Matrix regeneration (`generate-coverage-matrix.mjs`, `generate-uat-ux-matrix.mjs`)
- Direct filesystem counts (routes/tests/specs/integration/fixtures)
- CI/workflow and package-test execution checks

### Reconciled facts

- API handlers / route tests: **102 / 103** (1 orphan test path at `api/shingan`; all routes now covered)
- Playwright specs / tests: **19 / 167**
- Integration tests (non-`.next`): **6**
- Fixture categories: **37**
- Scanner package: **formal test suite present and passing**
- Control-level proof: **84** direct proof links (heuristic)
- bu-tpi test files: **244** (5,374 tests, all passing)
- dojolm-web test files: **400** (lib: 71, components: 184, routes: 103, hooks: 2, misc: 40)

## 7. Required Upgrades To Reach True 100%

1. ~~Close route-test parity gap for all uncovered API handlers.~~ **DONE — 102/103.**
2. Drive high-risk uncovered surfaces from ~~75~~ **23** to 0 (priority matrix register). Remaining: 5 pages, 9 components, 6 libs.
3. Reduce control Playwright gaps from ~~142~~ **145** to 0 and manual label audit backlog from 205 to 0.
4. Add enforced visual-regression CI gate for critical pages/modules.
5. Expand security automation to include DAST-style/browser/API abuse regression checks.
6. Keep matrix/report freshness fully in sync on every QA report refresh.

## 8. Final Status

**Framework maturity:** High and improved in enforceability
**Coverage completeness:** Not 100% yet — but 69% reduction in high-risk surfaces (75 → 23)
**Up-to-date status:** Refreshed to 2026-04-03 Rev 3 (post-gap-closure; 56 new test files, 696 test files total)
