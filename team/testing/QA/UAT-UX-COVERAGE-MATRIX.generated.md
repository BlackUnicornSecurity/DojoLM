# UAT / UX Coverage Matrix (Generated)

Generated on 2026-04-03T17:41:04.600Z.

This file inventories the current user-facing DojoLM surface area for UAT and UX planning.
Playwright is the default runner whenever the surface is automatable in-browser.
Spec references are heuristic planning signals based on current Playwright suite text, not proof that every listed control or path is directly asserted.

## Audit Signals

| Metric | Value |
| --- | --- |
| Nav modules tracked | 12 |
| Standalone app surfaces tracked | 6 |
| Global UX/layout surfaces tracked | 9 |
| Dashboard widgets tracked | 32 |
| Interactive components tracked | 137 |
| Actionable controls tracked | 567 |
| Controls with explicit labels | 362 |
| Controls needing manual label audit | 205 |
| Controls with direct control-to-test proof | 84 |
| Controls inheriting parent-surface references | 133 |
| Control Playwright gaps | 145 |
| Shared module render files | 1 |
| Playwright specs in repo | 19 |
| Playwright projects configured | 2 |
| Mobile Playwright projects configured | 1 |
| Navigation spec modules declared | 12 |
| Playwright config status | desktop+mobile configured |
| Navigation inventory parity | in sync |

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
| Playwright config breadth | desktop+mobile configured | `packages/dojolm-web/playwright.config.ts` (chromium, mobile-chrome) | keep desktop/mobile projects aligned with UX policy |
| Navigation spec parity | in sync | `packages/dojolm-web/e2e/navigation.spec.ts` (12/12 modules; missing --; unexpected --) | keep navigation suite aligned with NAV_ITEMS changes |
| Actionable control naming | 205 controls need manual label audit | `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md` actionable-control inventory | review icon-only or expression-only controls and add accessible names or QA notes before release sign-off |
| Control-level proof layer | 84 direct proof link(s) detected | `team/testing/QA/UAT-UX-COVERAGE-MATRIX.generated.md` actionable-control inventory | expand explicit selector assertions to reduce inherited-only control coverage |
| Shared module render files | 1 files serve multiple module labels | page.tsx: Armory, Haiku Scanner | record per-label evidence for every shared-file module and do not let sibling references piggyback |

## Shared Module Render Files

| File | Module Labels | Groups | Interactive | Spec References | Required Audit |
| --- | --- | --- | --- | --- | --- |
| `packages/dojolm-web/src/app/page.tsx` | Armory, Haiku Scanner | attack | 24 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | capture per-label evidence; do not treat sibling references as interchangeable proof |

## Current Playwright Inventory

| Spec | Suite | Tests | Primary Focus |
| --- | --- | --- | --- |
| `packages/dojolm-web/e2e/admin.spec.ts` | Admin | 2 | admin, Admin |
| `packages/dojolm-web/e2e/api-security.spec.ts` | API Security | 4 | api-security, API Security |
| `packages/dojolm-web/e2e/atemi-lab.spec.ts` | Atemi Lab | 13 | atemi-lab, Atemi Lab |
| `packages/dojolm-web/e2e/attackdna.spec.ts` | Amaterasu DNA | 12 | attackdna, Amaterasu DNA |
| `packages/dojolm-web/e2e/compliance.spec.ts` | Bushido Book | 13 | compliance, Bushido Book |
| `packages/dojolm-web/e2e/cross-module.spec.ts` | Cross-Module Actions | 3 | cross-module, Cross-Module Actions |
| `packages/dojolm-web/e2e/dashboard-widgets.spec.ts` | Dashboard Widgets | 4 | dashboard-widgets, Dashboard Widgets |
| `packages/dojolm-web/e2e/guard.spec.ts` | Hattori Guard | 11 | guard, Hattori Guard |
| `packages/dojolm-web/e2e/kotoba.spec.ts` | Kotoba | 14 | kotoba, Kotoba |
| `packages/dojolm-web/e2e/kumite.spec.ts` | The Kumite | 15 | kumite, The Kumite |
| `packages/dojolm-web/e2e/llm-dashboard.spec.ts` | LLM Dashboard | 14 | llm-dashboard, LLM Dashboard |
| `packages/dojolm-web/e2e/mobile-nav.spec.ts` | Mobile Navigation | 11 | mobile-nav, Mobile Navigation |
| `packages/dojolm-web/e2e/navigation.spec.ts` | Navigation | 3 | navigation, Navigation |
| `packages/dojolm-web/e2e/ronin-hub.spec.ts` | Ronin Hub | 10 | ronin-hub, Ronin Hub |
| `packages/dojolm-web/e2e/scanner.spec.ts` | Scanner | 3 | scanner, Scanner |
| `packages/dojolm-web/e2e/sengoku.spec.ts` | Sengoku | 11 | sengoku, Sengoku |
| `packages/dojolm-web/e2e/sensei.spec.ts` | Sensei Chat | 9 | sensei, Sensei Chat |
| `packages/dojolm-web/e2e/shingan.spec.ts` | Shingan Scanner | 10 | shingan, Shingan Scanner |
| `packages/dojolm-web/e2e/test-lab.spec.ts` | Armory | 5 | test-lab, Armory |

## Coverage Summary

| Category | Tracked | Currently Heuristically Referenced | Playwright Gaps |
| --- | --- | --- | --- |
| module | 12 | 12 | 0 |
| page | 6 | 2 | 4 |
| layout | 9 | 8 | 1 |
| widget | 32 | 8 | 24 |
| component | 137 | 60 | 77 |

## Actionable Control Summary

Control inventory is file-based to avoid duplicate rows when multiple module labels share one rendering surface.
Control inventory is static-source derived and can miss controls created only through runtime data, portals, or third-party widgets.
Control rows include direct-proof links when explicit selector phrases in Playwright specs match control labels.
Direct-proof links are heuristic and should be paired with run evidence for release sign-off.

| Source Category | Controls Tracked | Direct Proof Links | Inherited Parent-Surface References | Playwright Gaps | Manual Gaps | Manual Label Audit |
| --- | --- | --- | --- | --- | --- | --- |
| component | 427 | 43 | 98 | 121 | 0 | 165 |
| layout | 33 | 6 | 11 | 0 | 0 | 16 |
| module | 62 | 30 | 16 | 0 | 0 | 16 |
| page | 14 | 1 | 3 | 9 | 0 | 1 |
| widget | 31 | 4 | 5 | 15 | 0 | 7 |

## Actionable Control Inventory

<details>
<summary>Actionable control inventory (567 controls)</summary>

