# Implementation Plan Audit

**Date:** 2026-03-25  
**Scope:** Active, archived, and superseded implementation plans cross-checked against the live codebase  
**Method:** Reviewed plan status, major epics/stories, and acceptance intent against current routes, components, package structure, fixtures, validation assets, and tests

---

## Executive Summary

The repo does **not** show evidence that a major historical implementation plan was fully abandoned after being approved and worked. Most of the big archived plans are now materially represented in code.

The biggest issue is different:

1. The older gap audit is stale. Several items it marked missing are now implemented.
2. The **KATANA validation framework is code-complete but not evidence-complete**. The engine exists, but the corpus/calibration/report asset directories are still mostly placeholders.
3. The **50+ LLM provider plan is only partially implemented**. The type system and preset scaffolding exist, but adapter coverage is far below the plan.
4. The two new **HAKONE successor plans** are not abandoned, but they are still open planning documents rather than clearly tracked execution work.

---

## Findings

### 1. Previous "missing feature" audit is outdated

The 2026-03-10 audit in `team/docs/IMPLEMENTATION-GAP-AUDIT.md` no longer matches the live code for several high-signal items.

Resolved in code:

- Login/auth UI exists: `packages/dojolm-web/src/app/login/page.tsx`
- Auth UI wiring exists: `packages/dojolm-web/src/lib/auth/AuthContext.tsx`
- Auth API routes exist: `packages/dojolm-web/src/app/api/auth/login/route.ts`, `packages/dojolm-web/src/app/api/auth/logout/route.ts`, `packages/dojolm-web/src/app/api/auth/me/route.ts`, `packages/dojolm-web/src/app/api/auth/users/route.ts`
- User management, scoreboard, and admin settings exist in Admin: `packages/dojolm-web/src/components/admin/UserManagement.tsx`, `packages/dojolm-web/src/components/admin/Scoreboard.tsx`, `packages/dojolm-web/src/components/admin/AdminSettings.tsx`, `packages/dojolm-web/src/components/admin/AdminPanel.tsx`
- LLM type dedup is resolved: `packages/dojolm-web/src/lib/llm-types.ts`
- Card hover/polish is present: `packages/dojolm-web/src/components/ui/card.tsx`
- Red-team playbooks exist: `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx`
- Arena detail/enrichment exists in the strategic UI: `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx`, `packages/dojolm-web/src/components/strategic/arena/WarriorCard.tsx`, `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx`

Conclusion: the older gap document should be treated as historical, not current.

### 2. KATANA is implemented as a framework, but not yet operationally populated

The approved KATANA plan is strongly represented in code:

- Core API and public surface: `packages/bu-tpi/src/validation/index.ts`
- Runner, generators, integrity, investigation, governance, reports, CLI, CI: `packages/bu-tpi/src/validation/**`
- Admin UI and routes: `packages/dojolm-web/src/components/admin/ValidationManager.tsx`, `packages/dojolm-web/src/app/api/admin/validation/**`

However, the plan's operational assets are mostly empty:

- Taxonomy file exists: `packages/bu-tpi/validation/taxonomy/module-taxonomy.json`
- Corpus, holdout, calibration, certificates, and reports directories are present but still placeholder-heavy:
  - `packages/bu-tpi/validation/corpus/ground-truth/text/.gitkeep`
  - `packages/bu-tpi/validation/corpus/ground-truth/binary/.gitkeep`
  - `packages/bu-tpi/validation/corpus/generated/.gitkeep`
  - `packages/bu-tpi/validation/corpus/holdout/.gitkeep`
  - `packages/bu-tpi/validation/calibration/reference-sets/.gitkeep`
  - `packages/bu-tpi/validation/calibration/certificates/.gitkeep`
  - `packages/bu-tpi/validation/reports/runs/.gitkeep`

Assessment: **the framework implementation shipped, but the evidence corpus/certificate/report content required by the plan has not been filled in yet.**

### 3. The LLM provider expansion plan is only partially delivered

The archived provider plan targeted "50+ AI API providers + Custom API configuration."

What exists now:

- Canonical provider type system and presets support: `packages/bu-tpi/src/llm/types.ts`
- Web/provider factory: `packages/dojolm-web/src/lib/llm-providers.ts`
- Concrete adapters loaded today: OpenAI, Anthropic, Ollama, LM Studio, llama.cpp, Z.ai, Moonshot
- OpenAI-compatible custom path exists

But the factory still shows partial implementation:

- `google` and `cohere` are still placeholder-mapped to Anthropic in `packages/dojolm-web/src/lib/llm-providers.ts`
- The actual adapter surface is far below the plan's 50+ provider scope

Assessment: **partial implementation only**. This is an open scope item, not a silent miss from a completed sprint, because the source plan status is still "Planning."

### 4. The current HAKONE successor plans are open planning scope, not tracked execution scope

