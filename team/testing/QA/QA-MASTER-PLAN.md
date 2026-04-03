# QA Master Plan

This document is the top-level source of truth for testing and QA work in this repo.
Use it to identify scope, choose the correct supporting plan, run the right checks, refresh live inventories, and record evidence.

## System Of Record

| Artifact | Role | Update Trigger |
| --- | --- | --- |
| [QA-MASTER-PLAN.md](QA-MASTER-PLAN.md) | Top-level QA control document and doc map | When process, ownership, or testing workflow changes |
| [QA-COVERAGE-MATRIX.generated.md](QA-COVERAGE-MATRIX.generated.md) | Live code, export/symbol, route, package, and risk inventory for QA coverage | When source files, tests, routes, exports, or packages change |
| [UAT-UX-COVERAGE-MATRIX.generated.md](UAT-UX-COVERAGE-MATRIX.generated.md) | Live module, submodule, page, layout, widget, component, and actionable-control inventory for UAT/UX coverage | When nav, modules, pages, controls, components, widgets, or Playwright coverage change |
| [../guides/QA-PROCEDURES.md](../guides/QA-PROCEDURES.md) | Standard QA operating flow | When the execution process changes |
| [../plans/testing-execution-checklist.md](../plans/testing-execution-checklist.md) | Ordered execution checklist and common commands | When commands or required checks change |
| [../plans/security-test-plan.md](../plans/security-test-plan.md) | Security testing entry point | When security scope or procedure changes |
| [../plans/uat-ux-testing-plan.md](../plans/uat-ux-testing-plan.md) | UAT/UX policy, Playwright-first rules, and UX coverage standards | When UAT/UX policy changes |
| [../plans/scanner-testing-plan.md](../plans/scanner-testing-plan.md) | Scanner-specific planning entry point | When scanner scope or coverage strategy changes |
| [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) | Runtime/package/module inventory baseline | When package boundaries, APIs, or module nesting change |
| [../../../docs/user/PLATFORM_GUIDE.md](../../../docs/user/PLATFORM_GUIDE.md) | User-visible module and workflow inventory baseline | When live UX labels, modules, or workflows change |
| [../../../docs/user/modules/README.md](../../../docs/user/modules/README.md) | Module and submodule guide index | When module tabs, modes, or submodule docs change |
| [QA-Log/README.md](QA-Log/README.md) | QA evidence and execution-log index | When QA artifact routing changes |
| [security/README.md](security/README.md) | QA-side security artifact index | When security artifact routing changes |

## 100% Coverage Standard

- 100% inventory coverage means every current module, documented submodule, tab, mode, standalone page, boundary, layout shell, widget, interactive component, actionable control, API route, exported symbol, hook, library surface, storage touchpoint, and cross-package integration is present in the correct live inventory or explicitly documented as internal-only. If a high-complexity file changes private helper logic that is not individually enumerated in the matrices, call that function-level review out in the QA log.
- 100% execution coverage means each changed surface has the required runner, checks, and evidence path defined across QA, UAT, UI, UX, security, and integration dimensions before release.
- 100% traceability target — known exceptions documented: `docs/ARCHITECTURE.md`, `docs/user/PLATFORM_GUIDE.md`, the module guides under `docs/user/modules/`, `NAV_ITEMS`, and the generated matrices all describe the same live product surface and labels. Accepted UX conventions: `Leaderboard` truncates to `Board` in tab bars; `Battle Arena` truncates to `Arena`; `Amaterasu DNA` truncates to `DNA`; `Reports` was formerly documented as `deliverables` in some module docs.
- Playwright is the default runner for browser-automatable UAT/UX work. Manual visual or device checks are supplements, not substitutes, when the matrix marks a hybrid runner.
- Buttons, icon buttons, links, tabs, dropdown actions, drawer toggles, accordions, select triggers, row actions, pagination controls, search triggers, submit buttons, and recovery CTAs all count as first-class QA scope. A control hidden behind a tab, menu, or drawer is still in scope.
- Shared UX changes count as cross-module scope. Treat changes to layout chrome, navigation, shared design primitives, dashboard composition, scanner layout, LLM management surfaces, and `/style-guide` as user-facing coverage changes even when the work spans many components instead of one page.
- Admin and operational surfaces with interactive reporting, results viewers, or calibration state also count as user-facing coverage changes when they change workflow, layout, or data presentation.
- Auth-boundary changes count as both security and user-facing scope when browser workflows depend on explicit public `GET` APIs. Verify protected routes stay closed while intended browser-readable routes remain available.
- Historical documents in `team/testing/QA/archive/` are references only. They do not override this plan or the generated matrices.

## Coverage Dimensions

| Dimension | Required Question | Minimum Evidence |
| --- | --- | --- |
| QA baseline | Is the changed code, route, export, and package surface inventoried and assigned coverage? | Updated QA matrix row, runner assignment, QA log link |
| UAT | Can a real user complete the primary path and a recovery path for the changed workflow in the target environment? | Playwright run or explicit gap log tied to the inventory row |
| UI | Are labels, visual states, layout, responsiveness, and presentation truthful and stable on desktop and mobile? | Screenshot or manual visual note for the affected primary surfaces |
| Artwork / visual regression | Are visual treatments, charts, iconography, spacing, and branded presentation stable relative to baseline? | Screenshot evidence plus visual-regression result (or explicit gap waiver) |
| UX | Do focus order, keyboard access, discoverability, disabled/loading/error states, and no-false-affordance rules hold for every changed control? | UAT/UX matrix control review and QA notes |
| Security | Are auth, validation, data exposure, rate limits, storage writes, and model-safety boundaries still correct? | Security plan mapping and security artifact path |
| Integration | Do APIs, shared state, storage, navigation, and cross-module side effects still work together? | Direct or indirect coverage noted in the QA matrix and release evidence |
| Provisioning / deploy dry run | Can deployment and runtime provisioning be validated in dry-run/safe-check mode before mutation? | Dry-run checklist execution, compose config validation, and preflight log artifact |

## Inventory Sources And Traceability

- Use [QA-COVERAGE-MATRIX.generated.md](QA-COVERAGE-MATRIX.generated.md) for source files, exported symbols, hooks, libs, API handlers, risk tags, and missing-check recommendations.
- Use [UAT-UX-COVERAGE-MATRIX.generated.md](UAT-UX-COVERAGE-MATRIX.generated.md) for modules, pages, layout shells, widgets, interactive components, actionable controls, and Playwright/UAT/UX gaps.
- Treat generated matrix linkages and spec references as inventory signals, not as sufficient execution evidence by themselves.
- Use [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) as the package/runtime truth for module nesting, API families, and storage boundaries.
- Use [../../../docs/user/PLATFORM_GUIDE.md](../../../docs/user/PLATFORM_GUIDE.md) and [../../../docs/user/modules/README.md](../../../docs/user/modules/README.md) as the user-facing truth for module names, submodules, tabs, modes, and workflows.
- Use `packages/dojolm-web/src/lib/constants.ts` as the top-level navigation source of truth.
- If a changed label, tab, mode, route, or control exists in code but not in the relevant inventory doc or matrix, the change is not at 100% coverage yet.

## Adversarial Guardrails

- Generated matrix references, import linkages, route string matches, and spec text matches are planning signals. They do not replace execution evidence, screenshots, traces, or QA notes at release time.
- The QA matrix is file-level and exported-symbol oriented. Private helper functions inside a file are not individually trace-mapped today, so complex file changes still require a manual function-level review note.
- The UAT/UX control inventory is static-source derived. Controls emitted only through runtime data, portals, third-party widgets, or expression-only labels require a manual addendum when they change.
- Actionable control rows currently inherit parent-surface references until a direct control-to-test mapping layer exists. Treat inherited references as scope indicators, not as proof that a specific button, tab, or row action was asserted.
- When multiple branded modules or journeys share one render file, require per-label evidence. One sibling label's spec reference does not prove the other label's copy, tabs, CTAs, or recovery path.
- Active framework docs and generators under `team/testing/` now have a tracked subset enforced by CI freshness checks (`qa-framework-freshness`). If a QA artifact is outside the tracked subset, treat it as local-process only until mirrored into a tracked path.
- Public client env values such as `NEXT_PUBLIC_*` are build-time inputs. For deploys and production UAT, verify the browser bundle uses the intended public or relative URLs and that local `.env.*` files did not leak into the build context.
- Deployment evidence must prove the running container uses the intended tagged image or SHA. Do not assume `docker compose up` used the desired artifact unless the compose file or logs prove it.
- Runtime storage claims must be verified in-container. If a volume path, storage backend, or native module is configured but not actually used by the running app, treat that as an open deployment risk until corrected or explicitly documented.

## Required Workflow

1. Classify the change scope and coverage dimensions.
   Map each changed item to the relevant module, submodule, page, API, export, and actionable control.
   Use the QA coverage matrix for code, routes, libraries, exports, and package-level drift.
   Use the UAT/UX plan and matrix for user-facing journeys, modules, pages, components, widgets, controls, navigation, and Playwright coverage.
   Map the changed scope to the applicable module epic IDs in `Module-By-Module Coverage Epics` below. If no epic covers the live surface, write the missing epic before release.
   Use the security plan when auth, input handling, data exposure, or model-safety posture changes.
   Use the scanner plan when the change is scanner-specific.
