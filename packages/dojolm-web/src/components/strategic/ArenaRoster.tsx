'use client'

/**
 * File: ArenaRoster.tsx
 * Purpose: Arena Roster — library view of all warriors who have battled
 * Story: HAKONE H11.4
 * Index:
 * - RosterEntry type (line 18)
 * - MOCK_ROSTER mock data (line 35)
 * - columns definition (line 148)
 * - filterFields definition (line 222)
 * - ArenaRoster component (line 244)
 */

import { LibraryPageTemplate, type LibraryColumn, type LibraryFilterField } from '@/components/ui/LibraryPageTemplate'
import { Swords } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RosterEntry {
  id: string
  modelName: string
  provider: string
  totalMatches: number
  wins: number
  losses: number
  draws: number
  winRate: number
  avgScore: number
  bestScore: number
  favoriteGameMode: 'CTF' | 'KOTH' | 'RvB' | null
  favoriteAttack: string
  defenseRating: number
  lastMatchAt: string
  recentResults: ('W' | 'L' | 'D')[]
}

const MOCK_ROSTER: RosterEntry[] = [
  {
    id: 'r-1',
    modelName: 'GPT-4o',
    provider: 'OpenAI',
    totalMatches: 42,
    wins: 28,
    losses: 10,
    draws: 4,
    winRate: 66.7,
    avgScore: 82.4,
    bestScore: 97.1,
    favoriteGameMode: 'CTF',
    favoriteAttack: 'Prompt Injection Chain',
    defenseRating: 78,
    lastMatchAt: '2026-03-11T14:30:00Z',
    recentResults: ['W', 'W', 'L', 'W', 'W', 'D', 'W', 'L', 'W', 'W'],
  },
  {
    id: 'r-2',
    modelName: 'GPT-4o-mini',
    provider: 'OpenAI',
    totalMatches: 35,
    wins: 18,
    losses: 13,
    draws: 4,
    winRate: 51.4,
    avgScore: 68.9,
    bestScore: 88.3,
    favoriteGameMode: 'RvB',
    favoriteAttack: 'Token Smuggling',
    defenseRating: 61,
    lastMatchAt: '2026-03-10T09:15:00Z',
    recentResults: ['L', 'W', 'W', 'D', 'L', 'W', 'L', 'W', 'W', 'D'],
  },
  {
    id: 'r-3',
    modelName: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    totalMatches: 50,
    wins: 37,
    losses: 8,
    draws: 5,
    winRate: 74.0,
    avgScore: 89.2,
    bestScore: 99.5,
    favoriteGameMode: 'KOTH',
    favoriteAttack: 'System Prompt Extraction',
    defenseRating: 91,
    lastMatchAt: '2026-03-12T08:00:00Z',
    recentResults: ['W', 'W', 'W', 'W', 'L', 'W', 'D', 'W', 'W', 'W'],
  },
  {
    id: 'r-4',
    modelName: 'Claude 3 Haiku',
    provider: 'Anthropic',
    totalMatches: 28,
    wins: 14,
    losses: 10,
    draws: 4,
    winRate: 50.0,
    avgScore: 64.1,
    bestScore: 82.7,
    favoriteGameMode: 'CTF',
    favoriteAttack: 'Encoding Bypass',
    defenseRating: 72,
    lastMatchAt: '2026-03-09T16:45:00Z',
    recentResults: ['W', 'L', 'D', 'W', 'L', 'W', 'L', 'D', 'W', 'L'],
  },
  {
    id: 'r-5',
    modelName: 'Gemini 1.5 Pro',
    provider: 'Google',
    totalMatches: 38,
    wins: 25,
    losses: 9,
    draws: 4,
    winRate: 65.8,
    avgScore: 79.6,
    bestScore: 95.0,
    favoriteGameMode: 'KOTH',
    favoriteAttack: 'Multi-turn Manipulation',
    defenseRating: 83,
    lastMatchAt: '2026-03-11T20:00:00Z',
    recentResults: ['W', 'W', 'L', 'W', 'D', 'W', 'W', 'W', 'L', 'W'],
  },
  {
    id: 'r-6',
    modelName: 'Llama 3.1 70B',
    provider: 'Meta',
    totalMatches: 22,
    wins: 10,
    losses: 9,
    draws: 3,
    winRate: 45.5,
    avgScore: 61.3,
    bestScore: 84.2,
    favoriteGameMode: 'RvB',
    favoriteAttack: 'Role Confusion',
    defenseRating: 55,
    lastMatchAt: '2026-03-08T11:30:00Z',
    recentResults: ['L', 'W', 'L', 'D', 'W', 'L', 'W', 'L', 'W', 'D'],
  },
  {
    id: 'r-7',
    modelName: 'Mistral Large',
    provider: 'Mistral',
    totalMatches: 31,
    wins: 19,
    losses: 8,
    draws: 4,
    winRate: 61.3,
    avgScore: 75.8,
    bestScore: 92.1,
    favoriteGameMode: 'CTF',
    favoriteAttack: 'Context Window Overflow',
    defenseRating: 74,
    lastMatchAt: '2026-03-10T22:15:00Z',
    recentResults: ['W', 'W', 'W', 'L', 'W', 'D', 'W', 'L', 'W', 'W'],
  },
  {
    id: 'r-8',
    modelName: 'Qwen 2.5 72B',
    provider: 'Alibaba',
    totalMatches: 18,
    wins: 8,
    losses: 7,
    draws: 3,
    winRate: 44.4,
    avgScore: 59.7,
    bestScore: 79.8,
    favoriteGameMode: 'KOTH',
    favoriteAttack: 'Instruction Hierarchy Bypass',
    defenseRating: 52,
    lastMatchAt: '2026-03-07T13:00:00Z',
    recentResults: ['D', 'L', 'W', 'L', 'W', 'W', 'L', 'D', 'L', 'W'],
  },
  {
    id: 'r-9',
    modelName: 'Command R+',
    provider: 'Cohere',
    totalMatches: 15,
    wins: 5,
    losses: 8,
    draws: 2,
    winRate: 33.3,
    avgScore: 52.4,
    bestScore: 76.5,
    favoriteGameMode: 'RvB',
    favoriteAttack: 'Payload Fragmentation',
    defenseRating: 48,
    lastMatchAt: '2026-03-06T07:45:00Z',
    recentResults: ['L', 'L', 'W', 'L', 'D', 'L', 'W', 'L', 'W', 'D'],
  },
  {
    id: 'r-10',
    modelName: 'DeepSeek V3',
    provider: 'DeepSeek',
    totalMatches: 26,
    wins: 16,
    losses: 7,
    draws: 3,
    winRate: 61.5,
    avgScore: 74.2,
    bestScore: 91.4,
    favoriteGameMode: null,
    favoriteAttack: 'Semantic Camouflage',
    defenseRating: 69,
    lastMatchAt: '2026-03-11T17:20:00Z',
    recentResults: ['W', 'W', 'L', 'W', 'W', 'D', 'L', 'W', 'W', 'W'],
  },
]

