'use client'

/**
 * File: EnhancedProgress.tsx
 * Purpose: Enhanced progress bar with glow tip, color variants, and sizes
 * Story: TPI-UIP-07
 * Index:
 * - EnhancedProgressProps interface (line 15)
 * - colorMap (line 27)
 * - EnhancedProgress component (line 39)
 */

import { cn } from '@/lib/utils'

export interface EnhancedProgressProps {
  /** Current value (0 to max) */
  value: number
  /** Maximum value (default 100) */
  max?: number
  /** Color variant mapped to design tokens */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** Show glow effect at the fill endpoint */
  showGlow?: boolean
  /** Bar height variant */
  size?: 'sm' | 'md' | 'lg'
  /** Optional percentage label */
  showLabel?: boolean
  /** Accessible label for screen readers (required for WCAG) */
  'aria-label'?: string
  className?: string
}

const colorMap: Record<NonNullable<EnhancedProgressProps['color']>, string> = {
  primary: 'var(--dojo-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'var(--severity-low)',
}

const glowMap: Record<NonNullable<EnhancedProgressProps['color']>, string> = {
  primary: '0 0 8px rgba(198, 40, 40, 0.4), 0 0 16px rgba(198, 40, 40, 0.2)',
  success: '0 0 8px rgba(34, 197, 94, 0.6)',
  warning: '0 0 8px rgba(245, 158, 11, 0.6)',
  danger: '0 0 8px rgba(198, 40, 40, 0.6)',
  info: '0 0 8px rgba(59, 130, 246, 0.6)',
}

const heightMap: Record<NonNullable<EnhancedProgressProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

export function EnhancedProgress({
  value,
  max = 100,
  color = 'primary',
  showGlow = false,
  size = 'md',
  showLabel = false,
  'aria-label': ariaLabel = 'Progress',
  className,
}: EnhancedProgressProps) {
  const safeMax = max > 0 ? max : 100
  const clampedValue = Math.min(safeMax, Math.max(0, value))
  const percentage = Math.min(100, Math.max(0, (clampedValue / safeMax) * 100))
  const fillColor = colorMap[color]
  const glow = glowMap[color]

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={safeMax}
    >
      <div className={cn(
        'w-full overflow-hidden rounded-full bg-[var(--border-subtle)]',
        heightMap[size]
      )}>
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-[var(--transition-emphasis)] motion-safe:ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: fillColor,
            ...(showGlow && percentage > 0 ? { boxShadow: glow } : {}),
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground tabular-nums min-w-[4ch]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
