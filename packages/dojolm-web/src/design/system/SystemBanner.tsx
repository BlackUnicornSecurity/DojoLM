// SPDX-License-Identifier: Apache-2.0
/**
 * SystemBanner — top-of-page system-state alert.
 *
 * Epic 7 S7.3. Designed for kill-switch, over-budget, flag-off,
 * pending-attestation, merge-freeze and similar fleet-wide states. The
 * primitive is deliberately side-effect-free: render is gated on
 * `active === true` (default false) so a page can wire the prop
 * unconditionally without leaking the banner when the underlying
 * condition is inactive.
 *
 * Presentation matches the tokens-only `.sys-banner` block declared in
 * `src/design/styles/system.css`. The class chain mirrors the inline
 * `.wb-banner` utility so existing a11y patterns carry over:
 *   - tone=warn|danger renders role="alert" + aria-live="assertive"
 *   - tone=info|success|fixture renders role="status" + aria-live="polite"
 *
 * Rendering children (not innerHTML) avoids the React-escaped sink —
 * callers that need emphasis can wrap text in <strong>/<code>/<a>
 * without risking XSS.
 *
 * E5.S4 (REMEDIATION-PLAN line 600): added the `fixture` tone. It
 * replaces the per-widget `<DemoDataBadge>` chips on the `/` dashboard
 * with one page-level "Demo data — connect a model in Admin to see live
 * numbers" callout. Tone uses the gold token (warning yellow) for the
 * accent stripe so reviewers can spot demo surfaces without overloading
 * the danger / warn tones reserved for kill-switch and flag-off states.
 * a11y posture mirrors `info`/`success`: role="status" + aria-live=polite
 * (the banner is informational, not an interruption).
 *
 * A.4 (2026-05-14): additive extension of the primitive into the
 * consolidated Banner primitive. Every existing prop + default
 * preserves the prior rendering verbatim — `position` defaults to
 * `'inline'`, `icon` defaults to `undefined` (no icon — current
 * behaviour), `action` / `dismissible` / `persistDismiss` are all
 * opt-in. New tone aliases (`warning` for `warn`, `error` for `danger`)
 * normalise to the canonical CSS-class set so the existing
 * `.sys-banner--warn` / `.sys-banner--danger` selectors keep applying.
 * Internal-state dismiss (no `onDismiss` prop required) is the
 * "dismissible without parent owning the visibility flag" path —
 * existing consumers that pass `onDismiss` continue to own visibility
 * via their `active` prop.
 *
 * localStorage persistence (`persistDismiss={true}`) writes a single
 * boolean flag at `tpi.banner.<dismissKey>.dismissed` so a returning
 * user does not see a recently-dismissed banner again. The lookup
 * happens inside a `useEffect` (NOT in the `useState` initializer) so
 * the server-rendered HTML and the first client paint agree on
 * "render", avoiding the React hydration-mismatch warning that would
 * otherwise fire when the user has an existing `dismissed` flag. The
 * banner therefore renders for one frame before the effect hides it —
 * the accepted SSR trade-off for localStorage-gated UI.
 */

'use client';

import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

export type SystemBannerTone =
  | 'warn'
  | 'danger'
  | 'info'
  | 'success'
  | 'fixture'
  // A.4 aliases — canonical names matching Toast tones. Normalised
  // internally to the existing tone-class set so the existing
  // .sys-banner--{warn,danger} CSS rules keep applying without
  // duplication. Existing consumers continue to use 'warn' / 'danger'.
  | 'warning'
  | 'error';

export type SystemBannerPosition = 'inline' | 'page-top';

export interface SystemBannerAction {
  readonly label: string;
  readonly onClick: () => void;
  /**
   * Optional aria-label override. Defaults to `label`. Use when the
   * label is short (e.g. "View") and a longer accessible name helps
   * screen-reader users understand the target ("View kill-switch
   * status page").
   */
  readonly ariaLabel?: string;
}

export interface SystemBannerProps {
  /** Render guard. Default false. Banner renders ONLY when active === true. */
  readonly active?: boolean;
  readonly tone: SystemBannerTone;
  /** Optional bold lead-in rendered before the body. */
  readonly title?: string;
  readonly children: ReactNode;
  /** Optional dismiss handler. Button is hidden when undefined (legacy path). */
  readonly onDismiss?: () => void;
  readonly testId?: string;
  /** Optional aria-label override for screen readers. */
  readonly ariaLabel?: string;
  // ─── A.4 additive props (all optional; defaults preserve prior behaviour) ──
  /** Layout position. Default `'inline'` (matches existing rendering). */
  readonly position?: SystemBannerPosition;
  /** Optional action button rendered after the body. */
  readonly action?: SystemBannerAction;
  /**
   * Explicit dismissibility. When `true`, the dismiss × button renders
   * even without `onDismiss`. Default `false` (matches existing — the
   * × button only appears when `onDismiss` is provided).
   */
  readonly dismissible?: boolean;
  /**
   * Persist the dismissed state to localStorage. Requires `dismissKey`.
   * On mount, the banner returns null if the key is already set. On
   * dismiss, writes the key. SSR-safe (guards typeof window).
   */
  readonly persistDismiss?: boolean;
  /**
   * localStorage key suffix used when `persistDismiss={true}`. Stored
   * at `tpi.banner.<dismissKey>.dismissed`. Required when
   * `persistDismiss={true}` — banner renders normally without
   * persistence if omitted (with a one-shot dev warning).
   */
  readonly dismissKey?: string;
  /**
   * Decorative icon rendered to the left of the body. `undefined`
   * (default) preserves current "no icon" rendering. Pass a ReactNode
   * to render a custom icon. The icon is wrapped in
   * `aria-hidden="true"` — accessible name comes from `title` + body.
   */
  readonly icon?: ReactNode;
}

