// SPDX-License-Identifier: Apache-2.0
'use client';

/**
 * File: (shell)/error.tsx — E8.S9 per-segment error boundary
 *
 * Scope: catches errors thrown by the shell layout's children. Because
 * Next.js renders this boundary at the same level as `(shell)/layout.tsx`,
 * the chrome (Rail / TopBar / SystemBanner) keeps rendering — only the
 * page content below the layout is replaced with the ErrorState UI.
 *
 * Retires F-7-008 (P0): the previous single root `src/app/error.tsx`
 * meant one rendering bug nuked the entire shell, costing the operator
 * navigation + the chrome's recovery affordances. With segment-scoped
 * boundaries, an /admin/eval render fault only blanks the page region;
 * Rail/TopBar stay functional so the operator can navigate away.
 *
 * Logging policy mirrors the root `src/app/error.tsx`:
 *   - production: log only the Next.js-generated digest hash (R3-003).
 *   - dev: log the full error so the developer can debug.
 *
 * The ErrorState component (variant=page) provides the canonical
 * red-tinted, retry-aware error UI per MASTER-QA P1-1/P1-2.
 */

import { useEffect } from 'react';

import { ErrorState } from '@/components/ui/ErrorState';

export default function ShellSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      console.error('Shell segment error:', error.digest ?? 'unknown');
    } else {
      console.error('Shell segment error:', error);
    }
  }, [error]);

  return (
    <div data-testid="shell-segment-error" data-error-segment="shell">
      <ErrorState
        variant="page"
        title="This page failed to load"
        message="An unexpected error interrupted this page. The shell navigation is still functional — retry or use the Rail to move to another section."
        error={error}
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
