'use client'

/**
 * File: SengokuWidget.tsx
 * Purpose: Sengoku campaign summary — campaign count, active status, findings, regressions
 * Story: H17.9
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_SENGOKU = {
  campaigns: 3,
  running: 1,
  findings: 17,
  regressions: 2,
}

export function SengokuWidget() {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="Sengoku Campaigns"
      actions={
        <button
          onClick={() => setActiveTab('sengoku')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
        >
          Open
        </button>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{MOCK_SENGOKU.campaigns}</span>
          <span className="text-xs text-muted-foreground">campaigns</span>
          <span className={cn(
            'ml-auto px-1.5 py-0.5 text-xs font-medium rounded',
            'bg-[var(--status-allow-bg)] text-[var(--status-allow)]'
          )}>
            {MOCK_SENGOKU.running} RUNNING
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Findings</span>
          <span className="font-medium tabular-nums">{MOCK_SENGOKU.findings}</span>
        </div>

        {MOCK_SENGOKU.regressions > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {MOCK_SENGOKU.regressions} regressions
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
