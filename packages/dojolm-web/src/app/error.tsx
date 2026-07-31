// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * File: error.tsx
 * Purpose: Root-level error boundary (ERR-001) restyled onto the Epic 7
 * sys-fullpage chrome.
 *
 * Epic 7 rule 10: the end-user surface renders ONLY an error code + a
 * retry CTA. The raw `error.message` and `error.stack` are never
 * reflected back to the DOM. The digest is surfaced as a short monospace
 * reference the operator can quote when filing a ticket — it's already
 * a hash Next.js produces server-side, not user-controlled content.
 *
 * Dev-mode console.error logs the full error so the developer can
 * debug; prod-mode console.error logs only the digest.
 */

import { useEffect } from 'react';

import '@/design/styles/tokens.css';
import '@/design/styles/primitives.css';
import '@/design/styles/system.css';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // R3-003: Only log digest in production to avoid leaking internal
    // paths/stack traces to browser-side telemetry. The raw error is
    // available to developers in dev mode only.
    if (process.env.NODE_ENV === 'production') {
      console.error('Application error:', error.digest ?? 'unknown');
    } else {
      console.error('Application error:', error);
    }
  }, [error]);

  return (
    <div className="dojo-ds-v3">
      <main
        className="sys-fullpage"
        role="alert"
        aria-live="assertive"
        data-testid="root-error"
      >
        <div className="sys-fullpage-inner">
          <div className="sys-fullpage-eyebrow">System fault</div>
          <div className="sys-fullpage-code" aria-hidden="true">
            500
          </div>
          <h1 className="sys-fullpage-title">Something went wrong</h1>
          <p className="sys-fullpage-lede">
            An unexpected error interrupted this request. The operations
            team has been notified; retry below or return to the dashboard.
          </p>
          {error.digest !== undefined && (
            <span className="sys-fullpage-ref" data-testid="error-digest">
              ref · {error.digest}
            </span>
          )}
          <div className="sys-fullpage-actions">
            <button
              type="button"
              onClick={reset}
              data-testid="error-retry"
              className="btn"
            >
              Try again
            </button>
            <a
              href="/"
              data-testid="error-home"
              className="btn"
            >
              Return to dashboard
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
