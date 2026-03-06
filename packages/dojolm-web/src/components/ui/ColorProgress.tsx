/**
 * File: ColorProgress.tsx
 * Purpose: Progress bar with semantic color based on value (red→amber→green)
 * Story: TPI-UI-001-16
 */

import { cn } from '@/lib/utils'

interface ColorProgressProps {
  value: number  // 0-100
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'var(--success)'
  if (value >= 50) return 'var(--warning)'
  return 'var(--danger)'
}

export function ColorProgress({ value, showLabel = false, size = 'md', className }: ColorProgressProps) {
  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("flex items-center gap-2", className)} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("w-full overflow-hidden rounded-full bg-[var(--bg-quaternary)]", heights[size])}>
        <div
          className="h-full rounded-full motion-safe:transition-all motion-safe:duration-[var(--transition-emphasis)] ease-out"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: getProgressColor(clampedValue),
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground tabular-nums min-w-[3ch]">
          {Math.round(clampedValue)}%
        </span>
      )}
    </div>
  )
}
