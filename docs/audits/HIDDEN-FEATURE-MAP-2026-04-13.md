# Hidden Feature Map

Date: 2026-04-13
Scope: `packages/dojolm-web`
Audience: DojoLM web and platform team
Follow-up plan: [HIDDEN-FEATURE-REMEDIATION-PLAN-2026-04-13.md](./HIDDEN-FEATURE-REMEDIATION-PLAN-2026-04-13.md)

## Executive Summary

This audit went deeper than the first-pass nav scan and found multiple distinct kinds of hidden capability:

- 4 hidden nav ids remain in the app's navigation model; 3 still render app surfaces and 1 (`armory`) appears to be legacy-only.
- 22 of 30 dashboard widgets are hidden by default, and several of those widgets are the only practical entry points to otherwise buried workflows.
- 33 Sensei tools expose platform actions that are richer than the explicit UI surface.
- 1 secret keyboard sequence opens the module-visibility dialog.
- Several advanced panels are data-gated or mock-backed, which makes them look partially implemented or randomly unavailable.

The highest-impact hidden-feature problem is not just "features without buttons." It is feature fragmentation:

- some capabilities are de-nav'd but still live,
- some are only reachable through dashboard customization,
- some only appear when prior state already exists,
- some are assistant-only,
- some are visible but non-live because they still use mock data.

## Hiddenness Taxonomy

This report uses five classes:

- `De-nav'd`: still routable and implemented, but removed from normal nav surfaces.
- `Buried`: reachable through nested tabs, icon-only affordances, or secondary drawers.
- `State-gated`: UI exists, but only appears after prior hidden state or cached data exists.
- `Assistant-only`: primarily reachable through Sensei tool invocation rather than explicit UI.
- `Mock-backed / non-live`: visible in UI but not wired to live backend behavior.

## Hidden Feature Map

