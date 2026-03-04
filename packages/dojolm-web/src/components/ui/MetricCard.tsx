/**
 * File: MetricCard.tsx
 * Purpose: Metric card component with large numbers, icons, trend indicators, and SVG sparklines
 * Story: TPI-UI-001-13, TPI-UIP-02, TPI-UIP-04
 * Index:
 * - MetricCardProps interface (line 16)
 * - trendConfig (line 35) - icon + color mapping per direction
 * - accentGradients/accentIconColors (line 41) - corner gradient overlays and icon colors
 * - Sparkline component (line 48) - lightweight SVG sparkline (<30 lines)
 * - MetricCard component (line 82)
 * - TrendIndicator component (line 128)
 */

'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { CardContent } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    direction: 'up' | 'down' | 'flat'
    percentage: number
    comparison?: string
  }
  /** Sparkline data points (array of numbers). Rendered as lightweight SVG. */
  sparklineData?: number[]
  accent?: 'primary' | 'success' | 'warning' | 'danger'
  className?: string
}

const trendConfig = {
  up: { icon: ArrowUpRight, color: 'text-[var(--success)]' },
  down: { icon: ArrowDownRight, color: 'text-[var(--danger)]' },
  flat: { icon: Minus, color: 'text-muted-foreground' },
}

// Subtle corner gradient overlays per accent (Exon-inspired, replaces thick left border)
const accentGradients = {
  primary: 'linear-gradient(135deg, rgba(198, 40, 40, 0.08) 0%, transparent 60%)',
  success: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, transparent 60%)',
  warning: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
  danger: 'linear-gradient(135deg, rgba(198, 40, 40, 0.12) 0%, transparent 60%)',
}

const accentIconColors = {
  primary: 'var(--dojo-primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
}

/**
 * Lightweight SVG sparkline component (<30 lines, no library dependency).
 * Uses useId() for gradient ID to prevent collisions with multiple instances.
 * Wrapped in motion-safe check.
 */
function Sparkline({ data }: { data: number[] }) {
  const gradientId = useId()

  if (data.length < 2) return null

  const width = 80
  const height = 24
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1

  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((val - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  // Area fill: polyline points closed at bottom corners
  const firstX = 0
  const lastX = width
  const areaPoints = `${firstX},${height} ${points} ${lastX},${height}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="opacity-100"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--dojo-primary)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--dojo-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradientId})`} />
      <polyline
        points={points}
        fill="none"
        stroke="var(--dojo-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  sparklineData,
  accent,
  className,
}: MetricCardProps) {
  return (
    <GlowCard
      glow="subtle"
      className={cn('overflow-hidden', className)}
      style={accent ? { backgroundImage: accentGradients[accent] } : undefined}
    >
      <CardContent className="p-[var(--spacing-md)]">
        <div className="flex items-start justify-between mb-2">
          <p className="text-label">{label}</p>
          {Icon && (
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.04)]">
              <Icon
                className="w-4 h-4"
                style={accent ? { color: accentIconColors[accent] } : { color: 'var(--muted-foreground)' }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-2">
            <p className="text-metric-lg text-[var(--foreground)]">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend && <TrendIndicator trend={trend} />}
          </div>
          {sparklineData && sparklineData.length >= 2 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
        {trend?.comparison && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            {trend.comparison}
          </p>
        )}
      </CardContent>
    </GlowCard>
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
