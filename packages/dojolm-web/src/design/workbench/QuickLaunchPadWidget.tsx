// SPDX-License-Identifier: Apache-2.0
/**
 * QuickLaunchPadWidget — TICKET-D-212 Workbench widget primitive.
 *
 * Restores V1 dashboard's "Quick Launch Pad" widget on the V2.1
 * `/console` Workbench surface (slot 5 of 5). Pure presentational
 * primitive: receives a closed-enum action id list + click handler +
 * LIVE badge state. No fetches, no contexts. Live consumer
 * (`<QuickLaunchPadWidgetLive>`) wires nav-context dispatch and
 * derives the LIVE badge from `useActivityState`.
 *
 * Per ADR-0096 §3 amendment 2026-05-07 (D-206 closeout) the widget
 * mounts on `/console` via `WorkbenchWidgetId = 'quick-launch-pad'`.
 *
 * Closed-enum discipline (R-T1 §10.16):
 *   - `QUICK_LAUNCH_ACTION_IDS` — closed `as const` tuple, 5 entries.
 *   - `QUICK_LAUNCH_LABEL` — closed map; render-site iterates only
 *     through this map (no inline literals).
 *   - `QUICK_LAUNCH_ARIA_LABEL` — closed aria-label map; routes
 *     accessible-name copy through a freeze guard.
 *   - `BADGE_STATE` literal-union (`'idle' | 'live'`) + closed
 *     `BADGE_LABEL` map; never interpolate the state into copy.
 *   - `WIDGET_KICKER` / `WIDGET_ARIA_LABEL` — closed maps; same as
 *     D-209 / D-210 sister primitives.
 *
 * Color + tint: `var(--*)` tokens only. Zero inline hex.
 *
 * Zero new deps. ≤200 lines.
 */

'use client';

import { useCallback, type MouseEvent, type ReactElement } from 'react';
import {
  ROOT_STYLE,
  HEADER_ROW_STYLE,
  KICKER_STYLE,
  SUB_STYLE,
  HEAD_END_STYLE,
  LIVE_BADGE_IDLE_STYLE,
  LIVE_BADGE_LIVE_STYLE,
  LIVE_DOT_STYLE,
  ACTION_GRID_STYLE,
  ACTION_BUTTON_STYLE,
} from './QuickLaunchPadWidget.styles';

/**
 * Closed-enum tuple of quick-launch action ids. 4 entries — "customize"
 * is retired from this row (P5; Workbench v2.html:170-173). Customize now
 * lives only in the page-head actions (`<WorkbenchCustomizer>`).
 */
export const QUICK_LAUNCH_ACTION_IDS = [
  'scan-text',
  'models',
  'guard',
  'modules',
] as const satisfies readonly string[];

/** Literal-union derived from the closed tuple. 4 members. */
export type QuickLaunchActionId = (typeof QUICK_LAUNCH_ACTION_IDS)[number];

/**
 * Operator-facing button label. Sentence case (Workbench v2.html:170-173:
 * "Scan text · Models · Guard · All modules").
 */
export const QUICK_LAUNCH_LABEL: Readonly<
  Record<QuickLaunchActionId, string>
> = Object.freeze({
  'scan-text': 'Scan text',
  models: 'Models',
  guard: 'Guard',
  modules: 'All modules',
});

/** Aria-label map. Distinct from visible label so SR copy can diverge. */
export const QUICK_LAUNCH_ARIA_LABEL: Readonly<
  Record<QuickLaunchActionId, string>
> = Object.freeze({
  'scan-text': 'Quick launch: scan text',
  models: 'Quick launch: models',
  guard: 'Quick launch: guard',
  modules: 'Quick launch: all modules',
});

/** LIVE badge binary state. */
export type BadgeState = 'idle' | 'live';

/** Closed badge-label map. */
export const BADGE_LABEL: Readonly<Record<BadgeState, string>> =
  Object.freeze({
    idle: 'Idle',
    live: 'Live',
  });

const WIDGET_KICKER: Readonly<Record<'quick-launch-pad', string>> =
  // Sentence case, no "Pad" (audit D12; Workbench v2.html:168 "Quick launch").
  Object.freeze({ 'quick-launch-pad': 'Quick launch' });

/** Header sub (Workbench v2.html:168). */
const WIDGET_SUB = 'Jump back into the work';

const WIDGET_ARIA_LABEL: Readonly<Record<'quick-launch-pad', string>> =
  Object.freeze({ 'quick-launch-pad': 'Quick Launch Pad widget' });

const BADGE_ARIA_LABEL: Readonly<Record<BadgeState, string>> =
  Object.freeze({
    idle: 'Activity status: idle',
    live: 'Activity status: live',
  });

export interface QuickLaunchPadWidgetProps {
  readonly badgeState: BadgeState;
  readonly onAction: (id: QuickLaunchActionId) => void;
  readonly testId?: string;
}

export function QuickLaunchPadWidget(
  props: QuickLaunchPadWidgetProps,
): ReactElement {
  const { badgeState, onAction, testId } = props;
  const resolvedTestId = testId ?? 'workbench-widget-quick-launch-pad';

  const handleClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      const id = e.currentTarget.dataset.actionId as QuickLaunchActionId;
      onAction(id);
    },
    [onAction],
  );

  const badgeStyle =
    badgeState === 'live' ? LIVE_BADGE_LIVE_STYLE : LIVE_BADGE_IDLE_STYLE;

  return (
    <div
      role="region"
      aria-label={WIDGET_ARIA_LABEL['quick-launch-pad']}
      data-testid={resolvedTestId}
      style={ROOT_STYLE}
    >
      <div style={HEADER_ROW_STYLE}>
        <h3 style={KICKER_STYLE}>{WIDGET_KICKER['quick-launch-pad']}</h3>
        <span style={SUB_STYLE}>{WIDGET_SUB}</span>
        <span
          style={{ ...badgeStyle, ...HEAD_END_STYLE }}
          data-testid={`${resolvedTestId}-badge`}
          data-badge-state={badgeState}
          aria-label={BADGE_ARIA_LABEL[badgeState]}
        >
          <span style={LIVE_DOT_STYLE} aria-hidden="true" />
          {BADGE_LABEL[badgeState]}
        </span>
      </div>
      <div
        style={ACTION_GRID_STYLE}
        data-testid={`${resolvedTestId}-grid`}
      >
        {QUICK_LAUNCH_ACTION_IDS.map((id) => (
          <button
            key={id}
            type="button"
            data-action-id={id}
            onClick={handleClick}
            aria-label={QUICK_LAUNCH_ARIA_LABEL[id]}
            style={ACTION_BUTTON_STYLE}
            data-testid={`${resolvedTestId}-action-${id}`}
          >
            {QUICK_LAUNCH_LABEL[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
