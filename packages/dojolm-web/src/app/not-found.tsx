// SPDX-License-Identifier: Apache-2.0
/**
 * File: not-found.tsx
 * Purpose: Root 404 page (ERR-001) restyled onto the Epic 7 sys-fullpage
 * chrome. No error details are rendered — 404 is a client-visible route
 * miss, not an internal fault.
 */

import Link from 'next/link';

import '@/design/styles/tokens.css';
import '@/design/styles/primitives.css';
import '@/design/styles/system.css';

export default function NotFound() {
  return (
    <div className="dojo-ds-v3">
      <main
        className="sys-fullpage"
        role="status"
        data-testid="not-found-page"
      >
        <div className="sys-fullpage-inner">
          <div className="sys-fullpage-eyebrow">Route not found</div>
          <div className="sys-fullpage-code" aria-hidden="true">
            404
          </div>
          <h1 className="sys-fullpage-title">Page not found</h1>
          <p className="sys-fullpage-lede">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Check the URL or return to the dashboard.
          </p>
          <div className="sys-fullpage-actions">
            <Link
              href="/"
              data-testid="not-found-home"
              className="btn"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