| Surface | Class | Current access path | Why it is hidden | Evidence |
| --- | --- | --- | --- | --- |
| OBL behavioral analysis runs: alignment, robustness, geometry, depth | State-gated | No first-class trigger found in Jutsu, Scanner, or Atemi; context methods exist only in `BehavioralAnalysisContext` | Users can see OBL output only if cached data already exists; there is no obvious "run OBL" action | `src/lib/contexts/BehavioralAnalysisContext.tsx:128-205`, `src/components/llm/JutsuModelCard.tsx:37-39`, `src/components/scanner/ScannerInsightsPanel.tsx:158-180`, `src/components/adversarial/AdversarialLab.tsx:780-803` |
| OBL visual panels in Atemi and Scanner | State-gated | Atemi and Scanner render them only when `oblResult` is already populated | The panels are mounted, but they are effectively invisible until some other missing action has already run analysis | `src/components/adversarial/AdversarialLab.tsx:780-803`, `src/components/scanner/ScannerInsightsPanel.tsx:158-204` |
| `arena` module | De-nav'd | Deep link, widget routes, or assistant navigation | Still mounted in `page.tsx`, but hidden in `NAV_ITEMS` and filtered out of sidebar and command palette | `src/lib/constants.ts:110-117`, `src/app/page.tsx:247-259`, `src/components/layout/Sidebar.tsx:33-37`, `src/components/layout/CommandPalette.tsx:26-29` |
| `sengoku` module | De-nav'd | Deep link, widget routes, or assistant navigation | Still mounted in `page.tsx`, but removed from primary nav and described as demoted into Atemi | `src/lib/constants.ts:127-136`, `src/app/page.tsx:196-204`, `src/components/layout/Sidebar.tsx:33-37` |
| `strategic` legacy hub | De-nav'd | Deep link, some widget header clicks, mobile more drawer bug | Still a valid NavId, but route now renders only a retired notice; some dashboard targets still point to it | `src/lib/constants.ts:206-217`, `src/app/page.tsx:179-184`, `src/components/dashboard/NODADashboard.tsx:98-126` |
| `armory` legacy nav id | Legacy-only | Assistant navigation or stale links | Still a NavId for back-compat and assistant tooling, but this audit did not find a live `page.tsx` renderer for it; content appears absorbed into Buki | `src/lib/constants.ts:82-88`, `src/components/buki/PayloadLab.tsx:1-8`, `src/lib/sensei/tool-definitions.ts:363-368`, `src/app/page.tsx:120-270` |
| Dashboard personalization surface | Buried | Dashboard settings icon only | 22 of 30 widgets are hidden on first load, including multiple module entrypoints and status surfaces | `src/components/dashboard/NODADashboard.tsx:256-264`, `src/components/dashboard/DashboardCustomizer.tsx:239-266`, `src/components/dashboard/DashboardConfigContext.tsx:61-118` |
| Hidden-by-default module entry widgets: Arena, Sengoku, Time Chamber, Kotoba, Ronin, SAGE, Mitsuke | Buried | Dashboard Customizer -> enable widget -> click widget | These widgets act like secondary navigation for hidden or low-salience modules, but users will not see them without customization | `src/components/dashboard/DashboardConfigContext.tsx:85-107`, `src/components/dashboard/widgets/SengokuWidget.tsx:25-35`, `src/components/dashboard/widgets/TimeChamberWidget.tsx:29-38`, `src/components/dashboard/widgets/KotobaWidget.tsx:24-33`, `src/components/dashboard/widgets/RoninHubWidget.tsx:93-103` |
| Module Visibility dialog | Buried | Dashboard Customizer -> "Module Visibility" | Entire modules can be toggled on or off, but the control is hidden behind a second-order settings panel | `src/components/dashboard/DashboardCustomizer.tsx:259-266`, `src/components/dashboard/SenseiPanel.tsx:1-46` |
| Secret keyboard sequence for module visibility | Buried | Dashboard only; hidden input sequence | A Konami-style key sequence opens the same dialog with no on-screen affordance | `src/hooks/useSenseiScroll.ts:1-64`, `src/components/dashboard/NODADashboard.tsx:335-346` |
| Sensei assistant tool surface | Assistant-only | Top-bar bot button or floating Sensei button | Sensei can invoke 33 tools, including hidden navigation and workflows that do not have equivalent explicit CTAs | `src/components/layout/TopBar.tsx:117-126`, `src/components/sensei/SenseiDrawer.tsx:85-185`, `src/lib/sensei/tool-definitions.ts:765-811` |
| Sensei navigation to hidden modules | Assistant-only | `navigate_to` accepts hidden module ids | Sensei can route users to `arena`, `strategic`, and `sengoku`, and it also still accepts the legacy-only `armory` id | `src/lib/sensei/tool-definitions.ts:361-390` |
| Scanner Deep Scan / Shingan | Buried | Scanner -> `Deep Scan` tab | Powerful multi-format scanning is one level below Haiku Scanner and not promoted elsewhere | `src/app/page.tsx:286-313`, `src/app/page.tsx:385-389`, `src/components/shingan/ShinganPanel.tsx:423-829` |
| Shingan batch and URL endpoints | UI/API gap | No first-class UI found for `/api/shingan/batch` or `/api/shingan/url` | Shingan UI does single scans and client-side batch looping over `/api/shingan/scan`, but dedicated batch and URL routes exist without a surfaced workflow | `src/components/shingan/ShinganPanel.tsx:518-583`, `src/app/api/shingan/batch/route.ts:1-75`, `src/app/api/shingan/url/route.ts:1-80` |
| Atemi Playbooks sub-panels: Protocol Fuzz, Agentic, WebMCP | Buried | Atemi Lab -> Playbooks -> pill switcher | These are substantial sub-workspaces, but they are one level below Atemi and easy to miss | `src/components/adversarial/PlaybooksComposite.tsx:231-265` |
| Protocol Fuzz | Mock-backed / non-live | Atemi Lab -> Playbooks -> Protocol Fuzz | Panel is reachable, but it runs mock async results rather than a real backend fuzz job | `src/components/scanner/ProtocolFuzzPanel.tsx:21-24`, `src/components/scanner/ProtocolFuzzPanel.tsx:107-115` |
| WebMCP attack testing | Mock-backed / non-live | Atemi Lab -> Playbooks -> WebMCP | UI validates URL and categories but generates synthetic findings locally instead of calling a service | `src/components/adversarial/PlaybooksComposite.tsx:203-219` |
| Payload Lab Generator (SAGE) | Buried | Buki -> `Generator` tab | SAGE was relocated out of Kumite and is now only discoverable inside Buki | `src/components/buki/PayloadLab.tsx:26-29`, `src/components/buki/PayloadLab.tsx:196-200` |
| Payload Lab Fuzzer | Buried + non-live risk | Buki -> `Fuzzer` tab | Fuzzer UI exists but depends on `/api/buki/fuzz`, and no matching route was found under `src/app/api` | `src/components/buki/FuzzerPanel.tsx:10-12`, `src/components/buki/FuzzerPanel.tsx:50-74` |
| Jutsu model detail workspace | Buried | Click a model card in Jutsu | Rich five-tab detail exists, but it is modal-only and lacks direct CTA for OBL or analytics actions | `src/components/llm/JutsuTab.tsx:327-349`, `src/components/llm/ModelDetailView.tsx:1-160` |
| LLM leaderboard and analytics | Buried / relocated | Bushido Book -> `Results` tab | These surfaces were moved out of Model Lab, so users looking in Jutsu may not discover them | `src/components/llm/ModelLab.tsx:3-8`, `src/components/compliance/ComplianceCenter.tsx:450-458`, `src/components/compliance/ComplianceCenter.tsx:623-645`, `src/components/llm/AnalyticsWorkspace.tsx:22-120` |
| Activity drawer as results surface | Buried | Top bar activity icon | ModelLab comments explicitly state results were demoted to activity surfaces rather than first-class model UI | `src/components/llm/ModelLab.tsx:5-7`, `src/components/layout/TopBar.tsx:114-165` |
| Contrastive Prompt Bias tool | Orphaned | No live import found | Component exists but was not found mounted in the live tree during this audit | `src/components/adversarial/ContrastiveBiasCard.tsx:1-60` |

