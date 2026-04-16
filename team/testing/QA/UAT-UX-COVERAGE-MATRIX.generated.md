# UAT / UX Coverage Matrix (Generated)

Generated on 2026-04-16T11:41:21.603Z.

This file inventories the current user-facing DojoLM surface area for UAT and UX planning.
Playwright is the default runner whenever the surface is automatable in-browser.
Spec references are heuristic planning signals based on current Playwright suite text, not proof that every listed control or path is directly asserted.

## Audit Signals

| Metric | Value |
| --- | --- |
| Nav modules tracked | 16 |
| Standalone app surfaces tracked | 6 |
| Global UX/layout surfaces tracked | 9 |
| Dashboard widgets tracked | 32 |
| Interactive components tracked | 148 |
| Actionable controls tracked | 604 |
| Controls with explicit labels | 389 |
| Controls needing manual label audit | 215 |
| Controls with direct control-to-test proof | 191 |
| Controls inheriting parent-surface references | 183 |
| Control Playwright gaps | 15 |
| Shared module render files | 0 |
| Playwright specs in repo | 27 |
| Playwright projects configured | 4 |
| Mobile Playwright projects configured | 3 |
| Navigation spec modules declared | 11 |
| Playwright config status | desktop+mobile configured |
| Navigation inventory parity | mismatch (11/16; missing 6; unexpected 1) |

## Runner Policy

| Surface Type | Default Runner | Notes |
| --- | --- | --- |
| Modules / routes / nav | Playwright | Desktop + mobile + keyboard paths are required. |
| Widgets / drawers / dialogs / forms | Playwright | Include empty, error, and responsive states. |
| Charts / graphs / visual summaries | Playwright + manual visual | Playwright for behavior; manual pass for visual correctness. |
| File/audio/video/device-sensitive UX | Playwright + manual device | Automate the browser path and supplement with manual device validation. |

## Execution Controls

| Control | Current Status | Evidence | Required Action |
| --- | --- | --- | --- |
| Surface inventory freshness | pass | `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md` | regenerate this file whenever app navigation, pages, widgets, or interactive components change |
| Playwright config breadth | desktop+mobile configured | `packages/dojolm-web/playwright.config.ts` (chromium, mobile-chrome, iphone-12 +1) | keep desktop/mobile projects aligned with UX policy |
| Navigation spec parity | mismatch (11/16; missing 6; unexpected 1) | `packages/dojolm-web/e2e/navigation.spec.ts` (11/16 modules; missing Armory, Buki +4; unexpected Model Lab) | update navigation coverage to the full current module inventory and exact labels |
| Actionable control naming | 215 controls need manual label audit | `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md` actionable-control inventory | review icon-only or expression-only controls and add accessible names or QA notes before release sign-off |
| Control-level proof layer | 191 direct proof link(s) detected | `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md` actionable-control inventory | expand explicit selector assertions to reduce inherited-only control coverage |
| Shared module render files | none | -- | keep module-to-file ownership stable |

## Shared Module Render Files

No shared render files detected across tracked module root surfaces.

## Current Playwright Inventory

| Spec | Suite | Tests | Primary Focus |
| --- | --- | --- | --- |
| `packages/dojolm-web/e2e/admin-controls.spec.ts` | Admin Controls | 21 | admin-controls, Admin Controls |
| `packages/dojolm-web/e2e/admin.spec.ts` | Admin | 2 | admin, Admin |
| `packages/dojolm-web/e2e/api-security.spec.ts` | API Security | 4 | api-security, API Security |
| `packages/dojolm-web/e2e/arena-matrix.spec.ts` | Battle Arena | 6 | arena-matrix, Battle Arena |
| `packages/dojolm-web/e2e/atemi-lab.spec.ts` | Atemi Lab | 13 | atemi-lab, Atemi Lab |
| `packages/dojolm-web/e2e/attackdna.spec.ts` | Amaterasu DNA | 11 | attackdna, Amaterasu DNA |
| `packages/dojolm-web/e2e/compliance.spec.ts` | Bushido Book | 14 | compliance, Bushido Book |
| `packages/dojolm-web/e2e/component-controls.spec.ts` | Component Controls | 51 | component-controls, Component Controls |
| `packages/dojolm-web/e2e/cross-module.spec.ts` | Cross-Module Actions | 3 | cross-module, Cross-Module Actions |
| `packages/dojolm-web/e2e/dashboard-widgets.spec.ts` | Dashboard Widgets | 9 | dashboard-widgets, Dashboard Widgets |
| `packages/dojolm-web/e2e/global-setup.ts` | global-setup.ts | 0 | global-setup.ts |
| `packages/dojolm-web/e2e/global-teardown.ts` | global-teardown.ts | 0 | global-teardown.ts |
| `packages/dojolm-web/e2e/guard.spec.ts` | Hattori Guard | 16 | guard, Hattori Guard |
| `packages/dojolm-web/e2e/kotoba.spec.ts` | Kotoba | 15 | kotoba, Kotoba |
| `packages/dojolm-web/e2e/llm-dashboard.spec.ts` | Model Lab | 13 | llm-dashboard, Model Lab |
| `packages/dojolm-web/e2e/mobile-nav.spec.ts` | Mobile Navigation | 11 | mobile-nav, Mobile Navigation |
| `packages/dojolm-web/e2e/navigation.spec.ts` | Navigation | 3 | navigation, Navigation |
| `packages/dojolm-web/e2e/pages.spec.ts` | 404 Page | 9 | pages, 404 Page |
| `packages/dojolm-web/e2e/ronin-hub.spec.ts` | Ronin Hub | 14 | ronin-hub, Ronin Hub |
| `packages/dojolm-web/e2e/scanner.spec.ts` | Scanner | 4 | scanner, Scanner |
| `packages/dojolm-web/e2e/sengoku.spec.ts` | Sengoku | 13 | sengoku, Sengoku |
| `packages/dojolm-web/e2e/sensei-api.spec.ts` | SENSEI-005: Sensei API routes | 3 | sensei-api, SENSEI-005: Sensei API routes |
| `packages/dojolm-web/e2e/sensei.spec.ts` | Sensei Chat | 15 | sensei, Sensei Chat |
| `packages/dojolm-web/e2e/shingan.spec.ts` | Shingan Scanner | 9 | shingan, Shingan Scanner |
| `packages/dojolm-web/e2e/test-lab.spec.ts` | Buki (Payload Lab) | 7 | test-lab, Buki (Payload Lab) |
| `packages/dojolm-web/e2e/visual-regression.spec.ts` | Visual Regression — Critical Pages | 9 | visual-regression, Visual Regression — Critical Pages |
| `packages/dojolm-web/e2e/widget-controls.spec.ts` | Widget Controls | 33 | widget-controls, Widget Controls |

## Coverage Summary

| Category | Tracked | Currently Heuristically Referenced | Playwright Gaps |
| --- | --- | --- | --- |
| module | 16 | 16 | 0 |
| page | 6 | 6 | 0 |
| layout | 9 | 9 | 0 |
| widget | 32 | 31 | 1 |
| component | 148 | 131 | 17 |

## Actionable Control Summary

Control inventory is file-based to avoid duplicate rows when multiple module labels share one rendering surface.
Control inventory is static-source derived and can miss controls created only through runtime data, portals, or third-party widgets.
Control rows include direct-proof links when explicit selector phrases in Playwright specs match control labels.
Direct-proof links are heuristic and should be paired with run evidence for release sign-off.

| Source Category | Controls Tracked | Direct Proof Links | Inherited Parent-Surface References | Playwright Gaps | Manual Gaps | Manual Label Audit |
| --- | --- | --- | --- | --- | --- | --- |
| component | 462 | 131 | 140 | 14 | 0 | 177 |
| layout | 33 | 5 | 10 | 0 | 0 | 18 |
| module | 64 | 31 | 22 | 0 | 0 | 11 |
| page | 14 | 4 | 8 | 0 | 0 | 2 |
| widget | 31 | 20 | 3 | 1 | 0 | 7 |

## Actionable Control Inventory

<details>
<summary>Actionable control inventory (604 controls)</summary>

