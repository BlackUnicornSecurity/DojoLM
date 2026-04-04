# Deep UI-vs-Codebase Audit

Date: 2026-04-04
Scope: `packages/dojolm-web` primary UI shell, supporting API routes, and notable feature components that exist in code but are hidden, buried, or not meaningfully surfaced in the live interface.

## Goal

Identify features that exist in the codebase but are hard to discover, impossible to activate from the visible UI, or only partially surfaced in a way that prevents users from making full use of them.

## Method

This review compared:

- top-level navigation and mounted tabs in `src/app/page.tsx`
- mounted module shells and their sub-tabs
- component barrels and orphaned feature components
- exported-but-unmounted feature surfaces found by reference analysis
- API routes with weak or missing UI affordances
- assistant tool registry coverage versus direct API-only capabilities
- module guides in `docs/user/modules`

This is a static audit, not a runtime browser test.

## Executive Summary

The biggest gap is not a single missing button. It is structural:

- several complete feature surfaces exist but are not mounted anywhere
- several visible modules stop at summary or placeholder views while richer subviews already exist in code
- some advanced capabilities are only reachable through internal assistant tooling or direct API calls
- one user-facing control surface is hidden behind a secret keyboard sequence

The highest-value hidden or under-surfaced areas are:

1. `AgenticLab` and agentic scenario execution
2. Atemi `Protocol Fuzz`
3. SAGE seed, mutation, and quarantine views
4. Mitsuke source management and library views
5. Guard `SystemPromptHardener`
6. Sengoku orchestrator tooling
7. consolidated reporting and validation-signature verification

A second tier of hidden-but-meaningful surfaces also exists:

- Atemi red-team playbooks
- scanner module diagnostics
- Battle Arena roster, rules, and match analytics
- Amaterasu DNA library views
- Kotoba workshop mode
- Bushido Book export/dashboard variants
- Guard defense-template library
- LLM benchmark and export side panels

## Findings

### 1. Hidden full module: Agentic Security Testing Lab

Status: Implemented but not mounted anywhere in the visible app shell.

Evidence:

- `packages/dojolm-web/src/components/agentic/AgenticLab.tsx:113`
- `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx:115`
- `packages/dojolm-web/src/app/api/agentic/route.ts:1`

Why this matters:

- This is not a small helper component. It is a distinct lab for agentic security testing with scenario configuration, architecture selection, dual scoring, and scenario execution.
- There is no top-level nav item, no sub-tab, and no visible entry point from Dashboard, Atemi, LLM Dashboard, or The Kumite.

Impact:

- Users cannot discover or activate an implemented agentic test workflow without manually wiring code or calling the API.

Recommendation:

- Add a first-class entry point under Atemi Lab or The Kumite.
- If it is intentionally incubation-stage, label it as `Experimental` rather than leaving it invisible.
- Before surfacing it, align the UI contract with `/api/agentic`. The current component posts tool-architecture values like `openai-functions` and categories like `filesystem`, while the route validates architectures like `single-agent` and categories like `prompt-injection`.

### 2. Hidden operational tool: internal Test Runner

Status: Implemented UI plus API, but no visible navigation path.

Evidence:

- `packages/dojolm-web/src/components/tests/TestRunner.tsx:28`
- `packages/dojolm-web/src/app/api/tests/route.ts:1`

Why this matters:

- The component exposes a structured UI for running internal suites, filtering by regression or epic, and reviewing test results.
- The API is documented in `docs/user/API_REFERENCE.md`, but the web app does not surface the UI anywhere.

Impact:

- QA and engineering users lose a potentially useful in-app validation console and fall back to terminal-only workflows.

Recommendation:

- Surface it inside Admin or Validation as an advanced internal tool.

### 3. Hidden scanner knowledge surface: Pattern Reference

Status: Implemented documentation UI, but not wired into Scanner or Admin.

Evidence:

- `packages/dojolm-web/src/components/reference/PatternReference.tsx:48`

Why this matters:

- This component provides searchable reference documentation for scanner detection patterns.
- The Scanner currently exposes findings and engine filters, but not the reference surface that would help users understand what the engine stack is actually looking for.

Impact:

- Users cannot inspect detection logic or pattern inventories from the app, which weakens explainability and training value.

Recommendation:

- Add a `Pattern Reference` drawer or secondary tab in Haiku Scanner or Admin.

### 4. Hidden capability control: module visibility panel behind secret sequence

Status: Real UI exists, but discoverability is effectively zero.

Evidence:

