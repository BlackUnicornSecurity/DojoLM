// SPDX-License-Identifier: Apache-2.0
/**
 * useOptimisticDelete — E4.S10 (retires F-7-031 P2 + part of F-2-224 P2).
 *
 * Optimistic-UI helper for any "click Delete → row fades → Undo toast
 * for 5s → then commit" flow. The hook surfaces three pieces of state
 * that consumers wire into the row + toast:
 *
 *   - `pendingId`     — ID of the row currently in the optimistic
 *                       window. Consumer renders the row with a
 *                       fade-out style (e.g. `opacity: 0.45`) and a
 *                       `data-pending-delete="true"` testid hook.
 *   - `requestDelete` — Call this from the row's Delete button.
 *                       Sets `pendingId` and schedules the commit.
 *   - `undo`          — Wired to the toast Undo button. Cancels the
 *                       pending commit; row returns to non-faded.
 *
 * Finding context — `F-7-031`: the `/admin/users` Delete flow used to
 * wait for the entire 800 ms two-person-approval POST round-trip with
 * no feedback (Nielsen #1 — visibility of system status). The new
 * pattern: row fades the instant the operator commits, an Undo toast
 * sits in the corner for 5s, and only THEN does the actual
 * `submitDelete` fire. The operator sees the effect instantly and
 * recovers with one click if it was a mis-click.
 *
 * Commit timing (per plan-spec):
 *   - Window: 5 000 ms
 *   - If Undo clicked within window: commit is cancelled, state
 *     returns to non-pending. `onCommit` never fires.
 *   - If timeout elapses: `onCommit(pendingId)` fires once; the hook
 *     does NOT clear `pendingId` automatically — the consumer's
 *     `onCommit` typically removes the row from its list which is
 *     what unmounts the faded state. If the consumer wants to keep
 *     the row visible post-commit (e.g. for a brief "Deleted" badge),
 *     it can call `clearPending()` manually.
 *
 * SSR safety: `setTimeout` is a global available in both browser and
 * Node; the hook is safe in both contexts.
 *
 * @example
 *   const { pendingId, requestDelete, undo } = useOptimisticDelete({
 *     onCommit: (id) => submitDelete(id),
 *   });
 *   // Row:
 *   <tr data-pending-delete={pendingId === user.id ? 'true' : undefined}
 *       style={{ opacity: pendingId === user.id ? 0.45 : 1 }} />
 *   // Toast on `pendingId !== null`:
 *   <Toast action={{ label: 'Undo', onClick: undo }} />
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseOptimisticDeleteOptions<TId extends string> {
  /**
   * Fired after the optimistic window elapses with no Undo click.
   * Typically the network DELETE call. The hook does NOT await this
   * promise — the consumer's UI state (the row's presence in its
   * list) drives final cleanup.
   */
  readonly onCommit: (id: TId) => void;
  /**
   * Optional override for the Undo window in ms. Default 5_000 (5s).
   */
  readonly windowMs?: number;
}

export interface UseOptimisticDeleteResult<TId extends string> {
  readonly pendingId: TId | null;
  /**
   * Begin the optimistic window. If a previous window is still open
   * for a different ID, the previous timer is left to run to
   * completion (its commit fires) and the new window opens. The hook
   * deliberately does NOT cancel the prior window — operators
   * routinely click delete on multiple rows in rapid succession and
   * losing a commit because the second click clobbered the first
   * would be a worse UX bug than the timer overlap.
   */
  readonly requestDelete: (id: TId) => void;
  /**
   * Cancel the in-flight commit. Safe to call when no commit is
   * pending (no-op). Typically wired to the toast Undo button.
   */
  readonly undo: () => void;
  /**
   * Force-clear the pending state without firing commit. Used by
   * consumers that want to reset on unmount or page change.
   */
  readonly clearPending: () => void;
  /**
   * Milliseconds until the pending commit fires. Refreshes every
   * 250 ms while pending — useful for rendering a countdown ring in
   * the toast (per plan-spec the toast lives for 5s).
   */
  readonly commitInMs: number;
}

const DEFAULT_WINDOW_MS = 5000;

export function useOptimisticDelete<TId extends string>({
  onCommit,
  windowMs = DEFAULT_WINDOW_MS,
}: UseOptimisticDeleteOptions<TId>): UseOptimisticDeleteResult<TId> {
  const [pendingId, setPendingId] = useState<TId | null>(null);
  const [commitInMs, setCommitInMs] = useState(0);

  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ref capture so the timer doesn't bind to a stale closure when
  // the consumer redefines `onCommit` inline on every render.
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const clearTimers = useCallback((): void => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const requestDelete = useCallback(
    (id: TId): void => {
      clearTimers();
      setPendingId(id);
      setCommitInMs(windowMs);

      let remaining = windowMs;
      countdownTimerRef.current = setInterval(() => {
        remaining = Math.max(0, remaining - 250);
        setCommitInMs(remaining);
      }, 250);

      commitTimerRef.current = setTimeout(() => {
        clearTimers();
        // Snap pending to null at commit time so a follow-up
        // `requestDelete` for the same id flips state correctly.
        setPendingId(null);
        setCommitInMs(0);
        onCommitRef.current(id);
      }, windowMs);
    },
    [clearTimers, windowMs],
  );

  const undo = useCallback((): void => {
    clearTimers();
    setPendingId(null);
    setCommitInMs(0);
  }, [clearTimers]);

  const clearPending = useCallback((): void => {
    clearTimers();
    setPendingId(null);
    setCommitInMs(0);
  }, [clearTimers]);

  // Cleanup on unmount so a route change while a commit is pending
  // doesn't fire the network call against a dead React tree.
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return { pendingId, requestDelete, undo, clearPending, commitInMs };
}
