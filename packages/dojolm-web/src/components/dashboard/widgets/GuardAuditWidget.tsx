'use client'

/**
 * File: GuardAuditWidget.tsx
 * Purpose: Last 5 guard audit events with direction, action, severity
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface AuditEvent {
  id: string
  direction: 'input' | 'output'
  action: 'allow' | 'block' | 'log'
  timestamp: string
  scanResult: { severity: string | null } | null
}

export function GuardAuditWidget() {
  const [events, setEvents] = useState<AuditEvent[]>([])

  useEffect(() => {
    let cancelled = false
    async function fetchAudit() {
      try {
        const res = await fetchWithAuth('/api/llm/guard/audit?limit=5')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setEvents(data.data ?? [])
        }
      } catch {
        // Silent
      }
    }
    fetchAudit()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard title="Guard Audit Log">
      <div className="space-y-1">
        {events.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No guard events</p>
        )}
        {events.map(event => (
          <div key={event.id} className="flex items-center gap-2 py-1 text-xs">
            <span className={cn(
              'px-1 py-0.5 rounded font-medium',
              event.direction === 'input' ? 'bg-[var(--status-input-bg)] text-[var(--status-input)]' : 'bg-[var(--status-output-bg)] text-[var(--status-output)]'
            )}>
              {event.direction === 'input' ? 'IN' : 'OUT'}
            </span>
            <span className={cn(
              'px-1 py-0.5 rounded font-medium',
              event.action === 'block' ? 'bg-[var(--status-block-bg)] text-[var(--status-block)]' :
              event.action === 'allow' ? 'bg-[var(--status-allow-bg)] text-[var(--status-allow)]' :
              'bg-muted text-muted-foreground'
            )}>
              {event.action.toUpperCase()}
            </span>
            {event.scanResult?.severity && (
              <span className="text-muted-foreground">{event.scanResult.severity}</span>
            )}
            <span className="ml-auto text-muted-foreground">
              {(() => { try { const d = new Date(event.timestamp); return isNaN(d.getTime()) ? event.timestamp : d.toLocaleTimeString() } catch { return event.timestamp } })()}
            </span>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