- `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx:29`
- `packages/dojolm-web/src/hooks/useSenseiScroll.ts:11`
- `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx:329`

Why this matters:

- The app includes a module visibility manager that can toggle major modules on and off.
- It is opened via a hidden keyboard sequence, not through a normal settings affordance.

Impact:

- A powerful personalization or role-scoping feature exists, but most users will never find it.
- Teams may misinterpret missing modules as bugs rather than user-hidden state.

Recommendation:

- Expose this from Dashboard customization or Admin settings.
- Keep the shortcut if desired, but do not make it the only access path.

### 5. Atemi says `Protocol Fuzz`, but the mounted tab is only a placeholder

Status: Implemented panel exists elsewhere, visible tab is non-functional placeholder.

Evidence:

- Placeholder in `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx:947`
- Real panel in `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx:89`

Why this matters:

- The tab name implies feature availability.
- The current mounted view stops at `Coming in Phase 11`, while a usable protocol fuzzing UI already exists in the codebase.

Impact:

- Users are blocked from a feature that appears to exist.
- The platform undersells its own testing surface.

Recommendation:

- Mount `ProtocolFuzzPanel` directly in Atemi's `Protocol Fuzz` tab.
- If the panel is still mock-backed, label it clearly as `Preview` rather than `Coming soon`.

### 6. The Kumite surfaces SAGE only as a summary dashboard, hiding richer subviews

Status: Core SAGE module visible, deeper operational views hidden.

Evidence:

- Mounted summary view in `packages/dojolm-web/src/components/strategic/StrategicHub.tsx:453`
- Mock-driven SAGE dashboard in `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx:64`
- Hidden subviews exported in `packages/dojolm-web/src/components/strategic/index.ts:16`
- Seed library in `packages/dojolm-web/src/components/strategic/SageSeedLibrary.tsx:464`
- Mutation library in `packages/dojolm-web/src/components/strategic/SageMutationView.tsx:498`
- Quarantine workflow in `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx:478`

Why this matters:

- Users can see high-level SAGE metrics, but not the deeper views needed to browse seeds, inspect mutation operators, or manage quarantine decisions.

Impact:

- The visible UI suggests a complete SAGE subsystem, but the mounted experience is materially shallower than what the codebase supports.

Recommendation:

- Add second-level SAGE tabs: `Overview`, `Seeds`, `Mutation Operators`, `Quarantine`.

### 7. Mitsuke is surfaced as a stream, but the source-management and library experiences are hidden

Status: Visible Mitsuke shell is narrower than available code.

Evidence:

- Mounted stream in `packages/dojolm-web/src/components/strategic/StrategicHub.tsx:475`
- Read-only stream view in `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx:227`
- Hidden source configuration in `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx:150`
- Hidden library in `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx:919`
- Both exported in `packages/dojolm-web/src/components/strategic/index.ts:14`

Why this matters:

- The visible UI lets users watch alerts and browse sources, but not fully manage custom sources or use the richer `Indicators / Threats / Sources` library workflow.

Impact:

- Mitsuke feels more passive than the underlying implementation actually is.

Recommendation:

- Add Mitsuke sub-tabs: `Stream`, `Library`, `Source Config`.

### 8. Guard hides its most actionable hardening workflow

Status: Implemented feature exists, main Guard UI does not expose it.

Evidence:

- Guard dashboard only mounts metrics, mode selector, and audit log in `packages/dojolm-web/src/components/guard/GuardDashboard.tsx:55`
- Hidden hardener in `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx:76`
- Guard barrel does not export it in `packages/dojolm-web/src/components/guard/index.ts:1`

Why this matters:

- `SystemPromptHardener` is exactly the kind of tool users need to improve prompts before guarded execution.
- Right now Guard mostly reports and configures; it does not surface this preventive workflow.

Impact:

- Users miss a built-in prompt-hardening utility that complements Guard and Kotoba.

Recommendation:

- Add a `Hardening` sub-tab under Hattori Guard, or link it from Guard and Kotoba.

### 9. Consolidated cross-module reporting exists, but there is no strong UI affordance for it

Status: End-to-end feature exists but is weakly surfaced.

Evidence:

- Download control in `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx:37`
- Backend route in `packages/dojolm-web/src/app/api/reports/consolidated/route.ts:135`
- LLM header currently exposes only `ReportGenerator` in `packages/dojolm-web/src/components/llm/LLMDashboard.tsx:76`

Why this matters:

- The consolidated report can aggregate LLM, compliance, evidence, guard, and Shingan sections.
- That is a materially broader deliverable than the standard LLM export flow.

