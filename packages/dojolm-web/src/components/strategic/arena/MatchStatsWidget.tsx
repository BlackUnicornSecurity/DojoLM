'use client'

/**
 * File: MatchStatsWidget.tsx
 * Purpose: Match statistics widget with leaderboard, top attacks/fixtures, and gamification
 * Story: H14.2
 * Index:
 * - Types (line 15)
 * - Mock Data (line 60)
 * - Achievement Icons Map (line 170)
 * - StatBar helper (line 182)
 * - MatchStatsWidget component (line 205)
 * - LeaderboardView component (line 340)
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Trophy,
  TrendingUp,
  Flame,
  Star,
  Award,
  Target,
  Swords,
  Medal,
  Crown,
  Zap,
} from 'lucide-react'

// ===========================================================================
// Types
// ===========================================================================

interface MatchStat {
  totalMatches: number
  totalRounds: number
  avgDuration: number
  topAttackTypes: { type: string; count: number }[]
  topFixtures: { name: string; successRate: number }[]
  overallInjectionRate: number
}

interface LeaderEntry {
  modelName: string
  provider: string
  wins: number
  losses: number
  draws: number
  winRate: number
  currentStreak: number
  streakType: 'W' | 'L' | 'D'
  achievements: Achievement[]
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: 'trophy' | 'star' | 'flame' | 'medal' | 'crown' | 'zap'
  earnedAt: string
}

// ===========================================================================
// Mock Data
// ===========================================================================

// MOCK DATA -- not wired to API. Replace with live data when backend integration is available.
const MOCK_STATS: MatchStat = {
  totalMatches: 47,
  totalRounds: 523,
  avgDuration: 45_000,
  topAttackTypes: [
    { type: 'Prompt Injection', count: 156 },
    { type: 'Jailbreak', count: 98 },
    { type: 'Encoding Bypass', count: 76 },
    { type: 'Context Framing', count: 54 },
    { type: 'Delimiter Injection', count: 42 },
  ],
  topFixtures: [
    { name: 'system-override-v3', successRate: 78 },
    { name: 'dan-jailbreak-12', successRate: 65 },
    { name: 'base64-nested', successRate: 52 },
    { name: 'roleplay-admin', successRate: 48 },
    { name: 'context-window-flood', successRate: 35 },
  ],
  overallInjectionRate: 34,
}

const ACH_FIRST_BLOOD: Achievement = {
  id: 'first-blood',
  name: 'First Blood',
  description: 'Won your first match',
  icon: 'trophy',
  earnedAt: '2026-02-10',
}
const ACH_UNBREAKABLE: Achievement = {
  id: 'unbreakable',
  name: 'Unbreakable',
  description: '5+ win streak',
  icon: 'flame',
  earnedAt: '2026-02-18',
}
const ACH_DOUBLE_AGENT: Achievement = {
  id: 'double-agent',
  name: 'Double Agent',
  description: 'Won as both attacker and defender',
  icon: 'star',
  earnedAt: '2026-02-22',
}
const ACH_SPEEDSTER: Achievement = {
  id: 'speedster',
  name: 'Speedster',
  description: 'Won match in under 30 seconds',
  icon: 'zap',
  earnedAt: '2026-02-25',
}
const ACH_PERFECT_DEF: Achievement = {
  id: 'perfect-defense',
  name: 'Perfect Defense',
  description: 'Zero injections in a match',
  icon: 'medal',
  earnedAt: '2026-03-01',
}
const ACH_ARSENAL: Achievement = {
  id: 'arsenal-master',
  name: 'Arsenal Master',
  description: 'Used all attack types',
  icon: 'crown',
  earnedAt: '2026-03-05',
}

const MOCK_LEADERBOARD: LeaderEntry[] = [
  {
    modelName: 'Sentinel-v4',
    provider: 'OpenAI',
    wins: 21, losses: 3, draws: 1, winRate: 84.0,
    currentStreak: 7, streakType: 'W',
    achievements: [ACH_FIRST_BLOOD, ACH_UNBREAKABLE, ACH_DOUBLE_AGENT, ACH_PERFECT_DEF, ACH_ARSENAL],
  },
  {
    modelName: 'Guardian-Pro',
    provider: 'Anthropic',
    wins: 18, losses: 5, draws: 2, winRate: 72.0,
    currentStreak: 3, streakType: 'W',
    achievements: [ACH_FIRST_BLOOD, ACH_DOUBLE_AGENT, ACH_SPEEDSTER],
  },
  {
    modelName: 'Aegis-Net',
    provider: 'Google',
    wins: 15, losses: 7, draws: 1, winRate: 65.2,
    currentStreak: 2, streakType: 'L',
    achievements: [ACH_FIRST_BLOOD, ACH_PERFECT_DEF],
  },
  {
    modelName: 'ShieldWall-2',
    provider: 'Meta',
    wins: 13, losses: 8, draws: 3, winRate: 54.2,
    currentStreak: 1, streakType: 'W',
    achievements: [ACH_FIRST_BLOOD, ACH_SPEEDSTER, ACH_ARSENAL],
  },
  {
    modelName: 'Bastion-ML',
    provider: 'Mistral',
    wins: 11, losses: 9, draws: 2, winRate: 50.0,
    currentStreak: 5, streakType: 'W',
    achievements: [ACH_FIRST_BLOOD, ACH_UNBREAKABLE],
  },
  {
    modelName: 'Fortify-7B',
    provider: 'OpenAI',
    wins: 9, losses: 11, draws: 1, winRate: 42.9,
    currentStreak: 3, streakType: 'L',
    achievements: [ACH_FIRST_BLOOD, ACH_DOUBLE_AGENT],
  },
  {
    modelName: 'Redoubt-LM',
    provider: 'Anthropic',
    wins: 7, losses: 12, draws: 2, winRate: 33.3,
    currentStreak: 1, streakType: 'D',
    achievements: [ACH_FIRST_BLOOD],
  },
  {
    modelName: 'Parapet-v2',
    provider: 'Google',
    wins: 4, losses: 14, draws: 0, winRate: 22.2,
    currentStreak: 4, streakType: 'L',
    achievements: [ACH_FIRST_BLOOD, ACH_SPEEDSTER],
  },
]

// ===========================================================================
// Helpers
// ===========================================================================

const ACHIEVEMENT_ICONS = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  medal: Medal,
  crown: Crown,
  zap: Zap,
} as const

const RANK_COLORS: Record<number, string> = {
  1: 'text-yellow-400',
  2: 'text-gray-300',
  3: 'text-amber-600',
}

const RANK_BG: Record<number, string> = {
  1: 'bg-yellow-400/10 border-yellow-400/30',
  2: 'bg-gray-300/10 border-gray-300/30',
  3: 'bg-amber-600/10 border-amber-600/30',
}

const STREAK_COLORS: Record<string, string> = {
  W: 'text-emerald-400',
  L: 'text-red-400',
  D: 'text-gray-400',
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  return `${minutes}m ${remaining}s`
}

function StatBar({ label, value, max, className }: { label: string; value: number; max: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="truncate font-medium" title={label}>{label}</span>
        <span className="text-muted-foreground tabular-nums ml-2">{value}</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-label={`${label}: ${value} of ${max}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="h-full rounded-full bg-[var(--bu-electric)] motion-safe:transition-all motion-safe:duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function RateBar({ label, rate, className }: { label: string; rate: number; className?: string }) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="truncate font-medium" title={label}>{label}</span>
        <span className="text-muted-foreground tabular-nums ml-2">{rate}%</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
        role="progressbar"
        aria-label={`${label}: ${rate}% success rate`}
        aria-valuenow={rate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn(
            'h-full rounded-full motion-safe:transition-all motion-safe:duration-500',
            rate >= 60 ? 'bg-emerald-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-[var(--dojo-primary)]',
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
    </div>
  )
}

// ===========================================================================
// MatchStatsWidget
// ===========================================================================

export function MatchStatsWidget({ className }: { className?: string }) {
  const stats = MOCK_STATS
  const maxAttackCount = useMemo(
    () => Math.max(...stats.topAttackTypes.map(a => a.count)),
    [stats.topAttackTypes],
  )

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="list" aria-label="Match statistics overview">
        <Card role="listitem">
          <CardContent className="p-3 text-center">
            <Swords className="mx-auto mb-1 h-5 w-5 text-[var(--bu-electric)]" aria-hidden="true" />
            <p className="text-2xl font-bold tabular-nums">{stats.totalMatches}</p>
            <p className="text-xs text-muted-foreground">Total Matches</p>
          </CardContent>
        </Card>
        <Card role="listitem">
          <CardContent className="p-3 text-center">
            <Target className="mx-auto mb-1 h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
            <p className="text-2xl font-bold tabular-nums">{stats.totalRounds}</p>
            <p className="text-xs text-muted-foreground">Total Rounds</p>
          </CardContent>
        </Card>
        <Card role="listitem">
          <CardContent className="p-3 text-center">
            <TrendingUp className="mx-auto mb-1 h-5 w-5 text-emerald-400" aria-hidden="true" />
            <p className="text-2xl font-bold tabular-nums">{stats.overallInjectionRate}%</p>
            <p className="text-xs text-muted-foreground">Injection Rate</p>
          </CardContent>
        </Card>
        <Card role="listitem">
          <CardContent className="p-3 text-center">
            <Award className="mx-auto mb-1 h-5 w-5 text-yellow-400" aria-hidden="true" />
            <p className="text-2xl font-bold tabular-nums">{formatDuration(stats.avgDuration)}</p>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Attack Types */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Swords className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              Most Used Attack Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5" role="list" aria-label="Top attack types">
              {stats.topAttackTypes.map(attack => (
                <StatBar
                  key={attack.type}
                  label={attack.type}
                  value={attack.count}
                  max={maxAttackCount}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Fixtures */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-[var(--bu-electric)]" aria-hidden="true" />
              Most Successful Fixtures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5" role="list" aria-label="Top fixtures by success rate">
              {stats.topFixtures.map(fixture => (
                <RateBar
                  key={fixture.name}
                  label={fixture.name}
                  rate={fixture.successRate}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <LeaderboardView />
    </div>
  )
}

// ===========================================================================
// LeaderboardView
// ===========================================================================

export function LeaderboardView({
  entries,
  className,
}: {
  entries?: LeaderEntry[]
  className?: string
}) {
  const data = entries ?? MOCK_LEADERBOARD

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.winRate - a.winRate || b.wins - a.wins),
    [data],
  )

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-yellow-400" aria-hidden="true" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1" role="list" aria-label="Model leaderboard ranked by win rate">
          {/* Header row */}
          <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-[var(--border-subtle)]" aria-hidden="true">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Model</span>
            <span className="w-14 text-center">W/L/D</span>
            <span className="w-12 text-right">Win %</span>
            <span className="w-16 text-center">Streak</span>
            <span className="hidden sm:block w-24 text-center">Badges</span>
          </div>

          {sorted.map((entry, idx) => {
            const rank = idx + 1
            const isTop3 = rank <= 3
            return (
              <div
                key={entry.modelName}
                role="listitem"
                aria-label={`Rank ${rank}: ${entry.modelName}, ${entry.winRate}% win rate, ${entry.currentStreak} ${entry.streakType === 'W' ? 'win' : entry.streakType === 'L' ? 'loss' : 'draw'} streak`}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 min-h-[44px] motion-safe:transition-colors motion-safe:duration-200',
                  isTop3
                    ? cn('border', RANK_BG[rank])
                    : 'hover:bg-muted/50',
                )}
              >
                {/* Rank */}
                <span className={cn('w-8 text-center font-bold text-sm', RANK_COLORS[rank] ?? 'text-muted-foreground')}>
                  {isTop3 ? (
                    <Trophy className="mx-auto h-4 w-4" aria-hidden="true" />
                  ) : (
                    rank
                  )}
                </span>

                {/* Model info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" title={entry.modelName}>
                    {entry.modelName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{entry.provider}</p>
                </div>

                {/* W/L/D */}
                <span className="w-14 text-center text-xs tabular-nums text-muted-foreground">
                  <span className="text-emerald-400">{entry.wins}</span>
                  /
                  <span className="text-red-400">{entry.losses}</span>
                  /
                  <span className="text-gray-400">{entry.draws}</span>
                </span>

                {/* Win rate */}
                <span className={cn(
                  'w-12 text-right text-xs font-semibold tabular-nums',
                  entry.winRate >= 60 ? 'text-emerald-400' : entry.winRate >= 40 ? 'text-yellow-400' : 'text-red-400',
                )}>
                  {entry.winRate.toFixed(1)}%
                </span>

                {/* Streak */}
                <div className="w-16 flex items-center justify-center gap-1">
                  {entry.currentStreak >= 3 && entry.streakType === 'W' && (
                    <Flame className="h-3.5 w-3.5 text-orange-400 motion-safe:animate-pulse" aria-hidden="true" />
                  )}
                  <span className={cn('text-xs font-semibold tabular-nums', STREAK_COLORS[entry.streakType])}>
                    {entry.currentStreak}{entry.streakType}
                  </span>
                </div>

                {/* Achievement badges (hidden on small screens) */}
                <div className="hidden sm:flex w-24 items-center justify-center gap-0.5 flex-wrap">
                  {entry.achievements.slice(0, 4).map(ach => {
                    const IconComp = ACHIEVEMENT_ICONS[ach.icon]
                    return (
                      <button
                        key={ach.id}
                        type="button"
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] motion-safe:transition-colors"
                        aria-label={`${ach.name}: ${ach.description}`}
                        title={`${ach.name} -- ${ach.description}`}
                      >
                        <IconComp className="h-3.5 w-3.5 text-yellow-400/80" aria-hidden="true" />
                      </button>
                    )
                  })}
                  {entry.achievements.length > 4 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                      +{entry.achievements.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Achievement Legend */}
        <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2">
            Achievement Legend
          </p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Achievement descriptions">
            {[ACH_FIRST_BLOOD, ACH_UNBREAKABLE, ACH_DOUBLE_AGENT, ACH_SPEEDSTER, ACH_PERFECT_DEF, ACH_ARSENAL].map(ach => {
              const IconComp = ACHIEVEMENT_ICONS[ach.icon]
              return (
                <div
                  key={ach.id}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-muted/30 px-2 py-1"
                >
                  <IconComp className="h-3 w-3 text-yellow-400/80" aria-hidden="true" />
                  <span className="text-[10px] font-medium">{ach.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
