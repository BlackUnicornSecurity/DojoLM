'use client'

/**
 * File: TimeChamberWidget.tsx
 * Purpose: Time Chamber temporal attack status — plan count, attack types, recent activity
 * Story: H18.7
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_TIME_CHAMBER = {
  plans: 20,
  attackTypes: 5,
  lastRun: '2 hours ago',
  topTypes: [
    { name: 'Replay Attack', plans: 6 },
    { name: 'Session Fixation', plans: 5 },
    { name: 'Token Reuse', plans: 4 },
  ],
}

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
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{MOCK_TIME_CHAMBER.plans}</span>
          <span className="text-xs text-muted-foreground">plans</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {MOCK_TIME_CHAMBER.attackTypes} attack types
          </span>
        </div>

        <ul className="space-y-1">
          {MOCK_TIME_CHAMBER.topTypes.map((t) => (
            <li key={t.name} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t.name}</span>
              <span className={cn('font-medium tabular-nums')}>{t.plans}</span>
            </li>
          ))}
        </ul>

        <div className="text-xs text-muted-foreground">
          Last run: {MOCK_TIME_CHAMBER.lastRun}
        </div>
      </div>
    </WidgetCard>
  )
}
