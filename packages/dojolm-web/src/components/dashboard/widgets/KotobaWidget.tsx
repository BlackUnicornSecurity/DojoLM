'use client'

/**
 * File: KotobaWidget.tsx
 * Purpose: Kotoba Studio prompt optimization status — rule count, avg score, grade
 * Story: H19.7
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_KOTOBA = {
  rules: 24,
  avgScore: 78,
  grade: 'B+',
}

export function KotobaWidget() {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="Kotoba Studio"
      actions={
        <button
          onClick={() => setActiveTab('kotoba')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="Open Kotoba Studio"
        >
          Open
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{MOCK_KOTOBA.rules}</span>
          <span className="text-xs text-muted-foreground">rules</span>
          <span className={cn(
            'ml-auto px-1.5 py-0.5 text-xs font-bold rounded',
            'bg-[var(--status-allow-bg)] text-[var(--status-allow)]'
          )}>
            {MOCK_KOTOBA.grade}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Avg Score</span>
            <span className="font-medium tabular-nums">{MOCK_KOTOBA.avgScore}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--dojo-primary)]"
              style={{ width: `${MOCK_KOTOBA.avgScore}%` }}
            />
          </div>
        </div>
      </div>
    </WidgetCard>
  )
}
