'use client'

/**
 * File: LLMBatchProgress.tsx
 * Purpose: Active LLM batch progress bars with polling
 * Story: TPI-NODA-1.5.6
 */

import { useState, useEffect, useRef } from 'react'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'
import { WidgetCard } from '../WidgetCard'
import { useNavigation } from '@/lib/NavigationContext'
import { cn } from '@/lib/utils'
import { Brain, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface BatchInfo {
  id: string
  name: string
  status: string
  totalTests: number
  completedTests: number
  failedTests: number
}

const MAX_SHOWN = 3
const POLL_INTERVAL = 5000

export function LLMBatchProgress() {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const { setActiveTab } = useNavigation()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchBatches() {
      try {
        const res = await fetchWithAuth('/api/llm/batch?status=running')
        if (res.ok && !cancelled) {
          const data = await res.json()
          setBatches(Array.isArray(data) ? data : data.batches ?? [])
        }
      } catch {
        // Silent failure
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBatches()
    intervalRef.current = setInterval(fetchBatches, POLL_INTERVAL)

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const shown = batches.slice(0, MAX_SHOWN)
  const overflow = batches.length - MAX_SHOWN

  return (
    <WidgetCard title="LLM Batch Progress">
      <div className="space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 motion-safe:animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {!loading && shown.length === 0 && (
          <div className="text-center py-4 space-y-2">
            <Brain className="w-8 h-8 mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">No active tests</p>
            <button
              onClick={() => setActiveTab('llm')}
              className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]"
            >
              Go to LLM Dashboard
            </button>
          </div>
        )}

        {shown.map(batch => {
          const safeTotal = batch.totalTests > 0 ? batch.totalTests : 1
          const pct = Math.round((batch.completedTests / safeTotal) * 100)
          return (
            <div key={batch.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate flex-1">{batch.name || batch.id}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    batch.status === 'running' ? 'bg-blue-500 motion-safe:animate-pulse' : 'bg-green-500'
                  )} />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {batch.completedTests}/{batch.totalTests}
                  </span>
                </div>
              </div>
              <EnhancedProgress
                value={pct}
                max={100}
                color={batch.failedTests > 0 ? 'warning' : 'primary'}
                size="sm"
              />
            </div>
          )
        })}

        {overflow > 0 && (
          <button
            onClick={() => setActiveTab('llm')}
            className="text-xs text-muted-foreground hover:text-foreground w-full text-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]"
          >
            +{overflow} more batch{overflow !== 1 ? 'es' : ''}
          </button>
        )}
      </div>
    </WidgetCard>
  )
}
