'use client'

/**
 * File: WarriorCardGrid.tsx
 * Purpose: Card-based leaderboard replacing mock sidebar
 * Story: 18.2 — Warrior Card Grid
 *
 * Features:
 * - Top 3 get trophy icons (gold/silver/bronze)
 * - Sortable (wins, rate, score, matches)
 * - Expandable detail
 * - Fetches from /api/arena/warriors
 *
 * Index:
 * - Sort types (line 20)
 * - WarriorCardGrid component (line 30)
 * - WarriorGridCard sub-component (line 100)
 */

import { useState, useMemo } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  Swords,
  Target,
  TrendingUp,
  Medal,
} from 'lucide-react'
import type { WarriorCard as WarriorCardType } from '@/lib/arena-types'

// ===========================================================================
// Types
// ===========================================================================

type SortField = 'wins' | 'winRate' | 'avgScore' | 'totalMatches'

const SORT_OPTIONS: { key: SortField; label: string; icon: typeof Trophy }[] = [
  { key: 'wins', label: 'Wins', icon: Trophy },
  { key: 'winRate', label: 'Rate', icon: TrendingUp },
  { key: 'avgScore', label: 'Score', icon: Target },
  { key: 'totalMatches', label: 'Matches', icon: Swords },
]

const RANK_ICONS: Record<number, { color: string; label: string }> = {
  1: { color: 'text-[var(--rank-gold)]', label: '1st Place' },
  2: { color: 'text-[var(--rank-silver)]', label: '2nd Place' },
  3: { color: 'text-[var(--rank-bronze)]', label: '3rd Place' },
}

// ===========================================================================
// Component
// ===========================================================================

export function WarriorCardGrid({ warriors }: { warriors: WarriorCardType[] }) {
  const [sortBy, setSortBy] = useState<SortField>('winRate')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(() => {
    return [...warriors].sort((a, b) => {
      const diff = b[sortBy] - a[sortBy]
      if (diff !== 0) return diff
      // Secondary sort by win rate
      return b.winRate - a.winRate
    })
  }, [warriors, sortBy])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-4 h-4 text-[var(--accent-gold)]" aria-hidden="true" />
            {/* VIS-14: UI copy uses "Fighters"; the `warriors` prop name is
                retained to avoid large cross-file rename churn. */}
            <CardTitle className="text-base">Fighters</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {warriors.length} {warriors.length === 1 ? 'fighter' : 'fighters'}
          </span>
        </div>

        {/* Sort pills */}
        <div className="flex gap-1.5 mt-2" role="radiogroup" aria-label="Sort fighters by">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              role="radio"
              aria-checked={sortBy === key}
              onClick={() => setSortBy(key)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'min-h-[32px]',
                sortBy === key
                  ? 'bg-[var(--bu-electric)] text-white font-medium'
                  : 'bg-[var(--bg-tertiary)] text-muted-foreground hover:bg-[var(--bg-quaternary)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {sorted.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No fighters yet. Fighters appear after matches are completed.
          </p>
        )}

        {sorted.map((warrior, index) => (
          <WarriorGridCard
            key={warrior.modelId}
            warrior={warrior}
            rank={index + 1}
            expanded={expandedId === warrior.modelId}
            onToggle={() =>
              setExpandedId((prev) =>
                prev === warrior.modelId ? null : warrior.modelId,
              )
            }
          />
        ))}
      </CardContent>
    </Card>
  )
}

// ===========================================================================
// Sub-component: Individual Warrior Card
// ===========================================================================

function WarriorGridCard({
  warrior,
  rank,
  expanded,
  onToggle,
}: {
  warrior: WarriorCardType
  rank: number
  expanded: boolean
  onToggle: () => void
}) {
  const rankInfo = RANK_ICONS[rank]

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border)] p-3',
        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
        'hover:bg-[var(--bg-tertiary)]',
        expanded && 'bg-[var(--bg-tertiary)]',
      )}
    >
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3"
        aria-expanded={expanded}
        aria-label={`${warrior.modelName} — Rank ${rank}`}
      >
        {/* Rank */}
        <div className="w-8 flex-shrink-0 flex justify-center">
          {rankInfo ? (
            <Trophy
              className={cn('w-5 h-5', rankInfo.color)}
              aria-label={rankInfo.label}
            />
          ) : (
            <span className="text-sm font-mono text-muted-foreground">
              #{rank}
            </span>
          )}
        </div>

        {/* Name + record */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)] truncate">
            {warrior.modelName}
          </p>
          <p className="text-xs text-muted-foreground">
            {warrior.wins}W / {warrior.losses}L / {warrior.draws}D
          </p>
        </div>

        {/* Win rate */}
        <div className="text-right flex-shrink-0">
          <p
            className={cn(
              'text-sm font-bold font-mono',
              warrior.winRate >= 0.6
                ? 'text-[var(--success)]'
                : warrior.winRate >= 0.4
                  ? 'text-[var(--warning)]'
                  : 'text-[var(--danger)]',
            )}
          >
            {(warrior.winRate * 100).toFixed(1)}%
          </p>
        </div>

        {/* Expand chevron */}
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-muted-foreground">Total Matches</span>
              <p className="font-mono text-[var(--foreground)]">{warrior.totalMatches}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Avg Score</span>
              <p className="font-mono text-[var(--foreground)]">{Math.round(warrior.avgScore)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Best Score</span>
              <p className="font-mono text-[var(--foreground)]">{warrior.bestScore}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Favorite Mode</span>
              <p className="text-[var(--foreground)]">
                {warrior.favoriteGameMode ? (
                  <Badge variant="outline" className="text-[10px]">{warrior.favoriteGameMode}</Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Provider</span>
              <p className="text-[var(--foreground)] truncate">{warrior.provider}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Match</span>
              <p className="text-[var(--foreground)]">
                {warrior.lastMatchAt
                  ? formatDate(warrior.lastMatchAt)
                  : '—'}
              </p>
            </div>
          </div>

          {/* Story 7.5: Win streak */}
          {warrior.currentStreak && warrior.currentStreak.count > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Streak</span>
              <Badge
                variant={warrior.currentStreak.type === 'W' ? 'success' : warrior.currentStreak.type === 'L' ? 'error' : 'outline'}
                className="text-[10px]"
              >
                {warrior.currentStreak.count}{warrior.currentStreak.type}
              </Badge>
            </div>
          )}

          {/* Story 7.5: Recent results */}
          {warrior.recentResults && warrior.recentResults.length > 0 && (
            <div>
              <span className="text-muted-foreground">Recent</span>
              <div className="flex gap-0.5 mt-1">
                {warrior.recentResults.map((result, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold',
                      result === 'W' && 'bg-[var(--success)]/20 text-[var(--success)]',
                      result === 'L' && 'bg-[var(--danger)]/20 text-[var(--danger)]',
                      result === 'D' && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {result}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Story 7.5: Score sparkline (CSS mini-bar chart) */}
          {warrior.recentScores && warrior.recentScores.length > 1 && (
            <div>
              <span className="text-muted-foreground">Score Trend</span>
              <div className="flex items-end gap-px mt-1 h-6">
                {warrior.recentScores.map((score, i) => {
                  const max = Math.max(...(warrior.recentScores ?? [1]))
                  const pct = max > 0 ? (score / max) * 100 : 0
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-[var(--bu-electric)]/60 rounded-t"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`Score: ${score}`}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