Current plans:

- `team/docs/HAKONE-DOJO-SAAS-POLISH-IMPLEMENTATION-PLAN.md`
- `team/docs/HAKONE-UX-CLARITY-IMPLEMENTATION-PLAN.md`

There is already partial evidence of this work in code:

- Title hierarchy and visual primitives: `packages/dojolm-web/src/app/globals.css`
- Truthful toolbar behavior: `packages/dojolm-web/src/components/layout/PageToolbar.tsx`
- Navigation grouping and descriptive labels: `packages/dojolm-web/src/components/layout/Sidebar.tsx`
- Docs/glossary crosswalk: `docs/user/modules/README.md`
- Admin plain-language aliases: `packages/dojolm-web/src/components/admin/AdminPanel.tsx`

What is missing is execution tracking:

- No explicit completion status blocks in either current HAKONE successor plan
- No active implementation tracker was found tying H30-H45 to shipped slices the way NODA/KATANA/Hakone historical plans were tracked

Assessment: **not abandoned, but still open planning scope**. If these plans are expected to ship, they need a live tracker or explicit de-scope decision.

---

## Plan Status Matrix

| Plan / Plan Family | Audit Result | Notes |
| --- | --- | --- |
| Next.js migration | Implemented and archived | Current doc is just an archive pointer; repo is already on the Next.js layout |
| TPI Test Lab Gap Fill | Implemented | Fixture and detector coverage exists across `packages/bu-tpi/src` and `packages/bu-tpi/fixtures` |
| BU-TPI NODA | Implemented | Dashboard/admin/compliance/LLM/module work is present in code |
| UI Perfection / NODA-4 UI remediation | Implemented | Shared primitives, polish, and visual system changes are live |
| NODA-3 | Implemented | Historical deferred items identified in older audits are now present |
| Bushido Book update | Implemented | Engine, API, and UI surfaces exist |
| Branded fixtures / fixture expansion | Implemented or exceeded | MCP, agent-output, context, webmcp, multimodal, and related fixture families exist at scale |
| Hakone unified plan (historical) | Implemented for main shipped scope; H29 deferred | Core Hakone phases are visible in code; telemetry phase was explicitly deferred |
| Kagami | Implemented | Fingerprint engine, probes, routes, UI, and tests exist |
| DuckDB integration decision | Closed, not a gap | better-sqlite3 was the chosen path and is live in `packages/dojolm-web/package.json` and `src/lib/db` |
| KATANA final plan | Partially complete | Framework code shipped; corpus/calibration/report assets still largely empty |
| LLM provider 50+ plan | Partially complete | Core architecture exists, provider coverage does not match plan scope |
| HAKONE SaaS polish successor | Open planning scope | Partial foundation in code, no clear execution tracker |
| HAKONE UX clarity successor | Open planning scope | Partial foundation in code, no clear execution tracker |

---

## Direct Answers To The Audit Question

### Was any major historical implementation plan entirely left out?

No clear case of a **completed/approved historical plan** being entirely left out was found.

### Were steps left out?

Yes, but mainly in newer or still-open plan families:

- KATANA: operational evidence assets are not populated yet
- LLM provider expansion: adapter implementation does not match planned breadth
- Current HAKONE successor plans: planning exists, but execution tracking is still missing

### Are old "missing features" still missing?

Mostly no. Several previously reported gaps are now closed in the live codebase.

---

## Recommended Cleanup

1. Replace or supersede `team/docs/IMPLEMENTATION-GAP-AUDIT.md` with a current audit.
2. Split KATANA into two statuses:
   `framework implemented`
   `validation assets/evidence pending`
3. Reclassify the LLM provider plan explicitly:
   `partial delivery`
   or
   `de-scoped to current provider set`
4. Put the two current HAKONE successor plans onto a live tracker, or mark them as future planning only.

---

## Evidence Pointers

- Historical gap audit: `team/docs/IMPLEMENTATION-GAP-AUDIT.md`
- Current auth UI: `packages/dojolm-web/src/app/login/page.tsx`
- Current admin/auth surfaces: `packages/dojolm-web/src/components/admin/AdminPanel.tsx`, `packages/dojolm-web/src/app/api/auth/**`
- KATANA framework: `packages/bu-tpi/src/validation/**`, `packages/bu-tpi/validation/**`
- Kagami implementation: `packages/bu-tpi/src/fingerprint/**`, `packages/dojolm-web/src/components/kagami/**`, `packages/dojolm-web/src/app/api/llm/fingerprint/**`
- Provider factory gap: `packages/dojolm-web/src/lib/llm-providers.ts`
- HAKONE successor plans: `team/docs/HAKONE-DOJO-SAAS-POLISH-IMPLEMENTATION-PLAN.md`, `team/docs/HAKONE-UX-CLARITY-IMPLEMENTATION-PLAN.md`
