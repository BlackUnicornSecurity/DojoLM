'use client'

/**
 * File: ArenaLeaderboardWidget.tsx
 * Purpose: Top 5 agents from Arena leaderboard with rank, name, win rate, score
 * Story: TPI-NODA-1.5.8
 */

import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

interface LeaderboardAgent {
  rank: number
  name: string
  winRate: number
  score: number
}

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
const MOCK_LEADERBOARD: LeaderboardAgent[] = [
  { rank: 1, name: 'Sentinel-v4', winRate: 87.5, score: 2450 },
  { rank: 2, name: 'Guardian-Pro', winRate: 82.3, score: 2180 },
  { rank: 3, name: 'Aegis-Net', winRate: 79.1, score: 1950 },
  { rank: 4, name: 'ShieldWall-2', winRate: 71.4, score: 1720 },
  { rank: 5, name: 'Bastion-ML', winRate: 68.9, score: 1580 },
]

const RANK_STYLES: Record<number, string> = {
  1: 'text-[var(--severity-medium)]',
  2: 'text-muted-foreground',
  3: 'text-[var(--severity-high)]',
}

export function ArenaLeaderboardWidget() {
  const { setActiveTab } = useNavigation()

  return (
    <WidgetCard
      title="Arena Leaderboard"
      actions={
        <button
          onClick={() => setActiveTab('adversarial')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="View Arena Leaderboard"
        >
          View Arena
        </button>
      }
    >
      <div className="space-y-1">
        {MOCK_LEADERBOARD.map(agent => (
          <div key={agent.name} className="flex items-center gap-2 py-1 text-xs">
            <span className={cn('w-5 text-center font-bold', RANK_STYLES[agent.rank] ?? 'text-muted-foreground')}>
              {agent.rank <= 3 ? <Trophy className="w-3.5 h-3.5 inline" aria-hidden="true" /> : agent.rank}
            </span>
            <span className="flex-1 font-medium truncate" title={agent.name}>{agent.name}</span>
            <span className="text-muted-foreground tabular-nums">{agent.winRate}%</span>
            <span className="text-muted-foreground tabular-nums w-12 text-right">{agent.score}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
