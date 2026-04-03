# QA Coverage Matrix (Generated)

Generated on 2026-04-03T17:41:04.368Z.

This file is a repo-driven coverage inventory and drift audit.
It complements `QA-MASTER-PLAN.md` by enumerating live source surfaces, direct test references, heuristic interactive markers, and missing checks.
Direct and indirect test linkage are repo-heuristic signals based on imports and route references, not proof of behavioral sufficiency.
Surface rows are file-level and exported-symbol oriented; private helper functions inside a file are not individually trace-mapped in this matrix.

## Audit Signals

| Metric | Value |
| --- | --- |
| Source surfaces tracked | 946 |
| Test files scanned | 696 |
| High-risk uncovered surfaces | 23 |
| Framework citation drift items | 3 |
| Packages tracked | dojolm-web, bu-tpi, dojolm-mcp, dojolm-scanner, bmad-cybersec/validators, bmad-cybersec/framework |

## Key Inventory Deltas

| Signal | Current Inventory | Notes |
| --- | --- | --- |
| API route handlers | 102 | Live inventory from `packages/dojolm-web/src/app/api/**/route.ts`. |
| Standalone app surfaces | 6 | Includes `page.tsx`, `layout.tsx`, and error/not-found boundaries. |
| Dashboard widgets | 32 | Live inventory from `packages/dojolm-web/src/components/dashboard/widgets`. |
| Additional package scope | 4 | dojolm-mcp, dojolm-scanner, bmad-cybersec/validators, bmad-cybersec/framework |
| Framework citations unresolved | 3 | Backtick path references in `QA-MASTER-PLAN.md` with no live match. |

## Repo Summary

| Package | Category | Surfaces | Direct | Indirect | None | High-Risk Uncovered |
| --- | --- | --- | --- | --- | --- | --- |
| dojolm-web | route | 102 | 102 | 0 | 0 | 0 |
| dojolm-web | page | 5 | 0 | 0 | 5 | 5 |
| dojolm-web | app-shell | 1 | 0 | 0 | 1 | 1 |
| dojolm-web | widget | 32 | 32 | 0 | 0 | 0 |
| dojolm-web | component | 229 | 153 | 0 | 76 | 9 |
| dojolm-web | hook | 5 | 4 | 0 | 1 | 0 |
| dojolm-web | lib | 117 | 96 | 0 | 21 | 6 |
| dojolm-web | other | 3 | 1 | 0 | 2 | 0 |
| bu-tpi | agentic | 7 | 7 | 0 | 0 | 0 |
| bu-tpi | arena | 7 | 7 | 0 | 0 | 0 |
| bu-tpi | attackdna | 8 | 8 | 0 | 0 | 0 |
| bu-tpi | audit | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | benchmark | 10 | 8 | 0 | 2 | 0 |
| bu-tpi | branding-helpers.ts | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | ci | 4 | 4 | 0 | 0 | 0 |
| bu-tpi | cli | 2 | 1 | 0 | 1 | 0 |
| bu-tpi | compliance | 10 | 10 | 0 | 0 | 0 |
| bu-tpi | defense | 4 | 1 | 0 | 3 | 0 |
| bu-tpi | detection | 3 | 3 | 0 | 0 | 0 |
| bu-tpi | edgefuzz | 2 | 1 | 0 | 1 | 0 |
| bu-tpi | fingerprint | 26 | 22 | 0 | 4 | 0 |
| bu-tpi | fuzzing | 7 | 6 | 0 | 1 | 0 |
| bu-tpi | generate-fixtures.ts | 1 | 0 | 0 | 1 | 1 |
| bu-tpi | kotoba | 10 | 1 | 0 | 9 | 0 |
| bu-tpi | llm | 19 | 16 | 0 | 3 | 0 |
| bu-tpi | metadata-parsers.ts | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | modules | 40 | 39 | 0 | 1 | 0 |
| bu-tpi | plugins | 4 | 4 | 0 | 0 | 0 |
| bu-tpi | rag | 8 | 5 | 0 | 3 | 0 |
| bu-tpi | sage | 11 | 9 | 0 | 2 | 0 |
| bu-tpi | scanner-binary.ts | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | scanner.ts | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | sengoku | 6 | 2 | 0 | 4 | 0 |
| bu-tpi | sensei | 13 | 12 | 0 | 1 | 0 |
| bu-tpi | serve.ts | 1 | 0 | 0 | 1 | 1 |
| bu-tpi | shingan | 1 | 0 | 0 | 1 | 0 |
| bu-tpi | supplychain | 4 | 2 | 0 | 2 | 0 |
| bu-tpi | test | 3 | 0 | 0 | 3 | 0 |
| bu-tpi | threatfeed | 8 | 7 | 0 | 1 | 0 |
| bu-tpi | timechamber | 17 | 14 | 0 | 3 | 0 |
| bu-tpi | transfer | 4 | 3 | 0 | 1 | 0 |
| bu-tpi | transforms | 3 | 3 | 0 | 0 | 0 |
| bu-tpi | types.ts | 1 | 1 | 0 | 0 | 0 |
| bu-tpi | validation | 55 | 54 | 0 | 1 | 0 |
| bu-tpi | webmcp | 2 | 0 | 0 | 2 | 0 |
| bu-tpi | xray | 3 | 2 | 0 | 1 | 0 |
| dojolm-mcp | attack-controller.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | attack-engine.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | attack-logger.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | fixture-generator.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | index.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | mode-system.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | observer.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | pipeline | 3 | 3 | 0 | 0 | 0 |
| dojolm-mcp | scenarios | 9 | 9 | 0 | 0 | 0 |
| dojolm-mcp | server.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | tool-registry.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | tools | 11 | 11 | 0 | 0 | 0 |
| dojolm-mcp | types.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-mcp | virtual-fs.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-scanner | index.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-scanner | scanner.ts | 1 | 1 | 0 | 0 | 0 |
| dojolm-scanner | types.ts | 1 | 1 | 0 | 0 | 0 |
| bmad-cybersec/validators | ai-safety | 19 | 0 | 0 | 19 | 0 |
| bmad-cybersec/validators | common | 17 | 0 | 0 | 17 | 0 |
| bmad-cybersec/validators | guards | 21 | 0 | 0 | 21 | 0 |
| bmad-cybersec/validators | index.js | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/validators | index.ts | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/validators | observability | 18 | 0 | 0 | 18 | 0 |
| bmad-cybersec/validators | permissions | 8 | 0 | 0 | 8 | 0 |
| bmad-cybersec/validators | resource-management | 10 | 0 | 0 | 10 | 0 |
| bmad-cybersec/validators | types | 3 | 0 | 0 | 3 | 0 |
| bmad-cybersec/validators | validation | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | audit | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | auth | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | exports | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | hooks | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | index.ts | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | scripts | 1 | 0 | 0 | 1 | 0 |
| bmad-cybersec/framework | validators | 1 | 0 | 0 | 1 | 0 |

## Priority Gap Register

| Package | Surface | Category | Signals | Missing Checks | File |
| --- | --- | --- | --- | --- | --- |
| dojolm-web | / | page | storage, navigation, interactive:10 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/page.tsx` |
| dojolm-web | NODADashboard.tsx | component | navigation, interactive:4 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| dojolm-web | /login | page | auth, interactive:4 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/login/page.tsx` |
| dojolm-web | index.ts | component | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/dashboard/index.ts` |
| bu-tpi | generate-fixtures.ts | generate-fixtures.ts | storage, validation, persistence, network, admin +4 | direct unit or integration coverage | `packages/bu-tpi/src/generate-fixtures.ts` |
| dojolm-web | /style-guide | page | -- | direct unit or integration coverage | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| dojolm-web | AmaterasuConfig.tsx | component | auth, persistence, network, interactive:9, api:2 | click, keyboard, and state transition coverage, fetch integration and failure-state coverage | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| dojolm-web | OrchestratorBuilder.tsx | component | network, llm, interactive:13, api:1 | click, keyboard, and state transition coverage, fetch integration and failure-state coverage | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| dojolm-web | MitsukeSourceConfig.tsx | component | validation, persistence, network, interactive:11 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| dojolm-web | EcosystemContext.tsx | lib | auth, validation, network, api:3 | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/contexts/EcosystemContext.tsx` |
| dojolm-web | app-shell:/ | app-shell | navigation | direct unit or integration coverage | `packages/dojolm-web/src/app/layout.tsx` |
| dojolm-web | boundary:404 | page | navigation, interactive:2 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/not-found.tsx` |
| dojolm-web | LLMModelContext.tsx | lib | auth, network, navigation, api:1, nav:3 | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/contexts/LLMModelContext.tsx` |
| dojolm-web | CampaignGraphBuilder.tsx | component | interactive:15 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| dojolm-web | LibraryPageTemplate.tsx | component | interactive:20 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| dojolm-web | boundary:error | page | interactive:2 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/error.tsx` |
| dojolm-web | AmaterasuGuide.tsx | component | persistence, interactive:13 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| dojolm-web | execution.repository.ts | lib | storage, validation, navigation, db, nav:1 | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/execution.repository.ts` |
| dojolm-web | AuthContext.tsx | lib | auth, network, api:3 | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/auth/AuthContext.tsx` |
| bu-tpi | serve.ts | serve.ts | storage, validation, network, navigation, api:6 +1 | direct unit or integration coverage | `packages/bu-tpi/src/serve.ts` |
| dojolm-web | TemporalTab.tsx | component | persistence, llm, interactive:4 | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| dojolm-web | index.ts | lib | auth, validation, persistence | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/auth/index.ts` |
| dojolm-web | base.repository.ts | lib | storage, validation, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/base.repository.ts` |

## Framework Citation Drift

| Line | Citation | Suggested Live Match |
| --- | --- | --- |
| 467 | `api/shingan` | -- |
| 753 | `__tests__/route.test.ts` | -- |
| 821 | `next/dynamic` | -- |

## Package Inventories

## dojolm-web

Source surfaces: **494**. Test files scanned: **419**.

<details>
<summary>route (102 surfaces; direct 102, indirect 0, none 0)</summary>

| Route | Methods | Area | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- |
| /api/admin/health | GET | admin | direct:1 | auth, storage, admin | -- | `packages/dojolm-web/src/app/api/admin/health/route.ts` |
| /api/admin/settings | -- | admin | direct:1 | auth, storage, validation, admin | -- | `packages/dojolm-web/src/app/api/admin/settings/route.ts` |
| /api/admin/validation/calibrate | -- | admin | direct:2 | auth, storage, network, admin | -- | `packages/dojolm-web/src/app/api/admin/validation/calibrate/route.ts` |
| /api/admin/validation/export/[runId] | -- | admin | direct:2 | auth, storage, validation, network +2 | -- | `packages/dojolm-web/src/app/api/admin/validation/export/[runId]/route.ts` |
| /api/admin/validation/modules | -- | admin | direct:2 | auth, storage, admin | -- | `packages/dojolm-web/src/app/api/admin/validation/modules/route.ts` |
| /api/admin/validation/report/[runId] | -- | admin | direct:2 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/admin/validation/report/[runId]/route.ts` |
| /api/admin/validation/run | -- | admin | direct:2 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/admin/validation/run/route.ts` |
| /api/admin/validation/runs | -- | admin | direct:2 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/admin/validation/runs/route.ts` |
| /api/admin/validation/status/[runId] | -- | admin | direct:2 | auth, storage, validation, admin | -- | `packages/dojolm-web/src/app/api/admin/validation/status/[runId]/route.ts` |
| /api/admin/validation/verify | -- | admin | direct:2 | auth, validation, admin | -- | `packages/dojolm-web/src/app/api/admin/validation/verify/route.ts` |
| /api/agentic | OPTIONS | agentic | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/agentic/route.ts` |
| /api/arena/[id] | -- | arena | direct:2 | -- | -- | `packages/dojolm-web/src/app/api/arena/[id]/route.ts` |
| /api/arena/[id]/stream | GET | arena | direct:2 | auth, sse, validation | -- | `packages/dojolm-web/src/app/api/arena/[id]/stream/route.ts` |
| /api/arena/export | -- | arena | direct:1 | validation | -- | `packages/dojolm-web/src/app/api/arena/export/route.ts` |
| /api/arena | -- | arena | direct:1 | validation, network | -- | `packages/dojolm-web/src/app/api/arena/route.ts` |
| /api/arena/warriors | -- | arena | direct:1 | validation | -- | `packages/dojolm-web/src/app/api/arena/warriors/route.ts` |
| /api/attackdna/analyze | -- | attackdna | direct:1 | validation | -- | `packages/dojolm-web/src/app/api/attackdna/analyze/route.ts` |
| /api/attackdna/ingest | -- | attackdna | direct:1 | storage, persistence, network | -- | `packages/dojolm-web/src/app/api/attackdna/ingest/route.ts` |
| /api/attackdna/query | -- | attackdna | direct:1 | network | -- | `packages/dojolm-web/src/app/api/attackdna/query/route.ts` |
| /api/attackdna/sync | -- | attackdna | direct:1 | validation, network | -- | `packages/dojolm-web/src/app/api/attackdna/sync/route.ts` |
| /api/audit/log | GET, OPTIONS | audit | direct:1 | auth, storage | -- | `packages/dojolm-web/src/app/api/audit/log/route.ts` |
| /api/auth/login | POST | auth | direct:1 | auth, validation, persistence | -- | `packages/dojolm-web/src/app/api/auth/login/route.ts` |
| /api/auth/logout | POST | auth | direct:1 | auth, persistence | -- | `packages/dojolm-web/src/app/api/auth/logout/route.ts` |
| /api/auth/me | GET | auth | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/auth/me/route.ts` |
| /api/auth/users/[id] | -- | auth | direct:1 | auth, admin | -- | `packages/dojolm-web/src/app/api/auth/users/[id]/route.ts` |
| /api/auth/users | -- | auth | direct:1 | auth, admin | -- | `packages/dojolm-web/src/app/api/auth/users/route.ts` |
| /api/compliance/evidence | GET, POST | compliance | direct:1 | auth, storage, validation | -- | `packages/dojolm-web/src/app/api/compliance/evidence/route.ts` |
| /api/compliance/export | GET, OPTIONS | compliance | direct:1 | auth, persistence, network, navigation | -- | `packages/dojolm-web/src/app/api/compliance/export/route.ts` |
| /api/compliance/frameworks | GET, OPTIONS | compliance | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/compliance/frameworks/route.ts` |
| /api/compliance | GET, OPTIONS | compliance | direct:1 | auth, persistence, network | -- | `packages/dojolm-web/src/app/api/compliance/route.ts` |
| /api/ecosystem/findings | GET, POST | ecosystem | direct:1 | auth, validation, network | -- | `packages/dojolm-web/src/app/api/ecosystem/findings/route.ts` |
| /api/fixtures | GET, OPTIONS | fixtures | direct:1 | auth, storage, network | -- | `packages/dojolm-web/src/app/api/fixtures/route.ts` |
| /api/health | GET | health | direct:1 | -- | -- | `packages/dojolm-web/src/app/api/health/route.ts` |
| /api/llm/batch-test/[id] | GET, OPTIONS | llm | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/app/api/llm/batch-test/[id]/route.ts` |
| /api/llm/batch-test | GET, POST | llm | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/batch-test/route.ts` |
| /api/llm/batch/[id]/executions | -- | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/batch/[id]/executions/route.ts` |
| /api/llm/batch/[id]/reports | GET | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/batch/[id]/reports/route.ts` |
| /api/llm/batch/[id] | -- | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/batch/[id]/route.ts` |
| /api/llm/batch/[id]/stream | -- | llm | direct:1 | auth, sse, validation | -- | `packages/dojolm-web/src/app/api/llm/batch/[id]/stream/route.ts` |
| /api/llm/batch | -- | llm | direct:1 | auth, storage, validation, persistence +1 | -- | `packages/dojolm-web/src/app/api/llm/batch/route.ts` |
| /api/llm/chat | -- | llm | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/llm/chat/route.ts` |
| /api/llm/coverage | GET | llm | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/coverage/route.ts` |
| /api/llm/execute | -- | llm | direct:1 | auth, validation, persistence | -- | `packages/dojolm-web/src/app/api/llm/execute/route.ts` |
| /api/llm/export/[modelId] | GET, OPTIONS | llm | direct:1 | auth, validation, network, navigation | -- | `packages/dojolm-web/src/app/api/llm/export/[modelId]/route.ts` |
| /api/llm/export | GET, OPTIONS | llm | direct:1 | auth, validation, network, llm +1 | -- | `packages/dojolm-web/src/app/api/llm/export/route.ts` |
| /api/llm/fingerprint/results | GET | llm | direct:2 | auth, storage, network | -- | `packages/dojolm-web/src/app/api/llm/fingerprint/results/route.ts` |
| /api/llm/fingerprint | POST | llm | direct:1 | auth, storage, validation, persistence | -- | `packages/dojolm-web/src/app/api/llm/fingerprint/route.ts` |
| /api/llm/fingerprint/signatures | GET | llm | direct:2 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/fingerprint/signatures/route.ts` |
| /api/llm/fingerprint/stream/[id] | GET | llm | direct:1 | auth, sse | -- | `packages/dojolm-web/src/app/api/llm/fingerprint/stream/[id]/route.ts` |
| /api/llm/guard/audit | GET | llm | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/guard/audit/route.ts` |
| /api/llm/guard | GET, POST, PUT, OPTIONS | llm | direct:1 | auth, validation, persistence | -- | `packages/dojolm-web/src/app/api/llm/guard/route.ts` |
| /api/llm/guard/stats | GET | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/guard/stats/route.ts` |
| /api/llm/leaderboard | GET, OPTIONS | llm | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/leaderboard/route.ts` |
| /api/llm/local-models | GET | llm | direct:1 | auth, validation, network, llm | -- | `packages/dojolm-web/src/app/api/llm/local-models/route.ts` |
| /api/llm/models/[id] | GET, PATCH, DELETE, OPTIONS | llm | direct:2 | auth, validation | -- | `packages/dojolm-web/src/app/api/llm/models/[id]/route.ts` |
| /api/llm/models/[id]/test | POST | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/models/[id]/test/route.ts` |
| /api/llm/models | GET, POST, PATCH, DELETE, OPTIONS | llm | direct:1 | auth, validation, network | -- | `packages/dojolm-web/src/app/api/llm/models/route.ts` |
| /api/llm/presets | GET | llm | direct:1 | llm | -- | `packages/dojolm-web/src/app/api/llm/presets/route.ts` |
| /api/llm/providers/[id]/discover | GET | llm | direct:1 | auth, validation, network, llm | -- | `packages/dojolm-web/src/app/api/llm/providers/[id]/discover/route.ts` |
| /api/llm/providers/[id] | GET, DELETE, OPTIONS | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/providers/[id]/route.ts` |
| /api/llm/providers/[id]/status | GET | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/providers/[id]/status/route.ts` |
| /api/llm/providers | GET, POST, OPTIONS | llm | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/llm/providers/route.ts` |
| /api/llm/reports | GET | llm | direct:1 | auth, validation, network | -- | `packages/dojolm-web/src/app/api/llm/reports/route.ts` |
| /api/llm/results | GET, DELETE | llm | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/llm/results/route.ts` |
| /api/llm/seed | POST | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/seed/route.ts` |
| /api/llm/summary | GET | llm | direct:1 | auth, validation, network, llm | -- | `packages/dojolm-web/src/app/api/llm/summary/route.ts` |
| /api/llm/test-cases | GET, POST, DELETE | llm | direct:1 | auth, validation, network | -- | `packages/dojolm-web/src/app/api/llm/test-cases/route.ts` |
| /api/llm/test-fixture | POST | llm | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/llm/test-fixture/route.ts` |
| /api/mcp/status | GET, POST | mcp | direct:1 | auth, persistence, network | -- | `packages/dojolm-web/src/app/api/mcp/status/route.ts` |
| /api/orchestrator/run | OPTIONS | orchestrator | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/orchestrator/run/route.ts` |
| /api/orchestrator/status | OPTIONS | orchestrator | direct:1 | auth, validation, persistence, network | -- | `packages/dojolm-web/src/app/api/orchestrator/status/route.ts` |
| /api/read-fixture/media | GET, OPTIONS | read-fixture | direct:1 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/read-fixture/media/route.ts` |
| /api/read-fixture | GET, OPTIONS | read-fixture | direct:1 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/read-fixture/route.ts` |
| /api/reports/consolidated | GET, OPTIONS | reports | direct:1 | auth, storage, network, navigation | -- | `packages/dojolm-web/src/app/api/reports/consolidated/route.ts` |
| /api/ronin/cves | GET | ronin | direct:1 | auth, network | -- | `packages/dojolm-web/src/app/api/ronin/cves/route.ts` |
| /api/ronin/programs | GET | ronin | direct:1 | auth, validation, network, llm | -- | `packages/dojolm-web/src/app/api/ronin/programs/route.ts` |
| /api/ronin/submissions | GET, POST, PATCH | ronin | direct:1 | auth, validation, persistence, network +1 | -- | `packages/dojolm-web/src/app/api/ronin/submissions/route.ts` |
| /api/scan-fixture | GET, POST, OPTIONS | scan-fixture | direct:1 | auth, storage, validation, network +1 | -- | `packages/dojolm-web/src/app/api/scan-fixture/route.ts` |
| /api/scan | OPTIONS | scan | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/scan/route.ts` |
| /api/sengoku/campaigns/[id] | GET, PATCH, DELETE | sengoku | direct:2 | auth, storage, validation | -- | `packages/dojolm-web/src/app/api/sengoku/campaigns/[id]/route.ts` |
| /api/sengoku/campaigns/[id]/run | POST | sengoku | direct:1 | auth, storage | -- | `packages/dojolm-web/src/app/api/sengoku/campaigns/[id]/run/route.ts` |
| /api/sengoku/campaigns/[id]/runs/[runId] | GET, PATCH | sengoku | direct:1 | auth, storage | -- | `packages/dojolm-web/src/app/api/sengoku/campaigns/[id]/runs/[runId]/route.ts` |
| /api/sengoku/campaigns/[id]/runs | GET | sengoku | direct:1 | auth, storage | -- | `packages/dojolm-web/src/app/api/sengoku/campaigns/[id]/runs/route.ts` |
| /api/sengoku/campaigns | GET, POST, OPTIONS | sengoku | direct:1 | auth, storage, validation, network | -- | `packages/dojolm-web/src/app/api/sengoku/campaigns/route.ts` |
| /api/sengoku/runs/[runId] | -- | sengoku | direct:1 | storage | -- | `packages/dojolm-web/src/app/api/sengoku/runs/[runId]/route.ts` |
| /api/sensei/chat | GET, POST, PUT, PATCH, DELETE, OPTIONS | sensei | direct:2 | auth, sse, validation, persistence +1 | -- | `packages/dojolm-web/src/app/api/sensei/chat/route.ts` |
| /api/sensei/generate | OPTIONS | sensei | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/sensei/generate/route.ts` |
| /api/sensei/judge | OPTIONS | sensei | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/sensei/judge/route.ts` |
| /api/sensei/mutate | OPTIONS | sensei | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/sensei/mutate/route.ts` |
| /api/sensei/plan | OPTIONS | sensei | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/sensei/plan/route.ts` |
| /api/shingan/batch | POST | shingan | direct:2 | auth, validation | -- | `packages/dojolm-web/src/app/api/shingan/batch/route.ts` |
| /api/shingan/formats | GET | shingan | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/shingan/formats/route.ts` |
| /api/shingan/scan | POST | shingan | direct:2 | auth | -- | `packages/dojolm-web/src/app/api/shingan/scan/route.ts` |
| /api/shingan/url | POST | shingan | direct:2 | auth, network | -- | `packages/dojolm-web/src/app/api/shingan/url/route.ts` |
| /api/stats | GET | stats | direct:1 | auth | -- | `packages/dojolm-web/src/app/api/stats/route.ts` |
| /api/tests | GET, POST, OPTIONS | tests | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/tests/route.ts` |
| /api/v1/arena | OPTIONS | v1 | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/v1/arena/route.ts` |
| /api/v1/benchmark | OPTIONS | v1 | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/v1/benchmark/route.ts` |
| /api/v1/scan | OPTIONS | v1 | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/v1/scan/route.ts` |
| /api/v1/sengoku | OPTIONS | v1 | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/v1/sengoku/route.ts` |
| /api/v1/sensei | OPTIONS | v1 | direct:1 | auth, validation, llm | -- | `packages/dojolm-web/src/app/api/v1/sensei/route.ts` |
| /api/v1/timechamber | OPTIONS | v1 | direct:1 | auth, validation | -- | `packages/dojolm-web/src/app/api/v1/timechamber/route.ts` |

</details>

<details>
<summary>page (5 surfaces; direct 0, indirect 0, none 5)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary:error | root | Error | 2 | api:0 nav:0 xmod:0 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/error.tsx` |
| /login | login | LoginPage | 4 | api:0 nav:0 xmod:5 | none | auth | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/login/page.tsx` |
| boundary:404 | root | NotFound | 2 | api:0 nav:0 xmod:0 | none | navigation | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/not-found.tsx` |
| / | root | Home | 10 | api:0 nav:0 xmod:32 | none | storage, navigation | click, keyboard, and state transition coverage | `packages/dojolm-web/src/app/page.tsx` |
| /style-guide | style-guide | StyleGuidePage | 0 | api:0 nav:0 xmod:7 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/app/style-guide/page.tsx` |

</details>

<details>
<summary>app-shell (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| app-shell:/ | root | RootLayout | 0 | api:0 nav:0 xmod:2 | none | navigation | direct unit or integration coverage | `packages/dojolm-web/src/app/layout.tsx` |

</details>

<details>
<summary>widget (32 surfaces; direct 32, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ActivityFeedWidget.tsx | dashboard | ActivityFeedWidget | 0 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/ActivityFeedWidget.tsx` |
| ArenaLeaderboardWidget.tsx | dashboard | ArenaLeaderboardWidget | 2 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay.tsx | dashboard | AttackOfTheDay | 2 | api:0 nav:0 xmod:6 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget.tsx | dashboard | ComplianceBarsWidget | 2 | api:1 nav:0 xmod:4 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| CoverageHeatmapWidget.tsx | dashboard | CoverageHeatmapWidget | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/CoverageHeatmapWidget.tsx` |
| DojoReadiness.tsx | dashboard | DojoReadiness | 4 | api:0 nav:0 xmod:4 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| EcosystemPulseWidget.tsx | dashboard | EcosystemPulseWidget | 2 | api:1 nav:0 xmod:6 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| EngineToggleGrid.tsx | dashboard | EngineToggleGrid | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/EngineToggleGrid.tsx` |
| FixtureRoulette.tsx | dashboard | FixtureRoulette | 4 | api:2 nav:0 xmod:6 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| GuardAuditWidget.tsx | dashboard | GuardAuditWidget | 0 | api:1 nav:0 xmod:4 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/dashboard/widgets/GuardAuditWidget.tsx` |
| GuardQuickPanel.tsx | dashboard | GuardQuickPanel | 10 | api:0 nav:0 xmod:5 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardStatsCard.tsx | dashboard | GuardStatsCard | 0 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/GuardStatsCard.tsx` |
| KillCount.tsx | dashboard | KillCount | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/KillCount.tsx` |
| KotobaWidget.tsx | dashboard | KotobaWidget | 2 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMBatchProgress.tsx | dashboard | LLMBatchProgress | 1 | api:1 nav:0 xmod:8 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| LLMJutsuWidget.tsx | dashboard | LLMJutsuWidget | 2 | api:1 nav:0 xmod:5 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| LLMModelsWidget.tsx | dashboard | LLMModelsWidget | 6 | api:2 nav:0 xmod:5 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| MitsukeAlertWidget.tsx | dashboard | MitsukeAlertWidget | 2 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| ModuleGridWidget.tsx | dashboard | ModuleGridWidget | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/ModuleGridWidget.tsx` |
| PlatformStatsWidget.tsx | dashboard | PlatformStatsWidget | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/PlatformStatsWidget.tsx` |
| QuickLaunchOrOnboarding.tsx | dashboard | QuickLaunchOrOnboarding | 0 | api:0 nav:0 xmod:0 | direct:1 | persistence | -- | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchOrOnboarding.tsx` |
| QuickLaunchPad.tsx | dashboard | QuickLaunchPad | 2 | api:0 nav:0 xmod:4 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchPad.tsx` |
| QuickLLMTestWidget.tsx | dashboard | QuickLLMTestWidget | 5 | api:2 nav:0 xmod:5 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget.tsx | dashboard | QuickScanWidget | 4 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| RoninHubWidget.tsx | dashboard | RoninHubWidget | 2 | api:1 nav:0 xmod:4 | direct:1 | auth, persistence, network, navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/RoninHubWidget.tsx` |
| SAGEStatusWidget.tsx | dashboard | SAGEStatusWidget | 4 | api:0 nav:0 xmod:4 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SengokuWidget.tsx | dashboard | SengokuWidget | 2 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| SessionPulse.tsx | dashboard | SessionPulse | 0 | api:0 nav:0 xmod:5 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/SessionPulse.tsx` |
| SystemHealthGauge.tsx | dashboard | SystemHealthGauge | 0 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/SystemHealthGauge.tsx` |
| ThreatRadar.tsx | dashboard | ThreatRadar | 2 | api:0 nav:0 xmod:5 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/ThreatRadar.tsx` |
| ThreatTrendWidget.tsx | dashboard | ThreatTrendWidget | 0 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/widgets/ThreatTrendWidget.tsx` |
| TimeChamberWidget.tsx | dashboard | TimeChamberWidget | 2 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |

