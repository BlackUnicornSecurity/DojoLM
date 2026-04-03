# QA Framework Execution Report — 2026-04-03 (Post-Fix Rerun)

## Scope

Execution evidence for remediation and adversarial rerun of the MASTER-QA-FRAMEWORK audit.

## Commands Executed

- `bash -n deploy/deploy-dojo.sh`
- `node --check team/testing/tools/generate-coverage-matrix.mjs`
- `node --check team/testing/tools/generate-uat-ux-matrix.mjs`
- `node team/testing/tools/generate-coverage-matrix.mjs`
- `node team/testing/tools/generate-uat-ux-matrix.mjs`
- `npm run test:coverage --workspace=bu-tpi` *(fails in current worktree; captured as audit finding)*
- `npm run test:coverage --workspace=dojolm-web`
- `npm run test:coverage --workspace=@dojolm/mcp`
- `npm run typecheck -w packages/dojolm-scanner`
- `npm test -w packages/dojolm-scanner -- --coverage`
- direct filesystem reconciliation checks for routes/tests/specs/integration/fixtures

## Verified Results

| Area | Result |
| --- | --- |
| Deploy script syntax check | PASS |
| Deploy script dry-run mode | PASS (`--dry-run` implemented) |
| QA matrix generation | PASS (932 surfaces, 566 test files scanned) |
| UAT/UX matrix generation | PASS (564 controls; 84 direct-proof links) |
| `bu-tpi` coverage run | FAIL (9 failing tests in `sage`/`timechamber`) |
| `dojolm-web` coverage run | PASS (74.44/64.87/71.38/76.38) |
| `@dojolm/mcp` coverage run | PASS (82.44/64.14/84.61/83.07) |
| `@dojolm/scanner` typecheck | PASS |
| `@dojolm/scanner` test suite | PASS (4 tests) |
| `@dojolm/scanner` coverage command | PASS (formal suite wired; proxy-wrapper coverage semantics remain limited) |

## Reconciled Inventory Snapshot

- API route handlers: **102**
- API route test files: **90**
- Orphan API route test paths: **1** (`packages/dojolm-web/src/app/api/shingan/__tests__/route.test.ts`)
- Playwright specs/tests: **19 / 167**
- Integration tests (non-`.next`): **6**
- Fixture categories: **36**
- High-risk uncovered surfaces: **75**
- Control Playwright gaps: **142**
- Manual label audits: **205**

## CI/Framework Enforcement Improvements Verified

- Broadened CI package coverage execution:
  - `dojolm-mcp`
  - `dojolm-scanner`
  - `bmad-cybersec/validators`
- QA freshness gate present (`qa-framework-freshness`)
- Semgrep SAST job present (`sast`)
- PR E2E smoke runs desktop + mobile projects
- Active QA framework artifacts now trackable in gitignore policy

## Execution Conclusion

Remediation changes were applied and validated. The framework is more enforceable and up to date, but objective coverage completeness remains below 100% due unresolved code/API/control/visual gaps documented in the adversarial blindspot report.
