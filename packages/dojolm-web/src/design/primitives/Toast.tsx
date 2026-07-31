// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * A.3 Toast — single toast presentational primitive.
 *
 * Renders one viewport-anchored notification chip with a tone tint
 * background, 4px tone-accent left border, decorative tone icon, title,
 * optional description, optional action button, and a close × button.
 *
 * ARIA per W3C ARIA APG status / alert pattern (and matching
 * SystemBanner.tsx Epic 7 S7.3):
 *   - tone="error"  → assertive aria-live container
 *   - tone="success" / "info" / "warning" → polite aria-live container
 *
 * Critically, the role/aria-live attributes live on the CONTAINER stack
 * in <ToastProvider>, NOT on the individual chip elements. Nested live
 * regions cause NVDA + Firefox/Chrome to double-announce ("Could not
 * save changes — Could not save changes"). The chip itself carries only
 * aria-labelledby + aria-describedby for rich AT navigation; the
 * exported TOAST_ROLE_BY_TONE + TOAST_LIVE_BY_TONE constants tell the
 * Provider which container to route each chip into.
 *
 * Toast is a child of <ToastProvider>'s viewport region — the Provider
 * owns the queue, timers, dedup, and stack reflow. Toast itself is a
 * pure presentational component: it renders the chip and reports user
 * intents (close, hover-pause, hover-resume, action-click) back to the
 * Provider via callbacks.
 *
 * Focus contract: Toast does NOT steal focus. Provider mounts toasts
 * into an aria-live region; AT announces the title automatically. The
 * close × button and action button are reachable via Tab once the user
 * navigates to the toast stack (they live inside a region with an
 * accessible label "Notifications").
 *
 * Decorative icons are inlined SVG (not @/design/shell/icons) so the
 * Toast surface stays self-contained — the shell icons set lacks an
 * info circle, and reusing `close` for the error tone clashed visually
 * with the dismiss × button.
 */

import { useCallback, type ReactElement } from 'react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  readonly label: string;
  readonly onClick: () => void;
}

export interface ToastData {
  readonly id: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly description?: string;
  readonly action?: ToastAction;
  /**
   * Auto-dismiss duration in ms. `undefined` means "stick until user
   * dismisses". Provider defaults success/warning/info to 5000ms and
   * error to `undefined`.
   */
  readonly duration?: number;
}

/** tone → role mapping per WCAG 2.1 SC 4.1.3 (Status Messages). */
export const TOAST_ROLE_BY_TONE: Readonly<Record<ToastTone, 'alert' | 'status'>> = {
  error: 'alert',
  warning: 'status',
  success: 'status',
  info: 'status',
} as const;

/** tone → aria-live mapping. Always pairs with role per ARIA APG. */
export const TOAST_LIVE_BY_TONE: Readonly<Record<ToastTone, 'assertive' | 'polite'>> = {
  error: 'assertive',
  warning: 'polite',
  success: 'polite',
  info: 'polite',
} as const;

interface ToastProps {
  readonly toast: ToastData;
  readonly onDismiss: (id: string) => void;
  readonly onPause: (id: string) => void;
  readonly onResume: (id: string) => void;
}

function ToneIcon({ tone }: { tone: ToastTone }): ReactElement {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (tone === 'success') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M6.5 10.5l2.5 2.5 4.5-5" />
      </svg>
    );
  }
  if (tone === 'error') {
    return (
      <svg {...common}>
        <circle cx="10" cy="10" r="8" />
        <path d="M10 6.5v4.2" />
        <path d="M10 13.6v0.1" />
      </svg>
    );
  }
  if (tone === 'warning') {
    return (
      <svg {...common}>
        <path d="M10 3l8 14H2z" />
        <path d="M10 8.5v3.4" />
        <path d="M10 14.6v0.1" />
      </svg>
    );
  }
  // info
  return (
    <svg {...common}>
      <circle cx="10" cy="10" r="8" />
      <path d="M10 9v4.5" />
      <path d="M10 6.4v0.1" />
    </svg>
  );
}

export function Toast({ toast, onDismiss, onPause, onResume }: ToastProps): ReactElement {
  const { id, tone, title, description, action } = toast;
  const titleId = `toast-${id}-title`;
  const descId = description !== undefined ? `toast-${id}-desc` : undefined;

  const handleDismiss = useCallback(() => onDismiss(id), [id, onDismiss]);
  const handleAction = useCallback(() => {
    action?.onClick();
    onDismiss(id);
  }, [action, id, onDismiss]);
  const handleEnter = useCallback(() => onPause(id), [id, onPause]);
  const handleLeave = useCallback(() => onResume(id), [id, onResume]);

  return (
    <div
      aria-labelledby={titleId}
      aria-describedby={descId}
      data-toast-id={id}
      data-tone={tone}
      className={`toast toast--tone-${tone}${action !== undefined ? ' toast--with-action' : ''}`}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      <span className="toast-icon" aria-hidden="true">
        <ToneIcon tone={tone} />
      </span>
      <div className="toast-body">
        <span id={titleId} className="toast-title">
          {title}
        </span>
        {description !== undefined && (
          <span id={descId} className="toast-desc">
            {description}
          </span>
        )}
        {action !== undefined && (
          <button
            type="button"
            onClick={handleAction}
            className="toast-action"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label={`Dismiss notification: ${title}`}
        data-testid={`toast-${id}-dismiss`}
        className="toast-dismiss"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}
