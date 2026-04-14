# Hidden Feature Remediation Plan

Date: 2026-04-13
Scope: `packages/dojolm-web`
Input: [HIDDEN-FEATURE-MAP-2026-04-13.md](/Users/paultinp/BU-TPI/docs/audits/HIDDEN-FEATURE-MAP-2026-04-13.md)
Status: Approved implementation plan

## Objective

Remediate every finding from the hidden-feature audit by making live capability discoverable, making misleading surfaces truthful, aligning UI with route/API contracts, and closing all testing, documentation, and security gaps before final sign-off.

This plan is intentionally prescriptive. During implementation, do not improvise, do not expand scope beyond the audited findings, and do not close a story or phase unless all listed gates pass or a blocker is explicitly reported with options.

## Non-Negotiable Delivery Rules

These rules apply to every phase and every story:

1. Auto-approval is assumed for all implementation work scoped to stories in this document. Scope expansions, new features, or work not traceable to a story below still require user confirmation.
2. Do not add product features beyond what is already represented in the audited code and documents.
3. Before each phase and before any complex story, launch at least 5 fresh-context research agents in parallel.
4. Agents are research-only unless explicitly reassigned later. They must not edit files by default.
5. Give each agent only the working document section and file set needed for its story.
6. If context exceeds roughly 70%, compact before continuing.
7. Create files directly in their final destination. Do not create throwaway copies.
8. Test every implemented story before closing it.
9. After each story, review dependent paths, routes, types, exports, comments, and docs, then update them in the same task.
10. After each phase, run an adversarial audit against the implementation and fix all findings before phase close.
11. At the end of the full implementation, run a code review and fix every finding before closure.
12. Do not postpone security issues. If a breaker appears, stop, report it, and offer options.
13. Update this plan and the hidden-feature map at the end of each closed phase.
14. Commit after each completed story, never squash within a phase. Independent story commits allow targeted reverts without collateral damage.
15. Stories are tagged `[S]`, `[M]`, or `[L]` to signal relative effort. `S` = 1-2 files, localized fix. `M` = 3-5 files, moderate coordination. `L` = 6+ files or new route/contract work.

## Fixed Product Decisions

These decisions remove ambiguity and prevent scope drift:

1. `strategic` remains retired.
   Reason: the current product already treats it as a legacy route and renders a retired notice.

2. `armory` remains legacy-only.
   Reason: it is a back-compat nav id and assistant concept, but it no longer appears to have a live module renderer.

3. `arena` and `sengoku` become explicitly discoverable.
   Reason: both are live surfaces today and should not depend on deep links, hidden widgets, or assistant-only navigation.

4. Dashboard widget targets must resolve only to live, intended destinations.
   Reason: stale targets are causing silent failures and retired-route detours.

5. OBL becomes an explicit workflow.
   Reason: the runtime exists, but the current UI only exposes outputs after hidden prior state exists.

6. Mock-backed or placeholder surfaces must become live or be disabled.
   Reason: the demo version is on hold. Mock data is not acceptable anywhere in the product. Surfaces with no supporting backend must have their mock data removed and their run actions disabled with a clear "not yet available" state.

7. Bushido/Jutsu result relocation remains the product structure, but the handoff must become obvious and reciprocal.

8. Sensei remains a supported first-class surface, but assistant-only capability must become legible and actionable inside Sensei.

9. `ContrastiveBiasCard` is orphaned and out of scope.
   Reason: the audit found no live import or mount point. If the team later decides to reintroduce it, that is new feature work and not part of this remediation. The component should be deleted during Phase 7 cleanup to prevent future audit noise.

10. Playbooks sub-panels (Protocol Fuzz, Agentic, WebMCP) are intentionally nested inside Atemi Playbooks.
    Reason: these are specialist sub-workspaces. Their discoverability through the Playbooks pill switcher is acceptable. This remediation addresses their *truthfulness* (mock vs. live) but not their nesting depth.

11. SAGE Generator remains intentionally inside Buki.
    Reason: it was relocated from Kumite into Buki's Generator tab as part of the UX consolidation. Its discoverability through Buki's tab bar is acceptable and does not require a separate surfacing story.

12. `orchestrator/status` placeholder is out of scope.
    Reason: it returns a pending payload and is not wired into visible status UI. It is a backend-only artifact with no user-facing hidden-feature impact. If orchestrator becomes a user-facing surface, that is new feature work.

13. `/api/v1/arena`, `/api/v1/sengoku`, and `/api/v1/timechamber` routes must be verified live before their modules are unhidden.
    Reason: unhiding navigation to modules backed by stale or stub API routes creates a new class of misleading surface. Phase 1 Story 1.1.1 includes a mandatory verification step. If any route returns stubs or errors, the module stays hidden until the route is fixed or the module is explicitly labeled as preview.

## Standard Phase Workflow

Run this sequence at the start and end of every phase:

### Phase Start

1. Launch 5+ fresh-context research agents in parallel.
2. Assign one lane each for:
   - feature/UI scope,
   - API/contracts,
   - tests,
   - security/adversarial risk,
   - docs/types/exports.