function WinRateBadge({ rate }: { rate: number }) {
  const color = rate >= 60 ? 'text-green-400' : rate >= 40 ? 'text-yellow-400' : 'text-red-400'
  return <span className={cn('font-mono text-sm font-semibold', color)}>{rate.toFixed(1)}%</span>
}

function GameModeBadge({ mode }: { mode: 'CTF' | 'KOTH' | 'RvB' | null }) {
  if (!mode) return <span className="text-xs text-muted-foreground">None</span>
  const styles: Record<string, string> = {
    CTF: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    KOTH: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    RvB: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  }
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded-full text-xs font-medium border', styles[mode])}>
      {mode}
    </span>
  )
}

function DefenseBar({ rating }: { rating: number }) {
  const color = rating >= 75 ? 'bg-green-500' : rating >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden max-w-[80px]">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${rating}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{rating}</span>
    </div>
  )
}

function RecentResultsDots({ results }: { results: ('W' | 'L' | 'D')[] }) {
  return (
    <div className="flex items-center gap-1">
      {results.map((r, i) => (
        <div
          key={i}
          className={cn(
            'w-3 h-3 rounded-full',
            r === 'W' && 'bg-green-500',
            r === 'L' && 'bg-red-500',
            r === 'D' && 'bg-gray-500',
          )}
          title={r === 'W' ? 'Win' : r === 'L' ? 'Loss' : 'Draw'}
        />
      ))}
    </div>
  )
}

