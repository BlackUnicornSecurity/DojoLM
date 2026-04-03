# QA Framework Adversarial Blindspot Audit — 2026-04-03 (Post-Fix Rerun)

## Scope

Adversarial rerun against the full active QA framework surface:

- `team/testing/QA/QA-MASTER-PLAN.md`
- `team/testing/QA/QA-COVERAGE-MATRIX.generated.md`
- `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md`
- `team/testing/plans/*`
- `.github/workflows/ci.yml`
- package test/coverage posture (`bu-tpi`, `dojolm-web`, `@dojolm/mcp`, `@dojolm/scanner`, `@bmad/validators`)

## Executive Verdict

The framework is now **substantially hardened** versus the previous adversarial run, but it still does not provide 100% end-to-end QA coverage.

## Blindspots Closed In This Rerun

1. **Framework governance/trackability gap closed for active QA artifacts.**
   - Active QA plans/matrices/generators are now explicitly unignored and trackable.

2. **CI breadth improved for package testing.**
   - CI now runs coverage for `dojolm-mcp` and `dojolm-scanner`, plus validator tests.
   - Scanner now has a formal test suite (`packages/dojolm-scanner/tests/scanner-proxy.test.ts`).

3. **QA freshness drift gate implemented.**
   - CI job regenerates both matrices and fails on drift (`qa-framework-freshness`).

4. **Security automation depth increased.**
   - Semgrep SAST job added alongside existing security audit controls.

5. **PR E2E desktop+mobile coverage enforced.**
   - PR smoke job now executes both `chromium` and `mobile-chrome`.
   - Playwright config updated so mobile project is available in CI.

6. **Deploy dry-run control implemented.**
   - `deploy/deploy-dojo.sh --dry-run` added with non-mutating flow.

7. **Control-level proof layer implemented in UAT/UX generator.**
   - Current rerun detects 84 direct control-to-test proof links.

## Remaining Critical Blindspots

1. **Core package coverage is still below 100%.**
   - `dojolm-web` and `@dojolm/mcp` remain below full threshold.
   - `bu-tpi` fresh coverage evidence is currently blocked by 9 failing tests in the active worktree.

2. **High-risk uncovered source surfaces remain high (75).**
   - Inventory still shows substantial uncovered high-priority rows.

3. **API route parity gap remains material.**
   - 102 route handlers vs 90 route tests.

4. **UX/UAT control coverage remains partial.**
   - 142 control Playwright gaps and 205 manual label audit items remain.

5. **Automated visual-regression gate is still missing.**
   - No enforced visual diff baseline in CI.

## Quantified Adversarial Snapshot (Fresh)

- Source surfaces tracked: **932**
- Test files scanned: **566**
- High-risk uncovered surfaces: **75**
- API routes / route tests: **102 / 90** (1 orphan path)
- Playwright specs / tests: **19 / 167**
- Interactive components: **136**
- Actionable controls: **564**
- Direct control-to-test proof: **84**
- Control inherited references: **133**
- Control Playwright gaps: **142**
- Manual label audits: **205**
- Fixture categories: **36**

## Residual Partially Covered Areas

| Dimension | Current State | Status |
| --- | --- | --- |
| Code coverage | Core packages improved but below 100% | Partial |
| Regression | Good depth in `bu-tpi`; partial elsewhere | Partial |
| Integration | 6 integration tests detected; not comprehensive | Partial |
| Security | Audit + SAST + fixture validation in CI; DAST/browser security automation partial | Partial |
| UX/UAT | Direct-proof layer now exists; major control gaps remain | Partial |
| Artwork/visual regression | Manual visual checks exist; no automated CI baseline | Gap |
| Provisioning dry run | Script-level `--dry-run` now implemented | Improved / Partial |

## Updated Remediation Priority

1. Close route-test parity gap (102 handlers -> full route coverage).
2. Burn down high-risk uncovered surfaces (75 -> 0) using matrix priority register.
3. Reduce control gaps (142) and manual-label queue (205).
4. Add automated visual-regression CI gate for critical user-facing paths.
5. Expand security automation with targeted API/web abuse regression (DAST-style checks).

## Adversarial Conclusion

The QA framework moved from “partial planning-heavy posture” to a more enforceable execution posture, but still falls short of 100% coverage requirements across code, UX/UAT control depth, and visual/security automation completeness.