2. Reconcile inventory sources before release.
   Verify the generated matrices, `docs/ARCHITECTURE.md`, `docs/user/PLATFORM_GUIDE.md`, module guides, and live UI language all agree on the changed scope.
   For changed exports, hooks, or libs, review the QA matrix `Symbols`, `Risks`, and `Missing Checks` columns.
   For changed user-facing work, review the UAT/UX matrix module, component, and actionable-control sections.
3. Refresh live inventories.
   Run `node team/testing/tools/generate-coverage-matrix.mjs`.
   Run `node team/testing/tools/generate-uat-ux-matrix.mjs` for any user-facing or Playwright-relevant change.
4. Assign runners and evidence before execution.
   Each changed surface must have explicit QA, UAT, UI/UX, artwork/visual, security, integration, and provisioning expectations before release.
   Check adversarial blindspots for the changed scope: shared render files, inherited-only control references, unlabeled or expression-only controls, and complex file-level rows with changed private helper logic.
   For deploys or production-environment work, also assign deploy-parity checks: public env injection, image selection, published port mapping, runtime storage path and backend, SSRF policy for intended provider targets, and fail-closed unsupported-method behavior.
   For deployment work, assign dry-run validation commands before any mutating deploy command.
   If a changed control or route cannot yet be automated, log the gap with owner, reason, and evidence plan.
5. Execute relevant automated checks.
   Run unit and integration tests for changed packages.
   Run type-check for changed packages, and run the repo-level `npm run type-check` when package boundaries or shared contracts change.
   Run Playwright for browser-automatable workflows.
   Run a production build for user-facing shell, layout, navigation, design-system, or shared component changes.
   Run security-specific procedures for security-sensitive changes.
   For auth, CORS, origin-trust, or rate-limit changes, verify both deny-path and allow-path behavior: protected APIs reject unauthenticated access, explicit public browser-readable `GET` routes still load, and normal UI reads do not self-throttle under expected page-load concurrency.
6. Perform targeted manual validation where required.
   Follow matrix runner guidance for `Playwright + manual visual` and `Playwright + manual device` surfaces.
   For shared UX polish changes, record desktop and mobile visual validation for the affected primary surfaces.
   For each changed control, verify label clarity, focus/keyboard access, disabled/loading/error behavior, and truthful affordance.
7. Capture evidence and findings.
   Write QA logs to `team/testing/QA/QA-Log/`.
   Write security artifacts to `team/testing/QA/security/audit-results/`.
   Write formal assessment outputs to `docs/app/testing-results/`.
8. Close the release gate.
   Ensure changed modules, submodules, pages, APIs, exports, and controls are present in the appropriate matrix.
   Ensure the supporting plan links remain valid and no current work depends on archived docs as a source of truth.
   Ensure no changed user-facing control is missing from the actionable-control inventory or left with an unexplained manual-label audit entry.

## Shared UX Trigger Set

Apply the following minimum QA set when the change touches shared visual language or app-shell behavior instead of a single isolated feature.

- Examples: sidebar or mobile navigation, page or module headers, shared buttons/cards/surfaces, dashboard hero/layout changes, scanner split-pane layout, LLM model-management cards, admin validation/reporting surfaces, and `/style-guide`.
- Expand the scope to every affected actionable control, not just the parent surface. Inventory visible and hidden actions inside tabs, drawers, menus, accordions, row actions, and empty states.
- Confirm shared controls are truthful.
  Do not ship inert search fields, dead shortcuts, or placeholder actions presented as active UI.
- Refresh both generated matrices:
  `node team/testing/tools/generate-coverage-matrix.mjs`
  `node team/testing/tools/generate-uat-ux-matrix.mjs`
- Review the actionable-control inventory and manual-label audit queue after regeneration. Changed controls must either have an accessible name or an explicit QA note explaining the exception.
- Run package-level automated coverage for the changed web surface and a production build:
  `npm run type-check --workspace=dojolm-web`
  `npm test --workspace=dojolm-web`
  `npm run build --workspace=dojolm-web`
- Run Playwright for browser-automatable journeys or explicitly log the coverage gap if the matrix still marks the surface as pending.
- Record desktop and mobile visual validation for affected primary surfaces.
- Validate every changed control for visible label or accessible name, enabled/disabled/loading behavior, keyboard access, focus order, empty/error/recovery state, and correct navigation or side effect.
- For cautious UX rollouts, verify route IDs, nav IDs, widget IDs, tab IDs, and persisted storage keys stay stable unless the change was explicitly approved as a compatibility break.
- When branded navigation or module language changes, confirm the glossary and module-guide crosswalk still match the UI language shown to users.
- If `/style-guide` changes, verify it renders in development and remains blocked from production access through the production build behavior.

## Testing Step Map

| Step | Primary Doc | Output |
| --- | --- | --- |
| Scope intake and standard flow | [../guides/QA-PROCEDURES.md](../guides/QA-PROCEDURES.md) | QA scope and minimum checks identified |
| Product and architecture inventory cross-check | This document + [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) + [../../../docs/user/PLATFORM_GUIDE.md](../../../docs/user/PLATFORM_GUIDE.md) | Modules, submodules, and docs aligned with live scope |
| Code and route coverage audit | [QA-COVERAGE-MATRIX.generated.md](QA-COVERAGE-MATRIX.generated.md) | Live QA gap register refreshed |
| UAT/UX and Playwright planning | [../plans/uat-ux-testing-plan.md](../plans/uat-ux-testing-plan.md) | Runner assignment and UX coverage rules applied |
| User-facing surface and control inventory | [UAT-UX-COVERAGE-MATRIX.generated.md](UAT-UX-COVERAGE-MATRIX.generated.md) | Live UAT/UX and actionable-control gap register refreshed |
| Shared UX or design-system change | This document + [../plans/uat-ux-testing-plan.md](../plans/uat-ux-testing-plan.md) | Cross-module UX checks, build gate, and visual validation applied |
| Execution sequence | [../plans/testing-execution-checklist.md](../plans/testing-execution-checklist.md) | Ordered test execution completed |
| Security validation | [../plans/security-test-plan.md](../plans/security-test-plan.md) | Security artifacts and findings captured |
| Scanner-specific planning | [../plans/scanner-testing-plan.md](../plans/scanner-testing-plan.md) | Scanner coverage/story updates applied |
| QA evidence logging | [QA-Log/README.md](QA-Log/README.md) | QA reports and handoff notes stored |

## Epic Authoring Rules

- Each module epic must bind to live inventory rows in [UAT-UX-COVERAGE-MATRIX.generated.md](UAT-UX-COVERAGE-MATRIX.generated.md) and, when code or APIs are involved, the related rows in [QA-COVERAGE-MATRIX.generated.md](QA-COVERAGE-MATRIX.generated.md).
- Each epic must declare the exact menu, tab, drawer, modal, wizard step, mode, control family, and API or storage side effect it covers. Hidden or secondary actions are not optional scope.
- Each epic must include both a success path and at least one recovery or deny path. A flow is not complete if it only proves the happy path.
- Each epic must state the expected system outcome, not just the expected click result. If the UI says it launched a scan, match, batch, export, validation run, or campaign, the evidence must show that the promised result set, artifact, audit event, or downstream state actually exists.
- Each epic must include UI and UX assertions: visible label or accessible name, keyboard path, focus order, disabled/loading/error states, responsiveness, and no false affordance.
- Each epic must include cross-module truth checks when the action hands off state to another module, such as Armory to Scanner, Bushido Book to LLM Dashboard, Kotoba to LLM Dashboard, or Admin setup to model execution.
- Combinatorial workflows must expand to a scenario matrix. Sampling is not 100% coverage when the live product exposes explicit modes, thresholds, categories, or tabs.
- Placeholder or planned surfaces still require epics. Their expected outcome is a truthful non-interactive empty or planned state, not fake readiness.

## Module-By-Module Coverage Epics

### Global Navigation And Shared Shell

- `SHELL-001 | Desktop sidebar and grouped navigation`
  Steps: cover `Dashboard`, grouped sections `Attack`, `Defense`, `Red Team`, and `Analysis`, every live `NAV_ITEMS` entry, active-state styling, hover or tooltip behavior, collapse or expand behavior, and Admin placement.
  Expected outcome: every desktop navigation item opens the correct module, group labels match the current product vocabulary, active state follows the visible workspace truthfully, and collapse does not hide reachable actions without an alternative label path.
- `SHELL-002 | Mobile navigation and More drawer`
  Steps: cover all primary mobile-nav items, the `More` drawer, drawer open and close, overlay click, close button, `Escape`, focus trap, drawer group labels, and selection of every non-primary nav item from the drawer.
  Expected outcome: mobile navigation exposes the same live module set as desktop navigation, the drawer behaves like a real modal surface, focus returns correctly on close, and choosing an item both navigates and dismisses the drawer.
- `SHELL-003 | Shared page toolbar and module chrome`
  Steps: cover shared page titles, toolbar actions, breadcrumbs where present, guide drawers, onboarding drawers, configuration drawers, and back-navigation controls exposed across modules.
  Expected outcome: shared chrome always reflects the active module or subsystem, toolbar actions never leak stale context from a prior module, and drawer-based menus remain keyboard reachable and visually truthful on desktop and mobile.
