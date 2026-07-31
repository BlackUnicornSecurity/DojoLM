// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * A.3 useToast — public hook for the new Toast primitive.
 *
 * Reads the ToastProvider context and returns the namespaced API:
 *   const toast = useToast();
 *   toast.success({ title: 'Saved' });
 *   toast.error({ title: 'Could not save', description: '...' });
 *
 * Graceful degradation: if called OUTSIDE a <ToastProvider>, the hook
 * returns no-op handlers and logs a one-shot dev warning (process.env
 * .NODE_ENV !== 'production'). This is intentional — root-layout
 * integration is Phase 2, so consumers that migrate ahead of the
 * Provider mount should not crash the page.
 *
 * NOTE: Co-located here rather than `src/lib/hooks/useToast.ts` because
 * that path already hosts the legacy local-state useToast (TPI-UIP-02).
 * Phase 2 migration will deprecate the legacy hook in favor of this
 * Provider-based one; this PR ships them side-by-side.
 */

import { useMemo } from 'react';

import { useToastContextInternal, type ToastApi, type ToastHandle, type ToastOptions } from './ToastProvider';

let warnedNoProvider = false;

function devWarnNoProvider(): void {
  if (warnedNoProvider) return;
  warnedNoProvider = true;
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.warn(
      '[useToast] called outside <ToastProvider>. Toast calls are no-ops. ' +
        'Mount <ToastProvider> in your app root (Phase 2) or in your canvas page.',
    );
  }
}

const NO_OP_HANDLE: ToastHandle = { id: '', dismiss: () => {} };

function buildNoOpApi(): ToastApi {
  const noOp = (_options: ToastOptions): ToastHandle => {
    devWarnNoProvider();
    return NO_OP_HANDLE;
  };
  return {
    success: noOp,
    error: noOp,
    warning: noOp,
    info: noOp,
    dismissAll: () => {
      devWarnNoProvider();
    },
  };
}

/**
 * Hook returning the toast API. Safe to call without a Provider —
 * returns no-op handlers + logs a one-shot dev warning.
 */
export function useToast(): ToastApi {
  const ctx = useToastContextInternal();
  // Memoize the fallback so referential equality is stable across renders.
  const fallback = useMemo<ToastApi>(() => buildNoOpApi(), []);
  return ctx?.api ?? fallback;
}

/** Test-only helper to reset the one-shot dev-warning flag. */
export function __useToastResetWarningsForTest(): void {
  warnedNoProvider = false;
}
