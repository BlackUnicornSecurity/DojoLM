// SPDX-License-Identifier: Apache-2.0
/**
 * Activity-log drawer CTA catalog — TICKET-X-602 / DP-006 closeout.
 *
 * Closed-enum (R-T1 §10.16) tuple of CTA ids with closed-record maps for
 * label, aria-label, and action. The drawer never reads inline literal
 * strings at render sites — every label / dispatch routes through these
 * frozen maps. Operator extension is intentionally a code change, not a
 * runtime mutation.
 *
 * Scope: V2.1 first ship — two CTAs ("open-scanner" navigates to the
 * Haiku Scanner tab, "clear-events" dispatches a `activity-clear`
 * window event the operator can wire to a real reducer later). The
 * drawer-row event-type label map (`EVENT_TYPE_LABEL`) lives here so
 * the row primitive in `ActivityLogDrawer.tsx` can render every event
 * via a closed map without inline `event.type === 'scan_complete'`
 * branches at the JSX site.
 *
 * Zero new deps. Pure data + frozen objects.
 */

import type { EventType } from '../contexts/ActivityContext';

export const ACTIVITY_DRAWER_CTA_IDS = [
  'open-scanner',
  'clear-events',
] as const satisfies readonly string[];

export type ActivityDrawerCtaId = (typeof ACTIVITY_DRAWER_CTA_IDS)[number];

export type ActivityDrawerAction =
  | { readonly type: 'navigate'; readonly navId: 'scanner' }
  | { readonly type: 'event'; readonly event: 'activity-clear' };

export const CTA_LABEL: Readonly<Record<ActivityDrawerCtaId, string>> =
  Object.freeze({
    'open-scanner': 'Open Haiku Scanner',
    'clear-events': 'Clear all events',
  });

export const CTA_ARIA_LABEL: Readonly<Record<ActivityDrawerCtaId, string>> =
  Object.freeze({
    'open-scanner': 'Open Haiku Scanner to start logging activity',
    'clear-events': 'Clear all activity events',
  });

export const CTA_ACTION: Readonly<Record<ActivityDrawerCtaId, ActivityDrawerAction>> =
  Object.freeze({
    'open-scanner': Object.freeze({ type: 'navigate', navId: 'scanner' }),
    'clear-events': Object.freeze({ type: 'event', event: 'activity-clear' }),
  });

export const EMPTY_HINT: Readonly<Record<'title' | 'body', string>> =
  Object.freeze({
    title: 'No sessions yet',
    body: 'Run your first scan to start a per-session activity timeline.',
  });

export const EVENT_TYPE_LABEL: Readonly<Record<EventType, string>> =
  Object.freeze({
    scan_complete: 'Scan completed',
    threat_detected: 'Threat detected',
    test_passed: 'Test passed',
    test_failed: 'Test failed',
    model_added: 'Model added',
  });
