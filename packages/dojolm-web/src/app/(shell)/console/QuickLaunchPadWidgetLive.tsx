// SPDX-License-Identifier: Apache-2.0
/**
 * QuickLaunchPadWidgetLive — TICKET-D-212 live consumer.
 *
 * Mounts `<QuickLaunchPadWidget>` on `/console` (V2.1 Workbench, slot 5
 * of 5). Wires the 4 navigation actions (`scan-text`, `models`, `guard`,
 * `modules`) through `useNavigation().setActiveTab` via the closed
 * `NAV_ACTION` map (mirrors the X-601 command-palette closed-action
 * pattern). "Customize" was retired from this row in P5 (it lives in the
 * page-head `<WorkbenchCustomizer>`), so the row is nav-only now.
 *
 * LIVE badge state derives from `useActivityState`: when the most
 * recent activity event timestamp is within the last `LIVE_WINDOW_MS`
 * window, the badge is `'live'`; otherwise `'idle'`. SSR-safe — the
 * derivation is a pure reduce over the events tuple.
 */

'use client';

import { useCallback, useMemo, type ReactElement } from 'react';
import { useNavigation } from '@/lib/NavigationContext';
import { useActivityState } from '@/lib/contexts/ActivityContext';
import {
  QuickLaunchPadWidget,
  type QuickLaunchActionId,
  type BadgeState,
} from '@/design/workbench/QuickLaunchPadWidget';
import type { NavId } from '@/lib/constants';

/**
 * Closed nav map — every action id resolves to a `NavId`. Frozen so
 * consumers cannot mutate the resolution table at runtime.
 */
export const NAV_ACTION: Readonly<Record<QuickLaunchActionId, NavId>> =
  Object.freeze({
    'scan-text': 'scanner',
    models: 'jutsu',
    guard: 'guard',
    // `modules` lands on the dashboard's D-205 Haiku License Modules list.
    modules: 'dashboard',
  });

/**
 * LIVE-badge presence window (ms). An activity event whose ISO
 * timestamp falls within this many ms of "now" flips the badge to
 * `'live'`. 5 minutes mirrors the Sengoku active-session heuristic.
 */
export const LIVE_WINDOW_MS = 5 * 60 * 1000;

/**
 * Pure derivation — exported for unit tests so they can pin a `now`
 * timestamp without mounting React. Returns `'live'` iff at least one
 * event timestamp is within `windowMs` of `now`.
 */
export function deriveBadgeState(
  events: ReadonlyArray<{ readonly timestamp: string }>,
  now: number,
  windowMs: number = LIVE_WINDOW_MS,
): BadgeState {
  for (const e of events) {
    const t = Date.parse(e.timestamp);
    if (Number.isFinite(t) && now - t <= windowMs && now - t >= 0) {
      return 'live';
    }
  }
  return 'idle';
}

export interface QuickLaunchPadWidgetLiveProps {
  readonly testId?: string;
}

export function QuickLaunchPadWidgetLive({
  testId,
}: QuickLaunchPadWidgetLiveProps = {}): ReactElement {
  const { setActiveTab } = useNavigation();
  const { events } = useActivityState();

  const badgeState = useMemo<BadgeState>(
    () => deriveBadgeState(events, Date.now()),
    [events],
  );

  const handleAction = useCallback(
    (id: QuickLaunchActionId) => {
      setActiveTab(NAV_ACTION[id]);
    },
    [setActiveTab],
  );

  return (
    <QuickLaunchPadWidget
      badgeState={badgeState}
      onAction={handleAction}
      testId={testId}
    />
  );
}