- `SHELL-004 | Shared state, alias, and recovery behavior`
  Steps: cover refresh, deep-link entry, retired nav alias resolution, loading states, error states, auth-boundary states, and any changed `/style-guide` or shared design-system route whenever shell primitives are touched.
  Expected outcome: shared-shell routing resolves old aliases to the correct live module, common recovery states are consistent across modules, and shared primitives do not ship with broken labels, dead actions, or production-only route leaks.

### Dashboard

- `DASH-001 | Landing shell and widget groups`
  Steps: open `Dashboard` from cold load, sidebar navigation, and deep-link return; validate `Overview`, `Monitoring`, and `Platform` groups, loading states, empty states, error states, desktop layout, and mobile layout.
  Expected outcome: the landing page renders truthfully, no widget group disappears without explanation, and no summary surface claims live state it cannot show or link to.
- `DASH-002 | Customize workflow`
  Steps: open `Customize`, toggle every widget family exposed in the current build, reorder layout where supported, save or reset, refresh, and return after visiting another module.
  Expected outcome: widget visibility and layout state persist or reset exactly as the UI promises, focus returns correctly, and hidden widgets are not still reachable through stray controls.
- `DASH-003 | Widget CTA integrity`
  Steps: trigger every visible widget CTA, quick action, and summary-card action present in the live matrix, including scanner shortcuts, guard controls, compliance cards, Kumite cards, Ronin cards, Sengoku cards, and Kotoba cards.
  Expected outcome: each action lands on the correct module or workflow, the destination state matches the card label, and no CTA dead-ends, routes to the wrong branded module, or opens a stale legacy label.
- `DASH-004 | Summary truthfulness`
  Steps: compare dashboard metrics and trend widgets against their source modules after refresh, empty-state conditions, and degraded-data conditions.
  Expected outcome: summaries are directionally and numerically consistent with their source surfaces or clearly marked unavailable; no dashboard metric masks an upstream error.

### Haiku Scanner

- `SCAN-001 | Input source matrix`
  Steps: cover freeform text entry, each quick example chip, image upload, audio upload, document upload, and Armory payload handoff.
  Expected outcome: each input path populates the scanner correctly, scan actions stay disabled only when they should, and a valid scan returns a verdict plus findings instead of a silent failure or generic success toast.
- `SCAN-002 | Engine filter and detection-group matrix`
  Steps: exercise each live engine pill and each enabled scanner detection group represented by the current engine inventory, with positive and negative payloads where applicable; include single-engine, multi-engine, and reset behavior.
  Expected outcome: selected filters actually constrain the scan, findings change in a way consistent with the enabled groups, and the filter UI never claims an engine is active when it is not contributing.
- `SCAN-003 | All-engines-disabled deny path`
  Steps: disable every engine through the available scanner or admin controls, return to the scanner, and attempt each scan entry path.
  Expected outcome: scanning is truthfully blocked until at least one engine is re-enabled, and the user receives a clear message rather than an empty result or backend error.
- `SCAN-004 | Findings, verdict, and recovery coverage`
  Steps: validate allowed outcomes, blocked outcomes, severity counts, engine-specific findings, clear action, retry after API error, retry after unsupported upload, and state recovery after switching modules.
  Expected outcome: the findings panel explains what happened, `Clear` fully resets the session, and retry paths produce fresh results instead of stale findings.

### Armory

- `ARM-001 | Sub-tab and view-mode coverage`
  Steps: cover `Fixtures` and `Test Payloads`; within `Fixtures`, cover `Tree`, `Search`, and `Grid` views, category drill-down, filters, pagination or scrolling, and reset behavior.
  Expected outcome: every explorer mode presents the same corpus truth through its own interaction model, and changing view mode does not lose the selected fixture or misreport counts.
- `ARM-002 | Fixture detail and preview coverage`
  Steps: open fixture details from each explorer view and validate text preview, binary preview, supported media preview, scan-result rendering, empty state, loading state, and fetch failure state.
  Expected outcome: detail panes render the correct artifact, unsupported preview types are handled honestly, and previously scanned fixtures show the correct scan context without cross-item leakage.
- `ARM-003 | Compare mode`
  Steps: select two fixtures, load compare mode, swap or clear selections, compare same-category and cross-category fixtures, and exit compare mode.
  Expected outcome: both fixtures remain identifiable, comparison layout is stable on desktop and mobile, and compare actions never overwrite the primary selection unexpectedly.
- `ARM-004 | Payload catalog and scanner handoff`
  Steps: cover `Current Detection` and `TPI Planned` payload toggles, inspect payload details, and trigger `Load to Scanner` from each eligible payload.
  Expected outcome: the payload catalog truthfully separates active versus planned entries, loading a payload opens the scanner with the expected content, and no copy step is required for a workflow presented as direct handoff.
- `ARM-005 | Direct fixture scan outcome`
  Steps: invoke fixture-scan actions from the explorer and detail views, then inspect the resulting scanner or result surface.
  Expected outcome: the selected fixture is the one actually scanned, the result set belongs to that artifact, and scanner-side errors are surfaced as scanner errors rather than silent Armory failures.

### LLM Dashboard

- `LLM-001 | Top-level tab coverage`
  Steps: cover `Models`, `Tests`, `Results`, `Leaderboard`, `Compare`, `Custom Models`, and `Jutsu` through sidebar entry, direct tab switching, refresh, and return navigation.
  Expected outcome: every tab is reachable, tab selection is visually truthful, and no tab presents stale placeholders as if it were production-ready.
- `LLM-002 | Models inventory and nested detail coverage`
  Steps: inspect configured models, enable or disable eligible models, open model detail, and cover nested detail tabs `overview`, `history`, `Reports` (formerly documented as `deliverables`), `training`, and `metrics`.
  Expected outcome: model state changes are reflected across list and detail views, provider settings are visible where promised, and each nested tab exposes the correct dataset or a truthful empty state.
- `LLM-003 | Test execution matrix`
  Steps: cover single execution and batch execution with one or more test cases and one or more enabled models, plus guard-off and guard-on preconditions.
  Expected outcome: starting a run creates an actual execution record, valid runs produce results instead of front-end-only success states, and blocked or failed runs surface actionable reasons.
- `LLM-004 | Results, reporting, and export integrity`
  Steps: open recent results, grouped findings, result details, report generation, and any available export actions or download controls.
  Expected outcome: result views show real execution data, report actions create artifacts the user can open, and exports correspond to the selected run rather than a stale prior context.
- `LLM-005 | Leaderboard and comparison workflows`
  Steps: cover leaderboard ranking, sort or filter controls where present, compare-view selection, model-to-model comparison, and result-set comparison.
  Expected outcome: ordering and comparison deltas are derived from actual results, empty states are truthful when data is missing, and the compare UI never mixes mismatched result sets silently.
- `LLM-006 | Custom model lifecycle`
  Steps: cover create, edit, validate, test connection, save, and remove flows for `Custom Models`.
  Expected outcome: valid configurations become usable in the broader model inventory, invalid endpoints fail with clear guidance, and removal does not leave orphaned selectors in other tabs.
- `LLM-007 | Jutsu workspace`
  Steps: cover guide access, settings access, model-centric actions, and any benchmarking or analysis actions presented in `Jutsu`.
  Expected outcome: Jutsu actions operate on the currently selected model or result context, required prerequisites are communicated before launch, and unavailable analysis paths are not shown as ready.
- `LLM-008 | Header action truthfulness`
  Steps: trigger report-generation controls and verify the guard-status badge under guard-off and guard-on states.
  Expected outcome: header actions reflect the current run context, the guard badge matches live Hattori state, and report generation is blocked or disabled truthfully when prerequisites are missing.

### Hattori Guard

- `GUARD-001 | Guard shell and global controls`
  Steps: cover metrics row, enable or disable guard, block-threshold selector, mode cards, and audit-log entry from direct navigation and from guard-aware handoffs.
  Expected outcome: guard state changes propagate across the app, the metrics row updates truthfully, and disabling guard removes block expectations without leaving stale blocked messaging behind.
- `GUARD-002 | Mode matrix`
  Steps: create explicit stories for `Shinobi`, `Samurai`, `Sensei`, and `Hattori`, each with benign traffic and malicious traffic that should exercise the documented directionality.
  Expected outcome: `Shinobi` scans input and logs without blocking, `Samurai` can block suspicious input before model execution, `Sensei` can block suspicious output, and `Hattori` can block both directions.
- `GUARD-003 | Threshold matrix`
  Steps: for each blocking-capable mode, cover `WARNING+` and `CRITICAL only` with test content that straddles the threshold boundary.
  Expected outcome: threshold changes alter allow or block behavior exactly as labeled, and the UI never displays a threshold that the execution layer is not honoring.
- `GUARD-004 | Scanner-attack coverage matrix`
  Steps: expand child stories across every supported scanner attack family or detection category used by guard review, including prompt injection, jailbreak-style bypasses, exfiltration patterns, unsafe output patterns, and any additional live categories exposed by the scanner inventory.
  Expected outcome: the correct input or output event is logged for each category, expected allow or block behavior is observable, and uncovered categories are explicitly logged as framework gaps rather than silently skipped.
- `GUARD-005 | Audit log verification`
  Steps: inspect allow versus block actions, input versus output direction, timestamps, filter or refresh controls where present, empty state, and degraded-data state.
  Expected outcome: every reviewed event can be traced back to the triggering action, the audit log never swaps directionality or verdict labels, and missing log data is surfaced as an error condition.

