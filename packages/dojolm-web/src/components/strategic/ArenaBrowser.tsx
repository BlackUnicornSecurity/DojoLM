'use client'

// ArenaBrowser — Battle Arena match browser with leaderboard, match detail, wizard, and live view
// Story: S75 (original), 15.5 (wizard + API integration)

import { useState, useMemo, useEffect, useCallback } from 'react'
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
  Plus,
  Loader2,
  Download,
} from 'lucide-react'
import type {
  GameMode,
  MatchStatus,
  ArenaMatch as ArenaMatchType,
  MatchConfig,
  MatchFighter,
  WarriorCard as WarriorCardType,
} from '@/lib/arena-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { MatchCreationWizard } from './arena/MatchCreationWizard'
import { LiveMatchView } from './arena/LiveMatchView'
import { WarriorCardGrid } from './arena/WarriorCardGrid'
import { BattleLogExporter } from './arena/BattleLogExporter'

// ===========================================================================
// Display Types (for match table — adapts ArenaMatch to display format)
// ===========================================================================

type FighterRole = 'attacker' | 'defender'

interface DisplayMatch {
  id: string
  agents: { name: string; role: FighterRole }[]
  mode: GameMode
  status: MatchStatus
  winner: string | null
  duration: string
  rounds: number
  startedAt: string
  raw: ArenaMatchType
}

interface DisplayEvent {
  id: string
  round: number
  timestamp: string
  type: 'attack' | 'defend' | 'score' | 'violation' | 'flag_capture'
  agent: string
  description: string
}

// ===========================================================================
// Display Helpers
// ===========================================================================

const ROLE_CONFIG: Record<FighterRole, { icon: typeof Swords; color: string }> = {
  attacker: { icon: Swords, color: 'text-[var(--danger)]' },
  defender: { icon: Shield, color: 'text-[var(--success)]' },
}

const GAME_MODE_TABS: { key: GameMode | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All Modes' },
  { key: 'CTF', label: 'Capture the Flag' },
  { key: 'KOTH', label: 'King of the Hill' },
  { key: 'RvB', label: 'Red vs Blue' },
]

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s'
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes === 0) return `${secs}s`
  return `${minutes}m ${secs.toString().padStart(2, '0')}s`
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return 'Just now'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toDisplayMatch(match: ArenaMatchType): DisplayMatch {
  return {
    id: match.id,
    agents: match.fighters.map((f) => ({ name: f.modelName, role: f.initialRole })),
    mode: match.config.gameMode,
    status: match.status,
    winner: match.winnerId
      ? (match.fighters.find((f) => f.modelId === match.winnerId)?.modelName ?? null)
      : null,
    duration: formatDuration(match.totalDurationMs),
    rounds: match.rounds.length,
    startedAt: formatTimeAgo(match.startedAt),
    raw: match,
  }
}

function toDisplayEvents(match: ArenaMatchType): DisplayEvent[] {
  return match.events.slice(0, 50).map((e) => {
    const eventTypeMap: Record<string, DisplayEvent['type']> = {
      attack_sent: 'attack',
      attack_success: 'attack',
      attack_blocked: 'defend',
      defense_hold: 'defend',
      flag_captured: 'flag_capture',
      score_update: 'score',
      fighter_error: 'violation',
    }
    const fighterName = match.fighters.find((f) => f.modelId === e.fighterId)?.modelName ?? e.fighterId
    return {
      id: e.id,
      round: e.round,
      timestamp: new Date(e.timestamp).toLocaleTimeString(),
      type: eventTypeMap[e.type] ?? 'score',
      agent: fighterName,
      description: typeof e.data?.description === 'string' ? e.data.description : e.type,
    }
  })
}

// ===========================================================================
// Component
// ===========================================================================

