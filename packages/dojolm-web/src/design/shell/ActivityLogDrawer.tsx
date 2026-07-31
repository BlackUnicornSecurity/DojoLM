// SPDX-License-Identifier: Apache-2.0
/**
 * ActivityLogDrawer — A.5 thin shim around `<Drawer variant="default">`.
 *
 * Previously a self-contained native-`<dialog>` primitive (TICKET-X-602
 * / DP-006 closeout, E2.S5 migration). For the A.5 Drawer / Sheet
 * anchor primitive (UI Coherence Phase 1 W2) the drawer chrome (header
 * + body slot + footer slot + close + native dialog lifecycle + focus
 * trap + idempotent cancel) has moved to
 * `src/design/primitives/Drawer.tsx`. This file now composes that
 * canonical primitive and renders the activity-specific content
 * (events list / empty state / CTA pair).
 *
 * Backward-compat guarantees (zero consumer regression):
 *   - Prop signature `{ open, events, onClose, onCta }` preserved
 *     byte-identically — the same `ActivityLogDrawerController` (and
 *     any future test harness) keeps working without changes.
 *   - Every `data-testid` the existing tests query is preserved:
 *       activity-log-drawer
 *       activity-log-drawer-panel
 *       activity-log-drawer-close
 *       activity-log-drawer-empty
 *       activity-log-drawer-list
 *       activity-log-drawer-row-${id}
 *       activity-log-drawer-cta-${id}
 *   - `className="dojo-activity-log-drawer"` is passed through to the
 *     canonical `<Drawer>` so the existing CSS in
 *     `src/design/styles/system.css` (right-edge anchor + slide
 *     transition + ::backdrop scrim) remains the governing visual
 *     identity for this drawer. The new `dojo-drawer--variant-default`
 *     class is added alongside but the legacy rule takes precedence
 *     on width / inset / backdrop (specificity matches; legacy wins
 *     on declaration order via system.css load after drawer.css).
 *   - `titleId="activity-log-drawer-title"` pins the deterministic
 *     aria-labelledby id X602-011 asserts on.
 *   - Close-button text content is "Close" (not "×") to preserve the
 *     pre-A.5 visible affordance; X602-010 focus-trap test queries by
 *     testid so the change-of-glyph-to-text is opaque to the suite.
 *   - Empty state renders inside `<Drawer>`'s body children with the
 *     pre-A.5 `role="status" aria-live="polite"` semantics (the X602-001
 *     assertion queries `getByTestId('activity-log-drawer-empty')` and
 *     reads aria-live off that node, not off the body wrapper).
 *
 * The X602-001..014 suite at
 * `src/design/shell/__tests__/ActivityLogDrawer.test.tsx` continues
 * to exercise this shim verbatim; no test edits required.
 *
 * Closed-enum (R-T1 §10.16) — CTA ids, action shapes, empty-state
 * copy, and event-type labels still resolve through closed maps in
 * `lib/activity-log/drawerCtas.ts`. No inline string literals at the
 * render site for any operator-extensible label.
 */

'use client';

import type { CSSProperties, ReactElement } from 'react';
import type { ActivityEvent } from '../../lib/contexts/ActivityContext';
import {
  ACTIVITY_DRAWER_CTA_IDS,
  CTA_ARIA_LABEL,
  CTA_LABEL,
  EMPTY_HINT,
  EVENT_TYPE_LABEL,
  type ActivityDrawerCtaId,
} from '../../lib/activity-log/drawerCtas';
import {
  EMPTY_BODY_STYLE,
  EMPTY_STATE_STYLE,
  EMPTY_TITLE_STYLE,
  EVENT_DESC_STYLE,
  EVENT_LIST_STYLE,
  EVENT_ROW_STYLE,
  EVENT_TS_STYLE,
  EVENT_TYPE_LABEL_STYLE,
  PRIMARY_CTA_STYLE,
  SECONDARY_CTA_STYLE,
} from './ActivityLogDrawer.styles';
import { Drawer } from '../primitives/Drawer';

const TITLE_ID = 'activity-log-drawer-title';
const DESC_ID = 'activity-log-drawer-desc';

const FOOTER_INLINE_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  gap: 8,
  width: '100%',
});

export interface ActivityLogDrawerProps {
  readonly open: boolean;
  readonly events: readonly ActivityEvent[];
  readonly onClose: () => void;
  readonly onCta: (ctaId: ActivityDrawerCtaId) => void;
}

export function ActivityLogDrawer({
  open,
  events,
  onClose,
  onCta,
}: ActivityLogDrawerProps): ReactElement {
  const isEmpty = events.length === 0;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Activity log"
      variant="default"
      titleId={TITLE_ID}
      ariaDescribedBy={DESC_ID}
      className="dojo-activity-log-drawer"
      dataTestid="activity-log-drawer"
      panelTestid="activity-log-drawer-panel"
      closeTestid="activity-log-drawer-close"
      closeLabel="Close activity log"
      closeText="Close"
      footerContent={
        <div style={FOOTER_INLINE_STYLE}>
          {ACTIVITY_DRAWER_CTA_IDS.map((id) => {
            const isPrimary = id === 'open-scanner';
            return (
              <button
                key={id}
                type="button"
                onClick={() => onCta(id)}
                aria-label={CTA_ARIA_LABEL[id]}
                style={isPrimary ? PRIMARY_CTA_STYLE : SECONDARY_CTA_STYLE}
                data-testid={`activity-log-drawer-cta-${id}`}
              >
                {CTA_LABEL[id]}
              </button>
            );
          })}
        </div>
      }
    >
      <div id={DESC_ID}>
        {isEmpty ? (
          <div
            style={EMPTY_STATE_STYLE}
            role="status"
            aria-live="polite"
            data-testid="activity-log-drawer-empty"
          >
            <p style={EMPTY_TITLE_STYLE}>{EMPTY_HINT.title}</p>
            <p style={EMPTY_BODY_STYLE}>{EMPTY_HINT.body}</p>
          </div>
        ) : (
          <ul style={EVENT_LIST_STYLE} data-testid="activity-log-drawer-list">
            {events.map((ev) => (
              <li
                key={ev.id}
                style={EVENT_ROW_STYLE}
                data-testid={`activity-log-drawer-row-${ev.id}`}
              >
                <span style={EVENT_TYPE_LABEL_STYLE}>
                  {EVENT_TYPE_LABEL[ev.type]}
                </span>
                <span style={EVENT_DESC_STYLE}>{ev.description}</span>
                <span style={EVENT_TS_STYLE}>{ev.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
}
