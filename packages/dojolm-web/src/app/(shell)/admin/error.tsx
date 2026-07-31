// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * File: (shell)/admin/error.tsx — E8.S9 per-segment error boundary
 *
 * Scope: catches errors thrown anywhere in the `/admin/*` segment. Sits
 * BELOW `(shell)/error.tsx` so admin-specific render faults are caught
 * here without bubbling up to the broader shell boundary. The shell
 * chrome (Rail / TopBar) stays rendered because `(shell)/layout.tsx`
 * remains the layout boundary above this error.tsx.
 *
 * Retires F-7-008 (P0) for the admin surface: a bug inside e.g.
 * `/admin/eval` page render is now contained — operator can retry the
 * segment or navigate to a different admin page via Rail.
 *
 * Logging policy mirrors `src/app/error.tsx` (R3-003): digest-only in
 * production, full error in dev. The digest is the Next.js
 * server-generated hash, not user-controlled content.
 */

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';

export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Admin segment error:', error.digest ?? 'unknown');
    } else {
      console.error('Admin segment error:', error);
    }
  }, [error]);

  return (
    <div data-testid="admin-segment-error" data-error-segment="admin">
      <ErrorState
        variant="page"
        title="Admin page failed to load"
        message="An unexpected error interrupted this admin surface. The Rail and TopBar remain functional — retry or move to another admin page."
        error={error}
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
