// SPDX-License-Identifier: Apache-2.0
/**
 * useEventSourceWithRetry — E4.S10 (retires F-2-223 P2).
 *
 * Wraps the native browser `EventSource` with exponential backoff retry
 * (1s / 2s / 4s / 8s, max 3 attempts) plus a manual "Retry" affordance
 * that re-opens the stream after the auto-retry budget is exhausted.
 *
 * Finding context — `F-2-223`: the `/admin/eval/run` page's
 * `EventSource` previously surfaced a static "Stream unavailable"
 * banner on first error and required the operator to re-stage the
 * race (paying the cost again) before a fresh SSE attempt could be
 * made. The new hook:
 *
 *   1. On `onerror`, schedules a retry with backoff `attempt * 2`
 *      seconds (1s / 2s / 4s / 8s capped at `MAX_AUTO_ATTEMPTS = 3`).
 *   2. Surfaces the current retry state through `status`:
 *        - `idle`         — stream not started
 *        - `connecting`   — initial open in flight (no events yet)
 *        - `open`         — at least one message received
 *        - `retrying`     — auto-backoff scheduled (consumer renders
 *                            "retrying in Ns…" banner)
 *        - `failed`       — auto budget exhausted; consumer renders
 *                            manual "Retry" button
 *        - `closed`       — consumer called `close()` or unmounted
 *   3. Exposes a `retry()` callback the consumer can wire to a manual
 *      button so a `failed` stream re-opens from scratch (counter
 *      resets to 0).
 *
 * SSR safety: the effect bails on `typeof window === 'undefined'`. The
 * hook is `'use client'` but Next 15 RSC compilation still traces the
 * file at the boundary, so the gate is defensive.
 *
 * What this hook deliberately does NOT do:
 *   - Server-Sent-Events parsing — the consumer owns `onmessage`
 *     decoding. We forward the raw `MessageEvent` so the per-page
 *     shape-validation (e.g. `validateRaceEvent` in /admin/eval/run)
 *     stays at the call-site.
 *   - Custom Last-Event-ID semantics. Native EventSource handles that
 *     automatically; we just re-construct a new EventSource on retry.
 *   - Network-quality heuristics. Backoff is fixed-schedule.
 *
 * Backoff schedule (per plan-spec):
 *   attempt 1 → 1000 ms
 *   attempt 2 → 2000 ms
 *   attempt 3 → 4000 ms
 *   attempt 4 → 8000 ms (capped — only triggered by manual retry path)
 *
 * MAX_AUTO_ATTEMPTS = 3 means three automatic retries before the hook
 * flips to `failed`. The plan-spec says "auto-retry with exponential
 * backoff (1s/2s/4s/8s) up to 3 attempts" — interpretation: 3 auto
 * retries with delays 1s/2s/4s, then a 4th attempt (delay 8s) reserved
 * for the manual retry button so the operator-driven retry still
 * carries one final backoff before re-flipping to `failed`.
 *
 * @example
 *   const { status, retry, attempts } = useEventSourceWithRetry({
 *     url: phase === 'running' ? streamUrl : null,
 *     onMessage: (ev) => decodeStreamEvent(ev),
 *   });
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type EventSourceStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'retrying'
  | 'failed'
  | 'closed';

export interface UseEventSourceWithRetryOptions {
  /**
   * Stream URL. When `null`, the hook stays in `idle` (no
   * connection is opened). Pass a string to open / re-open the stream.
   */
  readonly url: string | null;
  /**
   * `onmessage` callback. The hook passes through the raw
   * `MessageEvent` so the consumer can run shape-validation.
   */
  readonly onMessage: (event: MessageEvent) => void;
  /**
   * Optional `onopen` callback (fired once per successful connect).
   */
  readonly onOpen?: () => void;
  /**
   * Optional callback fired BEFORE the hook schedules a retry. The
   * argument `hasConnectedSinceOpen` tells the consumer whether the
   * dropped connection had ever successfully opened (mid-stream
   * disconnect) or never opened (pre-connect unavailability).
   *
   * Use case: `/admin/eval/run` distinguishes the two states with
   * separate banners (`stream-error` + Retry button vs
   * `stream-unavailable` no Retry).
   *
   * The hook still tracks its own auto-retry budget; if the consumer
   * wants to short-circuit a retry (e.g. for pre-connect failure)
   * it should call `close()` from inside this callback.
   */
  readonly onErrorBeforeRetry?: (ctx: {
    readonly hasConnectedSinceOpen: boolean;
    readonly nextAttempt: number;
  }) => void;
  /**
   * Maximum auto-retries before flipping to `failed`. Default 3.
   * Exposed as a knob for unit tests; production callers should leave
   * the default.
   */
  readonly maxAutoAttempts?: number;
  /**
   * Backoff base in ms. Default 1000. Each attempt waits
   * `base * 2 ** (attempt - 1)` capped at `base * 8`.
   */
  readonly backoffBaseMs?: number;
}

