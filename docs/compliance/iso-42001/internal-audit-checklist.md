# Internal Audit Checklist for AI Operations (ISO/IEC 42001 Clause 9)

**Document ID:** ISO42001-AUD-001
**Version:** 2.0
**Date:** 2026-03-24
**Status:** Active
**Owner:** BlackUnicorn Laboratory

---

## 1. Purpose

This checklist is the current internal audit baseline for the DojoLM repository. It is intentionally tied to the live codebase and current package/runtime layout instead of historical phase plans.

## 2. Current Baseline

- Web application: `packages/dojolm-web` on `http://localhost:42001`
- Standalone scanner API: `packages/bu-tpi` on `http://localhost:8089`
- MCP server: `packages/dojolm-mcp` on `127.0.0.1:18000`
- Verified documentation metrics: `49` pattern groups, `510` patterns, `37` fixture categories, `2,960` fixtures
- Current top-level web modules: `dashboard`, `scanner`, `armory`, `llm`, `guard`, `compliance`, `adversarial`, `strategic`, `ronin-hub`, `sengoku`, `kotoba`, `admin`

Evidence source for the metrics above:

```bash
npm run verify:docs
```

## 3. Audit Checklists

### 3.1 Repository and System Inventory

- [ ] Package inventory matches the repository layout:
  - `packages/bu-tpi`
  - `packages/dojolm-scanner`
  - `packages/dojolm-web`
  - `packages/dojolm-mcp`
  - `packages/bmad-cybersec`
- [ ] Runtime ports and hosts match active docs and local configuration
- [ ] Archived planning documents are separated from current operational docs
- [ ] `README.md`, `docs/README.md`, and package READMEs reflect the live package surface

### 3.2 Scanner Operations Audit

- [ ] `npm run verify:docs` passes without metric mismatches
- [ ] `packages/bu-tpi/src/serve.ts` still exposes only documented GET endpoints
- [ ] Standalone API limits match current implementation:
  - `120` requests per `60` seconds per IP
  - `/api/scan` max text size `100KB`
  - binary fixture scan limit `50MB`
- [ ] Fixture path traversal protections are still enforced
- [ ] Regression and false-positive suites remain runnable from the standalone server test harness

### 3.3 Web API and Access Control Audit

- [ ] Public web API routes match current proxy configuration:
  - `/api/health`
  - `/api/admin/health`
  - `/api/auth/login`
  - `/api/auth/logout`
  - `/api/auth/me`
  - `/api/llm/models`
- [ ] Protected web routes require either:
  - verified same-origin browser headers tied to `NEXT_PUBLIC_APP_URL`, or
  - a valid `X-API-Key` matching `NODA_API_KEY`
- [ ] Production behavior still fails closed when `NODA_API_KEY` is unset
- [ ] External API traffic remains limited to `100` requests/minute/IP
- [ ] Same-origin UI traffic remains limited to `300` requests/minute/IP
- [ ] Mutation endpoints still reject unsupported content types

### 3.4 Operational Data Handling Audit

- [ ] File-backed operational data remains scoped to known directories under `packages/dojolm-web/data`
- [ ] Current data directories are documented accurately:
  - `amaterasu-dna`
  - `arena`
  - `audit`
  - `ecosystem`
  - `llm-results`
  - `sengoku`
- [ ] Admin-facing provider credential management is documented as `Admin -> API Keys`
- [ ] No secrets are committed to repository documentation or checked-in example configs
- [ ] Evidence exports and result files remain separated from source code

### 3.5 Module and Feature Surface Audit

- [ ] Navigation docs match the current 12 top-level web modules
- [ ] Nested module docs match current implementation:
  - `llm` contains `models`, `tests`, `results`, `leaderboard`, `compare`, `custom`, `jutsu`
  - `strategic` contains `sage`, `arena`, `threatfeed`, `dna`, `kagami`, `shingan`
  - `sengoku` contains `campaigns` and `temporal`
  - `admin` contains `general`, `users`, `scoreboard`, `apikeys`, `scanner`, `health`, `export`, `settings`, `validation`
- [ ] Alias handling is documented where it still exists (`jutsu`, `llm-jutsu`, `attackdna`, `kumite`, `time-chamber`)

### 3.6 Documentation Completeness Audit

- [ ] Root architecture and API docs reflect the live implementation
- [ ] User docs align with the current ports, auth model, and UI terminology
- [ ] Internal runbooks do not reference deprecated product names as current system names
- [ ] Historical plans, QA reports, and pentest reports are archived or clearly labeled as time-bound records
- [ ] Relative links in active documentation resolve correctly

### 3.7 Incident and Response Readiness

- [ ] Incident response procedure is current and references the present package layout
- [ ] Security testing procedure uses current ports and routes
- [ ] Security audit logs and QA artifacts have a maintained storage location
- [ ] Lessons learned are retained without being treated as current source-of-truth implementation docs

## 4. Non-Conformity Handling

| Type | Definition | Required Action |
|------|------------|-----------------|
| Major | Current docs or controls materially contradict live implementation | Correct within the current release cycle |
| Minor | Local inconsistency, stale example, or incomplete cross-reference | Correct in the next documentation pass |
| Observation | Improvement opportunity with no present mismatch | Track for backlog review |

## 5. Evidence to Capture Per Audit

- commit or branch audited
- `npm run verify:docs` output
- any failing links or unresolved references
- screenshots or command output for runtime checks
- archive moves completed during the audit

## 6. Related Documents

- [AI Management Policy](./ai-management-policy.md)
- [Risk Assessment Methodology](./risk-assessment-methodology.md)
- [AI System Inventory](./ai-system-inventory.md)
- [Incident Response Procedure](./incident-response-procedure.md)
- [Architecture](../../ARCHITECTURE.md)
- [API Reference](../../API_REFERENCE.md)