| Surface | Category | Control | Label | Line | Direct Proof Refs | Spec References | Status | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary:error | page | button | Try again | 36 | -- | -- | playwright gap | `packages/dojolm-web/src/app/error.tsx` |
| app-shell:/ | page | link | Skip to main content | 38 | -- | guard.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/app/layout.tsx` |
| /login | page | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/app/login/page.tsx` |
| boundary:404 | page | link | Return to Dashboard | 19 | -- | -- | playwright gap | `packages/dojolm-web/src/app/not-found.tsx` |
| dashboard-root:/ | page | tab-trigger | fixtures | 418 | test-lab.spec.ts | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | direct control proof | `packages/dojolm-web/src/app/page.tsx` |
| dashboard-root:/ | page | tab-trigger | payloads | 421 | -- | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | inherits heuristic surface reference | `packages/dojolm-web/src/app/page.tsx` |
| dashboard-root:/ | page | button | Retry | 485 | -- | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | inherits heuristic surface reference | `packages/dojolm-web/src/app/page.tsx` |
| /style-guide | page | button | Primary Action | 137 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Secondary | 138 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Default | 161 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Primary | 162 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Outline | 163 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Secondary | 164 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| /style-guide | page | button | Ghost | 165 | -- | -- | playwright gap | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| Admin | module | tab-trigger | manual audit required | 68 | -- | admin.spec.ts, api-security.spec.ts, dashboard-widgets.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| Admin | module | link | Platform Guide → | 163 | -- | admin.spec.ts, api-security.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| Admin | module | link | API Reference → | 171 | -- | admin.spec.ts, api-security.spec.ts, dashboard-widgets.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| AdminSettings | component | button | Edit settings | 128 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| AdminSettings | component | button | Save settings | 139 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| AdminSettings | component | button | Cancel editing | 148 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| ApiKeyManager | component | button | Refresh providers | 140 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Add Key | 148 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Test | 250 | llm-dashboard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 259 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 381 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Cancel | 405 | sengoku.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | Save | 412 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | component | button | manual audit required | 56 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | component | button | manual audit required | 82 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | manual audit required | 121 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | WARNING+ | 156 | guard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | CRITICAL only | 170 | guard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| SystemHealth | component | button | Refresh health status | 121 | -- | api-security.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | inherits heuristic surface reference | `packages/dojolm-web/src/components/admin/SystemHealth.tsx` |
| UserManagement | component | button | Add User | 77 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | manual audit required | 154 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | Cancel | 240 | sengoku.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| UserManagement | component | button | Create User | 241 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | component | button | Run full validation | 670 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Run calibration only | 684 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 927 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | JSON | 937 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Previous page | 959 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Next page | 971 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download JSON report | 997 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download CSV report | 1007 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Download Markdown report | 1017 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 1081 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Traceability Chain | 1322 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | Recalibrate all modules | 1396 | -- | -- | playwright gap | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| Atemi Lab | module | button | Open Atemi Lab configuration | 694 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 736 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Dismiss | 834 | -- | atemi-lab.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | attack-tools | 856 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | skills | 861 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | mcp | 865 | -- | atemi-lab.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | protocol-fuzz | 869 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | tab-trigger | webmcp | 874 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 1014 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 1084 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Cancel execution | 1123 | -- | atemi-lab.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Cancel and return | 1141 | -- | atemi-lab.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Confirm and execute WebMCP tests | 1150 | -- | atemi-lab.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Launch Kagami mirror testing | 1238 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | Launch Shingan deep scan | 1266 | atemi-lab.spec.ts | atemi-lab.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| AtemiConfig | component | button | Close config panel | 153 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | manual audit required | 192 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Toggle auto-logging | 266 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Reset | 291 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiConfig | component | button | Save Configuration | 298 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiGettingStarted | component | button | Getting Started / steps completed | 84 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AtemiGettingStarted | component | button | Dismiss getting started guide | 102 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AtemiGettingStarted | component | button | Got it, don&apos;t show again → | 160 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AttackLog | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| AttackToolCard | component | button | attack | 193 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Confirm | 228 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +3 | inherits heuristic surface reference | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Cancel | 238 | sengoku.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +3 | direct control proof | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| AttackToolCard | component | button | Learn More | 273 | atemi-lab.spec.ts | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +3 | direct control proof | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| McpConnectorStatus | component | button | Refresh connection status | 272 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Toggle troubleshooting panel | 285 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Start MCP server | 327 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Stop MCP server | 344 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Restart MCP server | 359 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Confirm start MCP server | 404 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| McpConnectorStatus | component | button | Cancel start MCP server | 416 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| PlaybookRunner | component | button | Back | 229 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybookRunner | component | button | completeStep(activeStep.id)}> Mark Complete | 333 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| PlaybookRunner | component | button | skipStep(activeStep.id)}> Skip | 337 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| SessionHistory | component | button | Session History | 106 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Clear all session history | 132 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | \| \| events | 196 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | manual audit required | 229 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Close session review | 292 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Delete this session | 446 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionHistory | component | button | Close | 454 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionRecorder | component | button | Stop recording session | 161 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SessionRecorder | component | button | Cancel recording without saving | 171 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SessionRecorder | component | button | Start recording Atemi Lab session | 180 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SkillCard | component | button | manual audit required | 112 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillCard | component | button | manual audit required | 129 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | component | button | Filters | 134 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | input | Search adversarial skills | 154 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 171 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 187 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 211 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 227 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | All | 252 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 268 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | Reset Filters | 290 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | Reset Filters | 324 | -- | -- | playwright gap | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | component | button | manual audit required | 171 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 196 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 252 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| ScenarioRunner | component | button | Run | 260 | -- | -- | playwright gap | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| ScenarioRunner | component | button | Pause | 265 | -- | -- | playwright gap | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| ScenarioRunner | component | button | Reset | 270 | -- | -- | playwright gap | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| AmaterasuConfig | component | button | manual audit required | 154 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 174 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 192 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 268 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | component | button | Dismiss tutorial | 169 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | Back | 202 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 224 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 274 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | Close help | 298 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | component | button | Open Amaterasu DNA guide | 331 | attackdna.spec.ts, kumite.spec.ts, ronin-hub.spec.ts | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | button | Open Amaterasu DNA configuration | 339 | atemi-lab.spec.ts, attackdna.spec.ts, kumite.spec.ts | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | input | Search attacks | 376 | attackdna.spec.ts | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| AttackDNAExplorer | component | tab-trigger | manual audit required | 392 | -- | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 282 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 290 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | New Analysis | 306 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 338 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 408 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| ClusterView | component | button | nodes % avg similarity | 284 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/ClusterView.tsx` |
| DataSourceSelector | component | button | manual audit required | 79 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DataSourceSelector | component | button | Reset data source filter to show all | 133 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | component | button | manual audit required | 620 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | component | button | manual audit required | 226 | -- | attackdna.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Zoom out | 409 | -- | attackdna.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Zoom in | 420 | -- | attackdna.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | button | Reset zoom | 428 | -- | attackdna.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| FamilyTreeView | component | select-trigger | Select attack family | 596 | atemi-lab.spec.ts | attackdna.spec.ts | direct control proof | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| MutationTimeline | component | input | Filter start date | 393 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| MutationTimeline | component | input | Filter end date | 403 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| MutationTimeline | component | button | Clear date filter | 413 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| NodeDetailPanel | component | button | Close node detail panel | 109 | -- | -- | playwright gap | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| XRayPanel | component | button | manual audit required | 87 | -- | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | button | Suggested Mitigations | 183 | -- | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | button | Open Forge Defense | 207 | -- | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| XRayPanel | component | input | Search attack patterns | 287 | -- | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| AuditTrail | component | button | Retry | 210 | -- | guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| AuditTrail | component | button | Refresh audit log | 316 | -- | guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| Bushido Book | module | button | manual audit required | 203 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Group by tier | 461 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Group by category | 476 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | tab-trigger | manual audit required | 536 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 600 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Changes | 805 | compliance.spec.ts | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Comparison | 817 | compliance.spec.ts | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Back to Coverage | 968 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Back to Coverage | 1146 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Test in LLM Dashboard | 1292 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | Run compliance scan | 1456 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 1516 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| ComplianceChecklist | component | button | Select compliance framework | 337 | compliance.spec.ts | compliance.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 381 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | Export checklist as text file | 419 | -- | compliance.spec.ts, sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 433 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | All Categories | 452 | -- | compliance.spec.ts, sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 468 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 503 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 571 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | component | button | manual audit required | 258 | -- | -- | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| ComplianceExport | component | select-trigger | Export format | 207 | -- | -- | playwright gap | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| ComplianceExport | component | button | Export | 216 | compliance.spec.ts, llm-dashboard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| FrameworkNavigator | component | button | Source | 148 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | BAISS | 162 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | input | Search controls | 185 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 205 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 239 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 260 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | component | button | manual audit required | 180 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| GapMatrix | component | button | Columns | 196 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 65 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 95 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 116 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 123 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | Close customizer | 243 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | Reset to Defaults | 251 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| Dashboard | module | button | Scan Text | 237 | dashboard-widgets.spec.ts, scanner.spec.ts | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | direct control proof | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Models | 241 | llm-dashboard.spec.ts | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | direct control proof | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Guard | 245 | -- | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Dashboard | module | button | Customize Dashboard | 249 | -- | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| SenseiPanel | component | button | manual audit required | 56 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | manual audit required | 101 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | Reset All | 138 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetEmptyState | component | button | manual audit required | 36 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| ArenaLeaderboardWidget | widget | button | View Arena Leaderboard | 43 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay | widget | button | manual audit required | 60 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget | widget | button | Open Bushido Book | 54 | compliance.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| DojoReadiness | widget | button | Dismiss onboarding | 49 | -- | dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| DojoReadiness | widget | button | manual audit required | 65 | -- | dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| EcosystemPulseWidget | widget | button | Data Flow Details | 168 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| FixtureRoulette | widget | button | Another | 136 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Scan It | 201 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Again | 210 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| FixtureRoulette | widget | button | Discover an Attack | 243 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| GuardQuickPanel | widget | button | Refresh guard events | 27 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 56 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 76 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | Block on WARNING and CRITICAL findings | 102 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | Block on CRITICAL findings only | 116 | guard.spec.ts | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| KotobaWidget | widget | button | Open Kotoba Studio | 27 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMBatchProgress | widget | button | more batch | 147 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| LLMJutsuWidget | widget | button | Open LLM Jutsu | 99 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| LLMModelsWidget | widget | button | Manage LLM Models | 72 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| LLMModelsWidget | widget | button | Configure in LLM Dashboard | 92 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| LLMModelsWidget | widget | button | manual audit required | 111 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| MitsukeAlertWidget | widget | button | View Mitsuke alerts | 53 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| QuickLaunchPad | widget | button | Jump to module | 55 | -- | dashboard-widgets.spec.ts, kumite.spec.ts, navigation.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchPad.tsx` |
| QuickLLMTestWidget | widget | button | manual audit required | 98 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickLLMTestWidget | widget | button | Run Test | 117 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | widget | button | manual audit required | 41 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| RoninHubWidget | widget | button | Open Ronin Hub | 96 | ronin-hub.spec.ts | navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/RoninHubWidget.tsx` |
| SAGEStatusWidget | widget | button | Preview only — not connected to SAGE engine | 34 | -- | attackdna.spec.ts, kumite.spec.ts, shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SAGEStatusWidget | widget | button | Open SAGE | 49 | attackdna.spec.ts, kumite.spec.ts, shingan.spec.ts | attackdna.spec.ts, kumite.spec.ts, shingan.spec.ts | direct control proof | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SengokuWidget | widget | button | Open Sengoku Campaigns | 29 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| TimeChamberWidget | widget | button | Open Time Chamber | 32 | -- | -- | playwright gap | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |
| CategoryTree | component | button | manual audit required | 200 | -- | -- | manual label audit | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| CategoryTree | component | button | clean | 224 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureCategoryCard | component | button | Scan | 196 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureCategoryCard | component | button | View | 208 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureComparison | component | button | Close comparison | 50 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureComparison.tsx` |
| FixtureDetail | component | button | Rescan | 85 | -- | atemi-lab.spec.ts, mobile-nav.spec.ts, sengoku.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureDetail | component | button | Close | 96 | -- | atemi-lab.spec.ts, mobile-nav.spec.ts, sengoku.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureExplorer | component | button | manual audit required | 190 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Tree view | 225 | test-lab.spec.ts | llm-dashboard.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Search view | 242 | test-lab.spec.ts | llm-dashboard.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Grid view | 259 | test-lab.spec.ts | llm-dashboard.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Compare | 280 | llm-dashboard.spec.ts | llm-dashboard.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 471 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | input | for comparison | 624 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 693 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | Scan | 704 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | llm-dashboard.spec.ts, test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | component | button | Filters | 171 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | button | Clear all filters | 197 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | inherits heuristic surface reference | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | button | manual audit required | 304 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | select-trigger | manual audit required | 330 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | component | button | manual audit required | 229 | -- | -- | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureList | component | button | Scan | 238 | scanner.spec.ts, shingan.spec.ts, test-lab.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureSearch | component | button | Clear search | 189 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Filters | 202 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Clear all filters | 226 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by severity | 241 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by brand | 253 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | select-trigger | Filter by type | 265 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| FixtureSearch | component | button | Show more ( remaining) | 304 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| MediaViewer | component | button | Zoom out | 137 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| MediaViewer | component | button | Zoom in | 141 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| MediaViewer | component | button | Reset zoom | 144 | -- | -- | playwright gap | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 162 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 214 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | component | button | manual audit required | 68 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 90 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 128 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | Previous page | 236 | -- | -- | playwright gap | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | Next page | 247 | -- | -- | playwright gap | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardModeSelector | component | button | manual audit required | 25 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | Block on WARNING and CRITICAL findings | 45 | -- | -- | playwright gap | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | Block on CRITICAL findings only | 59 | guard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| GuardModeSelector | component | button | IN OUT | 85 | -- | -- | playwright gap | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | component | button | manual audit required | 121 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | component | button | Identify | 218 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | Verify | 227 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | probes | 265 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | advanced category selection | 292 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | inherits heuristic surface reference | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiPanel | component | button | manual audit required | 328 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiResults | component | button | feature comparison | 128 | -- | -- | playwright gap | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| KagamiResults | component | button | Export JSON | 251 | -- | -- | playwright gap | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| Kotoba | module | button | Score Prompt | 205 | kotoba.spec.ts | kotoba.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | manual audit required | 277 | -- | kotoba.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | button | Harden | 304 | kotoba.spec.ts | kotoba.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Kotoba | module | textarea | Hardened prompt output | 323 | kotoba.spec.ts | kotoba.spec.ts, navigation.spec.ts | direct control proof | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| KotobaWorkshop | component | button | Moderate | 135 | -- | -- | playwright gap | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| KotobaWorkshop | component | button | Aggressive | 148 | -- | -- | playwright gap | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| KotobaWorkshop | component | button | Apply | 162 | -- | -- | playwright gap | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| DashboardGrid | component | button | manual audit required | 107 | -- | -- | manual label audit | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| MobileNav | layout | button | manual audit required | 60 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | More | 90 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | Close more menu | 204 | mobile-nav.spec.ts | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | direct control proof | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 227 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 257 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| NotificationsPanel | layout | button | manual audit required | 83 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| NotificationsPanel | layout | button | Mark all as read | 106 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| NotificationsPanel | layout | button | Clear all | 115 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| PageToolbar | layout | button | manual audit required | 87 | -- | attackdna.spec.ts, compliance.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| PageToolbar | layout | button | manual audit required | 157 | -- | attackdna.spec.ts, compliance.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| Sidebar | layout | button | manual audit required | 50 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | Activity | 143 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | inherits heuristic surface reference | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | Admin | 175 | admin.spec.ts | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | direct control proof | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | Open Sensei AI assistant | 211 | sensei.spec.ts | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | direct control proof | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | manual audit required | 240 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| BenchmarkPanel | component | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | component | button | manual audit required | 72 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | component | button | manual audit required | 91 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| ComparisonView | component | button | Compare selected models | 105 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 247 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 336 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | Test connection to custom provider | 364 | llm-dashboard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 372 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| JutsuModelCard | component | button | View | 127 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuModelCard | component | button | Re-Test | 136 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuModelCard | component | button | manual audit required | 146 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuTab | component | button | Open Jutsu guide | 220 | ronin-hub.spec.ts | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| JutsuTab | component | button | Open Jutsu settings | 228 | ronin-hub.spec.ts | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| Leaderboard | component | button | By Score | 266 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| Leaderboard | component | button | By Name | 273 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| Leaderboard | component | button | Re-test this model | 434 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| LLM Dashboard | module | tab-trigger | Models | 93 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Tests | 97 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Results | 101 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Leaderboard | 105 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Compare | 109 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Custom Models | 113 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LLM Dashboard | module | tab-trigger | Jutsu | 117 | llm-dashboard.spec.ts | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | direct control proof | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| LocalModelSelector | component | button | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| LocalModelSelector | component | button | manual audit required | 281 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | component | button | Close model detail | 98 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | overview | 117 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | history | 121 | sensei.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | deliverables | 125 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | training | 129 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | tab-trigger | metrics | 133 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 457 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 476 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | component | button | manual audit required | 142 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | select-trigger | manual audit required | 174 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | select-trigger | Select a model | 217 | atemi-lab.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 252 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | input | manual audit required | 290 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | Cancel | 371 | sengoku.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 374 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelList | component | button | Retry | 104 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 135 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 152 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Add Model | 173 | llm-dashboard.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | Edit | 331 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 340 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | onToggle(!model.enabled)} > | 351 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 359 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | component | button | Download | 250 | compliance.spec.ts, llm-dashboard.spec.ts | compliance.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ModelResultCard | component | button | Re-Test | 262 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ModelResultCard | component | button | manual audit required | 273 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 145 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | Export | 159 | compliance.spec.ts, llm-dashboard.spec.ts | api-security.spec.ts, compliance.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 184 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | manual audit required | 199 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | component | select-trigger | All Models | 143 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Model view | 157 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | List view | 166 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | select-trigger | manual audit required | 180 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Clear | 191 | sensei.spec.ts | llm-dashboard.spec.ts | direct control proof | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | Download all results | 196 | -- | llm-dashboard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 363 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 371 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | component | button | Cancel | 595 | sengoku.spec.ts | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | All | 681 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Clear | 684 | sensei.spec.ts | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 692 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Load Sample Test Cases | 746 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | Show all tests | 757 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 774 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 827 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | View test results | 872 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | component | select-trigger | Select format | 130 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestExporter | component | button | manual audit required | 184 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestSummary | component | tab-trigger | overview | 62 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | scores | 63 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | coverage | 64 | compliance.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| TestSummary | component | tab-trigger | performance | 65 | -- | -- | playwright gap | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 331 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 349 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | component | checkbox | manual audit required | 140 | -- | -- | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PayloadCard | component | checkbox | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| ConsolidatedReportButton | component | button | Download consolidated report | 131 | -- | compliance.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| ConsolidatedReportButton | component | button | manual audit required | 184 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | component | button | CVSS Base Metrics | 267 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| AISeverityCalculator | component | button | manual audit required | 284 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| AISeverityCalculator | component | button | AI-Specific Risk Factors | 309 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +8 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | component | button | manual audit required | 120 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramCard | component | link | manual audit required | 137 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | component | button | Close program details | 58 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramDetail | component | button | manual audit required | 162 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramDetail | component | link | Open on | 175 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramsTab | component | button | Show subscribed programs only | 194 | -- | ronin-hub.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/ProgramsTab.tsx` |
| Ronin Hub | module | button | Open Ronin Hub guide | 121 | ronin-hub.spec.ts | navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Ronin Hub | module | button | Open Ronin Hub settings | 129 | ronin-hub.spec.ts | navigation.spec.ts, ronin-hub.spec.ts | direct control proof | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Ronin Hub | module | tab-trigger | manual audit required | 154 | -- | navigation.spec.ts, ronin-hub.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| SubmissionDetail | component | button | Close submission detail | 73 | -- | sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionDetail.tsx` |
| SubmissionsTab | component | button | New Submission | 131 | -- | ronin-hub.spec.ts, sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionsTab | component | button | manual audit required | 148 | -- | ronin-hub.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionsTab | component | button | Create Submission | 196 | -- | ronin-hub.spec.ts, sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | component | button | Close wizard | 143 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | manual audit required | 268 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | + Add Evidence | 279 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Back | 339 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Save as Draft | 347 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Next | 352 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| SubmissionWizard | component | button | Submit | 362 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | component | checkbox | manual audit required | 256 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | component | button | manual audit required | 167 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 130 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 153 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 172 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | component | button | Show more examples | 46 | -- | -- | playwright gap | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| QuickChips | component | button | manual audit required | 59 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | component | button | manual audit required | 95 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | input | Upload files for multimodal scanning | 340 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | Upload File | 358 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | manual audit required | 400 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | Clear | 409 | sensei.spec.ts | scanner.spec.ts | direct control proof | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| CampaignGraphBuilder | component | button | applyTemplate(tmpl)} > ( ) | 191 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 231 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 243 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 270 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | select-trigger | Continue to next | 286 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | Close skill picker | 328 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 338 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | Add Skill | 353 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 130 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 301 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorVisualization | component | button | Turn | 201 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx` |
| SengokuCampaignBuilder | component | button | All | 205 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 218 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | Select All | 236 | -- | -- | playwright gap | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | Clear | 239 | sensei.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 247 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 282 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 335 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 339 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| Sengoku | module | button | New Campaign | 227 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | tab-trigger | campaigns | 282 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | tab-trigger | temporal | 286 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | manual audit required | 324 | -- | navigation.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Create new campaign | 375 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Run Now | 431 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Sengoku | module | button | Report | 445 | sengoku.spec.ts | navigation.spec.ts, sengoku.spec.ts | direct control proof | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| TemporalConversation | component | button | manual audit required | 136 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | component | button | turns | 119 | -- | sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| TemporalTab | component | button | Simulation coming soon | 159 | -- | sengoku.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| TemporalTab | component | button | manual audit required | 179 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiChat | layout | textarea | Message input | 154 | -- | kotoba.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Send message | 171 | -- | kotoba.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Confirm | 217 | -- | kotoba.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiChat | layout | button | Cancel | 223 | sengoku.spec.ts | kotoba.spec.ts, sensei.spec.ts | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiDrawer | layout | button | manual audit required | 87 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Clear chat history | 130 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Close Sensei | 138 | sensei.spec.ts | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Dismiss error | 163 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | Select model | 290 | atemi-lab.spec.ts | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | direct control proof | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | manual audit required | 326 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiSuggestions | layout | button | manual audit required | 59 | -- | sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | layout | button | manual audit required | 78 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| ShinganPanel | component | button | finding | 243 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | Export JSON | 644 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | Choose file | 670 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 679 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 686 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | select-trigger | Format override | 713 | -- | shingan.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | manual audit required | 740 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| AmaterasuSubsystem | component | button | Retry | 38 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/AmaterasuSubsystem.tsx` |
| ArenaRulesWidget | component | button | manual audit required | 125 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | component | button | Close export dialog | 119 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| BattleLogExporter | component | button | manual audit required | 225 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | component | button | Inference Details | 58 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | manual audit required | 81 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | Copy prompt | 108 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveInferencePanel | component | button | Copy response | 152 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | component | button | manual audit required | 347 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Close live view | 360 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | View Log | 580 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Export | 588 | compliance.spec.ts, llm-dashboard.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Rematch | 597 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| LiveMatchView | component | button | Close | 606 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchCreationWizard | component | button | Close wizard | 163 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Back | 245 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Next | 256 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Fight in Shadow | 267 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchCreationWizard | component | button | Enter the Arena | 277 | -- | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchStatsWidget | component | button | manual audit required | 483 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | component | button | manual audit required | 61 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | component | button | manual audit required | 65 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| WarriorCardGrid | component | button | manual audit required | 87 | -- | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| WarriorCardGrid | component | button | W / L / D % | 158 | -- | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +5 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| ArenaBrowser | component | button | New Stand Off | 254 | -- | kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| ArenaBrowser | component | tab-trigger | manual audit required | 270 | -- | kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| ArenaBrowser | component | button | Export match data | 524 | -- | kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| ArenaBrowser | component | button | Close match detail | 532 | -- | kumite.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| KumiteConfig | component | button | manual audit required | 139 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 159 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 486 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 511 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | component | button | manual audit required | 384 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +16 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeLibrary | component | button | manual audit required | 930 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +16 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 296 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Remove source | 318 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Add Source | 351 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Cancel adding source | 364 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 441 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Add Source | 500 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | Cancel | 509 | sengoku.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | component | button | manual audit required | 154 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SAGEDashboard | component | button | Stop evolution | 167 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SAGEDashboard | component | button | Updated | 297 | -- | -- | playwright gap | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SageQuarantineView | component | button | Approve | 424 | -- | api-security.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SageQuarantineView | component | button | Reject | 439 | -- | api-security.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +10 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| The Kumite | module | button | manual audit required | 411 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 422 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | Return to The Kumite overview | 430 | attackdna.spec.ts, kumite.spec.ts, shingan.spec.ts | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | direct control proof | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | tab-trigger | manual audit required | 446 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 555 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 563 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | Open | 593 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| SupplyChainPanel | component | button | manual audit required | 164 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 225 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 243 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| ThreatFeedStream | component | button | Alerts | 241 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | Clear search | 277 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | manual audit required | 291 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | Retry | 402 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | Approve | 584 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | Reject | 591 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | inherits heuristic surface reference | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | manual audit required | 699 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| TestRunner | component | select-trigger | All Tests | 59 | -- | -- | playwright gap | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| TestRunner | component | button | manual audit required | 73 | -- | -- | manual label audit | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| TestRunner | component | button | Clear | 91 | sensei.spec.ts | -- | direct control proof | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ActivityFeed | component | button | Mark all as read | 107 | -- | cross-module.spec.ts, guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| ActivityFeed | component | button | Undo | 122 | -- | cross-module.spec.ts, guard.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| ConfigPanel | component | button | Close configuration | 190 | atemi-lab.spec.ts | atemi-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | Reset to defaults | 214 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | Save configuration | 226 | -- | atemi-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 313 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 443 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | component | button | manual audit required | 237 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | Cross-module actions | 274 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | manual audit required | 313 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| EmptyState | component | button | manual audit required | 49 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ErrorBoundary | component | button | Try Again | 74 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/ErrorBoundary.tsx` |
| ExpandableCard | component | button | manual audit required | 58 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | component | button | manual audit required | 126 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| FilterPills | component | button | Reset all engine filters | 149 | -- | scanner.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| LibraryPageTemplate | component | button | Grid view | 176 | test-lab.spec.ts | test-lab.spec.ts | direct control proof | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | List view | 187 | -- | test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | manual audit required | 206 | -- | test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Previous page | 281 | -- | test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Next page | 292 | -- | test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| LibraryPageTemplate | component | button | Close detail | 323 | -- | test-lab.spec.ts | inherits heuristic surface reference | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleGuide | component | button | Close guide | 70 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/ModuleGuide.tsx` |
| ModuleOnboarding | component | button | Dismiss onboarding | 87 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| ModuleOnboarding | component | button | Back | 129 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| ModuleOnboarding | component | button | manual audit required | 153 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | component | button | manual audit required | 233 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| Toast | component | button | manual audit required | 61 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/Toast.tsx` |
| Toast | component | button | Dismiss notification | 69 | -- | -- | playwright gap | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>

## Manual Label Audit Queue

<details>
<summary>Controls requiring manual label audit (205)</summary>

| Surface | Category | Control | Label | Line | Direct Proof Refs | Spec References | Status | File |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| /login | page | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/app/login/page.tsx` |
| Admin | module | tab-trigger | manual audit required | 68 | -- | admin.spec.ts, api-security.spec.ts, dashboard-widgets.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |
| ApiKeyManager | component | button | manual audit required | 259 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ApiKeyManager | component | button | manual audit required | 381 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | component | button | manual audit required | 56 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | component | button | manual audit required | 82 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| ScannerConfig | component | button | manual audit required | 121 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| UserManagement | component | button | manual audit required | 154 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | component | button | manual audit required | 927 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| ValidationManager | component | button | manual audit required | 1081 | -- | -- | manual label audit | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| Atemi Lab | module | button | manual audit required | 736 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 1014 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| Atemi Lab | module | button | manual audit required | 1084 | -- | atemi-lab.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| AtemiConfig | component | button | manual audit required | 192 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AttackLog | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| SessionHistory | component | button | manual audit required | 229 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SkillCard | component | button | manual audit required | 112 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillCard | component | button | manual audit required | 129 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | component | button | manual audit required | 187 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 227 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| SkillsLibrary | component | button | manual audit required | 268 | -- | -- | manual label audit | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | component | button | manual audit required | 171 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 196 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AgenticLab | component | button | manual audit required | 252 | -- | -- | manual label audit | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| AmaterasuConfig | component | button | manual audit required | 154 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 174 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 192 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuConfig | component | button | manual audit required | 268 | -- | attackdna.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | component | button | manual audit required | 224 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AmaterasuGuide | component | button | manual audit required | 274 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | component | tab-trigger | manual audit required | 392 | -- | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 202 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 282 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 290 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 338 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| BlackBoxAnalysis | component | button | manual audit required | 408 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| DataSourceSelector | component | button | manual audit required | 79 | -- | -- | manual label audit | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | component | button | manual audit required | 620 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | component | button | manual audit required | 226 | -- | attackdna.spec.ts | manual label audit | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| XRayPanel | component | button | manual audit required | 87 | -- | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| Bushido Book | module | button | manual audit required | 203 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | tab-trigger | manual audit required | 536 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 600 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Bushido Book | module | button | manual audit required | 1516 | -- | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| ComplianceChecklist | component | button | manual audit required | 381 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 433 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 468 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 503 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceChecklist | component | button | manual audit required | 571 | -- | compliance.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | component | button | manual audit required | 258 | -- | -- | manual label audit | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| FrameworkNavigator | component | button | manual audit required | 205 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 239 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| FrameworkNavigator | component | button | manual audit required | 260 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | component | button | manual audit required | 180 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 65 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 95 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 116 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| DashboardCustomizer | layout | button | manual audit required | 123 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| SenseiPanel | component | button | manual audit required | 56 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| SenseiPanel | component | button | manual audit required | 101 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetEmptyState | component | button | manual audit required | 36 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| AttackOfTheDay | widget | button | manual audit required | 60 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| DojoReadiness | widget | button | manual audit required | 65 | -- | dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 56 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardQuickPanel | widget | button | manual audit required | 76 | -- | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| LLMModelsWidget | widget | button | manual audit required | 111 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| QuickLLMTestWidget | widget | button | manual audit required | 98 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | widget | button | manual audit required | 41 | -- | -- | manual label audit | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| CategoryTree | component | button | manual audit required | 200 | -- | -- | manual label audit | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureExplorer | component | button | manual audit required | 190 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 471 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureExplorer | component | button | manual audit required | 693 | -- | llm-dashboard.spec.ts, test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | component | button | manual audit required | 304 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureFilters | component | select-trigger | manual audit required | 330 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | component | button | manual audit required | 229 | -- | -- | manual label audit | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 162 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| ForgeDefensePanel | component | button | manual audit required | 214 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | component | button | manual audit required | 68 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 90 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardAuditLog | component | button | manual audit required | 128 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardModeSelector | component | button | manual audit required | 25 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | component | button | manual audit required | 121 | -- | -- | manual label audit | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | component | button | manual audit required | 328 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | manual label audit | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| Kotoba | module | button | manual audit required | 277 | -- | kotoba.spec.ts, navigation.spec.ts | manual label audit | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| DashboardGrid | component | button | manual audit required | 107 | -- | -- | manual label audit | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| MobileNav | layout | button | manual audit required | 60 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 227 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| MobileNav | layout | button | manual audit required | 257 | -- | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| NotificationsPanel | layout | button | manual audit required | 83 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| PageToolbar | layout | button | manual audit required | 87 | -- | attackdna.spec.ts, compliance.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| PageToolbar | layout | button | manual audit required | 157 | -- | attackdna.spec.ts, compliance.spec.ts, llm-dashboard.spec.ts +2 | manual label audit | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| Sidebar | layout | button | manual audit required | 50 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| Sidebar | layout | button | manual audit required | 240 | -- | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | manual label audit | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| BenchmarkPanel | component | button | manual audit required | 103 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | component | button | manual audit required | 72 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | component | button | manual audit required | 91 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 247 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 336 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| CustomProviderBuilder | component | button | manual audit required | 372 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| JutsuModelCard | component | button | manual audit required | 146 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| LocalModelSelector | component | button | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| LocalModelSelector | component | button | manual audit required | 281 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | component | button | manual audit required | 457 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelDetailView | component | button | manual audit required | 476 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | component | button | manual audit required | 142 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | select-trigger | manual audit required | 174 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 252 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | input | manual audit required | 290 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelForm | component | button | manual audit required | 374 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelList | component | button | manual audit required | 340 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelList | component | button | manual audit required | 359 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | component | button | manual audit required | 273 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 145 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | select-trigger | manual audit required | 184 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ReportGenerator | component | button | manual audit required | 199 | -- | api-security.spec.ts, compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | component | select-trigger | manual audit required | 180 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 363 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| ResultsView | component | button | manual audit required | 371 | -- | llm-dashboard.spec.ts | manual label audit | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | component | button | manual audit required | 692 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 774 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExecution | component | button | manual audit required | 827 | -- | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | component | button | manual audit required | 184 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 178 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 331 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| VulnerabilityPanel | component | button | manual audit required | 349 | -- | -- | manual label audit | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | component | checkbox | manual audit required | 140 | -- | -- | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PayloadCard | component | checkbox | manual audit required | 147 | -- | -- | manual label audit | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| ConsolidatedReportButton | component | button | manual audit required | 184 | -- | compliance.spec.ts | manual label audit | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | component | button | manual audit required | 284 | -- | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +8 | manual label audit | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | component | button | manual audit required | 120 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramCard | component | link | manual audit required | 137 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | component | button | manual audit required | 162 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| Ronin Hub | module | tab-trigger | manual audit required | 154 | -- | navigation.spec.ts, ronin-hub.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| SubmissionsTab | component | button | manual audit required | 148 | -- | ronin-hub.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | component | button | manual audit required | 268 | -- | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | component | checkbox | manual audit required | 256 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | component | button | manual audit required | 167 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 130 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 153 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| ProtocolFuzzPanel | component | button | manual audit required | 172 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | component | button | manual audit required | 59 | -- | -- | manual label audit | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | component | button | manual audit required | 95 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| ScannerInput | component | button | manual audit required | 400 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 231 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 243 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 270 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| CampaignGraphBuilder | component | button | manual audit required | 338 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 130 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorBuilder | component | button | manual audit required | 301 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 218 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 247 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 282 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 335 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SengokuCampaignBuilder | component | button | manual audit required | 339 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| Sengoku | module | button | manual audit required | 324 | -- | navigation.spec.ts, sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| TemporalConversation | component | button | manual audit required | 136 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | component | button | manual audit required | 179 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| SenseiDrawer | layout | button | manual audit required | 87 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiDrawer | layout | button | manual audit required | 326 | -- | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiSuggestions | layout | button | manual audit required | 59 | -- | sensei.spec.ts | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | layout | button | manual audit required | 78 | -- | -- | manual label audit | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| ShinganPanel | component | input | manual audit required | 679 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | input | manual audit required | 686 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ShinganPanel | component | button | manual audit required | 740 | -- | shingan.spec.ts | manual label audit | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| ArenaRulesWidget | component | button | manual audit required | 125 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | component | button | manual audit required | 225 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | component | button | manual audit required | 81 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | component | button | manual audit required | 347 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchStatsWidget | component | button | manual audit required | 483 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | component | button | manual audit required | 61 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | component | button | manual audit required | 65 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| WarriorCardGrid | component | button | manual audit required | 87 | -- | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +5 | manual label audit | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| ArenaBrowser | component | tab-trigger | manual audit required | 270 | -- | kumite.spec.ts | manual label audit | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| KumiteConfig | component | button | manual audit required | 139 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 159 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 486 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| KumiteConfig | component | button | manual audit required | 511 | -- | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | manual label audit | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | component | button | manual audit required | 384 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +16 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeLibrary | component | button | manual audit required | 930 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +16 | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 296 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| MitsukeSourceConfig | component | button | manual audit required | 441 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | component | button | manual audit required | 154 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| The Kumite | module | button | manual audit required | 411 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 422 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | tab-trigger | manual audit required | 446 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 555 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| The Kumite | module | button | manual audit required | 563 | -- | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | manual label audit | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| SupplyChainPanel | component | button | manual audit required | 164 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 225 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| SupplyChainPanel | component | button | manual audit required | 243 | -- | -- | manual label audit | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| ThreatFeedStream | component | button | manual audit required | 291 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| ThreatFeedStream | component | button | manual audit required | 699 | -- | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | manual label audit | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| TestRunner | component | button | manual audit required | 73 | -- | -- | manual label audit | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ConfigPanel | component | button | manual audit required | 313 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| ConfigPanel | component | button | manual audit required | 443 | -- | atemi-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | component | button | manual audit required | 237 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| CrossModuleActions | component | button | manual audit required | 313 | -- | cross-module.spec.ts, dashboard-widgets.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| EmptyState | component | button | manual audit required | 49 | -- | sengoku.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ExpandableCard | component | button | manual audit required | 58 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | component | button | manual audit required | 126 | -- | scanner.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| LibraryPageTemplate | component | button | manual audit required | 206 | -- | test-lab.spec.ts | manual label audit | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleOnboarding | component | button | manual audit required | 153 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | component | button | manual audit required | 233 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| Toast | component | button | manual audit required | 61 | -- | -- | manual label audit | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>

