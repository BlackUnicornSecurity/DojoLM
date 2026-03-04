/**
 * File: SessionRecorder.tsx
 * Purpose: Recording controls for Atemi Lab sessions — Record/Stop/Cancel with elapsed timer
 * Story: P3.2 - Atemi Lab Session Recording
 * Index:
 * - computeSummary helper (line 18)
 * - SessionRecorderProps interface (line 42)
 * - SessionRecorder component (line 48)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Circle, Square, X as XIcon } from 'lucide-react'
import { loadSessions, saveSessions, loadConfigSnapshot, MAX_SESSIONS } from '@/lib/atemi-session-storage'
import type {
  AtemiSession,
  AtemiSessionEvent,
  AtemiSessionSummary,
  SeverityCounts,
} from '@/lib/atemi-session-types'

function computeSummary(events: AtemiSessionEvent[], startedAt: string, endedAt: string): AtemiSessionSummary {
  const bySeverity: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 }
  const toolCounts: Record<string, number> = {}

  for (const e of events) {
    if (Object.hasOwn(bySeverity, e.severity)) {
      bySeverity[e.severity as keyof SeverityCounts]++
    }
    if (e.toolId) {
      toolCounts[e.toolId] = (toolCounts[e.toolId] ?? 0) + 1
    }
  }

  const topTools = Object.entries(toolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime()

  return { totalEvents: events.length, bySeverity, durationMs: Math.max(0, durationMs), topTools }
}

export interface SessionRecorderProps {
  /** Current attack mode — included in demo events */
  mode?: string
  className?: string
}

export function SessionRecorder({ mode = 'passive', className }: SessionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSec, setElapsedSec] = useState(0)
  const sessionRef = useRef<AtemiSession | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleStart = useCallback(() => {
    const now = new Date().toISOString()
    const id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const config = loadConfigSnapshot()

    sessionRef.current = {
      id,
      name: `Session ${new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      status: 'recording',
      startedAt: now,
      config,
      events: [
        {
          id: `${id}-ev-0`,
          timestamp: now,
          type: 'info',
          severity: 'low',
          message: `Recording started in ${mode} mode`,
        },
      ],
    }

    setIsRecording(true)
    setElapsedSec(0)
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1)
    }, 1000)
  }, [mode])

  const handleStop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (sessionRef.current) {
      const now = new Date().toISOString()
      sessionRef.current.status = 'completed'
      sessionRef.current.endedAt = now
      sessionRef.current.events.push({
        id: `${sessionRef.current.id}-ev-end`,
        timestamp: now,
        type: 'info',
        severity: 'low',
        message: 'Recording stopped',
      })
      sessionRef.current.summary = computeSummary(
        sessionRef.current.events,
        sessionRef.current.startedAt,
        now,
      )

      // Save with FIFO eviction
      const existing = loadSessions()
      const updated = [sessionRef.current, ...existing].slice(0, MAX_SESSIONS)
      saveSessions(updated)
      sessionRef.current = null
    }

    setIsRecording(false)
    setElapsedSec(0)
  }, [])

  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    sessionRef.current = null
    setIsRecording(false)
    setElapsedSec(0)
  }, [])

  const formatElapsed = (sec: number): string => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isRecording ? (
        <>
          {/* Recording indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30">
            <Circle
              className="h-3 w-3 text-[var(--danger)] fill-[var(--danger)] motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <span className="text-xs font-mono font-medium text-[var(--danger)]">
              {formatElapsed(elapsedSec)}
            </span>
          </div>

          {/* Stop button */}
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
            aria-label="Stop recording session"
          >
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            Stop
          </button>

          {/* Cancel button */}
          <button
            onClick={handleCancel}
            className="flex items-center gap-1.5 px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
            aria-label="Cancel recording without saving"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </>
      ) : (
        <button
          onClick={handleStart}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
          aria-label="Start recording Atemi Lab session"
        >
          <Circle className="h-3.5 w-3.5 text-[var(--danger)]" aria-hidden="true" />
          Record
        </button>
      )}
    </div>
  )
}
