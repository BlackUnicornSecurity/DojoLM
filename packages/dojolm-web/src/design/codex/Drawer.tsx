// SPDX-License-Identifier: Apache-2.0
/**
 * Drawer — codex right-slide detail panel.
 *
 * Pure presentational primitive used by the Codex archetype to host
 * detail forms (jutsu add-provider, mitsuke triage, etc.). The page
 * still owns `open` state so the drawer remains deterministic for
 * tests / SSR (the tree renders without errors even when open=false).
 *
 * E2.S5 (REMEDIATION-PLAN lines 372-376): migrated from a hand-rolled
 * `<div role="dialog">`-panel + `<div>`-backdrop shell to the native
 * HTML `<dialog>` element. The browser now owns:
 *   - the focus trap (Tab cycle stays inside; replaces `handleKeyDown`)
 *   - Esc-to-close (UA fires `cancel` event we forward to onClose)
 *   - focus restored to the previously-focused control on close
 *     (replaces the bespoke `restoreFocusRef` machinery — codex/Drawer
 *     was the only one of the 6 modals with primitive-level restore)
 *   - the modal stacking context (`top-layer` semantics)
 *
 * Off-canvas pattern: native `<dialog>` UA defaults center the panel.
 * The `.dojo-codex-drawer` rule in `src/design/styles/patterns/codex.css`
 * resets the UA defaults and restores the existing right-slide CSS
 * (transform from translateX(100%) → translateX(0) on the [open]
 * attribute). The legacy `.codex-drawer-backdrop` div is gone — the
 * `<dialog>::backdrop` pseudo-element handles the dimmed scrim with
 * the same opacity and transition curve.
 *
 * Backdrop: native `<dialog>` does NOT close on backdrop click by
 * default — we wire that explicitly via a click handler that gates on
 * `event.target === dialogRef.current` (the `<dialog>` element catches
 * the bubbled click only when the operator clicks the backdrop pseudo
 * area outside the inner content). Mirrors E2.S2/E2.S3/E2.S4 pattern.
 *
 * Polyfill decision (E2.S5): NO Safari < 15.4 polyfill (mirrors prior
 * stories). Project stack is Next.js 16 + React 19; native `<dialog>`
 * is Baseline 2022. The jsdom polyfill in `src/test/setup.ts`
 * (installed by E2.S2) is reused without modification.
 *
 * Pattern stylesheet: `dialog.dojo-codex-drawer::backdrop` uses
 * `rgba(var(--black-rgb), 0.55)` (matches the legacy backdrop
 * opacity) per E1.S2 lint rule + GUARDRAILS G10 (no hardcoded colors
 * in design CSS). Reduced-motion gate already covers the dialog
 * transition via the existing `@media (prefers-reduced-motion: reduce)`
 * block in codex.css.
 *
 * Retires (E2.S5, plan v4):
 *   - F-4-017 (P2) — codex Drawer not using native <dialog>
 *
 * WCAG citations (E2.S5):
 *   - SC 2.1.2 No Keyboard Trap (Level A) — native <dialog> manages
 *     a containment-style trap; Esc always escapes.
 *   - SC 2.4.3 Focus Order (Level A) — focus restored to invoking
 *     control on close (UA-owned).
 */

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly sub?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly closeLabel?: string;
}

// Drawer — right-slide detail panel used by the Codex archetype.
//
// a11y affordances (post-E2.S5):
//   - native <dialog> with aria-modal="true"
//   - aria-labelledby points at the title heading
//   - Esc closes (UA-owned)
//   - Click on ::backdrop closes (gated on e.target === dialogRef)
//   - Focus moves into the dialog on open (UA-owned)
//   - Focus returns to the invoking control on close (UA-owned)
//   - Tab cycles within the dialog (UA-owned)
export function Drawer({
  open,
  onClose,
  title,
  sub,
  children,
  className = '',
  style,
  closeLabel = 'Close detail',
}: DrawerProps) {
  const headingId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Drive native open/close. `showModal()` opens the dialog in the top
  // layer with browser-managed focus trap + restore-focus. `close()`
  // both removes the open attribute AND fires a `close` event — no
  // separate cleanup needed. We guard `showModal` with `!open` because
  // calling it on an already-open dialog throws InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal can be missing when the test runner is jsdom and
      // the polyfill hasn't been installed; the test setup wires a
      // safe fallback. In production this is a synchronous call.
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open]);

  // Native <dialog> handles Esc itself (firing the `cancel` event +
  // setting `open=false`). We listen to `cancel` here so the parent
  // controller can sync its `open` state. Without this the next open
  // call sees `dialog.open === false` but the React state still says
  // `open === true` and showModal won't re-fire.
  const handleCancel = useCallback(
    (e: SyntheticEvent<HTMLDialogElement>) => {
      // preventDefault so the UA doesn't auto-close before our state
      // machine catches up; we then explicitly call onClose which sets
      // the controller's open=false → triggers the close-effect →
      // calls dialog.close().
      e.preventDefault();
      // Idempotency guard: rapid Esc presses can fire `cancel` while
      // the close transition is in flight (open already false but UA
      // still reports dialog.open=true). Skip the second onClose to
      // prevent double-call on parent state setters.
      if (!open) return;
      onClose();
    },
    [open, onClose],
  );

  // Backdrop click — native <dialog> does NOT close on backdrop click
  // by default. The dialog element's click event fires when the user
  // clicks anywhere inside the dialog's box (including the ::backdrop
  // pseudo, which forms part of the dialog's hit area). We gate on
  // `e.target === dialogRef.current` so clicks on inner content
  // (header buttons, body fields) don't dismiss the drawer.
  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={headingId}
      className={`codex-drawer dojo-codex-drawer ${className}`.trim()}
      style={style}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      data-testid="codex-drawer"
      data-open={open}
    >
      <div className="codex-drawer-head">
        <div>
          <h3 id={headingId}>{title}</h3>
          {sub && <div className="sub">{sub}</div>}
        </div>
        <button
          type="button"
          className="codex-drawer-close"
          onClick={onClose}
          aria-label={closeLabel}
          data-testid="codex-drawer-close"
        >
          ×
        </button>
      </div>
      <div className="codex-drawer-body">{children}</div>
    </dialog>
  );
}
