'use client'

/**
 * File: SAGEStatusWidget.tsx
 * Purpose: SAGE evolution status — no live backend yet; shows not-available state
 * Story: TPI-NODA-1.5.8; Story 2.1.3 — mock data removed per Fixed Decision 6
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'

export function SAGEStatusWidget() {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="SAGE Evolution"
      actions={
        <button
          onClick={() => setActiveTab('buki')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="Open SAGE in Buki"
        >
          Open
        </button>
      }
    >
      <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
        <p className="text-xs text-muted-foreground">Not yet available</p>
        <p className="text-xs text-muted-foreground/60">SAGE backend integration in progress</p>
      </div>
    </WidgetCard>
  )
}