</details>

<details>
<summary>component (229 surfaces; direct 153, indirect 0, none 76)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AdminPanel.tsx | admin | AdminPanel | 5 | api:0 nav:2 xmod:3 | direct:2 | admin, navigation | -- | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| AdminSettings.tsx | admin | AdminSettings | 8 | api:1 nav:0 xmod:2 | direct:1 | auth, storage, persistence, network +1 | -- | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| ApiKeyManager.tsx | admin | ApiKeyManager | 20 | api:3 nav:0 xmod:3 | direct:2 | auth, network, admin, llm | -- | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings.tsx | admin | ExportSettings | 4 | api:0 nav:0 xmod:1 | direct:1 | admin | -- | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| index.ts | admin | AdminPanel, ApiKeyManager, ScannerConfig, ExportSettings +2 | 0 | api:0 nav:0 xmod:0 | none | admin | direct unit or integration coverage | `packages/dojolm-web/src/components/admin/index.ts` |
| ScannerConfig.tsx | admin | ScannerConfig | 8 | api:0 nav:0 xmod:5 | direct:1 | admin | -- | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| Scoreboard.tsx | admin | Scoreboard | 0 | api:1 nav:0 xmod:2 | none | auth, network, admin | fetch integration and failure-state coverage | `packages/dojolm-web/src/components/admin/Scoreboard.tsx` |
| SystemHealth.tsx | admin | SystemHealth | 2 | api:2 nav:0 xmod:3 | direct:1 | auth, storage, network, admin | -- | `packages/dojolm-web/src/components/admin/SystemHealth.tsx` |
| UserManagement.tsx | admin | UserManagement | 9 | api:2 nav:0 xmod:6 | direct:1 | auth, network, admin | -- | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager.tsx | admin | ValidationManager | 29 | api:7 nav:1 xmod:2 | direct:2 | auth, network, admin, navigation | -- | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| AdversarialLab.tsx | adversarial | AdversarialLab, AdversarialLabProps | 27 | api:0 nav:1 xmod:9 | direct:1 | storage, validation, persistence, network +2 | -- | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| AtemiConfig.tsx | adversarial | AtemiConfig, AtemiConfigData, AtemiConfigProps | 14 | api:0 nav:0 xmod:2 | direct:2 | persistence | -- | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiGettingStarted.tsx | adversarial | AtemiGettingStarted, AtemiGettingStartedProps | 6 | api:0 nav:0 xmod:3 | direct:1 | persistence | -- | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AttackLog.tsx | adversarial | AttackLog, AttackLogProps | 2 | api:0 nav:0 xmod:6 | direct:2 | -- | -- | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| AttackToolCard.tsx | adversarial | AttackToolCard, ExecutionResult, LearnMoreContent, AttackToolCardProps | 8 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| index.ts | adversarial | AdversarialLab, AttackToolCard, AttackLog, AtemiGettingStarted +6 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/adversarial/index.ts` |
| McpConnectorStatus.tsx | adversarial | McpConnectorStatus, McpConnectorStatusProps | 14 | api:1 nav:0 xmod:4 | direct:1 | auth, persistence, network | -- | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| PlaybookRunner.tsx | adversarial | PlaybookRunner | 4 | api:0 nav:0 xmod:6 | direct:1 | llm | -- | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| SessionHistory.tsx | adversarial | SessionHistory, SessionHistoryProps | 15 | api:0 nav:0 xmod:4 | direct:1 | persistence | -- | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionRecorder.tsx | adversarial | SessionRecorder, SessionRecorderProps | 6 | api:0 nav:0 xmod:3 | direct:1 | -- | -- | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SkillCard.tsx | adversarial | SkillCardProps | 2 | api:0 nav:0 xmod:6 | direct:2 | -- | -- | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary.tsx | adversarial | SkillsLibraryProps | 16 | api:0 nav:0 xmod:7 | direct:2 | -- | -- | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab.tsx | agentic | AgenticLab | 8 | api:1 nav:0 xmod:5 | direct:1 | storage, validation, network, llm | -- | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| ScenarioRunner.tsx | agentic | ScenarioRunner | 3 | api:1 nav:0 xmod:3 | direct:1 | network | -- | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| AmaterasuConfig.tsx | attackdna | AmaterasuConfig, AmaterasuConfigData, AmaterasuConfigProps | 9 | api:2 nav:0 xmod:3 | none | auth, persistence, network | click, keyboard, and state transition coverage, fetch integration and failure-state coverage | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide.tsx | attackdna | AmaterasuGuide, resetAmaterasuGuide, TabHelpButton, TabHelpContent +2 | 13 | api:0 nav:0 xmod:1 | none | persistence | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer.tsx | attackdna | AttackDNAExplorer | 6 | api:5 nav:0 xmod:7 | direct:2 | auth, network, navigation | -- | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis.tsx | attackdna | BlackBoxAnalysis | 13 | api:1 nav:0 xmod:5 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| ClusterView.tsx | attackdna | ClusterView | 2 | api:0 nav:0 xmod:3 | direct:1 | llm | -- | `packages/dojolm-web/src/components/attackdna/ClusterView.tsx` |
| data-source-tiers.ts | attackdna | filterByTiers, mergeStats, DataSourceTierDef, TieredItem +1 | 0 | api:0 nav:0 xmod:0 | none | storage | direct unit or integration coverage | `packages/dojolm-web/src/components/attackdna/data-source-tiers.ts` |
| DataSourceSelector.tsx | attackdna | DataSourceSelector, MasterSyncStatus, DataSourceSelectorProps | 4 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary.tsx | attackdna | DNALibrary | 2 | api:0 nav:0 xmod:3 | direct:1 | validation, llm, navigation | -- | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView.tsx | attackdna | FamilyTreeView | 12 | api:0 nav:1 xmod:4 | direct:1 | llm, navigation | -- | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| index.ts | attackdna | AttackDNAExplorer, FamilyTreeView, ClusterView, MutationTimeline +13 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/attackdna/index.ts` |
| MutationTimeline.tsx | attackdna | MutationTimeline | 4 | api:0 nav:0 xmod:4 | direct:1 | llm | -- | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| NodeDetailPanel.tsx | attackdna | NodeDetailPanel, NodeData | 3 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| XRayPanel.tsx | attackdna | XRayPanel | 6 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| BarChart.tsx | charts | DojoBarChart, DojoBarChartProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/charts/BarChart.tsx` |
| CoverageMap.tsx | charts | DojoCoverageMap, CoverageCell, DojoCoverageMapProps | 0 | api:0 nav:0 xmod:2 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/charts/CoverageMap.tsx` |
| DonutChart.tsx | charts | DojoDonutChart, DojoDonutChartProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/charts/DonutChart.tsx` |
| GaugeChart.tsx | charts | DojoGaugeChart, DojoGaugeChartProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/charts/GaugeChart.tsx` |
| index.ts | charts | DojoLineChart, DojoBarChart, DojoCoverageMap, DojoTrendChart +2 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/charts/index.ts` |
| LineChart.tsx | charts | DojoLineChart, DojoLineChartProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/charts/LineChart.tsx` |
| TrendChart.tsx | charts | DojoTrendChart, DojoTrendChartProps | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/charts/TrendChart.tsx` |
| AuditTrail.tsx | compliance | AuditTrail, AuditTrailProps | 8 | api:1 nav:0 xmod:3 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| ComplianceCenter.tsx | compliance | ComplianceCenter | 25 | api:1 nav:0 xmod:13 | direct:5 | auth, storage, validation, persistence +2 | -- | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| ComplianceChecklist.tsx | compliance | ComplianceChecklist, ComplianceChecklistProps, FRAMEWORK_REGISTRY, FRAMEWORK_TIERS +3 | 20 | api:0 nav:0 xmod:4 | direct:3 | persistence, navigation | -- | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard.tsx | compliance | ComplianceDashboard | 2 | api:1 nav:0 xmod:1 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| ComplianceExport.tsx | compliance | sanitizeForExport, generateMarkdown, generateJSON, generateCSV +5 | 4 | api:0 nav:1 xmod:2 | direct:1 | validation, navigation | -- | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| FrameworkNavigator.tsx | compliance | FrameworkNavigator, FrameworkNavigatorProps | 11 | api:0 nav:0 xmod:4 | direct:2 | -- | -- | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix.tsx | compliance | GapMatrix, GapMatrixProps | 5 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| index.ts | compliance | default, GapMatrix, AuditTrail, ComplianceChecklist +2 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/compliance/index.ts` |
| CoverageMap.tsx | coverage | CoverageMap, CoverageSummary | 0 | api:0 nav:0 xmod:5 | direct:1 | storage | -- | `packages/dojolm-web/src/components/coverage/CoverageMap.tsx` |
| index.ts | coverage | CoverageMap, CoverageSummary | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/coverage/index.ts` |
| DashboardConfigContext.tsx | dashboard | migrateSize, DashboardConfigProvider, useDashboardConfig, WidgetSize +3 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation, persistence | -- | `packages/dojolm-web/src/components/dashboard/DashboardConfigContext.tsx` |
| DashboardCustomizer.tsx | dashboard | DashboardCustomizer | 13 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| index.ts | dashboard | NODADashboard, DashboardConfigProvider, useDashboardConfig, WIDGET_CATALOG +29 | 0 | api:0 nav:0 xmod:27 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/dashboard/index.ts` |
| NODADashboard.tsx | dashboard | NODADashboard | 4 | api:0 nav:0 xmod:37 | none | navigation | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| SenseiPanel.tsx | dashboard | SenseiPanel | 5 | api:0 nav:0 xmod:5 | direct:1 | llm | -- | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetCard.tsx | dashboard | WidgetMetaProvider, WidgetCard | 2 | api:0 nav:0 xmod:5 | direct:2 | navigation | -- | `packages/dojolm-web/src/components/dashboard/WidgetCard.tsx` |
| WidgetEmptyState.tsx | dashboard | WidgetEmptyState, WidgetEmptyStateProps | 1 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| brand-colors.ts | fixtures | brand-colors | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/fixtures/brand-colors.ts` |
| CategoryTree.tsx | fixtures | getBrandForCategory | 6 | api:0 nav:0 xmod:4 | direct:1 | storage | -- | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureCategoryCard.tsx | fixtures | FixtureCategoryCard | 2 | api:0 nav:0 xmod:6 | direct:1 | storage | -- | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureComparison.tsx | fixtures | ComparisonItem | 1 | api:0 nav:0 xmod:6 | direct:1 | -- | -- | `packages/dojolm-web/src/components/fixtures/FixtureComparison.tsx` |
| FixtureDetail.tsx | fixtures | FixtureDetail | 2 | api:0 nav:0 xmod:6 | direct:1 | validation | -- | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureExplorer.tsx | fixtures | FixtureExplorer | 13 | api:0 nav:0 xmod:7 | direct:1 | -- | -- | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters.tsx | fixtures | filterManifest, countFilteredFixtures, FixtureFilterState | 12 | api:0 nav:0 xmod:5 | direct:1 | -- | -- | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList.tsx | fixtures | FixtureList | 2 | api:0 nav:0 xmod:6 | direct:1 | -- | -- | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureSearch.tsx | fixtures | FixtureSearch | 16 | api:0 nav:0 xmod:6 | direct:2 | -- | -- | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| index.ts | fixtures | FixtureList, FixtureDetail, MediaViewer, CategoryTree +5 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/fixtures/index.ts` |
| MediaViewer.tsx | fixtures | MediaViewer | 3 | api:1 nav:0 xmod:3 | direct:2 | network | -- | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| ForgeDefensePanel.tsx | guard | ForgeDefensePanel | 5 | api:0 nav:0 xmod:3 | direct:1 | validation, llm | -- | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog.tsx | guard | GuardAuditLog | 10 | api:0 nav:0 xmod:6 | direct:1 | -- | -- | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardBadge.tsx | guard | GuardBadge | 0 | api:1 nav:0 xmod:5 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/guard/GuardBadge.tsx` |
| GuardDashboard.tsx | guard | GuardDashboard | 0 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| GuardModeSelector.tsx | guard | GuardModeSelector | 7 | api:0 nav:0 xmod:6 | direct:1 | -- | -- | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| index.ts | guard | GuardDashboard, GuardModeSelector, GuardAuditLog, GuardBadge | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/guard/index.ts` |
| SystemPromptHardener.tsx | guard | SystemPromptHardener | 2 | api:0 nav:0 xmod:3 | direct:1 | llm | -- | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| FeatureRadar.tsx | kagami | FeatureRadar, RadarAxis, FeatureRadarProps | 0 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-web/src/components/kagami/FeatureRadar.tsx` |
| index.ts | kagami | KagamiPanel, KagamiResults, ProbeProgress, FeatureRadar | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/kagami/index.ts` |
| KagamiPanel.tsx | kagami | KagamiPanel | 9 | api:1 nav:0 xmod:6 | direct:2 | auth, network, llm | -- | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiResults.tsx | kagami | KagamiResults, KagamiResultsProps | 3 | api:0 nav:0 xmod:4 | direct:2 | navigation | -- | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| ProbeProgress.tsx | kagami | ProbeProgress, ProbeProgressProps | 0 | api:1 nav:0 xmod:4 | direct:1 | sse, network | -- | `packages/dojolm-web/src/components/kagami/ProbeProgress.tsx` |
| index.ts | kotoba | KotobaDashboard, KotobaWorkshop | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/kotoba/index.ts` |
| KotobaDashboard.tsx | kotoba | KotobaDashboard | 6 | api:0 nav:0 xmod:4 | direct:1 | validation, llm | -- | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| KotobaWorkshop.tsx | kotoba | KotobaWorkshop | 5 | api:0 nav:0 xmod:3 | direct:1 | llm | -- | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| AnimatedView.tsx | layout | AnimatedView | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/layout/AnimatedView.tsx` |
| DashboardGrid.tsx | layout | MetricGrid, SplitView, MainPanel, SidePanel +4 | 2 | api:0 nav:0 xmod:2 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| MobileNav.tsx | layout | MobileNav | 11 | api:0 nav:0 xmod:4 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| NotificationsPanel.tsx | layout | NotificationsPanel, Notification | 6 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| PageToolbar.tsx | layout | PageToolbar | 5 | api:0 nav:0 xmod:1 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| Sidebar.tsx | layout | Sidebar | 10 | api:0 nav:0 xmod:6 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| SidebarHeader.tsx | layout | SidebarHeader | 0 | api:0 nav:1 xmod:1 | none | navigation | navigation and deep-link coverage | `packages/dojolm-web/src/components/layout/SidebarHeader.tsx` |
| BenchmarkPanel.tsx | llm | BenchmarkPanel | 1 | api:0 nav:0 xmod:3 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble.tsx | llm | ChatBubble, ChatBubbleProps | 2 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView.tsx | llm | ComparisonView | 4 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder.tsx | llm | CustomProviderBuilder | 16 | api:4 nav:0 xmod:3 | direct:1 | auth, network, llm | -- | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| ExecutiveSummary.tsx | llm | ExecutiveSummary | 2 | api:1 nav:0 xmod:7 | direct:2 | auth, validation, network | -- | `packages/dojolm-web/src/components/llm/ExecutiveSummary.tsx` |
| index.ts | llm | LLMDashboard, LLMDashboardWithProviders, ModelList, ModelForm +18 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/llm/index.ts` |
| JutsuAggregation.ts | llm | aggregateByModel, calculateTrend, TestExecution, AggregatedModel | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/dojolm-web/src/components/llm/JutsuAggregation.ts` |
| JutsuModelCard.tsx | llm | JutsuModelCard | 8 | api:0 nav:0 xmod:3 | direct:2 | -- | -- | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuTab.tsx | llm | JutsuTab | 5 | api:1 nav:0 xmod:7 | direct:2 | auth, validation, persistence, network +1 | -- | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| Leaderboard.tsx | llm | Leaderboard | 3 | api:1 nav:0 xmod:11 | direct:2 | auth, validation, persistence, network | -- | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| LLMDashboard.tsx | llm | LLMDashboard, LLMDashboardWithProviders, LLMDashboardProps | 15 | api:0 nav:0 xmod:4 | direct:2 | persistence, navigation | -- | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LocalModelSelector.tsx | llm | LocalModelSelector, LocalModelInfo, LocalModelSelectorProps | 5 | api:1 nav:0 xmod:9 | direct:1 | auth, network, llm | -- | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView.tsx | llm | ModelDetailView | 20 | api:0 nav:0 xmod:6 | direct:1 | validation, network, navigation | -- | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm.tsx | llm | ModelForm, ModelFormProps | 17 | api:0 nav:0 xmod:8 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelList.tsx | llm | ModelList | 9 | api:0 nav:0 xmod:7 | direct:2 | llm | -- | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard.tsx | llm | calculateBadges, aggregateByModel, ComplianceBadge, AggregatedModelResult | 3 | api:0 nav:0 xmod:9 | direct:3 | -- | -- | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| QualityMetricsCard.tsx | llm | QualityMetricsCard | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/llm/QualityMetricsCard.tsx` |
| ReportGenerator.tsx | llm | ReportGenerator, ExportFormatType, ReportGeneratorProps | 7 | api:1 nav:0 xmod:4 | direct:2 | auth, validation, network, navigation | -- | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView.tsx | llm | ResultsView | 11 | api:0 nav:0 xmod:11 | direct:2 | navigation | -- | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution.tsx | llm | TestExecution | 13 | api:3 nav:0 xmod:11 | direct:2 | auth, storage, persistence, network | -- | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter.tsx | llm | TestExporter, ExportFormat, TestExporterProps | 4 | api:1 nav:0 xmod:6 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestSummary.tsx | llm | TestSummary, TestSummaryProps | 9 | api:0 nav:0 xmod:6 | direct:1 | -- | -- | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TransferMatrixPanel.tsx | llm | TransferMatrixPanel | 0 | api:0 nav:0 xmod:2 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/llm/TransferMatrixPanel.tsx` |
| TypingIndicator.tsx | llm | TypingIndicator | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/components/llm/TypingIndicator.tsx` |
| VulnerabilityPanel.tsx | llm | VulnerabilityPanel | 5 | api:0 nav:0 xmod:7 | direct:2 | -- | -- | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| index.ts | payloads | PayloadCard, PayloadGrid, PayloadFilters | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/payloads/index.ts` |
| PayloadCard.tsx | payloads | PayloadCard, PayloadGrid, PayloadFilters | 2 | api:0 nav:0 xmod:5 | direct:1 | validation | -- | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| index.ts | reference | PatternReference | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/reference/index.ts` |
| PatternReference.tsx | reference | PatternReference | 1 | api:0 nav:0 xmod:5 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/reference/PatternReference.tsx` |
| ConsolidatedReportButton.tsx | reports | ConsolidatedReportButton | 3 | api:1 nav:0 xmod:2 | none | network, navigation | click, keyboard, and state transition coverage, fetch integration and failure-state coverage | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator.tsx | ronin | AISeverityCalculator | 7 | api:0 nav:0 xmod:1 | none | persistence | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| index.ts | ronin | RoninHub, ProgramCard, ProgramDetail, ProgramsTab +4 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ronin/index.ts` |
| ProgramCard.tsx | ronin | ProgramCard | 5 | api:0 nav:0 xmod:3 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail.tsx | ronin | ProgramDetail | 5 | api:0 nav:0 xmod:4 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramsTab.tsx | ronin | ProgramsTab | 5 | api:1 nav:0 xmod:4 | direct:1 | auth, storage, persistence, network | -- | `packages/dojolm-web/src/components/ronin/ProgramsTab.tsx` |
| RoninHub.tsx | ronin | RoninHub | 6 | api:0 nav:0 xmod:6 | direct:1 | persistence, navigation | -- | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| SubmissionDetail.tsx | ronin | SubmissionDetail | 4 | api:0 nav:0 xmod:3 | direct:1 | validation | -- | `packages/dojolm-web/src/components/ronin/SubmissionDetail.tsx` |
| SubmissionsTab.tsx | ronin | SubmissionsTab | 5 | api:0 nav:0 xmod:4 | direct:1 | validation, persistence | -- | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard.tsx | ronin | SubmissionWizard | 15 | api:0 nav:0 xmod:3 | direct:2 | -- | -- | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| EncodingChainVisualizer.tsx | scanner | EncodingChainVisualizer | 0 | api:0 nav:1 xmod:1 | direct:1 | navigation | -- | `packages/dojolm-web/src/components/scanner/EncodingChainVisualizer.tsx` |
| FindingsList.tsx | scanner | FindingsList | 0 | api:0 nav:0 xmod:8 | direct:2 | llm | -- | `packages/dojolm-web/src/components/scanner/FindingsList.tsx` |
| index.ts | scanner | QuickChips, ScannerInput, ScanningState, FindingsList +3 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/scanner/index.ts` |
| ModuleBadge.tsx | scanner | ModuleBadge | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/scanner/ModuleBadge.tsx` |
| ModuleLegend.tsx | scanner | ModuleLegend | 0 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults.tsx | scanner | ModuleResults | 3 | api:0 nav:0 xmod:3 | direct:2 | -- | -- | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel.tsx | scanner | ProtocolFuzzPanel | 5 | api:0 nav:0 xmod:3 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips.tsx | scanner | QuickChips | 4 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput.tsx | scanner | ScannerInput | 8 | api:0 nav:0 xmod:6 | direct:1 | validation | -- | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScanningState.tsx | scanner | ScanningState, ScanningStateProps | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/components/scanner/ScanningState.tsx` |
| CampaignGraphBuilder.tsx | sengoku | CampaignGraphBuilder | 15 | api:0 nav:0 xmod:6 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| index.ts | sengoku | SengokuDashboard, SengokuCampaignBuilder, CampaignGraphBuilder, TemporalTab +1 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/sengoku/index.ts` |
| OrchestratorBuilder.tsx | sengoku | OrchestratorBuilder | 13 | api:1 nav:0 xmod:3 | none | network, llm | click, keyboard, and state transition coverage, fetch integration and failure-state coverage | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorVisualization.tsx | sengoku | OrchestratorVisualization | 2 | api:0 nav:0 xmod:2 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx` |
| SengokuCampaignBuilder.tsx | sengoku | SengokuCampaignBuilder | 16 | api:1 nav:0 xmod:7 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuDashboard.tsx | sengoku | SengokuDashboard | 11 | api:3 nav:0 xmod:9 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| temporal-types.ts | sengoku | Turn, AttackType, AttackPlan | 0 | api:0 nav:0 xmod:0 | none | persistence | direct unit or integration coverage | `packages/dojolm-web/src/components/sengoku/temporal-types.ts` |
| TemporalConversation.tsx | sengoku | TemporalConversation | 2 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab.tsx | sengoku | TemporalTab | 4 | api:0 nav:0 xmod:4 | none | persistence, llm | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiChat.tsx | sensei | SenseiChat | 8 | api:0 nav:0 xmod:4 | direct:2 | llm | -- | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiDrawer.tsx | sensei | SenseiDrawer | 12 | api:1 nav:0 xmod:5 | direct:2 | auth, network, llm | -- | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiSuggestions.tsx | sensei | SenseiSuggestions | 2 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult.tsx | sensei | SenseiToolResultCard | 2 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| index.ts | shingan | ShinganPanel | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/shingan/index.ts` |
| ShinganPanel.tsx | shingan | ShinganPanel | 12 | api:1 nav:0 xmod:6 | direct:1 | network, navigation | -- | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| AmaterasuSubsystem.tsx | strategic | AmaterasuSubsystem, AmaterasuErrorBoundary | 2 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/AmaterasuSubsystem.tsx` |
| ArenaRulesWidget.tsx | strategic | ArenaRulesWidget, RulePreview | 2 | api:0 nav:0 xmod:2 | none | persistence, llm | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter.tsx | strategic | BattleLogExporter | 7 | api:1 nav:0 xmod:6 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| index.ts | strategic | MatchCreationWizard, LiveMatchView, LiveCommentary, LiveInferencePanel +8 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/arena/index.ts` |
| LiveCommentary.tsx | strategic | LiveCommentary | 0 | api:0 nav:0 xmod:4 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/arena/LiveCommentary.tsx` |
| LiveInferencePanel.tsx | strategic | LiveInferencePanel | 6 | api:0 nav:0 xmod:4 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView.tsx | strategic | LiveMatchView | 7 | api:2 nav:0 xmod:8 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchAnimations.tsx | strategic | useMatchAnimations, MatchAnimationOverlay | 0 | api:0 nav:0 xmod:2 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/arena/MatchAnimations.tsx` |
| MatchCreationWizard.tsx | strategic | MatchCreationWizard, WizardFormData | 6 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchStatsWidget.tsx | strategic | MatchStatsWidget, LeaderboardView | 1 | api:0 nav:0 xmod:3 | none | llm | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep.tsx | strategic | AttackModeStep | 2 | api:0 nav:0 xmod:3 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep.tsx | strategic | BattleModeStep | 5 | api:0 nav:0 xmod:3 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| LaunchStep.tsx | strategic | LaunchStep | 0 | api:0 nav:0 xmod:3 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/arena/steps/LaunchStep.tsx` |
| ModelSelectionStep.tsx | strategic | ModelSelectionStep | 3 | api:0 nav:0 xmod:5 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/steps/ModelSelectionStep.tsx` |
| WarriorCard.tsx | strategic | WarriorCard | 0 | api:0 nav:0 xmod:4 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/arena/WarriorCard.tsx` |
| WarriorCardGrid.tsx | strategic | WarriorCardGrid | 4 | api:0 nav:0 xmod:4 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| ArenaBrowser.tsx | strategic | ArenaBrowser | 9 | api:4 nav:0 xmod:8 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| ArenaRoster.tsx | strategic | ArenaRoster | 0 | api:0 nav:0 xmod:2 | direct:1 | llm | -- | `packages/dojolm-web/src/components/strategic/ArenaRoster.tsx` |
| index.ts | strategic | StrategicHub, SAGEDashboard, ArenaBrowser, ThreatFeedStream +10 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/strategic/index.ts` |
| KumiteConfig.tsx | strategic | SAGEConfig, ArenaConfig, MitsukeConfig, SAGEConfigData +2 | 13 | api:0 nav:0 xmod:2 | direct:1 | persistence, network | -- | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary.tsx | strategic | MitsukeLibrary | 4 | api:0 nav:0 xmod:3 | direct:1 | storage, validation, network, llm +1 | -- | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig.tsx | strategic | validateSourceUrl, MitsukeSourceConfig, UserSource | 11 | api:0 nav:0 xmod:4 | none | validation, persistence, network | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard.tsx | strategic | SAGEDashboard | 3 | api:0 nav:0 xmod:4 | direct:2 | -- | -- | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SageMutationView.tsx | strategic | SageMutationView | 0 | api:0 nav:0 xmod:3 | direct:1 | storage, llm | -- | `packages/dojolm-web/src/components/strategic/SageMutationView.tsx` |
| SageQuarantineView.tsx | strategic | SageQuarantineView | 4 | api:1 nav:1 xmod:3 | direct:1 | storage, persistence, network, llm +1 | -- | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SageSeedLibrary.tsx | strategic | SageSeedLibrary | 0 | api:0 nav:0 xmod:3 | direct:1 | network, llm | -- | `packages/dojolm-web/src/components/strategic/SageSeedLibrary.tsx` |
| StrategicHub.tsx | strategic | StrategicHub | 9 | api:0 nav:0 xmod:11 | direct:2 | llm | -- | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| SupplyChainPanel.tsx | strategic | SupplyChainPanel | 6 | api:0 nav:0 xmod:3 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| ThreatFeedStream.tsx | strategic | ThreatFeedStream | 11 | api:0 nav:0 xmod:7 | direct:1 | storage, network, llm | -- | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| index.ts | tests | TestRunner | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/tests/index.ts` |
| TestRunner.tsx | tests | TestRunner | 5 | api:0 nav:0 xmod:7 | direct:1 | -- | -- | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ActivityFeed.tsx | ui | ActivityFeed | 4 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| badge.tsx | ui | BadgeProps, Badge, badgeVariants | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/badge.tsx` |
| BeltBadge.tsx | ui | getBeltRank, BeltRank | 0 | api:0 nav:0 xmod:1 | direct:3 | -- | -- | `packages/dojolm-web/src/components/ui/BeltBadge.tsx` |
| BeltLegend.tsx | ui | BeltLegend | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/BeltLegend.tsx` |
| button.tsx | ui | ButtonProps, Button, buttonVariants | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/button.tsx` |
| card.tsx | ui | Card, CardHeader, CardFooter, CardTitle +2 | 0 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-web/src/components/ui/card.tsx` |
| checkbox.tsx | ui | Checkbox | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/checkbox.tsx` |
| ColorProgress.tsx | ui | ColorProgress | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ColorProgress.tsx` |
| ConfigPanel.tsx | ui | ConfigPanel, ConfigToggleControl, ConfigDropdownControl, ConfigNumberControl +7 | 17 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions.tsx | ui | CrossModuleActions | 6 | api:2 nav:0 xmod:3 | direct:1 | auth, network | -- | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| dialog.tsx | ui | DialogHeader, DialogFooter, Dialog, DialogPortal +6 | 3 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/dialog.tsx` |
| EmptyState.tsx | ui | EmptyState | 1 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| EnhancedProgress.tsx | ui | EnhancedProgress, EnhancedProgressProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/EnhancedProgress.tsx` |
| EnsoGauge.tsx | ui | EnsoGauge | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/EnsoGauge.tsx` |
| ErrorBoundary.tsx | ui | ErrorFallback, ErrorBoundary | 1 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ErrorBoundary.tsx` |
| ExpandableCard.tsx | ui | ExpandableCard, ExpandableCardProps | 3 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills.tsx | ui | FilterPills, FilterPill, FilterPillsProps | 3 | api:0 nav:0 xmod:1 | direct:1 | validation | -- | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| GlowCard.tsx | ui | GlowCardProps | 0 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-web/src/components/ui/GlowCard.tsx` |
| input.tsx | ui | InputProps, Input | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/input.tsx` |
| label.tsx | ui | Label | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/label.tsx` |
| LibraryPageTemplate.tsx | ui | LibraryPageTemplate, LibraryColumn, LibraryFilterField, LibraryPageTemplateProps | 20 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| MetricCard.tsx | ui | MetricCard, MetricCardProps | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/MetricCard.tsx` |
| ModuleGuide.tsx | ui | ModuleGuide, GuideSection, ModuleGuideProps | 3 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/ModuleGuide.tsx` |
| ModuleHeader.tsx | ui | ModuleHeader, ModuleHeaderProps | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ModuleHeader.tsx` |
| ModuleOnboarding.tsx | ui | ModuleOnboarding, resetOnboarding, OnboardingStep, ModuleOnboardingProps | 8 | api:0 nav:0 xmod:1 | direct:1 | persistence | -- | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| PageSkeletons.tsx | ui | ScannerPageSkeleton, ArmorySkeleton, CoverageSkeleton | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/PageSkeletons.tsx` |
| progress.tsx | ui | Progress | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/progress.tsx` |
| SafeCodeBlock.tsx | ui | SafeCodeBlock, SafeCodeBlockProps | 2 | api:0 nav:0 xmod:1 | direct:2 | validation | -- | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| scroll-area.tsx | ui | ScrollArea, ScrollBar | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/scroll-area.tsx` |
| select.tsx | ui | Select, SelectGroup, SelectValue, SelectTrigger +6 | 4 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/select.tsx` |
| separator.tsx | ui | Separator | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/separator.tsx` |
| SeverityBadge.tsx | ui | SeverityBadge, SeverityBadgeProps | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-web/src/components/ui/SeverityBadge.tsx` |
| ShimmerSkeleton.tsx | ui | ShimmerSkeleton, MetricCardSkeleton, ChartSkeleton | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/ShimmerSkeleton.tsx` |
| skeleton.tsx | ui | Skeleton | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/skeleton.tsx` |
| SortableTable.tsx | ui | SortableTable, Column, SortableTableProps | 3 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/SortableTable.tsx` |
| StatusDot.tsx | ui | StatusDot | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/StatusDot.tsx` |
| table.tsx | ui | Table, TableHeader, TableBody, TableFooter +4 | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/table.tsx` |
| tabs.tsx | ui | Tabs, TabsList, TabsTrigger, TabsContent | 3 | api:0 nav:0 xmod:1 | none | -- | click, keyboard, and state transition coverage | `packages/dojolm-web/src/components/ui/tabs.tsx` |
| textarea.tsx | ui | TextareaProps, Textarea | 0 | api:0 nav:0 xmod:1 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/components/ui/textarea.tsx` |
| Toast.tsx | ui | ToastContainer, ToastVariant, ToastData | 4 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>