## Priority Gap Register

| Surface | Category | Interactive | Recommended Runner | Required Coverage | File |
| --- | --- | --- | --- | --- | --- |
| /login | page | 4 | Playwright | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/login/page.tsx` |
| boundary:error | page | 2 | Playwright | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/error.tsx` |
| boundary:404 | page | 2 | Playwright | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/not-found.tsx` |
| /style-guide | page | 0 | Playwright + manual visual | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| ValidationManager | component | 33 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| SenseiToolResult | layout | 2 | Playwright | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |
| LLMModelsWidget | widget | 6 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| QuickLLMTestWidget | widget | 5 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | widget | 5 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| ApiKeyManager | component | 24 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| FixtureRoulette | widget | 4 | Playwright + manual visual/device | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| ArenaLeaderboardWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| EcosystemPulseWidget | widget | 2 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| KotobaWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMJutsuWidget | widget | 2 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| MitsukeAlertWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| SengokuWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| TimeChamberWidget | widget | 2 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |
| CustomProviderBuilder | component | 22 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| LLMBatchProgress | widget | 1 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| ModelDetailView | component | 21 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | component | 21 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| CoverageHeatmapWidget | widget | 0 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/CoverageHeatmapWidget.tsx` |
| EngineToggleGrid | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EngineToggleGrid.tsx` |
| GuardAuditWidget | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardAuditWidget.tsx` |
| GuardStatsCard | widget | 0 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardStatsCard.tsx` |
| KillCount | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KillCount.tsx` |
| ModuleGridWidget | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ModuleGridWidget.tsx` |
| PlatformStatsWidget | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/PlatformStatsWidget.tsx` |
| QuickLaunchOrOnboarding | widget | 0 | Playwright | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchOrOnboarding.tsx` |
| SessionPulse | widget | 0 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SessionPulse.tsx` |
| ThreatTrendWidget | widget | 0 | Playwright + manual visual | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ThreatTrendWidget.tsx` |
| OrchestratorBuilder | component | 19 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| SengokuCampaignBuilder | component | 19 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| SkillsLibrary | component | 16 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| FixtureSearch | component | 16 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| McpConnectorStatus | component | 15 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| SessionHistory | component | 15 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| CampaignGraphBuilder | component | 15 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| MitsukeSourceConfig | component | 14 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| AmaterasuGuide | component | 13 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| UserManagement | component | 11 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| AdminSettings | component | 10 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| GuardAuditLog | component | 10 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| BattleModeStep | component | 10 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| ScannerConfig | component | 9 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| AgenticLab | component | 9 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| TestSummary | component | 9 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| GuardModeSelector | component | 8 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| JutsuModelCard | component | 8 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| SupplyChainPanel | component | 8 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| ModuleOnboarding | component | 8 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| BattleLogExporter | component | 7 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | component | 7 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | component | 7 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| SessionRecorder | component | 6 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SenseiPanel | component | 6 | Playwright | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| CategoryTree | component | 6 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| PlaybookRunner | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| ForgeDefensePanel | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| KotobaWorkshop | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| LocalModelSelector | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| VulnerabilityPanel | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| ProgramCard | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProtocolFuzzPanel | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| TestRunner | component | 5 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| DataSourceSelector | component | 4 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| MutationTimeline | component | 4 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| ComplianceExport | component | 4 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| ComparisonView | component | 4 | Playwright + manual visual | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| TestExporter | component | 4 | Playwright + manual device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| QuickChips | component | 4 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| Toast | component | 4 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/Toast.tsx` |
| ScenarioRunner | component | 3 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| NodeDetailPanel | component | 3 | Playwright | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| MediaViewer | component | 3 | Playwright + manual visual/device | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |

