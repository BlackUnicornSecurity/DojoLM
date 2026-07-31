// SPDX-License-Identifier: Apache-2.0
/**
 * useActivityDrawerFocusTrap — A.5 backward-compat re-export.
 *
 * Previously the canonical focus-trap discipline lived here, extracted
 * from `ActivityLogDrawer.tsx` (TICKET-X-602 pass-1 fold-in LOW #4).
 * For the A.5 Drawer / Sheet anchor primitive (UI Coherence Phase 1
 * W2) the discipline has moved to `src/lib/hooks/useDrawerFocusTrap.ts`
 * so the canonical `<Drawer>` primitive + all three shims (Activity /
 * Sensei / AddProvider) share one implementation.
 *
 * This module stays as a thin re-export so:
 *   - the existing import path keeps working unchanged for any caller
 *     still reaching into `@/design/shell/useActivityDrawerFocusTrap`
 *   - the legacy positional `(open, onClose)` signature documented in
 *     the pre-A.5 hook is preserved (the new hook is overloaded so
 *     `useDrawerFocusTrap(open, onClose)` and
 *     `useDrawerFocusTrap({ open, onEscape })` both compile)
 *
 * Tag: `@deprecated`. New callers should import
 * `useDrawerFocusTrap` from `@/lib/hooks/useDrawerFocusTrap` directly.
 */

export {
  /** @deprecated Use `useDrawerFocusTrap` from `@/lib/hooks/useDrawerFocusTrap` instead. */
  useDrawerFocusTrap as useActivityDrawerFocusTrap,
  type UseDrawerFocusTrap as UseActivityDrawerFocusTrap,
} from '@/lib/hooks/useDrawerFocusTrap';