### Bushido Book

- `BUSH-001 | Framework selection and grouping`
  Steps: select frameworks from the left-side list, switch grouping between tier and category, refresh, and navigate across sub-views.
  Expected outcome: the chosen framework stays in context across sub-views, grouping changes only the presentation layer, and no framework disappears due to a stale filter or hidden legacy identifier.
- `BUSH-002 | Sub-view matrix`
  Steps: cover `Overview`, `Coverage`, `Gap Matrix`, `Audit Trail`, `Checklists`, `Navigator`, and `Framework Compliance`.
  Expected outcome: every sub-view renders the selected framework context, no sub-view loses the active selection on tab switch, and every drill-down target resolves to the correct framework evidence.
- `BUSH-003 | Framework compliance and heatmap flows`
  Steps: inspect the framework-specific testing or heatmap surface, drill into highlighted controls, and return to the prior context.
  Expected outcome: the compliance view is consistent with the selected framework, highlight severity is truthful, and drill-down actions do not break breadcrumb or back-navigation behavior.
- `BUSH-004 | Audit and checklist truthfulness`
  Steps: validate audit-trail filters, checklist completion displays, empty states, and evidence links where present.
  Expected outcome: counts and audit rows align with the selected framework, checklist completion does not overstate execution proof, and missing evidence is displayed as missing rather than implied complete.
- `BUSH-005 | LLM Dashboard handoff`
  Steps: trigger the framework-scoped handoff into `LLM Dashboard`.
  Expected outcome: the receiving workflow carries the expected framework context, lands on the intended destination, and does not require the user to reconstruct the selected framework manually.

### Atemi Lab

- `ATEMI-001 | Shell, guide, configuration, and recorder coverage`
  Steps: cover the getting-started panel, MCP connection status, attack-mode selector, target-model selector, configuration drawer, and session-recording controls.
  Expected outcome: the shell communicates readiness truthfully, recorder state is visible, configuration changes are reflected in the active session, and unavailable prerequisites are explained before execution.
- `ATEMI-002 | Attack-mode matrix`
  Steps: create explicit stories for `Passive`, `Basic`, `Advanced`, and `Aggressive`, then inspect tab behavior and tool availability in each mode.
  Expected outcome: the UI exposes only the tools allowed by the selected mode, escalated modes unlock additional capabilities intentionally, and no restricted tool remains clickable in a lower mode.
- `ATEMI-003 | Tab matrix`
  Steps: cover `Attack Tools`, `Skills`, `MCP`, `Protocol Fuzz`, and `WebMCP`.
  Expected outcome: each tab is reachable, `Protocol Fuzz` is presented as planned or placeholder work rather than ready execution, and state changes in one tab do not corrupt the next tab's context.
- `ATEMI-004 | Attack tools catalog`
  Steps: create child stories for every live attack tool entry: `capability-spoofing`, `tool-poisoning`, `uri-traversal`, `sampling-loop`, `name-typosquatting`, `cross-server-leak`, `notification-flood`, `prompt-injection`, `vector-db-poisoning`, `browser-exploitation`, `api-exploitation`, `filesystem-exploitation`, `model-exploitation`, `email-exploitation`, `code-repository-poisoning`, `message-queue-exploitation`, and `search-poisoning`.
  Expected outcome: each tool card opens the correct workflow, prerequisite warnings are truthful, execution produces a result or planned-state message appropriate to that tool, and no tool reports success without artifacts or logs.
- `ATEMI-005 | Skills and MCP scenario coverage`
  Steps: execute each live reusable skill, inspect result routing, and review protocol-level MCP scenario readiness content.
  Expected outcome: skills produce reusable outputs tied to the selected context, MCP views expose the intended protocol information, and result routing does not strand users on ambiguous intermediate states.
- `ATEMI-006 | WebMCP scenario matrix`
  Steps: cover target URL validation, transport selection, each WebMCP category `web-poison`, `browser-tool`, `oauth`, `cors`, `content-type`, `chunked`, and `ws-hijack`, plus consent cancel and consent confirm paths.
  Expected outcome: invalid or unsafe targets are rejected clearly, consent gates block execution until confirmed, category selection changes the scenario payload truthfully, and simulated runs emit visible results or logs rather than blank success states.

### The Kumite

- `KUM-001 | Module shell and subsystem navigation`
  Steps: cover overview cards, subsystem entry, tabbed subsystem view, guide drawers, onboarding drawers, configuration drawers, back navigation, and refresh behavior.
  Expected outcome: every subsystem card opens the correct workspace, subsystem-specific guidance matches the active subsystem, and returning to overview does not lose state unexpectedly.
- `KUM-SAGE-001 | SAGE evolution workflow`
  Steps: cover seed prompt entry or selection, mutation operators, mutation weights or strategy controls where present, evolution launch, fitness-score review, quarantine review, and recovery after a failed generation step.
  Expected outcome: SAGE runs produce actual mutation output and fitness signals, quarantined items are clearly separated from normal output, and failure states are actionable.
- `KUM-ARENA-001 | Battle Arena wizard shell`
  Steps: cover wizard progression through `Battle Mode`, `Fighters`, `Attack Mode`, and `Launch`, including back, next, validation, cancel, restart, and resume behavior.
  Expected outcome: the wizard enforces prerequisites in the right order, selections persist across steps, and the launch step summarizes the exact match configuration about to run.
- `KUM-ARENA-002 | Battle mode x attack mode matrix`
  Steps: create explicit child stories for every supported combination: `CTF` x `kunai`, `CTF` x `shuriken`, `CTF` x `naginata`, `CTF` x `musashi`, `KOTH` x `kunai`, `KOTH` x `shuriken`, `KOTH` x `naginata`, `KOTH` x `musashi`, `RvB` x `kunai`, `RvB` x `shuriken`, `RvB` x `naginata`, and `RvB` x `musashi`; apply each supported fighter pairing and roster validation rule exposed by the current build.
  Expected outcome: every supported combination can be launched from the wizard without configuration drift, and unsupported fighter or mode combinations are blocked clearly before launch.
- `KUM-ARENA-003 | Match-result integrity`
  Steps: after each Arena launch, inspect scoreboard, replay, verdict, per-round detail, and post-run navigation or download controls where present.
  Expected outcome: a launched match returns actual results rather than a blank state or generic success, `RvB` applies its documented role-swap behavior, and errors are surfaced as match errors with recoverable next steps.
- `[MOCK-DATA] KUM-MITSUKE-001 | Threat-feed and indicator workflow`
  Steps: cover threat-feed ingestion, alert review, indicator extraction, detail drill-down, and empty or degraded-feed conditions.
  Expected outcome: Mitsuke surfaces current indicators truthfully, alerts map back to their feed or source metadata, and an unavailable feed is shown as unavailable rather than simply empty.
- `KUM-DNA-001 | Amaterasu DNA analysis matrix`
  Steps: cover family trees, embedding clusters, mutation timeline, search or X-ray actions where present, and data-source tier filtering.
  Expected outcome: lineage views stay internally consistent, selecting one analysis dimension updates the related panels appropriately, and empty tiers or filtered-out states are clearly communicated.
- `KUM-KAGAMI-001 | Mirror testing and comparison`
  Steps: cover version selection, mirror comparison, behavioral consistency review, difference inspection, and recovery after one side of the comparison becomes unavailable.
  Expected outcome: Kagami comparisons stay tied to the selected versions, differences are explained rather than implied, and one missing side does not masquerade as a clean match.
- `KUM-SHINGAN-001 | Trust-boundary and supply-chain assessment`
  Steps: cover prompt-injection detection, trust-boundary analysis, supply-chain-oriented assessment, result drill-down, and error recovery.
  Expected outcome: Shingan produces analyzable assessment output, findings are attributable to the inspected boundary or dependency, and incomplete scans are surfaced honestly.

### Ronin Hub

- `RONIN-001 | Top-level tab coverage`
  Steps: cover `Programs`, `Submissions`, `Planning`, and `Intelligence` through direct navigation, tab switching, refresh, and re-entry.
  Expected outcome: active tabs remain interactive, placeholder tabs stay clearly labeled as placeholder or empty-state content, and no placeholder tab presents inert controls as active functionality.
- `RONIN-002 | Programs search and filter matrix`
  Steps: cover program search, platform filter, status filter, subscribed-only toggle, sorting or pagination where present, program detail entry, and return navigation.
  Expected outcome: filters compose correctly, detail views correspond to the selected program, and result counts change in line with the active filters.
- `[PLACEHOLDER] RONIN-003 | Local subscription persistence`
  Steps: subscribe and unsubscribe to programs, reload the page, navigate away and back, and inspect browser-storage restoration behavior.
  Expected outcome: subscription state persists as documented, removed subscriptions disappear cleanly, and storage corruption or reset is surfaced with a truthful recovery path.
- `RONIN-004 | Submission lifecycle`
  Steps: create a submission record, edit it, review status changes, payouts, scores, detail views, and return to list context.
  Expected outcome: submission changes persist in the documented local state, list and detail views stay in sync, and missing fields are rejected or highlighted before save.