| Surface | Category | Control | Label | Line | Direct Proof Refs | Spec References | Status | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary:error | page | button | Try again | 36 | -- | component-controls.spec.ts, pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/error.tsx` |
| app-shell:/ | page | link | Skip to main content | 38 | -- | component-controls.spec.ts, guard.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/app/layout.tsx` |
| /login | page | button | manual audit required | 124 | -- | global-setup.ts, pages.spec.ts, visual-regression.spec.ts | manual label audit | `packages/dojolm-web/src/app/login/page.tsx` |
| boundary:404 | page | link | Return to Dashboard | 19 | -- | pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/not-found.tsx` |
| dashboard-root:/ | page | button | manual audit required | 96 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | manual label audit | `packages/dojolm-web/src/app/page.tsx` |
| dashboard-root:/ | page | tab-trigger | interactive | 326 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/app/page.tsx` |
| dashboard-root:/ | page | tab-trigger | deep-scan | 327 | atemi-lab.spec.ts, shingan.spec.ts | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | direct control proof | `packages/dojolm-web/src/app/page.tsx` |
| /style-guide | page | button | Primary Action | 137 | -- | pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Secondary | 138 | pages.spec.ts | pages.spec.ts | direct control proof | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Default | 161 | -- | pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Primary | 162 | pages.spec.ts | pages.spec.ts | direct control proof | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Outline | 163 | -- | pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Secondary | 164 | pages.spec.ts | pages.spec.ts | direct control proof | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Ghost | 165 | -- | pages.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| Admin | module | tab-trigger | manual audit required | 132 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| AdminSettings | component | button | Edit settings | 128 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| AdminSettings | component | button | Save settings | 139 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| AdminSettings | component | button | Cancel editing | 148 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| ApiKeyManager | component | button | Refresh providers | 140 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Add Key | 148 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Test | 250 | llm-dashboard.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 259 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 381 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Cancel | 405 | sengoku.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Save | 412 | -- | admin-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | component | button | manual audit required | 56 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | component | button | manual audit required | 82 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | manual audit required | 121 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | WARNING+ | 156 | -- | admin-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | CRITICAL only | 170 | -- | admin-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| SystemHealth | component | button | Refresh health status | 121 | component-controls.spec.ts | admin-controls.spec.ts, api-security.spec.ts, arena-matrix.spec.ts +22 | direct control proof | `packages/dojolm-web/src/components/admin/SystemHealth.tsx` |
| UserManagement | component | button | Add User | 77 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | manual audit required | 154 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | Cancel | 240 | sengoku.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | Create User | 241 | admin-controls.spec.ts | admin-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | component | button | Run full validation | 730 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Run calibration only | 744 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 987 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | JSON | 997 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Previous page | 1019 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Next page | 1031 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download JSON report | 1057 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download CSV report | 1067 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download Markdown report | 1077 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Verify signature | 1146 | -- | admin-controls.spec.ts, component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 1216 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Traceability Chain | 1457 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Recalibrate all modules | 1551 | admin-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| Atemi Lab | module | button | Open Atemi Lab configuration | 584 | atemi-lab.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 626 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Run OBL behavioral analysis for selected model | 715 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Dismiss | 744 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 788 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | attack-tools | 853 | atemi-lab.spec.ts, component-controls.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | playbooks | 858 | atemi-lab.spec.ts, component-controls.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | campaigns | 862 | atemi-lab.spec.ts, sengoku.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | arena | 866 | atemi-lab.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | test-cases | 870 | atemi-lab.spec.ts, component-controls.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Launch Kagami mirror testing | 1026 | atemi-lab.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Launch Shingan deep scan | 1054 | atemi-lab.spec.ts, shingan.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| AtemiConfig | component | button | Close config panel | 192 | component-controls.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | manual audit required | 232 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | None Manual single-turn attacks | 259 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | manual audit required | 281 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Toggle auto-logging | 413 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Reset | 438 | component-controls.spec.ts, dashboard-widgets.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Save Configuration | 445 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiGettingStarted | component | button | Getting Started / steps completed | 84 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AtemiGettingStarted | component | button | Dismiss getting started guide | 102 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AtemiGettingStarted | component | button | Got it, don&apos;t show again → | 160 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AttackLog | component | button | manual audit required | 202 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| AttackToolCard | component | button | attack | 193 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Confirm | 228 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Cancel | 238 | sengoku.spec.ts | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Learn More | 273 | atemi-lab.spec.ts | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| McpConnectorStatus | component | button | Refresh connection status | 273 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Toggle troubleshooting panel | 286 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Start MCP server | 328 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Stop MCP server | 345 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Restart MCP server | 360 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Confirm start MCP server | 405 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Cancel start MCP server | 417 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| PlaybookRunner | component | button | Back | 229 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybookRunner | component | button | completeStep(activeStep.id)}> Mark Complete | 333 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybookRunner | component | button | skipStep(activeStep.id)}> Skip | 337 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybooksComposite | component | button | manual audit required | 62 | -- | atemi-lab.spec.ts, component-controls.spec.ts, dashboard-widgets.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/PlaybooksComposite.tsx` |
| SessionHistory | component | button | Session History | 106 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Clear all session history | 132 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | \| \| events | 196 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | manual audit required | 229 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Close session review | 292 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Delete this session | 446 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Close | 454 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionRecorder | component | button | Stop recording session | 161 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SessionRecorder | component | button | Cancel recording without saving | 171 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SessionRecorder | component | button | Start recording Atemi Lab session | 180 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SkillCard | component | button | manual audit required | 112 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillCard | component | button | manual audit required | 129 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | component | button | Filters | 134 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | input | Search adversarial skills | 154 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 171 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 187 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 212 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 228 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 254 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 270 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | Reset Filters | 293 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | Reset Filters | 327 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | component | button | manual audit required | 233 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 260 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 318 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| ScenarioRunner | component | button | Run | 260 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| ScenarioRunner | component | button | Pause | 265 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| ScenarioRunner | component | button | Reset | 270 | component-controls.spec.ts, dashboard-widgets.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| AmaterasuConfig | component | button | manual audit required | 154 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | Toggle auto-sync | 174 | -- | attackdna.spec.ts, component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 193 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 269 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | component | button | Dismiss tutorial | 169 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | Back | 202 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 224 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 274 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | Close help | 298 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | component | button | Open Amaterasu DNA guide | 331 | ronin-hub.spec.ts | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | button | Open Amaterasu DNA configuration | 339 | atemi-lab.spec.ts | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | input | Search attacks | 376 | attackdna.spec.ts | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | tab-trigger | manual audit required | 392 | -- | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 282 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 290 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | New Analysis | 306 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 338 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 408 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| ClusterView | component | button | nodes % avg similarity | 284 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/ClusterView.tsx` |
| DataSourceSelector | component | button | manual audit required | 79 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DataSourceSelector | component | button | Reset data source filter to show all | 133 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | component | button | manual audit required | 620 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +22 | manual label audit | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | component | button | manual audit required | 226 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Zoom out | 409 | component-controls.spec.ts | attackdna.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Zoom in | 420 | component-controls.spec.ts | attackdna.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Reset zoom | 428 | component-controls.spec.ts | attackdna.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | select-trigger | Select attack family | 596 | atemi-lab.spec.ts | attackdna.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| MutationTimeline | component | input | Filter start date | 393 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| MutationTimeline | component | input | Filter end date | 403 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| MutationTimeline | component | button | Clear date filter | 413 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| NodeDetailPanel | component | button | Close node detail panel | 109 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| XRayPanel | component | button | manual audit required | 87 | -- | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | button | Suggested Mitigations | 183 | -- | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | button | Open Forge Defense | 207 | -- | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | input | Search attack patterns | 287 | -- | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| FuzzerPanel | component | button | manual audit required | 102 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/buki/FuzzerPanel.tsx` |
| FuzzerPanel | component | button | manual audit required | 140 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/buki/FuzzerPanel.tsx` |
| Buki | module | tab-trigger | fixtures | 98 | test-lab.spec.ts | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| Buki | module | tab-trigger | payloads | 102 | component-controls.spec.ts, test-lab.spec.ts | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| Buki | module | tab-trigger | generator | 106 | component-controls.spec.ts, test-lab.spec.ts | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| Buki | module | tab-trigger | fuzzer | 110 | test-lab.spec.ts | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| Buki | module | button | Retry | 122 | component-controls.spec.ts | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| AuditTrail | component | button | Retry | 210 | component-controls.spec.ts | component-controls.spec.ts, guard.spec.ts | direct control proof | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| AuditTrail | component | button | Refresh audit log | 316 | -- | component-controls.spec.ts, guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| Bushido Book | module | button | manual audit required | 221 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Group by tier | 495 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Group by category | 510 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Open Coverage Dashboard | 576 | compliance.spec.ts | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | tab-trigger | manual audit required | 595 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 683 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Changes | 888 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Comparison | 900 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Back to Coverage | 1051 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Back to Coverage | 1229 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Test in Atemi Lab | 1375 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Run compliance scan | 1539 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 1599 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| ComplianceChecklist | component | button | Select compliance framework | 337 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 381 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | Export checklist as text file | 419 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 433 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | All Categories | 452 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 468 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 503 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 571 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | component | button | manual audit required | 258 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| ComplianceExport | component | select-trigger | Export format | 207 | -- | admin-controls.spec.ts, component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| ComplianceExport | component | button | Export | 216 | admin-controls.spec.ts, arena-matrix.spec.ts, compliance.spec.ts +1 | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| FrameworkNavigator | component | button | Source | 148 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | BAISS | 162 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | input | Search controls | 185 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 205 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 239 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 260 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | component | button | manual audit required | 180 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| GapMatrix | component | button | Columns | 196 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 65 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 95 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 116 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 123 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | Close customizer | 244 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | Reset to Defaults | 252 | dashboard-widgets.spec.ts | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | Manage which modules appear in the sidebar | 260 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| Dashboard | module | button | Go to Scanner | 242 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Go to Model Lab | 247 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Go to Hattori Guard | 252 | guard.spec.ts, mobile-nav.spec.ts | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | direct control proof | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Manage module visibility | 257 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Customize / | 266 | dashboard-widgets.spec.ts | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | direct control proof | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| SenseiPanel | component | button | manual audit required | 62 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | manual audit required | 107 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | Reset All | 144 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetEmptyState | component | button | manual audit required | 36 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| ArenaLeaderboardWidget | widget | button | View Arena Leaderboard | 57 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay | widget | button | manual audit required | 60 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget | widget | button | Open Bushido Book | 54 | compliance.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| DojoReadiness | widget | button | Dismiss onboarding | 49 | component-controls.spec.ts | component-controls.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| DojoReadiness | widget | button | manual audit required | 65 | -- | component-controls.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| EcosystemPulseWidget | widget | button | Data Flow Details | 168 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| FixtureRoulette | widget | button | Another | 136 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Scan It | 201 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Again | 210 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Discover an Attack | 243 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| GuardQuickPanel | widget | button | Refresh guard events | 27 | -- | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 56 | -- | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 76 | -- | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | Block on WARNING and CRITICAL findings | 102 | admin-controls.spec.ts, component-controls.spec.ts, guard.spec.ts | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | Block on CRITICAL findings only | 116 | admin-controls.spec.ts, guard.spec.ts | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| KotobaWidget | widget | button | Open Kotoba Studio | 19 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMBatchProgress | widget | button | more batch | 147 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| LLMJutsuWidget | widget | button | Open LLM Jutsu | 94 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| LLMModelsWidget | widget | button | Manage LLM Models | 72 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| LLMModelsWidget | widget | button | Configure in Model Lab | 92 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| LLMModelsWidget | widget | button | manual audit required | 111 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| MitsukeAlertWidget | widget | button | View Mitsuke alerts | 98 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| QuickLaunchPad | widget | button | Step | 55 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +13 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchPad.tsx` |
| QuickLLMTestWidget | widget | button | manual audit required | 98 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickLLMTestWidget | widget | button | Run Test | 117 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | widget | button | manual audit required | 72 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| QuickScanWidget | widget | button | Dismiss scan result | 101 | -- | widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| RoninHubWidget | widget | button | Open Ronin Hub | 96 | ronin-hub.spec.ts | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/RoninHubWidget.tsx` |
| SAGEStatusWidget | widget | button | Open SAGE in Buki | 19 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SengokuWidget | widget | button | Open Sengoku Campaigns | 51 | widget-controls.spec.ts | sengoku.spec.ts, widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| TimeChamberWidget | widget | button | Open Time Chamber | 19 | widget-controls.spec.ts | widget-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |
| CategoryTree | component | button | manual audit required | 200 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| CategoryTree | component | button | clean | 224 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureCategoryCard | component | button | Scan | 196 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureCategoryCard | component | button | View | 208 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureComparison | component | button | Close comparison | 50 | component-controls.spec.ts, test-lab.spec.ts | component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureComparison.tsx` |
| FixtureDetail | component | button | Rescan | 85 | -- | atemi-lab.spec.ts, component-controls.spec.ts, mobile-nav.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureDetail | component | button | Close | 96 | -- | atemi-lab.spec.ts, component-controls.spec.ts, mobile-nav.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureExplorer | component | button | manual audit required | 190 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Tree view | 225 | test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Search view | 242 | test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Grid view | 259 | component-controls.spec.ts, test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Compare | 280 | llm-dashboard.spec.ts, test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 471 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | input | for comparison | 624 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 693 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Scan | 704 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | component | button | Filters | 171 | component-controls.spec.ts | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | button | Clear all filters | 197 | component-controls.spec.ts | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | button | manual audit required | 304 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | select-trigger | manual audit required | 330 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | component | button | manual audit required | 229 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureList | component | button | Scan | 238 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureSearch | component | button | Clear search | 189 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Filters | 202 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Clear all filters | 226 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by severity | 241 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by brand | 253 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by type | 265 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Show more ( remaining) | 304 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| MediaViewer | component | button | Zoom out | 137 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| MediaViewer | component | button | Zoom in | 141 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| MediaViewer | component | button | Reset zoom | 144 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 162 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 178 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 214 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | component | button | manual audit required | 68 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 90 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 128 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | Previous page | 236 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | Next page | 247 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| Hattori Guard | module | tab-trigger | overview | 96 | component-controls.spec.ts, guard.spec.ts | component-controls.spec.ts, dashboard-widgets.spec.ts, guard.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| Hattori Guard | module | tab-trigger | hardening | 97 | -- | component-controls.spec.ts, dashboard-widgets.spec.ts, guard.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| Hattori Guard | module | tab-trigger | defenses | 98 | -- | component-controls.spec.ts, dashboard-widgets.spec.ts, guard.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| GuardModeSelector | component | button | manual audit required | 25 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | Block on WARNING and CRITICAL findings | 45 | admin-controls.spec.ts, component-controls.spec.ts, guard.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | Block on CRITICAL findings only | 59 | admin-controls.spec.ts, guard.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | IN OUT | 85 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | component | button | manual audit required | 121 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | component | button | Identify | 152 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Verify | 161 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | probes | 197 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | advanced category selection | 223 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | manual audit required | 258 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | manual label audit | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Features Cutoff Verified | 396 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Fingerprint | 770 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Signatures | 778 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Feature Radar | 786 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiResults | component | button | feature comparison | 128 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| KagamiResults | component | button | Export JSON | 251 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| Kotoba | module | button | Studio | 167 | -- | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | Workshop | 181 | -- | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | Score Prompt | 244 | component-controls.spec.ts, kotoba.spec.ts | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | manual audit required | 316 | -- | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | Harden | 343 | kotoba.spec.ts | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | textarea | Hardened prompt output | 362 | kotoba.spec.ts | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| KotobaWorkshop | component | button | Moderate | 135 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| KotobaWorkshop | component | button | Aggressive | 148 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| KotobaWorkshop | component | button | Apply | 162 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| DashboardGrid | component | button | manual audit required | 107 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| MobileNav | layout | button | manual audit required | 61 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | More | 91 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | Close more menu | 205 | mobile-nav.spec.ts | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 233 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 263 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| NotificationsPanel | layout | button | manual audit required | 83 | -- | atemi-lab.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| NotificationsPanel | layout | button | Mark all as read | 106 | -- | atemi-lab.spec.ts, component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| NotificationsPanel | layout | button | Clear all | 115 | -- | atemi-lab.spec.ts, component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| PageToolbar | layout | button | manual audit required | 77 | -- | attackdna.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| PageToolbar | layout | button | manual audit required | 143 | -- | attackdna.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| Sidebar | layout | button | manual audit required | 52 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +19 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | manual audit required | 137 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +19 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| TopBar | component | button | Activity feed | 32 | -- | component-controls.spec.ts, cross-module.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/TopBar.tsx` |
| TopBar | component | button | Open command palette | 100 | -- | component-controls.spec.ts, cross-module.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/TopBar.tsx` |
| TopBar | component | button | Open Sensei AI assistant | 118 | component-controls.spec.ts, sensei.spec.ts, widget-controls.spec.ts | component-controls.spec.ts, cross-module.spec.ts, guard.spec.ts +4 | direct control proof | `packages/dojolm-web/src/components/layout/TopBar.tsx` |
| TopBar | component | button | Close activity feed | 148 | -- | component-controls.spec.ts, cross-module.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/TopBar.tsx` |
| AnalyticsWorkspace | component | button | Go to Atemi Lab | 119 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/AnalyticsWorkspace.tsx` |
| BenchmarkPanel | component | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | component | button | manual audit required | 72 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | component | button | manual audit required | 107 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| ComparisonView | component | button | Compare selected models | 121 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 247 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 336 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | Test connection to custom provider | 364 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 372 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| JutsuModelCard | component | button | View | 137 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuModelCard | component | button | Re-Test | 146 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuModelCard | component | button | Analyze | 156 | shingan.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuModelCard | component | button | manual audit required | 171 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuTab | component | button | Open Jutsu guide | 267 | ronin-hub.spec.ts, widget-controls.spec.ts | admin-controls.spec.ts, attackdna.spec.ts, compliance.spec.ts +10 | direct control proof | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| JutsuTab | component | button | Open Jutsu settings | 275 | ronin-hub.spec.ts, widget-controls.spec.ts | admin-controls.spec.ts, attackdna.spec.ts, compliance.spec.ts +10 | direct control proof | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| Leaderboard | component | button | By Score | 266 | -- | admin-controls.spec.ts, llm-dashboard.spec.ts, widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| Leaderboard | component | button | By Name | 273 | -- | admin-controls.spec.ts, llm-dashboard.spec.ts, widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| Leaderboard | component | button | Re-test this model | 434 | -- | admin-controls.spec.ts, llm-dashboard.spec.ts, widget-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| LocalModelSelector | component | button | manual audit required | 147 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| LocalModelSelector | component | button | manual audit required | 281 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | component | button | Close model detail | 101 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | overview | 120 | component-controls.spec.ts, guard.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | history | 124 | sensei.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | deliverables | 128 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | training | 132 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | metrics | 136 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 460 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 479 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 528 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | component | button | Close model form | 142 | component-controls.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | select-trigger | manual audit required | 174 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | select-trigger | Select a model | 217 | atemi-lab.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 252 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | input | manual audit required | 291 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | Cancel | 372 | sengoku.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 375 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelLab | component | tab-trigger | models | 79 | llm-dashboard.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | direct control proof | `packages/dojolm-web/src/components/llm/ModelLab.tsx` |
| ModelLab | component | tab-trigger | compare | 83 | llm-dashboard.spec.ts, test-lab.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | direct control proof | `packages/dojolm-web/src/components/llm/ModelLab.tsx` |
| ModelLab | component | tab-trigger | jutsu | 87 | component-controls.spec.ts, llm-dashboard.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | direct control proof | `packages/dojolm-web/src/components/llm/ModelLab.tsx` |
| ModelLab | component | tab-trigger | custom | 91 | llm-dashboard.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | direct control proof | `packages/dojolm-web/src/components/llm/ModelLab.tsx` |
| ModelList | component | button | Retry | 104 | component-controls.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 135 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 152 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 173 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Edit | 331 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 340 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | onToggle(!model.enabled)} > | 351 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 359 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | component | button | Download | 250 | arena-matrix.spec.ts, compliance.spec.ts, component-controls.spec.ts | compliance.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ModelResultCard | component | button | Re-Test | 262 | component-controls.spec.ts | compliance.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ModelResultCard | component | button | manual audit required | 273 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 145 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | Export | 159 | admin-controls.spec.ts, arena-matrix.spec.ts, compliance.spec.ts +1 | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | direct control proof | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 184 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | manual audit required | 199 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | component | select-trigger | All Models | 143 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Model view | 157 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | List view | 166 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | select-trigger | manual audit required | 180 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Clear | 191 | sensei.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Download all results | 196 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 363 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 371 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | component | button | Cancel | 603 | sengoku.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | All | 689 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Clear | 692 | sensei.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 700 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Load Sample Test Cases | 754 | atemi-lab.spec.ts, component-controls.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Show all tests | 765 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 782 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 835 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | View test results | 880 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | component | select-trigger | Select format | 129 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestExporter | component | button | manual audit required | 183 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestSummary | component | tab-trigger | overview | 62 | component-controls.spec.ts, guard.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | scores | 63 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | coverage | 64 | compliance.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | performance | 65 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 331 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 349 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | component | checkbox | manual audit required | 140 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PayloadCard | component | checkbox | manual audit required | 147 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| ConsolidatedReportButton | component | button | Download consolidated report | 131 | admin-controls.spec.ts | admin-controls.spec.ts, compliance.spec.ts | direct control proof | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| ConsolidatedReportButton | component | button | manual audit required | 184 | -- | admin-controls.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | component | button | CVSS Base Metrics | 267 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +14 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| AISeverityCalculator | component | button | manual audit required | 284 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| AISeverityCalculator | component | button | AI-Specific Risk Factors | 309 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +14 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | component | button | manual audit required | 120 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramCard | component | link | manual audit required | 137 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | component | button | Close program details | 58 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramDetail | component | button | manual audit required | 162 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramDetail | component | link | Open on | 175 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramsTab | component | button | Show subscribed programs only | 194 | -- | ronin-hub.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/ProgramsTab.tsx` |
| Ronin Hub | module | button | Open Ronin Hub guide | 121 | ronin-hub.spec.ts | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Ronin Hub | module | button | Open Ronin Hub settings | 129 | ronin-hub.spec.ts | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Ronin Hub | module | tab-trigger | manual audit required | 154 | -- | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| SubmissionDetail | component | button | Close submission detail | 73 | component-controls.spec.ts | ronin-hub.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/SubmissionDetail.tsx` |
| SubmissionsTab | component | button | New Submission | 131 | ronin-hub.spec.ts | ronin-hub.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionsTab | component | button | manual audit required | 148 | -- | ronin-hub.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionsTab | component | button | Create Submission | 196 | -- | ronin-hub.spec.ts, sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | component | button | Close wizard | 143 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | manual audit required | 268 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | + Add Evidence | 279 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Back | 339 | component-controls.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | direct control proof | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Save as Draft | 347 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Next | 352 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Submit | 362 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | component | checkbox | manual audit required | 256 | -- | mobile-nav.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | component | button | manual audit required | 169 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 62 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 85 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | Start Fuzz | 104 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | component | button | Show more examples | 46 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| QuickChips | component | button | manual audit required | 59 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | component | button | manual audit required | 95 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | input | Upload files for multimodal scanning | 340 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | Upload File | 358 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | Scan (⌘↵ / Ctrl+Enter) | 400 | scanner.spec.ts | scanner.spec.ts | direct control proof | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | Clear | 411 | sensei.spec.ts | scanner.spec.ts | direct control proof | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInsightsPanel | component | button | manual audit required | 123 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | tab-trigger | findings | 141 | -- | -- | playwright gap | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | tab-trigger | modules | 145 | -- | -- | playwright gap | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | tab-trigger | reference | 149 | -- | -- | playwright gap | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | button | Open Model Lab to run OBL analysis | 192 | -- | -- | playwright gap | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | button | manual audit required | 253 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| CampaignGraphBuilder | component | button | applyTemplate(tmpl)} > ( ) | 191 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 231 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 243 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 270 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | select-trigger | Continue to next | 286 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | Close skill picker | 328 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 338 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | Add Skill | 353 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 169 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 340 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorVisualization | component | button | Turn | 201 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +21 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 250 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | All | 388 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 401 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | Select All | 419 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | Clear | 422 | sensei.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 430 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 465 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 525 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 529 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| Sengoku | module | button | Start Campaign | 317 | -- | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | tab-trigger | campaigns | 372 | atemi-lab.spec.ts, sengoku.spec.ts | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | tab-trigger | workbench | 376 | -- | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | tab-trigger | temporal | 380 | sengoku.spec.ts | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | manual audit required | 418 | -- | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Create new campaign | 469 | sengoku.spec.ts | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Run Now | 525 | sengoku.spec.ts | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Report | 539 | sengoku.spec.ts | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| TemporalConversation | component | button | manual audit required | 136 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | component | button | turns | 119 | -- | sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| TemporalTab | component | button | Simulation coming soon | 159 | -- | sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| TemporalTab | component | button | manual audit required | 179 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiCapabilityPanel | component | button | Toggle capability summary | 67 | -- | component-controls.spec.ts, global-setup.ts, guard.spec.ts +6 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiCapabilityPanel.tsx` |
| SenseiChat | layout | textarea | Message input | 157 | -- | component-controls.spec.ts, kotoba.spec.ts, sensei-api.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Send message | 174 | -- | component-controls.spec.ts, kotoba.spec.ts, sensei-api.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Confirm | 220 | -- | component-controls.spec.ts, kotoba.spec.ts, sensei-api.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Cancel | 226 | sengoku.spec.ts | component-controls.spec.ts, kotoba.spec.ts, sensei-api.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiDrawer | layout | button | manual audit required | 89 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Clear chat history | 132 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Close Sensei | 140 | sensei.spec.ts | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Dismiss error | 168 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Select model | 296 | atemi-lab.spec.ts | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | manual audit required | 332 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiSuggestions | layout | button | manual audit required | 59 | -- | sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | layout | button | manual audit required | 81 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| SenseiToolResult | layout | button | manual audit required | 383 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| SenseiToolResult | layout | button | manual audit required | 404 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| ConfigureOllamaStep | component | button | manual audit required | 167 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureOllamaStep | component | button | ll configure later | 214 | -- | -- | playwright gap | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureOllamaStep | component | button | manual audit required | 224 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureOllamaStep | component | button | Next | 241 | -- | -- | playwright gap | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 138 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 222 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 246 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| CreateAdminStep | component | button | manual audit required | 168 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| CreateAdminStep | component | button | manual audit required | 209 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| ProvisionSenseiStep | component | button | onComplete(null, null)} > Skip for now | 135 | -- | -- | playwright gap | `packages/dojolm-web/src/components/setup/steps/ProvisionSenseiStep.tsx` |
| ProvisionSenseiStep | component | button | manual audit required | 143 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ProvisionSenseiStep.tsx` |
| ReviewStep | component | button | Launch DojoLM | 89 | -- | -- | playwright gap | `packages/dojolm-web/src/components/setup/steps/ReviewStep.tsx` |
| ShinganPanel | component | button | finding | 243 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | manual audit required | 661 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | Export JSON | 681 | component-controls.spec.ts | shingan.spec.ts | direct control proof | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | Choose file | 708 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 717 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 724 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | select-trigger | Format override | 751 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | manual audit required | 778 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | Scan URL | 823 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| AmaterasuSubsystem | component | button | Retry | 38 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/strategic/AmaterasuSubsystem.tsx` |
| ArenaRulesWidget | component | button | manual audit required | 125 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | component | button | Close export dialog | 119 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| BattleLogExporter | component | button | manual audit required | 225 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | component | button | Inference Details | 58 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | manual audit required | 81 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | Copy prompt | 108 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | Copy response | 152 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | component | button | manual audit required | 347 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Close live view | 360 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | View Log | 580 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Export | 588 | admin-controls.spec.ts, arena-matrix.spec.ts, compliance.spec.ts +1 | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Rematch | 597 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Close | 606 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchCreationWizard | component | button | Close wizard | 163 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Back | 245 | component-controls.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Next | 256 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Fight in Shadow | 267 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Enter the Arena | 277 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchStatsWidget | component | button | manual audit required | 483 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | component | button | manual audit required | 61 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | component | button | manual audit required | 65 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| WarriorCardGrid | component | button | manual audit required | 87 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +11 | manual label audit | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| WarriorCardGrid | component | button | W / L / D % | 158 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +11 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| Battle Arena | module | button | New Stand Off | 258 | arena-matrix.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | tab-trigger | matches | 273 | arena-matrix.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | tab-trigger | roster | 274 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | tab-trigger | stats | 275 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | tab-trigger | rules | 276 | arena-matrix.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | tab-trigger | manual audit required | 286 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | button | Export match data | 548 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Battle Arena | module | button | Close match detail | 556 | component-controls.spec.ts | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | direct control proof | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| KumiteConfig | component | button | manual audit required | 139 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 159 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 486 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 511 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | component | button | manual audit required | 385 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +24 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeLibrary | component | button | manual audit required | 938 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +24 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 296 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Remove source | 318 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Add Source | 351 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Cancel adding source | 364 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 441 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Add Source | 500 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Cancel | 509 | sengoku.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | component | button | manual audit required | 154 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SAGEDashboard | component | button | Stop evolution | 167 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SAGEDashboard | component | button | Updated | 297 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SageQuarantineView | component | button | Approve | 424 | -- | admin-controls.spec.ts, api-security.spec.ts, arena-matrix.spec.ts +19 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SageQuarantineView | component | button | Reject | 439 | -- | admin-controls.spec.ts, api-security.spec.ts, arena-matrix.spec.ts +19 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SupplyChainPanel | component | button | manual audit required | 177 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 238 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 256 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| TestRunner | component | select-trigger | All Tests | 59 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| TestRunner | component | button | manual audit required | 73 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| TestRunner | component | button | Clear | 91 | sensei.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ActivityFeed | component | button | Mark all as read | 115 | -- | cross-module.spec.ts, guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| ActivityFeed | component | button | Undo | 130 | -- | cross-module.spec.ts, guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| ConfigPanel | component | button | Close configuration | 190 | atemi-lab.spec.ts | atemi-lab.spec.ts, dashboard-widgets.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | Reset to defaults | 214 | dashboard-widgets.spec.ts | atemi-lab.spec.ts, dashboard-widgets.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | Save configuration | 226 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 313 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 443 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | component | button | manual audit required | 237 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | Cross-module actions | 274 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | manual audit required | 313 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| EmptyState | component | button | manual audit required | 49 | -- | sengoku.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ErrorBoundary | component | button | Try Again | 74 | -- | component-controls.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ErrorBoundary.tsx` |
| ExpandableCard | component | button | manual audit required | 58 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | component | button | manual audit required | 126 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| FilterPills | component | button | Reset all engine filters | 149 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| LibraryPageTemplate | component | button | Grid view | 176 | component-controls.spec.ts, test-lab.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | List view | 187 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | manual audit required | 206 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Previous page | 281 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Next page | 292 | admin-controls.spec.ts, component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Close detail | 323 | component-controls.spec.ts | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleGuide | component | button | Close guide | 70 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ModuleGuide.tsx` |
| ModuleOnboarding | component | button | Dismiss onboarding | 87 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| ModuleOnboarding | component | button | Back | 129 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| ModuleOnboarding | component | button | manual audit required | 153 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | component | button | manual audit required | 238 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| TestFlowBanner | component | button | manual audit required | 82 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/TestFlowBanner.tsx` |
| TestFlowBanner | component | button | Dismiss suggestion | 91 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/TestFlowBanner.tsx` |
| Toast | component | button | manual audit required | 61 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/Toast.tsx` |
| Toast | component | button | Dismiss notification | 69 | component-controls.spec.ts | component-controls.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>

## Manual Label Audit Queue

<details>
<summary>Controls requiring manual label audit (215)</summary>

| Surface | Category | Control | Label | Line | Direct Proof Refs | Spec References | Status | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /login | page | button | manual audit required | 124 | -- | global-setup.ts, pages.spec.ts, visual-regression.spec.ts | manual label audit | `packages/dojolm-web/src/app/login/page.tsx` |
| dashboard-root:/ | page | button | manual audit required | 96 | -- | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | manual label audit | `packages/dojolm-web/src/app/page.tsx` |
| Admin | module | tab-trigger | manual audit required | 132 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| ApiKeyManager | component | button | manual audit required | 259 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 381 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | component | button | manual audit required | 56 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | component | button | manual audit required | 82 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | manual audit required | 121 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| UserManagement | component | button | manual audit required | 154 | -- | admin-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | component | button | manual audit required | 987 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 1216 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| Atemi Lab | module | button | manual audit required | 626 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 788 | -- | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| AtemiConfig | component | button | manual audit required | 232 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | manual audit required | 281 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AttackLog | component | button | manual audit required | 202 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| PlaybooksComposite | component | button | manual audit required | 62 | -- | atemi-lab.spec.ts, component-controls.spec.ts, dashboard-widgets.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/PlaybooksComposite.tsx` |
| SessionHistory | component | button | manual audit required | 229 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SkillCard | component | button | manual audit required | 112 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillCard | component | button | manual audit required | 129 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | component | button | manual audit required | 187 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 228 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 270 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | component | button | manual audit required | 233 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 260 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 318 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AmaterasuConfig | component | button | manual audit required | 154 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 193 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 269 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | component | button | manual audit required | 224 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 274 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | component | tab-trigger | manual audit required | 392 | -- | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 282 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 290 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 338 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 408 | -- | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| DataSourceSelector | component | button | manual audit required | 79 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | component | button | manual audit required | 620 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +22 | manual label audit | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | component | button | manual audit required | 226 | -- | attackdna.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| XRayPanel | component | button | manual audit required | 87 | -- | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| FuzzerPanel | component | button | manual audit required | 102 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/buki/FuzzerPanel.tsx` |
| FuzzerPanel | component | button | manual audit required | 140 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/buki/FuzzerPanel.tsx` |
| Bushido Book | module | button | manual audit required | 221 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | tab-trigger | manual audit required | 595 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 683 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 1599 | -- | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| ComplianceChecklist | component | button | manual audit required | 381 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 433 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 468 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 503 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 571 | -- | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | component | button | manual audit required | 258 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| FrameworkNavigator | component | button | manual audit required | 205 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 239 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 260 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | component | button | manual audit required | 180 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 65 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 95 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 116 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 123 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| SenseiPanel | component | button | manual audit required | 62 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | manual audit required | 107 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetEmptyState | component | button | manual audit required | 36 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| AttackOfTheDay | widget | button | manual audit required | 60 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| DojoReadiness | widget | button | manual audit required | 65 | -- | component-controls.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 56 | -- | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 76 | -- | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| LLMModelsWidget | widget | button | manual audit required | 111 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| QuickLLMTestWidget | widget | button | manual audit required | 98 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | widget | button | manual audit required | 72 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| CategoryTree | component | button | manual audit required | 200 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureExplorer | component | button | manual audit required | 190 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 471 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 693 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | component | button | manual audit required | 304 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | select-trigger | manual audit required | 330 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | component | button | manual audit required | 229 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 162 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 178 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 214 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | component | button | manual audit required | 68 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 90 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 128 | -- | admin-controls.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardModeSelector | component | button | manual audit required | 25 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | component | button | manual audit required | 121 | -- | guard.spec.ts | manual label audit | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | component | button | manual audit required | 258 | -- | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | manual label audit | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| Kotoba | module | button | manual audit required | 316 | -- | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| DashboardGrid | component | button | manual audit required | 107 | -- | widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| MobileNav | layout | button | manual audit required | 61 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 233 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 263 | -- | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| NotificationsPanel | layout | button | manual audit required | 83 | -- | atemi-lab.spec.ts, component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| PageToolbar | layout | button | manual audit required | 77 | -- | attackdna.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| PageToolbar | layout | button | manual audit required | 143 | -- | attackdna.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| Sidebar | layout | button | manual audit required | 52 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +19 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | manual audit required | 137 | -- | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +19 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| BenchmarkPanel | component | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | component | button | manual audit required | 72 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | component | button | manual audit required | 107 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 247 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 336 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 372 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| JutsuModelCard | component | button | manual audit required | 171 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| LocalModelSelector | component | button | manual audit required | 147 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| LocalModelSelector | component | button | manual audit required | 281 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | component | button | manual audit required | 460 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 479 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 528 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | component | select-trigger | manual audit required | 174 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 252 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | input | manual audit required | 291 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 375 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelList | component | button | manual audit required | 340 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 359 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | component | button | manual audit required | 273 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 145 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 184 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | manual audit required | 199 | -- | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | component | select-trigger | manual audit required | 180 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 363 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 371 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | component | button | manual audit required | 700 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 782 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 835 | -- | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | component | button | manual audit required | 183 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 331 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 349 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | component | checkbox | manual audit required | 140 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PayloadCard | component | checkbox | manual audit required | 147 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| ConsolidatedReportButton | component | button | manual audit required | 184 | -- | admin-controls.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | component | button | manual audit required | 284 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | component | button | manual audit required | 120 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramCard | component | link | manual audit required | 137 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | component | button | manual audit required | 162 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| Ronin Hub | module | tab-trigger | manual audit required | 154 | -- | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| SubmissionsTab | component | button | manual audit required | 148 | -- | ronin-hub.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | component | button | manual audit required | 268 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | component | checkbox | manual audit required | 256 | -- | mobile-nav.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | component | button | manual audit required | 169 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 62 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 85 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | component | button | manual audit required | 59 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | component | button | manual audit required | 95 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInsightsPanel | component | button | manual audit required | 123 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| ScannerInsightsPanel | component | button | manual audit required | 253 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 231 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 243 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 270 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 338 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 169 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 340 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 250 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 401 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 430 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 465 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 525 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 529 | -- | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| Sengoku | module | button | manual audit required | 418 | -- | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| TemporalConversation | component | button | manual audit required | 136 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | component | button | manual audit required | 179 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiDrawer | layout | button | manual audit required | 89 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | manual audit required | 332 | -- | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiSuggestions | layout | button | manual audit required | 59 | -- | sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | layout | button | manual audit required | 81 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| SenseiToolResult | layout | button | manual audit required | 383 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| SenseiToolResult | layout | button | manual audit required | 404 | -- | sensei.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| ConfigureOllamaStep | component | button | manual audit required | 167 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureOllamaStep | component | button | manual audit required | 224 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 138 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 222 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| ConfigureProvidersStep | component | button | manual audit required | 246 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| CreateAdminStep | component | button | manual audit required | 168 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| CreateAdminStep | component | button | manual audit required | 209 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| ProvisionSenseiStep | component | button | manual audit required | 143 | -- | -- | manual label audit | `packages/dojolm-web/src/components/setup/steps/ProvisionSenseiStep.tsx` |
| ShinganPanel | component | button | manual audit required | 661 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 717 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 724 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | manual audit required | 778 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ArenaRulesWidget | component | button | manual audit required | 125 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | component | button | manual audit required | 225 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | component | button | manual audit required | 81 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | component | button | manual audit required | 347 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchStatsWidget | component | button | manual audit required | 483 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | component | button | manual audit required | 61 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | component | button | manual audit required | 65 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| WarriorCardGrid | component | button | manual audit required | 87 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +11 | manual label audit | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| Battle Arena | module | tab-trigger | manual audit required | 286 | -- | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| KumiteConfig | component | button | manual audit required | 139 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 159 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 486 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 511 | -- | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | component | button | manual audit required | 385 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +24 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeLibrary | component | button | manual audit required | 938 | -- | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +24 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 296 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 441 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | component | button | manual audit required | 154 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SupplyChainPanel | component | button | manual audit required | 177 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 238 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 256 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| TestRunner | component | button | manual audit required | 73 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ConfigPanel | component | button | manual audit required | 313 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 443 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | component | button | manual audit required | 237 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | manual audit required | 313 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| EmptyState | component | button | manual audit required | 49 | -- | sengoku.spec.ts, widget-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ExpandableCard | component | button | manual audit required | 58 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | component | button | manual audit required | 126 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| LibraryPageTemplate | component | button | manual audit required | 206 | -- | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleOnboarding | component | button | manual audit required | 153 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | component | button | manual audit required | 238 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| TestFlowBanner | component | button | manual audit required | 82 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/TestFlowBanner.tsx` |
| Toast | component | button | manual audit required | 61 | -- | component-controls.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>

## Priority Gap Register

| Surface | Category | Interactive | Recommended Runner | Required Coverage | File |
| --- | --- | --- | --- | --- | --- |
| SAGEStatusWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| ResultsView | component | 11 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ScannerInsightsPanel | component | 11 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| BattleModeStep | component | 10 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| CreateAdminStep | component | 9 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| ConfigureOllamaStep | component | 8 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureProvidersStep | component | 8 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| SupplyChainPanel | component | 8 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| VulnerabilityPanel | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| ProvisionSenseiStep | component | 5 | Playwright | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/setup/steps/ProvisionSenseiStep.tsx` |
| ChatBubble | component | 2 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ExecutiveSummary | component | 2 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ExecutiveSummary.tsx` |
| ArenaRulesWidget | component | 2 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| TestFlowBanner | component | 2 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/TestFlowBanner.tsx` |
| AnalyticsWorkspace | component | 1 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/AnalyticsWorkspace.tsx` |
| BenchmarkPanel | component | 1 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ReviewStep | component | 1 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ReviewStep.tsx` |
| MatchStatsWidget | component | 1 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |

