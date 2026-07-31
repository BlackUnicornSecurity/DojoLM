// SPDX-License-Identifier: Apache-2.0
/**
 * SessionExpiringSoonBanner — F-8-008 (Wave 3hh).
 *
 * Proactive heads-up that fires 5-10 minutes BEFORE the session
 * expires. Sits in the global shell-chrome between TopBar and
 * `<main>`, alongside `GlobalBanners`. Distinct from
 * `SessionExpiredCard`:
 *   - SessionExpiredCard is a full-page TAKEOVER for AFTER the
 *     session has died.
 *   - SessionExpiringSoonBanner is an inline reminder BEFORE the
 *     session dies, giving operators time to save their draft or
 *     re-authenticate without losing context.
 *
 * Composition:
 *   - role="status" + aria-live="polite" for the imminent (10-5 min)
 *     band — informational, not interruptive.
 *   - role="alert" + aria-live="assertive" for the urgent (<5 min)
 *     band — operator gets a single salient ping in their SR queue.
 *   - One "Re-authenticate now" CTA that navigates to the sign-in
 *     surface (mirrors `SessionExpiredCard.pickSignInHref` choice
 *     made by the parent: members shell → `/members/sign-in`,
 *     admin shell → `/login`).
 *   - Optional dismiss control for the imminent band — once
 *     dismissed, the banner stays muted for the current tab until
 *     state escalates to urgent or session refresh moves the
 *     expiry beyond `warnAtMinutesRemaining`.
 *
 * R-T1 discipline:
 *   - All copy is static-literal. `minutesRemaining` is the only
 *     dynamic numeric — it is server-derived (validated DB column)
 *     and rendered through `Math.floor` upstream.
 *   - `signInHref` is the SAME closed value used by
 *     SessionExpiredCard (admin / members shell variant), threaded
 *     by the parent. No free-form input lands on the link.
 */

'use client';

import { useId } from 'react';
import type { SessionExpiryWarningState } from '@/lib/auth/use-session-expiry-warning';

export interface SessionExpiringSoonBannerProps {
  /** Classification state from `useSessionExpiryWarning`. */
  readonly state: SessionExpiryWarningState;
  /**
   * Minutes remaining until expiry. Null suppresses any "N minutes
   * left" copy — UI still renders a generic "Session expiring soon".
   */
  readonly minutesRemaining: number | null;
  /**
   * Same-origin path for the sign-in CTA. The parent picks `/login`
   * for the admin shell and `/members/sign-in` for the members shell
   * (mirrors `SessionExpiredCard.signInHref`).
   */
  readonly signInHref: string;
  /**
   * Optional dismiss callback. When provided, the imminent-band
   * variant renders a dismiss button; the urgent-band variant
   * intentionally ignores it (urgent state should always be visible).
   */
  readonly onDismiss?: () => void;
  /** Stable test id. */
  readonly testId?: string;
}

const TITLE: Readonly<Record<'imminent' | 'urgent', string>> = Object.freeze({
  imminent: 'Session expiring soon',
  urgent: 'Session expiring now',
});

function bodyCopy(
  state: 'imminent' | 'urgent',
  minutesRemaining: number | null,
): string {
  const tail = state === 'urgent'
    ? 'Save your work and re-authenticate now.'
    : 'Re-authenticate to keep your work safe.';
  if (minutesRemaining === null) {
    return `Your session is about to expire. ${tail}`;
  }
  if (minutesRemaining <= 0) {
    return `Your session expires within the next minute. ${tail}`;
  }
  if (minutesRemaining === 1) {
    return `Your session expires in 1 minute. ${tail}`;
  }
  return `Your session expires in ${minutesRemaining} minutes. ${tail}`;
}

export function SessionExpiringSoonBanner({
  state,
  minutesRemaining,
  signInHref,
  onDismiss,
  testId,
}: SessionExpiringSoonBannerProps) {
  // Render guard: idle + expired are both no-ops here. `idle` means we
  // have plenty of time left; `expired` is owned by SessionExpiredCard
  // so we don't double-paint a banner alongside the takeover.
  if (state !== 'imminent' && state !== 'urgent') return null;

  const titleId = useId();
  const descId = useId();
  const isUrgent = state === 'urgent';
  const role = isUrgent ? 'alert' : 'status';
  const live = isUrgent ? 'assertive' : 'polite';
  const tone = isUrgent ? 'danger' : 'warn';

  return (
    <div
      role={role}
      aria-live={live}
      aria-atomic="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-testid={testId ?? 'session-expiring-soon-banner'}
      data-tone={tone}
      data-state={state}
      className={`sys-banner sys-banner--${tone}`}
    >
      <span className="sys-banner-body">
        <strong id={titleId} className="sys-banner-title">
          {TITLE[state]}
        </strong>
        <span id={descId} className="sys-banner-msg">
          {bodyCopy(state, minutesRemaining)}
        </span>
        <a
          href={signInHref}
          className="btn btn-secondary"
          data-testid={
            testId
              ? `${testId}-signin`
              : 'session-expiring-soon-banner-signin'
          }
          style={{ marginLeft: 12 }}
        >
          Re-authenticate now
        </a>
      </span>
      {!isUrgent && onDismiss !== undefined && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss session expiration warning"
          data-testid={
            testId
              ? `${testId}-dismiss`
              : 'session-expiring-soon-banner-dismiss'
          }
          className="sys-banner-dismiss"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
