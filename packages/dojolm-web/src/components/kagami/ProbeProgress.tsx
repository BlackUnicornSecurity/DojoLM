'use client'

/**
 * File: ProbeProgress.tsx
 * Purpose: Real-time probe execution progress with SSE streaming
 * Story: K5.3
 * Index:
 * - PhaseIndicator (line ~30)
 * - ProbeProgressProps interface (line ~20)
 * - ProbeProgress component (line ~50)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Activity, Search, BarChart3, GitCompare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KagamiProgress } from 'bu-tpi/fingerprint'
import { connectAuthenticatedEventStream } from '@/lib/authenticated-event-stream'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProbeProgressProps {
  /** SSE stream endpoint ID — connects to /api/llm/fingerprint/stream/[id] */
  readonly streamId: string
  /** Called when stream completes — receives the result data from the SSE stream */
  readonly onComplete?: (result?: unknown) => void
  /** Called on stream error */
  readonly onError?: (error: string) => void
}

// ---------------------------------------------------------------------------
// Phase config
// ---------------------------------------------------------------------------

const PHASE_CONFIG = {
  probing: { label: 'Probing', icon: Search, color: 'text-[var(--info)]' },
  analyzing: { label: 'Analyzing', icon: BarChart3, color: 'text-[var(--warning)]' },
  matching: { label: 'Matching', icon: GitCompare, color: 'text-[var(--success)]' },
} as const

const PHASE_ORDER: readonly KagamiProgress['phase'][] = ['probing', 'analyzing', 'matching']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProbeProgress({ streamId, onComplete, onError }: ProbeProgressProps) {
  const [progress, setProgress] = useState<KagamiProgress>({
    current: 0,
    total: 0,
    phase: 'probing',
    currentProbe: undefined,
  })
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Elapsed timer
  useEffect(() => {
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      const startTime = startTimeRef.current ?? Date.now()
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // SSE connection
  useEffect(() => {
    const eventSource = connectAuthenticatedEventStream(`/api/llm/fingerprint/stream/${streamId}`)

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        // fingerprint-state emits { phase: 'complete', result } on finish
        if (data.phase === 'complete') {
          eventSource.close()
          if (timerRef.current) clearInterval(timerRef.current)
          onComplete?.(data.result)
          return
        }
        // fingerprint-state emits { phase: 'error', error } on failure
        if (data.phase === 'error') {
          eventSource.close()
          if (timerRef.current) clearInterval(timerRef.current)
          onError?.(data.error ?? 'Unknown error')
          return
        }
        setProgress({
          current: data.current,
          total: data.total,
          phase: data.phase,
          currentProbe: data.currentProbe,
        })
      } catch {
        // Ignore malformed messages
      }
    }

    const handleError = () => {
      eventSource.close()
      if (timerRef.current) clearInterval(timerRef.current)
      onError?.('Stream connection lost')
    }

    eventSource.addEventListener('message', handleMessage)
    eventSource.addEventListener('error', handleError)

    return () => {
      eventSource.close()
    }
  }, [streamId, onComplete, onError])

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  const estimatedRemaining = progress.current > 0 && progress.total > 0
    ? Math.round((elapsed / progress.current) * (progress.total - progress.current))
    : null

  const formatTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }, [])

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Phase indicator */}
        <div className="flex items-center gap-6">
          {PHASE_ORDER.map((phase, idx) => {
            const config = PHASE_CONFIG[phase]
            const Icon = config.icon
            const isActive = progress.phase === phase
            const isPast = PHASE_ORDER.indexOf(progress.phase) > idx

            return (
              <div key={phase} className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border',
                  isActive && 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10',
                  isPast && 'border-[var(--success)] bg-[var(--success)]/10',
                  !isActive && !isPast && 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]',
                )}>
                  <Icon className={cn(
                    'h-4 w-4',
                    isActive && config.color,
                    isPast && 'text-[var(--success)]',
                    !isActive && !isPast && 'text-muted-foreground',
                  )} aria-hidden="true" />
                </div>
                <span className={cn(
                  'text-sm font-medium',
                  isActive ? 'text-[var(--foreground)]' : 'text-muted-foreground',
                )}>
                  {config.label}
                </span>
                {idx < PHASE_ORDER.length - 1 && (
                  <div className={cn(
                    'w-8 h-px',
                    isPast ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]',
                  )} />
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Probe {progress.current} / {progress.total}
            </span>
            <span className="text-muted-foreground">{pct}%</span>
          </div>
          <div
            className="h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Fingerprint probe progress"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--dojo-primary)] to-[var(--dojo-hover)] motion-safe:transition-all motion-safe:duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Current probe + timing */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-3.5 w-3.5 text-muted-foreground shrink-0 motion-safe:animate-pulse" aria-hidden="true" />
            <span className="text-muted-foreground truncate">
              {progress.currentProbe ?? 'Initializing...'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Badge variant="default">{formatTime(elapsed)} elapsed</Badge>
            {estimatedRemaining !== null && (
              <Badge variant="default">~{formatTime(estimatedRemaining)} remaining</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
