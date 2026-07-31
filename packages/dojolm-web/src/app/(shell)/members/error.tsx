// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * File: (shell)/members/error.tsx — E8.S9 per-segment error boundary
 *
 * Scope: catches errors thrown anywhere in the `/members/*` segment.
 * Sits BELOW `(shell)/error.tsx` so member-facing render faults
 * (e.g. /members/leaderboard) are contained here — an /admin segment
 * error never touches members, and vice versa. The shell chrome stays
 * functional because `(shell)/layout.tsx` is the layout boundary above
 * this error.tsx.
 *
 * Retires F-7-008 (P0) for the members surface: a render fault on the
 * leaderboard no longer nukes the entire shell.
 *
 * Logging policy mirrors `src/app/error.tsx` (R3-003): digest-only in
 * production, full error in dev.
 */

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';

export default function MembersSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Members segment error:', error.digest ?? 'unknown');
    } else {
      console.error('Members segment error:', error);
    }
  }, [error]);

  return (
    <div data-testid="members-segment-error" data-error-segment="members">
      <ErrorState
        variant="page"
        title="This page failed to load"
        message="An unexpected error interrupted this page. Navigation remains functional — retry or use the Rail to move elsewhere."
        error={error}
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