const columns: LibraryColumn<RosterEntry>[] = [
  {
    key: 'modelName',
    label: 'Model',
    render: (entry) => (
      <div>
        <p className="font-semibold text-sm text-foreground">{entry.modelName}</p>
        <p className="text-xs text-muted-foreground">{entry.provider}</p>
      </div>
    ),
    sortFn: (a, b) => a.modelName.localeCompare(b.modelName),
  },
  {
    key: 'record',
    label: 'Record',
    render: (entry) => (
      <p className="text-sm font-mono tabular-nums">
        <span className="text-green-400">{entry.wins}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-red-400">{entry.losses}</span>
        <span className="text-muted-foreground">-</span>
        <span className="text-gray-400">{entry.draws}</span>
      </p>
    ),
    sortFn: (a, b) => a.totalMatches - b.totalMatches,
  },
  {
    key: 'winRate',
    label: 'Win Rate',
    render: (entry) => <WinRateBadge rate={entry.winRate} />,
    sortFn: (a, b) => a.winRate - b.winRate,
  },
  {
    key: 'avgScore',
    label: 'Avg Score',
    render: (entry) => (
      <span className="text-sm font-mono tabular-nums">{entry.avgScore.toFixed(1)}</span>
    ),
    sortFn: (a, b) => a.avgScore - b.avgScore,
  },
  {
    key: 'favoriteGameMode',
    label: 'Game Mode',
    render: (entry) => <GameModeBadge mode={entry.favoriteGameMode} />,
    sortFn: (a, b) => (a.favoriteGameMode ?? '').localeCompare(b.favoriteGameMode ?? ''),
  },
  {
    key: 'defenseRating',
    label: 'Defense',
    render: (entry) => <DefenseBar rating={entry.defenseRating} />,
    sortFn: (a, b) => a.defenseRating - b.defenseRating,
  },
]

const filterFields: LibraryFilterField[] = [
  {
    key: 'provider',
    label: 'Provider',
    options: [
      { value: 'OpenAI', label: 'OpenAI' },
      { value: 'Anthropic', label: 'Anthropic' },
      { value: 'Google', label: 'Google' },
      { value: 'Meta', label: 'Meta' },
      { value: 'Mistral', label: 'Mistral' },
      { value: 'Alibaba', label: 'Alibaba' },
      { value: 'Cohere', label: 'Cohere' },
      { value: 'DeepSeek', label: 'DeepSeek' },
    ],
  },
  {
    key: 'favoriteGameMode',
    label: 'Game Mode',
    options: [
      { value: 'CTF', label: 'CTF' },
      { value: 'KOTH', label: 'KOTH' },
      { value: 'RvB', label: 'RvB' },
    ],
  },
]

function renderDetail(entry: RosterEntry) {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h4 className="text-lg font-bold text-foreground">{entry.modelName}</h4>
        <p className="text-sm text-muted-foreground">{entry.provider}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Total Matches</p>
          <p className="text-lg font-bold tabular-nums">{entry.totalMatches}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Record (W-L-D)</p>
          <p className="text-lg font-bold tabular-nums">
            <span className="text-green-400">{entry.wins}</span>
            {'-'}
            <span className="text-red-400">{entry.losses}</span>
            {'-'}
            <span className="text-gray-400">{entry.draws}</span>
          </p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Win Rate</p>
          <div className="mt-1">
            <WinRateBadge rate={entry.winRate} />
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Avg Score</p>
          <p className="text-lg font-bold tabular-nums">{entry.avgScore.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Best Score</p>
          <p className="text-lg font-bold tabular-nums text-amber-400">{entry.bestScore.toFixed(1)}</p>
        </div>
        <div className="rounded-lg bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Game Mode</p>
          <div className="mt-1">
            <GameModeBadge mode={entry.favoriteGameMode} />
          </div>
        </div>
      </div>

      {/* Recent results streak */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Results</p>
        <RecentResultsDots results={entry.recentResults} />
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Win
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Loss
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> Draw
          </span>
        </div>
      </div>

      {/* Favorite attack */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Favorite Attack</p>
        <p className="text-sm font-medium text-foreground">{entry.favoriteAttack}</p>
      </div>

      {/* Defense rating */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Defense Rating</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-3 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full motion-safe:transition-all motion-safe:duration-500',
                entry.defenseRating >= 75 ? 'bg-green-500' : entry.defenseRating >= 50 ? 'bg-yellow-500' : 'bg-red-500',
              )}
              style={{ width: `${entry.defenseRating}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{entry.defenseRating}/100</span>
        </div>
      </div>

      {/* Last match */}
      <div className="pt-2 border-t border-[var(--border)]">
        <p className="text-xs text-muted-foreground">
          Last match: {new Date(entry.lastMatchAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

export function ArenaRoster() {
  return (
    <LibraryPageTemplate<RosterEntry>
      title="Arena Roster"
      items={MOCK_ROSTER}
      columns={columns}
      filterFields={filterFields}
      renderDetail={renderDetail}
      itemKey={(entry) => entry.id}
      searchFn={(entry, query) =>
        entry.modelName.toLowerCase().includes(query) ||
        entry.provider.toLowerCase().includes(query) ||
        entry.favoriteAttack.toLowerCase().includes(query)
      }
      pageSize={12}
      emptyIcon={Swords}
      emptyTitle="No fighters found"
      emptyDescription="No models match your search or filters"
    />
  )
}
