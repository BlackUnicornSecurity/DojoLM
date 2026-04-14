/**
 * File: ActivityFeed.tsx
 * Purpose: Timestamped event list with unread dots, mark-all-read, and undo toast
 * Story: TPI-UI-001-23, TPI-UIP-08
 * Index:
 * - formatTimestamp helper (line 17)
 * - eventConfig (line 28)
 * - ActivityFeedProps interface (line 39)
 * - ActivityFeed component (line 44)
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Shield, CheckCircle, XCircle, Brain, AlertTriangle, CheckCheck, type LucideIcon } from 'lucide-react'
import { useActivityState, useActivityDispatch, type EventType, type ActivityEvent } from '@/lib/contexts/ActivityContext'
import { EmptyState, emptyStatePresets } from '@/components/ui/EmptyState'
import { useNavigation } from '@/lib/NavigationContext'

/** Format ISO timestamp for display */
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return timestamp
  }
}

const eventConfig: Record<EventType, { icon: LucideIcon; color: string }> = {
  scan_complete: { icon: Shield, color: 'text-[var(--success)]' },
  threat_detected: { icon: AlertTriangle, color: 'text-[var(--danger)]' },
  test_passed: { icon: CheckCircle, color: 'text-[var(--success)]' },
  test_failed: { icon: XCircle, color: 'text-[var(--danger)]' },
  model_added: { icon: Brain, color: 'text-[var(--severity-low)]' },
}

const DEFAULT_CONFIG = { icon: Shield, color: 'text-muted-foreground' }

interface ActivityFeedProps {
  className?: string
  maxVisible?: number
}

export function ActivityFeed({ className, maxVisible = 10 }: ActivityFeedProps) {
  const { events } = useActivityState()
  const { setActiveTab } = useNavigation()
  const dispatch = useActivityDispatch()
  const [undoSnapshot, setUndoSnapshot] = useState<ActivityEvent[] | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestEventRef = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const unreadCount = events.filter(e => !e.read).length
  const visibleEvents = events.slice(0, maxVisible)

  // Announce only the latest new event for screen readers
  useEffect(() => {
    if (events.length > 0 && events[0].id !== latestEventRef.current) {
      latestEventRef.current = events[0].id
      setAnnouncement(events[0].description)
    }
  }, [events])

  const handleMarkAllRead = useCallback(() => {
    setUndoSnapshot([...events])
    dispatch({ type: 'MARK_ALL_READ' })

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => {
      setUndoSnapshot(null)
    }, 5000)
  }, [events, dispatch])

  const handleUndo = useCallback(() => {
    if (undoSnapshot) {
      dispatch({ type: 'UNDO_MARK_ALL_READ', payload: undoSnapshot })
      setUndoSnapshot(null)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [undoSnapshot, dispatch])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    }
  }, [])

  if (events.length === 0) {
    return (
      <EmptyState
        {...emptyStatePresets.noData}
        title="No sessions yet"
        description="Run a scan or test to see activity here."
        action={{ label: 'Open Shingan Scanner', onClick: () => setActiveTab('scanner') }}
        className={cn("py-4", className)}
      />
    )
  }

  return (
    <div className={className}>
      {/* Visually hidden live region for screen reader announcements — only latest event */}
      <div aria-live="polite" className="sr-only">{announcement}</div>

      {/* Header with mark all read */}
      {unreadCount > 0 && (
        <div className="flex items-center justify-between px-3 pb-2">
          <span className="text-xs text-muted-foreground">
            {unreadCount} unread
          </span>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-[var(--dojo-primary)] hover:underline"
            aria-label="Mark all as read"
          >
            <CheckCheck className="w-3 h-3" aria-hidden="true" />
            Mark all read
          </button>
        </div>
      )}

      {/* Undo toast */}
      {undoSnapshot && (
        <div className="mx-3 mb-2 flex items-center justify-between px-3 py-2 bg-[var(--bg-quaternary)] rounded-lg text-xs">
          <span className="text-muted-foreground">All marked as read</span>
          <button
            onClick={handleUndo}
            className="text-[var(--dojo-primary)] hover:underline font-medium"
          >
            Undo
          </button>
        </div>
      )}

      {/* Event list */}
      <ul aria-label="Activity feed">
        {visibleEvents.map((event) => {
          const { icon: Icon, color } = eventConfig[event.type] ?? DEFAULT_CONFIG
          return (
            <li
              key={event.id}
              className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              {/* Unread dot */}
              <div className="flex-shrink-0 mt-1.5 w-2">
                {!event.read && (
                  <span
                    className="block w-2 h-2 rounded-full bg-[var(--dojo-primary)]"
                    aria-label="Unread"
                  />
                )}
              </div>
              <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", color)} aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--foreground)]">{event.description}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{formatTimestamp(event.timestamp)}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {events.length > maxVisible && (
        <p className="text-xs text-[var(--text-tertiary)] text-center py-2">
          +{events.length - maxVisible} more events
        </p>
      )}
    </div>
  )
}

export type { ActivityEvent, EventType }
