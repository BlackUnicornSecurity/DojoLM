// SPDX-License-Identifier: Apache-2.0
/**
 * Drawer — A.5 anchor primitive (UI Coherence Phase 1 W2).
 *
 * Canonical off-canvas drawer / sheet consolidating the three V2
 * drawer implementations that previously shipped side-by-side:
 *
 *   1. `<ActivityLogDrawer>`  (src/design/shell)         → shim wraps `<Drawer variant="default">`
 *   2. `<SenseiDrawer>`       (src/components/sensei)    → shim wraps `<Drawer variant="default">`
 *   3. `<AddProviderDrawer>`  (src/app/(shell)/admin/jutsu) → shim wraps `<Drawer variant="form">`
 *
 * Three variants control the width axis (`default` 420 / `form` 600 /
 * `wide` 820) via the `.dojo-drawer--variant-*` modifier class
 * authored in `src/design/styles/patterns/drawer.css`. Mobile (≤768px)
 * collapses every variant to full-width (full-screen modal degradation
 * — bottom-sheet was considered per A.5 spec brief "design call" but
 * full-screen lowers regression risk and matches the SenseiDrawer
 * legacy mobile pattern `w-full sm:w-[400px]`).
 *
 * Native `<dialog>` element (matches the codex/Drawer + ActivityLogDrawer
 * E2.S5 migration precedent). The UA owns:
 *   - modal stacking (top-layer)
 *   - focus trap on real browsers (Tab cycle inside)
 *   - Esc-to-close (UA fires `cancel`; we forward via `handleCancel`)
 *   - focus restored to invoking control on close
 *
 * The `useDrawerFocusTrap` hook attaches to the inner panel <div> and
 * provides the jsdom-side parity layer so unit tests (Drawer.test.tsx
 * + the three shim suites) cover the Tab/Shift+Tab wrap + initial
 * focus + Escape pathway without a real browser.
 *
 * Backdrop click — native `<dialog>` does NOT close on backdrop click
 * by default. We wire it explicitly via a click handler that gates on
 * `event.target === dialogRef.current` (mirrors E2.S2/S3/S4/codex
 * pattern). `closeOnOutsideClick={false}` disables.
 *
 * `onBeforeClose` (form variant primarily): async-aware gate that can
 * return `false`/`Promise<false>` to veto a close (e.g. confirm-on-
 * dirty-form). Suppresses both Escape and backdrop close. The X close
 * button still routes through `onBeforeClose` so the gate is uniform.
 *
 * Polyfill decision: NO Safari < 15.4 polyfill (matches codex/Drawer
 * + ActivityLogDrawer E2.S5 stance). Project stack is Next.js 16 +
 * React 19; native `<dialog>` is Baseline 2022. The jsdom polyfill
 * in `src/test/setup.ts` is reused without change.
 *
 * Backward-compat passthrough props:
 *   - `className` — merged onto the dialog element so shims can pin
 *     existing CSS selectors (e.g. `.dojo-activity-log-drawer`).
 *   - `titleId` — overrides the default `useId()` so shims can pin a
 *     deterministic id for `aria-labelledby` test assertions.
 *   - `dataTestid` / `panelTestid` / `closeTestid` — passthrough for
 *     the dialog / inner panel / close button so shim test suites
 *     keep firing against the same `data-testid` queries.
 *
 * WCAG citations:
 *   - SC 2.1.2 No Keyboard Trap (Level A) — UA + useDrawerFocusTrap
 *   - SC 2.4.3 Focus Order        (Level A) — UA owns restore-focus
 *   - SC 4.1.3 Status Messages    (Level AA) — optional ariaLive on body
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
import { useDrawerFocusTrap } from '@/lib/hooks/useDrawerFocusTrap';

export type DrawerVariant = 'default' | 'form' | 'wide';
export type DrawerPosition = 'right' | 'left';
export type DrawerAriaLive = 'off' | 'polite' | 'assertive';
export type DrawerTitleAs = 'h2' | 'h3' | 'div';

export interface DrawerFooterPrimaryAction {
  readonly label: string;
  readonly onClick: () => void;
  readonly loading?: boolean;
  readonly disabled?: boolean;
}

export interface DrawerFooterSecondaryAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface DrawerFormFooter {
  readonly primaryAction: DrawerFooterPrimaryAction;
  readonly secondaryAction?: DrawerFooterSecondaryAction;
  readonly helperText?: ReactNode;
}

export interface DrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: ReactNode;
  readonly children: ReactNode;

  readonly variant?: DrawerVariant;
  readonly position?: DrawerPosition;

  readonly sub?: ReactNode;
  readonly headerActions?: ReactNode;
  readonly titleAs?: DrawerTitleAs;

  /** Structured form-variant footer with primary/secondary CTAs. */
  readonly footer?: DrawerFormFooter;
  /** Generic footer slot — renders any ReactNode as sticky footer for any variant. */
  readonly footerContent?: ReactNode;

  readonly closeOnEscape?: boolean;
  readonly closeOnOutsideClick?: boolean;
  readonly onBeforeClose?: () => boolean | Promise<boolean>;

  readonly ariaLive?: DrawerAriaLive;
  /** Override aria-labelledby id (defaults to `useId()`). Mutually exclusive with `ariaLabel`. */
  readonly titleId?: string;
  /** Set aria-label on the dialog instead of aria-labelledby. Used by SenseiDrawer shim. */
  readonly ariaLabel?: string;
  /**
   * Set `aria-describedby` on the dialog so AT announces a programmatic
   * relationship between the dialog and a body-side description region.
   * `ActivityLogDrawer` shim threads this for X602 WCAG 1.3.1 parity
   * (the pre-A.5 native `<dialog>` carried aria-describedby pointing at
   * the body's empty-state announcement region).
   */
  readonly ariaDescribedBy?: string;
  readonly closeLabel?: string;
  readonly closeText?: ReactNode;

  readonly className?: string;
  readonly style?: CSSProperties;
  /**
   * Override `.dojo-drawer__body` styling (e.g. to swap the default
   * scroll-on-overflow behaviour for `overflow: hidden` when the inner
   * content manages its own scroll, as SenseiChat does).
   */
  readonly bodyClassName?: string;
  readonly bodyStyle?: CSSProperties;
  /**
   * When true, the inner panel (header + body + footer) is rendered
   * even when `open === false`. Native `<dialog>` UA-hides the inner
   * content while `[open]` is absent, so visual + interactive state
   * is identical to the conditionally-rendered version. Pre-A.5
   * `<SenseiDrawer>` mounted globally and always rendered the inner
   * model picker / capability panel / chat (visibility controlled by
   * `translate-x-full`); the shim opts in to `renderWhenClosed={true}`
   * so SD-008 + E8-S7-001..004 keep finding the inner subtree.
   * Defaults to false so `<ActivityLogDrawer>`'s pre-A.5 contract
   * (X602-005..009 query `queryByTestId('activity-log-drawer-panel')`
   * and expect `null` when closed) is preserved unchanged.
   */
  readonly renderWhenClosed?: boolean;
  readonly dataTestid?: string;
  readonly panelTestid?: string;
  readonly closeTestid?: string;
}

