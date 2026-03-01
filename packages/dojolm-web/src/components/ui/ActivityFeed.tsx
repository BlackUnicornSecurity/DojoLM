/**
 * File: ActivityFeed.tsx
 * Purpose: Timestamped event list with icons for activity tracking
 * Story: TPI-UI-001-23
 * Index:
 * - isSafeHref helper (line 13)
 * - EventType type (line 22)
 * - ActivityEvent interface (line 24)
 * - eventConfig (line 32)
 * - ActivityFeedProps interface (line 40)
 * - ActivityFeed component (line 45)
 */

import { cn } from '@/lib/utils'
import { Shield, CheckCircle, XCircle, Brain, AlertTriangle, type LucideIcon } from 'lucide-react'

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, globalThis.location?.href ?? 'https://localhost')
    return url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:'
  } catch {
    return href.startsWith('/') || href.startsWith('#')
  }
}

type EventType = 'scan_complete' | 'threat_detected' | 'test_passed' | 'test_failed' | 'model_added'

interface ActivityEvent {
  id: string
  type: EventType
  description: string
  timestamp: string
  actionLink?: { label: string; href: string }
}

const eventConfig: Record<EventType, { icon: LucideIcon; color: string }> = {
  scan_complete: { icon: Shield, color: 'text-[var(--success)]' },
  threat_detected: { icon: AlertTriangle, color: 'text-[var(--danger)]' },
  test_passed: { icon: CheckCircle, color: 'text-[var(--success)]' },
  test_failed: { icon: XCircle, color: 'text-[var(--danger)]' },
  model_added: { icon: Brain, color: 'text-[var(--severity-low)]' },
}

const DEFAULT_CONFIG = { icon: Shield, color: 'text-[var(--muted-foreground)]' }

interface ActivityFeedProps {
  events: ActivityEvent[]
  className?: string
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <p className={cn("text-sm text-[var(--text-tertiary)] py-4 text-center", className)}>
        No recent activity.
      </p>
    )
  }

  return (
    <ul className={cn("space-y-1", className)} aria-label="Activity feed">
      {events.map((event) => {
        const { icon: Icon, color } = eventConfig[event.type] ?? DEFAULT_CONFIG
        return (
          <li key={event.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors">
            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", color)} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--foreground)]">{event.description}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-[var(--text-tertiary)]">{event.timestamp}</p>
                {event.actionLink && isSafeHref(event.actionLink.href) && (
                  <a
                    href={event.actionLink.href}
                    className="text-xs text-[var(--dojo-primary)] hover:underline"
                    rel="noopener noreferrer"
                  >
                    {event.actionLink.label}
                  </a>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export type { ActivityEvent, EventType }
