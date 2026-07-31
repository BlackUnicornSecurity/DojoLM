// SPDX-License-Identifier: Apache-2.0
/**
 * RailDrawerController — E7.S1 Rail collapse below 768px.
 *
 * Plan ref: `audit/REMEDIATION-PLAN.md` lines 772-779.
 *
 * Live consumer that owns the open-state for the narrow-viewport
 * Rail drawer and exposes a render-prop API so the TopBar can render
 * the hamburger trigger inside the controller's scope (mirrors the
 * X-601 / X-602 controllers exactly):
 *
 *   <RailDrawerController …rail-props>
 *     {({ open, triggerRef, isOpen }) => (
 *       <button ref={triggerRef} onClick={open} className="topbar-rail-trigger" …/>
 *     )}
 *   </RailDrawerController>
 *
 * Focus discipline (WCAG 2.4.3): when the drawer closes the
 * controller calls `triggerRef.current?.focus()`. Native <dialog>
 * already restores focus on real browsers; this is a redundant
 * safety net for jsdom + Playwright Tab-cycle assertions.
 *
 * Opens-via-event channel: `CustomEvent('topbar-rail-open')` on
 * `window` opens the drawer programmatically. Mirrors the X-602
 * `topbar-activity-open` event channel so future hosts can ship a
 * second entry-point (e.g. a dashboard prompt) without prop drilling.
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
import { RailDrawer } from './RailDrawer';
import type { RailProps, RailSection } from './Rail';

export const RAIL_DRAWER_OPEN_EVENT = 'topbar-rail-open';

export interface RailDrawerControllerProps {
  /** Render-prop trigger. Mirrors X-601 / X-602 pattern verbatim. */
  readonly children: (api: {
    readonly open: () => void;
    readonly triggerRef: RefObject<HTMLButtonElement | null>;
    readonly isOpen: boolean;
  }) => ReactNode;
  /** Forwarded to the inner <RailDrawer>. */
  readonly active?: RailProps['active'];
  readonly sections?: RailSection[];
  readonly onItemClick?: (id: string) => void;
  readonly adminBadgeOverride?: string | null;
}

export function RailDrawerController({
  children,
  active,
  sections,
  onItemClick,
  adminBadgeOverride,
}: RailDrawerControllerProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = useRef(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Window-scoped open event so future consumers can dispatch without
  // prop drilling. Same pattern as ACTIVITY_DRAWER_OPEN_EVENT.
  useEffect(() => {
    function onOpenEvent(): void {
      setIsOpen(true);
    }
    window.addEventListener(RAIL_DRAWER_OPEN_EVENT, onOpenEvent);
    return () =>
      window.removeEventListener(RAIL_DRAWER_OPEN_EVENT, onOpenEvent);
  }, []);

  // Restore focus to the hamburger trigger when the drawer closes.
  // Native <dialog> handles this on real browsers; the explicit
  // `triggerRef.current?.focus()` is a parity layer for jsdom + a
  // safety net for downstream tests pinning focus restoration.
  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  return (
    <>
      {children({ open, triggerRef, isOpen })}
      <RailDrawer
        open={isOpen}
        onClose={close}
        active={active}
        sections={sections}
        onItemClick={onItemClick}
        adminBadgeOverride={adminBadgeOverride}
      />
    </>
  );
}
