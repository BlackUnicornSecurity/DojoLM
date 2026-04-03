# UAT / UX Testing Plan

This is the active entry point for user-acceptance and UX testing coverage.
It operates under [../QA/QA-MASTER-PLAN.md](../QA/QA-MASTER-PLAN.md), which remains the top-level source of truth for testing workflow and release gates.
Playwright is the default runner for every browser-automatable journey.

## System Of Record

- Policy and coverage rules: this document
- Live surface inventory and gap register: [../QA/UAT-UX-COVERAGE-MATRIX.generated.md](../QA/UAT-UX-COVERAGE-MATRIX.generated.md)
- Product/module inventory baselines: [../../../docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md), [../../../docs/user/PLATFORM_GUIDE.md](../../../docs/user/PLATFORM_GUIDE.md), [../../../docs/user/modules/README.md](../../../docs/user/modules/README.md)
- Historical references: [../QA/archive/QA-UAT-TEST-PLAN.md](../QA/archive/QA-UAT-TEST-PLAN.md), [../QA/archive/noda-qa-master.md](../QA/archive/noda-qa-master.md)

## 100% Coverage Standard

- 100% inventory coverage means every current module, documented submodule, tab, mode, standalone page, layout/global UX surface, dashboard widget, interactive component, and actionable control is present in the generated matrix.
- 100% journey coverage means each tracked surface has an assigned runner and a minimum required coverage set.
- 100% control coverage means every changed CTA, button, icon button, tab trigger, dropdown action, drawer toggle, row action, pagination control, search trigger, submit action, and recovery CTA is traceable to a reviewed surface.
- 100% change control means every new or changed user-facing surface is regenerated into the matrix and either has Playwright coverage added or is recorded as an explicit gap with an owner.
- 100% does not mean every gap is already closed today. It means no user-facing surface is missing from the plan.

## Playwright-First Policy

- Use Playwright for modules, pages, nav, drawers, dialogs, forms, widgets, and cross-module browser workflows.
- Require desktop, mobile, keyboard, empty/error, and recovery coverage for modules and primary pages.
- Use `Playwright + manual visual` for charts, gauges, trees, sparklines, heatmaps, and other visual-heavy surfaces.
- Use `Playwright + manual device` for upload, download, audio, video, clipboard-like, or device-sensitive behavior.
- Record every manual-only validation in a QA log entry so the exception is traceable.
- Treat matrix spec references as planning signals only. A referenced surface or control is not automatically proven at the exact control/path level without matching execution evidence.

## Control-Level Standard

- Treat actionable controls as first-class UAT scope, not incidental markup inside a larger component.
- Hidden controls still count. Controls inside drawers, menus, accordions, tabs, steppers, table rows, and empty states remain in scope.
- For each changed control verify: accessible name or truthful visible label, enabled/disabled/loading state, keyboard access, focus order, success path, failure/recovery path, and responsive placement.
- Do not ship controls that imply unavailable behavior. Placeholder actions, dead shortcuts, inert search affordances, and misleading empty-state CTAs must be fixed or explicitly documented as non-interactive.
- Review the actionable-control inventory and manual-label audit queue in [../QA/UAT-UX-COVERAGE-MATRIX.generated.md](../QA/UAT-UX-COVERAGE-MATRIX.generated.md) after every user-facing change.

## Adversarial UAT Guardrails

- A surface row with Playwright references does not prove each nested control. Parent-surface references are planning signals until direct control-to-test mapping exists.
- When multiple module labels share one render file, record evidence per module label or journey. Do not let one sibling flow piggyback on another's reference.
- The generated control inventory is static-source derived and can miss controls created through runtime data, portals, third-party widgets, or expression-only labels. Add a manual QA addendum when those patterns change.
- Treat the manual-label audit queue as a blocker for changed controls, not as a cosmetic backlog. Icon-only or expression-only actions must gain an accessible name or an explicit QA exception.
- Do not describe heuristic or inherited matrix references as button-level proof in release notes or sign-off language.

## Required Coverage By Surface