## Module Journeys

| Module | Group | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | -- | 4 | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/dashboard/NODADashboard.tsx` |
| Haiku Scanner | attack | 12 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/app/page.tsx` |
| Armory | attack | 12 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/app/page.tsx` |
| LLM Dashboard | attack | 15 | api-security.spec.ts, atemi-lab.spec.ts, kotoba.spec.ts +8 | Playwright + manual visual/device | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/llm/LLMDashboard.tsx` |
| Hattori Guard | defense | 0 | dashboard-widgets.spec.ts, guard.spec.ts, mobile-nav.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/guard/GuardDashboard.tsx` |
| Bushido Book | defense | 26 | compliance.spec.ts, llm-dashboard.spec.ts, navigation.spec.ts | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/compliance/ComplianceCenter.tsx` |
| Atemi Lab | redteam | 30 | atemi-lab.spec.ts, navigation.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/adversarial/AdversarialLab.tsx` |
| The Kumite | analysis | 9 | attackdna.spec.ts, kumite.spec.ts, navigation.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/strategic/StrategicHub.tsx` |
| Ronin Hub | analysis | 6 | navigation.spec.ts, ronin-hub.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/ronin/RoninHub.tsx` |
| Sengoku | redteam | 11 | navigation.spec.ts, sengoku.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/sengoku/SengokuDashboard.tsx` |
| Kotoba | defense | 8 | kotoba.spec.ts, navigation.spec.ts | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/kotoba/KotobaDashboard.tsx` |
| Admin | -- | 5 | admin.spec.ts, api-security.spec.ts, dashboard-widgets.spec.ts +1 | Playwright | heuristic playwright reference | load, primary journey, error/empty, keyboard, mobile | `packages/dojolm-web/src/components/admin/AdminPanel.tsx` |

## Standalone App Surfaces

| Surface | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard-root:/ | app | 12 | admin.spec.ts, attackdna.spec.ts, cross-module.spec.ts +7 | Playwright + manual visual | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/page.tsx` |
| app-shell:/ | app | 0 | guard.spec.ts, sensei.spec.ts | Playwright | heuristic playwright reference | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/layout.tsx` |
| /login | app | 4 | -- | Playwright | playwright gap | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/login/page.tsx` |
| /style-guide | app | 0 | -- | Playwright + manual visual | playwright gap | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/style-guide/page.tsx` |
| boundary:error | app | 2 | -- | Playwright | playwright gap | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/error.tsx` |
| boundary:404 | app | 2 | -- | Playwright | playwright gap | load, primary CTA or recovery, responsive, nav/back path | `packages/dojolm-web/src/app/not-found.tsx` |