interface NormalisedTone {
  readonly raw: SystemBannerTone;
  readonly canonical: 'warn' | 'danger' | 'info' | 'success' | 'fixture';
}

function normaliseTone(tone: SystemBannerTone): NormalisedTone {
  if (tone === 'warning') return { raw: tone, canonical: 'warn' };
  if (tone === 'error') return { raw: tone, canonical: 'danger' };
  return { raw: tone, canonical: tone };
}

function localStorageKey(key: string): string {
  return `tpi.banner.${key}.dismissed`;
}

function readDismissedFromStorage(key: string | undefined): boolean {
  if (key === undefined) return false;
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(localStorageKey(key)) === 'true';
  } catch {
    // localStorage can throw under Safari private mode or quota exhausted.
    return false;
  }
}

function writeDismissedToStorage(key: string | undefined): void {
  if (key === undefined) return;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(localStorageKey(key), 'true');
  } catch {
    // Same defensive guard as readDismissedFromStorage.
  }
}

let warnedMissingDismissKey = false;

export function SystemBanner({
  active = false,
  tone,
  title,
  children,
  onDismiss,
  testId,
  ariaLabel,
  position = 'inline',
  action,
  dismissible,
  persistDismiss = false,
  dismissKey,
  icon,
}: SystemBannerProps): ReactElement | null {
  const { canonical } = normaliseTone(tone);
  const isAlert = canonical === 'warn' || canonical === 'danger';
  const role = isAlert ? 'alert' : 'status';
  const live = isAlert ? 'assertive' : 'polite';

  // Internal dismissed-state — only used when the banner itself owns
  // the visibility flag (i.e. no parent-controlled `onDismiss` is
  // provided OR persistDismiss is enabled).
  //
  // Initial value is always `false` so server-rendered HTML and the
  // first client paint agree. The localStorage read happens in
  // useEffect below (client-only). When the user has a previously-
  // dismissed flag, the banner renders for one frame and then hides —
  // the accepted SSR trade-off for localStorage-gated UI.
  const [internalDismissed, setInternalDismissed] = useState(false);

  useEffect(() => {
    if (persistDismiss) {
      const dismissed = readDismissedFromStorage(dismissKey);
      if (dismissed) {
        setInternalDismissed(true);
      }
    }
  }, [persistDismiss, dismissKey]);

  useEffect(() => {
    if (persistDismiss && dismissKey === undefined && !warnedMissingDismissKey) {
      warnedMissingDismissKey = true;
      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
        console.warn(
          '[SystemBanner] persistDismiss={true} requires a `dismissKey`. ' +
            'Banner will render but dismissal will not persist.',
        );
      }
    }
  }, [persistDismiss, dismissKey]);

  if (active !== true) return null;
  if (internalDismissed) return null;

  // The × button renders when either dismissibility flag is set OR an
  // onDismiss handler is provided (legacy path — preserves existing
  // behaviour where passing onDismiss alone showed the button).
  const showDismissButton = dismissible === true || onDismiss !== undefined;

  function handleDismiss(): void {
    if (persistDismiss) {
      writeDismissedToStorage(dismissKey);
    }
    setInternalDismissed(true);
    onDismiss?.();
  }

  const positionClass = position === 'page-top' ? ' sys-banner--position-page-top' : '';
  const actionClass = action !== undefined ? ' sys-banner--with-action' : '';

  return (
    <div
      role={role}
      aria-live={live}
      aria-atomic="true"
      aria-label={ariaLabel}
      data-testid={testId}
      data-tone={canonical}
      data-position={position}
      className={`sys-banner sys-banner--${canonical}${positionClass}${actionClass}`}
    >
      {icon !== undefined && (
        <span className="sys-banner-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="sys-banner-body">
        {title !== undefined && (
          <strong className="sys-banner-title">{title}</strong>
        )}
        <span className="sys-banner-msg">{children}</span>
      </span>
      {action !== undefined && (
        <button
          type="button"
          onClick={action.onClick}
          aria-label={action.ariaLabel ?? action.label}
          data-testid={testId ? `${testId}-action` : 'sys-banner-action'}
          className="sys-banner-action"
        >
          {action.label}
        </button>
      )}
      {showDismissButton && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label={
            // Legacy path (onDismiss alone, no `dismissible` prop) keeps
            // the original static "Dismiss banner" string so existing
            // consumers render byte-identically. New explicit-
            // dismissible consumers get the descriptive form including
            // the title (a11y improvement opted into by the new prop).
            dismissible === true && title !== undefined
              ? `Dismiss banner: ${title}`
              : 'Dismiss banner'
          }
          data-testid={testId ? `${testId}-dismiss` : 'sys-banner-dismiss'}
          className="sys-banner-dismiss"
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}

/** Test-only helper to reset the one-shot dev warning. */
export function __systemBannerResetWarningsForTest(): void {
  warnedMissingDismissKey = false;
}
