/**
 * File: ShimmerSkeleton.tsx
 * Purpose: Shimmer gradient loading skeletons with preset layouts
 * Story: TPI-UI-001-16
 */

import { cn } from '@/lib/utils'

interface ShimmerSkeletonProps {
  className?: string
  variant?: 'line' | 'card' | 'circle' | 'metric'
}

export function ShimmerSkeleton({ className, variant = 'line' }: ShimmerSkeletonProps) {
  const variants = {
    line: 'h-4 w-full rounded',
    card: 'h-32 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full',
    metric: 'h-20 w-full rounded-lg',
  }

  return (
    <div
      className={cn("animate-shimmer rounded-lg", variants[variant], className)}
      aria-hidden="true"
    />
  )
}

/** Preset: Metric card skeleton */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-3">
      <ShimmerSkeleton variant="line" className="h-3 w-20" />
      <ShimmerSkeleton variant="line" className="h-8 w-28" />
      <ShimmerSkeleton variant="line" className="h-3 w-16" />
    </div>
  )
}

/** Preset: Chart skeleton */
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-[var(--spacing-md)] space-y-3">
      <ShimmerSkeleton variant="line" className="h-3 w-32" />
      <ShimmerSkeleton variant="card" className="h-[300px]" />
    </div>
  )
}