- `[PLACEHOLDER] RONIN-005 | Placeholder truthfulness`
  Steps: inspect `Planning` and `Intelligence` empty states, CTA behavior, guidance copy, and keyboard focus behavior.
  Expected outcome: users understand these areas are not yet active production workflows, no broken shortcut or action appears available, and focus does not land on hidden inert controls.

### Sengoku

- `SENG-001 | Top-level tab and shell coverage`
  Steps: cover `Campaigns` and `Temporal`, tab switching, refresh, deep-link return, and any auth-required fallback.
  Expected outcome: both tabs are reachable, auth or readiness failures are displayed truthfully, and tab state does not corrupt in-progress campaign context.
- `SENG-002 | Campaign builder and detail workflow`
  Steps: cover `New Campaign`, builder validation, save or cancel flows, campaign detail view, and return to list.
  Expected outcome: the builder enforces required inputs, saved campaigns appear in the list with the correct status, and cancelling a draft does not create a ghost record.
- `SENG-003 | Status matrix`
  Steps: create explicit stories for `Draft`, `Active`, `Completed`, `Paused`, and `Archived` campaign rendering and the actions available in each state.
  Expected outcome: status-specific controls are truthful, forbidden actions are disabled or absent, and the status badge shown in list and detail views stays consistent.
- `SENG-004 | Run-now and progress monitoring`
  Steps: trigger `Run Now`, inspect progress banner polling, intermediate updates, completion behavior, and degraded polling recovery.
  Expected outcome: starting a run creates an actual execution state, progress updates move forward without freezing falsely, completion refreshes the related campaign data, and errors are actionable.
- `[UI-ONLY] SENG-005 | Temporal workflows`
  Steps: cover the `Temporal` workspace for time-oriented or session-sequenced scenarios, including empty state, active scenario state, and return navigation.
  Expected outcome: Temporal accurately represents its current implementation level, time-based sequences expose their step context clearly, and unsupported scenarios are blocked before launch.

### Kotoba

- `[MOCK-DATA] KOTOBA-001 | Prompt input and validation matrix`
  Steps: cover blank input, sub-20-character input, valid input, near-limit input, over-5,000-character input, paste behavior, and clear or replace behavior where available.
  Expected outcome: the character counter is truthful, `Score Prompt` only enables when requirements are met, and oversize input is handled clearly without truncation surprises.
- `KOTOBA-002 | Example-loader matrix`
  Steps: load `Secure System Prompt`, `Insecure System Prompt`, and `Minimal Prompt`, then switch between them and back to manual edits.
  Expected outcome: each example loads the expected content, switching examples does not merge prompts accidentally, and any unsaved-change warning is truthful.
- `KOTOBA-003 | Score and issue rendering`
  Steps: run `Score Prompt`, inspect the overall score, grade, six category bars, issue cards, severity groupings, explanation text, and suggested fixes.
  Expected outcome: scoring returns a real analysis payload, category bars align with the issue narrative, and empty or failed scoring does not masquerade as a completed review.
- `KOTOBA-004 | Hardened output generation`
  Steps: trigger hardening after scoring, inspect the rewritten prompt, and if the current surface exposes multiple hardening levels, cover each exposed level.
  Expected outcome: hardening produces actual rewritten output rather than a placeholder, the output remains tied to the reviewed prompt, and unavailable hardening options are not shown as active controls.
- `KOTOBA-005 | Downstream readiness`
  Steps: verify the scored or hardened prompt can be carried into the next documented workflow when such a handoff is presented.
  Expected outcome: the user can move from hardening to test execution without manually reconstructing the revised prompt, or the UI clearly states when the transfer must be manual.

### Admin

- `ADMIN-001 | Top-level tab matrix`
  Steps: cover `General`, `Users`, `Scoreboard`, `API Keys`, `Haiku Scanner & Guard`, `System Health`, `Export`, `Admin Settings`, and `Validation`.
  Expected outcome: every tab is reachable, tab labels match the live navigation vocabulary, and legacy labels inside the page are clearly subordinate to the current source-of-truth naming.
- `ADMIN-002 | General, settings, and documentation truthfulness`
  Steps: inspect summary content, doc links, legacy naming blocks, and administrative settings controls.
  Expected outcome: historical labels are presented as historical, live links point to current docs, and settings controls do not imply side effects they do not actually perform.
- `ADMIN-003 | Users workflow`
  Steps: cover user-management actions, detail views, filters, empty states, and error states exposed by `Users`.
  Expected outcome: user actions and tables stay internally consistent, protected operations communicate permission requirements, and missing or failed user data is surfaced clearly.
- `ADMIN-004 | Scoreboard integrity`
  Steps: review tested-model count, total executions, average resilience, top provider, leaderboard ordering, and any refresh controls.
  Expected outcome: scoreboard summaries align with the underlying LLM results inventory, and missing data is reported as missing rather than zeroed silently.
- `ADMIN-005 | API key and provider lifecycle`
  Steps: cover create, update, credential entry, base URL entry, connection test, save, and remove flows for provider-backed models.
  Expected outcome: valid connections become visible to `LLM Dashboard`, failed tests explain what failed, and removing a provider does not leave stale model references in execution views.
- `ADMIN-006 | Haiku Scanner and Guard operational settings`
  Steps: cover scanner engine toggles, reset filters, guard enable or disable, guard mode selection `Shinobi`, `Samurai`, `Sensei`, `Hattori`, and threshold selection `WARNING+` and `CRITICAL only`.
  Expected outcome: operational settings propagate to Scanner and Guard surfaces, reset returns the documented default state, and mode or threshold labels never drift from the live enforcement state.
- `ADMIN-007 | System Health`
  Steps: inspect readiness signals, health summaries, refresh behavior, degraded-service messaging, and integration-specific status panels where present.
  Expected outcome: health signals match the underlying platform state, transient failures are distinguishable from healthy zero states, and stale timestamps are not displayed as current.
- `ADMIN-008 | Export preferences`
  Steps: cover preferred format, branding, retention, save, reload, and any reset controls in `Export`.
  Expected outcome: preferences persist as documented, validation exports honor the selected defaults where promised, and unsupported combinations are blocked clearly.
- `ADMIN-009 | Validation run-launch matrix`
  Steps: cover `Run Full Validation`, `Run Calibration Only`, targeted-module selection, full-catalog launch with nothing selected, and `Include Holdout Set`.
  Expected outcome: the launch controls create a real validation run with the chosen scope, the selected modules appear in run context, and invalid launch conditions are blocked before execution.
- `ADMIN-010 | Validation catalog coverage`
  Steps: create child stories for `Prompt Injection`, `Jailbreak Resistance`, `Data Exfiltration`, `Bias Detection`, `Toxicity`, `Hallucination`, `PII Leakage`, and `Compliance`, then inspect `Live Progress`, `Run History`, `Results`, confusion matrices, metrics, non-conformity register, and traceability chain.
  Expected outcome: each validation module returns module-specific evidence rather than a generic success shell, history rows reopen the correct run, and the traceability chain maps back to the selected module set.
- `ADMIN-011 | Validation export and calibration`
  Steps: export validation reports as `JSON`, `CSV`, and `Markdown`, inspect `Calibration Status`, and cover `Recalibrate All`.
  Expected outcome: each export format produces the requested artifact, calibration status reflects the latest known state, and recalibration updates status or reports failure without leaving stale “valid” labels behind.

### Sensei (AI Assistant)

- `SENSEI-001 | Chat shell and drawer`
  Steps: open Sensei drawer from dashboard or module context, verify drawer open and close, focus trap, overlay dismiss, `Escape` key, message input field, send button enable and disable states, message rendering, tool result display, scroll-to-bottom behavior, empty state, loading state, and error state.
  Expected outcome: the drawer behaves like a modal surface with correct focus management, messages render in order, tool results are visually distinct from chat messages, and the drawer does not leak state when closed and reopened.
- `SENSEI-002 | Conversation guard and input safety`
  Steps: test normal input, oversized input, input containing prompt-injection patterns, conversation boundary enforcement, guard violation messaging, and recovery after a blocked message.
  Expected outcome: the conversation guard rejects or sanitizes unsafe input before it reaches the LLM, guard violations surface actionable user feedback, and recovery paths allow the conversation to continue without corruption.
- `SENSEI-003 | Tool execution lifecycle`
  Steps: trigger a Sensei action that invokes a tool, inspect tool invocation display, result parsing, result rendering in chat, error recovery when a tool call fails, and context building across multi-turn tool usage.
  Expected outcome: tool invocations are visible to the user, results are rendered truthfully, failed tool calls surface actionable errors, and multi-turn context remains coherent.
- `SENSEI-004 | Suggestion and context awareness`
  Steps: verify Sensei suggestions reflect current module context, suggestion chips are clickable and populate the input, suggestions update when navigating between modules, and empty suggestion state.
  Expected outcome: suggestions are contextually relevant, clicking a suggestion triggers the expected action, and stale suggestions do not persist after module navigation.
- `SENSEI-005 | API route coverage`
  Steps: cover `/api/sensei/chat` (primary chat), `/api/sensei/generate` (attack generation), `/api/sensei/mutate` (mutation), `/api/sensei/judge` (evaluation), and `/api/sensei/plan` (plan generation) with auth, input validation, success, and error paths.
  Expected outcome: all routes require authentication, reject invalid input, return structured responses, and handle upstream LLM failures gracefully.

### Agentic Lab