## Navigation and Discoverability Bugs

These are not just hidden features; they are concrete UI inconsistencies.

### 1. Mobile navigation leaks a hidden legacy item

The mobile `More` drawer filters `hidden` items for grouped modules, but not for ungrouped ones. That means the hidden `strategic` item can still appear on mobile.

Evidence:

- `src/lib/constants.ts:211-217`
- `src/components/layout/MobileNav.tsx:209-279`

Impact:

- Desktop and command palette say `strategic` is retired.
- Mobile can still offer it as a destination.

### 2. Dashboard widget header targets still point at retired or hidden modules

Several widget header clicks still navigate to `strategic`, which now renders only `KumiteRetiredNotice`.

Evidence:

- `src/components/dashboard/NODADashboard.tsx:98-126`
- `src/app/page.tsx:179-184`

Affected widget targets:

- `threat-radar`
- `arena-leaderboard`
- `sage-status`
- `mitsuke-alerts`

### 3. `arena-leaderboard` widget has conflicting destinations

The widget header target points to `strategic`, while the explicit action button routes to `adversarial`, not `arena`.

Evidence:

- `src/components/dashboard/NODADashboard.tsx:105-108`
- `src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx:40-49`

Impact:

- Users get three competing destinations for one Arena concept: retired Kumite, Atemi, and the hidden `arena` module.

### 4. Invalid widget target blocks Ecosystem Pulse navigation

`WIDGET_NAV_TARGET` uses `attackdna`, but the real nav id is `dna`. `WidgetCard` validates targets against `NAV_ITEMS`, so the header is silently non-clickable.

Evidence:

- `src/components/dashboard/NODADashboard.tsx:119-125`
- `src/components/dashboard/WidgetCard.tsx:24-25`
- `src/lib/constants.ts:175-181`

## Mock-Backed or Placeholder Surfaces

These features should either be promoted to live status or clearly labeled as preview/demo.