<details>
<summary>hook (5 surfaces; direct 4, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| useSensei.ts | useSensei.ts | useSensei | 0 | api:1 nav:0 xmod:3 | direct:1 | auth, validation, persistence, network +1 | -- | `packages/dojolm-web/src/hooks/useSensei.ts` |
| useSenseiScroll.ts | useSenseiScroll.ts | useSenseiScroll | 0 | api:0 nav:0 xmod:0 | direct:2 | llm | -- | `packages/dojolm-web/src/hooks/useSenseiScroll.ts` |
| index.ts | index.ts | useToast, useScannerMetrics | 0 | api:0 nav:0 xmod:2 | none | -- | state lifecycle and dependency coverage | `packages/dojolm-web/src/lib/hooks/index.ts` |
| useScannerMetrics.ts | useScannerMetrics.ts | useScannerMetrics, _resetScanHistory, ScannerMetrics | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/hooks/useScannerMetrics.ts` |
| useToast.ts | useToast.ts | useToast | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/hooks/useToast.ts` |

</details>

<details>
<summary>lib (117 surfaces; direct 96, indirect 0, none 21)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ablation-engine.ts | ablation-engine.ts | decomposeAttack, runAblation, runSensitivityAnalysis, generateTokenHeatmap +10 | 0 | api:0 nav:1 xmod:0 | direct:2 | llm, navigation | -- | `packages/dojolm-web/src/lib/ablation-engine.ts` |
| adversarial-skill-engine.ts | adversarial-skill-engine.ts | executeSkill | 0 | api:1 nav:0 xmod:2 | direct:1 | validation, network | -- | `packages/dojolm-web/src/lib/adversarial-skill-engine.ts` |
| adversarial-skills-advanced.ts | adversarial-skills-advanced.ts | adversarial-skills-advanced | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, llm | -- | `packages/dojolm-web/src/lib/adversarial-skills-advanced.ts` |
| adversarial-skills-data.ts | adversarial-skills-data.ts | getSkillById, getSkillsByCategory, getSkillsByDifficulty, getSkillsByOwasp | 0 | api:0 nav:0 xmod:1 | direct:4 | llm | -- | `packages/dojolm-web/src/lib/adversarial-skills-data.ts` |
| adversarial-skills-extended.ts | adversarial-skills-extended.ts | getAnySkillById, getAllSkillsByCategory, getAllSkillsByDifficulty, getAllSkillsByOwasp | 0 | api:0 nav:0 xmod:3 | direct:5 | storage, persistence, llm | -- | `packages/dojolm-web/src/lib/adversarial-skills-extended.ts` |
| adversarial-skills-types.ts | adversarial-skills-types.ts | SkillDifficulty, SkillCategory, OwaspLlmMapping, SkillStep +2 | 0 | api:0 nav:0 xmod:0 | direct:5 | -- | -- | `packages/dojolm-web/src/lib/adversarial-skills-types.ts` |
| api-auth.ts | api-auth.ts | checkApiAuth | 0 | api:0 nav:0 xmod:2 | direct:14 | auth, validation | -- | `packages/dojolm-web/src/lib/api-auth.ts` |
| api-error.ts | api-error.ts | apiError | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/dojolm-web/src/lib/api-error.ts` |
| api-handler.ts | api-handler.ts | checkRateLimit, createApiHandler, ApiMethod, RateLimitTier +3 | 0 | api:0 nav:1 xmod:2 | direct:2 | auth, network, navigation | -- | `packages/dojolm-web/src/lib/api-handler.ts` |
| api-route-access.ts | api-route-access.ts | isPublicReadApiRoute, isPublicBrowserActionRoute, isPublicApiRoute | 0 | api:8 nav:0 xmod:0 | direct:1 | network | -- | `packages/dojolm-web/src/lib/api-route-access.ts` |
| api.ts | api.ts | scanText, getFixtures, readFixture, scanFixture +2 | 0 | api:0 nav:6 xmod:3 | direct:2 | auth, network, navigation | -- | `packages/dojolm-web/src/lib/api.ts` |
| arena-audio.ts | arena-audio.ts | getArenaAudio, ArenaAudio | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/arena-audio.ts` |
| arena-commentary.ts | arena-commentary.ts | generateCommentary, getEventTypeLabel | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/arena-commentary.ts` |
| arena-ecosystem.ts | arena-ecosystem.ts | emitRoundFinding, emitMatchCompleteFinding | 0 | api:0 nav:0 xmod:3 | direct:2 | -- | -- | `packages/dojolm-web/src/lib/arena-ecosystem.ts` |
| arena-engine.ts | arena-engine.ts | selectAttack, executeMatch, MatchDependencies | 0 | api:0 nav:0 xmod:4 | direct:2 | persistence | -- | `packages/dojolm-web/src/lib/arena-engine.ts` |
| arena-runner.ts | arena-runner.ts | scheduleArenaMatchStart, runArenaMatch | 0 | api:0 nav:0 xmod:10 | direct:2 | persistence, network, llm | -- | `packages/dojolm-web/src/lib/arena-runner.ts` |
| arena-sage.ts | arena-sage.ts | initSeedPool, selectAttackFromPool, evolveBetweenRounds | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/arena-sage.ts` |
| arena-scoring.ts | arena-scoring.ts | scoreRound, checkVictory, determineRoles | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/arena-scoring.ts` |
| arena-types.ts | arena-types.ts | GameMode, AttackMode, MatchStatus, FighterRole +16 | 0 | api:0 nav:0 xmod:0 | direct:10 | -- | -- | `packages/dojolm-web/src/lib/arena-types.ts` |
| atemi-session-storage.ts | atemi-session-storage.ts | loadSessions, saveSessions, loadConfigSnapshot | 0 | api:0 nav:0 xmod:1 | direct:2 | persistence | -- | `packages/dojolm-web/src/lib/atemi-session-storage.ts` |
| atemi-session-types.ts | atemi-session-types.ts | AtemiSessionStatus, AtemiSessionEventType, AtemiSessionEvent, AtemiSessionConfig +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/atemi-session-types.ts` |
| audit-logger.ts | audit-logger.ts | AuditLogger, AuditLevel, AuditEvent, AuditLogEntry | 0 | api:0 nav:0 xmod:1 | direct:3 | -- | -- | `packages/dojolm-web/src/lib/audit-logger.ts` |
| auth.ts | auth | hashPassword, verifyPassword, generateSessionToken, hashSessionToken +1 | 0 | api:0 nav:0 xmod:0 | direct:3 | auth | -- | `packages/dojolm-web/src/lib/auth/auth.ts` |
| AuthContext.tsx | auth | AuthProvider, useAuth, AuthUser, AuthContextValue | 0 | api:3 nav:0 xmod:0 | none | auth, network | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/auth/AuthContext.tsx` |
| index.ts | auth | hashPassword, verifyPassword, generateSessionToken, hashSessionToken +22 | 0 | api:0 nav:0 xmod:0 | none | auth, validation, persistence | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/auth/index.ts` |
| login-rate-limit.ts | auth | getLoginRateLimitKey, isLoginRateLimited, recordLoginRateLimitFailure, clearLoginRateLimitFailures +1 | 0 | api:0 nav:0 xmod:0 | direct:2 | auth | -- | `packages/dojolm-web/src/lib/auth/login-rate-limit.ts` |
| rbac.ts | auth | hasPermission, getAllowedActions, isAtLeastRole, Resource +1 | 0 | api:0 nav:0 xmod:1 | direct:3 | auth, admin | -- | `packages/dojolm-web/src/lib/auth/rbac.ts` |
| route-guard.ts | auth | withAuth, getSessionToken, buildSessionCookie, buildCsrfCookie +6 | 0 | api:0 nav:0 xmod:1 | direct:2 | auth, validation, persistence | -- | `packages/dojolm-web/src/lib/auth/route-guard.ts` |
| session.ts | auth | createSession, validateSession, destroySession, cleanExpiredSessions +2 | 0 | api:0 nav:0 xmod:2 | direct:2 | auth, storage, validation, persistence | -- | `packages/dojolm-web/src/lib/auth/session.ts` |
| authenticated-event-stream.ts | authenticated-event-stream.ts | connectAuthenticatedEventStream, AuthenticatedEventStream | 0 | api:0 nav:0 xmod:1 | direct:1 | auth, sse | -- | `packages/dojolm-web/src/lib/authenticated-event-stream.ts` |
| client-auth-access.ts | client-auth-access.ts | resetClientAuthAccessCache, canAccessProtectedApi | 0 | api:1 nav:0 xmod:1 | direct:1 | network | -- | `packages/dojolm-web/src/lib/client-auth-access.ts` |
| client-data-cache.ts | client-data-cache.ts | getCachedFixtureManifest, getCachedScannerStats, clearClientDataCache, ScannerPatternGroup +1 | 0 | api:2 nav:0 xmod:2 | direct:2 | auth, network | -- | `packages/dojolm-web/src/lib/client-data-cache.ts` |
| constants.ts | constants.ts | NavGroup, NavItem, NavId | 0 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-web/src/lib/constants.ts` |
| ActivityContext.tsx | contexts | isStaticDescription, ActivityProvider, useActivityState, useActivityDispatch +4 | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, persistence | -- | `packages/dojolm-web/src/lib/contexts/ActivityContext.tsx` |
| EcosystemContext.tsx | contexts | EcosystemProvider, useEcosystem, useEcosystemEmit, useEcosystemFindings +2 | 0 | api:3 nav:0 xmod:4 | none | auth, validation, network | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/contexts/EcosystemContext.tsx` |
| GuardContext.tsx | contexts | GuardProvider, useGuard, useGuardMode, useGuardStats | 0 | api:3 nav:0 xmod:4 | direct:1 | auth, network | -- | `packages/dojolm-web/src/lib/contexts/GuardContext.tsx` |
| index.ts | contexts | LLMModelProvider, useModelContext, useModel, useModelsByProvider +23 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/contexts/index.ts` |
| LLMExecutionContext.tsx | contexts | resetExecutionStateCache, LLMExecutionProvider, useExecutionContext, useExecutionState +1 | 0 | api:1 nav:10 xmod:3 | direct:1 | auth, validation, persistence, network +1 | -- | `packages/dojolm-web/src/lib/contexts/LLMExecutionContext.tsx` |
| LLMModelContext.tsx | contexts | LLMModelProvider, useModelContext, useModel, useModelsByProvider +1 | 0 | api:1 nav:3 xmod:3 | none | auth, network, navigation | permission, expiry, and edge-condition coverage | `packages/dojolm-web/src/lib/contexts/LLMModelContext.tsx` |
| LLMResultsContext.tsx | contexts | LLMResultsProvider, useResultsContext, useModelReport, useLeaderboard +1 | 0 | api:1 nav:7 xmod:3 | direct:1 | auth, network, navigation | -- | `packages/dojolm-web/src/lib/contexts/LLMResultsContext.tsx` |
| ModuleVisibilityContext.tsx | contexts | ModuleVisibilityProvider, useModuleVisibility | 0 | api:0 nav:0 xmod:1 | direct:1 | persistence | -- | `packages/dojolm-web/src/lib/contexts/ModuleVisibilityContext.tsx` |
| baiss-framework.ts | data | getControlsByCategory, getControlsBySourceFramework, findBAISSBySourceControl, getSourceMappings +6 | 0 | api:0 nav:0 xmod:0 | direct:3 | validation, persistence, llm | -- | `packages/dojolm-web/src/lib/data/baiss-framework.ts` |
| ronin-seed-programs.ts | data | BountyPlatform, ProgramStatus, BountyProgram, SubmissionStatus +1 | 0 | api:0 nav:0 xmod:0 | direct:4 | validation, network, llm | -- | `packages/dojolm-web/src/lib/data/ronin-seed-programs.ts` |
| sample-test-cases.ts | data | getTestCasesByCategory, getTestCasesByOWASP, getTestCasesByTPI, getTestCasesBySeverity +5 | 0 | api:0 nav:0 xmod:3 | direct:1 | storage, validation, persistence, llm | -- | `packages/dojolm-web/src/lib/data/sample-test-cases.ts` |
| database.ts | db | getDatabase, closeDatabase, getDatabasePath, verifyWalMode +1 | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, db | -- | `packages/dojolm-web/src/lib/db/database.ts` |
| encryption.ts | db | encrypt, decrypt, validateEncryptionKey, resetEncryptionKey | 0 | api:0 nav:0 xmod:0 | direct:3 | validation, db | -- | `packages/dojolm-web/src/lib/db/encryption.ts` |
| index.ts | db | getDatabase, closeDatabase, getDatabasePath, verifyWalMode +21 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/dojolm-web/src/lib/db/index.ts` |
| migrations.ts | db | getCurrentVersion, getAppliedMigrations, discoverMigrations, runMigrations +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, db | -- | `packages/dojolm-web/src/lib/db/migrations.ts` |
| query-builder.ts | db | QueryBuilder | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, db | -- | `packages/dojolm-web/src/lib/db/query-builder.ts` |
| audit.repository.ts | db | AuditRepository | 0 | api:0 nav:0 xmod:0 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/audit.repository.ts` |
| base.repository.ts | db | QueryOptions | 0 | api:0 nav:0 xmod:0 | none | storage, validation, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/base.repository.ts` |
| batch.repository.ts | db | BatchRepository | 0 | api:0 nav:0 xmod:0 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/batch.repository.ts` |
| execution.repository.ts | db | ExecutionRepository, ExecutionQueryFilters | 0 | api:0 nav:1 xmod:0 | none | storage, validation, navigation, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/execution.repository.ts` |
| index.ts | db | BaseRepository, type QueryOptions, ModelConfigRepository, modelConfigRepo +17 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/db/repositories/index.ts` |
| model-config.repository.ts | db | ModelConfigRepository | 0 | api:0 nav:0 xmod:0 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/model-config.repository.ts` |
| scoreboard.repository.ts | db | ScoreboardRepository, ModelRanking, DailySummary, CategoryBreakdown | 0 | api:0 nav:0 xmod:0 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/scoreboard.repository.ts` |
| test-case.repository.ts | db | TestCaseRepository | 0 | api:0 nav:0 xmod:0 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/test-case.repository.ts` |
| user.repository.ts | db | UserRepository, SafeUser | 0 | api:0 nav:0 xmod:1 | none | storage, db | query safety and malformed input coverage, read/write invariants and corruption handling | `packages/dojolm-web/src/lib/db/repositories/user.repository.ts` |
| retention.ts | db | getRetentionConfig, updateRetentionConfig, runRetention, RetentionResult | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, db | -- | `packages/dojolm-web/src/lib/db/retention.ts` |
| types.ts | db | ModelConfigRow, TestCaseRow, BatchExecutionRow, BatchTestCaseRow +19 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/dojolm-web/src/lib/db/types.ts` |
| ecosystem-emitters.ts | ecosystem-emitters.ts | emitScannerFindings, emitExecutionFinding, emitGuardFinding, emitAnalyzeFinding | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-web/src/lib/ecosystem-emitters.ts` |
| ecosystem-types.ts | ecosystem-types.ts | toEcosystemSeverity, EcosystemSourceModule, EcosystemFindingType, EcosystemSeverity +5 | 0 | api:0 nav:0 xmod:0 | direct:4 | -- | -- | `packages/dojolm-web/src/lib/ecosystem-types.ts` |
| fetch-with-auth.ts | fetch-with-auth.ts | getApiKey, setApiKey, clearApiKey, fetchWithAuth | 0 | api:0 nav:0 xmod:0 | direct:10 | auth, persistence, network | -- | `packages/dojolm-web/src/lib/fetch-with-auth.ts` |
| fingerprint-state.ts | fingerprint-state.ts | FingerprintSession | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/fingerprint-state.ts` |
| fixtures-manifest.ts | fixtures-manifest.ts | fixtures-manifest | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/fixtures-manifest.ts` |
| guard-constants.ts | guard-constants.ts | guard-constants | 0 | api:0 nav:0 xmod:1 | direct:4 | persistence | -- | `packages/dojolm-web/src/lib/guard-constants.ts` |
| guard-middleware.ts | guard-middleware.ts | redactPII, guardScanInput, guardScanOutput, executeWithGuard +2 | 0 | api:0 nav:0 xmod:4 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/guard-middleware.ts` |
| guard-types.ts | guard-types.ts | GuardMode, GuardDirection, GuardAction, GuardModeInfo +6 | 0 | api:0 nav:0 xmod:0 | direct:6 | persistence | -- | `packages/dojolm-web/src/lib/guard-types.ts` |
| llm-constants.ts | llm-constants.ts | getConcurrentLimit, getPerHostLimit, getMaxBatchSize, isOpenAICompatible +5 | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, network, llm | -- | `packages/dojolm-web/src/lib/llm-constants.ts` |
| llm-execution.ts | llm-execution.ts | executeSingleTest, executeSingleTestWithRetry, estimateExecutionTime, executeBatchTests +4 | 0 | api:0 nav:0 xmod:7 | direct:3 | persistence | -- | `packages/dojolm-web/src/lib/llm-execution.ts` |
| llm-providers.ts | llm-providers.ts | getProviderAdapter, getRegisteredProviders, validateModelConfig, testModelConfig +3 | 0 | api:0 nav:0 xmod:8 | direct:11 | validation, network, llm | -- | `packages/dojolm-web/src/lib/llm-providers.ts` |
| llm-quality-metrics.ts | llm-quality-metrics.ts | extractCoherence, extractRelevance, extractConsistency, extractVerbosity +2 | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/llm-quality-metrics.ts` |
| llm-quality-types.ts | llm-quality-types.ts | QualityMetrics, StatisticalComparison, QualityThresholds | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/llm-quality-types.ts` |
| llm-reports.ts | llm-reports.ts | generateReport, generateReportFilename, downloadReport | 0 | api:0 nav:0 xmod:1 | direct:1 | llm, navigation | -- | `packages/dojolm-web/src/lib/llm-reports.ts` |
| llm-scenarios.ts | llm-scenarios.ts | getScenarioDefinition, getScenariosByTestingArea, getTestCasesForScenario, isFullScopeScenario +7 | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, llm | -- | `packages/dojolm-web/src/lib/llm-scenarios.ts` |
| llm-scoring.ts | llm-scoring.ts | calculateResilienceScore, calculateHarmfulness, calculateInjectionSuccess, calculateCoverageScore +4 | 0 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-web/src/lib/llm-scoring.ts` |
| llm-server-utils.ts | llm-server-utils.ts | generateModelReport, fetchCoverageMap, generateBatchModelReports, BatchModelSummary +1 | 0 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/llm-server-utils.ts` |
| llm-types.ts | llm-types.ts | LLM_PROVIDERS, TEST_SCENARIOS, DEFAULT_SCORING_WEIGHTS, SecureString | 0 | api:0 nav:0 xmod:0 | direct:19 | -- | -- | `packages/dojolm-web/src/lib/llm-types.ts` |
| master-sync-scheduler.ts | master-sync-scheduler.ts | startScheduler, stopScheduler, getSchedulerStatus, SchedulerStatus | 0 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/master-sync-scheduler.ts` |
| NavigationContext.tsx | NavigationContext.tsx | NavigationProvider, useNavigation | 0 | api:0 nav:0 xmod:1 | none | navigation | direct unit or integration coverage | `packages/dojolm-web/src/lib/NavigationContext.tsx` |
| Providers.tsx | Providers.tsx | Providers | 0 | api:0 nav:0 xmod:6 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/Providers.tsx` |
| anthropic.ts | providers | AnthropicProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | auth, validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/anthropic.ts` |
| errors.ts | providers | isRetryableError, getRetryDelay, parseApiError, ProviderError +7 | 0 | api:0 nav:0 xmod:0 | direct:8 | -- | -- | `packages/dojolm-web/src/lib/providers/errors.ts` |
| index.ts | providers | getProviderAdapter, getAvailableProviders, isProviderSupported, openaiProvider +9 | 0 | api:0 nav:0 xmod:2 | none | llm | direct unit or integration coverage | `packages/dojolm-web/src/lib/providers/index.ts` |
| llamacpp.ts | providers | LlamacppProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/llamacpp.ts` |
| lmstudio.ts | providers | LMStudioProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/lmstudio.ts` |
| moonshot.ts | providers | MoonshotProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/moonshot.ts` |
| ollama.ts | providers | OllamaProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/ollama.ts` |
| openai.ts | providers | OpenAIProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/openai.ts` |
| zai.ts | providers | ZaiProvider | 0 | api:0 nav:0 xmod:3 | direct:2 | validation, network, llm | -- | `packages/dojolm-web/src/lib/providers/zai.ts` |
| request-origin.ts | request-origin.ts | getConfiguredAppOrigin, isAllowedCorsOrigin, isTrustedBrowserOriginRequest, isTrustedBrowserSessionRequest | 0 | api:0 nav:0 xmod:2 | direct:1 | validation, persistence, network | -- | `packages/dojolm-web/src/lib/request-origin.ts` |
| runtime-env.ts | runtime-env.ts | getPublicRuntimeEnv, serializePublicRuntimeEnvScript, getClientRuntimeEnv, PublicRuntimeEnvKey +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-web/src/lib/runtime-env.ts` |
| runtime-paths.ts | runtime-paths.ts | getDataRootDir, getDataPath, resolveDataPath | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/runtime-paths.ts` |
| ScannerContext.tsx | ScannerContext.tsx | ScannerProvider, useScanner | 0 | api:0 nav:0 xmod:3 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/ScannerContext.tsx` |
| sengoku-executor.ts | sengoku-executor.ts | executeCampaignRun | 0 | api:0 nav:0 xmod:3 | direct:1 | storage, validation, persistence, network | -- | `packages/dojolm-web/src/lib/sengoku-executor.ts` |
| sengoku-types.ts | sengoku-types.ts | FindingsSummary, SkillRunResult, CampaignNode, CampaignGraph +13 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/dojolm-web/src/lib/sengoku-types.ts` |
| sengoku-webhook.ts | sengoku-webhook.ts | validateSengokuWebhookUrl, WebhookValidationResult | 0 | api:0 nav:0 xmod:0 | none | validation, network | direct unit or integration coverage | `packages/dojolm-web/src/lib/sengoku-webhook.ts` |
| context-builder.ts | sensei | buildSenseiContext, buildClientContext, ClientContextInput | 0 | api:0 nav:0 xmod:6 | direct:1 | auth, validation, persistence, llm | -- | `packages/dojolm-web/src/lib/sensei/context-builder.ts` |
| conversation-guard.ts | sensei | guardSenseiInput, guardSenseiOutput, guardToolExecution, _resetRateLimits +9 | 0 | api:0 nav:1 xmod:2 | direct:2 | validation, llm, navigation | -- | `packages/dojolm-web/src/lib/sensei/conversation-guard.ts` |
| index.ts | sensei | buildSystemMessage, buildCompactSystemMessage, getSystemMessageBuilder, MODULE_CONTEXT +15 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/dojolm-web/src/lib/sensei/index.ts` |
| system-prompt.ts | sensei | buildSystemMessage, buildCompactSystemMessage, getSystemMessageBuilder, MODULE_CONTEXT | 0 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-web/src/lib/sensei/system-prompt.ts` |
| tool-definitions.ts | sensei | getToolByName, getToolsForPrompt, generateToolDescriptionBlock, generateToolSchemaBlock | 0 | api:19 nav:0 xmod:1 | direct:2 | storage, validation, network, admin +2 | -- | `packages/dojolm-web/src/lib/sensei/tool-definitions.ts` |
| tool-executor.ts | sensei | validateArgs, sanitizeResult, executeToolCall | 0 | api:0 nav:0 xmod:0 | direct:2 | auth, validation, persistence, network +2 | -- | `packages/dojolm-web/src/lib/sensei/tool-executor.ts` |
| tool-parser.ts | sensei | extractToolCalls, escapeToolCallTags, ParsedToolCall, ExtractResult | 0 | api:0 nav:0 xmod:0 | direct:2 | validation, llm | -- | `packages/dojolm-web/src/lib/sensei/tool-parser.ts` |
| types.ts | sensei | SenseiToolCall, SenseiToolResult, SenseiToolDefinition, SenseiMessageRole +10 | 0 | api:0 nav:0 xmod:2 | direct:6 | validation, persistence, llm | -- | `packages/dojolm-web/src/lib/sensei/types.ts` |
| arena-storage.ts | storage | createMatch, getMatch, updateMatch, deleteMatch +6 | 0 | api:0 nav:0 xmod:2 | direct:4 | storage | -- | `packages/dojolm-web/src/lib/storage/arena-storage.ts` |
| db-storage.ts | storage | DbStorage | 0 | api:0 nav:0 xmod:4 | direct:1 | storage | -- | `packages/dojolm-web/src/lib/storage/db-storage.ts` |
| dna-storage.ts | storage | saveNode, getNode, queryNodes, deleteNode +12 | 0 | api:0 nav:0 xmod:1 | direct:3 | storage, validation, persistence | -- | `packages/dojolm-web/src/lib/storage/dna-storage.ts` |
| ecosystem-storage.ts | storage | saveFinding, getFinding, queryFindings, getEcosystemStats +2 | 0 | api:0 nav:0 xmod:2 | direct:5 | storage, validation, persistence | -- | `packages/dojolm-web/src/lib/storage/ecosystem-storage.ts` |
| file-storage.ts | storage | getBatchFilePath, getModelSummaryPath, generateContentHash, generateExecutionHash +1 | 0 | api:0 nav:0 xmod:3 | direct:5 | storage, validation | -- | `packages/dojolm-web/src/lib/storage/file-storage.ts` |
| guard-storage.ts | storage | saveGuardConfig, getGuardConfig, saveGuardEvent, queryGuardEvents +4 | 0 | api:0 nav:0 xmod:4 | direct:7 | storage, persistence | -- | `packages/dojolm-web/src/lib/storage/guard-storage.ts` |
| master-storage.ts | storage | saveEntry, getEntry, queryEntries, deleteEntry +5 | 0 | api:0 nav:0 xmod:1 | direct:3 | storage | -- | `packages/dojolm-web/src/lib/storage/master-storage.ts` |
| sengoku-storage.ts | storage | listCampaigns, getCampaign, createCampaign, updateCampaignStatus +5 | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, network | -- | `packages/dojolm-web/src/lib/storage/sengoku-storage.ts` |
| storage-interface.ts | storage | getStorageBackendType, getStorage, getStorageSync, IStorageBackend +6 | 0 | api:0 nav:0 xmod:1 | direct:3 | storage | -- | `packages/dojolm-web/src/lib/storage/storage-interface.ts` |
| types.ts | types.ts | EngineFilter, QuickPayload, ScanOptions | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/dojolm-web/src/lib/types.ts` |
| useToast.ts | useToast.ts | useToast | 0 | api:0 nav:0 xmod:2 | none | -- | direct unit or integration coverage | `packages/dojolm-web/src/lib/useToast.ts` |
| utils.ts | utils.ts | cn, escHtml, escAttr, formatDuration +4 | 0 | api:0 nav:1 xmod:0 | direct:1 | validation, network, navigation | -- | `packages/dojolm-web/src/lib/utils.ts` |

</details>

<details>
<summary>other (3 surfaces; direct 1, indirect 0, none 2)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| providers.tsx | other | Providers | 0 | api:0 nav:0 xmod:1 | none | auth | direct unit or integration coverage | `packages/dojolm-web/src/app/providers.tsx` |
| proxy.ts | other | resetRateLimiter, proxy | 0 | api:3 nav:0 xmod:3 | direct:2 | auth, network, admin | -- | `packages/dojolm-web/src/proxy.ts` |
| setup.ts | other | setup | 0 | api:0 nav:0 xmod:0 | none | persistence | direct unit or integration coverage | `packages/dojolm-web/src/test/setup.ts` |

</details>

## bu-tpi

Source surfaces: **309**. Test files scanned: **241**.

<details>
<summary>agentic (7 surfaces; direct 7, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| environment.ts | agentic | createEnvironment, addFile, addEmail, addCalendarEvent +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, llm | -- | `packages/bu-tpi/src/agentic/environment.ts` |
| evaluator.ts | agentic | evaluateUtility, evaluateSecurity, evaluateScenario | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/agentic/evaluator.ts` |
| harness-adapters.ts | agentic | agenticToolToOpenAIFunction, agenticToolToOpenAITool, agenticToolsToOpenAI, parseOpenAIToolCall +15 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/agentic/harness-adapters.ts` |
| index.ts | agentic | TOOL_ARCHITECTURES, TOOL_CATEGORIES, EMPTY_ENVIRONMENT, MAX_TOOL_CALLS +34 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/agentic/index.ts` |
| scenarios.ts | agentic | getTemplatesByCategory, getTemplatesByDifficulty, getTemplatesByArchitecture, ScenarioTemplate | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, persistence, network +1 | -- | `packages/bu-tpi/src/agentic/scenarios.ts` |
| task-generator.ts | agentic | generateTask, generateScenario, generateBatchScenarios, BatchScenarioConfig | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, network, llm | -- | `packages/bu-tpi/src/agentic/task-generator.ts` |
| types.ts | agentic | ToolArchitecture, AgenticTool, ToolParameter, ToolCategory +10 | 0 | api:0 nav:0 xmod:0 | direct:2 | storage, validation, llm | -- | `packages/bu-tpi/src/agentic/types.ts` |

</details>

<details>
<summary>arena (7 surfaces; direct 7, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| environment.ts | arena | createEnvironment, addResource, getResource, removeResource +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/arena/environment.ts` |
| game-modes.ts | arena | getGameMode, createGameModeConfig, createObserver, observeEvent +13 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/arena/game-modes.ts` |
| index.ts | arena | DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS, createSandbox, executeInSandbox +41 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/arena/index.ts` |
| match-runner.ts | arena | createMatch, recordEvent, executeRound, runMatch +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/arena/match-runner.ts` |
| referee.ts | arena | createReferee, evaluateAction, checkViolation, scoreOutcome +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage | -- | `packages/bu-tpi/src/arena/referee.ts` |
| sandbox.ts | arena | createSandbox, executeInSandbox, getIsolatedState, setIsolatedState +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/arena/sandbox.ts` |
| types.ts | arena | AgentRole, MessageType, DecisionType, MatchStatus +12 | 0 | api:0 nav:0 xmod:0 | direct:6 | -- | -- | `packages/bu-tpi/src/arena/types.ts` |

</details>

<details>
<summary>attackdna (8 surfaces; direct 8, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dna-ingester.ts | attackdna | ingestScannerFinding, ingestExecutionResult, ingestGuardEvent, ingestMutationResult +11 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/attackdna/dna-ingester.ts` |
| graph-builder.ts | attackdna | buildGraphData, buildTimeline, filterByCategory, filterByDateRange +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/attackdna/graph-builder.ts` |
| index.ts | attackdna | MAX_INPUT_LENGTH, createLineageGraph, addNode, calculateSimilarity +34 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/attackdna/index.ts` |
| lineage-engine.ts | attackdna | createLineageGraph, addNode, calculateSimilarity, analyzeLineage +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/attackdna/lineage-engine.ts` |
| master-pipeline.ts | attackdna | syncSource, syncAllSources, deduplicateEntries, classifyEntries +2 | 0 | api:0 nav:0 xmod:3 | direct:1 | validation, network | -- | `packages/bu-tpi/src/attackdna/master-pipeline.ts` |
| master-sources.ts | attackdna | getAdapter, getAvailableSourceIds, getAllAdapters, MITREAtlasAdapter +3 | 0 | api:0 nav:0 xmod:2 | direct:1 | validation, network | -- | `packages/bu-tpi/src/attackdna/master-sources.ts` |
| mutation-detector.ts | attackdna | detectMutations, buildMutationTaxonomy, predictNextVariants, analyzeTrends | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/attackdna/mutation-detector.ts` |
| types.ts | attackdna | MutationType, AttackNode, AttackEdge, AttackFamily +15 | 0 | api:0 nav:0 xmod:0 | direct:6 | -- | -- | `packages/bu-tpi/src/attackdna/types.ts` |

</details>

<details>
<summary>audit (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| audit-logger.ts | audit | AuditLogger, AuditLogLevel, AuditEntry, AuditLogConfig | 0 | api:0 nav:1 xmod:0 | direct:1 | navigation | -- | `packages/bu-tpi/src/audit/audit-logger.ts` |

</details>

<details>
<summary>benchmark (10 surfaces; direct 8, indirect 0, none 2)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fixture-content.ts | benchmark | getFixtureContent | 0 | api:0 nav:0 xmod:0 | none | storage, validation, llm | direct unit or integration coverage | `packages/bu-tpi/src/benchmark/fixture-content.ts` |
| index.ts | benchmark | SCORING_METHODS, MAX_FIXTURES_PER_SUITE, DIFFICULTY_WEIGHTS, DOJOLM_BENCH_V1 +12 | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/benchmark/index.ts` |
| regression.ts | benchmark | classifyRegression, compareBenchmarkResults, detectBenchmarkRegressions, formatRegressionReport +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/benchmark/regression.ts` |
| runner.ts | benchmark | BenchmarkRunner, BenchmarkProgress, ScanFn | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/benchmark/runner.ts` |
| agentic-bench.ts | benchmark | agentic-bench | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/benchmark/suites/agentic-bench.ts` |
| dojolm-bench.ts | benchmark | dojolm-bench | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/benchmark/suites/dojolm-bench.ts` |
| harmbench.ts | benchmark | harmbench | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/benchmark/suites/harmbench.ts` |
| rag-bench.ts | benchmark | rag-bench | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/benchmark/suites/rag-bench.ts` |
| strongreject.ts | benchmark | strongreject | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/benchmark/suites/strongreject.ts` |
| types.ts | benchmark | ScoringMethod, DifficultyTier, BenchmarkCategory, BenchmarkSuite +3 | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/benchmark/types.ts` |

</details>

<details>
<summary>branding-helpers.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| branding-helpers.ts | branding-helpers.ts | getRandomTagline, getBrand, brandAttack, brandClean +7 | 0 | api:0 nav:1 xmod:0 | direct:1 | storage, navigation | -- | `packages/bu-tpi/src/branding-helpers.ts` |

</details>

<details>
<summary>ci (4 surfaces; direct 4, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| github-action.ts | ci | readActionConfig, runGitHubAction, FailOnLevel, ActionReportFormat +2 | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, validation | -- | `packages/bu-tpi/src/ci/github-action.ts` |
| index.ts | ci | extractRules, findingsToSarifResults, generateSarifReport, generateJUnitReport | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/ci/index.ts` |
| junit-reporter.ts | ci | generateJUnitReport | 0 | api:0 nav:1 xmod:1 | direct:1 | validation, navigation | -- | `packages/bu-tpi/src/ci/junit-reporter.ts` |
| sarif-reporter.ts | ci | extractRules, findingsToSarifResults, generateSarifReport, SarifReport +5 | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, network | -- | `packages/bu-tpi/src/ci/sarif-reporter.ts` |

</details>

<details>
<summary>cli (2 surfaces; direct 1, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| formatters.ts | cli | formatText, formatJson, formatSarif, formatJunit +2 | 0 | api:0 nav:1 xmod:1 | direct:1 | validation, network, navigation | -- | `packages/bu-tpi/src/cli/formatters.ts` |
| tpi-scan.ts | cli | tpi-scan | 0 | api:0 nav:0 xmod:4 | none | storage, validation | direct unit or integration coverage | `packages/bu-tpi/src/cli/tpi-scan.ts` |

</details>

<details>
<summary>compliance (10 surfaces; direct 10, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| benchmark-bridge.ts | compliance | extractBenchmarkModules, createBenchmarkEvidence, verifyBenchmarkEvidence, benchmarkToEvidence +4 | 0 | api:0 nav:0 xmod:1 | direct:1 | validation | -- | `packages/bu-tpi/src/compliance/benchmark-bridge.ts` |
| delta-reporter.ts | compliance | createSnapshot, compareSnapshots, generateDeltaReport, detectCoverageChanges | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/compliance/delta-reporter.ts` |
| evidence-automation.ts | compliance | verifyModelIntegrity, verifyLineageCompleteness, assessBiasAcrossDimensions, verifySecurityGates +13 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/compliance/evidence-automation.ts` |
| frameworks.ts | compliance | frameworks | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, persistence | -- | `packages/bu-tpi/src/compliance/frameworks.ts` |
| nist-ai-rmf.ts | compliance | getMappingsByFunction, getModulesForControl, getFunctionCoverage, getCoveredControlIds +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/compliance/frameworks/nist-ai-rmf.ts` |
| index.ts | compliance | OWASP_LLM_TOP10, NIST_AI_600_1, MITRE_ATLAS, ISO_42001 +65 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/compliance/index.ts` |
| llm-test-capabilities.ts | compliance | detectSystemPromptLeakage, generateDoSTestVectors, validateDoSTestResult, createSelfPenTestConfig +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network, llm | -- | `packages/bu-tpi/src/compliance/llm-test-capabilities.ts` |
| mapper.ts | compliance | mapModuleToControls, mapFixturesToControls, calculateCoverage, getAllMappings | 0 | api:0 nav:0 xmod:0 | direct:3 | validation | -- | `packages/bu-tpi/src/compliance/mapper.ts` |
| report-generator.ts | compliance | generateFullReport, generateFrameworkReport, formatReportAsMarkdown, formatReportAsJSON +5 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/compliance/report-generator.ts` |
| types.ts | compliance | ComplianceFramework, ComplianceControl, ControlMapping, CoverageSnapshot +9 | 0 | api:0 nav:0 xmod:0 | direct:7 | -- | -- | `packages/bu-tpi/src/compliance/types.ts` |

</details>

<details>
<summary>defense (4 surfaces; direct 1, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | defense | DEFENSE_TEMPLATES, recommendDefenses | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/defense/index.ts` |
| recommender.ts | defense | recommendDefenses | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/defense/recommender.ts` |
| index.ts | defense | -- | 0 | api:0 nav:1 xmod:0 | none | storage, validation, persistence, network +2 | direct unit or integration coverage | `packages/bu-tpi/src/defense/templates/index.ts` |
| types.ts | defense | DefenseTemplate, DefenseRecommendation, PromptWeakness, HardenedPrompt | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/defense/types.ts` |

</details>

<details>
<summary>detection (3 surfaces; direct 3, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hybrid-pipeline.ts | detection | classifyConfidence, findingToDetectionResult, runHybridPipeline, filterByConfidence +1 | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/detection/hybrid-pipeline.ts` |
| index.ts | detection | CONFIDENCE_LEVELS, DEFAULT_HYBRID_CONFIG, classifyConfidence, findingToDetectionResult +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/detection/index.ts` |
| types.ts | detection | ConfidenceLevel, DetectionResult, HybridPipelineConfig, JudgeConfirmFn | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/detection/types.ts` |

</details>

<details>
<summary>edgefuzz (2 surfaces; direct 1, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| generators.ts | edgefuzz | generateLengthCases, generateEncodingCases, generateStructuralCases, generateLanguageCases +4 | 0 | api:0 nav:0 xmod:0 | none | llm | direct unit or integration coverage | `packages/bu-tpi/src/edgefuzz/generators.ts` |
| index.ts | edgefuzz | EDGE_CASE_TYPES, generateLengthCases, generateEncodingCases, generateStructuralCases +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/edgefuzz/index.ts` |

</details>

<details>
<summary>fingerprint (26 surfaces; direct 22, indirect 0, none 4)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| engine.ts | fingerprint | serializeResult, KagamiEngine | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/engine.ts` |
| features.ts | fingerprint | getFeatureDimensions, FeatureDimension | 0 | api:0 nav:0 xmod:0 | none | llm | direct unit or integration coverage | `packages/bu-tpi/src/fingerprint/features.ts` |
| index.ts | fingerprint | validateSignatures, loadKagamiSignatures, ProbeRunner, extractFeatureVector +11 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/fingerprint/index.ts` |
| probe-runner.ts | fingerprint | ProbeRunner | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probe-runner.ts` |
| api-metadata.ts | fingerprint | api-metadata | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/api-metadata.ts` |
| capability.ts | fingerprint | capability | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/capability.ts` |
| censorship.ts | fingerprint | censorship | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/censorship.ts` |
| context-window.ts | fingerprint | context-window | 0 | api:0 nav:0 xmod:0 | direct:1 | storage | -- | `packages/bu-tpi/src/fingerprint/probes/context-window.ts` |
| fine-tuning.ts | fingerprint | fine-tuning | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/fine-tuning.ts` |
| index.ts | fingerprint | SELF_DISCLOSURE_PROBES, CAPABILITY_PROBES, KNOWLEDGE_BOUNDARY_PROBES, SAFETY_BOUNDARY_PROBES +17 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/fingerprint/probes/index.ts` |
| knowledge-boundary.ts | fingerprint | knowledge-boundary | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/fingerprint/probes/knowledge-boundary.ts` |
| model-lineage.ts | fingerprint | model-lineage | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/model-lineage.ts` |
| multi-turn.ts | fingerprint | multi-turn | 0 | api:0 nav:0 xmod:0 | direct:1 | persistence | -- | `packages/bu-tpi/src/fingerprint/probes/multi-turn.ts` |
| multimodal.ts | fingerprint | multimodal | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/multimodal.ts` |
| parameter-sensitivity.ts | fingerprint | parameter-sensitivity | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/parameter-sensitivity.ts` |
| presets.ts | fingerprint | getProbesForPreset, getProbesForCategories | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/presets.ts` |
| quantization.ts | fingerprint | quantization | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/quantization.ts` |
| safety-boundary.ts | fingerprint | safety-boundary | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/safety-boundary.ts` |
| self-disclosure.ts | fingerprint | self-disclosure | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/fingerprint/probes/self-disclosure.ts` |
| style-analysis.ts | fingerprint | style-analysis | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/style-analysis.ts` |
| timing-latency.ts | fingerprint | timing-latency | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/timing-latency.ts` |
| tokenizer.ts | fingerprint | tokenizer | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/probes/tokenizer.ts` |
| watermark.ts | fingerprint | watermark | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/fingerprint/probes/watermark.ts` |
| response-analyzer.ts | fingerprint | extractFeatureVector | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/fingerprint/response-analyzer.ts` |
| signature-matcher.ts | fingerprint | weightedCosineDistance, matchSignatures, verifySignature, loadSignatures +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fingerprint/signature-matcher.ts` |
| types.ts | fingerprint | ProbeCategory, ProbeQuery, ResponseFeature, FeatureVector +9 | 0 | api:0 nav:0 xmod:0 | direct:4 | -- | -- | `packages/bu-tpi/src/fingerprint/types.ts` |

</details>

<details>
<summary>fuzzing (7 surfaces; direct 6, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| benchmark.ts | fuzzing | calculateMetrics, measureLatency, runBenchmark | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fuzzing/benchmark.ts` |
| comparison.ts | fuzzing | compareBenchmarks, formatComparison, isRegression | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fuzzing/comparison.ts` |
| fuzzer.ts | fuzzing | createFuzzSession, detectAnomaly, fuzz, getFuzzCoverage +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fuzzing/fuzzer.ts` |
| grammar.ts | fuzzing | createGrammar, generateInput, mutateInput, FuzzRNG +1 | 0 | api:0 nav:0 xmod:0 | direct:2 | admin | -- | `packages/bu-tpi/src/fuzzing/grammar.ts` |
| index.ts | fuzzing | DEFAULT_FUZZ_CONFIG, DEFAULT_BENCHMARK_CONFIG, createGrammar, generateInput +15 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/fuzzing/index.ts` |
| protocol-fuzzer.ts | fuzzing | ProtocolFuzzer, ProtocolType, ProtocolMutation, ProtocolFuzzConfig +3 | 0 | api:4 nav:0 xmod:1 | none | network | direct unit or integration coverage | `packages/bu-tpi/src/fuzzing/protocol-fuzzer.ts` |
| types.ts | fuzzing | GrammarRule, FuzzConfig, FuzzResult, AnomalyType +6 | 0 | api:0 nav:0 xmod:0 | direct:5 | -- | -- | `packages/bu-tpi/src/fuzzing/types.ts` |

</details>

<details>
<summary>generate-fixtures.ts (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| generate-fixtures.ts | generate-fixtures.ts | returns, T, TC, bypass_restrictions | 3 | api:0 nav:11 xmod:0 | none | storage, validation, persistence, network +3 | direct unit or integration coverage | `packages/bu-tpi/src/generate-fixtures.ts` |

</details>

<details>
<summary>kotoba (10 surfaces; direct 1, indirect 0, none 9)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| generator.ts | kotoba | generateVariants | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/generator.ts` |
| index.ts | kotoba | SCORE_CATEGORIES, MAX_INPUT_LENGTH, MIN_SCORE_A, MIN_SCORE_B +13 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/kotoba/index.ts` |
| boundary-rules.ts | kotoba | boundary-rules | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/boundary-rules.ts` |
| defense-rules.ts | kotoba | defense-rules | 0 | api:0 nav:0 xmod:0 | none | llm | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/defense-rules.ts` |
| index.ts | kotoba | getAllRules, getRulesByCategory, getRuleCount, BOUNDARY_RULES +4 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/index.ts` |
| output-rules.ts | kotoba | output-rules | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/output-rules.ts` |
| priority-rules.ts | kotoba | priority-rules | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/priority-rules.ts` |
| role-rules.ts | kotoba | role-rules | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/rules/role-rules.ts` |
| scorer.ts | kotoba | getLetterGrade, scorePrompt | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/scorer.ts` |
| types.ts | kotoba | ScoreCategory, LetterGrade, PromptAnalysis, PromptIssue +3 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/kotoba/types.ts` |

</details>

<details>
<summary>llm (19 surfaces; direct 16, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| config-loader.ts | llm | loadConfig, ProviderConfigEntry, LoadConfigOptions | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, llm | -- | `packages/bu-tpi/src/llm/config-loader.ts` |
| errors.ts | llm | isRetryableError, getRetryDelay, parseApiError, ProviderError +7 | 0 | api:0 nav:0 xmod:0 | direct:10 | -- | -- | `packages/bu-tpi/src/llm/errors.ts` |
| fetch-utils.ts | llm | sanitizeUrl, fetchWithTimeout, createTimeoutPromise, withTimeout +2 | 0 | api:0 nav:0 xmod:0 | direct:10 | validation, network | -- | `packages/bu-tpi/src/llm/fetch-utils.ts` |
| index.ts | llm | LLM_PROVIDERS, TEST_SCENARIOS, DEFAULT_SCORING_WEIGHTS, SecureString +58 | 0 | api:0 nav:0 xmod:0 | direct:4 | validation, llm | -- | `packages/bu-tpi/src/llm/index.ts` |
| ai21.ts | llm | AI21Provider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/llm/providers/ai21.ts` |
| anthropic.ts | llm | AnthropicProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | auth, validation, network, llm | -- | `packages/bu-tpi/src/llm/providers/anthropic.ts` |
| cloudflare.ts | llm | CloudflareProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/llm/providers/cloudflare.ts` |
| cohere.ts | llm | CohereProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/llm/providers/cohere.ts` |
| custom.ts | llm | CustomProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | auth, validation, network, llm | -- | `packages/bu-tpi/src/llm/providers/custom.ts` |
| google.ts | llm | GoogleProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/llm/providers/google.ts` |
| index.ts | llm | OpenAICompatibleProvider, createOpenAICompatibleProvider, registerOpenAICompatibleProviders, AnthropicProvider +16 | 0 | api:0 nav:0 xmod:0 | none | llm | direct unit or integration coverage | `packages/bu-tpi/src/llm/providers/index.ts` |
| openai-compatible-registry.ts | llm | createOpenAICompatibleProvider, registerOpenAICompatibleProviders | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/llm/providers/openai-compatible-registry.ts` |
| openai-compatible.ts | llm | OpenAICompatibleProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network, llm | -- | `packages/bu-tpi/src/llm/providers/openai-compatible.ts` |
| replicate.ts | llm | ReplicateProvider | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/llm/providers/replicate.ts` |
| sensei.ts | llm | detectCapability, buildSenseiSystemMessage, SenseiProvider | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, network, llm | -- | `packages/bu-tpi/src/llm/providers/sensei.ts` |
| registry.ts | llm | registerProvider, unregisterProvider, getProviderAdapter, listProviders +7 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/llm/registry.ts` |
| security.ts | llm | validateProviderUrl, resolveAndValidateUrl, sanitizeCredentials, validateJsonPath +2 | 0 | api:0 nav:0 xmod:0 | direct:3 | auth, validation, network, llm | -- | `packages/bu-tpi/src/llm/security.ts` |
| test-helpers.ts | llm | createMockResponse, createMockProvider, providerTestContract, setupLLMTestGuard +5 | 0 | api:0 nav:0 xmod:0 | none | validation, network, llm | direct unit or integration coverage | `packages/bu-tpi/src/llm/test-helpers.ts` |
| types.ts | llm | SecureString, LLMProvider, LLMProviderStatus, AuthType +24 | 0 | api:0 nav:0 xmod:0 | direct:7 | validation, llm | -- | `packages/bu-tpi/src/llm/types.ts` |

</details>

<details>
<summary>metadata-parsers.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| metadata-parsers.ts | metadata-parsers.ts | detectFormat, parseJPEGMetadata, parsePNGMetadata, parseWebPMetadata +11 | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, network, navigation | -- | `packages/bu-tpi/src/metadata-parsers.ts` |

</details>

<details>
<summary>modules (40 surfaces; direct 39, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agentic-detector.ts | modules | agentic-detector | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/modules/agentic-detector.ts` |
| audio-scanner.ts | modules | validateAudioFormat | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/modules/audio-scanner.ts` |
| bias-detector.ts | modules | detectBiasPatterns, biasDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/bias-detector.ts` |
| data-provenance.ts | modules | data-provenance | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/data-provenance.ts` |
| deepfake-detector.ts | modules | computeDeepfakeConfidence | 0 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/bu-tpi/src/modules/deepfake-detector.ts` |
| document-office.ts | modules | documentOfficeModule | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/document-office.ts` |
| document-pdf.ts | modules | document-pdf | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/modules/document-pdf.ts` |
| dos-detector.ts | modules | detectResourceExhaustion, dosDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/dos-detector.ts` |
| edgefuzz-detector.ts | modules | edgefuzz-detector | 0 | api:0 nav:1 xmod:1 | direct:1 | llm, navigation | -- | `packages/bu-tpi/src/modules/edgefuzz-detector.ts` |
| email-webfetch.ts | modules | emailWebfetchModule | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/email-webfetch.ts` |
| encoding-engine.ts | modules | detectMultiLayerEncoding, detectRot13, detectObfuscatedSemanticPayloads, encodingEngineModule | 0 | api:0 nav:1 xmod:1 | direct:1 | storage, validation, llm, navigation | -- | `packages/bu-tpi/src/modules/encoding-engine.ts` |
| enhanced-pi.ts | modules | detectInstructionBoundaryViolation, detectRoleConfusion, detectContextManipulation, detectSemanticAttackChains +1 | 0 | api:0 nav:7 xmod:1 | direct:1 | storage, validation, persistence, llm +1 | -- | `packages/bu-tpi/src/modules/enhanced-pi.ts` |
| env-detector.ts | modules | detectEnvManipulation, envDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/modules/env-detector.ts` |
| image-scanner.ts | modules | validateImageFormat, sanitizeSVG | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/modules/image-scanner.ts` |
| index.ts | modules | ScannerRegistry, scannerRegistry, mcpParserModule, documentPdfModule +35 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/modules/index.ts` |
| mcp-parser.ts | modules | detectMcpJsonRpc, detectMcpPathTraversal, detectMcpSamplingDepth, detectMcpNotificationFlood +2 | 0 | api:0 nav:3 xmod:1 | direct:1 | storage, validation, persistence, llm +1 | -- | `packages/bu-tpi/src/modules/mcp-parser.ts` |
| model-theft-detector.ts | modules | detectModelTheft, modelTheftDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/modules/model-theft-detector.ts` |
| output-detector.ts | modules | output-detector | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, validation, persistence, llm | -- | `packages/bu-tpi/src/modules/output-detector.ts` |
| overreliance-detector.ts | modules | detectAuthorityExploit, overrelianceDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/modules/overreliance-detector.ts` |
| pii-detector.ts | modules | configurePII, getPIIConfig, redactPII, detectPIIExposure +1 | 0 | api:0 nav:0 xmod:1 | direct:2 | validation | -- | `packages/bu-tpi/src/modules/pii-detector.ts` |
| rag-analyzer.ts | modules | detectRagBoundaryViolation, ragAnalyzerModule | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/modules/rag-analyzer.ts` |
| rag-enhanced.ts | modules | rag-enhanced | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/rag-enhanced.ts` |
| registry.ts | modules | ScannerRegistry | 0 | api:0 nav:0 xmod:1 | direct:25 | -- | -- | `packages/bu-tpi/src/modules/registry.ts` |
| session-bypass.ts | modules | detectSessionManipulation | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, persistence, llm | -- | `packages/bu-tpi/src/modules/session-bypass.ts` |
| shingan-context.ts | modules | shingan-context | 0 | api:0 nav:0 xmod:1 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/modules/shingan-context.ts` |
| shingan-exfiltration.ts | modules | shingan-exfiltration | 0 | api:0 nav:0 xmod:1 | direct:2 | storage, network | -- | `packages/bu-tpi/src/modules/shingan-exfiltration.ts` |
| shingan-metadata.ts | modules | shingan-metadata | 0 | api:0 nav:0 xmod:1 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/modules/shingan-metadata.ts` |
| shingan-payloads.ts | modules | shingan-payloads | 0 | api:0 nav:1 xmod:1 | direct:2 | validation, navigation | -- | `packages/bu-tpi/src/modules/shingan-payloads.ts` |
| shingan-scanner.ts | modules | shinganModule, ALL_SHINGAN_PATTERNS, LAYERS | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/modules/shingan-scanner.ts` |
| shingan-social.ts | modules | shingan-social | 0 | api:0 nav:0 xmod:1 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/modules/shingan-social.ts` |
| shingan-supply-chain.ts | modules | shingan-supply-chain | 0 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/bu-tpi/src/modules/shingan-supply-chain.ts` |
| shingan-trust.ts | modules | computeTrustScore, batchTrustScore, RiskLevel, SkillTrustScore | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/bu-tpi/src/modules/shingan-trust.ts` |
| skill-parser.ts | modules | detectFormat, parseSkill, SkillFormat, SkillMetadata +2 | 0 | api:0 nav:0 xmod:1 | direct:2 | validation | -- | `packages/bu-tpi/src/modules/skill-parser.ts` |
| social-engineering-detector.ts | modules | social-engineering-detector | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/modules/social-engineering-detector.ts` |
| ssrf-detector.ts | modules | detectSsrfUrls, ssrfDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | network | -- | `packages/bu-tpi/src/modules/ssrf-detector.ts` |
| supply-chain-detector.ts | modules | detectSupplyChainRisk, supplyChainDetectorModule | 0 | api:0 nav:0 xmod:1 | direct:1 | storage | -- | `packages/bu-tpi/src/modules/supply-chain-detector.ts` |
| token-analyzer.ts | modules | detectSpecialTokenInjection, detectTokenBoundaryAttack, detectJwtTokenAttack, detectStandaloneTokenLeakage +2 | 0 | api:0 nav:1 xmod:1 | direct:1 | llm, navigation | -- | `packages/bu-tpi/src/modules/token-analyzer.ts` |
| vectordb-interface.ts | modules | detectVecMetadataInjection, detectVecAdministrativeAbuse, vectordbInterfaceModule | 0 | api:0 nav:0 xmod:1 | direct:1 | storage | -- | `packages/bu-tpi/src/modules/vectordb-interface.ts` |
| webmcp-detector.ts | modules | detectWebMCPPatterns | 0 | api:0 nav:3 xmod:1 | direct:1 | persistence, network, llm, navigation | -- | `packages/bu-tpi/src/modules/webmcp-detector.ts` |
| xxe-protopollution.ts | modules | detectXxeInContext, xxeProtoPollutionModule | 0 | api:0 nav:0 xmod:1 | direct:1 | persistence, llm | -- | `packages/bu-tpi/src/modules/xxe-protopollution.ts` |

</details>

<details>
<summary>plugins (4 surfaces; direct 4, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | plugins | PLUGIN_TYPES, PLUGIN_STATES, MAX_PLUGINS, validateManifest +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/plugins/index.ts` |
| loader.ts | plugins | validateManifest, PluginRegistry | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/plugins/loader.ts` |
| types.ts | plugins | PluginType, PluginState, PluginManifest, PluginLifecycle +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/plugins/types.ts` |
| validator.ts | plugins | validatePluginSecurity, validatePluginDependencies | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/plugins/validator.ts` |

</details>

<details>
<summary>rag (8 surfaces; direct 5, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| context-assembler.ts | rag | injectAtContextBoundary, overflowContext, createConflictingContext, ContextBoundaryInjection +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/rag/context-assembler.ts` |
| embedding-attacker.ts | rag | perturbEmbedding, generateSimilarityGamingPayload, PerturbationStrategy, PerturbationResult +1 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/rag/embedding-attacker.ts` |
| index.ts | rag | RAG_STAGES, RAG_ATTACK_VECTORS, DEFAULT_PIPELINE_CONFIG, MAX_DOCUMENTS +24 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/rag/index.ts` |
| knowledge-conflict.ts | rag | createConflictingFact, createTemporalOverride, createAuthorityImpersonation, ConflictingFact +2 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/rag/knowledge-conflict.ts` |
| live-pipeline.ts | rag | buildRagPrompt, runGenerationStage, detectPoisonInfluence, runPoisoningTest +4 | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/rag/live-pipeline.ts` |
| pipeline-simulator.ts | rag | chunkDocument, simulateEmbedding, cosineSimilarity, simulateRetrieval +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/rag/pipeline-simulator.ts` |
| retrieval-poisoner.ts | rag | createPoisonedDocument, generateRankManipulationPayload, InjectionPosition, PoisonedDocument +1 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/rag/retrieval-poisoner.ts` |
| types.ts | rag | RagStage, RagAttackVector, RagDocument, RagChunk +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/rag/types.ts` |

</details>

<details>
<summary>sage (11 surfaces; direct 9, indirect 0, none 2)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| content-safety.ts | sage | checkContentSafety, calculateHarmScore, sanitizeOutput | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/sage/content-safety.ts` |
| edgefuzz-mutations.ts | sage | lengthExtreme, encodingWrapMulti, structuralNest, scriptMix +3 | 0 | api:0 nav:0 xmod:0 | none | storage | direct unit or integration coverage | `packages/bu-tpi/src/sage/edgefuzz-mutations.ts` |
| embeddings-explorer.ts | sage | buildVocabulary, generateEmbedding, generateEmbeddings, cosineSimilarity +7 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/sage/embeddings-explorer.ts` |
| genetic-core.ts | sage | createPopulation, evaluateFitness, crossover, mutate +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/sage/genetic-core.ts` |
| index.ts | sage | MUTATION_OPERATORS, DEFAULT_RESOURCE_LIMITS, DEFAULT_POPULATION_CONFIG, DEFAULT_CONTENT_SAFETY +51 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/sage/index.ts` |
| mutation-engine.ts | sage | characterSubstitution, encodingWrapping, instructionParaphrasing, structuralRearrangement +7 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/sage/mutation-engine.ts` |
| quarantine.ts | sage | quarantineVariant, getQuarantinedVariants, approveVariant, rejectVariant +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, persistence | -- | `packages/bu-tpi/src/sage/quarantine.ts` |
| reasoning-lab.ts | sage | createReasoningChain, applyChainInjection, applyStepManipulation, applyConclusionPoisoning +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/sage/reasoning-lab.ts` |
| seed-library.ts | sage | extractSeeds, extractPrimitives, categorizeSeeds, getSeedStats | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/sage/seed-library.ts` |
| types.ts | sage | MutationOperator, SeedEntry, SeedStats, MutationResult +12 | 0 | api:0 nav:0 xmod:0 | direct:8 | -- | -- | `packages/bu-tpi/src/sage/types.ts` |
| webmcp-mutations.ts | sage | applyWebMCPMutation, applyRandomWebMCPMutation, composeWithCoreMutation, WebMCPMutationOperator +1 | 0 | api:0 nav:1 xmod:0 | none | validation, navigation | direct unit or integration coverage | `packages/bu-tpi/src/sage/webmcp-mutations.ts` |

</details>

<details>
<summary>scanner-binary.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scanner-binary.ts | scanner-binary.ts | scanBinary, scanBinaryRaw, formatBinaryResult, formatMetadataFields +3 | 0 | api:0 nav:0 xmod:3 | direct:1 | validation | -- | `packages/bu-tpi/src/scanner-binary.ts` |

</details>

<details>
<summary>scanner.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scanner.ts | scanner.ts | normalizeText, checkForInjectionKeywords, checkForEncodedPartials, detectHiddenUnicode +28 | 0 | api:0 nav:2 xmod:2 | direct:5 | storage, validation, persistence, network +2 | -- | `packages/bu-tpi/src/scanner.ts` |

</details>

<details>
<summary>sengoku (6 surfaces; direct 2, indirect 0, none 4)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| finding-tracker.ts | sengoku | hashFinding, deduplicateFindings, compareRuns, detectRegressions | 0 | api:0 nav:0 xmod:0 | none | persistence | direct unit or integration coverage | `packages/bu-tpi/src/sengoku/finding-tracker.ts` |
| index.ts | sengoku | MAX_CONCURRENT_CAMPAIGNS, MAX_RATE_RPS, DEFAULT_RATE_RPS, MAX_PAYLOAD_LENGTH +14 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/sengoku/index.ts` |
| reporter.ts | sengoku | generateReport, formatReportMarkdown, formatReportJSON | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/sengoku/reporter.ts` |
| scheduler.ts | sengoku | CampaignScheduler | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/sengoku/scheduler.ts` |
| target-connector.ts | sengoku | validateTargetUrl, healthCheck, sendRequest, resetRateLimiter +2 | 0 | api:0 nav:0 xmod:0 | none | auth, validation, network | direct unit or integration coverage | `packages/bu-tpi/src/sengoku/target-connector.ts` |
| types.ts | sengoku | Frequency, AuthType, Severity, CampaignState +9 | 0 | api:0 nav:0 xmod:0 | direct:1 | persistence | -- | `packages/bu-tpi/src/sengoku/types.ts` |

</details>

<details>
<summary>sensei (13 surfaces; direct 12, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| api-service.ts | sensei | validateRouting, validateGenerateRequest, validateMutateRequest, validateJudgeRequest +6 | 0 | api:0 nav:0 xmod:2 | direct:1 | validation, network, llm | -- | `packages/bu-tpi/src/sensei/api-service.ts` |
| api-types.ts | sensei | RoutingMode, ProviderRouting, SenseiGenerateRequest, SenseiMutateRequest +4 | 0 | api:0 nav:0 xmod:2 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/sensei/api-types.ts` |
| attack-generator.ts | sensei | buildGenerationPrompt, parseGeneratedAttacks, generateAttacks, createDefaultRequest +3 | 0 | api:0 nav:0 xmod:1 | direct:3 | validation, llm | -- | `packages/bu-tpi/src/sensei/attack-generator.ts` |
| data-curator.ts | sensei | hashContent, jaccardSimilarity, filterByQuality, filterByLength +7 | 0 | api:0 nav:0 xmod:0 | direct:2 | llm | -- | `packages/bu-tpi/src/sensei/data-curator.ts` |
| data-pipeline.ts | sensei | generateSampleId, truncateContent, assessQuality, extractFromSageSeeds +7 | 0 | api:0 nav:0 xmod:5 | direct:2 | llm | -- | `packages/bu-tpi/src/sensei/data-pipeline.ts` |
| format-converter.ts | sensei | estimateTokenCount, buildSystemMessage, sampleToChatEntry, sampleToAlpacaEntry +5 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/sensei/format-converter.ts` |
| index.ts | sensei | SENSEI_CAPABILITIES, DATA_SOURCE_TYPES, SAMPLE_QUALITY_GRADES, FORMAT_TYPES +71 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/sensei/index.ts` |
| judge.ts | sensei | parseScore, parseConfidence, parseVerdict, parseJudgeResponse +4 | 0 | api:0 nav:0 xmod:1 | direct:3 | validation, llm | -- | `packages/bu-tpi/src/sensei/judge.ts` |
| mutation-advisor.ts | sensei | buildMutationPrompt, parseMutationResponse, adviseMutations, MutationSuggestion +1 | 0 | api:0 nav:0 xmod:1 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/sensei/mutation-advisor.ts` |
| plan-generator.ts | sensei | parsePlanResponse, generatePlan, isValidAttackType, PlanGenerationRequest +1 | 0 | api:0 nav:0 xmod:2 | direct:2 | validation, llm | -- | `packages/bu-tpi/src/sensei/plan-generator.ts` |
| probe-executor.ts | sensei | probe, runProbeCampaign, formatProbeCampaignReport, ProbeResult +2 | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/bu-tpi/src/sensei/probe-executor.ts` |
| sanitize.ts | sensei | sanitizeForPrompt, sanitizeLabel | 0 | api:0 nav:0 xmod:0 | none | validation, llm | direct unit or integration coverage | `packages/bu-tpi/src/sensei/sanitize.ts` |
| types.ts | sensei | SenseiCapability, SampleQualityGrade, DataSourceType, SenseiTrainingSample +11 | 0 | api:0 nav:0 xmod:0 | direct:1 | network, llm | -- | `packages/bu-tpi/src/sensei/types.ts` |

</details>

<details>
<summary>serve.ts (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| serve.ts | serve.ts | serve | 0 | api:6 nav:2 xmod:3 | none | storage, validation, network, navigation | direct unit or integration coverage | `packages/bu-tpi/src/serve.ts` |

</details>

<details>
<summary>shingan (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | shingan | scanSkill, type SkillFormat, type SkillMetadata, type SkillSection +16 | 0 | api:0 nav:0 xmod:11 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/shingan/index.ts` |

</details>

<details>
<summary>supplychain (4 surfaces; direct 2, indirect 0, none 2)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dependency-auditor.ts | supplychain | parseRequirementsTxt, parsePackageJson, parsePyprojectToml, checkVulnerabilities +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/bu-tpi/src/supplychain/dependency-auditor.ts` |
| index.ts | supplychain | verifyModelHash, analyzeModelCard, parseRequirementsTxt, parsePackageJson +3 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/supplychain/index.ts` |
| types.ts | supplychain | ModelCardAnalysis, ModelVerificationResult, ParsedDependency, DependencyVulnerability +3 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/supplychain/types.ts` |
| verifier.ts | supplychain | verifyModelHash, analyzeModelCard | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/supplychain/verifier.ts` |

</details>

<details>
<summary>test (3 surfaces; direct 0, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fixtures.ts | test | createFinding, createScanResult, createBlockedResult, createJPEGBuffer +6 | 0 | api:0 nav:0 xmod:1 | none | llm | direct unit or integration coverage | `packages/bu-tpi/src/test/fixtures.ts` |
| index.ts | test | -- | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/test/index.ts` |
| utils.ts | test | getFixturesDir, getFixturePath, readTextFixture, readBinaryFixture +13 | 0 | api:0 nav:2 xmod:1 | none | storage, navigation | direct unit or integration coverage | `packages/bu-tpi/src/test/utils.ts` |

</details>

<details>
<summary>threatfeed (8 surfaces; direct 7, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auto-fixture.ts | threatfeed | generateFixtureFromThreat, approveFixture, rejectFixture, promoteFixture +10 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/threatfeed/auto-fixture.ts` |
| classifier.ts | threatfeed | classifyThreat, extractIndicators, assessConfidence, assessSeverity | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, persistence, llm | -- | `packages/bu-tpi/src/threatfeed/classifier.ts` |
| content-sanitizer.ts | threatfeed | stripXMLEntities, stripScriptTags, stripControlCharacters, normalizeWhitespace +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/threatfeed/content-sanitizer.ts` |
| deduplicator.ts | threatfeed | createDeduplicator, isDuplicate, addEntry, getDeduplicatorStats +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/threatfeed/deduplicator.ts` |
| index.ts | threatfeed | DEFAULT_SOURCE_CONFIG, DEFAULT_URL_ALLOWLIST, isInternalIP, validateSourceURL +35 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/threatfeed/index.ts` |
| source-pipeline.ts | threatfeed | createPipeline, addSource, removeSource, parseRSS +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/threatfeed/source-pipeline.ts` |
| types.ts | threatfeed | SourceType, IndicatorType, ThreatSource, ThreatEntry +7 | 0 | api:0 nav:0 xmod:0 | direct:6 | validation | -- | `packages/bu-tpi/src/threatfeed/types.ts` |
| url-validator.ts | threatfeed | isInternalIP, validateSourceURL | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, network | -- | `packages/bu-tpi/src/threatfeed/url-validator.ts` |

</details>

<details>
<summary>timechamber (17 surfaces; direct 14, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adaptive-probe.ts | timechamber | analyzeResponse, selectStrategy, rewriteTurn, defaultAdaptTurn +7 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/timechamber/adaptive-probe.ts` |
| accumulation.ts | timechamber | accumulation | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/timechamber/attacks/accumulation.ts` |
| context-overflow.ts | timechamber | context-overflow | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/timechamber/attacks/context-overflow.ts` |
| delayed-activation.ts | timechamber | delayed-activation | 0 | api:0 nav:0 xmod:0 | direct:1 | llm | -- | `packages/bu-tpi/src/timechamber/attacks/delayed-activation.ts` |
| index.ts | timechamber | getAllPlans, getPlansByType, getPlanCount, ACCUMULATION_PLANS +4 | 0 | api:0 nav:0 xmod:0 | none | persistence | direct unit or integration coverage | `packages/bu-tpi/src/timechamber/attacks/index.ts` |
| persona-drift.ts | timechamber | persona-drift | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/timechamber/attacks/persona-drift.ts` |
| session-persistence.ts | timechamber | session-persistence | 0 | api:0 nav:0 xmod:0 | direct:1 | persistence, llm | -- | `packages/bu-tpi/src/timechamber/attacks/session-persistence.ts` |
| index.ts | timechamber | TEMPORAL_ATTACK_TYPES, MAX_TURNS, DEFAULT_TURNS, DEFAULT_RATE_LIMIT +19 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation, persistence | -- | `packages/bu-tpi/src/timechamber/index.ts` |
| crescendo.ts | timechamber | getStageForTurn, CrescendoOrchestrator, EscalationStage | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/timechamber/orchestrators/crescendo.ts` |
| index.ts | timechamber | createOrchestrator, ORCHESTRATOR_TYPES, DEFAULT_ORCHESTRATOR_CONFIG, MAX_ORCHESTRATOR_TURNS +11 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/timechamber/orchestrators/index.ts` |
| mad-max.ts | timechamber | MADMAXOrchestrator, AttackCluster, ClusterDiversityMetrics | 0 | api:0 nav:0 xmod:0 | none | validation, llm | direct unit or integration coverage | `packages/bu-tpi/src/timechamber/orchestrators/mad-max.ts` |
| pair.ts | timechamber | PAIROrchestrator | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/timechamber/orchestrators/pair.ts` |
| sensei-adaptive.ts | timechamber | selectStrategy, SenseiAdaptiveOrchestrator, AttackStrategy | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/timechamber/orchestrators/sensei-adaptive.ts` |
| tap.ts | timechamber | TAPOrchestrator | 0 | api:0 nav:0 xmod:0 | direct:1 | validation, llm | -- | `packages/bu-tpi/src/timechamber/orchestrators/tap.ts` |
| types.ts | timechamber | OrchestratorType, OrchestratorConfig, OrchestratorTurn, BranchState +5 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/timechamber/orchestrators/types.ts` |
| simulator.ts | timechamber | sanitizeConversationContent, TimeChamberSimulator | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/timechamber/simulator.ts` |
| types.ts | timechamber | TemporalAttackType, Turn, ConversationPlan, ExecutedTurn +2 | 0 | api:0 nav:0 xmod:0 | direct:2 | persistence | -- | `packages/bu-tpi/src/timechamber/types.ts` |

</details>

<details>
<summary>transfer (4 surfaces; direct 3, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | transfer | TransferTestRunner, generateTransferReport, formatReportMarkdown, formatReportJSON +1 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/transfer/index.ts` |
| reporter.ts | transfer | generateTransferReport, formatReportMarkdown, formatReportJSON, formatReportCSV | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transfer/reporter.ts` |
| runner.ts | transfer | TransferTestRunner | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transfer/runner.ts` |
| types.ts | transfer | TransferTestConfig, TransferResult, TransferMatrix, TransferSummary +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transfer/types.ts` |

</details>

<details>
<summary>transforms (3 surfaces; direct 3, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| buffs.ts | transforms | applyBuff, applyBuffChain, createChain | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transforms/buffs.ts` |
| index.ts | transforms | BUFF_TYPES, base64Buff, leetSpeakBuff, unicodeSubBuff +12 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transforms/index.ts` |
| types.ts | transforms | BuffType, Buff, BuffChain, BuffResult | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/transforms/types.ts` |

</details>

<details>
<summary>types.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| types.ts | types.ts | Severity, Verdict, Finding, ScanResult +18 | 0 | api:0 nav:0 xmod:0 | direct:36 | -- | -- | `packages/bu-tpi/src/types.ts` |

</details>

<details>
<summary>validation (55 surfaces; direct 54, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| calibration-protocol.ts | validation | calibrateModule, calibrateAll, signCertificate, verifyCertificate +8 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/calibration/calibration-protocol.ts` |
| reference-sets.ts | validation | selectReferenceSets, buildReferenceSetManifest, buildSignedReferenceManifest, verifyReferenceManifest +4 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/validation/calibration/reference-sets.ts` |
| ci-config.ts | validation | detectChangedModules, buildCIValidationCommand, parseCIExitCode, CIExitCode +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/ci/ci-config.ts` |
| katana-cli.ts | validation | parseArgs, formatHelp, runCLI, ParsedArgs +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/cli/katana-cli.ts` |
| config.ts | validation | config | 0 | api:0 nav:0 xmod:0 | direct:6 | -- | -- | `packages/bu-tpi/src/validation/config.ts` |
| corpus-expander.ts | validation | expandCorpus, expandCorpusWithContent, computeExpansionTargets, ExpansionStats +2 | 0 | api:0 nav:10 xmod:0 | direct:1 | sse, validation, persistence, network +3 | -- | `packages/bu-tpi/src/validation/corpus/corpus-expander.ts` |
| fixture-labeler.ts | validation | detectContentType, assignDifficulty, resolveFixtureExpectations, labelFixtures +3 | 0 | api:0 nav:0 xmod:0 | direct:2 | storage, validation, persistence, llm | -- | `packages/bu-tpi/src/validation/corpus/fixture-labeler.ts` |
| gap-analysis.ts | validation | analyzeGaps, formatGapSummary, ModuleCoverage, GapAnalysisReport | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/validation/corpus/gap-analysis.ts` |
| holdout-separator.ts | validation | separateHoldout, buildHoldoutManifest, buildSignedHoldoutManifest, buildSignedDevelopmentManifest +3 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/corpus/holdout-separator.ts` |
| binary-variations.ts | validation | binary-variations | 0 | api:0 nav:1 xmod:0 | direct:2 | network, navigation | -- | `packages/bu-tpi/src/validation/generators/binary-variations.ts` |
| boundary-variations.ts | validation | boundary-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | network, llm | -- | `packages/bu-tpi/src/validation/generators/boundary-variations.ts` |
| combination-variations.ts | validation | combination-variations | 0 | api:0 nav:1 xmod:0 | direct:2 | validation, navigation | -- | `packages/bu-tpi/src/validation/generators/combination-variations.ts` |
| corpus-generation-pipeline.ts | validation | validateGeneratedSample, generateCorpus, generateCorpusWithContent, formatGenerationSummary +4 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/validation/generators/corpus-generation-pipeline.ts` |
| default-generators.ts | validation | registerDefaultVariationGenerators | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/validation/generators/default-generators.ts` |
| encoding-variations.ts | validation | encoding-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/validation/generators/encoding-variations.ts` |
| generator-registry.ts | validation | SeededRNG, GeneratorRegistry, VariationGenerator, GeneratedSampleOutput | 0 | api:0 nav:0 xmod:0 | direct:29 | validation | -- | `packages/bu-tpi/src/validation/generators/generator-registry.ts` |
| indirect-injection-variations.ts | validation | indirect-injection-variations | 0 | api:4 nav:0 xmod:0 | direct:2 | storage, network | -- | `packages/bu-tpi/src/validation/generators/indirect-injection-variations.ts` |
| multi-turn-variations.ts | validation | multi-turn-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/multi-turn-variations.ts` |
| multilingual-variations.ts | validation | multilingual-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/multilingual-variations.ts` |
| paraphrase-variations.ts | validation | paraphrase-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/paraphrase-variations.ts` |
| semantic-evasion-variations.ts | validation | semantic-evasion-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/semantic-evasion-variations.ts` |
| stress-variations.ts | validation | previewStressVariations, StressVariationPreview | 0 | api:0 nav:0 xmod:3 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/stress-variations.ts` |
| structural-variations.ts | validation | structural-variations | 0 | api:0 nav:3 xmod:0 | direct:2 | validation, navigation | -- | `packages/bu-tpi/src/validation/generators/structural-variations.ts` |
| unicode-variations.ts | validation | unicode-variations | 0 | api:0 nav:0 xmod:0 | direct:2 | -- | -- | `packages/bu-tpi/src/validation/generators/unicode-variations.ts` |
| access-control.ts | validation | buildAccessControlModel, checkSoDViolations, validateRoleSoD, getEffectivePermissions +8 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/governance/access-control.ts` |
| document-register.ts | validation | buildDocumentRegister, getDocumentById, getDocumentsByCategory, getDocumentsByClause +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/governance/document-register.ts` |
| threat-model.ts | validation | buildThreatModel, computeThreatCoverage, exportThreatModelMarkdown, ThreatActor +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/governance/threat-model.ts` |
| index.ts | validation | SCHEMA_VERSION, ValidationVerdict, SampleContentType, SampleDifficulty +266 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/validation/index.ts` |
| certificate-signer.ts | validation | generateSigningKeyPair, isSigningKeyAvailable, isVerifyKeyAvailable, signData +5 | 0 | api:0 nav:0 xmod:0 | direct:3 | -- | -- | `packages/bu-tpi/src/validation/integrity/certificate-signer.ts` |
| dependency-integrity.ts | validation | hashLockfile, verifyLockfileExists, checkPinnedDependencies, runAudit +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/bu-tpi/src/validation/integrity/dependency-integrity.ts` |
| hmac-signer.ts | validation | signHmac, verifyHmac, hashContent, hashFile +3 | 0 | api:0 nav:0 xmod:0 | direct:4 | -- | -- | `packages/bu-tpi/src/validation/integrity/hmac-signer.ts` |
| merkle-tree.ts | validation | buildMerkleTree, generateMerkleProof, verifyMerkleProof, signMerkleRoot +6 | 0 | api:0 nav:0 xmod:0 | direct:2 | validation | -- | `packages/bu-tpi/src/validation/integrity/merkle-tree.ts` |
| capa-integration.ts | validation | openCAPA, updateCAPAStatus, addRootCauseAnalysis, addCorrectiveActionPlan +15 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/investigation/capa-integration.ts` |
| ground-truth-challenge.ts | validation | identifyChallengeCandidates, createChallenge, openChallenge, resolveChallenge +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/investigation/ground-truth-challenge.ts` |
| investigation-protocol.ts | validation | openInvestigation, updateInvestigation, reopenInvestigation, closeInvestigation +11 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/investigation/investigation-protocol.ts` |
| corpus-label-audit.ts | validation | selectAuditSample, createAuditSession, computeAuditResult, createReviewVerdict +7 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/meta-validation/corpus-label-audit.ts` |
| framework-red-team.ts | validation | testGroundTruthPoisoning, testRNGSeedPrediction, testCertificateForgery, testCorpusTampering +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/meta-validation/framework-red-team.ts` |
| dashboard-export.ts | validation | extractTimeSeriesFromRuns, computeTrends, buildDashboardData, exportDashboardCSV +5 | 0 | api:0 nav:1 xmod:0 | direct:1 | validation, navigation | -- | `packages/bu-tpi/src/validation/reports/dashboard-export.ts` |
| validation-report.ts | validation | generateReport, exportReportJSON, exportReportMarkdown, exportReportCSV +3 | 0 | api:0 nav:1 xmod:0 | direct:1 | validation, navigation | -- | `packages/bu-tpi/src/validation/reports/validation-report.ts` |
| boundary-testing.ts | validation | runBoundaryTest, runAllBoundaryTests, formatBoundaryReport, ExpectedBehavior +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/boundary-testing.ts` |
| checkpoint-manager.ts | validation | saveCheckpoint, loadCheckpoint, deleteCheckpoint, shouldCheckpoint +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation | -- | `packages/bu-tpi/src/validation/runner/checkpoint-manager.ts` |
| confusion-matrix.ts | validation | buildConfusionMatrix, buildAllConfusionMatrices | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/confusion-matrix.ts` |
| decision-rules.ts | validation | extractNonConformities, applyDecisionRule, applyAllDecisionRules, computeOverallVerdict +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/decision-rules.ts` |
| environment-snapshot.ts | validation | captureEnvironmentSnapshot, hashEnvironment | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/environment-snapshot.ts` |
| metrics-calculator.ts | validation | calculateMetrics, calculateAllMetrics | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/metrics-calculator.ts` |
| non-deterministic-tolerance.ts | validation | runToleranceStudy, runAllToleranceStudies, extractRepeatabilityToleranceBand, ToleranceOptions +2 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/non-deterministic-tolerance.ts` |
| performance-baseline.ts | validation | computePercentile, measureModulePerformance, buildPerformanceBaseline, compareBaselines +6 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/validation/runner/performance-baseline.ts` |
| repeatability-runner.ts | validation | runRepeatability, runAllRepeatability, allRepeatabilityPassed, RepeatabilityOptions +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/repeatability-runner.ts` |
| reproducibility-runner.ts | validation | analyzeReproducibility, analyzeAllReproducibility, allReproducibilityPassed, generateDockerfile +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/reproducibility-runner.ts` |
| sensitivity-analysis.ts | validation | generateGraduatedInput, analyzeSensitivity, analyzeAllSensitivity, formatSensitivityReport +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/bu-tpi/src/validation/runner/sensitivity-analysis.ts` |
| traceability-chain.ts | validation | buildTraceabilityChain, buildTraceabilityChains, verifyTraceabilityChain, hashModuleSource +4 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/traceability-chain.ts` |
| uncertainty-estimator.ts | validation | wilsonCI, clopperPearsonCI, computeUncertainty, computeUncertaintyBudget +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/uncertainty-estimator.ts` |
| validation-abstraction.ts | validation | matchesModuleFinding, detectEntryPoint, validateSample, toValidationSample +3 | 0 | api:0 nav:0 xmod:2 | direct:1 | storage, validation | -- | `packages/bu-tpi/src/validation/runner/validation-abstraction.ts` |
| validation-runner.ts | validation | runValidation, RunOptions, RunProgress, InputSample | 0 | api:0 nav:0 xmod:0 | direct:1 | validation | -- | `packages/bu-tpi/src/validation/runner/validation-runner.ts` |
| types.ts | validation | ValidationVerdict, SampleContentType, SampleDifficulty, SampleSourceType +30 | 0 | api:0 nav:0 xmod:0 | direct:58 | validation | -- | `packages/bu-tpi/src/validation/types.ts` |

</details>

<details>
<summary>webmcp (2 surfaces; direct 0, indirect 0, none 2)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | webmcp | validateSSEStream, validateSSEContentType, validateWebSocketSecurity, signMCPMessage +3 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bu-tpi/src/webmcp/index.ts` |
| transport-security.ts | webmcp | validateSSEStream, validateSSEContentType, validateWebSocketSecurity, signMCPMessage +11 | 0 | api:0 nav:0 xmod:0 | none | sse, validation, network | direct unit or integration coverage | `packages/bu-tpi/src/webmcp/transport-security.ts` |

</details>

<details>
<summary>xray (3 surfaces; direct 2, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| explainer.ts | xray | explainFinding, explainFindings, getAttackPatterns, getAttackPatternById +2 | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/bu-tpi/src/xray/explainer.ts` |
| index.ts | xray | explainFinding, explainFindings, getAttackPatterns, getAttackPatternById +5 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bu-tpi/src/xray/index.ts` |
| index.ts | xray | getCategories, getCategoryCounts, getTotalPatternCount, AttackPattern +1 | 0 | api:0 nav:0 xmod:0 | direct:1 | storage, validation, persistence, network +1 | -- | `packages/bu-tpi/src/xray/knowledge/index.ts` |

</details>

## dojolm-mcp

Source surfaces: **34**. Test files scanned: **35**.

<details>
<summary>attack-controller.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| attack-controller.ts | attack-controller.ts | AttackController | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-mcp/src/attack-controller.ts` |

</details>

<details>
<summary>attack-engine.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| attack-engine.ts | attack-engine.ts | AttackEngine | 0 | api:0 nav:0 xmod:3 | direct:1 | llm | -- | `packages/dojolm-mcp/src/attack-engine.ts` |

</details>

<details>
<summary>attack-logger.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| attack-logger.ts | attack-logger.ts | AttackLogger | 0 | api:0 nav:0 xmod:1 | direct:5 | auth, persistence | -- | `packages/dojolm-mcp/src/attack-logger.ts` |

</details>

<details>
<summary>fixture-generator.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| fixture-generator.ts | fixture-generator.ts | FixtureGenerator, GeneratedFixture | 0 | api:0 nav:0 xmod:1 | direct:1 | validation | -- | `packages/dojolm-mcp/src/fixture-generator.ts` |

</details>

<details>
<summary>index.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | index.ts | DEFAULT_SERVER_CONFIG, AdversarialMCPServer, AttackController, ATTACK_MODES +60 | 0 | api:0 nav:0 xmod:13 | direct:1 | validation | -- | `packages/dojolm-mcp/src/index.ts` |

</details>

<details>
<summary>mode-system.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| mode-system.ts | mode-system.ts | createAdversarialServer, getModeSummary, validateModeFiltering, ModeSystemConfig | 0 | api:0 nav:0 xmod:5 | direct:2 | validation | -- | `packages/dojolm-mcp/src/mode-system.ts` |

</details>

<details>
<summary>observer.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| observer.ts | observer.ts | MCPObserver, ObserverSnapshot, ObserverStats | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-mcp/src/observer.ts` |

</details>

<details>
<summary>pipeline (3 surfaces; direct 3, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cli.ts | pipeline | cli | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-mcp/src/pipeline/cli.ts` |
| index.ts | pipeline | UnifiedAdversarialPipeline | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-mcp/src/pipeline/index.ts` |
| unified-pipeline.ts | pipeline | UnifiedAdversarialPipeline, PipelineFixture, PipelineResult, BatchResult +1 | 0 | api:0 nav:0 xmod:2 | direct:1 | storage | -- | `packages/dojolm-mcp/src/pipeline/unified-pipeline.ts` |

</details>

<details>
<summary>scenarios (9 surfaces; direct 9, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| capability-spoofing.ts | scenarios | capability-spoofing | 0 | api:0 nav:0 xmod:1 | direct:1 | validation | -- | `packages/dojolm-mcp/src/scenarios/capability-spoofing.ts` |
| cross-server-leak.ts | scenarios | cross-server-leak | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/dojolm-mcp/src/scenarios/cross-server-leak.ts` |
| index.ts | scenarios | CAPABILITY_SPOOFING_SCENARIO, CAPABILITY_SPOOFING_TOOLS, TOOL_POISONING_SCENARIO, TOOL_POISONING_TOOLS +15 | 0 | api:0 nav:0 xmod:2 | direct:2 | -- | -- | `packages/dojolm-mcp/src/scenarios/index.ts` |
| notification-flood.ts | scenarios | generateLogFlood, generateProgressFlood, NotificationFloodConfig | 0 | api:0 nav:0 xmod:1 | direct:2 | llm | -- | `packages/dojolm-mcp/src/scenarios/notification-flood.ts` |
| prompt-injection.ts | scenarios | prompt-injection | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/dojolm-mcp/src/scenarios/prompt-injection.ts` |
| sampling-loop.ts | scenarios | sampling-loop | 0 | api:0 nav:0 xmod:1 | direct:1 | llm | -- | `packages/dojolm-mcp/src/scenarios/sampling-loop.ts` |
| tool-poisoning.ts | scenarios | tool-poisoning | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, llm | -- | `packages/dojolm-mcp/src/scenarios/tool-poisoning.ts` |
| typosquatting.ts | scenarios | levenshtein, isConfusable | 0 | api:0 nav:0 xmod:1 | direct:2 | storage, validation | -- | `packages/dojolm-mcp/src/scenarios/typosquatting.ts` |
| uri-traversal.ts | scenarios | uri-traversal | 0 | api:0 nav:0 xmod:1 | direct:2 | -- | -- | `packages/dojolm-mcp/src/scenarios/uri-traversal.ts` |

</details>

<details>
<summary>server.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| server.ts | server.ts | AdversarialMCPServer | 0 | api:0 nav:4 xmod:6 | direct:2 | llm, navigation | -- | `packages/dojolm-mcp/src/server.ts` |

</details>

<details>
<summary>tool-registry.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tool-registry.ts | tool-registry.ts | ToolRegistry | 0 | api:0 nav:0 xmod:1 | direct:1 | -- | -- | `packages/dojolm-mcp/src/tool-registry.ts` |

</details>

<details>
<summary>tools (11 surfaces; direct 11, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| api-gateway.ts | tools | AdversarialAPIGateway | 0 | api:10 nav:2 xmod:1 | direct:1 | storage, validation, persistence, network +2 | -- | `packages/dojolm-mcp/src/tools/api-gateway.ts` |
| browser.ts | tools | AdversarialBrowser | 0 | api:0 nav:10 xmod:1 | direct:1 | validation, persistence, network, llm +1 | -- | `packages/dojolm-mcp/src/tools/browser.ts` |
| code-repo.ts | tools | loadConfig, sanitizeInput, login, securityMiddleware +8 | 0 | api:0 nav:4 xmod:1 | direct:1 | storage, validation, network, navigation | -- | `packages/dojolm-mcp/src/tools/code-repo.ts` |
| email-server.ts | tools | AdversarialEmailServer, AdversarialEmail, EmailAttachment, EmailFixture | 1 | api:0 nav:0 xmod:1 | direct:1 | validation, network, llm | -- | `packages/dojolm-mcp/src/tools/email-server.ts` |
| file-system.ts | tools | AdversarialFileSystem | 0 | api:0 nav:55 xmod:1 | direct:1 | storage, validation, persistence, network +3 | -- | `packages/dojolm-mcp/src/tools/file-system.ts` |
| index.ts | tools | VECTOR_DB_SCENARIO, VECTOR_DB_TOOLS, AdversarialVectorDB, BROWSER_SCENARIO +25 | 0 | api:0 nav:0 xmod:1 | direct:1 | storage | -- | `packages/dojolm-mcp/src/tools/index.ts` |
| message-queue.ts | tools | AdversarialMessageQueue | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, persistence, admin, llm | -- | `packages/dojolm-mcp/src/tools/message-queue.ts` |
| model-endpoint.ts | tools | AdversarialModelEndpoint, MODEL_ENDPOINT_FIXTURES | 0 | api:0 nav:0 xmod:1 | direct:1 | auth, storage, validation, persistence +1 | -- | `packages/dojolm-mcp/src/tools/model-endpoint.ts` |
| search-engine.ts | tools | AdversarialSearchEngine | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, validation, network, llm | -- | `packages/dojolm-mcp/src/tools/search-engine.ts` |
| sensei-tools.ts | tools | SenseiGenerateAttack, SenseiJudgeResponse, SenseiMutateAttack, SenseiPlanAttack | 0 | api:0 nav:0 xmod:1 | direct:1 | validation, persistence, llm | -- | `packages/dojolm-mcp/src/tools/sensei-tools.ts` |
| vector-db.ts | tools | AdversarialVectorDB | 0 | api:0 nav:0 xmod:1 | direct:1 | storage, validation, network, admin +1 | -- | `packages/dojolm-mcp/src/tools/vector-db.ts` |

</details>

<details>
<summary>types.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| types.ts | types.ts | AttackType, AttackModeName, AttackModeConfig, JsonRpcRequest +20 | 0 | api:0 nav:0 xmod:0 | direct:8 | validation, llm | -- | `packages/dojolm-mcp/src/types.ts` |

</details>

<details>
<summary>virtual-fs.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| virtual-fs.ts | virtual-fs.ts | VirtualFileSystem | 0 | api:0 nav:0 xmod:1 | direct:1 | validation | -- | `packages/dojolm-mcp/src/virtual-fs.ts` |

</details>

## dojolm-scanner

Source surfaces: **3**. Test files scanned: **1**.

<details>
<summary>index.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | index.ts | scan | 0 | api:0 nav:0 xmod:2 | direct:1 | -- | -- | `packages/dojolm-scanner/src/index.ts` |

</details>

<details>
<summary>scanner.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| scanner.ts | scanner.ts | scan | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-scanner/src/scanner.ts` |

</details>

<details>
<summary>types.ts (1 surfaces; direct 1, indirect 0, none 0)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| types.ts | types.ts | types | 0 | api:0 nav:0 xmod:0 | direct:1 | -- | -- | `packages/dojolm-scanner/src/types.ts` |

</details>

## bmad-cybersec/validators

Source surfaces: **99**. Test files scanned: **0**.

<details>
<summary>ai-safety (19 surfaces; direct 0, indirect 0, none 19)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| agent-output-patterns.ts | ai-safety | analyzeAgentOutput, AgentOutputFinding, FAKE_TOOL_CALL_PATTERNS, PRIVILEGE_ESCALATION_PATTERNS +2 | 0 | api:0 nav:0 xmod:1 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/agent-output-patterns.ts` |
| boundary-detector.ts | ai-safety | detectBoundaryManipulation, BoundaryFinding | 0 | api:0 nav:0 xmod:1 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/boundary-detector.ts` |
| context-integrity.ts | ai-safety | isContextFile, isBinaryFile, readFileForScanning, severityToExitCode +2 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/context-integrity.ts` |
| index.js | ai-safety | detectPatterns, detectHiddenUnicode, detectBase64Payloads, detectHtmlCommentInjection +8 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/index.js` |
| index.ts | ai-safety | detectPatterns, detectHiddenUnicode, detectBase64Payloads, detectHtmlCommentInjection +22 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/index.ts` |
| jailbreak.js | ai-safety | normalizeText, fuzzyMatchKeywords, detectHeuristicPatterns, detectMultiTurnPatterns +4 | 0 | api:0 nav:0 xmod:2 | none | validation, persistence, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/jailbreak.js` |
| jailbreak.ts | ai-safety | fuzzyMatchKeywords, detectHeuristicPatterns, detectMultiTurnPatterns, detectPatterns +9 | 0 | api:0 nav:0 xmod:2 | none | validation, persistence, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/jailbreak.ts` |
| media-validator.ts | ai-safety | expandXmlEntities, isMediaFile, isSvgFile, isAudioFile +23 | 0 | api:0 nav:0 xmod:2 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/media-validator.ts` |
| multilingual-patterns.ts | ai-safety | detectMultilingualInjection, getLanguageCount, getPatternCountByLanguage, MultilingualFinding | 0 | api:0 nav:0 xmod:1 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/multilingual-patterns.ts` |
| output-validator.ts | ai-safety | parsePostToolInput, checkJsonDepth, checkOutputSize, getOutputToAnalyze +4 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/output-validator.ts` |
| pattern-engine.ts | ai-safety | getLineNumber, detectPatterns, PatternFinding, PatternDefinition | 0 | api:0 nav:0 xmod:1 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/pattern-engine.ts` |
| prompt-injection.js | ai-safety | normalizeText, detectHiddenUnicode, detectMultiLayerEncoding, detectBase64Payloads +5 | 0 | api:0 nav:0 xmod:2 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/prompt-injection.js` |
| prompt-injection.ts | ai-safety | detectMultiLayerEncoding, detectBase64Payloads, detectHtmlCommentInjection, analyzeContent +9 | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/prompt-injection.ts` |
| reformulation-detector.ts | ai-safety | detectCodeFormatInjection, detectCharacterLevelEncoding, detectContextOverload, detectMathLogicEncoding +1 | 0 | api:0 nav:1 xmod:1 | none | validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/reformulation-detector.ts` |
| session-tracker.js | ai-safety | getSessionState, updateSessionState, resetSessionState, isSessionEscalated +1 | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/session-tracker.js` |
| session-tracker.ts | ai-safety | getSessionState, updateSessionState, resetSessionState, isSessionEscalated +8 | 0 | api:0 nav:0 xmod:1 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/session-tracker.ts` |
| text-normalizer.ts | ai-safety | detectUnusualWhitespace, normalizeText, detectHiddenUnicode, UnicodeFinding | 0 | api:0 nav:0 xmod:1 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/text-normalizer.ts` |
| web-content-patterns.ts | ai-safety | analyzeWebContent, recordUrlFinding, getUrlReputation, getTrackedUrls +11 | 0 | api:0 nav:0 xmod:1 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/web-content-patterns.ts` |
| web-search-patterns.ts | ai-safety | analyzeSearchResults, SearchResultFinding | 0 | api:0 nav:0 xmod:1 | none | validation, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/ai-safety/web-search-patterns.ts` |

</details>

<details>
<summary>common (17 surfaces; direct 0, indirect 0, none 17)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| alerting.js | common | shouldAlert, sendAlert, sendAlertSync, alertCritical +2 | 0 | api:0 nav:0 xmod:0 | none | validation, network | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/alerting.js` |
| alerting.ts | common | shouldAlert, sendAlert, sendAlertSync, alertCritical +3 | 0 | api:0 nav:0 xmod:1 | none | validation, network | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/alerting.ts` |
| audit-logger.js | common | AuditLogger | 0 | api:0 nav:0 xmod:5 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/audit-logger.js` |
| audit-logger.ts | common | AuditLogger | 0 | api:0 nav:0 xmod:6 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/audit-logger.ts` |
| block-message.js | common | printBlockMessage, printWarning, printOverrideConsumed | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/block-message.js` |
| block-message.ts | common | printBlockMessage, printWarning, printOverrideConsumed, BlockMessageOptions | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/block-message.ts` |
| index.js | common | AuditLogger, OverrideManager, resolvePath, isPathInRepo +25 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/index.js` |
| index.ts | common | AuditLogger, OverrideManager, resolvePath, isPathInRepo +30 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/index.ts` |
| override-manager.js | common | OverrideManager | 0 | api:0 nav:0 xmod:0 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/override-manager.js` |
| override-manager.ts | common | OverrideManager | 0 | api:0 nav:0 xmod:1 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/override-manager.ts` |
| path-utils.js | common | getProjectDir, resolvePath, isPathInRepo, normalizePath +4 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/path-utils.js` |
| path-utils.ts | common | getProjectDir, resolvePath, isPathInRepo, normalizePath +4 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/path-utils.ts` |
| safe-regex.js | common | truncateForRegex, safeMatch, safeTest, safeBatchMatch +2 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/safe-regex.js` |
| safe-regex.ts | common | truncateForRegex, safeMatch, safeTest, safeBatchMatch +3 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/safe-regex.ts` |
| session-context.ts | common | checkSessionPermission, consumeSessionPermission, initSession, getSessionId +4 | 0 | api:0 nav:0 xmod:0 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/session-context.ts` |
| stdin-parser.js | common | getToolInputFromStdin, getToolInputFromStdinSync | 0 | api:0 nav:1 xmod:0 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/stdin-parser.js` |
| stdin-parser.ts | common | getToolInputFromStdin, getToolInputFromStdinSync | 0 | api:0 nav:1 xmod:1 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/common/stdin-parser.ts` |

</details>

<details>
<summary>guards (21 surfaces; direct 0, indirect 0, none 21)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bash-safety.js | guards | detectCommandSubstitution, extractRmTargets, checkDangerousRm, checkDirectoryEscape +4 | 0 | api:0 nav:1 xmod:2 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/bash-safety.js` |
| bash-safety.ts | guards | detectCommandSubstitution, splitCommandSegments, checkSQLInjection, extractRmTargets +6 | 0 | api:0 nav:1 xmod:2 | none | validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/bash-safety.ts` |
| env-protection.js | guards | isAllowedPattern, isProtectedFile, validateEnvProtection, main | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/env-protection.js` |
| env-protection.ts | guards | isAllowedPattern, isProtectedFile, validateEnvProtection, main | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/env-protection.ts` |
| http-security.ts | guards | detectIDOR, validateSecurityHeaders, checkDefaultCredentials, checkDebugFlags +6 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/http-security.ts` |
| index.js | guards | validateBashCommand, detectCommandSubstitution, extractRmTargets, checkDangerousRm +34 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/index.js` |
| index.ts | guards | validateBashCommand, detectCommandSubstitution, extractRmTargets, checkDangerousRm +34 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/index.ts` |
| outside-repo.js | guards | extractPathsFromCommand, detectUnsafeSubstitutions, checkBashCommand, checkFilePath +2 | 0 | api:0 nav:1 xmod:2 | none | validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/outside-repo.js` |
| outside-repo.ts | guards | extractPathsFromCommand, detectUnsafeSubstitutions, checkBashCommand, checkFilePath +2 | 0 | api:0 nav:1 xmod:2 | none | validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/outside-repo.ts` |
| index.js | guards | isTestFile, isSensitiveContext, isFakeData, detectPii +2 | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/index.js` |
| index.ts | guards | isTestFile, isSensitiveContext, isFakeData, detectPii +3 | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/index.ts` |
| patterns.js | guards | patterns | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/patterns.js` |
| patterns.ts | guards | Severity, PiiPattern | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/patterns.ts` |
| validators.js | guards | validateLuhn, validateIban, validateAbaRouting, validateNhsNumber +7 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/validators.js` |
| validators.ts | guards | validateLuhn, validateIban, validateAbaRouting, validateNhsNumber +7 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/pii/validators.ts` |
| production.js | guards | isDocumentationFile, isSafeContext, isCriticalDeployCommand, detectProductionIndicators +2 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/production.js` |
| production.ts | guards | isDocumentationFile, isSafeContext, isCriticalDeployCommand, detectProductionIndicators +2 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/production.ts` |
| secret.js | guards | calculateEntropy, isHighEntropy, isExpectedSecretFile, isExampleContent +3 | 0 | api:0 nav:0 xmod:2 | none | storage, validation, persistence, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/secret.js` |
| secret.ts | guards | calculateEntropy, isHighEntropy, isExpectedSecretFile, isExampleContent +3 | 0 | api:0 nav:0 xmod:2 | none | storage, validation, persistence, llm | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/secret.ts` |
| settings-guard.ts | guards | isProtectedSettingsFile, validateSettingsGuard, main | 0 | api:0 nav:0 xmod:2 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/settings-guard.ts` |
| xss-safety.ts | guards | detectXSS, validateXSSStrict, validateXSSPermissive, getXSSReport +2 | 0 | api:0 nav:1 xmod:1 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/guards/xss-safety.ts` |

</details>

<details>
<summary>index.js (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.js | index.js | -- | 0 | api:0 nav:0 xmod:6 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/index.js` |

</details>

<details>
<summary>index.ts (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | index.ts | -- | 0 | api:0 nav:0 xmod:6 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/index.ts` |

</details>

<details>
<summary>observability (18 surfaces; direct 0, indirect 0, none 18)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| anomaly-detector.js | observability | getAnomalyDetector, recordSecurityEventForAnomaly, checkAnomalies, getBaselineStatus +4 | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/anomaly-detector.js` |
| anomaly-detector.ts | observability | getAnomalyDetector, recordSecurityEventForAnomaly, checkAnomalies, getBaselineStatus +5 | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/anomaly-detector.ts` |
| archival-config.js | observability | createConfigManager, checkConfiguration, ArchivalConfigManager | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/archival-config.js` |
| archival-config.ts | observability | createConfigManager, checkConfiguration, ArchivalConfigManager, ConfigValidationResult +3 | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/archival-config.ts` |
| archival-scheduler.js | observability | getArchivalScheduler, initializeArchivalScheduling, triggerArchival, getArchivalStatus +1 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/archival-scheduler.js` |
| archival-scheduler.ts | observability | getArchivalScheduler, initializeArchivalScheduling, triggerArchival, getArchivalStatus +4 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/archival-scheduler.ts` |
| audit-encryption.js | observability | isEncryptedEntry, isEncryptionEnabled, encryptEntry, decryptEntry +11 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/audit-encryption.js` |
| audit-encryption.ts | observability | isEncryptedEntry, isEncryptionEnabled, encryptEntry, decryptEntry +12 | 0 | api:0 nav:0 xmod:1 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/audit-encryption.ts` |
| audit-integrity.js | observability | getChainManager, addChainFields, verifySecurityLog, getIntegrityStatus +2 | 0 | api:0 nav:0 xmod:1 | none | storage | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/audit-integrity.js` |
| audit-integrity.ts | observability | getChainManager, addChainFields, verifySecurityLog, getIntegrityStatus +3 | 0 | api:0 nav:0 xmod:1 | none | storage | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/audit-integrity.ts` |
| confidence-tracker.js | observability | getConfidenceTracker, analyzeResponseConfidence, getConfidenceIndicator, analyzeToolOutput +2 | 0 | api:0 nav:1 xmod:1 | none | storage, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/confidence-tracker.js` |
| confidence-tracker.ts | observability | getConfidenceTracker, analyzeResponseConfidence, getConfidenceIndicator, analyzeToolOutput +5 | 0 | api:0 nav:1 xmod:1 | none | storage, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/confidence-tracker.ts` |
| index.js | observability | TelemetryCollector, getTelemetryCollector, recordSecurityEvent, recordRateLimitMetrics +47 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/index.js` |
| index.ts | observability | TelemetryCollector, getTelemetryCollector, recordSecurityEvent, recordRateLimitMetrics +47 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/index.ts` |
| log-archiver.js | observability | createLogArchiver, runDailyArchival, archiveLogsInDateRange, ArchivalError +3 | 0 | api:0 nav:0 xmod:1 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/log-archiver.js` |
| log-archiver.ts | observability | createLogArchiver, runDailyArchival, archiveLogsInDateRange, ArchivalError +6 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/log-archiver.ts` |
| telemetry.js | observability | getTelemetryCollector, recordSecurityEvent, recordRateLimitMetrics, recordPermissionCheck +6 | 0 | api:0 nav:3 xmod:1 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/telemetry.js` |
| telemetry.ts | observability | getTelemetryCollector, recordSecurityEvent, recordRateLimitMetrics, recordPermissionCheck +13 | 0 | api:0 nav:3 xmod:1 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/observability/telemetry.ts` |

</details>

<details>
<summary>permissions (8 surfaces; direct 0, indirect 0, none 8)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.js | permissions | // Session caching functions<br>isSessionRecentlyValidated, markSessionValidated, getCachedClaims, saveSessionClaims +28 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/index.js` |
| index.ts | permissions | // Types<br>  type TokenClaims, type TokenValidationResult, type PermissionCheckResult, type RbacValidationResult +43 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/index.ts` |
| plugin-permissions.js | permissions | generateManifestTemplate, generateAllManifests, getPermissionChecker, checkPluginPermission +9 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/plugin-permissions.js` |
| plugin-permissions.ts | permissions | generateManifestTemplate, generateAllManifests, getPermissionChecker, checkPluginPermission +9 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/plugin-permissions.ts` |
| supply-chain.js | permissions | generateManifest, addTrustedKey, getVerifier, verifySkillIntegrity +4 | 0 | api:0 nav:5 xmod:2 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/supply-chain.js` |
| supply-chain.ts | permissions | generateManifest, addTrustedKey, getVerifier, verifySkillIntegrity +7 | 0 | api:0 nav:5 xmod:2 | none | storage, validation, navigation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/supply-chain.ts` |
| token-validator.js | permissions | isSessionRecentlyValidated, markSessionValidated, getCachedClaims, saveSessionClaims +8 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/token-validator.js` |
| token-validator.ts | permissions | isSessionRecentlyValidated, markSessionValidated, getCachedClaims, saveSessionClaims +12 | 0 | api:0 nav:0 xmod:2 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/permissions/token-validator.ts` |

</details>

<details>
<summary>resource-management (10 surfaces; direct 0, indirect 0, none 10)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| context-manager.js | resource-management | getContextManager, checkContextCapacity, estimateOperationCost, validateContextCapacity +2 | 0 | api:0 nav:0 xmod:4 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/context-manager.js` |
| context-manager.ts | resource-management | getContextManager, checkContextCapacity, estimateOperationCost, validateContextCapacity +6 | 0 | api:0 nav:0 xmod:5 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/context-manager.ts` |
| index.js | resource-management | RateLimiter, getRateLimiter, checkRateLimit, recordOperation +17 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/index.js` |
| index.ts | resource-management | RateLimiter, getRateLimiter, checkRateLimit, recordOperation +31 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/index.ts` |
| rate-limiter.js | resource-management | getRateLimiter, checkRateLimit, recordOperation, getRateStatus +3 | 0 | api:0 nav:0 xmod:4 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/rate-limiter.js` |
| rate-limiter.ts | resource-management | getRateLimiter, checkRateLimit, recordOperation, getRateStatus +7 | 0 | api:0 nav:0 xmod:5 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/rate-limiter.ts` |
| recursion-guard.js | resource-management | getRecursionGuard, checkRecursionLimit, checkCircularReference, validateRecursion +2 | 0 | api:0 nav:0 xmod:3 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/recursion-guard.js` |
| recursion-guard.ts | resource-management | getRecursionGuard, checkRecursionLimit, checkCircularReference, validateRecursion +5 | 0 | api:0 nav:0 xmod:4 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/recursion-guard.ts` |
| resource-limits.js | resource-management | getResourceLimiter, checkResourceLimits, checkMemoryAvailable, validateResourceLimits +2 | 0 | api:0 nav:0 xmod:4 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/resource-limits.js` |
| resource-limits.ts | resource-management | getResourceLimiter, checkResourceLimits, checkMemoryAvailable, validateResourceLimits +6 | 0 | api:0 nav:0 xmod:5 | none | storage, validation, persistence | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/resource-management/resource-limits.ts` |

</details>

<details>
<summary>types (3 surfaces; direct 0, indirect 0, none 3)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.js | types | -- | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/types/index.js` |
| index.ts | types | ToolInput, BashToolInput, WriteToolInput, EditToolInput +21 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/types/index.ts` |
| xss-types.ts | types | XSSDetectionResult, Severity | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/types/xss-types.ts` |

</details>

<details>
<summary>validation (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| asvs-input-validator.ts | validation | validateRequiredField, validateNumericRange, validateStringLength, validateFileType +9 | 0 | api:0 nav:0 xmod:0 | none | storage, validation | direct unit or integration coverage | `packages/bmad-cybersec/validators/src/validation/asvs-input-validator.ts` |

</details>

## bmad-cybersec/framework

Source surfaces: **7**. Test files scanned: **0**.

<details>
<summary>audit (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | audit | createAuditLogger, initializeGlobalAuditLogger, getGlobalAuditLogger, auditAuth +29 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/audit/index.ts` |

</details>

<details>
<summary>auth (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | auth | requireAuth, requirePermission, createAuthManager, quickAuth +9 | 0 | api:0 nav:0 xmod:0 | none | auth, validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/auth/index.ts` |

</details>

<details>
<summary>exports (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | exports | createBMADFramework, createDevelopmentFramework, createProductionFramework, createTestingFramework +22 | 0 | api:0 nav:0 xmod:6 | none | auth, validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/exports/index.ts` |

</details>

<details>
<summary>hooks (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | hooks | sessionSecurityInit, createHookManager, HookRegistry, BMADHookManager +4 | 0 | api:0 nav:0 xmod:0 | none | -- | direct unit or integration coverage | `packages/bmad-cybersec/framework/hooks/index.ts` |

</details>

<details>
<summary>index.ts (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | index.ts | initializeFramework, FrameworkConfig | 0 | api:0 nav:0 xmod:6 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/index.ts` |

</details>

<details>
<summary>scripts (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | scripts | createScriptManager, compressAgents, compressManifest, buildModules +6 | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/scripts/index.ts` |

</details>

<details>
<summary>validators (1 surfaces; direct 0, indirect 0, none 1)</summary>

| Surface | Area | Symbols | Interactive | Integrations | Coverage | Risks | Missing Checks | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| index.ts | validators | createValidatorSuite, ValidatorSuiteConfig | 0 | api:0 nav:0 xmod:0 | none | validation | direct unit or integration coverage | `packages/bmad-cybersec/framework/validators/index.ts` |

</details>

