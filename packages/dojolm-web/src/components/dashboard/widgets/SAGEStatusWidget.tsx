'use client'

/**
 * File: SAGEStatusWidget.tsx
 * Purpose: SAGE evolution status — generation, best fitness, sparkline, play/pause
 * Story: TPI-NODA-1.5.8
 */

import { useState } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { MetricCard } from '@/components/ui/MetricCard'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Play, Pause, AlertTriangle } from 'lucide-react'

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_SAGE = {
  generation: 142,
  bestFitness: 0.94,
  status: 'running' as const,
  quarantineCount: 3,
  fitnessHistory: [0.72, 0.78, 0.81, 0.85, 0.94],
}

export function SAGEStatusWidget() {
  const { setActiveTab } = useNavigation()
  const [isRunning, setIsRunning] = useState(MOCK_SAGE.status === 'running')

  return (
    <WidgetCard
      title="SAGE Evolution"
      actions={
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={cn(
              'p-1 rounded',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]',
              isRunning ? 'text-[var(--dojo-primary)]' : 'text-muted-foreground'
            )}
            aria-label={isRunning ? 'Pause SAGE (preview only)' : 'Resume SAGE (preview only)'}
            title="Preview only — not connected to SAGE engine"
          >
            {isRunning
              ? <Pause className="w-3.5 h-3.5" aria-hidden="true" />
              : <Play className="w-3.5 h-3.5" aria-hidden="true" />
            }
          </button>
          <button
            onClick={() => setActiveTab('strategic')}
            className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]"
          >
            Open
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold tabular-nums">{MOCK_SAGE.generation}</span>
          <span className="text-xs text-muted-foreground">generation</span>
          <span className={cn(
            'ml-auto px-1.5 py-0.5 text-xs font-medium rounded',
            isRunning
              ? 'bg-green-500/20 text-green-400'
              : 'bg-muted text-muted-foreground'
          )}>
            {isRunning ? 'RUNNING' : 'PAUSED'}
          </span>
        </div>

        <MetricCard
          label="Best Fitness"
          value={MOCK_SAGE.bestFitness.toFixed(2)}
          sparklineData={MOCK_SAGE.fitnessHistory}
          accent="success"
        />

        {MOCK_SAGE.quarantineCount > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {MOCK_SAGE.quarantineCount} quarantined
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