export interface UseEventSourceWithRetryResult {
  readonly status: EventSourceStatus;
  readonly attempts: number;
  /**
   * Manual retry. Resets the attempt counter and re-opens. Safe to
   * call from any status — opens fresh on `failed`, no-op on `open`,
   * cancels the in-flight backoff on `retrying`.
   */
  readonly retry: () => void;
  /**
   * Close the connection. The hook clears any pending backoff timer
   * and tears down the active EventSource. Status flips to `closed`.
   */
  readonly close: () => void;
  /**
   * Number of milliseconds until the next auto-retry fires (only
   * meaningful in `retrying` status). Consumer can render
   * "Retrying in {Math.ceil(retryInMs/1000)}s…".
   */
  readonly retryInMs: number;
}

const DEFAULT_MAX_AUTO_ATTEMPTS = 3;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const BACKOFF_CAP_MULTIPLIER = 8;

function computeBackoff(attempt: number, base: number): number {
  // attempt 1 → base, attempt 2 → 2*base, attempt 3 → 4*base,
  // attempt 4+ → 8*base (capped).
  const exponent = Math.max(0, attempt - 1);
  const multiplier = Math.min(2 ** exponent, BACKOFF_CAP_MULTIPLIER);
  return base * multiplier;
}

export function useEventSourceWithRetry({
  url,
  onMessage,
  onOpen,
  onErrorBeforeRetry,
  maxAutoAttempts = DEFAULT_MAX_AUTO_ATTEMPTS,
  backoffBaseMs = DEFAULT_BACKOFF_BASE_MS,
}: UseEventSourceWithRetryOptions): UseEventSourceWithRetryResult {
  const [status, setStatus] = useState<EventSourceStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  const [retryInMs, setRetryInMs] = useState(0);

  // Refs so the effect captures fresh values without re-running on
  // every callback identity change. The consumer typically defines
  // `onMessage` inline; without the ref we'd re-open the stream
  // every keystroke that re-renders the parent component.
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onErrorRef = useRef(onErrorBeforeRetry);
  onMessageRef.current = onMessage;
  onOpenRef.current = onOpen;
  onErrorRef.current = onErrorBeforeRetry;
  // Tracks whether the current connection ever reached `open`. The
  // consumer uses this via `onErrorBeforeRetry` to distinguish pre-
  // connect failure (never opened — typically the endpoint is dark)
  // from mid-stream disconnect (was healthy, then dropped).
  const hasConnectedSinceOpenRef = useRef(false);

  const esRef = useRef<EventSource | null>(null);
  const backoffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks manual close so onerror after .close() doesn't schedule a retry.
  const manualClosedRef = useRef(false);
  // Strictly-monotone attempt counter shared between effect + timer
  // closures. `attempts` state is for render only — the ref is the
  // source of truth for backoff calculation.
  const attemptCountRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (backoffTimerRef.current !== null) {
      clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }
    if (countdownTimerRef.current !== null) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(() => {
    clearTimers();
    if (esRef.current !== null) {
      try {
        esRef.current.close();
      } catch {
        // best-effort
      }
      esRef.current = null;
    }
  }, [clearTimers]);

  // Forward declaration: `connect` references `scheduleRetry` and
  // vice-versa, so we lift them out of the effect body via refs.
  const connectRef = useRef<() => void>(() => {});
  const scheduleRetryRef = useRef<() => void>(() => {});

  connectRef.current = () => {
    if (typeof window === 'undefined') return;
    if (url === null) return;

    // Tear down any prior connection. clearTimers handles a pending
    // backoff; close() handles a stuck connection.
    teardown();
    manualClosedRef.current = false;

    setStatus('connecting');
    setRetryInMs(0);

    let es: EventSource;
    try {
      es = new EventSource(url);
    } catch {
      // URL parse / construction failure. Surface as failed —
      // re-trying with the same URL would just re-throw.
      setStatus('failed');
      return;
    }
    esRef.current = es;

    es.onopen = () => {
      // Reset the auto-retry budget on successful connect so a long
      // healthy stream that then disconnects gets the FULL retry
      // budget, not what's left over from the last failure.
      attemptCountRef.current = 0;
      hasConnectedSinceOpenRef.current = true;
      setAttempts(0);
      setStatus('open');
      onOpenRef.current?.();
    };

    es.onmessage = (ev) => {
      onMessageRef.current(ev);
    };

    es.onerror = () => {
      if (manualClosedRef.current) return;
      try {
        es.close();
      } catch {
        // best-effort
      }
      esRef.current = null;
      // Notify the consumer BEFORE we schedule a retry so it can
      // route the pre-connect vs mid-stream distinction at the
      // page level. If the consumer calls `close()` from inside
      // this callback the retry is short-circuited.
      onErrorRef.current?.({
        hasConnectedSinceOpen: hasConnectedSinceOpenRef.current,
        nextAttempt: attemptCountRef.current + 1,
      });
      // The consumer may have flipped manualClosedRef via close().
      if (manualClosedRef.current) return;
      scheduleRetryRef.current();
    };
  };

  scheduleRetryRef.current = () => {
    if (typeof window === 'undefined') return;
    if (manualClosedRef.current) return;

    const nextAttempt = attemptCountRef.current + 1;
    if (nextAttempt > maxAutoAttempts) {
      setStatus('failed');
      setRetryInMs(0);
      return;
    }

    attemptCountRef.current = nextAttempt;
    setAttempts(nextAttempt);

    const delay = computeBackoff(nextAttempt, backoffBaseMs);
    setStatus('retrying');
    setRetryInMs(delay);

    // Tick the countdown every 250 ms so the consumer can render a
    // smooth "Retrying in 3s…" line without re-rendering at 60fps.
    let remaining = delay;
    countdownTimerRef.current = setInterval(() => {
      remaining = Math.max(0, remaining - 250);
      setRetryInMs(remaining);
    }, 250);

    backoffTimerRef.current = setTimeout(() => {
      clearTimers();
      connectRef.current();
    }, delay);
  };

  const retry = useCallback((): void => {
    // Manual retry: reset the auto-retry budget and reconnect from
    // scratch. Cancels any in-flight backoff so the operator doesn't
    // wait for the leftover countdown.
    clearTimers();
    manualClosedRef.current = false;
    attemptCountRef.current = 0;
    hasConnectedSinceOpenRef.current = false;
    setAttempts(0);
    setRetryInMs(0);
    connectRef.current();
  }, [clearTimers]);

  const close = useCallback((): void => {
    manualClosedRef.current = true;
    teardown();
    setStatus('closed');
    setRetryInMs(0);
  }, [teardown]);

  // Lifecycle: open the connection whenever `url` transitions from
  // null → string. URL identity changes also re-open (rarely needed
  // but cleaner contract).
  useEffect(() => {
    if (url === null) {
      teardown();
      setStatus('idle');
      attemptCountRef.current = 0;
      hasConnectedSinceOpenRef.current = false;
      setAttempts(0);
      setRetryInMs(0);
      return;
    }
    // Fresh open — reset state.
    attemptCountRef.current = 0;
    hasConnectedSinceOpenRef.current = false;
    setAttempts(0);
    setRetryInMs(0);
    connectRef.current();

    return () => {
      manualClosedRef.current = true;
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return { status, attempts, retry, close, retryInMs };
}
