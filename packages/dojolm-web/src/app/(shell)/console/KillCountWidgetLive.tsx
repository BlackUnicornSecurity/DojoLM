// SPDX-License-Identifier: Apache-2.0
/**
 * KillCountWidgetLive — TICKET-D-207 (Phase B Workbench restoration).
 *
 * Live consumer for `<KillCountWidget>`. Reads from the V2
 * ActivityContext (`useActivityState`), filters events for
 * `'threat_detected'` (the V1 KillCount "Threats" counter source),
 * counts them, and forwards to the presentational primitive.
 *
 * Activity event mapping:
 *   - V2 ActivityContext `EventType` includes the 4 V1 event types
 *     plus `model_added` (5 total). For total-threats-blocked the
 *     canonical V1 mapping is `event.type === 'threat_detected'`.
 *     Other event types (`scan_complete` / `test_passed` /
 *     `test_failed` / `model_added`) are intentionally ignored.
 *
 * First-paint placeholder (E9.S9 / F-7-023 retire):
 *   - The remediation finding (F-7-023 P2) flagged that Console
 *     widgets stamp `0` onto the page before their data source has
 *     hydrated, making "no data yet" look identical to "zero
 *     threats". We track post-mount hydration via a useState gate
 *     flipped in a useEffect and pass `count={null}` to the
 *     primitive until that flips — the primitive renders `—`
 *     (KILL_COUNT_PLACEHOLDER) for the null case.
 *
 *   - SSR-safe: useEffect never runs during SSR, so the server-side
 *     paint always renders `—`. After client mount the effect fires
 *     synchronously (RTL / browser) and the real count takes over.
 *
 * Closed-enum discipline:
 *   - The single literal `'threat_detected'` is sourced from the
 *     `EventType` union (compile-time check via `satisfies`).
 *
 * Zero runtime deps beyond ActivityContext + the primitive.
 */

'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useActivityState, type EventType } from '@/lib/contexts/ActivityContext';
import { KillCountWidget } from '@/design/workbench/KillCountWidget';

/**
 * Compile-time pinned event-type literal. Using `satisfies` here
 * means a future rename of the `'threat_detected'` member of
 * `EventType` would break this module immediately at the type layer
 * rather than silently zero-out the counter.
 */
const THREAT_EVENT_TYPE = 'threat_detected' satisfies EventType;

export interface KillCountWidgetLiveProps {
  /** Optional testid override. Defaults to `'kill-count-widget'`. */
  readonly testId?: string;
  /** Optional subline (e.g. "this session"). */
  readonly subLabel?: string;
}

export function KillCountWidgetLive({
  testId,
  subLabel,
}: KillCountWidgetLiveProps = {}): ReactElement {
  const { events } = useActivityState();
  // E9.S9 (F-7-023 retire): one-shot hydration gate. Initial render
  // before the mount-effect fires returns `null` so the primitive
  // paints `—`; after mount the gate flips to true and the real
  // (memoized) count is forwarded. The flag never flips back to
  // false — once we've reported a real count there's no benefit to
  // re-introducing the placeholder.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const liveCount = useMemo(() => {
    let n = 0;
    for (const e of events) {
      if (e.type === THREAT_EVENT_TYPE) n++;
    }
    return n;
  }, [events]);

  const count: number | null = hasMounted ? liveCount : null;

  // Centered ceremony caption (Workbench v2.html:105) — a quiet session
  // reads "Quiet session — guards armed", not a bare label. Pre-hydration
  // (count === null) shows no caption so the "—" placeholder stands alone.
  // Caller override still wins.
  const caption: string | undefined =
    subLabel ??
    (count === null
      ? undefined
      : count === 0
        ? 'Quiet session — guards armed'
        : 'blocked this session');

  return (
    <KillCountWidget
      count={count}
      subtitle="This session"
      subLabel={caption}
      live
      testId={testId}
    />
  );
}
