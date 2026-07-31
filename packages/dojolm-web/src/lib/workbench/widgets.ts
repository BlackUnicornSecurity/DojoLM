// SPDX-License-Identifier: Apache-2.0
/**
 * Workbench Widget Catalog — TICKET-D-211 / Phase B foundation.
 *
 * Single source of truth for the canonical Workbench widget closed-enum
 * + defaults map + label map per ADR-0096 §3 (amended 2026-05-07,
 * D-206 audit closeout).
 *
 * Mounted on `/console` (V2.1 Workbench archetype). Distinct from the
 * `/` Command dashboard `DashboardWidgetId` enum — those are the 6 Path-B
 * widgets shipped under YR.21; this enum drives the widget-rich
 * Workbench surface introduced in ADR-0096.
 *
 * ADR-0096 §3 amendment (2026-05-07 — D-206 closeout):
 *   - REMOVED `'engine-toggle-grid'` from the enum. Rationale: A-405
 *     `<EngineStatusBar>` + D-204 `<EngineFilterChips>` are the canonical
 *     13-engine surfaces on `/admin/scanner`, `/admin/hattori`, and `/`
 *     Command. A third redundant mount on `/console` regresses the
 *     R-T1 closed-map discipline. Default widget set narrows 6 → 5.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `WORKBENCH_WIDGET_IDS` — `as const` tuple, 5 entries, frozen
 *   - `WorkbenchWidgetId` — derived `(typeof ...)[number]` literal union
 *   - `WORKBENCH_WIDGET_LABEL` — closed `Record<WorkbenchWidgetId, string>`
 *   - `WORKBENCH_WIDGET_DEFAULTS` — closed `Record<WorkbenchWidgetId, boolean>`
 *   - `isWorkbenchWidgetId` — runtime guard for boundary narrowing
 *
 * Restoration cross-references:
 *   - `kill-count`        → TICKET-D-207 (KillCount widget)
 *   - `threat-radar`      → TICKET-D-208 (ThreatRadar widget)
 *   - `attack-of-the-day` → TICKET-D-209 (AttackOfTheDay widget)
 *   - `fixture-roulette`  → TICKET-D-210 (FixtureRoulette widget)
 *   - `quick-launch-pad`  → TICKET-D-212 (QuickLaunchPad — renumbered
 *     from old D-207 per D-206 audit §4)
 *
 * Adding a new widget:
 *   1. Append id to `WORKBENCH_WIDGET_IDS` tuple.
 *   2. Add row to `WORKBENCH_WIDGET_LABEL`.
 *   3. Add row to `WORKBENCH_WIDGET_DEFAULTS`.
 *   4. Bump WB-001 length assertion (5 → N) in widgets.test.ts.
 *   5. Cite ADR-0096 in restoration ticket PR description.
 *
 * Zero runtime dependencies. No fetches. Pure data + freeze guards.
 */

/**
 * Closed-enum tuple of all canonical Workbench widget ids. 5 entries
 * post-amendment. Order is alphabetical by id for stable layout
 * iteration; restoration tickets append below the existing run, not
 * inside.
 *
 * NOTE: never widen this to `string[]`. Consumers depend on
 * `WorkbenchWidgetId` being a literal string union for exhaustiveness.
 */
export const WORKBENCH_WIDGET_IDS = Object.freeze([
  'kill-count',
  'threat-radar',
  'attack-of-the-day',
  'fixture-roulette',
  'quick-launch-pad',
] as const);

/** Literal-union derived from the closed tuple. 5 members. */
export type WorkbenchWidgetId = (typeof WORKBENCH_WIDGET_IDS)[number];

/**
 * Operator-facing widget label. Used by `<WorkbenchCustomizer>` toggle
 * rows + per-widget aria-labels. R-T1: every WorkbenchWidgetId render
 * site routes through this map — no inline `${id}` strings.
 */
export const WORKBENCH_WIDGET_LABEL: Readonly<Record<WorkbenchWidgetId, string>> =
  Object.freeze({
    'kill-count': 'Kill count',
    'threat-radar': 'Threat radar',
    'attack-of-the-day': 'Attack of the day',
    'fixture-roulette': 'Fixture roulette',
    'quick-launch-pad': 'Quick launch pad',
  });

/**
 * Initial enabled state per widget. All-on at first mount; the
 * customizer toggles persist per-user under
 * `tpi.workbench.widgets.<userId>` localStorage scope.
 */
export const WORKBENCH_WIDGET_DEFAULTS: Readonly<Record<WorkbenchWidgetId, boolean>> =
  Object.freeze({
    'kill-count': true,
    'threat-radar': true,
    'attack-of-the-day': true,
    'fixture-roulette': true,
    'quick-launch-pad': true,
  });

/**
 * Per-user widget enabled-state shape. Read/written through the
 * customizer + `useWorkbenchWidgetState` hook. Frozen-readonly so
 * consumers must `{ ...state, [id]: next }` rather than mutate.
 */
export type WorkbenchWidgetState = Readonly<Record<WorkbenchWidgetId, boolean>>;

/**
 * Type guard. Returns true iff `v` is one of the 5 canonical workbench
 * widget ids. Use at API/route boundaries to narrow `string` from JSON
 * (e.g. `localStorage` reads) before passing into the closed-enum world.
 */
export function isWorkbenchWidgetId(v: unknown): v is WorkbenchWidgetId {
  return (
    typeof v === 'string' &&
    (WORKBENCH_WIDGET_IDS as readonly string[]).includes(v)
  );
}