## Module Journeys

| Module | Group | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | -- | 5 | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Haiku Scanner | -- | 7 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +20 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/app/page.tsx` |
| Armory | -- | 0 | component-controls.spec.ts, mobile-nav.spec.ts, navigation.spec.ts +2 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `--` |
| Buki | test | 16 | component-controls.spec.ts, mobile-nav.spec.ts, test-lab.spec.ts +1 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/buki/PayloadLab.tsx` |
| Battle Arena | test | 17 | arena-matrix.spec.ts, atemi-lab.spec.ts, component-controls.spec.ts +2 | Playwright + manual device | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| Atemi Lab | test | 22 | atemi-lab.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Sengoku | test | 14 | component-controls.spec.ts, navigation.spec.ts, sengoku.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Ronin Hub | test | 6 | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Hattori Guard | -- | 7 | component-controls.spec.ts, dashboard-widgets.spec.ts, guard.spec.ts +8 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| Kotoba | protect | 12 | component-controls.spec.ts, kotoba.spec.ts, navigation.spec.ts +1 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Mitsuke | intel | 0 | component-controls.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `--` |
| Amaterasu DNA | intel | 0 | attackdna.spec.ts, component-controls.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `--` |
| Kagami | intel | 0 | atemi-lab.spec.ts, component-controls.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `--` |
| Bushido Book | intel | 27 | compliance.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +3 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Admin | -- | 3 | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +5 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| The Kumite | -- | 0 | attackdna.spec.ts, navigation.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `--` |