Impact:

- Users may never realize a cross-module executive report exists.

Recommendation:

- Add a global or Admin-level `Consolidated Report` action, and optionally mirror it into Bushido Book and Dashboard.

### 10. Hidden LLM analytics panel: Transfer Matrix

Status: Implemented visualization exists, not mounted.

Evidence:

- `packages/dojolm-web/src/components/llm/TransferMatrixPanel.tsx:51`
- No LLM Dashboard tab for it in `packages/dojolm-web/src/components/llm/LLMDashboard.tsx:68`
- Not exported from the public LLM barrel in `packages/dojolm-web/src/components/llm/index.ts:5`

Why this matters:

- Cross-model vulnerability transfer is a meaningful advanced analysis capability.
- It is absent from the user-facing compare or results flows.

Impact:

- Advanced benchmarking insight is left unused.

Recommendation:

- Add it under `Compare` or as an advanced analytics tab.

### 11. Kagami has deeper visualization and signature-discovery capability than the mounted UI reveals

Status: Partially surfaced.

Evidence:

- Main Kagami panel is mounted in `packages/dojolm-web/src/components/strategic/StrategicHub.tsx:497`
- Hidden radar chart component in `packages/dojolm-web/src/components/kagami/FeatureRadar.tsx:80`
- Signature browser API in `packages/dojolm-web/src/app/api/llm/fingerprint/signatures/route.ts:1`
- Results API in `packages/dojolm-web/src/app/api/llm/fingerprint/results/route.ts:1`

Why this matters:

- The visible Kagami flow supports fingerprint execution and results, but not a first-class signature browser or richer feature-radar inspection workflow.

Impact:

- Users can run Kagami, but not make the best of the underlying result and signature data.

Recommendation:

- Add `Signatures` and `Feature Radar` secondary views inside Kagami.
- Consider surfacing the signatures endpoint directly; unlike results, `packages/dojolm-web/src/app/api/llm/fingerprint/signatures/route.ts:1` does not appear to be wired into either the visible UI or the Sensei tool registry.

### 12. Sengoku hides its orchestrator workbench

Status: Major advanced workflow exists but is not mounted in the visible Sengoku tabs.

Evidence:

- Sengoku only mounts `Campaigns` and `Temporal` in `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx:277`
- Hidden orchestrator builder in `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx:79`
- Hidden orchestrator visualization in `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx:115`
- Hidden campaign graph builder in `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx:67`
- Orchestrator APIs in `packages/dojolm-web/src/app/api/orchestrator/run/route.ts:19` and `packages/dojolm-web/src/app/api/orchestrator/status/route.ts:1`

Why this matters:

- There is enough code for an orchestrated multi-model attack-planning workspace, but the visible module does not expose it.

Impact:

- Sengoku looks narrower than the codebase suggests.

Recommendation:

- Add an `Orchestrator` tab in Sengoku, or fold the builder into `Temporal`.

### 13. Sensei service capabilities exist as APIs, but not as first-class user-facing controls

Status: API-capable, mostly assistant-only.

Evidence:

- `packages/dojolm-web/src/app/api/sensei/generate/route.ts:1`
- `packages/dojolm-web/src/app/api/sensei/judge/route.ts:1`
- `packages/dojolm-web/src/app/api/sensei/mutate/route.ts:1`
- `packages/dojolm-web/src/app/api/sensei/plan/route.ts:1`

Why this matters:

- These routes cover attack generation, judging, mutation, and conversation planning.
- They appear to be available mainly through internal assistant tooling rather than explicit user-facing controls.

Impact:

- Powerful Sensei capabilities are present, but users may not know they exist unless they interact with the assistant in exactly the right way.

Recommendation:

- Add an `Advanced Sensei Tools` drawer or a small explicit action menu in Atemi or LLM Dashboard.
- `packages/dojolm-web/src/app/api/sensei/plan/route.ts:1` appears even more hidden than the others: it does not show up in the visible UI and does not appear to be registered in `packages/dojolm-web/src/lib/sensei/tool-definitions.ts`.

### 14. Validation signature verification exists but has no visible verification affordance

Status: Implemented API, weak UI exposure.

Evidence:

- Verify route in `packages/dojolm-web/src/app/api/admin/validation/verify/route.ts:1`
- Validation UI displays signatures but does not appear to call the verify route; current references in `packages/dojolm-web/src/components/admin/ValidationManager.tsx:1370`

Why this matters:

- The app can structurally validate signed validation reports, but users are not given a visible `Verify signature` action.

