'use client'

/**
 * File: ArenaLeaderboardWidget.tsx
 * Purpose: Top 5 agents from Arena leaderboard with rank, name, win rate, score
 * Story: TPI-NODA-1.5.8; Story 2.1.3 — wired to /api/arena/warriors (no mock data)
 */

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { WarriorCard } from '@/lib/arena-types'

const RANK_STYLES: Record<number, string> = {
  1: 'text-[var(--severity-medium)]',
  2: 'text-muted-foreground',
  3: 'text-[var(--severity-high)]',
}

export function ArenaLeaderboardWidget() {
  const { setActiveTab } = useNavigation()
  const [warriors, setWarriors] = useState<WarriorCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchWithAuth('/api/arena/warriors')
        if (cancelled) return
        if (!res.ok) { if (!cancelled) setError(true); return }
        const data = await res.json()
        if (!cancelled && Array.isArray(data.warriors)) {
          const sorted = [...data.warriors]
            .sort((a: WarriorCard, b: WarriorCard) => b.winRate - a.winRate)
            .slice(0, 5)
          setWarriors(sorted)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard
      title="Arena Leaderboard"
      actions={
        <button
          onClick={() => setActiveTab('arena')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="View Arena Leaderboard"
        >
          View Arena
        </button>
      }
    >
      {loading ? (
        <div className="space-y-1" aria-busy="true" aria-label="Loading leaderboard">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted/50 rounded motion-safe:animate-pulse motion-reduce:animate-none" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">Could not load data</p>
          <p className="text-xs text-muted-foreground/60">Check your connection and try again</p>
        </div>
      ) : warriors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">No matches recorded yet</p>
          <p className="text-xs text-muted-foreground/60">Run Arena matches to populate the leaderboard</p>
        </div>
      ) : (
        <div className="space-y-1">
          {warriors.map((warrior, idx) => {
            const rank = idx + 1
            return (
              <div key={warrior.modelId} className="flex items-center gap-2 py-1 text-xs">
                <span className={cn('w-5 text-center font-bold', RANK_STYLES[rank] ?? 'text-muted-foreground')}>
                  {rank <= 3 ? <Trophy className="w-3.5 h-3.5 inline" aria-hidden="true" /> : rank}
                </span>
                <span className="flex-1 font-medium truncate" title={warrior.modelName}>{warrior.modelName}</span>
                <span className="text-muted-foreground tabular-nums">{warrior.winRate.toFixed(1)}%</span>
                <span className="text-muted-foreground tabular-nums w-12 text-right">{warrior.bestScore}</span>
              </div>
            )
          })}
        </div>
      )}
    </WidgetCard>
  )
}