export function ArenaBrowser() {
  const [selectedMode, setSelectedMode] = useState<GameMode | 'ALL'>('ALL')
  const [selectedMatch, setSelectedMatch] = useState<DisplayMatch | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null)
  const [liveMatch, setLiveMatch] = useState<ArenaMatchType | null>(null)
  const [exportMatch, setExportMatch] = useState<ArenaMatchType | null>(null)

  // API state
  const [matches, setMatches] = useState<ArenaMatchType[]>([])
  const [warriors, setWarriors] = useState<WarriorCardType[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/arena?limit=50')
      if (res.ok) {
        const data = await res.json()
        setMatches(data.matches ?? [])
      }
    } catch { /* silently fail for now */ }
  }, [])

  // Fetch warriors for leaderboard
  const fetchWarriors = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/arena/warriors')
      if (res.ok) {
        const data = await res.json()
        setWarriors(data.warriors ?? [])
      }
    } catch { /* warriors endpoint may not exist yet */ }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchMatches(), fetchWarriors()]).finally(() => setLoading(false))
  }, [fetchMatches, fetchWarriors])

  // Display matches
  const displayMatches = useMemo(() => matches.map(toDisplayMatch), [matches])

  const filteredMatches = useMemo(() => {
    if (selectedMode === 'ALL') return displayMatches
    return displayMatches.filter((m) => m.mode === selectedMode)
  }, [selectedMode, displayMatches])

  const activeCount = displayMatches.filter((m) => m.status === 'running').length

  // Create match
  const handleCreateMatch = useCallback(async (config: MatchConfig, fighters: MatchFighter[], openLiveView: boolean) => {
    try {
      const res = await fetchWithAuth('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, fighters }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.matchId) {
          await fetchMatches()
          if (openLiveView) {
            setLiveMatchId(data.matchId)
            const matchRes = await fetchWithAuth(`/api/arena/${encodeURIComponent(data.matchId)}`)
            if (matchRes.ok) {
              setLiveMatch(await matchRes.json())
            }
          }
        }
      }
    } catch { /* error handled in UI */ }
  }, [fetchMatches])

  // Selected match detail events
  const selectedMatchEvents = useMemo(() => {
    if (!selectedMatch) return []
    return toDisplayEvents(selectedMatch.raw)
  }, [selectedMatch])

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
        <div className="flex items-center gap-3">
          <Badge variant={activeCount > 0 ? 'active' : 'pending'} dot>
            {activeCount} active {activeCount === 1 ? 'match' : 'matches'}
          </Badge>
          <Button
            variant="gradient"
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="gap-1"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Forge New Battle
          </Button>
        </div>
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

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" aria-hidden="true" />
          <span className="ml-2 text-sm text-muted-foreground">Loading matches...</span>
        </div>
      )}

      {/* Main content: match table + leaderboard */}
      {!loading && (
        <div className="grid lg:grid-cols-3 gap-4">
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
                events={selectedMatchEvents}
                onClose={() => setSelectedMatch(null)}
                onExport={() => {
                  const raw = matches.find(m => m.id === selectedMatch.id)
                  if (raw) setExportMatch(raw)
                }}
              />
            )}
          </div>

          {/* Warrior cards leaderboard */}
          <WarriorCardGrid warriors={warriors} />
        </div>
      )}

      {/* Wizard dialog */}
      <MatchCreationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreateMatch}
      />

      {/* Live match view */}
      {liveMatchId && liveMatch && (
        <LiveMatchView
          matchId={liveMatchId}
          match={liveMatch}
          onClose={() => {
            setLiveMatchId(null)
            setLiveMatch(null)
            fetchMatches()
          }}
          onRematch={() => {
            setLiveMatchId(null)
            setLiveMatch(null)
            setWizardOpen(true)
          }}
        />
      )}

      {/* Battle Log Exporter */}
      {exportMatch && (
        <BattleLogExporter
          match={exportMatch}
          open={true}
          onClose={() => setExportMatch(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchTable({
  matches,
  onSelectMatch,
  selectedMatchId,
}: {
  matches: DisplayMatch[]
  onSelectMatch: (match: DisplayMatch) => void
  selectedMatchId: string | null
}) {
  const getStatusBadge = (status: MatchStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="pending">Pending</Badge>
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
              <TableHead>Fighters</TableHead>
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
                <TableCell className="font-mono text-xs">{match.id.slice(0, 8)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {match.agents.map((agent) => {
                      const config = ROLE_CONFIG[agent.role]
                      const RoleIcon = config.icon
                      return (
                        <span key={agent.name + agent.role} className="inline-flex items-center gap-1 text-xs">
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
                  No matches found. Click &quot;Forge New Battle&quot; to start one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function MatchDetailPanel({
  match,
  events,
  onClose,
  onExport,
}: {
  match: DisplayMatch
  events: DisplayEvent[]
  onClose: () => void
  onExport: () => void
}) {
  const getEventIcon = (type: DisplayEvent['type']) => {
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

  const getEventTypeBadge = (type: DisplayEvent['type']) => {
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
            <CardTitle className="text-base">Match {match.id.slice(0, 8)} Detail</CardTitle>
            <CardDescription>
              {match.mode} - {match.rounds} rounds - Started {match.startedAt}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onExport}
              aria-label="Export match data"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close match detail"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
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
                key={agent.name + agent.role}
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
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No events recorded yet.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