| Surface | Minimum Coverage |
| --- | --- |
| Module journey | load, primary path, cross-module CTA, empty/error, keyboard, mobile |
| Standalone page | load, primary CTA or recovery, auth/error state, responsive, back/nav path |
| Layout or global UX | discovery, open/close, focus management, keyboard escape, responsive |
| Dashboard widget | render, CTA or navigation target, empty/error, responsive |
| Interactive component | happy path, validation, disabled/loading, keyboard, visible state changes |
| Actionable control | label/accessibility, enabled/disabled/loading, keyboard/focus, success/failure path, desktop/mobile placement |
| Cross-module workflow | source action, target side effect, persistence, return path, failure handling |

## Environment-Specific UAT/UX Rules

### Local Dev

- Default runner: Playwright against `http://localhost:42001`.
- Suitable for iterative development and pre-merge validation.
- Mobile coverage uses emulated viewports only.

### Production (`https://dojo.bucc.internal`)

- **All UAT sign-off must be performed against production**, not local dev. Users experience the prod deployment; local-only UAT is insufficient for release approval.
- Run with: `E2E_TARGET=prod npm run test:e2e --workspace=dojolm-web`
- Production Playwright config adds a `mobile-chrome` project (Pixel 5 viewport) automatically, closing the mobile-only control gap for UAT.
- Longer timeouts (60s test, 20s assertion) account for network latency and Caddy proxy overhead.
- Screenshots captured for every test (not just failures) to serve as UAT evidence.
- Video recorded for every run to support async review and stakeholder demo.
- Archive the production Playwright HTML report and `prod-results.json` from the package-local `e2e-results` directory as UAT evidence in `team/testing/QA/QA-Log/`.
- Before the run, verify the production browser bundle uses relative or approved production API URLs, not `localhost` or a developer-host address.
- Record the starting production state for environment-sensitive surfaces such as Hattori Guard mode, widget data readiness, and API base-path assumptions so false negatives are not mistaken for product regressions.

### Production Safety

- UAT E2E tests must be read-only. Do not create, modify, or delete persistent data unless the test plan approves it and cleanup is automated.
- Do not pass real admin credentials via shared terminals or CI logs.

## Release Controls

- Regenerate the inventory with `node team/testing/tools/generate-uat-ux-matrix.mjs`.
- Run Playwright locally: `npm run test:e2e --workspace=dojolm-web`.
- Run Playwright against production: `E2E_TARGET=prod npm run test:e2e --workspace=dojolm-web`.
- Do not mark UAT/UX complete if a changed surface still shows as `playwright gap` in the generated matrix.
- Do not mark UAT/UX complete if a changed actionable control is missing from the control inventory or left in the manual-label audit queue without explanation.
- Do not mark UAT/UX complete if a changed surface or control has only heuristic or inherited references and no matching execution evidence.
- Do not mark UAT/UX complete without at least one production E2E run for the release scope.
- Do not mark UAT/UX complete if the production bundle still points user journeys at `localhost`, a lab IP, or any unintended non-production API host.
- Do not mark UAT/UX complete if dashboard, widget, or other async-heavy suites were only checked after warm-cache retry. Cold-load and refresh behavior must be reviewed or logged as a gap.
- Do not mark UAT/UX complete if guard-aware or env-sensitive journeys failed without recording the observed prod state and expected state in the QA log.
- Do not summarize UAT/UX as `PASS` when a mandatory production E2E suite is partial or failing. Use `PARTIAL` or `BLOCKED` and log owner, exception approver, and expiry.
- If `NAV_ITEMS` changes, update the navigation suite in the same change.
- If multiple module labels share one render file, capture per-label evidence in the same change.
- If module names, tabs, or user-visible workflow labels change, update `docs/user/PLATFORM_GUIDE.md` and the relevant file under `docs/user/modules/` in the same change.
- Production config includes mobile viewport project — verify mobile coverage in prod results.

## Current Priority Backlog

- Treat [../QA/UAT-UX-COVERAGE-MATRIX.generated.md](../QA/UAT-UX-COVERAGE-MATRIX.generated.md) as the live backlog. Do not rely on a static hand-maintained priority list once the matrix is refreshed.
- Prioritize any changed row marked `playwright gap`, `manual gap`, or `manual label audit`.
- Prioritize any production-only failure class caused by bundle URL leakage, cold-load timing, or guard/env parity drift because those can invalidate otherwise-correct UAT evidence.
- Prioritize top-level pages, global layout shells, module root views, and shared widgets before leaf components.
- Close any mismatch between the generated matrix, `NAV_ITEMS`, `docs/user/PLATFORM_GUIDE.md`, and module-guide submodule listings before release sign-off.
