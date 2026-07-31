// SPDX-License-Identifier: Apache-2.0
/**
 * useSessionExpiryWarning — F-8-008 (Wave 3hh).
 *
 * Hook that derives a `WarningState` from `AuthContext.expiresAt`:
 *   - `idle`     : no live session, demo mode, or session has more
 *                  than `warnAtMinutesRemaining` minutes left.
 *   - `imminent` : session is between `warnAtMinutesRemaining` and
 *                  `urgentAtMinutesRemaining` minutes from expiry.
 *   - `urgent`   : session is between `urgentAtMinutesRemaining` and
 *                  zero minutes from expiry.
 *   - `expired`  : session is already expired (handled by the after-
 *                  the-fact `SessionExpiredCard` — this hook returns
 *                  `idle` once expired so we don't double-paint a
 *                  banner alongside the takeover).
 *
 * Thresholds:
 *   - warnAtMinutesRemaining  : default 10 — first heads-up.
 *   - urgentAtMinutesRemaining: default 5  — escalate tone to "urgent"
 *                                            and keep banner visible.
 *
 * The hook polls every 30 seconds (configurable) so the state
 * transitions even if the operator leaves the tab open. Polling stops
 * when the component unmounts or when `expiresAt` is null. SSR-safe
 * (`typeof window` guard on the interval).
 *
 * Distinct from `SessionExpiredCard`:
 *   - SessionExpiredCard fires AFTER the session has already died
 *     (cookie expired, /api/auth/me returns user: null).
 *   - useSessionExpiryWarning fires PROACTIVELY 5-10 min BEFORE
 *     expiry so the operator can extend or save their work before
 *     they get hit by the full takeover.
 *
 * R-T1: thresholds are closed `const` literals. No operator-supplied
 * input ever lands on `warnAtMinutesRemaining` / `urgentAtMinutesRemaining`
 * — they are caller-controlled constants used only for arithmetic on
 * the server-supplied `expiresAt` ISO-8601 timestamp.
 */

'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type SessionExpiryWarningState = 'idle' | 'imminent' | 'urgent' | 'expired';

export interface UseSessionExpiryWarningOptions {
  /** Minutes-remaining at which the banner first appears. Default 10. */
  readonly warnAtMinutesRemaining?: number;
  /** Minutes-remaining at which the banner escalates to "urgent" tone. Default 5. */
  readonly urgentAtMinutesRemaining?: number;
  /** Poll interval in ms. Default 30_000 (30s). */
  readonly pollMs?: number;
  /**
   * Test-only override to inject `Date.now()` at render time. Production
   * callers leave this undefined so the live wall clock drives state.
   */
  readonly nowFn?: () => number;
}

export interface UseSessionExpiryWarningResult {
  readonly state: SessionExpiryWarningState;
  /**
   * Minutes remaining until expiry, rounded down. Null when no live
   * session is in hand (state === 'idle' AND `expiresAt` is null) so
   * UI surfaces don't render "0 minutes left" on the initial frame.
   */
  readonly minutesRemaining: number | null;
}

const DEFAULT_WARN_AT = 10;
const DEFAULT_URGENT_AT = 5;
const DEFAULT_POLL_MS = 30_000;

function classify(
  expiresAt: string | null,
  now: number,
  warnAt: number,
  urgentAt: number,
): { state: SessionExpiryWarningState; minutesRemaining: number | null } {
  if (!expiresAt) return { state: 'idle', minutesRemaining: null };
  const expiryMs = Date.parse(expiresAt);
  if (!Number.isFinite(expiryMs)) {
    // Malformed timestamp — treat as no warning so we don't surface
    // spurious banners. AuthContext should never feed this, but the
    // guard keeps the hook closed-failing.
    return { state: 'idle', minutesRemaining: null };
  }
  const remainingMs = expiryMs - now;
  if (remainingMs <= 0) {
    // SessionExpiredCard handles the post-expiry takeover; this hook
    // stays muted so we never double-paint a banner + takeover.
    return { state: 'expired', minutesRemaining: 0 };
  }
  const minutes = Math.floor(remainingMs / 60_000);
  if (minutes >= warnAt) {
    return { state: 'idle', minutesRemaining: minutes };
  }
  if (minutes >= urgentAt) {
    return { state: 'imminent', minutesRemaining: minutes };
  }
  return { state: 'urgent', minutesRemaining: minutes };
}

// Module-level fallback so the default `nowFn` is reference-stable
// across renders. PROD-HOTFIX 2026-05-12: the previous inline
// `() => Date.now()` allocated a new closure on every render, which
// then fed `useEffect(..., [..., nowFn])` as a fresh dep, looping
// setResult → re-render → new nowFn → re-effect → React error #185
// ("Maximum update depth exceeded") on every page that mounts a
// component reading useAuth() — i.e. the entire shell.
const DEFAULT_NOW_FN = (): number => Date.now();

export function useSessionExpiryWarning(
  options: UseSessionExpiryWarningOptions = {},
): UseSessionExpiryWarningResult {
  const warnAt = options.warnAtMinutesRemaining ?? DEFAULT_WARN_AT;
  const urgentAt = options.urgentAtMinutesRemaining ?? DEFAULT_URGENT_AT;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const nowFn = options.nowFn ?? DEFAULT_NOW_FN;

  const { expiresAt } = useAuth();

  // Lazy initialise from the current state so SSR and first paint match.
  const [result, setResult] = useState<UseSessionExpiryWarningResult>(() =>
    classify(expiresAt, nowFn(), warnAt, urgentAt),
  );

  useEffect(() => {
    // Recompute immediately so a refresh-driven expiresAt change is
    // reflected without waiting for the next interval tick.
    setResult(classify(expiresAt, nowFn(), warnAt, urgentAt));

    if (typeof window === 'undefined') return;
    if (!expiresAt) return; // No session — no polling.

    const intervalId = window.setInterval(() => {
      setResult(classify(expiresAt, nowFn(), warnAt, urgentAt));
    }, pollMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [expiresAt, warnAt, urgentAt, pollMs, nowFn]);

  return result;
}

/**
 * Pure helper exported for unit-testing the classification logic
 * without spinning up a React tree / AuthContext provider.
 */
export const __test_classifyExpiryState = classify;
