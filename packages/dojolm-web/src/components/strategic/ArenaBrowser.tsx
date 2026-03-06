/**
 * File: ArenaBrowser.tsx
 * Purpose: Battle Arena match browser with leaderboard and match detail view
 * Story: S75
 * Index:
 * - GameMode type (line 22)
 * - MatchStatus type (line 23)
 * - AgentRole type (line 24)
 * - ArenaMatch interface (line 26)
 * - ArenaAgent interface (line 38)
 * - MatchEvent interface (line 47)
 * - LeaderboardEntry interface (line 54)
 * - Mock data (line 62)
 * - ArenaBrowser component (line 190)
 * - MatchTable component (line 278)
 * - MatchDetailPanel component (line 348)
 * - LeaderboardSidebar component (line 446)
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Swords,
  Trophy,
  Crown,
  Flag,
  Shield,
  Eye,
  Clock,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react'

type GameMode = 'CTF' | 'KOTH' | 'RvB'
type MatchStatus = 'running' | 'completed' | 'aborted'
type AgentRole = 'attacker' | 'defender' | 'observer'

interface ArenaMatch {
  id: string
  agents: { name: string; role: AgentRole }[]
  mode: GameMode
  status: MatchStatus
  winner: string | null
  duration: string
  rounds: number
  startedAt: string
  violations: number
}

interface ArenaAgent {
  name: string
  role: AgentRole
  score: number
}

interface MatchEvent {
  id: string
  round: number
  timestamp: string
  type: 'attack' | 'defend' | 'score' | 'violation' | 'flag_capture'
  agent: string
  description: string
}

interface LeaderboardEntry {
  rank: number
  name: string
  wins: number
  losses: number
  draws: number
  score: number
  winRate: number
}

// ---------------------------------------------------------------------------
// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
// ---------------------------------------------------------------------------

const MOCK_MATCHES: ArenaMatch[] = [
  {
    id: 'M-001',
    agents: [
      { name: 'RedStrike-v3', role: 'attacker' },
      { name: 'Sentinel-v4', role: 'defender' },
    ],
    mode: 'CTF',
    status: 'running',
    winner: null,
    duration: '14m 32s',
    rounds: 7,
    startedAt: '2 min ago',
    violations: 0,
  },
  {
    id: 'M-002',
    agents: [
      { name: 'ChaosBot-v2', role: 'attacker' },
      { name: 'Bastion-v1', role: 'defender' },
      { name: 'Watcher-v1', role: 'observer' },
    ],
    mode: 'KOTH',
    status: 'running',
    winner: null,
    duration: '8m 15s',
    rounds: 4,
    startedAt: '8 min ago',
    violations: 1,
  },
  {
    id: 'M-003',
    agents: [
      { name: 'Phantom-v2', role: 'attacker' },
      { name: 'IronWall-v3', role: 'defender' },
    ],
    mode: 'RvB',
    status: 'completed',
    winner: 'IronWall-v3',
    duration: '22m 47s',
    rounds: 12,
    startedAt: '35 min ago',
    violations: 2,
  },
  {
    id: 'M-004',
    agents: [
      { name: 'RedStrike-v3', role: 'attacker' },
      { name: 'Guardian-v2', role: 'defender' },
    ],
    mode: 'CTF',
    status: 'completed',
    winner: 'RedStrike-v3',
    duration: '18m 03s',
    rounds: 10,
    startedAt: '1 hour ago',
    violations: 0,
  },
  {
    id: 'M-005',
    agents: [
      { name: 'ShadowNet-v1', role: 'attacker' },
      { name: 'Sentinel-v4', role: 'defender' },
    ],
    mode: 'KOTH',
    status: 'completed',
    winner: 'Sentinel-v4',
    duration: '25m 11s',
    rounds: 15,
    startedAt: '2 hours ago',
    violations: 3,
  },
  {
    id: 'M-006',
    agents: [
      { name: 'ChaosBot-v2', role: 'attacker' },
      { name: 'IronWall-v3', role: 'defender' },
    ],
    mode: 'RvB',
    status: 'aborted',
    winner: null,
    duration: '3m 44s',
    rounds: 2,
    startedAt: '3 hours ago',
    violations: 5,
  },
]

const MOCK_MATCH_EVENTS: MatchEvent[] = [
  { id: 'e1', round: 1, timestamp: '00:00:12', type: 'attack', agent: 'RedStrike-v3', description: 'Launched delimiter-break probe against system prompt boundary' },
  { id: 'e2', round: 1, timestamp: '00:00:14', type: 'defend', agent: 'Sentinel-v4', description: 'Detected and blocked delimiter injection attempt' },
  { id: 'e3', round: 1, timestamp: '00:00:15', type: 'score', agent: 'Sentinel-v4', description: 'Defense score +10 for successful block' },
  { id: 'e4', round: 2, timestamp: '00:02:33', type: 'attack', agent: 'RedStrike-v3', description: 'Deployed Base64-encoded role swap payload' },
  { id: 'e5', round: 2, timestamp: '00:02:35', type: 'defend', agent: 'Sentinel-v4', description: 'Decoded and neutralized encoded payload' },
  { id: 'e6', round: 3, timestamp: '00:05:01', type: 'attack', agent: 'RedStrike-v3', description: 'Context injection via conversation history manipulation' },
  { id: 'e7', round: 3, timestamp: '00:05:04', type: 'flag_capture', agent: 'RedStrike-v3', description: 'Captured flag: Bypassed context boundary check' },
  { id: 'e8', round: 3, timestamp: '00:05:04', type: 'score', agent: 'RedStrike-v3', description: 'Attack score +25 for flag capture' },
  { id: 'e9', round: 4, timestamp: '00:07:22', type: 'violation', agent: 'RedStrike-v3', description: 'Warning: Payload exceeded content safety threshold' },
]

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Sentinel-v4', wins: 47, losses: 8, draws: 3, score: 2840, winRate: 81.0 },
  { rank: 2, name: 'IronWall-v3', wins: 42, losses: 12, draws: 4, score: 2650, winRate: 72.4 },
  { rank: 3, name: 'RedStrike-v3', wins: 39, losses: 15, draws: 2, score: 2510, winRate: 69.6 },
  { rank: 4, name: 'ChaosBot-v2', wins: 31, losses: 22, draws: 5, score: 2120, winRate: 53.4 },
  { rank: 5, name: 'Guardian-v2', wins: 28, losses: 24, draws: 6, score: 1950, winRate: 48.3 },
  { rank: 6, name: 'Phantom-v2', wins: 25, losses: 27, draws: 4, score: 1780, winRate: 44.6 },
  { rank: 7, name: 'ShadowNet-v1', wins: 18, losses: 34, draws: 2, score: 1340, winRate: 33.3 },
  { rank: 8, name: 'Bastion-v1', wins: 15, losses: 36, draws: 3, score: 1150, winRate: 27.8 },
  { rank: 9, name: 'Watcher-v1', wins: 10, losses: 5, draws: 40, score: 980, winRate: 18.2 },
]

const GAME_MODE_TABS: { key: GameMode | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Modes' },
  { key: 'CTF', label: 'Capture the Flag' },
  { key: 'KOTH', label: 'King of the Hill' },
  { key: 'RvB', label: 'Red vs Blue' },
]

const ROLE_CONFIG: Record<AgentRole, { icon: typeof Swords; color: string }> = {
  attacker: { icon: Swords, color: 'text-[var(--danger)]' },
  defender: { icon: Shield, color: 'text-[var(--success)]' },
  observer: { icon: Eye, color: 'text-muted-foreground' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Arena Browser - Match listing, detail view, and leaderboard
 */