Impact:

- Trust and report-integrity workflows are incomplete from a user perspective.

Recommendation:

- Add `Verify Signature` to the Validation report detail/export area.

### 15. Atemi has a hidden playbook execution surface

Status: Implemented workflow, no visible launch path from Atemi.

Evidence:

- `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx:123`
- Atemi barrel omits it in `packages/dojolm-web/src/components/adversarial/index.ts:1`
- The mounted Atemi lab currently focuses on attack tools, skills, MCP, protocol fuzz, and WebMCP in `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx:52`

Why this matters:

- `PlaybookRunner` is not just a card or helper. It is a guided multi-step red-team workflow with objectives, step progression, and linked skills.
- That is a stronger onboarding and operationalization layer than the current free-form skill browsing alone.

Impact:

- Atemi exposes raw tools and skills, but not the guided workflows that would help users run them systematically.

Recommendation:

- Add a `Playbooks` tab inside Atemi, especially for onboarding and repeatable assessment runs.

### 16. Haiku Scanner has hidden module-diagnostic panels

Status: Implemented and exported, but not mounted in the scanner shell.

Evidence:

- `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx:72`
- `packages/dojolm-web/src/components/scanner/ModuleResults.tsx:76`
- Both are exported from `packages/dojolm-web/src/components/scanner/index.ts:19`
- The scanner shell only mounts `ScannerInput` and `FindingsList` in `packages/dojolm-web/src/app/page.tsx:358`

Why this matters:

- These components provide per-engine grouping, module counts, and toggleable diagnostics that go beyond the flat findings list.
- They would make the engine stack more explainable and help users understand which detectors are producing results.

Impact:

- The scanner currently under-exposes its own module-aware analysis layer.

Recommendation:

- Add a collapsible `Results by Module` panel and/or a `Module Legend` drawer next to findings.

### 17. Battle Arena hides richer roster, rules, and match-analytics views

Status: Core Arena is visible, but several supporting views are not surfaced.

Evidence:

- Arena mounts the table, live view, wizard, exporter, and compact warrior grid in `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx:311`
- Hidden detailed roster in `packages/dojolm-web/src/components/strategic/ArenaRoster.tsx:443`
- Hidden rules view in `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx:98`
- Hidden match analytics in `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx:289`
- Rules and stats are exported in `packages/dojolm-web/src/components/strategic/arena/index.ts:16`

Why this matters:

- The mounted Arena is operational, but still lacks the richer reference and analysis surfaces that help users understand game modes, compare warriors, and inspect aggregate performance.

Impact:

- Arena feels more like a match browser than a full competitive lab, even though the codebase already contains supporting views for that broader experience.

Recommendation:

- Add second-level Arena tabs or drawers for `Roster`, `Rules`, and `Stats`.

### 18. Amaterasu DNA has a hidden library workflow beyond the explorer

Status: Explorer is mounted, library views are not.

Evidence:

- Mounted DNA subsystem routes through `packages/dojolm-web/src/components/strategic/StrategicHub.tsx:486`
- Hidden library in `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx:608`
- Exported from `packages/dojolm-web/src/components/attackdna/index.ts:25`

Why this matters:

- `DNALibrary` exposes structured library views for nodes, edges, families, and clusters.
- That complements the visual explorer with browse/search-heavy workflows that are often better for research and triage.

Impact:

- Users can visualize lineage, but not use the richer data-library surface that already exists in code.

Recommendation:

- Add a `Library` secondary view inside Amaterasu DNA.

### 19. Kotoba has a hidden workshop mode in addition to its visible dashboard

Status: The visible module is mounted, but the interactive workshop is not.

Evidence:

- Visible module is `KotobaDashboard` from `packages/dojolm-web/src/components/kotoba/index.ts:1`
- Hidden workshop in `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx:106`
- Workshop is exported in `packages/dojolm-web/src/components/kotoba/index.ts:2`

Why this matters:

- The mounted Kotoba view is a score-and-harden dashboard.
- The workshop adds a more hands-on side-by-side hardening workflow with applied-rule review and diff-style guidance.

Impact:

- Users only see the summary studio, not the more instructional editing experience.

Recommendation:

- Add `Dashboard` and `Workshop` tabs inside Kotoba.

### 20. Bushido Book contains alternate dashboard and export surfaces that are not exposed

Status: Implemented and exported, but not mounted from the current compliance shell.

Evidence:

