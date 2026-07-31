// SPDX-License-Identifier: Apache-2.0
/**
 * File: LoadingState.tsx
 * Purpose: Canonical loading-state UI — three variants (page / row / inline)
 * Story: Wave 9.1 / ADR-0082 (UX-STATE-AUDIT-NORMALIZE)
 *
 * Replaces and consolidates:
 * - src/components/ui/PageSkeletons.tsx (ScannerPageSkeleton / ArmorySkeleton / CoverageSkeleton)
 * - src/components/ui/ShimmerSkeleton.tsx (ShimmerSkeleton / MetricCardSkeleton / ChartSkeleton)
 *
 * The shadcn skeleton primitive at src/components/ui/skeleton.tsx stays —
 * LoadingState is the compound-component contract for feature code.
 *
 * Usage:
 *   <LoadingState variant="inline" label="Loading matches" />
 *   <LoadingState variant="row" count={5} />
 *   <LoadingState variant="page" />
 */

import { cn } from '@/lib/utils'

export interface LoadingStateProps {
  /** Layout. 'inline' compact text, 'row' repeated skeleton rows, 'page' full-page skeleton. */
  variant?: 'inline' | 'row' | 'page'
  /**
   * Number of skeleton rows rendered.
   * - 'row' variant: defaults to 3, minimum 1.
   * - 'page' variant: body-row count, defaults to 4, minimum 1.
   * - 'inline' variant: ignored.
   */
  count?: number
  /** Accessible label. Used for aria-label ('row' / 'page') or as text prefix ('inline'). Default 'Loading'. */
  label?: string
  className?: string
}

/**
 * LoadingState — canonical loading UI used across every tab/module.
 *
 * Accessibility:
 * - role='status' + aria-busy='true' on the outer element.
 * - aria-live='polite' on the inline variant so screen readers announce
 *   short messages without interrupting.
 * - Skeleton bars are aria-hidden so they don't pollute the SR tree.
 * - Respects prefers-reduced-motion via the shared `.animate-shimmer`
 *   utility defined in globals.css (shimmer → no animation).
 */
export function LoadingState({
  variant = 'inline',
  count,
  label = 'Loading',
  className,
}: LoadingStateProps) {
  if (variant === 'inline') {
    const text = label === 'Loading' ? 'Loading…' : `${label}…`
    return (
      <p
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn('text-xs text-muted-foreground', className)}
      >
        {text}
      </p>
    )
  }

  if (variant === 'row') {
    const rows = Math.max(1, count ?? 3)
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className={cn('space-y-2', className)}
      >
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className="h-12 w-full rounded-lg animate-shimmer"
            aria-hidden="true"
          />
        ))}
      </div>
    )
  }

  const bodyRows = Math.max(1, count ?? 4)
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn('space-y-6', className)}
    >
      <div className="space-y-2" aria-hidden="true">
        <div className="h-8 w-40 rounded-lg animate-shimmer" />
        <div className="h-4 w-56 rounded animate-shimmer" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg animate-shimmer" />
        ))}
      </div>
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: bodyRows }, (_, i) => (
          <div key={i} className="h-12 w-full rounded-lg animate-shimmer" />
        ))}
      </div>
    </div>
  )
}