export function ArenaBrowser() {
  const [selectedMode, setSelectedMode] = useState<GameMode | 'ALL'>('ALL')
  const [selectedMatch, setSelectedMatch] = useState<ArenaMatch | null>(null)

  const filteredMatches = useMemo(() => {
    if (selectedMode === 'ALL') return MOCK_MATCHES
    return MOCK_MATCHES.filter((m) => m.mode === selectedMode)
  }, [selectedMode])

  const activeCount = MOCK_MATCHES.filter((m) => m.status === 'running').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-[var(--warning)]" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Battle Arena</h3>
            <p className="text-sm text-muted-foreground">
              Multi-agent adversarial sandbox
            </p>
          </div>
        </div>
        <Badge variant={activeCount > 0 ? 'active' : 'pending'} dot>
          {activeCount} active {activeCount === 1 ? 'match' : 'matches'}
        </Badge>
      </div>

      {/* Game mode selector */}
      <Tabs value={selectedMode} onValueChange={(v) => setSelectedMode(v as typeof selectedMode)}>
        <TabsList aria-label="Game mode filter" className="bg-muted/50">
          {GAME_MODE_TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key} className="min-h-[44px]">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Main content: match table + leaderboard */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* Match table */}
        <div className="lg:col-span-2 space-y-4">
          <MatchTable
            matches={filteredMatches}
            onSelectMatch={setSelectedMatch}
            selectedMatchId={selectedMatch?.id ?? null}
          />

          {/* Match detail panel */}
          {selectedMatch && (
            <MatchDetailPanel
              match={selectedMatch}
              events={MOCK_MATCH_EVENTS}
              onClose={() => setSelectedMatch(null)}
            />
          )}
        </div>

        {/* Leaderboard sidebar */}
        <LeaderboardSidebar entries={MOCK_LEADERBOARD} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Match table listing all matches with filters applied
 */