- `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx:176`
- `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx:162`
- Both are exported from `packages/dojolm-web/src/components/compliance/index.ts:1`
- `rg` finds no references to either from `ComplianceCenter` or `src/app/page.tsx`

Why this matters:

- `ComplianceDashboard` looks like a concise alternate coverage dashboard.
- `ComplianceExport` provides a dedicated report export control that could be useful from framework drill-downs or audit flows.

Impact:

- If these are still intended features, users cannot reach them.
- If they are obsolete, they still represent code/UI drift that can confuse future development.

Recommendation:

- Either mount them intentionally inside Bushido Book or formally retire/remove them to reduce ambiguity.

### 21. Guard has a second hidden hardening surface: defense templates

Status: Implemented but not surfaced.

Evidence:

- `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx:135`
- `packages/dojolm-web/src/components/guard/GuardDashboard.tsx:55`
- Guard barrel currently exports only the dashboard, mode selector, audit log, and badge in `packages/dojolm-web/src/components/guard/index.ts:1`

Why this matters:

- `ForgeDefensePanel` offers a categorized defense-template library that complements Guard's monitoring and `SystemPromptHardener`.
- It is a useful recommendation surface even if it is still mock-backed.

Impact:

- Guard currently feels configuration-heavy but light on prescriptive remediation guidance.

Recommendation:

- Group `SystemPromptHardener` and `ForgeDefensePanel` under a visible `Hardening` or `Defenses` section.

### 22. LLM Dashboard has more hidden side-panels than just Transfer Matrix

Status: Multiple advanced panels exist but are not mounted.

Evidence:

- Hidden benchmark panel in `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx:79`
- Hidden batch export panel in `packages/dojolm-web/src/components/llm/TestExporter.tsx:34`
- Transfer matrix in `packages/dojolm-web/src/components/llm/TransferMatrixPanel.tsx:51`
- The mounted dashboard tabs remain `models`, `tests`, `results`, `leaderboard`, `compare`, `custom`, and `jutsu` in `packages/dojolm-web/src/components/llm/LLMDashboard.tsx:22`

Why this matters:

- The codebase already contains deeper benchmarking and export affordances than the visible shell suggests.
- `TestExporter` is especially notable because it is API-backed, not just decorative.

Impact:

- LLM Dashboard undersells its reporting and analytics depth.

Recommendation:

- Add an `Analytics` or `Advanced` tab that can house benchmark, transfer, and export tooling.

## Additional Notes

### Visible modules that are already documented as placeholders

Some gaps are already acknowledged in the docs and UI:

- Ronin `Planning` and `Intelligence`
- Atemi `Protocol Fuzz`

Those still matter operationally, but they are different from the hidden-feature cases above because they are at least visible.

### Mock-backed surfaces

Some visible modules use mock-heavy summary surfaces even where richer UI exists:

- SAGE summary dashboard
- Mitsuke threat feed
- WebMCP testing
- Battle Arena supporting stats/rules surfaces
- Guard hardening and defense-template surfaces
- Kotoba workshop
- LLM benchmark and transfer analytics
- DNA library views

That does not mean those modules are useless, but it does mean the visible UX can underrepresent what the codebase is trying to become.

## Priority Recommendations

### Highest ROI

1. Wire Atemi `Protocol Fuzz` to the existing `ProtocolFuzzPanel`.
2. Add sub-tabs inside SAGE for `Seeds`, `Mutation Operators`, and `Quarantine`.
3. Add Mitsuke sub-tabs for `Stream`, `Library`, and `Source Config`.
4. Surface `SystemPromptHardener` in Guard.
5. Add a visible `Consolidated Report` action.

### Next Tier

6. Add an `Orchestrator` workspace to Sengoku.
7. Expose `AgenticLab` as an experimental module.
8. Expose `Pattern Reference` from Scanner or Admin.
9. Add a visible `Verify Signature` action in Admin Validation.
10. Make the module visibility manager accessible from settings instead of only a secret sequence.
11. Add Atemi `Playbooks`.
12. Add Scanner `Module Diagnostics`.
13. Add Arena `Roster`, `Rules`, and `Stats`.
14. Add a `Library` view to Amaterasu DNA.
15. Add Kotoba `Workshop`.
16. Decide whether Bushido Book's alternate dashboard/export surfaces are active product features or dead code.

## Suggested Follow-up Work

If this audit is going to drive implementation, the cleanest delivery order is:

1. fix already-built-but-unmounted UI first
2. expose API-backed controls second
3. then tackle placeholder or mock-heavy surfaces

That sequence should unlock the most user-visible value with the least net-new design work.