## Layout And Global UX

| Surface | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sidebar | layout | 10 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/Sidebar.tsx` |
| MobileNav | layout | 11 | atemi-lab.spec.ts, kotoba.spec.ts, mobile-nav.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/MobileNav.tsx` |
| PageToolbar | layout | 6 | attackdna.spec.ts, compliance.spec.ts, llm-dashboard.spec.ts +2 | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/PageToolbar.tsx` |
| NotificationsPanel | layout | 6 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/layout/NotificationsPanel.tsx` |
| DashboardCustomizer | layout | 14 | cross-module.spec.ts, dashboard-widgets.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/dashboard/DashboardCustomizer.tsx` |
| SenseiDrawer | sensei | 12 | guard.spec.ts, kotoba.spec.ts, sensei.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiDrawer.tsx` |
| SenseiChat | sensei | 9 | kotoba.spec.ts, sensei.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiChat.tsx` |
| SenseiSuggestions | sensei | 2 | sensei.spec.ts | Playwright | heuristic playwright reference | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiSuggestions.tsx` |
| SenseiToolResult | sensei | 2 | -- | Playwright | playwright gap | navigation, focus management, responsive, open/close states | `packages/dojolm-web/src/components/sensei/SenseiToolResult.tsx` |

## Dashboard Widgets