## Standalone App Surfaces

| Surface | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-root:/ | app | 7 | admin.spec.ts, compliance.spec.ts, component-controls.spec.ts +10 | Playwright + manual visual | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/page.tsx` |
| app-shell:/ | app | 0 | component-controls.spec.ts, guard.spec.ts, llm-dashboard.spec.ts +3 | Playwright | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/layout.tsx` |
| /login | app | 4 | global-setup.ts, pages.spec.ts, visual-regression.spec.ts | Playwright | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/login/page.tsx` |
| /style-guide | app | 0 | pages.spec.ts | Playwright + manual visual | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| boundary:error | app | 2 | component-controls.spec.ts, pages.spec.ts | Playwright | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/error.tsx` |
| boundary:404 | app | 2 | pages.spec.ts | Playwright | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/not-found.tsx` |

## Layout And Global UX

| Surface | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sidebar | layout | 4 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +19 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| MobileNav | layout | 11 | atemi-lab.spec.ts, component-controls.spec.ts, kotoba.spec.ts +2 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| PageToolbar | layout | 6 | attackdna.spec.ts, component-controls.spec.ts, llm-dashboard.spec.ts +2 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| NotificationsPanel | layout | 6 | atemi-lab.spec.ts, component-controls.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| DashboardCustomizer | layout | 16 | cross-module.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| SenseiDrawer | sensei | 12 | component-controls.spec.ts, guard.spec.ts, kotoba.spec.ts +4 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiChat | sensei | 9 | component-controls.spec.ts, kotoba.spec.ts, sensei-api.spec.ts +2 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiSuggestions | sensei | 2 | sensei.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | sensei | 6 | sensei.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |

## Dashboard Widgets

| Widget | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ActivityFeedWidget | dashboard | 0 | cross-module.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ActivityFeedWidget.tsx` |
| ArenaLeaderboardWidget | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| CoverageHeatmapWidget | dashboard | 0 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/CoverageHeatmapWidget.tsx` |
| DojoReadiness | dashboard | 4 | component-controls.spec.ts, dashboard-widgets.spec.ts, widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| EcosystemPulseWidget | dashboard | 2 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| EngineToggleGrid | dashboard | 0 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EngineToggleGrid.tsx` |
| FixtureRoulette | dashboard | 4 | widget-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| GuardAuditWidget | dashboard | 0 | guard.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardAuditWidget.tsx` |
| GuardQuickPanel | dashboard | 10 | component-controls.spec.ts, guard.spec.ts, mobile-nav.spec.ts +2 | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardStatsCard | dashboard | 0 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardStatsCard.tsx` |
| KillCount | dashboard | 0 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KillCount.tsx` |
| KotobaWidget | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMBatchProgress | dashboard | 1 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| LLMJutsuWidget | dashboard | 2 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| LLMModelsWidget | dashboard | 6 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| MitsukeAlertWidget | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| ModuleGridWidget | dashboard | 0 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ModuleGridWidget.tsx` |
| PlatformStatsWidget | dashboard | 0 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/PlatformStatsWidget.tsx` |
| QuickLaunchOrOnboarding | dashboard | 0 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchOrOnboarding.tsx` |
| QuickLaunchPad | dashboard | 2 | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +13 | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchPad.tsx` |
| QuickLLMTestWidget | dashboard | 5 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | dashboard | 7 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| RoninHubWidget | dashboard | 2 | component-controls.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/RoninHubWidget.tsx` |
| SAGEStatusWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SengokuWidget | dashboard | 2 | sengoku.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| SessionPulse | dashboard | 0 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SessionPulse.tsx` |
| SystemHealthGauge | dashboard | 0 | admin.spec.ts, dashboard-widgets.spec.ts, navigation.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SystemHealthGauge.tsx` |
| ThreatRadar | dashboard | 2 | scanner.spec.ts, sengoku.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ThreatRadar.tsx` |
| ThreatTrendWidget | dashboard | 0 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ThreatTrendWidget.tsx` |
| TimeChamberWidget | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |

