'use client'

/**
 * File: BeltLegend.tsx
 * Purpose: Belt rank color legend showing all 7 belt tiers
 * Story: HAKONE H5.3
 * Index:
 * - BELT_TIERS (line 13)
 * - BeltLegend component (line 26)
 */

import { cn } from '@/lib/utils'

const BELT_TIERS = [
  { label: 'Black', short: 'Black', range: '93-100', color: 'var(--belt-black)' },
  { label: 'Brown', short: 'Brown', range: '86-92', color: 'var(--belt-brown)' },
  { label: 'Blue', short: 'Blue', range: '76-85', color: 'var(--belt-blue)' },
  { label: 'Green', short: 'Green', range: '61-75', color: 'var(--belt-green)' },
  { label: 'Orange', short: 'Orange', range: '41-60', color: 'var(--belt-orange)' },
  { label: 'Yellow', short: 'Yellow', range: '21-40', color: 'var(--belt-yellow)' },
  { label: 'White', short: 'White', range: '0-20', color: 'var(--belt-white)' },
] as const

interface BeltLegendProps {
  compact?: boolean
  className?: string
}

export function BeltLegend({ compact = false, className }: BeltLegendProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-card p-3',
        className,
      )}
      role="region"
      aria-label="Belt rank legend"
    >
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">BELT RANKS</h4>
      <div className={cn(compact ? 'flex flex-wrap gap-2' : 'space-y-1.5')}>
        {BELT_TIERS.map(tier => (
          <div
            key={tier.label}
            className={cn(
              'flex items-center gap-2',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            <span
              className={cn(
                'rounded-full shrink-0',
                compact ? 'w-2 h-2' : 'w-3 h-3',
              )}
              style={{ backgroundColor: tier.color }}
              aria-hidden="true"
            />
            <span className="font-medium" style={{ color: tier.color }}>{tier.label}</span>
            <span className="text-muted-foreground tabular-nums">{tier.range}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
