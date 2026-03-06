/**
 * File: ProgramCard.tsx
 * Purpose: Bug bounty program card for Ronin Hub Programs tab
 * Story: NODA-3 Story 10.2
 * Index:
 * - ProgramCardProps (line 14)
 * - ProgramCard component (line 22)
 */

'use client'

import { cn, isSafeHref } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Star, StarOff, DollarSign } from 'lucide-react'
import type { BountyProgram } from '@/lib/data/ronin-seed-programs'
import { PLATFORM_META, STATUS_META } from '@/lib/data/ronin-seed-programs'

interface ProgramCardProps {
  program: BountyProgram
  isSubscribed: boolean
  onToggleSubscribe: (programId: string) => void
  onSelect: (program: BountyProgram) => void
  showRewards?: boolean
}

export function ProgramCard({
  program,
  isSubscribed,
  onToggleSubscribe,
  onSelect,
  showRewards = true,
}: ProgramCardProps) {
  const platform = PLATFORM_META[program.platform]
  const status = STATUS_META[program.status]

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-card p-4',
        'hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors cursor-pointer',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1',
      )}
      onClick={() => onSelect(program)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(program) } }}
      aria-label={`${program.name} by ${program.company}`}
    >
      {/* Top Row: Name + Platform Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate">{program.name}</h3>
          <p className="text-xs text-muted-foreground">{program.company}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${platform.color} 15%, transparent)`,
              color: platform.color,
            }}
          >
            {platform.label}
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${status.color} 15%, transparent)`,
              color: status.color,
            }}
          >
            {status.label}
          </span>
        </div>
      </div>

      {/* Scope Summary */}
      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{program.scopeSummary}</p>

      {/* Rewards + OWASP Tags */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
          {program.owaspAiCategories.slice(0, 3).map(cat => (
            <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">
              {cat}
            </Badge>
          ))}
          {program.owaspAiCategories.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{program.owaspAiCategories.length - 3}</span>
          )}
        </div>
        {showRewards && (
          <div className="flex items-center gap-1 text-xs font-medium text-[var(--success)] shrink-0">
            <DollarSign className="h-3 w-3" aria-hidden="true" />
            <span>{program.rewardMin.toLocaleString()}-{program.rewardMax.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Bottom Row: Tags + Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {program.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSubscribe(program.id) }}
            className={cn(
              'p-1.5 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center',
              'motion-safe:transition-colors',
              isSubscribed
                ? 'text-[var(--warning)] hover:bg-[var(--warning)]/10'
                : 'text-muted-foreground hover:bg-[var(--bg-tertiary)]',
            )}
            aria-label={isSubscribed ? `Unsubscribe from ${program.name}` : `Subscribe to ${program.name}`}
          >
            {isSubscribed ? (
              <Star className="h-4 w-4 fill-current" aria-hidden="true" />
            ) : (
              <StarOff className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          <a
            href={isSafeHref(program.url) ? program.url : '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--bg-tertiary)] min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label={`Open ${program.name} on ${platform.label}`}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  )
}
