// SPDX-License-Identifier: Apache-2.0
/**
 * useDrawerFocusTrap — generalized focus-trap discipline for off-canvas drawers.
 *
 * Generalization of `src/design/shell/useActivityDrawerFocusTrap` (TICKET-X-602)
 * carved out as the focus-trap layer for the A.5 Drawer / Sheet anchor
 * primitive (UI Coherence Phase 1 W2). The legacy hook is now a thin
 * re-export — see `useActivityDrawerFocusTrap.ts` for the deprecation
 * pointer — so every existing consumer keeps working unchanged.
 *
 * Owns three pieces of focus-discipline logic that any drawer panel needs:
 *
 *   1. On open, focus the first focusable element inside the panel
 *      (or the panel itself if there are no focusables) so keyboard
 *      tab order starts inside the dialog.
 *   2. `handleTrapKey` — wrap Tab / Shift+Tab so focus cannot escape
 *      the panel while the drawer is open.
 *   3. `handlePanelKey` — combined keydown handler that routes Escape
 *      to `onEscape` (when provided) and forwards everything else to
 *      `handleTrapKey`.
 *
 * The hook owns the `panelRef` so the primitive only attaches the ref
 * to its panel `<div>` and binds the returned `handlePanelKey` to the
 * panel's `onKeyDown`.
 *
 * Closed-enum (R-T1 §10.16): the FOCUSABLE_SELECTOR list is internal
 * to this module and shared across the initial-focus effect and the
 * trap handler so there is exactly one source of truth for what
 * counts as focusable inside the drawer.
 *
 * Selector delta from pre-A.5 `useActivityDrawerFocusTrap` (additive,
 * no consumer regression): now also matches `select:not([disabled])`
 * and `textarea:not([disabled])` so form-variant drawers (e.g.
 * AddProviderDrawer) cycle Tab through every native form control
 * inside the panel, not just buttons / anchors / inputs / tabindexed
 * elements. ActivityLogDrawer's focus-trap test coverage is unaffected
 * (its panel only renders buttons + an empty-state region). Surfaced
 * as LOW-1 in the A.5 independent review.
 *
 * Post-E2.S5 reality: on real browsers the UA owns the focus trap
 * via native `<dialog>` + `showModal()`. This hook is the jsdom-side
 * parity layer that keeps X602-003 + X602-010 (and the new A.5 unit
 * tests) firing without a real browser.
 */

'use client';

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type RefObject,
} from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UseDrawerFocusTrap {
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly handlePanelKey: (e: KeyboardEvent<HTMLDivElement>) => void;
}

export interface UseDrawerFocusTrapOptions {
  readonly open: boolean;
  readonly onEscape?: () => void;
}

/**
 * Hook overload — accepts either the option-bag shape `{ open, onEscape }`
 * or the legacy positional `(open, onClose)` signature so the existing
 * `useActivityDrawerFocusTrap` shim can re-export this without rewriting
 * its caller. New code should use the option-bag form.
 */
export function useDrawerFocusTrap(
  options: UseDrawerFocusTrapOptions,
): UseDrawerFocusTrap;
export function useDrawerFocusTrap(
  open: boolean,
  onEscape?: () => void,
): UseDrawerFocusTrap;
export function useDrawerFocusTrap(
  openOrOptions: boolean | UseDrawerFocusTrapOptions,
  onEscapeArg?: () => void,
): UseDrawerFocusTrap {
  const isOptions =
    typeof openOrOptions === 'object' && openOrOptions !== null;
  const open = isOptions ? openOrOptions.open : openOrOptions;
  const onEscape = isOptions ? openOrOptions.onEscape : onEscapeArg;

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    const first = focusables[0] ?? panel;
    first.focus();
  }, [open]);

  const handleTrapKey = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const handlePanelKey = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      handleTrapKey(e);
    },
    [onEscape, handleTrapKey],
  );

  return { panelRef, handlePanelKey };
}
