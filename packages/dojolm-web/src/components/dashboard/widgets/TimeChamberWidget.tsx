'use client'

/**
 * File: TimeChamberWidget.tsx
 * Purpose: Time Chamber temporal attack status — no live backend yet; shows not-available state
 * Story: H18.7; Story 2.1.3 — mock data removed per Fixed Decision 6
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'

export function TimeChamberWidget() {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="Time Chamber"
      actions={
        <button
          onClick={() => setActiveTab('sengoku')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="Open Time Chamber"
        >
          Open
        </button>
      }
    >
      <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
        <p className="text-xs text-muted-foreground">Not yet available</p>
        <p className="text-xs text-muted-foreground/60">Time Chamber backend integration in progress</p>
      </div>
    </WidgetCard>
  )
}
