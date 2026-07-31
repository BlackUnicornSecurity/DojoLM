// SPDX-License-Identifier: Apache-2.0
/**
 * /console — Workbench archetype foundation (TICKET-D-211 / Phase B).
 *
 * Server-component route entry per ADR-0096 §2 ("`/console` route shape").
 * The Workbench is a widget-rich console mounted distinct from the `/`
 * Command archetype (preserved at YR.21 4-widget Path-B narrowing).
 *
 * D-211 ships only the foundation:
 *   - This route file (server component → ConsoleClient orchestrator)
 *   - `<WorkbenchCustomizer>` mounted in the toolbar
 *   - 5 placeholder widget slots (per `WORKBENCH_WIDGET_IDS`)
 *
 * Actual widget bodies (KillCount / ThreatRadar / AttackOfTheDay /
 * FixtureRoulette / QuickLaunchPad) land under D-207..D-210 + D-212.
 *
 * Auth model per ADR-0096 §"Justification": the Workbench is for any
 * authenticated user — NOT admin-gated. Auth handling is delegated to
 * the AuthGate inside ConsoleClient (mirrors `/` HomeClient pattern).
 */

import { ConsoleClient } from './ConsoleClient';

export const dynamic = 'force-dynamic';

export default function ConsolePage() {
  return <ConsoleClient />;
}
