// SPDX-License-Identifier: Apache-2.0
/**
 * File: loading.tsx
 * Purpose: Root-level Suspense loading boundary (Epic 7 S7.2).
 *
 * Next.js renders this component for streamed segments that are still
 * resolving. Kept tokens-only + motion-safe so the spinner doesn't
 * flash for users with prefers-reduced-motion enabled — the keyframe
 * is gated inside system.css.
 */

import '@/design/styles/tokens.css';
import '@/design/styles/primitives.css';
import '@/design/styles/system.css';

export default function Loading() {
  return (
    <div className="dojo-ds-v3">
      <div
        className="sys-loading"
        role="status"
        aria-live="polite"
        data-testid="root-loading"
      >
        <span className="sys-loading-spinner" aria-hidden="true" />
        <span>Loading dojo…</span>
      </div>
    </div>
  );
}