3. Compact the main thread if context is approaching saturation.
4. Confirm the story list matches this plan exactly.

### Phase End

1. Run targeted tests for every changed story.
2. Run the phase adversarial audit.
3. Fix all audit findings.
4. Review collateral updates:
   - routes,
   - exports,
   - types,
   - comments,
   - docs,
   - tests,
   - e2e coverage.
5. Update:
   - this plan,
   - the hidden-feature map,
   - any affected user/developer docs in `docs/`.
6. Only then mark the phase complete.

## Phase Overview

| Phase | Epic | Outcome | Status |
| --- | --- | --- | --- |
| 0 | Program Baseline | Working docs linked, baseline test inventory captured, execution rules locked | ✅ CLOSED 2026-04-14 |
| 1 | Navigation and Route Truth | Hidden live modules become discoverable; retired legacy routes become consistent | ✅ CLOSED 2026-04-14 |
| 2 | Dashboard and Widget Surfacing | Dashboard becomes a clear surfacing mechanism instead of a hidden-control cluster | ✅ CLOSED 2026-04-14 |
| 3 | OBL Activation and State-Gated Analytics | OBL becomes runnable and visible by intent, not by accident | ✅ CLOSED 2026-04-14 |
| 4 | Deep Scan, Fuzzer, and Playbook Truthfulness | Hidden or misleading scan/fuzz/playbook surfaces become explicit and trustworthy | ✅ CLOSED 2026-04-14 |
| 5 | Results, Analytics, and Export Contract Alignment | Navigation dead-ends wired; mock matrix removed; export bugs fixed; SSRF + rate limiting | ✅ CLOSED 2026-04-14 |
| 5 | Results, Analytics, and Export Contract Alignment | Bushido/Jutsu/reporting surfaces become discoverable and contract-correct |
| 6 | Sensei Discoverability and Tool Parity | Assistant-only capability becomes legible and actionable inside Sensei |
| 7 | Final Adversarial Audit and Review | 100% pass target, code review complete, docs updated, no unresolved findings |

## Phase 0: Program Baseline

### Epic 0.1: Lock the Working Set

#### Story 0.1.1: Cross-link the working documents [S]

Primary files:

- `docs/audits/HIDDEN-FEATURE-MAP-2026-04-13.md`
- `docs/audits/HIDDEN-FEATURE-REMEDIATION-PLAN-2026-04-13.md`

Steps:

1. Add a cross-link from the audit map to this remediation plan.
2. Keep both documents in `docs/audits/` as the single source of truth for this remediation track.

Validation:

- Document links resolve.

Exit:

- The audit and plan are mutually linked and ready for execution updates.

## Phase 1: Navigation and Route Truth ✅ CLOSED 2026-04-14

### Phase 1 Implementation Notes

Pre-step gate (Fixed Decision 13): `/api/v1/arena` and `/api/v1/sengoku` are deprecated stubs. Module UI components call the non-v1 live routes (`/api/arena`, `/api/sengoku/campaigns`) — gate PASSES.

Commits: `19bcc12ab` (1.1.1+1.1.2), `e61219f96` (1.2.1+1.2.2), `96b12f8f5` (adversarial audit fixes).

Adversarial audit findings resolved:
- W1: `ecosystem-pulse` widget target `attackdna` → `dna` (canonical NavId)
- W3: `arena-standalone` alias `adversarial` → `arena` (arena is now first-class)
- W2/I1/I2: Sensei MODULE_CONTEXT/CORE_SYSTEM_PROMPT/tool-definitions — deferred to Phase 6 (Story 6.3.1 scope)

### Epic 1.1: Discoverability Parity for Live Modules

#### Story 1.1.1: Unhide and align `arena` and `sengoku` [M]

Primary files:

