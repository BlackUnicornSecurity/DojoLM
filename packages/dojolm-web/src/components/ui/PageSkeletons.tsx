/**
 * File: PageSkeletons.tsx
 * Purpose: Page-specific skeleton layouts matching actual content dimensions (CLS prevention)
 * Story: TPI-UIP-09
 * Index:
 * - ScannerPageSkeleton (line 12)
 * - TestLabSkeleton (line 38)
 * - CoverageSkeleton (line 59)
 */

import { ShimmerSkeleton, MetricCardSkeleton } from './ShimmerSkeleton'

/** Scanner page skeleton: 4x MetricCards + input area + findings area */
export function ScannerPageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading scanner">
      {/* Toolbar skeleton */}
      <div className="space-y-2" aria-hidden="true">
        <ShimmerSkeleton variant="line" className="h-8 w-32" />
        <ShimmerSkeleton variant="line" className="h-4 w-48" />
      </div>

      {/* Metric cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-hidden="true">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Filter pills skeleton */}
      <div className="flex gap-2" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(i => (
          <ShimmerSkeleton key={i} variant="line" className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Scanner grid skeleton */}
      <div className="grid lg:grid-cols-2 gap-6" aria-hidden="true">
        <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-4">
          <ShimmerSkeleton variant="line" className="h-5 w-24" />
          <ShimmerSkeleton variant="card" className="h-[200px]" />
          <div className="flex gap-2">
            <ShimmerSkeleton variant="line" className="h-10 w-24" />
            <ShimmerSkeleton variant="line" className="h-10 w-20" />
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-4">
          <ShimmerSkeleton variant="line" className="h-5 w-32" />
          <ShimmerSkeleton variant="card" className="h-[200px]" />
        </div>
      </div>
    </div>
  )
}

/** Test Lab skeleton: sub-nav + grid of card skeletons */
export function TestLabSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading test lab">
      {/* Toolbar skeleton */}
      <div className="space-y-2" aria-hidden="true">
        <ShimmerSkeleton variant="line" className="h-8 w-28" />
        <ShimmerSkeleton variant="line" className="h-4 w-44" />
      </div>

      {/* Sub-navigation skeleton */}
      <div className="flex gap-2 bg-muted/50 rounded-lg p-1" aria-hidden="true">
        <ShimmerSkeleton variant="line" className="h-10 w-24 rounded-md" />
        <ShimmerSkeleton variant="line" className="h-10 w-28 rounded-md" />
      </div>

      {/* Card grid skeleton */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-3">
            <div className="flex items-center gap-3">
              <ShimmerSkeleton variant="circle" className="h-8 w-8" />
              <ShimmerSkeleton variant="line" className="h-5 w-32" />
            </div>
            <ShimmerSkeleton variant="line" className="h-3 w-full" />
            <ShimmerSkeleton variant="line" className="h-8 w-full rounded-full" />
            <ShimmerSkeleton variant="line" className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Coverage page skeleton: chart + progress bars */
export function CoverageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading coverage">
      {/* Toolbar skeleton */}
      <div className="space-y-2" aria-hidden="true">
        <ShimmerSkeleton variant="line" className="h-8 w-28" />
        <ShimmerSkeleton variant="line" className="h-4 w-56" />
      </div>

      {/* Sub-navigation skeleton */}
      <div className="flex gap-2 bg-muted/50 rounded-lg p-1" aria-hidden="true">
        <ShimmerSkeleton variant="line" className="h-10 w-28 rounded-md" />
        <ShimmerSkeleton variant="line" className="h-10 w-32 rounded-md" />
      </div>

      {/* Chart area skeleton */}
      <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-4" aria-hidden="true">
        <div className="flex items-center justify-between">
          <ShimmerSkeleton variant="line" className="h-6 w-40" />
          <div className="flex gap-2">
            <ShimmerSkeleton variant="line" className="h-8 w-24 rounded-md" />
            <ShimmerSkeleton variant="line" className="h-8 w-32 rounded-md" />
          </div>
        </div>
        {/* Progress bars skeleton */}
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <ShimmerSkeleton variant="line" className="h-3 w-32" />
              <ShimmerSkeleton variant="line" className="h-3 w-12" />
            </div>
            <ShimmerSkeleton variant="line" className="h-3 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
