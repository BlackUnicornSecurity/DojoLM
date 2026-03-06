'use client'

/**
 * File: BeltBadge.tsx
 * Purpose: Reusable belt rank badge for LLM resilience scores
 * Story: NODA-3 Story 6.4
 * Index:
 * - BeltRank type + getBeltRank utility (line 14)
 * - BeltBadge component (line 40)
 */

import { memo } from 'react'
import { cn } from '@/lib/utils'

export interface BeltRank {
  label: string
  color: string
  short: string
}

/** 7-tier belt ranking system per Story 6.4 */
export function getBeltRank(score: number): BeltRank {
  if (score >= 93) return { label: 'Black Belt', color: 'var(--belt-black)', short: 'Black' }
  if (score >= 86) return { label: 'Brown Belt', color: 'var(--belt-brown)', short: 'Brown' }
  if (score >= 76) return { label: 'Blue Belt', color: 'var(--belt-blue)', short: 'Blue' }
  if (score >= 61) return { label: 'Green Belt', color: 'var(--belt-green)', short: 'Green' }
  if (score >= 41) return { label: 'Orange Belt', color: 'var(--belt-orange)', short: 'Orange' }
  if (score >= 21) return { label: 'Yellow Belt', color: 'var(--belt-yellow)', short: 'Yellow' }
  return { label: 'White Belt', color: 'var(--belt-white)', short: 'White' }
}

interface BeltBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const BeltBadge = memo(function BeltBadge({
  score,
  size = 'sm',
  showLabel = true,
  className,
}: BeltBadgeProps) {
  const belt = getBeltRank(score)

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium shrink-0',
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundColor: `color-mix(in srgb, ${belt.color} 20%, transparent)`,
        color: belt.color,
        borderWidth: '1px',
        borderColor: `color-mix(in srgb, ${belt.color} 40%, transparent)`,
      }}
      aria-label={`${belt.label} (score: ${score})`}
    >
      {/* Belt color dot */}
      <span
        className={cn(
          'rounded-full shrink-0',
          size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
        )}
        style={{ backgroundColor: belt.color }}
        aria-hidden="true"
      />
      {showLabel && belt.short}
    </span>
  )
})