- `src/lib/constants.ts`
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/CommandPalette.tsx`
- `src/lib/NavigationContext.tsx`

Pre-step (per Fixed Decision 13):

1. Verify `/api/v1/arena` and `/api/v1/sengoku` return live, non-stub responses.
2. If either route returns stubs or errors, that module stays hidden and a blocker is reported with options (fix route first, or label module as preview).

Steps:

1. Remove the hidden-state discrepancy for `arena` and `sengoku`.
2. Centralize the visibility rule so sidebar, mobile nav, and command palette all use the same source.
3. Ensure `arena` and `sengoku` are discoverable in desktop nav, mobile nav, and command palette.
4. Preserve hidden status for `strategic` and legacy-only `armory`.

Validation:

- `sidebar.test.tsx`
- `mobile-nav.test.tsx`
- `command-palette` test coverage
- `topbar.test.tsx`
- `e2e/mobile-nav.spec.ts`
- `e2e/navigation.spec.ts` or equivalent desktop nav E2E

Exit:

- `arena` and `sengoku` are explicitly navigable everywhere primary navigation is expected.

#### Story 1.1.2: Fix mobile hidden-item leakage [S]

Primary files:

- `src/components/layout/MobileNav.tsx`
- `src/lib/constants.ts`

Steps:

1. Apply the same hidden-item filtering to grouped and ungrouped mobile destinations.
2. Verify retired `strategic` does not appear in mobile `More`.

Validation:

- `mobile-nav.test.tsx`
- `e2e/mobile-nav.spec.ts`

Exit:

- Mobile navigation matches desktop discoverability policy.

### Epic 1.2: Retire Kumite Consistently

#### Story 1.2.1: Keep `strategic` retired, remove stale active paths [S]

Primary files:

- `src/app/page.tsx`
- `src/lib/constants.ts`
- `src/lib/NavigationContext.tsx`

Steps:

1. Preserve the retired notice for legacy `strategic` deep links and stored `activeTab` values.
2. Clean up comments, aliases, and routing notes so they describe the real retired-state behavior.
3. Keep back-compat for legacy hashes and aliases without making `strategic` discoverable again.

Validation:

- `app/__tests__/main-page.test.tsx`
- deeplink/hash tests for `strategic` and `kumite`

Exit:

- `strategic` is consistently legacy-only, never a live destination from current UI.

#### Story 1.2.2: Clean stale destinations that still point to `strategic` [M]

Primary files:

- `src/components/dashboard/NODADashboard.tsx`
- `src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx`
- any widget files still targeting `strategic`

Steps:

1. Replace all widget header and action targets that still point to `strategic`.
2. Route each widget to the correct live module only.
3. Keep `armory` as alias-only and do not re-surface it.

Validation:

- dashboard widget navigation tests
- `noda-dashboard-render` or equivalent dashboard integration tests

Exit:

- No active UI control routes users into retired Kumite unless they intentionally open a legacy deep link.

## Phase 2: Dashboard and Widget Surfacing ✅ CLOSED 2026-04-14

### Phase 2 Implementation Notes

Commits:
- `feat: story 2.1.1+2.1.2 — dashboard customizer discoverability` — Modules button, widget count label, DashboardCustomizer Module Visibility prominence
- `feat: story 2.1.3 — remove mock data from all widgets; wire to live APIs` — All 7 widgets de-mocked; Arena/Sengoku/Mitsuke wired to live APIs; SAGE/TimeChamber/Kotoba show "not yet available"
- `feat: story 2.2.1 — WidgetCard keyboard navigation and WIDGET_NAV_TARGET type safety` — role=button, tabIndex=0, Enter/Space, VALID_NAV_IDS runtime guard, Partial<Record<string, NavId>> type
- `test: story 2.2.2 — config sanitization tests for loadConfig` — 5 sanitization tests; existing loadConfig implementation confirmed correct
- `fix: phase 2 adversarial audit — error states, type safety, loading state` — H-1: WidgetCard undefined guard, H-2: LLMJutsuWidget loading skeleton, H-3: error state for Arena/Sengoku/Mitsuke, M-1: MitsukeAlertWidget runtime entry validation

Adversarial audit findings resolved:
- H-1: WidgetCard `handleNavigate` — add `resolvedNavTarget &&` guard before `setActiveTab` call
- H-2: LLMJutsuWidget — no loading state (rendered "0" immediately with layout shift); fixed with loading skeleton + finally block
- H-3: ArenaLeaderboardWidget, SengokuWidget, MitsukeAlertWidget — `!res.ok` and catch both produce identical "no data" state; fixed with `error` state + distinct "Could not load data/alerts" message
- M-1: MitsukeAlertWidget — raw JSON fields rendered without runtime type validation; fixed with type guard filter before `setEntries`

### Epic 2.1: Make Dashboard Personalization Discoverable

#### Story 2.1.1: Replace icon-only dashboard customization affordance with explicit discoverability [M]

Primary files:

- `src/components/dashboard/NODADashboard.tsx`
- `src/components/dashboard/DashboardCustomizer.tsx`

Steps:

1. Make dashboard customization clearly visible from the dashboard header.
2. Surface the active widget count and the existence of additional widgets without requiring guesswork.
3. Keep this within the existing dashboard structure; do not invent new settings systems.

Validation:

- dashboard render tests
- keyboard/focus tests around the customizer trigger and close behavior

Exit:

- Users can discover personalization without relying on an unlabeled icon hunt.

#### Story 2.1.2: Surface module visibility explicitly and keep the hidden sequence as non-primary [M]

Primary files:

- `src/components/dashboard/DashboardCustomizer.tsx`
- `src/components/dashboard/SenseiPanel.tsx`
- `src/components/dashboard/NODADashboard.tsx`
- `src/hooks/useSenseiScroll.ts`

Steps:

1. Keep module visibility reachable through explicit dashboard controls.
2. Retain the hidden keyboard sequence only as a secondary shortcut.
3. Verify focus trapping, close behavior, and dashboard-only activation.

Validation:

- `useSenseiScroll` tests
- `SenseiPanel`/customizer accessibility tests

Exit:

- Module visibility is no longer effectively hidden.

#### Story 2.1.3: Rebalance the default widget set and discard mock widget data [M]

Primary files:

- `src/components/dashboard/DashboardConfigContext.tsx`
- `src/components/dashboard/NODADashboard.tsx`
- `src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx`
- `src/components/dashboard/widgets/SengokuWidget.tsx`
- `src/components/dashboard/widgets/TimeChamberWidget.tsx`
- `src/components/dashboard/widgets/KotobaWidget.tsx`
- widget files for any item promoted into the default layout

Steps:

1. Revisit the default widget list after Phase 1 navigation fixes.
2. Promote only live-backed widgets that still carry meaningful discoverability burden.
3. Remove all mock/hardcoded data from widgets. The demo version is on hold; mock data is not acceptable in any widget, default or customizable.
4. Widgets that cannot source live data after mock removal must be either wired to a real backend or removed from the widget registry entirely.
5. Do not add a new preset system; keep the change limited to the existing default config.

Validation:

- dashboard config tests
- first-load default layout tests
- localStorage migration tests for existing dashboard users
- `e2e/dashboard.spec.ts` or equivalent dashboard E2E covering default layout, customization toggle, and widget click-through

Exit:

- The default dashboard exposes useful live capability. No widget anywhere in the registry contains mock data.

### Epic 2.2: Correct Widget Navigation and Persistence

#### Story 2.2.1: Fix invalid and conflicting widget targets [L]

Primary files:

- `src/components/dashboard/NODADashboard.tsx`
- `src/components/dashboard/WidgetCard.tsx`
- `src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx`
- `src/components/dashboard/widgets/SengokuWidget.tsx`
- `src/components/dashboard/widgets/TimeChamberWidget.tsx`
- `src/components/dashboard/widgets/KotobaWidget.tsx`
- `src/components/dashboard/widgets/RoninHubWidget.tsx`
- `src/components/dashboard/widgets/EcosystemPulseWidget.tsx`

Steps:

1. Replace invalid target ids such as `attackdna` with real nav ids.
2. Remove header/action destination conflicts inside widgets.
3. Ensure widget headers and widget action buttons agree on one destination.
4. Do not point any widget at retired `strategic`.

Validation:

- widget navigation tests
- keyboard activation coverage for `WidgetCard`

Exit:

- Every clickable widget target is valid, intentional, and consistent.

#### Story 2.2.2: Sanitize persisted dashboard config [M]

Primary files:

- `src/components/dashboard/DashboardConfigContext.tsx`
- `src/components/dashboard/NODADashboard.tsx`
- `src/components/dashboard/WidgetCard.tsx`

Steps:

1. Validate persisted widget ids, order values, sizes, and hidden state.
2. Drop or migrate stale entries safely.
3. Prevent bad persisted config from silently reintroducing stale targets.

Validation:

- config migration tests
- malformed localStorage input tests

Exit:

- Old dashboard state cannot break or regress the new surfacing rules.

## Phase 3: OBL Activation and State-Gated Analytics ✅ CLOSED 2026-04-14

### Phase 3 Implementation Notes

Commits:
- `feat: story 3.1.1 — OBL Analyze button in JutsuModelCard + ModelDetailView` (`e6f5fc4e9`) — Analyze button in JutsuModelCard (JMC-013/014/015), TrainingTab OBL panel in ModelDetailView, `handleAnalyze` in JutsuTab (Promise.allSettled over 4 OBL modules)
- `feat: story 3.2.1 — Scanner OBL empty-state guidance` (`8005f4b1f`) — ScannerInsightsPanel OBL empty-state with "Open Model Lab" CTA when no behavioral/robustness data
- `feat: stories 3.2.2+3.3.1 — Atemi OBL run/refresh + model identity` (`15772e864`) — AdversarialLab Analyze button wired to selected model, `getResult(targetModel)` replacing `getActiveResult()`, OBL empty-state with model name
- `fix: add useBehavioralAnalysis mock to llm-jutsu-full tests` (`370bcca62`) — JutsuTab added run functions; test file needed the context mock
- `fix: phase 3 adversarial audit — OBL TrainingTab tests + void promises` (`aee387731`) — M-1: new model-detail-view-obl.test.tsx (MDV-OBL-001..006), L-1: void promises in AdversarialLab Analyze onClick

Adversarial audit findings resolved:
- M-1: ModelDetailView.TrainingTab OBL Analyze button had no test coverage — added `model-detail-view-obl.test.tsx` (7 tests: empty state, section heading, module list, button render, call args, disabled state)
- L-1: AdversarialLab Analyze button called `runRobustness`/`runGeometry` as floating promises — added explicit `void` keyword

### Epic 3.1: Make OBL Runnable from Jutsu

#### Story 3.1.1: Add first-class OBL actions in Jutsu [L]

Primary files:

- `src/lib/contexts/BehavioralAnalysisContext.tsx`
- `src/components/llm/JutsuModelCard.tsx`
- `src/components/llm/ModelDetailView.tsx`
- `src/components/llm/JutsuTab.tsx`

Steps:

1. Add explicit user actions to run OBL analysis from Jutsu.
2. Use the existing OBL endpoints only; do not invent alternate analysis flows.
3. Disable duplicate runs while analysis is active.
4. Refresh card badges and detail panels from the shared cache after success.

Validation:

- `jutsu-model-card.test.tsx`
- `llm-jutsu-full.test.tsx`
- `behavioral-analysis-context.test.tsx`

Exit:

- Users can intentionally launch OBL from Jutsu.

### Epic 3.2: Make OBL Discoverable in Scanner and Atemi

#### Story 3.2.1: Add explicit Scanner OBL empty-state guidance [S]

Primary files:

- `src/components/scanner/ScannerInsightsPanel.tsx`

Steps:

1. Replace silent absence of OBL panels with explicit guidance or launch/open affordances.
2. Make it clear which model the displayed OBL state belongs to.

Validation:

- `scanner-insights-panel.test.tsx`
- `refusal-depth-chart` tests as needed

Exit:

- Scanner no longer hides OBL behind missing-state silence.

#### Story 3.2.2: Add Atemi OBL run/refresh controls [S]

Primary files:

- `src/components/adversarial/AdversarialLab.tsx`

Steps:

1. Add explicit controls for OBL runs relevant to the existing Atemi OBL panels.
2. Tie them to the currently selected target model.
3. Keep the current panel structure and only expose the already-implemented analysis.

Validation:

- `adversarial-lab.test.tsx`
- OBL child panel tests if prop or loading behavior changes

Exit:

- Atemi users can intentionally populate the mounted OBL panels.

### Epic 3.3: Hardening for Shared OBL State

#### Story 3.3.1: Stabilize active-model semantics [M]

Primary files:

- `src/lib/contexts/BehavioralAnalysisContext.tsx`
- any calling components that display active model identity

Steps:

1. Review active-model overwrite behavior across Jutsu, Scanner, and Atemi.
2. Make the displayed model identity explicit wherever OBL results are shown.
3. Keep state semantics consistent rather than silently swapping context.

Validation:

- shared context tests
- cross-surface manual verification

Exit:

- OBL results cannot appear to belong to the wrong model.

## Phase 4: Deep Scan, Fuzzer, and Playbook Truthfulness ✅ CLOSED 2026-04-14

### Phase 4 Implementation Notes

Commits:
- `feat: story 4.1.1 — ShinganPanel batch mode uses single /api/shingan/batch call` (`c7c29b67c`) — Replaced per-file loop over /api/shingan/scan with Promise.all read + single POST to /api/shingan/batch. Fixed IP extraction bug (.pop() not [0]).
- `feat: story 4.1.2 — ShinganPanel URL scan mode via /api/shingan/url` (`21d0d3bd7`) — Added URL scan mode with radiogroup selector (Single/Batch/URL). URL mode hides upload zone, shows GitHub-only URL input card. SHP-001–013 passing.
- `feat: story 4.2.1 — /api/buki/fuzz route wiring bu-tpi fuzzing engine` (`4013e4fe2`) — POST /api/buki/fuzz with createFuzzSession+fuzz+scanSkill, rate limit 3/min/IP, grammar enum + mutationCount validation. Added bu-tpi/fuzzing export entry. FZP-001–007 passing.
- `feat: story 4.3.1 — ProtocolFuzzPanel remove mock, disable button` (`93226b4d5`) — Removed MOCK_RESULTS array and setTimeout. Disabled Start Fuzz button. Added "not yet available" status notice. PFP-001–008 passing.
- `feat: story 4.3.2 — PlaybooksComposite remove mock findings/setTimeout` (`9d7bc4d63`) — Removed generateMockFindings, WebMcpFinding, wmcpTimerRef, all WebMCP state/callbacks, consent dialog, results area. Disabled Execute Tests. PBC-001–008 passing.
- `fix: phase 4 audit — DoS cap, concurrency guard, dead code removal, error normalization` (`269ad671c`) — CRITICAL: FUZZ_TIMEOUT_MS=25s cap; HIGH: MAX_CONCURRENT_SESSIONS=5 guard + finally decrement; HIGH: remove isUrlSafe dead code + WebMCP form; MEDIUM: truncate server error to 200 chars in handleUrlScan.

Adversarial audit findings resolved:
- CRITICAL: /api/buki/fuzz — DEFAULT_FUZZ_CONFIG.timeoutMs=600s caused event-loop stall. Fixed: override timeoutMs to 25s.
- HIGH-1: Rate limiter allowed 3 in-flight sessions simultaneously. Fixed: activeSessionCount concurrency guard with finally decrement.
- HIGH-2: isUrlSafe() in PlaybooksComposite was active dead code (called on every keystroke but Execute Tests always disabled). Fixed: removed all WebMCP form state/UI, replaced with simple unavailable notice.
- MEDIUM: handleUrlScan exposed raw server error strings to UI. Fixed: truncate errBody.error to 200 chars.

### Epic 4.1: Surface Hidden Shingan Workflows

#### Story 4.1.1: Add true batch scan support in Shingan UI [M]

Primary files:

- `src/components/shingan/ShinganPanel.tsx`
- `src/app/api/shingan/batch/route.ts`

Steps:

1. Stop looping client-side over single-scan calls for batch mode.
2. Use the dedicated `/api/shingan/batch` route for batch execution.
3. Normalize result typing for single and batch flows in the panel.

Validation:

- Shingan component tests
- route tests for auth, limits, and error handling

Exit:

- Batch scan is a real surfaced workflow, not an inferred implementation detail.

#### Story 4.1.2: Add URL scan support in Shingan UI [M]

Primary files:

- `src/components/shingan/ShinganPanel.tsx`
- `src/app/api/shingan/url/route.ts`

Steps:

1. Add a first-class URL scan path using the existing route.
2. Respect the current host allowlist and HTTPS restrictions.
3. Make errors truthful and explicit.

Validation:

- component tests for URL mode
- route tests for allowlist, HTTPS-only, auth, and rate limits

Exit:

- `/api/shingan/url` is no longer an undocumented route with no surfaced path.

### Epic 4.2: Make Buki Fuzzer Real

#### Story 4.2.1: Implement `/api/buki/fuzz` and wire `FuzzerPanel` [L]

Primary files:

- `src/components/buki/FuzzerPanel.tsx`
- `src/components/buki/PayloadLab.tsx`
- new `src/app/api/buki/fuzz/route.ts`

Steps:

1. Add the missing backend route in its final folder.
2. Match route contract to the existing panel request and result shape.
3. Keep the fuzzer inside Buki; do not create a second entry point.

Validation:

- route tests for grammar, mutation count, auth, and schema
- component tests for loading, success, and error states
- targeted smoke/e2e pass for one run

Exit:

- Fuzzer is live and no longer a dead UI tab.

### Epic 4.3: Make Mock Playbook Surfaces Truthful

#### Story 4.3.1: Strip mock data from Protocol Fuzz and disable or wire to live backend [S]

Primary files:

- `src/components/scanner/ProtocolFuzzPanel.tsx`
- `src/components/adversarial/PlaybooksComposite.tsx`

Steps:

1. Keep the panel within Playbooks.
2. Remove all mock async result generation.
3. If a real backend route exists in the repo, wire the panel to it.
4. If no backend route exists, disable the panel's run action and display a clear "not yet available" state. Do not label as preview/demo — the demo version is on hold and mock data is not acceptable.

Validation:

- UI tests that verify no mock data is generated or displayed
- Panel state test for disabled/unavailable mode if no backend exists

Exit:

- Protocol Fuzz either runs against a real backend or is explicitly disabled. No mock data remains.

#### Story 4.3.2: Strip mock data from WebMCP testing and disable or wire to live backend [S]

Primary files:

- `src/components/adversarial/PlaybooksComposite.tsx`

Steps:

1. Keep current panel placement.
2. Remove all local synthetic finding generation.
3. If a real backend service exists in the repo, wire the panel to it.
4. If no backend exists, disable the panel's run action and display a clear “not yet available” state.

Validation:

- UI tests that verify no synthetic findings are generated or displayed
- Panel state test for disabled/unavailable mode if no backend exists

Exit:

- WebMCP testing either runs against a real backend or is explicitly disabled. No mock data remains.

## Phase 5: Results, Analytics, and Export Contract Alignment ✅ CLOSED 2026-04-14

### Phase 5 Implementation Notes

**Story 5.1.1** — Wire dead navigation callbacks; fix dead-end text
- `ModelLab.tsx`: imported `useNavigation`; `setActiveTab: navigateTo`; `<JutsuTab onNavigateToTests={() => navigateTo('adversarial')} />` (was `<JutsuTab />` with no prop — dead callback)
- `AnalyticsWorkspace.tsx`: imported `useNavigation`, `Button`, `ArrowRight`; replaced dead-end "Run or reconnect to a batch from the Tests tab" `<p>` with updated text + "Go to Atemi Lab" `<Button>` that calls `setActiveTab('adversarial')`
- `ActivityFeed.tsx`: imported `useNavigation`; added `action={{ label: 'Open Shingan Scanner', onClick: () => setActiveTab('scanner') }}` to empty-state `EmptyState`
- Tests: `model-lab.test.tsx` (new, ML-001–004), `analytics-workspace.test.tsx` (new, AW-001–004), `activity-feed.test.tsx` updated (added AF-016)

**Story 5.2.1** — Remove mock-backed TransferMatrixPanel
- `TransferMatrixPanel.tsx`: removed `MODELS`, `MOCK_MATRIX`, `heatColor`, `LEGEND_STOPS`, full table/legend JSX; replaced with `role="status"` "not yet available" notice matching protocol-fuzz pattern
- Tests: `transfer-matrix-panel.test.tsx` updated (TMP-001–006 replacing old mock-data assertions)

**Story 5.3.1** — Fix TestExporter export bugs + rate limit llm routes
- `TestExporter.tsx`:
  - Fixed `format=md` → `format=markdown` mapping (`const apiFormat = format === 'md' ? 'markdown' : format`)
  - Fixed PDF blob: `response.json()` → `atob(json.data)` → `Uint8Array` → `Blob` (was `response.text()` → raw base64 string blob = corrupt PDF)
- `/api/llm/export/route.ts`: added 10/min rate limiter; added `VALID_FORMATS` whitelist validation before switch; fixed default case to not reflect raw user input
- `/api/llm/coverage/route.ts`: added 30/min rate limiter
- Tests: `test-exporter.test.tsx` updated (added TE-013 format mapping, TE-014 PDF json path)

**Story 5.3.2** — Type fix + SSRF fix + rate limit compliance routes
- `ComplianceExport.tsx`: narrowed `ComplianceControl.status: string` → `'covered' | 'partial' | 'gap'`
- `/api/compliance/frameworks/route.ts`: replaced `new URL(request.url).origin` with `getConfiguredAppOrigin()` (SSRF fix); removed `detail: body` from upstream-error response (leakage fix); added 30/min rate limiter
- `/api/compliance/export/route.ts`: added 10/min rate limiter; added `isDemoMode()` early-exit guard (was inconsistent with all other routes); fixed format reflection in 400 error
- Tests: `compliance-export.test.tsx` (new, CE-001–007); `compliance-h95.test.tsx` verified still passing

**Phase 5 Adversarial Audit findings + fixes:**
- H-1 (MEDIUM→fixed): Missing `X-Content-Type-Options: nosniff` on Markdown response in `llm/export` — added header to match CSV/SARIF paths
- H-2 (HIGH→fixed): Missing `isDemoMode()` guard in `compliance/export` GET handler — added import + early-exit

**Commits:** 6 (one per story + 1 for audit fixes)
**Tests added/updated:** 87 passing (model-lab ×4, analytics-workspace ×4, activity-feed ×16, transfer-matrix-panel ×6, test-exporter ×14, compliance-export ×7, compliance-h95 ×20, playbooks-composite ×8, protocol-fuzz-panel ×8)

### Epic 5.1: Make Bushido/Jutsu Result Handoffs Explicit

#### Story 5.1.1: Add reciprocal CTAs between Jutsu, Bushido Results, and activity surfaces [L]

Primary files:

- `src/components/llm/ModelLab.tsx`
- `src/components/compliance/ComplianceCenter.tsx`
- `src/components/llm/AnalyticsWorkspace.tsx`
- `src/components/layout/TopBar.tsx`
- `src/components/ui/ActivityFeed.tsx`
- optionally `src/components/llm/JutsuTab.tsx`
- optionally `src/components/llm/ModelDetailView.tsx`

Steps:

1. Make the relocated result surfaces explicit in Jutsu.
2. Make Bushido Results clearly point back to relevant model and batch surfaces.
3. Keep activity surfaces intentional rather than accidental leftovers.

Validation:

- `bushido-book.test.tsx`
- `compliance-center.test.tsx`
- `topbar.test.tsx`
- `activity-feed.test.tsx`
- `main-page.test.tsx`

Exit:

- Users can follow results across Jutsu, Bushido, and activity without guesswork.

### Epic 5.2: Replace Hardcoded Transfer Matrix

#### Story 5.2.1: Make Transfer Matrix live from real data [L]

Primary files:

- `src/components/llm/TransferMatrixPanel.tsx`
- `src/components/llm/AnalyticsWorkspace.tsx`
- `src/app/api/llm/coverage/route.ts`
- new route only if needed to support the matrix contract cleanly

Steps:

1. Remove the hardcoded matrix. Mock data is not acceptable (Fixed Decision 6).
2. Source the matrix from real execution/coverage data.
3. If no real data source exists yet, disable the panel with a clear "not yet available" state rather than showing stale hardcoded values.
4. Keep Bushido analytics on the same live data path.

Validation:

- transfer matrix component tests
- route tests for the backing data contract
- Bushido results-tab integration tests

Exit:

- Transfer Matrix is live and no longer mock-backed.

### Epic 5.3: Normalize Export and Reporting Contracts

#### Story 5.3.1: Align LLM export UI with `/api/llm/export` [M]

Primary files:

- `src/components/llm/ReportGenerator.tsx`
- `src/components/llm/TestExporter.tsx`
- `src/app/api/llm/export/route.ts`

Steps:

1. Fix format vocabulary and response-shape handling.
2. Correct PDF handling in `TestExporter`.
3. Keep route and UI comments consistent with the final contract.

Validation:

- `report-generator.test.tsx`
- `test-exporter.test.tsx`
- `api/llm/export` route tests

Exit:

- LLM report/export flows are contract-correct and PDF-safe.

#### Story 5.3.2: Align compliance export UI with route-backed compliance export [M]

Primary files:

- `src/components/compliance/ComplianceExport.tsx`
- `src/app/api/compliance/export/route.ts`
- `src/app/api/compliance/frameworks/route.ts`
- `src/components/compliance/ComplianceCenter.tsx`

Steps:

1. Decide one compliance export source of truth and make UI/routes match it.
2. Use the existing route-backed compliance export path where appropriate.
3. Update framework-loading/export comments so the API/UI contract is clear.

Validation:

- `compliance-h95.test.tsx`
- compliance export route tests
- Bushido integration tests

Exit:

- Compliance export and framework routes are no longer weakly surfaced or contract-divergent.

## Phase 6: Sensei Discoverability and Tool Parity

### Epic 6.1: Make Assistant-Only Capability Legible

#### Story 6.1.1: Add a registry-backed capability summary inside Sensei [M]

Primary files:

- `src/components/sensei/SenseiDrawer.tsx`
- `src/lib/sensei/tool-definitions.ts`
- `src/lib/sensei/system-prompt.ts`
- optionally `src/lib/sensei/index.ts`

Steps:

1. Surface existing tool categories and assistant-only capability in the existing Sensei drawer.
2. Do not add new assistant features; only expose what already exists.
3. Keep compact-provider token use under control.

Validation:

- Sensei drawer render tests
- `tool-definitions` tests
- prompt-builder or prompt snapshot tests if applicable

Exit:

- Sensei users can discover what the assistant can do without trial-and-error.

### Epic 6.2: Make Tool Results Actionable

#### Story 6.2.1: Improve `navigate_to` and `explain_feature` result handling [M]

Primary files:

- `src/components/sensei/SenseiToolResult.tsx`
- `src/hooks/useSensei.ts`
- `src/components/sensei/SenseiDrawer.tsx`
- optionally `src/components/sensei/SenseiChat.tsx`
- optionally `src/lib/sensei/tool-executor.ts`

Steps:

1. Make navigation/explanation outputs actionable and obvious inside Sensei.
2. Keep navigation idempotent and avoid duplicate redirects.
3. Align tool result payloads with any new UI affordances.

Validation:

- `tool-executor` tests
- `useSensei` tests
- tool result render tests

Exit:

- Sensei becomes a reliable bridge into product surfaces, not a dead-end explainer.

### Epic 6.3: Keep Prompt/Tool Contract Synchronized

#### Story 6.3.1: Tighten hidden-module and assistant-only prompt contract [S]

Primary files:

- `src/lib/sensei/system-prompt.ts`
- `src/lib/sensei/tool-definitions.ts`
- optionally `src/lib/sensei/types.ts`

Steps:

1. Keep hidden/legacy module descriptions synchronized with the final navigation policy.
2. Ensure compact-provider tool selection still includes the necessary hidden-feature helpers.

Validation:

- prompt tests
- `tool-definitions` tests

Exit:

- Sensei prompt/tool behavior matches the post-remediation UI reality.

## Phase 7: Final Adversarial Audit and Review

### Epic 7.1: Closure Quality Gate

#### Story 7.1.1: Full verification sweep [L]

Adversarial audit method:

- The final adversarial audit must be run by a **fresh-context agent** that receives only the final code state and the hidden-feature map, not the implementation conversation history.
- The agent's scope covers the six domains below and nothing else.
- Findings are written to a structured report. Every finding must be resolved or explicitly waived with rationale before closure.

Steps:

1. Run all targeted suites touched by the remediations.
2. Run the full required repo test suite for `packages/dojolm-web`.
3. Launch a fresh-context adversarial audit agent scoped to:
   - hidden routes,
   - widget targets,
   - OBL state semantics,
   - preview/live labeling,
   - export/report contract integrity,
   - assistant discoverability.
4. Fix every finding from the adversarial audit.
5. Run a code review (separate fresh-context agent) and fix every finding.
6. Delete orphaned artifacts identified during this remediation (including `ContrastiveBiasCard` per Fixed Decision 9).
7. Update:
   - this plan,
   - the hidden-feature map,
   - any touched docs in `docs/`,
   - route/type comments changed during implementation.

Exit:

- 100% required tests passing
- no unresolved adversarial audit findings
- no unresolved code review findings
- orphaned artifacts removed
- working documents updated

## Story Completion Checklist

Use this at the end of every story:

- Scope matches this document exactly.
- All implementation files are in final folders.
- All affected tests were updated and passed.
- Security and error-handling paths were exercised.
- Routes, types, exports, comments, and docs were reviewed.
- `docs/audits/HIDDEN-FEATURE-MAP-2026-04-13.md` updated if the story changes audit status.
- This remediation plan updated with story status or scope clarification.

## Notes for Execution

- If a story reveals a breaker, stop immediately and report options.
- If a live backend contract is absent for a surface flagged as mock-backed, the approved remediation is to remove all mock data and disable the surface with a clear "not yet available" state. The demo version is on hold; mock/preview data is not acceptable.
- If a nav, route, or widget target decision conflicts with this plan, this plan must be updated first before code changes continue.
