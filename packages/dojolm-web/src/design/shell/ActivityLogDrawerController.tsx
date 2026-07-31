// SPDX-License-Identifier: Apache-2.0
/**
 * ActivityLogDrawerController — TICKET-X-602 / DP-006 closeout.
 *
 * Live consumer that wires `<ActivityLogDrawer>` into:
 *   - global `Cmd+Shift+A` / `Ctrl+Shift+A` keyboard toggle (window-scoped)
 *   - `CustomEvent('topbar-activity-open')` window-scoped open fallback
 *     so the TopBar trigger can dispatch without prop drilling
 *   - `useActivityState()` for the events feed (per-user-scoped sessionStorage,
 *     same context KillCount + QuickLaunchPad already consume)
 *   - `useNavigation().setActiveTab('scanner')` for the `open-scanner` CTA
 *   - `window.dispatchEvent(new CustomEvent('activity-clear'))` for the
 *     `clear-events` CTA — the real reducer wiring is operator-deferred;
 *     this controller renders the button and dispatches the event.
 *
 * Open-state lives here, not on the primitive (the primitive is
 * controlled). Escape close + backdrop close are handled inside the
 * primitive via its `onClose` prop.
 *
 * Focus discipline: when the drawer closes the controller restores focus
 * to the ref the host registers via `triggerRef`, mirroring the X-601
 * `wasOpenRef` pattern. No tabIndex={-1} hack — `ref.focus()` only.
 *
 * Zero new deps. ≤200 lines.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { useNavigation } from '../../lib/NavigationContext';
import { useActivityState } from '../../lib/contexts/ActivityContext';
import { ActivityLogDrawer } from './ActivityLogDrawer';
import {
  CTA_ACTION,
  type ActivityDrawerCtaId,
} from '../../lib/activity-log/drawerCtas';

export const ACTIVITY_DRAWER_OPEN_EVENT = 'topbar-activity-open';

export interface ActivityLogDrawerControllerProps {
  readonly children: (api: {
    readonly open: () => void;
    readonly triggerRef: RefObject<HTMLButtonElement | null>;
    readonly isOpen: boolean;
  }) => ReactNode;
}

// Keyboard shortcut: Cmd+Shift+A (macOS) / Ctrl+Shift+A (Windows/Linux).
// Collision check (2026-05-08): macOS Cmd+Shift+A has no default browser
// binding in Chrome / Safari / Firefox. On Windows/Linux, Ctrl+Shift+A
// is bound to Chrome's tab-search overlay — accept the override here
// since the page-level handler `preventDefault`s before bubbling. X-601's
// Cmd+K does NOT collide (no shift modifier).
function isActivityHotkey(e: KeyboardEvent): boolean {
  if (e.key !== 'a' && e.key !== 'A') return false;
  if (!(e.metaKey || e.ctrlKey)) return false;
  return e.shiftKey;
}

export function ActivityLogDrawerController({
  children,
}: ActivityLogDrawerControllerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const { setActiveTab } = useNavigation();
  const { events } = useActivityState();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (isActivityHotkey(e)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    function onOpenEvent(): void {
      setIsOpen(true);
    }
    window.addEventListener(ACTIVITY_DRAWER_OPEN_EVENT, onOpenEvent);
    return () =>
      window.removeEventListener(ACTIVITY_DRAWER_OPEN_EVENT, onOpenEvent);
  }, []);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const handleCta = useCallback(
    (ctaId: ActivityDrawerCtaId) => {
      const action = CTA_ACTION[ctaId];
      if (action.type === 'navigate') {
        setActiveTab(action.navId);
        setIsOpen(false);
        return;
      }
      if (action.type === 'event') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent(action.event));
        }
        // Pass-1 fold-in MED #2 — close the drawer after firing the
        // event-type CTA so the open-state stays in sync with operator
        // intent. The reducer wiring for `activity-clear` is operator-
        // deferred, but the drawer should not linger open after the
        // user presses "Clear events". Mirrors the navigate-branch
        // close above.
        setIsOpen(false);
      }
    },
    [setActiveTab],
  );

  return (
    <>
      {children({ open, triggerRef, isOpen })}
      <ActivityLogDrawer
        open={isOpen}
        events={events}
        onClose={close}
        onCta={handleCta}
      />
    </>
  );
}
