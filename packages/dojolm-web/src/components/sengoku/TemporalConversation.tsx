/**
 * File: TemporalConversation.tsx
 * Purpose: Conversation viewer for temporal attack plan turns (merged from Time Chamber)
 * Story: DAITENGUYAMA M2.2
 * Index:
 * - Turn timeline with chat-like layout (line ~40)
 * - Expandable content per turn (line ~65)
 * - Compact mode (line ~90)
 */

'use client'

import { useState, useCallback } from 'react'
import { User, Bot, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Turn } from './temporal-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TemporalConversationProps {
  readonly turns: Turn[]
  readonly compact?: boolean
}

const TRUNCATE_LENGTH = 200

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemporalConversation({ turns, compact = false }: TemporalConversationProps) {
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set())

  const toggleTurn = useCallback((turnNumber: number) => {
    setExpandedTurns((prev) => {
      const next = new Set(prev)
      if (next.has(turnNumber)) {
        next.delete(turnNumber)
      } else {
        next.add(turnNumber)
      }
      return next
    })
  }, [])

  if (turns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No turns to display.</p>
    )
  }

  // Compact mode: single line per turn
  if (compact) {
    return (
      <div className="space-y-1">
        {turns.map((turn) => (
          <div
            key={turn.turnNumber}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-xs',
              turn.role === 'user'
                ? 'bg-[var(--bu-electric)]/10 justify-end'
                : 'bg-[var(--status-allow)]/10 justify-start',
            )}
          >
            <span className={cn(
              'font-semibold shrink-0',
              turn.role === 'user' ? 'text-[var(--bu-electric)]' : 'text-[var(--status-allow)]',
            )}>
              T{turn.turnNumber}
            </span>
            <span className={cn(
              'font-medium shrink-0',
              turn.role === 'user' ? 'text-[var(--bu-electric)]' : 'text-[var(--status-allow)]',
            )}>
              {turn.role === 'user' ? 'User' : 'Assistant'}
            </span>
            <span className="text-muted-foreground truncate">
              {turn.content}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Full mode: chat-like timeline
  return (
    <div className="space-y-3">
      {turns.map((turn) => {
        const isUser = turn.role === 'user'
        const isLong = turn.content.length > TRUNCATE_LENGTH
        const isExpanded = expandedTurns.has(turn.turnNumber)
        const displayContent = isLong && !isExpanded
          ? turn.content.slice(0, TRUNCATE_LENGTH) + '...'
          : turn.content

        return (
          <div
            key={turn.turnNumber}
            className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[80%] rounded-lg p-3 space-y-1',
                isUser
                  ? 'bg-[var(--bu-electric)]/10 border border-[var(--bu-electric)]/20'
                  : 'bg-[var(--status-allow)]/10 border border-[var(--status-allow)]/20',
              )}
            >
              {/* Header: role badge + turn number */}
              <div className="flex items-center gap-2">
                {isUser ? (
                  <User className="w-3.5 h-3.5 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-[var(--status-allow)] shrink-0" aria-hidden="true" />
                )}
                <span className={cn(
                  'text-xs font-semibold',
                  isUser ? 'text-[var(--bu-electric)]' : 'text-[var(--status-allow)]',
                )}>
                  {isUser ? 'User' : 'Assistant'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Turn {turn.turnNumber}
                </span>
              </div>

              {/* Content */}
              <p className="text-sm leading-relaxed">{displayContent}</p>

              {/* Expand button for long content */}
              {isLong && (
                <button
                  onClick={() => toggleTurn(turn.turnNumber)}
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium transition-colors',
                    'hover:text-[var(--dojo-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] rounded',
                    isUser ? 'text-[var(--bu-electric)]' : 'text-[var(--status-allow)]',
                  )}
                  aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
                >
                  {isExpanded ? (
                    <>
                      <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                      Show more
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