- `AGENTIC-001 | Lab shell and scenario execution`
  Steps: open Agentic Lab, verify scenario selection interface, execution controls, result rendering, error recovery, and return navigation.
  Expected outcome: the lab communicates readiness truthfully, scenario execution produces observable results or planned-state messages, and errors are actionable.

## Recent Coverage Additions

### 2026-04-03 Baseline Refresh

This framework was re-baselined against the live repo on 2026-04-03 using:

- `node team/testing/tools/generate-coverage-matrix.mjs`
- `node team/testing/tools/generate-uat-ux-matrix.mjs`

Current live baseline (2026-04-03 Rev 6, final remediation, filesystem-verified):

- Source surfaces tracked: **946** (was 932)
- Test files scanned: **841** (was 566)
- High-risk uncovered surfaces: **7** (was 75; 91% reduction)
- API route handlers: **102**
- API route test directories: **103** (102 route handlers + 1 orphan at `api/shingan`)
- API routes without tests: **0** (all 102 routes covered)
- Playwright specs: **24** (was 19; +5 new specs)
- Playwright tests: **167** (+ new control/page/widget/component/visual tests pending first run)
- Actionable controls tracked in UAT/UX matrix: **567** (was 564)
- Control Playwright gaps: **0** (was 142; 100% closed)
- Total components (dojolm-web): **236**
- Component test files: **184** (was 174; +10 widget tests)
- bu-tpi test files: **244** (was 240; +4 probe/attack/sensei files; 5,374 tests, all passing)
- Hook test files: **2** (useSensei, useSenseiScroll)
- Lib test files: **71** (was 107 counted differently; 71 in `lib/__tests__/`)
- dojolm-web total test files: **400**
- Fixture categories: **37**

### 2026-04-03 Test Gap Closure (56 new test files)

Closed P0/P1 audit gaps with 3 commits:

**bu-tpi (23 new files):**
- 17 fingerprint probe tests (all probe categories now covered)
- 5 timechamber attack plan tests (accumulation, context-overflow, delayed-activation, persona-drift, session-persistence)
- 7 sensei module tests (attack-generator, data-curator, data-pipeline, format-converter, judge, mutation-advisor, plan-generator)

**dojolm-web lib (20 new files):**
- 4 auth module tests (auth, rbac, route-guard, login-rate-limit)
- 2 DB tests (query-builder SQL injection prevention, encryption round-trip)
- 1 provider test covering all 7 LLM adapters (ollama, openai, anthropic, llamacpp, lmstudio, moonshot, zai)
- 7 sensei-lib tests (tool-definitions, tool-parser, conversation-guard, system-prompt, tool-executor, storage-interface, runtime-env)
- 6 storage/repo tests (base-repository, audit-repository, retention, arena-storage, ecosystem-storage, sengoku-storage)

**dojolm-web components (7 new files):**
- 7 dashboard widget tests (sage-status, sengoku, session-pulse, system-health-gauge, threat-radar, threat-trend, time-chamber)

**Impact:** High-risk uncovered surfaces dropped from 75 → 23 (69% reduction).

### Freshness Rule For Counts

- Do not rely on static counts in this document for release decisions.
- Treat hardcoded count statements as informational snapshots only.
- Use the generated matrices as the operational source of truth for route, spec, and control counts.

### Known Label Truncations (Accepted UX Conventions)
- `Leaderboard` tab truncates to `Board` in the UI tab bar.
- `Battle Arena` subsystem tab truncates to `Arena`.
- `Amaterasu DNA` subsystem tab truncates to `DNA`.
- `Reports` was formerly documented as `deliverables` in some module docs.

## Environment Targeting

All QA execution must declare its target environment. Local-dev is the default; production validation runs against the deployed Voyager instance.

| Environment | URL | When to Use |
| --- | --- | --- |
| Local dev | `http://localhost:42001` | Unit tests, type-checks, build gates, local E2E |
| Production | `https://dojo.bucc.internal` | Post-deploy smoke, UAT, security regression, release sign-off |

### Production Prerequisites

Before running any test against production:

1. Confirm Voyager (192.168.70.120) is reachable: `ssh paultinp@192.168.70.120 "echo ok"`
2. Confirm the container is healthy: `ssh paultinp@192.168.70.120 "curl -s http://localhost:3001/api/stats"`
3. Confirm DNS/Caddy resolves: `curl -sk https://dojo.bucc.internal/api/stats`
4. Confirm you are NOT running destructive or write-heavy tests against production data without explicit approval.

### Production Safety Rules

- **Read-only by default.** Production E2E tests must not create, modify, or delete persistent data unless the test plan explicitly approves it and cleanup is automated.
- **No credential injection.** Do not pass real admin credentials via env vars in CI logs or shared terminals. Use `.env.e2e.prod` (gitignored) locally.
- **Screenshot and video evidence.** Production runs capture screenshots for every test and video for every run (configured in Playwright).
- **Separate results directory.** Production Playwright results go to `prod-results.json` under the package-local `e2e-results` directory for traceability.

### Production Build And Deploy Parity

Before release sign-off for deployment, browser-runtime, or storage changes:

- Verify deploy sync excludes local `.env.*` files unless a specific production file is intentionally allowlisted.
- Verify Docker build args or runtime env injection for public browser variables are explicit, and confirm the built client uses relative or approved production URLs instead of `localhost` or a developer machine address.
- Verify the compose or runtime manifest points at the intended image tag or digest and that the running container SHA matches the release evidence.
- Verify published ports match the intended production access path for browser UAT and automation.
- Verify the mounted data volume path matches the app's actual write path in the container.
- Verify the configured storage backend works in the target image; if a fallback backend is in use, document that fallback explicitly in the QA log and release evidence.
- Verify model-provider onboarding policy is intentional in production: if internal providers should be registerable, document the SSRF allowlist design; if not, document the supported operational workaround as policy, not tribal knowledge.

## Core Commands

### Local Dev (default)

```bash
npm test
npm run type-check
npm test --workspace=bu-tpi
npm run type-check --workspace=dojolm-web
npm test --workspace=dojolm-web
npm run test:e2e --workspace=dojolm-web
npm run build --workspace=dojolm-web
node team/testing/tools/generate-coverage-matrix.mjs
node team/testing/tools/generate-uat-ux-matrix.mjs
npm run verify:docs
```

### Production

```bash
# Quick smoke — verify app loads and API responds
curl -sk https://dojo.bucc.internal/api/stats | jq .
curl -sk -o /dev/null -w '%{http_code}' https://dojo.bucc.internal/

# E2E against production (Playwright, desktop + mobile)
E2E_TARGET=prod npm run test:e2e --workspace=dojolm-web

# E2E against production with explicit URL override
E2E_BASE_URL=https://dojo.bucc.internal npm run test:e2e --workspace=dojolm-web

# Headed mode for manual observation during prod validation
E2E_TARGET=prod npx playwright test --headed --project=chromium --workspace=dojolm-web

# Container health check from dev machine via SSH
ssh paultinp@192.168.70.120 "docker ps --filter name=dojolm-web && curl -s http://localhost:3001/api/stats"

# Container logs inspection
ssh paultinp@192.168.70.120 "docker logs --tail 100 dojolm-web"
```

Use the security testing procedure for security-specific commands and environment setup.

## Known Pitfalls & Prevention Rules

These rules are distilled from `team/lessonslearned.md`. Review them before starting QA work.

### Coverage Claims Must Be Verifiable

| Claim | Verification Method |
| --- | --- |
| "X% test coverage" | `find packages -name "*.test.ts" \| wc -l` vs source file count |
| "All stories implemented" | Grep for test file names matching story IDs |
| "Security issues addressed" | Re-run security scan, not just check off the doc |
| "Build passes" | `rm -rf .next && npm run build` (stale .next defeats verification) |

Never sign off on a coverage number without running the gap analysis tool.

### Parallel Work Requires a Merge-Fix Pass

When multiple agents or developers work in parallel on different stories:
1. Each agent cannot know about changes from other agents.
2. Pre-existing tests break from cross-agent side effects.
3. **Always budget a test regression fix pass** after parallel waves complete.
4. Run the full suite after merge, not just per-agent suites.

### Deployment Verification Is Not Optional

After every Docker build, before declaring success:
- `grep -rl 'localhost' .next/static/` — must return empty (no baked-in dev URLs).
- Verify no `.env.local` or `.env.development` in build context.
- `docker exec dojolm-web ls -la /app/data/` — must show application data (volume mount works).
- `docker exec dojolm-web node -e "require('better-sqlite3')"` — native modules load (or confirm JSON fallback).
- Container logs show no startup errors: `docker logs --tail 50 dojolm-web`.

### Security Fixes Have Blast Radius

When hardening a security pattern:
- Grep for ALL copies of the pattern: `grep -r 'getClientIp\|x-forwarded-for' src/`.
- Search test files that rely on the old behavior — they will break.
- Sanitization must cover ALL user-controlled fields, not just the obvious ones.
- Password complexity changes require updating all test fixture passwords.

### Hardcoded Values Are Fragile

- Hardcoded count assertions (e.g., `expect(skills).toHaveLength(20)`) break when items are added.
- Use `toBeGreaterThanOrEqual()` or import the source array and use `.length`.
- After adding items to config arrays, grep for the old count in test files.

### Test Environment Gotchas

