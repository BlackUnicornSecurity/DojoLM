/**
 * File: MetricCard.tsx
 * Purpose: Metric card component with large numbers and trend indicators
 * Story: TPI-UI-001-13
 * Index:
 * - MetricCardProps interface (line 14)
 * - trendConfig (line 27) - icon + color mapping per direction
 * - accentColorValues (line 33) - CSS variable values for accent borders
 * - MetricCard component (line 41)
 */

'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: string | number
  trend?: {
    direction: 'up' | 'down' | 'flat'
    percentage: number
    comparison?: string
  }
  accent?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const trendConfig = {
  up: { icon: ArrowUpRight, color: 'text-[var(--success)]' },
  down: { icon: ArrowDownRight, color: 'text-[var(--danger)]' },
  flat: { icon: Minus, color: 'text-[var(--muted-foreground)]' },
}

// Using CSS variable values for inline style to avoid Tailwind border-l specificity conflict
const accentColorValues = {
  primary: 'var(--dojo-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

export function MetricCard({
  label,
  value,
  trend,
  accent,
  className,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "motion-safe:transition-shadow motion-safe:duration-[var(--transition-normal)]",
        "hover:shadow-lg",
        accent && "border-l-4",
        className
      )}
      style={accent ? { borderLeftColor: accentColorValues[accent] } : undefined}
    >
      <CardContent className="p-[var(--spacing-md)]">
        <p className="text-sm text-[var(--muted-foreground)] mb-1">{label}</p>
        <div className="flex items-end justify-between">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && <TrendIndicator trend={trend} />}
        </div>
        {trend?.comparison && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {trend.comparison}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function TrendIndicator({ trend }: { trend: NonNullable<MetricCardProps['trend']> }) {
  const { icon: TrendIcon, color } = trendConfig[trend.direction]
  return (
    <div className="flex items-center gap-1">
      <TrendIcon className={cn("w-4 h-4", color)} aria-hidden="true" />
      <span className={cn("text-sm font-medium", color)}>
        {trend.percentage}%
      </span>
    </div>
  )
}
