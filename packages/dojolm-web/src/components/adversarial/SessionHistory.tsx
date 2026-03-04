/**
 * File: SessionHistory.tsx
 * Purpose: Session history list with slide-in review panel for Atemi Lab recordings
 * Story: P3.2 - Atemi Lab Session Recording
 * Index:
 * - formatDuration helper (line 19)
 * - SessionHistoryProps interface (line 30)
 * - SessionHistory component (line 35)
 * - SessionRow component (line 108)
 * - SessionReviewPanel component (line 152)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Trash2,
  X,
  History,
  AlertTriangle,
  Calendar,
  Zap,
  Settings,
} from 'lucide-react'
import type { AtemiSession } from '@/lib/atemi-session-types'
import { loadSessions, saveSessions, SESSIONS_KEY } from '@/lib/atemi-session-storage'

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remainSec = sec % 60
  if (min < 60) return `${min}m ${remainSec}s`
  const hr = Math.floor(min / 60)
  const remainMin = min % 60
  return `${hr}h ${remainMin}m`
}

export interface SessionHistoryProps {
  className?: string
}

export function SessionHistory({ className }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<AtemiSession[]>([])
  const [expanded, setExpanded] = useState(false)
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null)

  // Load sessions from localStorage
  useEffect(() => {
    setSessions(loadSessions())
  }, [])

  // Listen for storage events (new sessions added by SessionRecorder)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SESSIONS_KEY) {
        setSessions(loadSessions())
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Periodically refresh to pick up same-tab writes (storage event only fires cross-tab).
  // Compare raw JSON to avoid unnecessary re-renders when nothing changed.
  const prevRawRef = useRef<string | null>(null)
  useEffect(() => {
    const interval = setInterval(() => {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(SESSIONS_KEY) : null
      if (raw !== prevRawRef.current) {
        prevRawRef.current = raw
        setSessions(loadSessions())
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleDelete = useCallback((id: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== id)
      saveSessions(updated)
      return updated
    })
    setReviewSessionId((prev) => (prev === id ? null : prev))
  }, [])

  const handleClearAll = useCallback(() => {
    setSessions([])
    saveSessions([])
    setReviewSessionId(null)
  }, [])

  const reviewSession = sessions.find((s) => s.id === reviewSessionId) ?? null

  if (sessions.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-2 w-full text-left px-1 py-1.5 rounded-md hover:bg-[var(--bg-quaternary)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
        aria-expanded={expanded}
        aria-controls="session-history-list"
      >
        <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Session History
        </span>
        <Badge variant="outline" className="text-[10px] ml-1">
          {sessions.length}
        </Badge>
        <span className="ml-auto">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </span>
      </button>

      {expanded && (
        <div id="session-history-list" className="space-y-2">
          {/* Clear all */}
          <div className="flex justify-end">
            <button
              onClick={handleClearAll}
              className="text-xs text-muted-foreground hover:text-[var(--danger)] px-2 py-1 rounded min-h-[32px]"
              aria-label="Clear all session history"
            >
              Clear all
            </button>
          </div>

          {/* Session rows */}
          <div className="space-y-1.5" role="list" aria-label="Recorded sessions">
            {sessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                isActive={reviewSessionId === session.id}
                onReview={() => setReviewSessionId(session.id)}
                onDelete={() => handleDelete(session.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Review panel */}
      {reviewSession && (
        <SessionReviewPanel
          session={reviewSession}
          onClose={() => setReviewSessionId(null)}
          onDelete={() => handleDelete(reviewSession.id)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionRow
// ---------------------------------------------------------------------------

interface SessionRowProps {
  session: AtemiSession
  isActive: boolean
  onReview: () => void
  onDelete: () => void
}

function SessionRow({ session, isActive, onReview, onDelete }: SessionRowProps) {
  const date = new Date(session.startedAt)
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const duration = session.summary?.durationMs ? formatDuration(session.summary.durationMs) : '-'

  return (
    <div
      role="listitem"
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm',
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        isActive
          ? 'border-[var(--dojo-primary)]/50 bg-[var(--dojo-primary)]/5'
          : 'border-[var(--border)] hover:bg-[var(--bg-quaternary)]',
      )}
    >
      <button
        onClick={onReview}
        className="flex-1 flex items-center gap-3 text-left min-h-[36px]"
        aria-label={`Review session: ${session.name}`}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">{session.name}</p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-tertiary)]">
            <span>{dateStr} {timeStr}</span>
            <span aria-hidden="true">|</span>
            <span>{duration}</span>
            <span aria-hidden="true">|</span>
            <span>{session.events.length} events</span>
          </div>
        </div>

        {/* Severity badges */}
        {session.summary && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {session.summary.bySeverity.critical > 0 && (
              <Badge variant="outline" className="text-[9px] border-[var(--danger)]/30 text-[var(--danger)] px-1">
                {session.summary.bySeverity.critical}C
              </Badge>
            )}
            {session.summary.bySeverity.high > 0 && (
              <Badge variant="outline" className="text-[9px] border-[var(--severity-high)]/30 text-[var(--severity-high)] px-1">
                {session.summary.bySeverity.high}H
              </Badge>
            )}
          </div>
        )}
      </button>

      <button
        onClick={onDelete}
        className="p-1.5 rounded-md text-muted-foreground hover:text-[var(--danger)] hover:bg-[var(--bg-quaternary)] min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label={`Delete session: ${session.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SessionReviewPanel (slide-in)
// ---------------------------------------------------------------------------

interface SessionReviewPanelProps {
  session: AtemiSession
  onClose: () => void
  onDelete: () => void
}

function SessionReviewPanel({ session, onClose, onDelete }: SessionReviewPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus management
  useEffect(() => {
    closeButtonRef.current?.focus()
  }, [session.id])

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const duration = session.summary?.durationMs ? formatDuration(session.summary.durationMs) : '-'
  const date = new Date(session.startedAt)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div
        role="dialog"
        aria-label={`Session review: ${session.name}`}
        aria-modal="true"
        className="fixed top-0 right-0 h-full w-full max-w-md z-50 bg-[var(--bg-secondary)] border-l border-[var(--border)] motion-safe:animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <History className="h-5 w-5 text-[var(--dojo-primary)] flex-shrink-0" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)] truncate">{session.name}</h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close session review"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Metadata */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session Info
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {duration}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                {session.events.length} events
              </div>
              <div className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px]',
                    session.status === 'completed'
                      ? 'border-[var(--success)]/30 text-[var(--success)]'
                      : 'border-[var(--warning)]/30 text-[var(--warning)]',
                  )}
                >
                  {session.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Config snapshot */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Settings className="h-3 w-3" aria-hidden="true" />
              Config Snapshot
            </h3>
            <div className="rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Model</span>
                <span className="text-[var(--foreground)] font-medium">{session.config.targetModel || '(none)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Attack Mode</span>
                <span className="text-[var(--foreground)] font-medium capitalize">{session.config.attackMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Concurrency</span>
                <span className="text-[var(--foreground)] font-medium">{session.config.concurrency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Timeout</span>
                <span className="text-[var(--foreground)] font-medium">{session.config.timeoutMs / 1000}s</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {session.summary && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Summary
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(['critical', 'high', 'medium', 'low'] as const).map((sev) => {
                  const count = session.summary!.bySeverity[sev]
                  const colorMap = {
                    critical: 'text-[var(--danger)]',
                    high: 'text-[var(--severity-high)]',
                    medium: 'text-[var(--warning)]',
                    low: 'text-[var(--severity-low)]',
                  }
                  return (
                    <div key={sev} className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                      <p className={cn('text-lg font-bold', colorMap[sev])}>{count}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] capitalize">{sev}</p>
                    </div>
                  )
                })}
              </div>

              {session.summary.topTools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-[10px] text-[var(--text-tertiary)]">Top tools:</span>
                  {session.summary.topTools.map((tool) => (
                    <Badge key={tool} variant="outline" className="text-[9px]">
                      {tool}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Event log */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Event Log
            </h3>
            <div
              className="space-y-1 max-h-64 overflow-y-auto rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] p-2"
              role="log"
              aria-label="Session event log"
            >
              {session.events.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)] text-center py-4">No events recorded</p>
              ) : (
                session.events.map((event) => {
                  const sevColor = {
                    critical: 'text-[var(--danger)]',
                    high: 'text-[var(--severity-high)]',
                    medium: 'text-[var(--warning)]',
                    low: 'text-[var(--severity-low)]',
                  }[event.severity] ?? 'text-muted-foreground'

                  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <div key={event.id} className="flex items-start gap-2 text-xs py-1 border-b border-[var(--border)] last:border-0">
                      <span className="text-[var(--text-tertiary)] font-mono flex-shrink-0">{time}</span>
                      <span className={cn('font-medium flex-shrink-0 uppercase text-[9px]', sevColor)}>
                        {event.severity}
                      </span>
                      <span className="text-[var(--foreground)] break-words">{event.message}</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-[var(--border)]">
          <button
            onClick={() => { onDelete(); onClose() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--danger)]/30 text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10 min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
            aria-label="Delete this session"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete
          </button>
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-[var(--bg-quaternary)] text-sm text-[var(--foreground)] hover:bg-[var(--bg-tertiary)] min-h-[44px] motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
