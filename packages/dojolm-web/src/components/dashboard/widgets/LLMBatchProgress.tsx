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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { FlaskConical, Loader2 } from 'lucide-react'
import { WidgetEmptyState } from '../WidgetEmptyState'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
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
const POLL_INTERVAL_BASE = 5000
const POLL_INTERVAL_IDLE = 30000
const POLL_INTERVAL_MAX = 60000
const MAX_CONSECUTIVE_ERRORS = 5

export function LLMBatchProgress() {
  const [batches, setBatches] = useState<BatchInfo[]>([])
  const [loading, setLoading] = useState(true)
  const { setActiveTab } = useNavigation()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorCountRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    function scheduleNext(delayMs: number) {
      if (cancelled) return
      timeoutRef.current = setTimeout(fetchBatches, delayMs)
    }

    async function fetchBatches() {
      try {
        if (!(await canAccessProtectedApi())) {
          if (!cancelled) {
            setBatches([])
            errorCountRef.current = 0
            scheduleNext(POLL_INTERVAL_IDLE)
          }
          return
        }

        const res = await fetchWithAuth('/api/llm/batch?status=running')
        if (res.ok && !cancelled) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : data.batches ?? []
          setBatches(list)
          errorCountRef.current = 0
          // Poll frequently when batches are running, slowly when idle
          scheduleNext(list.length > 0 ? POLL_INTERVAL_BASE : POLL_INTERVAL_IDLE)
        } else if (!cancelled) {
          errorCountRef.current++
          if (errorCountRef.current < MAX_CONSECUTIVE_ERRORS) {
            const backoff = Math.min(POLL_INTERVAL_BASE * 2 ** errorCountRef.current, POLL_INTERVAL_MAX)
            scheduleNext(backoff)
          }
          // Stop polling after MAX_CONSECUTIVE_ERRORS
        }
      } catch {
        if (!cancelled) {
          errorCountRef.current++
          if (errorCountRef.current < MAX_CONSECUTIVE_ERRORS) {
            const backoff = Math.min(POLL_INTERVAL_BASE * 2 ** errorCountRef.current, POLL_INTERVAL_MAX)
            scheduleNext(backoff)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBatches()

    return () => {
      cancelled = true
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
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
          <WidgetEmptyState
            icon={FlaskConical}
            title="No active tests"
            description="Queued or completed evaluations will appear here. Launch a batch from the LLM dashboard to monitor it live."
            action={{ label: 'Go to Model Lab', onClick: () => setActiveTab('jutsu') }}
          />
        )}

        {shown.map(batch => {
          const safeTotal = batch.totalTests > 0 ? batch.totalTests : 1
          const pct = Math.round((batch.completedTests / safeTotal) * 100)
          return (
            <div key={batch.id} className="space-y-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium truncate flex-1">{batch.name || batch.id}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    batch.status === 'running' ? 'bg-[var(--status-running)] motion-safe:animate-pulse' : 'bg-[var(--status-online)]'
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('jutsu')}
            className="w-full text-xs"
          >
            +{overflow} more batch{overflow !== 1 ? 'es' : ''}
          </Button>
        )}
      </div>
    </WidgetCard>
  )
}
