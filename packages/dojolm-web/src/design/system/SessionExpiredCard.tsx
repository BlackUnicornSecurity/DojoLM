// SPDX-License-Identifier: Apache-2.0
/**
 * YR.9.1 — SessionExpiredCard.
 *
 * Full-page takeover surfacing the kanji `鍵` (key) glyph with a single
 * "Sign in" call-to-action. Mounts inside the shell layout when an
 * authenticated session evaporates (cookie expired, server invalidated,
 * `/api/auth/me` returns `user: null`).
 *
 * Composition:
 *   - Fixed-position overlay covers the page below — operator cannot
 *     interact with stale UI while the takeover is mounted.
 *   - Renders a single primary action that navigates to /login by
 *     default; the parent can supply a custom href or onClick (e.g.
 *     `/members/sign-in` for the magic-link flow).
 *   - Optional `returnTo` param appends `?next=<encoded path>` so the
 *     login flow can bounce the operator back to the page they hit
 *     when the session expired. Only same-origin paths pass the
 *     scheme allow-list — external URLs are dropped.
 *
 * R-T1: kanji `鍵` is a static literal — no operator-supplied glyph
 * ever lands here. The CTA href is constructed from a static base +
 * an encoded same-origin pathname; we never echo unsanitized input.
 */

'use client';

import type { ReactNode } from 'react';

import { isSafeOriginPath } from '@/lib/safe-redirect';

const KANJI_LOCK = '鍵';

// E4.S11: previously this file declared its own `SAFE_RETURN_TO` regex
// + guard. The /forbidden page (F-7-028 P2) needs the same validator,
// so the boundary check moved to lib/safe-redirect.ts. This component
// now consumes the shared `isSafeOriginPath` to keep the rejection
// rules aligned with the RBAC middleware emitter.

export interface SessionExpiredCardProps {
  /** Title — defaults to "Session expired". */
  readonly title?: ReactNode;
  /** Sub-line — defaults to "Sign in again to continue." */
  readonly sub?: ReactNode;
  /** CTA label — defaults to "Sign in". */
  readonly ctaLabel?: string;
  /**
   * CTA destination. Defaults to `/login`. Members surface can pass
   * `/members/sign-in`. External URLs are dropped (same-origin only).
   */
  readonly signInHref?: string;
  /**
   * Optional same-origin path that the login flow should bounce back
   * to after a successful sign-in. Appended as `?next=<encoded path>`
   * when the path matches the same-origin allow-list.
   */
  readonly returnTo?: string;
  /** Click override — when set, the CTA renders as a button, not a link. */
  readonly onSignIn?: () => void;
  /** Stable test id for E2E + unit-test selectors. */
  readonly testId?: string;
  /** Additional className to compose with the design-system base classes. */
  readonly className?: string;
}

function buildSignInHref(base: string, returnTo: string | undefined): string {
  if (!isSafeOriginPath(base)) return '/login';
  if (!isSafeOriginPath(returnTo)) return base;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}next=${encodeURIComponent(returnTo)}`;
}

/**
 * Sumi-e-style session-expired takeover. Pairs with the `useAuth()`
 * hook in the shell layout — render this when `loading === false &&
 * user === null` on a route that requires authentication.
 */
export function SessionExpiredCard({
  title = 'Session expired',
  sub = 'Sign in again to continue.',
  ctaLabel = 'Sign in',
  signInHref = '/login',
  returnTo,
  onSignIn,
  testId,
  className,
}: SessionExpiredCardProps) {
  const safeHref = isSafeOriginPath(signInHref) ? signInHref : '/login';
  const finalHref = buildSignInHref(safeHref, returnTo);

  const rootClass = ['session-expired-card', className ?? '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rootClass}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-expired-title"
      aria-describedby="session-expired-sub"
      data-testid={testId ?? 'session-expired-card'}
    >
      <div className="session-expired-card-body">
        <div className="session-expired-card-kanji" aria-hidden="true" lang="ja">
          {KANJI_LOCK}
        </div>
        <div id="session-expired-title" className="session-expired-card-title">
          {title}
        </div>
        <div id="session-expired-sub" className="session-expired-card-sub">
          {sub}
        </div>
        <div className="session-expired-card-actions">
          {onSignIn ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSignIn}
              data-testid="session-expired-cta"
            >
              {ctaLabel}
            </button>
          ) : (
            <a
              className="btn btn-primary"
              href={finalHref}
              data-testid="session-expired-cta"
            >
              {ctaLabel}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