function MatchTable({
  matches,
  onSelectMatch,
  selectedMatchId,
}: {
  matches: ArenaMatch[]
  onSelectMatch: (match: ArenaMatch) => void
  selectedMatchId: string | null
}) {
  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'running':
        return <Badge variant="active" dot>Live</Badge>
      case 'completed':
        return <Badge variant="success">Done</Badge>
      case 'aborted':
        return <Badge variant="error">Aborted</Badge>
    }
  }

  const getModeBadge = (mode: GameMode) => {
    switch (mode) {
      case 'CTF':
        return <Badge variant="outline"><Flag className="w-3 h-3 mr-1" aria-hidden="true" />CTF</Badge>
      case 'KOTH':
        return <Badge variant="outline"><Crown className="w-3 h-3 mr-1" aria-hidden="true" />KOTH</Badge>
      case 'RvB':
        return <Badge variant="outline"><Swords className="w-3 h-3 mr-1" aria-hidden="true" />RvB</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Matches</CardTitle>
        <CardDescription>{matches.length} matches found</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Agents</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Winner</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.map((match) => (
              <TableRow
                key={match.id}
                className={cn(
                  'cursor-pointer',
                  selectedMatchId === match.id && 'bg-muted/50'
                )}
                onClick={() => onSelectMatch(match)}
              >
                <TableCell className="font-mono text-xs">{match.id}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {match.agents.map((agent) => {
                      const config = ROLE_CONFIG[agent.role]
                      const RoleIcon = config.icon
                      return (
                        <span key={agent.name} className="inline-flex items-center gap-1 text-xs">
                          <RoleIcon className={cn('w-3 h-3', config.color)} aria-hidden="true" />
                          <span className="text-[var(--foreground)]">{agent.name}</span>
                        </span>
                      )
                    })}
                  </div>
                </TableCell>
                <TableCell>{getModeBadge(match.mode)}</TableCell>
                <TableCell>{getStatusBadge(match.status)}</TableCell>
                <TableCell>
                  {match.winner ? (
                    <span className="text-sm font-medium text-[var(--success)]">{match.winner}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">--</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    {match.duration}
                  </span>
                </TableCell>
                <TableCell>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                </TableCell>
              </TableRow>
            ))}
            {matches.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No matches found for the selected game mode.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

/**
 * Match detail panel showing events, scores, and violations
 */
function MatchDetailPanel({
  match,
  events,
  onClose,
}: {
  match: ArenaMatch
  events: MatchEvent[]
  onClose: () => void
}) {
  const getEventIcon = (type: MatchEvent['type']) => {
    switch (type) {
      case 'attack':
        return <Swords className="w-4 h-4 text-[var(--danger)]" aria-hidden="true" />
      case 'defend':
        return <Shield className="w-4 h-4 text-[var(--success)]" aria-hidden="true" />
      case 'score':
        return <CheckCircle className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
      case 'violation':
        return <AlertTriangle className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
      case 'flag_capture':
        return <Flag className="w-4 h-4 text-[var(--severity-high)]" aria-hidden="true" />
    }
  }

  const getEventTypeBadge = (type: MatchEvent['type']) => {
    switch (type) {
      case 'attack':
        return <Badge variant="error">Attack</Badge>
      case 'defend':
        return <Badge variant="success">Defend</Badge>
      case 'score':
        return <Badge variant="active">Score</Badge>
      case 'violation':
        return <Badge variant="warning">Violation</Badge>
      case 'flag_capture':
        return <Badge variant="strike">Flag</Badge>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Match {match.id} Detail</CardTitle>
            <CardDescription>
              {match.mode} - {match.rounds} rounds - Started {match.startedAt}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close match detail"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agents and scores */}
        <div className="flex flex-wrap gap-3">
          {match.agents.map((agent) => {
            const config = ROLE_CONFIG[agent.role]
            const RoleIcon = config.icon
            const isWinner = match.winner === agent.name
            return (
              <div
                key={agent.name}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)]',
                  isWinner && 'border-[var(--success)] bg-[var(--success)]/5'
                )}
              >
                <RoleIcon className={cn('w-4 h-4', config.color)} aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {agent.name}
                    {isWinner && (
                      <Trophy className="w-3 h-3 inline-block ml-1 text-[var(--warning)]" aria-hidden="true" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{agent.role}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Violations summary */}
        {match.violations > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/20">
            <AlertTriangle className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
            <span className="text-sm text-[var(--warning)]">
              {match.violations} violation{match.violations !== 1 ? 's' : ''} recorded
            </span>
          </div>
        )}

        {/* Event log */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Event Log</h4>
          <div
            className="max-h-64 overflow-y-auto space-y-1 pr-1"
            role="log"
            aria-label="Match event log"
          >
            {events.map((event) => (
              <div
                key={event.id}
                className={cn(
                  'flex items-start gap-3 p-2 rounded-lg',
                  'hover:bg-[var(--bg-quaternary)]',
                  'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]'
                )}
              >
                <div className="mt-0.5 flex-shrink-0">{getEventIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      R{event.round} {event.timestamp}
                    </span>
                    {getEventTypeBadge(event.type)}
                    <span className="text-xs font-medium text-[var(--foreground)]">{event.agent}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Leaderboard sidebar showing agent rankings
 */
function LeaderboardSidebar({ entries }: { entries: LeaderboardEntry[] }) {
  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" aria-hidden="true" />
      case 2:
        return <Trophy className="w-5 h-5 text-gray-400" aria-hidden="true" />
      case 3:
        return <Trophy className="w-5 h-5 text-amber-600" aria-hidden="true" />
      default:
        return <span className="text-sm text-muted-foreground font-mono">#{rank}</span>
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </div>
        <CardDescription>{entries.length} agents ranked</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-[var(--border)]" aria-label="Agent leaderboard">
          {entries.map((entry) => (
            <li
              key={entry.name}
              className={cn(
                'flex items-center gap-3 px-4 py-3',
                'hover:bg-muted/30 motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center flex-shrink-0">
                {getRankDisplay(entry.rank)}
              </div>

              {/* Agent info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                  {entry.wins}W / {entry.losses}L / {entry.draws}D
                </p>
              </div>

              {/* Score and win rate */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[var(--foreground)]">{entry.score.toLocaleString()}</p>
                <p className={cn(
                  'text-xs font-medium',
                  entry.winRate >= 60
                    ? 'text-[var(--success)]'
                    : entry.winRate >= 40
                      ? 'text-[var(--warning)]'
                      : 'text-[var(--danger)]'
                )}>
                  {entry.winRate.toFixed(1)}%
                </p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
