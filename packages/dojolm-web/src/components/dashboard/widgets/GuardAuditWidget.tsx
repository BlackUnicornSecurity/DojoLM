'use client'

/**
 * File: GuardAuditWidget.tsx
 * Purpose: Last 5 guard audit events with direction, action, severity
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'

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
        const res = await fetch('/api/llm/guard/audit?limit=5')
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
          <p className="text-[10px] text-muted-foreground text-center py-4">No guard events</p>
        )}
        {events.map(event => (
          <div key={event.id} className="flex items-center gap-2 py-1 text-[10px]">
            <span className={cn(
              'px-1 py-0.5 rounded font-medium',
              event.direction === 'input' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'
            )}>
              {event.direction === 'input' ? 'IN' : 'OUT'}
            </span>
            <span className={cn(
              'px-1 py-0.5 rounded font-medium',
              event.action === 'block' ? 'bg-red-500/20 text-red-400' :
              event.action === 'allow' ? 'bg-green-500/20 text-green-400' :
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
