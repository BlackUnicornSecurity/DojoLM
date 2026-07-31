// SPDX-License-Identifier: Apache-2.0
/**
 * RailDrawer — E7.S1 Rail collapse below 768px.
 *
 * Plan ref: `audit/REMEDIATION-PLAN.md` lines 772-779.
 * Retires:
 *   - F-5-002 (P1) — "Hard 220px sidebar Rail with no collapse below
 *     any breakpoint" (WCAG 2.1 SC 1.4.10 Reflow).
 *   - F-9-003 (P0, partial) — `/admin/eval` matrix unusable at 320px.
 *     This story removes the 220px rail steal at narrow viewports,
 *     reclaiming horizontal space for the matrix. The matrix grid
 *     itself is owned by E7.S10 (responsive sweep cluster).
 *
 * Pattern: native HTML `<dialog>` element (Baseline 2022). Mirrors
 * the E2.S5 ActivityLogDrawer pattern verbatim — UA owns:
 *   - top-layer stacking
 *   - focus trap (Tab cycle stays inside on real browsers)
 *   - Esc-to-close (UA fires `cancel`; we hook it to sync state)
 *   - focus restoration to the invoking control on close
 *
 * Off-canvas anchoring: `inset: 0 auto 0 0` (LEFT edge) — the static
 * rail at >768px sits on the left, so the drawer slides in from the
 * left to preserve the operator's mental model of where navigation
 * lives. `max-width: min(280px, 88vw)` keeps the drawer readable at
 * 320px (≈281px clamped to 88vw) without bleeding into the page
 * content peek behind the backdrop.
 *
 * Composition: the drawer hosts the SAME `<Rail>` primitive that
 * renders in the static aside. No content duplication; both paths
 * pass identical `active` / `sections` / `onItemClick` / `adminBadgeOverride`
 * props through. When the operator clicks a Rail item the drawer's
 * onClose fires synchronously after onItemClick so the navigation
 * transition feels deliberate.
 *
 * A11y: aria-modal="true" + aria-labelledby + aria-describedby on the
 * dialog. The hamburger trigger in TopBar.tsx receives focus back when
 * the drawer closes (UA-managed in real browsers; we keep an explicit
 * onClose hook in case the controller wants to invoke focus-restore on
 * its own).
 *
 * WCAG citations:
 *   - SC 1.4.10 Reflow (Level AA) — content reflows at 320px without
 *     two-dimensional scrolling because the 220px rail-steal is gone.
 *   - SC 2.1.2 No Keyboard Trap (Level A) — UA-owned focus trap.
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to the trigger.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type MouseEvent,
  type ReactElement,
  type SyntheticEvent,
} from 'react';
import { Rail, type RailProps, type RailSection } from './Rail';

const TITLE_ID = 'rail-drawer-title';
const DESC_ID = 'rail-drawer-desc';

export interface RailDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /**
   * Active rail-item id forwarded to the inner <Rail>. Same shape as
   * RailProps['active']. Defaults to 'dashboard' when omitted.
   */
  readonly active?: RailProps['active'];
  /**
   * Optional section override. Defaults to the admin RAIL constant
   * (mirrors the static aside's default). The /members shell passes
   * MEMBER_RAIL through.
   */
  readonly sections?: RailSection[];
  /**
   * Click handler bubbled into <Rail>. The drawer also calls onClose
   * after the host's onItemClick fires so the drawer dismisses
   * automatically on navigation.
   */
  readonly onItemClick?: (id: string) => void;
  /**
   * Admin badge override forwarded to <Rail>. Matches the static
   * aside's prop-drill so the drawer-rendered Rail shows the same
   * pending-invite count.
   */
  readonly adminBadgeOverride?: string | null;
}

export function RailDrawer({
  open,
  onClose,
  active,
  sections,
  onItemClick,
  adminBadgeOverride,
}: RailDrawerProps): ReactElement {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Drive native open/close. `showModal()` opens the dialog in the top
  // layer with browser-managed focus trap + restore-focus. `close()`
  // both removes the open attribute AND fires a `close` event — no
  // separate cleanup needed. We guard `showModal` with `!dialog.open`
  // because calling it on an already-open dialog throws InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open]);

  // Native <dialog> handles Esc itself (firing `cancel`). We listen so
  // the parent controller can sync its `open` state. Without this the
  // next open call sees `dialog.open === false` but React state still
  // says `open === true` and showModal won't re-fire.
  const handleCancel = useCallback(
    (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      // Idempotency guard: rapid Esc presses can fire `cancel` while
      // the close transition is in flight (open already false but UA
      // still reports dialog.open=true). Skip the second onClose.
      if (!open) return;
      onClose();
    },
    [open, onClose],
  );

  // Backdrop click: native <dialog> does NOT close on backdrop click
  // by default. Wire it explicitly by gating on event.target ===
  // dialog. Mirrors the ActivityLogDrawer pattern verbatim.
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  // Wrap onItemClick so the drawer auto-dismisses on navigation. The
  // host's onItemClick fires first (so the route transition begins)
  // then we close the drawer. WCAG 2.4.3: the dialog's UA-managed
  // focus restore returns focus to the hamburger trigger.
  const handleItemClick = useCallback(
    (id: string) => {
      onItemClick?.(id);
      onClose();
    },
    [onItemClick, onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={TITLE_ID}
      aria-describedby={DESC_ID}
      className="dojo-rail-drawer"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      data-testid="rail-drawer"
      data-open={open}
    >
      {open && (
        <div
          tabIndex={-1}
          className="dojo-rail-drawer-panel"
          data-testid="rail-drawer-panel"
        >
          {/* Visually-hidden title + description so screen-reader users
              hear context when the dialog opens. The visible Rail items
              follow immediately so keyboard focus lands on the first
              nav item (UA initial-focus on the first focusable child of
              the dialog). */}
          <h2
            id={TITLE_ID}
            className="dojo-rail-drawer-title"
          >
            Navigation
          </h2>
          <p
            id={DESC_ID}
            className="dojo-rail-drawer-desc"
          >
            Site navigation. Press Escape to close.
          </p>
          <Rail
            active={active}
            sections={sections}
            onItemClick={handleItemClick}
            adminBadgeOverride={adminBadgeOverride}
          />
        </div>
      )}
    </dialog>
  );
}