const VARIANT_CLASS: Readonly<Record<DrawerVariant, string>> = Object.freeze({
  default: 'dojo-drawer--variant-default',
  form: 'dojo-drawer--variant-form',
  wide: 'dojo-drawer--variant-wide',
});

const POSITION_CLASS: Readonly<Record<DrawerPosition, string>> = Object.freeze({
  right: 'dojo-drawer--pos-right',
  left: 'dojo-drawer--pos-left',
});

export function Drawer({
  open,
  onClose,
  title,
  children,
  variant = 'default',
  position = 'right',
  sub,
  headerActions,
  titleAs = 'h2',
  footer,
  footerContent,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  onBeforeClose,
  ariaLive = 'off',
  titleId: titleIdOverride,
  ariaLabel,
  ariaDescribedBy,
  closeLabel = 'Close',
  closeText,
  className = '',
  style,
  bodyClassName,
  bodyStyle,
  renderWhenClosed = false,
  dataTestid = 'drawer',
  panelTestid,
  closeTestid,
}: DrawerProps) {
  const autoId = useId();
  const titleId = titleIdOverride ?? autoId;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const { panelRef, handlePanelKey } = useDrawerFocusTrap({
    open,
    onEscape: closeOnEscape ? () => requestClose() : undefined,
  });

  // requestClose — runs the optional onBeforeClose gate before firing
  // the controlled onClose. Stable identity not required; the close
  // path is event-driven (Esc / backdrop / X-button), never read as
  // a dependency.
  const requestClose = useCallback(() => {
    if (!onBeforeClose) {
      onClose();
      return;
    }
    const decision = onBeforeClose();
    if (typeof decision === 'boolean') {
      if (decision) onClose();
      return;
    }
    void decision.then((proceed) => {
      if (proceed) onClose();
    });
  }, [onBeforeClose, onClose]);

  // Drive native open/close. `showModal()` opens the dialog in the
  // top layer with browser-managed focus trap + restore-focus.
  // `close()` removes the open attribute AND fires a `close` event —
  // no separate cleanup needed. `showModal` is guarded by `!dialog.open`
  // because calling it on an already-open dialog throws
  // InvalidStateError.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal?.();
    } else if (!open && dialog.open) {
      dialog.close?.();
    }
  }, [open]);

  // Body scroll lock — paint `overflow: hidden` on <body> while the
  // drawer is open so the page behind the backdrop doesn't scroll.
  // Restored on close + unmount. Native <dialog> in real browsers
  // applies inert to the rest of the document via the top-layer; this
  // belt-and-braces lock keeps jsdom + non-top-layer fallbacks stable.
  useEffect(() => {
    if (!open) return;
    if (typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleCancel = useCallback(
    (e: SyntheticEvent<HTMLDialogElement>) => {
      e.preventDefault();
      if (!open) return;
      if (!closeOnEscape) return;
      requestClose();
    },
    [open, closeOnEscape, requestClose],
  );

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (!closeOnOutsideClick) return;
      if (e.target === dialogRef.current) {
        requestClose();
      }
    },
    [closeOnOutsideClick, requestClose],
  );

  const handleCloseClick = useCallback(() => {
    requestClose();
  }, [requestClose]);

  const TitleTag = titleAs;
  const dialogClassName = [
    'dojo-drawer',
    VARIANT_CLASS[variant],
    POSITION_CLASS[position],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const bodyAriaLiveAttr = ariaLive !== 'off' ? ariaLive : undefined;
  const bodyRoleAttr = ariaLive === 'polite' || ariaLive === 'assertive' ? 'status' : undefined;

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={dialogClassName}
      style={style}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      data-testid={dataTestid}
      data-open={open}
      data-variant={variant}
    >
      {(open || renderWhenClosed) && (
        <div
          ref={panelRef}
          tabIndex={-1}
          className="dojo-drawer__panel"
          onKeyDown={handlePanelKey}
          data-testid={panelTestid}
        >
          <div className="dojo-drawer__header">
            <div className="dojo-drawer__header-titles">
              <TitleTag id={titleId} className="dojo-drawer__title">
                {title}
              </TitleTag>
              {sub ? <div className="dojo-drawer__sub">{sub}</div> : null}
            </div>
            {headerActions ? (
              <div className="dojo-drawer__header-actions">{headerActions}</div>
            ) : null}
            <button
              type="button"
              className="dojo-drawer__close"
              onClick={handleCloseClick}
              aria-label={closeLabel}
              data-testid={closeTestid}
            >
              {closeText ?? '×'}
            </button>
          </div>

          <div
            className={['dojo-drawer__body', bodyClassName].filter(Boolean).join(' ')}
            style={bodyStyle}
            aria-live={bodyAriaLiveAttr}
            role={bodyRoleAttr}
          >
            {children}
          </div>

          {(footer || footerContent) && (
            <div className="dojo-drawer__footer" data-form-footer={footer ? 'true' : undefined}>
              {footer ? (
                <DrawerStructuredFooter footer={footer} />
              ) : (
                footerContent
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

interface DrawerStructuredFooterProps {
  readonly footer: DrawerFormFooter;
}

function DrawerStructuredFooter({ footer }: DrawerStructuredFooterProps) {
  const { primaryAction, secondaryAction, helperText } = footer;
  const primaryBusy = primaryAction.loading === true;
  const primaryDisabled = primaryAction.disabled === true || primaryBusy;
  return (
    <>
      {helperText ? (
        <span className="dojo-drawer__footer-helper">{helperText}</span>
      ) : null}
      <div className="dojo-drawer__footer-actions">
        {secondaryAction ? (
          <button
            type="button"
            className="dojo-drawer__footer-btn dojo-drawer__footer-btn--secondary"
            onClick={secondaryAction.onClick}
          >
            {secondaryAction.label}
          </button>
        ) : null}
        <button
          type="button"
          className="dojo-drawer__footer-btn dojo-drawer__footer-btn--primary"
          onClick={primaryAction.onClick}
          disabled={primaryDisabled}
          aria-busy={primaryBusy || undefined}
        >
          {primaryBusy ? 'Saving…' : primaryAction.label}
        </button>
      </div>
    </>
  );
}