- `ProtocolFuzzPanel` uses mock results only.
- WebMCP testing synthesizes findings locally.
- `TransferMatrixPanel` uses a hardcoded matrix.
- `ArenaLeaderboardWidget`, `SengokuWidget`, `TimeChamberWidget`, and `KotobaWidget` use mock widget data.
- `orchestrator/status` returns a placeholder pending payload and is not wired into visible status UI.

Evidence:

- `src/components/scanner/ProtocolFuzzPanel.tsx:21-24`
- `src/components/adversarial/PlaybooksComposite.tsx:213-219`
- `src/components/llm/TransferMatrixPanel.tsx:19-30`
- `src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx:21-28`
- `src/components/dashboard/widgets/SengokuWidget.tsx:14-20`
- `src/components/dashboard/widgets/TimeChamberWidget.tsx:13-23`
- `src/components/dashboard/widgets/KotobaWidget.tsx:13-18`
- `src/app/api/orchestrator/status/route.ts:36-49`

## Assistant-Only Capability Inventory

Sensei is a real hidden feature surface, not just a helper chat box.

Notable tool-only or tool-first actions include:

- `create_arena_match`
- `list_arena_matches`
- `get_warriors`
- `run_agentic_test`
- `run_orchestrator`
- `generate_attack`
- `judge_response`
- `list_campaigns`
- `create_campaign`
- `query_dna`
- `analyze_dna`
- `get_guard_audit`
- `get_leaderboard`

Evidence:

- `src/lib/sensei/tool-definitions.ts:418-810`

Recommendation:

- Decide which of these are intentionally Sensei-only and label them as such.
- For the rest, add "Open in UI" or "Create with Sensei" reciprocal entry points.

## API Surfaces With Weak or Missing UI Coverage

This is an appendix of likely UI-surface gaps, not a claim that every route is a bug. Dynamic fetch construction means simple grep undercounts some references.

High-signal candidates from this audit:

- `/api/shingan/batch`
- `/api/shingan/url`
- `/api/compliance/frameworks`
- `/api/compliance/export`
- `/api/orchestrator/status`
- `/api/llm/coverage`
- `/api/v1/arena`
- `/api/v1/sengoku`
- `/api/v1/timechamber`

Why they matter:

- they expose real or legacy feature intent,
- they lack clear first-class UI entry points,
- some are now out of sync with what the visible UI suggests.

Evidence:

- `src/app/api/shingan/batch/route.ts:1-75`
- `src/app/api/shingan/url/route.ts:1-80`
- `src/app/api/compliance/frameworks/route.ts:1-74`
- `src/app/api/orchestrator/status/route.ts:1-65`
- route-scan findings from this audit

## Recommended Surfacing Plan

### P0

- Add explicit `Run OBL` actions in Jutsu model cards or the model detail drawer.
- Replace widget targets that still point to `strategic`.
- Fix mobile `More` drawer so hidden ungrouped items are also filtered.
- Decide whether `arena` and `sengoku` should remain hidden; if not, restore direct nav.

### P1

- Promote a small set of hidden-by-default widgets into role-based dashboard presets.
- Add first-class CTAs from Jutsu to Bushido `Results` and from Bushido back to Jutsu models.
- Add visible entry points for Shingan URL scan and true batch scan if those routes are meant to be used.
- Add "Sensei can do more" affordances next to assistant-only workflows.

### P2

- Either wire live backends for Protocol Fuzz, WebMCP, Fuzzer, Transfer Matrix, and dashboard teaser widgets, or label them as preview/demo.
- Remove or archive unmounted artifacts such as `ContrastiveBiasCard` if they are no longer part of the product plan.
- Audit widget navigation targets for invalid or stale NavIds.

## Product-Level Takeaway

The codebase has more capability than the current UI communicates. The biggest issue is no longer raw implementation coverage; it is surfacing strategy and coherence.

Right now the platform has:

- hidden modules,
- hidden widgets,
- hidden assistant powers,
- hidden state-dependent panels,
- and hidden mock-vs-live status.

If the team wants users to "make the best of" what already exists, the next step is not only building new features. It is making the existing ones legible, reachable, and trustworthy.
