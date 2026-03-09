'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Swords, Shield, Flag, Crown, Zap, AlertTriangle,
  CheckCircle, XCircle, Play, Square, RotateCcw, Timer,
} from 'lucide-react'
import type { MatchEvent, MatchEventType } from '@/lib/arena-types'
import { getEventTypeLabel } from '@/lib/arena-commentary'

// ===========================================================================
// Constants
// ===========================================================================

const EVENT_ICONS: Partial<Record<MatchEventType, typeof Swords>> = {
  match_start: Play,
  match_end: Square,
  round_start: Play,
  attack_sent: Swords,
  attack_success: Swords,
  attack_blocked: Shield,
  defense_hold: Shield,
  flag_captured: Flag,
  hill_claimed: Crown,
  hill_held: Crown,
  role_swap: RotateCcw,
  score_update: CheckCircle,
  sage_mutation: Zap,
  fighter_error: XCircle,
  timeout: Timer,
}

const EVENT_COLORS: Partial<Record<MatchEventType, string>> = {
  attack_success: 'text-[var(--danger)]',
  attack_blocked: 'text-[var(--success)]',
  attack_sent: 'text-[var(--dojo-primary)]',
  defense_hold: 'text-[var(--success)]',
  flag_captured: 'text-[var(--severity-high)]',
  hill_claimed: 'text-[var(--accent-gold)]',
  hill_held: 'text-[var(--accent-gold)]',
  role_swap: 'text-[var(--bu-electric)]',
  score_update: 'text-[var(--bu-electric)]',
  sage_mutation: 'text-[var(--accent-violet)]',
  fighter_error: 'text-[var(--danger)]',
  match_start: 'text-[var(--success)]',
  match_end: 'text-[var(--warning)]',
  timeout: 'text-[var(--warning)]',
}

const EVENT_BADGE_VARIANT: Partial<Record<MatchEventType, string>> = {
  attack_success: 'error',
  attack_blocked: 'success',
  flag_captured: 'strike',
  hill_claimed: 'warning',
  score_update: 'active',
  fighter_error: 'error',
  sage_mutation: 'info',
  match_start: 'success',
  match_end: 'warning',
  timeout: 'warning',
}

interface LiveCommentaryProps {
  events: MatchEvent[]
  fighterNames: Record<string, string>
}

// ===========================================================================
// Component
// ===========================================================================

export function LiveCommentary({ events, fighterNames }: LiveCommentaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const latestRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to latest event
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events.length])

  const latestEvent = events.length > 0 ? events[events.length - 1] : null

  return (
    <div className="flex flex-col h-full">
      <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2 px-1">
        Combat Log
      </h4>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 pr-1"
        role="region"
        aria-label="Match combat log"
      >
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.type] ?? AlertTriangle
          const colorClass = EVENT_COLORS[event.type] ?? 'text-muted-foreground'
          const badgeVariant = EVENT_BADGE_VARIANT[event.type] ?? 'outline'
          const fighterName = fighterNames[event.fighterId] ?? event.fighterId
          const description = typeof event.data?.description === 'string'
            ? event.data.description
            : getEventTypeLabel(event.type)

          return (
            <div
              key={event.id}
              className={cn(
                'flex items-start gap-2 p-2 rounded-lg',
                'hover:bg-[var(--bg-quaternary)]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]'
              )}
            >
              <div className="mt-0.5 shrink-0">
                <Icon className={cn('w-4 h-4', colorClass)} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">
                    R{event.round}
                  </span>
                  <Badge variant={badgeVariant as 'outline'} className="text-xs">
                    {getEventTypeLabel(event.type)}
                  </Badge>
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {fighterName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  {description}
                </p>
              </div>
            </div>
          )
        })}

        {events.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Waiting for match events...
          </p>
        )}
      </div>

      {/* Hidden aria-live for screen readers — only latest event */}
      <div ref={latestRef} className="sr-only" aria-live="polite">
        {latestEvent && (
          <span>
            Round {latestEvent.round}: {getEventTypeLabel(latestEvent.type)} by{' '}
            {fighterNames[latestEvent.fighterId] ?? latestEvent.fighterId}
          </span>
        )}
      </div>
    </div>
  )
}