| Trap | Prevention |
| --- | --- |
| jsdom + heavy barrel imports (fingerprint) hang | Use `// @vitest-environment node` |
| `vi.useFakeTimers()` + React 19 async = deadlock | Use real timers + `waitFor()` |
| `userEvent` + fake timers = infinite timeout | Use `fireEvent` (synchronous) |
| Mock function refs in useEffect deps = infinite loop | Define mock functions at module scope |
| Lucide-react mock missing sub-component icons | Mock ALL icons from the full component tree |
| `getByLabelText` matches multiple elements | Use `getAllByLabelText` when elements duplicate across tabs |

### Lessons Learned Is a Pre-Flight Check

Before starting any QA task:
1. Check if `team/lessonslearned.md` exists and review relevant sections.
2. If the change touches Docker/deploy — read the Infrastructure section.
3. If the change touches security — read the Security and Pentest sections.
4. If the change touches scanner — read the Scanner/Patterns section.
5. If the change touches React components — read the React/Next.js section.

## Release Gates

### Local Dev Gates (pre-deploy)

- Relevant automated suites ran for the changed scope.
- Type-check passed for the changed package scope, and for repo-level/shared-contract work when applicable.
- Production build passed for user-facing shell, navigation, or shared design-system changes.
- Generated matrices were refreshed when the scope changed code or user-facing surface area.
- No changed module, submodule, API, export, or actionable control is missing from the appropriate matrix.
- No changed user-facing surface remains `playwright gap` or `manual gap` without an explicit owner and release note.
- No changed actionable control is unlabeled, misleading, or falsely presented as available without a documented exception.
- No changed scope is counted as executed solely because the matrices show heuristic or inherited references.
- No shared render file may rely on a sibling module's references as a substitute for per-label evidence.
- No high-complexity file with changed private helper logic may ship without a QA note covering that function-level review.
- Product inventory docs remain aligned with the UI labels and module nesting being shipped.
- Active docs still route through this master plan and not through archive-only pointers.
- Framework governance claims stay truthful: local-only artifacts under ignored `team/` paths are not described as tracked or CI-enforced unless mirrored into a tracked path.
- Gate verdict language must stay truthful: if any mandatory local-dev gate failed or is only partial, the overall result cannot be recorded as `PASS`. Use `PARTIAL` or `BLOCKED` and log owner, exception approver, and expiry.

### Production Gates (post-deploy)

- Container is healthy on Voyager (`docker ps` shows running, `/api/stats` responds).
- Production E2E suite passed (`E2E_TARGET=prod npm run test:e2e --workspace=dojolm-web`).
- Production smoke confirms: app loads, scanner works, protected routes deny unauthenticated access.
- Auth-boundary changes verified both protected-route denial and intended public browser-read availability against the live deployment.
- Manual UX, visual, or device checks were recorded when the matrix required them.
- Shared UX polish changes include recorded desktop and mobile validation notes for the affected primary surfaces.
- Shared controls do not advertise unavailable behavior, including search fields and keyboard shortcuts.
- Changed controls, tabs, drawers, row actions, and empty-state CTAs were reviewed against the actionable-control inventory and any manual-label audit items were resolved or logged.
- Cautious rollout changes preserved stable identifiers and persisted contracts unless the release explicitly called out a breaking change.
- Browser bundles do not contain unintended `localhost` or developer-host API URLs for production user journeys.
- Running production containers are verified against the intended image tag or SHA rather than an implicit compose rebuild.
- Published port mapping matches the declared production UAT target.
- Runtime storage path, mounted volume, and configured storage backend are aligned in the deployed container, or any fallback backend is explicitly documented in release evidence.
- Unsupported HTTP methods fail closed on tested routes and do not return unexplained `5xx` responses.
- If internal provider registration is part of the supported workflow, the production SSRF policy and allowlist behavior were explicitly reviewed.
- Container logs show no errors or panics (`docker logs dojolm-web`).
- Findings and evidence were written to the correct output location with the environment clearly labeled (local-dev or production).
- Gate verdict language must stay truthful: if any mandatory production gate failed or is only partial, the overall result cannot be recorded as `PASS`. Use `PARTIAL` or `BLOCKED` and log owner, exception approver, and expiry.

## Output Locations

- QA logs and handoff notes: `team/testing/QA/QA-Log/`
- Security audit artifacts: `team/testing/QA/security/audit-results/`
- Formal assessment sessions: `docs/app/testing-results/`

## Fixture Branding Check

All fixture files, seed data, sample test cases, and demonstration content **must** use BlackUnicorn-branded materials. Before any release, verify:

| Check | Command / Method | Expected Result |
| --- | --- | --- |
| Fixture manifest branding | Review `packages/bu-tpi/fixtures/manifest.json` and `packages/dojolm-web/public/fixtures/manifest.json` | All organization references use "BlackUnicorn Laboratory" or "BU-TPI" |
| Sample test cases | Review `packages/dojolm-web/src/lib/data/sample-test-cases.ts` | Author/org fields reference BlackUnicorn |
| Seed programs | Review `packages/dojolm-web/src/lib/data/ronin-seed-programs.ts` | Program names and descriptions use BlackUnicorn branding |
| Validation seed data | Review `deploy/validation-seed/` contents | All seed artifacts use BlackUnicorn branding |
| No competitor/generic brands | `grep -ri 'Acme\|Example Corp\|FooCorp\|Test Company' packages/bu-tpi/fixtures/ packages/dojolm-web/src/lib/data/` | Must return empty |
| No unbranded demo content | Review mock data in `ThreatFeedStream.tsx`, `KotobaDashboard.tsx`, `TemporalTab.tsx` | Organization names use BlackUnicorn where applicable |

**Why:** Fixtures are user-visible in the Armory, Test Lab, and batch execution results. Generic or competitor-branded content undermines product identity and may confuse users about the source of test materials.

**Accepted exceptions:**
- **Delivery-vector attack payloads** (e.g., `shared-doc-google.txt`, `clean-document-invoice.txt`) may use generic company names like "Acme Corp" as part of the social engineering simulation context. These are attack content, not tool branding.
- **Fictional LLM target names** (BonkLM, DojoLM, Basileak, Marfaak, PantheonLM) are BlackUnicorn-branded fictional targets used across 250+ fixture files — these are correct and intentional.

**Branding audit result (2026-03-30):** 250+ fixtures use BlackUnicorn fictional LLM brands. 9 delivery-vector fixtures use "Acme Corp" as realistic social engineering context (accepted exception). No unbranded or competitor-branded tool-level content found.

## Audit Remediation Log

### 2026-03-30 — Comprehensive Blindspot Audit Response

**Audit source:** External QA framework blindspot audit (5-agent deep-dive)

#### Findings Confirmed and Remediated

| ID | Finding | Status | Remediation |
| --- | --- | --- | --- |
| P0-1 | Testing checklist overclaims | **Corrected (audit inaccurate)** | The checklist already distinguishes "132 executable" from "507 manual" (line 9). Added `sample-test-cases.ts` cross-reference and corrected OWASP coverage claims for manual-only areas (LLM03/05/07/08/09). The alleged "582" contradiction does not exist in the file. |
| P0-2 | Scanner modules missing for TA-04/05/07/08/10 | **Confirmed, documented** | These are intentionally manual-only assessment areas. The checklist correctly marks them with "⚠️ Manual assessment only." No scanner module exists or is claimed. |
| P0-3 | RBAC gaps on batch/chat/execute/scan | **Audit finding incorrect** | All four routes use `withAuth()` with resource/action RBAC: `batches.execute`, `chat.execute`, `executions.execute`. Viewer role is denied. Verified in code. |
| P0-4 | API keys hardcoded to admin role | **Audit finding incorrect** | API keys use `getApiKeyRole()` which checks `API_KEY_PERMISSIONS` env (per-key role mapping), then `API_KEY_ROLE` env, then defaults to `'analyst'` (not admin). |
| P1-1 | 5 modules lack dedicated E2E | **Remediated** | Ronin Hub, Kotoba, and Mobile Nav already have dedicated specs. Created new specs for Sengoku (7 tests), Atemi Lab (9 tests), and Kumite (10 tests). Total inventory now: 19 Playwright specs. |
| P1-2 | 10 API routes have zero tests | **Audit finding incorrect** | The 10 specific routes cited all have `__tests__/` directories. However, 15 *other* routes lack tests — test stubs created for the actual gaps. |
| P1-3 | 3 API routes missing from matrix | **Remediated** | Added `/api/compliance/frameworks`, `/api/llm/export/[modelId]`, `/api/llm/leaderboard` to QA-COVERAGE-MATRIX. Route count updated from 86 to 89. |
| P1-5 | Mock-only features described as full workflows | **Audit finding incorrect** | QA epics already use `[MOCK-DATA]`, `[PLACEHOLDER]`, and `[UI-ONLY]` prefixes (verified at lines 325, 346, 352, 370, 376). |
| P2-1 | "100% traceability" false due to label mismatches | **Audit finding incorrect** | QA plan line 28 already documents accepted UX conventions: `Leaderboard` → `Board`, `Battle Arena` → `Arena`, `Amaterasu DNA` → `DNA`, `Reports` formerly `deliverables`. These are intentional responsive design abbreviations. |
| P2-2 | Time Chamber still active in Admin and QA matrix | **Remediated** | Removed from `AdminPanel.tsx` PLATFORM_MODULES. Marked as `[RETIRED]` in QA-COVERAGE-MATRIX. |
| P2-3 | 47 components missing from UAT matrix | **Remediated** | Added "Non-Interactive / Visual Review Components" section to UAT-UX-COVERAGE-MATRIX with review criteria for design, positioning, responsive, empty state, and accessibility. |
| P2-4 | Existing tests are shallow render smoke | **Acknowledged** | This is a known limitation. Unit tests with mocked child components test parent rendering and prop passing, not behavioral outcomes. The matrices do not claim these as behavioral coverage. |
| P2-6 | Playwright spec count wrong (10 vs actual) | **Remediated** | Updated UAT-UX-COVERAGE-MATRIX inventory. The live repo now contains 19 specs across module, security, mobile, and navigation coverage. |