| Widget | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ActivityFeedWidget | dashboard | 0 | cross-module.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ActivityFeedWidget.tsx` |
| ArenaLeaderboardWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ArenaLeaderboardWidget.tsx` |
| AttackOfTheDay | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/AttackOfTheDay.tsx` |
| ComplianceBarsWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ComplianceBarsWidget.tsx` |
| CoverageHeatmapWidget | dashboard | 0 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/CoverageHeatmapWidget.tsx` |
| DojoReadiness | dashboard | 4 | dashboard-widgets.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/DojoReadiness.tsx` |
| EcosystemPulseWidget | dashboard | 2 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EcosystemPulseWidget.tsx` |
| EngineToggleGrid | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/EngineToggleGrid.tsx` |
| FixtureRoulette | dashboard | 4 | -- | Playwright + manual visual/device | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/FixtureRoulette.tsx` |
| GuardAuditWidget | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardAuditWidget.tsx` |
| GuardQuickPanel | dashboard | 10 | guard.spec.ts, mobile-nav.spec.ts, navigation.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardQuickPanel.tsx` |
| GuardStatsCard | dashboard | 0 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/GuardStatsCard.tsx` |
| KillCount | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KillCount.tsx` |
| KotobaWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/KotobaWidget.tsx` |
| LLMBatchProgress | dashboard | 1 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMBatchProgress.tsx` |
| LLMJutsuWidget | dashboard | 2 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMJutsuWidget.tsx` |
| LLMModelsWidget | dashboard | 6 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/LLMModelsWidget.tsx` |
| MitsukeAlertWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/MitsukeAlertWidget.tsx` |
| ModuleGridWidget | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ModuleGridWidget.tsx` |
| PlatformStatsWidget | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/PlatformStatsWidget.tsx` |
| QuickLaunchOrOnboarding | dashboard | 0 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchOrOnboarding.tsx` |
| QuickLaunchPad | dashboard | 2 | dashboard-widgets.spec.ts, kumite.spec.ts, navigation.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLaunchPad.tsx` |
| QuickLLMTestWidget | dashboard | 5 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickLLMTestWidget.tsx` |
| QuickScanWidget | dashboard | 5 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/QuickScanWidget.tsx` |
| RoninHubWidget | dashboard | 2 | navigation.spec.ts, ronin-hub.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/RoninHubWidget.tsx` |
| SAGEStatusWidget | dashboard | 4 | attackdna.spec.ts, kumite.spec.ts, shingan.spec.ts | Playwright | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SAGEStatusWidget.tsx` |
| SengokuWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SengokuWidget.tsx` |
| SessionPulse | dashboard | 0 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SessionPulse.tsx` |
| SystemHealthGauge | dashboard | 0 | admin.spec.ts, dashboard-widgets.spec.ts, navigation.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/SystemHealthGauge.tsx` |
| ThreatRadar | dashboard | 2 | scanner.spec.ts, sengoku.spec.ts | Playwright + manual visual | heuristic playwright reference | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ThreatRadar.tsx` |
| ThreatTrendWidget | dashboard | 0 | -- | Playwright + manual visual | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/ThreatTrendWidget.tsx` |
| TimeChamberWidget | dashboard | 2 | -- | Playwright | playwright gap | render, CTA/open, empty/error, responsive | `packages/dojolm-web/src/components/dashboard/widgets/TimeChamberWidget.tsx` |

## Interactive Components

<details>
<summary>Interactive component inventory (137 surfaces)</summary>

| Component | Area | Interactive | Spec References | Runner | Status | Required Coverage | File |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AdminSettings | admin | 10 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/AdminSettings.tsx` |
| ApiKeyManager | admin | 24 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ApiKeyManager.tsx` |
| ExportSettings | admin | 6 | api-security.spec.ts, compliance.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ExportSettings.tsx` |
| ScannerConfig | admin | 9 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ScannerConfig.tsx` |
| SystemHealth | admin | 2 | api-security.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +14 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/SystemHealth.tsx` |
| UserManagement | admin | 11 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/UserManagement.tsx` |
| ValidationManager | admin | 33 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/admin/ValidationManager.tsx` |
| AtemiConfig | adversarial | 18 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AtemiConfig.tsx` |
| AtemiGettingStarted | adversarial | 6 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AtemiGettingStarted.tsx` |
| AttackLog | adversarial | 2 | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +2 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AttackLog.tsx` |
| AttackToolCard | adversarial | 8 | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +3 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/AttackToolCard.tsx` |
| McpConnectorStatus | adversarial | 15 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/McpConnectorStatus.tsx` |
| PlaybookRunner | adversarial | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/PlaybookRunner.tsx` |
| SessionHistory | adversarial | 15 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionHistory.tsx` |
| SessionRecorder | adversarial | 6 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SessionRecorder.tsx` |
| SkillCard | adversarial | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SkillCard.tsx` |
| SkillsLibrary | adversarial | 16 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/adversarial/SkillsLibrary.tsx` |
| AgenticLab | agentic | 9 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/AgenticLab.tsx` |
| ScenarioRunner | agentic | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/agentic/ScenarioRunner.tsx` |
| AmaterasuConfig | attackdna | 10 | attackdna.spec.ts, kumite.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AmaterasuConfig.tsx` |
| AmaterasuGuide | attackdna | 13 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AmaterasuGuide.tsx` |
| AttackDNAExplorer | attackdna | 6 | attackdna.spec.ts, kotoba.spec.ts, kumite.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/AttackDNAExplorer.tsx` |
| BlackBoxAnalysis | attackdna | 14 | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/BlackBoxAnalysis.tsx` |
| ClusterView | attackdna | 2 | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/ClusterView.tsx` |
| DataSourceSelector | attackdna | 4 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/DataSourceSelector.tsx` |
| DNALibrary | attackdna | 2 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/DNALibrary.tsx` |
| FamilyTreeView | attackdna | 12 | attackdna.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/FamilyTreeView.tsx` |
| MutationTimeline | attackdna | 4 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/MutationTimeline.tsx` |
| NodeDetailPanel | attackdna | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/NodeDetailPanel.tsx` |
| XRayPanel | attackdna | 6 | atemi-lab.spec.ts, attackdna.spec.ts, guard.spec.ts +4 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/attackdna/XRayPanel.tsx` |
| AuditTrail | compliance | 11 | guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/AuditTrail.tsx` |
| ComplianceChecklist | compliance | 24 | compliance.spec.ts, sengoku.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceChecklist.tsx` |
| ComplianceDashboard | compliance | 2 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceDashboard.tsx` |
| ComplianceExport | compliance | 4 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/ComplianceExport.tsx` |
| FrameworkNavigator | compliance | 12 | compliance.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/FrameworkNavigator.tsx` |
| GapMatrix | compliance | 8 | compliance.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/compliance/GapMatrix.tsx` |
| DashboardConfigContext | dashboard | 1 | dashboard-widgets.spec.ts, navigation.spec.ts, ronin-hub.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/DashboardConfigContext.tsx` |
| SenseiPanel | dashboard | 6 | -- | Playwright | playwright gap | open/close, prompt flow, keyboard, streaming/tool states | `packages/dojolm-web/src/components/dashboard/SenseiPanel.tsx` |
| WidgetCard | dashboard | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/WidgetCard.tsx` |
| WidgetEmptyState | dashboard | 1 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/dashboard/WidgetEmptyState.tsx` |
| CategoryTree | fixtures | 6 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/CategoryTree.tsx` |
| FixtureCategoryCard | fixtures | 2 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureCategoryCard.tsx` |
| FixtureComparison | fixtures | 1 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureComparison.tsx` |
| FixtureDetail | fixtures | 2 | atemi-lab.spec.ts, mobile-nav.spec.ts, sengoku.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureDetail.tsx` |
| FixtureExplorer | fixtures | 15 | llm-dashboard.spec.ts, test-lab.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureExplorer.tsx` |
| FixtureFilters | fixtures | 12 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureFilters.tsx` |
| FixtureList | fixtures | 2 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureList.tsx` |
| FixtureSearch | fixtures | 16 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/FixtureSearch.tsx` |
| MediaViewer | fixtures | 3 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/fixtures/MediaViewer.tsx` |
| ForgeDefensePanel | guard | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/ForgeDefensePanel.tsx` |
| GuardAuditLog | guard | 10 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardAuditLog.tsx` |
| GuardModeSelector | guard | 8 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/GuardModeSelector.tsx` |
| SystemPromptHardener | guard | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/guard/SystemPromptHardener.tsx` |
| KagamiPanel | kagami | 11 | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +4 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kagami/KagamiPanel.tsx` |
| KagamiResults | kagami | 3 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kagami/KagamiResults.tsx` |
| KotobaWorkshop | kotoba | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/kotoba/KotobaWorkshop.tsx` |
| DashboardGrid | layout | 2 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/layout/DashboardGrid.tsx` |
| BenchmarkPanel | llm | 1 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/BenchmarkPanel.tsx` |
| ChatBubble | llm | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ChatBubble.tsx` |
| ComparisonView | llm | 4 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ComparisonView.tsx` |
| CustomProviderBuilder | llm | 22 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/CustomProviderBuilder.tsx` |
| ExecutiveSummary | llm | 2 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ExecutiveSummary.tsx` |
| JutsuModelCard | llm | 8 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/JutsuModelCard.tsx` |
| JutsuTab | llm | 6 | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +8 | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/JutsuTab.tsx` |
| Leaderboard | llm | 3 | llm-dashboard.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/Leaderboard.tsx` |
| LocalModelSelector | llm | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/LocalModelSelector.tsx` |
| ModelDetailView | llm | 21 | -- | Playwright + manual visual/device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelDetailView.tsx` |
| ModelForm | llm | 21 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelForm.tsx` |
| ModelList | llm | 9 | llm-dashboard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelList.tsx` |
| ModelResultCard | llm | 3 | compliance.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ModelResultCard.tsx` |
| ReportGenerator | llm | 7 | api-security.spec.ts, compliance.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ReportGenerator.tsx` |
| ResultsView | llm | 11 | llm-dashboard.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/ResultsView.tsx` |
| TestExecution | llm | 16 | api-security.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestExecution.tsx` |
| TestExporter | llm | 4 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestExporter.tsx` |
| TestSummary | llm | 9 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/TestSummary.tsx` |
| VulnerabilityPanel | llm | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/llm/VulnerabilityPanel.tsx` |
| PayloadCard | payloads | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/payloads/PayloadCard.tsx` |
| PatternReference | reference | 1 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/reference/PatternReference.tsx` |
| ConsolidatedReportButton | reports | 3 | compliance.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/reports/ConsolidatedReportButton.tsx` |
| AISeverityCalculator | ronin | 7 | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +8 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/AISeverityCalculator.tsx` |
| ProgramCard | ronin | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramCard.tsx` |
| ProgramDetail | ronin | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramDetail.tsx` |
| ProgramsTab | ronin | 7 | ronin-hub.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/ProgramsTab.tsx` |
| SubmissionDetail | ronin | 4 | sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionDetail.tsx` |
| SubmissionsTab | ronin | 5 | ronin-hub.spec.ts, sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionsTab.tsx` |
| SubmissionWizard | ronin | 18 | atemi-lab.spec.ts, compliance.spec.ts, kotoba.spec.ts +1 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ronin/SubmissionWizard.tsx` |
| ModuleLegend | scanner | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ModuleLegend.tsx` |
| ModuleResults | scanner | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ModuleResults.tsx` |
| ProtocolFuzzPanel | scanner | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ProtocolFuzzPanel.tsx` |
| QuickChips | scanner | 4 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/QuickChips.tsx` |
| ScannerInput | scanner | 9 | scanner.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/scanner/ScannerInput.tsx` |
| CampaignGraphBuilder | sengoku | 15 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/CampaignGraphBuilder.tsx` |
| OrchestratorBuilder | sengoku | 19 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/OrchestratorBuilder.tsx` |
| OrchestratorVisualization | sengoku | 2 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +15 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/OrchestratorVisualization.tsx` |
| SengokuCampaignBuilder | sengoku | 19 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/SengokuCampaignBuilder.tsx` |
| TemporalConversation | sengoku | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/TemporalConversation.tsx` |
| TemporalTab | sengoku | 4 | sengoku.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/sengoku/TemporalTab.tsx` |
| ShinganPanel | shingan | 15 | shingan.spec.ts | Playwright + manual visual/device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/shingan/ShinganPanel.tsx` |
| AmaterasuSubsystem | strategic | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/AmaterasuSubsystem.tsx` |
| ArenaRulesWidget | strategic | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/ArenaRulesWidget.tsx` |
| BattleLogExporter | strategic | 7 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/BattleLogExporter.tsx` |
| LiveInferencePanel | strategic | 7 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveInferencePanel.tsx` |
| LiveMatchView | strategic | 7 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/LiveMatchView.tsx` |
| MatchCreationWizard | strategic | 6 | atemi-lab.spec.ts, dashboard-widgets.spec.ts, kumite.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/MatchCreationWizard.tsx` |
| MatchStatsWidget | strategic | 1 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/MatchStatsWidget.tsx` |
| AttackModeStep | strategic | 2 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/AttackModeStep.tsx` |
| BattleModeStep | strategic | 10 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/BattleModeStep.tsx` |
| ModelSelectionStep | strategic | 5 | shingan.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/steps/ModelSelectionStep.tsx` |
| WarriorCardGrid | strategic | 4 | attackdna.spec.ts, compliance.spec.ts, guard.spec.ts +5 | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/arena/WarriorCardGrid.tsx` |
| ArenaBrowser | strategic | 9 | kumite.spec.ts | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/ArenaBrowser.tsx` |
| KumiteConfig | strategic | 15 | atemi-lab.spec.ts, compliance.spec.ts, guard.spec.ts +7 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/KumiteConfig.tsx` |
| MitsukeLibrary | strategic | 4 | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +16 | Playwright + manual device | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/MitsukeLibrary.tsx` |
| MitsukeSourceConfig | strategic | 14 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/MitsukeSourceConfig.tsx` |
| SAGEDashboard | strategic | 3 | -- | Playwright + manual visual | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SAGEDashboard.tsx` |
| SageQuarantineView | strategic | 4 | api-security.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +10 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SageQuarantineView.tsx` |
| SupplyChainPanel | strategic | 8 | -- | Playwright + manual device | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/SupplyChainPanel.tsx` |
| ThreatFeedStream | strategic | 12 | admin.spec.ts, api-security.spec.ts, atemi-lab.spec.ts +9 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/strategic/ThreatFeedStream.tsx` |
| TestRunner | tests | 5 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/tests/TestRunner.tsx` |
| ActivityFeed | ui | 4 | cross-module.spec.ts, guard.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ActivityFeed.tsx` |
| checkbox | ui | 5 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/checkbox.tsx` |
| ConfigPanel | ui | 20 | atemi-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ConfigPanel.tsx` |
| CrossModuleActions | ui | 6 | cross-module.spec.ts, dashboard-widgets.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/CrossModuleActions.tsx` |
| dialog | ui | 3 | mobile-nav.spec.ts, sengoku.spec.ts, sensei.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/dialog.tsx` |
| EmptyState | ui | 1 | sengoku.spec.ts | Playwright + manual visual | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/EmptyState.tsx` |
| ErrorBoundary | ui | 1 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ErrorBoundary.tsx` |
| ExpandableCard | ui | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ExpandableCard.tsx` |
| FilterPills | ui | 4 | scanner.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/FilterPills.tsx` |
| input | ui | 1 | atemi-lab.spec.ts, attackdna.spec.ts, compliance.spec.ts +9 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/input.tsx` |
| LibraryPageTemplate | ui | 21 | test-lab.spec.ts | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/LibraryPageTemplate.tsx` |
| ModuleGuide | ui | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ModuleGuide.tsx` |
| ModuleOnboarding | ui | 8 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/ModuleOnboarding.tsx` |
| SafeCodeBlock | ui | 2 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/SafeCodeBlock.tsx` |
| select | ui | 4 | admin.spec.ts, atemi-lab.spec.ts, attackdna.spec.ts +9 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/select.tsx` |
| SortableTable | ui | 3 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/SortableTable.tsx` |
| tabs | ui | 3 | admin.spec.ts, attackdna.spec.ts, compliance.spec.ts +5 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/tabs.tsx` |
| textarea | ui | 1 | kotoba.spec.ts, scanner.spec.ts, sensei.spec.ts +1 | Playwright | heuristic playwright reference | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/textarea.tsx` |
| Toast | ui | 4 | -- | Playwright | playwright gap | interaction path, keyboard, visual states | `packages/dojolm-web/src/components/ui/Toast.tsx` |

</details>