## Interactive Components

<details>
<summary>Interactive component inventory (148 surfaces)</summary>

| Component | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AdminSettings | admin | 10 | admin-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| ApiKeyManager | admin | 24 | admin-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | admin | 6 | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | admin | 9 | admin-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| SystemHealth | admin | 2 | admin-controls.spec.ts, api-security.spec.ts, arena-matrix.spec.ts +22 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/SystemHealth.tsx` |
| UserManagement | admin | 11 | admin-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | admin | 35 | admin-controls.spec.ts, component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| AtemiConfig | adversarial | 24 | arena-matrix.spec.ts, atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiGettingStarted | adversarial | 6 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AttackLog | adversarial | 2 | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +5 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| AttackToolCard | adversarial | 8 | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| McpConnectorStatus | adversarial | 15 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| PlaybookRunner | adversarial | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybooksComposite | adversarial | 2 | atemi-lab.spec.ts, component-controls.spec.ts, dashboard-widgets.spec.ts +2 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/PlaybooksComposite.tsx` |
| SessionHistory | adversarial | 15 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionRecorder | adversarial | 6 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SkillCard | adversarial | 2 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | adversarial | 16 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | agentic | 10 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| ScenarioRunner | agentic | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| AmaterasuConfig | attackdna | 11 | attackdna.spec.ts, component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | attackdna | 13 | component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | attackdna | 6 | attackdna.spec.ts, component-controls.spec.ts, kotoba.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | attackdna | 14 | atemi-lab.spec.ts, attackdna.spec.ts, llm-dashboard.spec.ts +2 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| ClusterView | attackdna | 2 | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/ClusterView.tsx` |
| DataSourceSelector | attackdna | 4 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | attackdna | 2 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +22 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | attackdna | 12 | attackdna.spec.ts, component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| MutationTimeline | attackdna | 4 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| NodeDetailPanel | attackdna | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| XRayPanel | attackdna | 6 | atemi-lab.spec.ts, attackdna.spec.ts, component-controls.spec.ts +9 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| FuzzerPanel | buki | 5 | scanner.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/buki/FuzzerPanel.tsx` |
| AuditTrail | compliance | 11 | component-controls.spec.ts, guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| ComplianceChecklist | compliance | 24 | compliance.spec.ts, pages.spec.ts, sengoku.spec.ts +2 | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | compliance | 2 | compliance.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| ComplianceExport | compliance | 4 | admin-controls.spec.ts, component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| FrameworkNavigator | compliance | 12 | compliance.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | compliance | 8 | compliance.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardConfigContext | dashboard | 1 | component-controls.spec.ts, dashboard-widgets.spec.ts, navigation.spec.ts +2 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/DashboardConfigContext.tsx` |
| SenseiPanel | dashboard | 6 | widget-controls.spec.ts | Playwright | heuristic playwright reference | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetCard | dashboard | 2 | widget-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/WidgetCard.tsx` |
| WidgetEmptyState | dashboard | 1 | widget-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| CategoryTree | fixtures | 6 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureCategoryCard | fixtures | 2 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureComparison | fixtures | 1 | component-controls.spec.ts, test-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureComparison.tsx` |
| FixtureDetail | fixtures | 2 | atemi-lab.spec.ts, component-controls.spec.ts, mobile-nav.spec.ts +3 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureExplorer | fixtures | 15 | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | fixtures | 12 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +23 | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | fixtures | 2 | component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureSearch | fixtures | 16 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| MediaViewer | fixtures | 3 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| ForgeDefensePanel | guard | 5 | guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | guard | 10 | admin-controls.spec.ts, component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardModeSelector | guard | 8 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | guard | 3 | guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | kagami | 19 | admin-controls.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +11 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiResults | kagami | 3 | component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| KotobaWorkshop | kotoba | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| DashboardGrid | layout | 2 | widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| TopBar | layout | 9 | component-controls.spec.ts, cross-module.spec.ts, guard.spec.ts +4 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/layout/TopBar.tsx` |
| AnalyticsWorkspace | llm | 1 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/AnalyticsWorkspace.tsx` |
| BenchmarkPanel | llm | 1 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | llm | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | llm | 4 | component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | llm | 22 | llm-dashboard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| ExecutiveSummary | llm | 2 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ExecutiveSummary.tsx` |
| JutsuModelCard | llm | 10 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuTab | llm | 6 | admin-controls.spec.ts, attackdna.spec.ts, compliance.spec.ts +10 | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| Leaderboard | llm | 3 | admin-controls.spec.ts, llm-dashboard.spec.ts, widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| LocalModelSelector | llm | 5 | llm-dashboard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | llm | 23 | component-controls.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | llm | 21 | llm-dashboard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelLab | llm | 9 | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelLab.tsx` |
| ModelList | llm | 9 | llm-dashboard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | llm | 3 | compliance.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | llm | 7 | admin-controls.spec.ts, api-security.spec.ts, compliance.spec.ts +4 | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | llm | 11 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | llm | 16 | api-security.spec.ts, atemi-lab.spec.ts, compliance.spec.ts +8 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | llm | 4 | component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestSummary | llm | 9 | component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| VulnerabilityPanel | llm | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | payloads | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PatternReference | reference | 1 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/reference/PatternReference.tsx` |
| ConsolidatedReportButton | reports | 3 | admin-controls.spec.ts, compliance.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | ronin | 7 | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +14 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | ronin | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | ronin | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramsTab | ronin | 7 | ronin-hub.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramsTab.tsx` |
| SubmissionDetail | ronin | 4 | ronin-hub.spec.ts, sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionDetail.tsx` |
| SubmissionsTab | ronin | 5 | ronin-hub.spec.ts, sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | ronin | 18 | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +3 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | scanner | 3 | mobile-nav.spec.ts, widget-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | scanner | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | scanner | 4 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | scanner | 4 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | scanner | 9 | scanner.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInsightsPanel | scanner | 11 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ScannerInsightsPanel.tsx` |
| CampaignGraphBuilder | sengoku | 15 | component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | sengoku | 19 | sengoku.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorVisualization | sengoku | 2 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +21 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx` |
| SengokuCampaignBuilder | sengoku | 28 | atemi-lab.spec.ts, compliance.spec.ts, component-controls.spec.ts +5 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| TemporalConversation | sengoku | 2 | sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | sengoku | 4 | sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiCapabilityPanel | sensei | 3 | component-controls.spec.ts, global-setup.ts, guard.spec.ts +6 | Playwright | heuristic playwright reference | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/sensei/SenseiCapabilityPanel.tsx` |
| ConfigureOllamaStep | setup | 8 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ConfigureOllamaStep.tsx` |
| ConfigureProvidersStep | setup | 8 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ConfigureProvidersStep.tsx` |
| CreateAdminStep | setup | 9 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/CreateAdminStep.tsx` |
| ProvisionSenseiStep | setup | 5 | -- | Playwright | playwright gap | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/setup/steps/ProvisionSenseiStep.tsx` |
| ReviewStep | setup | 1 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/setup/steps/ReviewStep.tsx` |
| ShinganPanel | shingan | 19 | shingan.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| AmaterasuSubsystem | strategic | 2 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/AmaterasuSubsystem.tsx` |
| ArenaRulesWidget | strategic | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | strategic | 7 | component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | strategic | 7 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | strategic | 7 | component-controls.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchCreationWizard | strategic | 6 | arena-matrix.spec.ts, atemi-lab.spec.ts, dashboard-widgets.spec.ts +1 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchStatsWidget | strategic | 1 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | strategic | 2 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | strategic | 10 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| ModelSelectionStep | strategic | 5 | shingan.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/ModelSelectionStep.tsx` |
| WarriorCardGrid | strategic | 4 | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +11 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| KumiteConfig | strategic | 15 | admin-controls.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +15 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | strategic | 4 | admin-controls.spec.ts, admin.spec.ts, api-security.spec.ts +24 | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | strategic | 14 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | strategic | 3 | component-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SageQuarantineView | strategic | 4 | admin-controls.spec.ts, api-security.spec.ts, arena-matrix.spec.ts +19 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SupplyChainPanel | strategic | 8 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| TestRunner | tests | 5 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ActivityFeed | ui | 4 | cross-module.spec.ts, guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| checkbox | ui | 5 | admin-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/checkbox.tsx` |
| ConfigPanel | ui | 20 | atemi-lab.spec.ts, dashboard-widgets.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | ui | 6 | cross-module.spec.ts, dashboard-widgets.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| dialog | ui | 3 | admin-controls.spec.ts, component-controls.spec.ts, mobile-nav.spec.ts +2 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/dialog.tsx` |
| EmptyState | ui | 1 | sengoku.spec.ts, widget-controls.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ErrorBoundary | ui | 1 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ErrorBoundary.tsx` |
| ExpandableCard | ui | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | ui | 4 | scanner.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| input | ui | 1 | admin-controls.spec.ts, attackdna.spec.ts, compliance.spec.ts +12 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/input.tsx` |
| LibraryPageTemplate | ui | 21 | admin-controls.spec.ts, component-controls.spec.ts, test-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleGuide | ui | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ModuleGuide.tsx` |
| ModuleOnboarding | ui | 8 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | ui | 2 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| select | ui | 4 | admin-controls.spec.ts, admin.spec.ts, arena-matrix.spec.ts +12 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/select.tsx` |
| SortableTable | ui | 3 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/SortableTable.tsx` |
| tabs | ui | 3 | admin.spec.ts, arena-matrix.spec.ts, atemi-lab.spec.ts +7 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/tabs.tsx` |
| TestFlowBanner | ui | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/TestFlowBanner.tsx` |
| textarea | ui | 1 | kotoba.spec.ts, scanner.spec.ts, sensei.spec.ts +1 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/textarea.tsx` |
| Toast | ui | 4 | component-controls.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>