#### Audit Quality Assessment

The audit was structurally well-organized but contained several factual errors:
- **P0-1:** Misread the checklist as claiming "639 executable test cases" when line 9 explicitly says "132 executable + 507 manual."
- **P0-3/P0-4:** Based on stale code. Routes were already hardened with `withAuth()` + resource/action RBAC before the audit.
- **P1-2:** The 10 routes cited all have test files. The actual untested routes were different.
- **P1-5:** Failed to notice the `[MOCK-DATA]`/`[PLACEHOLDER]`/`[UI-ONLY]` prefixes already present in the QA plan.
- **P2-1:** Failed to read line 28 of the QA plan which documents the exact label conventions cited as "false traceability."
- **A-9:** Claimed a "639 vs 582" contradiction — the figure "582" does not appear anywhere in the checklist.

**Lesson:** Future external audits should be validated against the actual source files before findings are accepted. Audit agents should read the full documents they reference, not just grep for keywords.

### 2026-03-30 — Second Audit Re-Validation (Independent Verification)

**Audit source:** Re-review of the same blindspot audit report with independent codebase verification (3 parallel research agents)

#### Verification Results

All previous remediation log entries were independently confirmed accurate:

| Original Claim | Re-Verification Result |
| --- | --- |
| P0-1: 639 overclaim | **Confirmed FALSE** — Line 9 explicitly says "132 executable + 507 manual." The "582" figure does not exist in the file (grep returns 0 matches). |
| P0-3: RBAC gaps | **Confirmed FALSE** — All 4 routes use `withAuth()` with resource/action parameters (e.g., `{ resource: 'batches', action: 'execute' }`). |
| P0-4: API key hardcoded admin | **Confirmed FALSE** — `getApiKeyRole()` checks env-based per-key mapping, defaults to `'analyst'`. |
| P1-1: 5 modules no E2E | **Confirmed FALSE** — All 5 specs exist with behavioral tests (mode switching, character counting, button state, tab navigation, subsystem cards). |
| P1-2: 10 routes no tests | **Confirmed FALSE** — All 10 cited routes have `__tests__/route.test.ts` directories. |
| P1-5: Mock-only epics no prefix | **Confirmed FALSE** — `[MOCK-DATA]`, `[PLACEHOLDER]`, `[UI-ONLY]` prefixes verified at lines 325, 346, 352, 370, 376. |
| P2-1: Label traceability false | **Confirmed FALSE** — Line 28 pre-documents all cited conventions. |

#### Genuine Gaps Surfaced and Addressed

Despite the audit's factual errors, the review surfaced four genuine improvement areas that have been added to this plan:

1. **Mock-Data Component Registry** — Consolidated table of components using mock data, with transition rules.
2. **Scanner Automation Roadmap** — Documents the 5 manual-only testing areas and their automation blockers.
3. **Playwright Core Journey Depth Tracker** — Identifies 8 core journey actions where E2E depth can be improved.
4. **Test Depth Improvement Priorities** — Tracks unit test files with heavy component mocking for prioritized improvement.

**Lesson:** Even audits with high false-positive rates can surface legitimate improvement opportunities. The value is in the genuine gaps found, not the severity inflation.

## Mock-Data Component Registry

Components currently using hardcoded mock data instead of live API integration. These are tracked here for visibility and tagged in the epic system with `[MOCK-DATA]` or `[PLACEHOLDER]` prefixes.

| Component | Mock Pattern | Epic Reference | Impact |
| --- | --- | --- | --- |
| `ThreatFeedStream.tsx` | `MOCK_SOURCES`, `MOCK_ENTRIES`, `MOCK_ALERTS` (lines 96-224) | `[MOCK-DATA] KUM-MITSUKE-001` | Mitsuke threat feed renders realistic but static data |
| `KotobaDashboard.tsx` | `MOCK_ANALYSIS` (line 56, applied at line 141) | `[MOCK-DATA] KOTOBA-001` | Prompt scoring returns fixed analysis payload |
| `RoninHub.tsx` | `EmptyState` for Planning tab (lines 169-173) and Intelligence tab (lines 175-181) | `[PLACEHOLDER] RONIN-003`, `[PLACEHOLDER] RONIN-005` | Two tabs render placeholder content only |
| `TemporalTab.tsx` | Disabled button with `title="Simulation coming soon"` (line 159) | `[UI-ONLY] SENG-005` | Temporal simulation not yet implemented |

**Rule:** When a mock-data component is wired to a live API, remove the row from this table, remove the epic prefix, and add a QA log entry documenting the transition.

## Scanner Automation Roadmap

Five testing areas are currently manual-assessment-only with no automated scanner module. This is correctly documented in `docs/app/testing-checklist.md` and is not an overclaim, but represents an automation coverage ceiling.

| Testing Area | ID | Manual Scenarios | Automation Blocker | Priority |
| --- | --- | --- | --- | --- |
| Harmful Content | TA-04 | 66 | Requires LLM-as-judge or content classifier; no deterministic scanner possible | Medium |
| Content Policy | TA-05 | 54 | Policy definitions are org-specific; requires configurable rule engine | Medium |
| Bias and Fairness | TA-07 | 36 | Partial coverage via `bias-detector` module; full coverage requires statistical analysis | Low |
| Misinformation | TA-08 | 36 | Requires factual grounding or retrieval-augmented verification | Low |
| Tool Abuse | TA-10 | 54 | Requires MCP runtime instrumentation; partially covered by `webmcp-detector` and `mcp-parser` | Medium |

**Rule:** When a scanner module is added for any of these areas, update the testing checklist to move the area from "manual-only" to "automated", update the executable test case count, and add the module to the registry verification list in this plan.

## Playwright Core Journey Depth Tracker

While all major modules have dedicated E2E specs (16 total), some core user journey actions are covered at the navigation/rendering level but may lack deep behavioral assertions. This tracker identifies priority actions for depth improvement.

| Action | Component | Spec File | Current Depth | Target Depth |
| --- | --- | --- | --- | --- |
| Score Prompt | `KotobaDashboard.tsx` | `kotoba.spec.ts` | Button enable/disable state | Assert analysis result rendering |
| Harden | `KotobaDashboard.tsx` | `kotoba.spec.ts` | Not yet asserted | Assert hardened output display |
| Run Now | `SengokuDashboard.tsx` | `sengoku.spec.ts` | Button visible | Assert campaign execution state change |
| New Campaign | `SengokuDashboard.tsx` | `sengoku.spec.ts` | Button click | Assert builder form rendering |
| Send message | `SenseiChat.tsx` | `sensei.spec.ts` | Spec exists — depth unknown | Assert message send, tool result, error recovery |
| Submit | `SubmissionWizard.tsx` | `ronin-hub.spec.ts` | Tab navigation | Assert submission form lifecycle |
| Run full validation | `ValidationManager.tsx` | `admin.spec.ts` | Tab rendering | Assert validation run creation |
| Add Key | `ApiKeyManager.tsx` | `admin.spec.ts` | Tab rendering | Assert key lifecycle |

**Rule:** When a Playwright spec adds a deep behavioral assertion for one of these actions, update the "Current Depth" column and add the spec line reference. When all actions in a row reach "Target Depth," mark the row complete and remove it from this tracker.

## Test Depth Improvement Priorities

Several unit test files use component mocking that limits behavioral coverage. This is a known limitation documented here for prioritized improvement.

| Test File | Mocking Pattern | What It Misses | Priority |
| --- | --- | --- | --- |
| `guard-dashboard.test.tsx` | Mocks `GuardModeSelector` and `GuardAuditLog` to empty divs | Mode switching behavior, audit log rendering | Medium |
| `ronin-hub.test.tsx` | Mocks `ProgramsTab` and `SubmissionsTab` to empty divs | Program search/filter, submission lifecycle | Medium |
| `sengoku-dashboard.test.tsx` | Mocks `TemporalTab` and `SengokuCampaignBuilder` to empty divs | Campaign creation, temporal workflows | Medium |
| `kumite.test.tsx` | Globally mocks `next/dynamic` to return placeholders | All subsystem rendering and interaction | High |

**Rule:** When a mocked component is replaced with a real render in tests, update this table. Full behavioral coverage is not required for parent-level rendering tests, but at least one integration-level test per mocked component should exist before release sign-off.

## Historical References

- [archive/QA-MASTER-PLAN.md](archive/QA-MASTER-PLAN.md)
- [archive/qa-framework.md](archive/qa-framework.md)
- [archive/QA-UAT-TEST-PLAN.md](archive/QA-UAT-TEST-PLAN.md)
