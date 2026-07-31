// SPDX-License-Identifier: Apache-2.0
/**
 * AttackOfTheDayWidgetLive — TICKET-D-209 live consumer.
 *
 * Mounts the pure `<AttackOfTheDayWidget>` primitive into the V2.1
 * `/console` Workbench surface. Selects the daily attack deterministically
 * from `PAYLOAD_CATALOG` so every operator sees the same attack on the
 * same UTC day.
 *
 * Selection algorithm (`getDailyAttackIndex`):
 *   - Build a `YYYY-MM-DD` UTC date string from `Date`.
 *   - Sum the char codes of the date string (deterministic, SSR-safe,
 *     timezone-stable when computed against UTC).
 *   - Modulo by `PAYLOAD_CATALOG.length` to get a stable index inside
 *     the catalog tuple.
 *   - The function is exported + accepts an optional `Date` so the unit
 *     tests can freeze a specific day and assert the index.
 *
 * Why char-sum-mod-length: matches V1's daily-rotation discipline (V1
 * used `dateStr → char-sum → mod`) so the V2 restoration preserves the
 * deterministic-by-date contract that any pre-V2 documentation /
 * onboarding material references. Pure function — no Date.now()
 * race, no SSR / hydration drift.
 *
 * `onTry` placeholder: the actual scanner-seed + navigation wiring is
 * deferred to a follow-up ticket. Today the callback is a console
 * placeholder so the CTA renders + clicks without erroring.
 *
 * Per ADR-0096 §3 amendment 2026-05-07 the widget mounts via
 * `WorkbenchWidgetId = 'attack-of-the-day'` (slot 3 of 5 on `/console`).
 */

'use client';

import { useCallback, useMemo, type ReactElement } from 'react';
import { PAYLOAD_CATALOG } from '@/lib/payload-catalog';
import { useNavigation } from '@/lib/NavigationContext';
import {
  AttackOfTheDayWidget,
  type AttackOfTheDayAttack,
} from '@/design/workbench/AttackOfTheDayWidget';

/**
 * Pure deterministic selector. Same date → same index. Exported for
 * the unit tests so they can freeze a specific date without mounting
 * React. Accepts an injected `Date` for testability; defaults to
 * "now" when omitted.
 */
export function getDailyAttackIndex(
  catalogLength: number,
  date: Date = new Date(),
): number {
  if (catalogLength <= 0) return 0;
  // YYYY-MM-DD UTC — stable across timezones + SSR.
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  let charSum = 0;
  for (let i = 0; i < dateStr.length; i++) {
    charSum += dateStr.charCodeAt(i);
  }
  return charSum % catalogLength;
}

/**
 * Pick today's attack from the catalog. Returns `null` if the catalog
 * is empty or the entry is missing required fields — the primitive
 * handles the empty fallback.
 */
export function pickDailyAttack(
  date: Date = new Date(),
): AttackOfTheDayAttack | null {
  if (!Array.isArray(PAYLOAD_CATALOG) || PAYLOAD_CATALOG.length === 0) {
    return null;
  }
  const idx = getDailyAttackIndex(PAYLOAD_CATALOG.length, date);
  const entry = PAYLOAD_CATALOG[idx];
  if (!entry) return null;
  // Defensive: if the entry is missing the example string, skip rather
  // than emit an empty payload preview.
  if (typeof entry.example !== 'string' || entry.example.length === 0) {
    return null;
  }
  return Object.freeze({
    id: entry.story || entry.title || `attack-${idx}`,
    category: entry.title ?? '',
    payload: entry.example,
  });
}

export interface AttackOfTheDayWidgetLiveProps {
  /**
   * Test-id stem forwarded to the underlying primitive. Mirrors the
   * D-207 KillCountWidgetLive `testId` contract so ConsoleClient can
   * thread the slot-derived `workbench-widget-${id}` value through
   * uniformly. Pass-1 fold-in: prior version omitted this prop and
   * relied on the primitive's default — coincidentally correct but
   * fragile to future renames.
   */
  readonly testId?: string;
}

/**
 * Live mount. Wraps the pure primitive with:
 *   - Deterministic `pickDailyAttack` selection.
 *   - `onTry` placeholder — logs to console (dev) so the click is
 *     observable without wiring a real scanner / navigation handler.
 *     Real scanText + setActiveTab wiring is a follow-up ticket.
 */
export function AttackOfTheDayWidgetLive({
  testId,
}: AttackOfTheDayWidgetLiveProps = {}): ReactElement {
  const { setActiveTab } = useNavigation();
  const attack = useMemo(() => pickDailyAttack(), []);

  // "View fixture family" → the Payloads (Buki) surface, i.e. the fixture
  // library the daily attack is drawn from (Workbench v2.html:148).
  const handleViewFamily = useCallback(() => {
    setActiveTab('buki');
  }, [setActiveTab]);

  const handleTry = useCallback((attackId: string) => {
    // Placeholder per D-209 acceptance criteria — actual scanner /
    // navigation wiring deferred to a follow-up. Keep silent in
    // production to avoid console noise. Pass-1 fold-in: dropped
    // the `typeof process !== 'undefined'` guard — Next.js statically
    // replaces `process.env.NODE_ENV` at build time, so the dev-only
    // call tree-shakes away in production builds.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.info('[AttackOfTheDay] try clicked', { attackId });
    }
  }, []);

  return (
    <AttackOfTheDayWidget
      attack={attack}
      onTry={handleTry}
      onViewFamily={handleViewFamily}
      testId={testId}
    />
  );
}
