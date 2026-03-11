/**
 * File: MatchDetailView.tsx
 * Purpose: Detailed match view with round timeline, per-round metrics, event feed
 * Story: 7.4 — Arena Battle Detail View
 * Index:
 * - MatchDetailView component (line 18)
 * - RoundTimeline (line 75)
 * - RoundDetail (line 120)
 * - EventFeed (line 175)
 */

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Swords, Shield, Trophy, Clock, Target, AlertTriangle,
  ChevronRight, Zap, Flag, Mountain,
} from 'lucide-react'
import type { ArenaMatch, MatchRound, MatchEvent } from '@/lib/arena-types'

interface MatchDetailViewProps {
  match: ArenaMatch
}

const EVENT_ICONS: Record<string, typeof Swords> = {
  match_start: Zap,
  round_start: ChevronRight,
  attack_sent: Swords,
  attack_success: Target,
  defense_success: Shield,
  flag_captured: Flag,
  hill_claimed: Mountain,
  role_swap: Swords,
  match_end: Trophy,
}

export function MatchDetailView({ match }: MatchDetailViewProps) {
  const [selectedRound, setSelectedRound] = useState<number | null>(null)

  const fighter1 = match.fighters[0]
  const fighter2 = match.fighters[1]

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm font-bold">{fighter1?.modelName ?? 'Fighter 1'}</p>
                <p className="text-xs text-muted-foreground">{fighter1?.provider}</p>
              </div>
              <Badge variant="outline" className="text-lg font-mono px-3">
                {match.scores[fighter1?.modelId ?? ''] ?? 0} — {match.scores[fighter2?.modelId ?? ''] ?? 0}
              </Badge>
              <div className="text-center">
                <p className="text-sm font-bold">{fighter2?.modelName ?? 'Fighter 2'}</p>
                <p className="text-xs text-muted-foreground">{fighter2?.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{match.config.gameMode}</Badge>
              <Badge variant="outline">{match.config.attackMode}</Badge>
              <Badge variant={match.status === 'completed' ? 'success' : 'outline'}>
                {match.status}
              </Badge>
            </div>
          </div>

          {match.winnerId && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-[var(--accent-gold)]" />
              <span className="font-medium">
                Winner: {match.fighters.find(f => f.modelId === match.winnerId)?.modelName}
              </span>
              {match.winReason && (
                <span className="text-muted-foreground">— {match.winReason}</span>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {(match.totalDurationMs / 1000).toFixed(1)}s
            </span>
            <span>{match.rounds.length} rounds</span>
            <span>{match.events.length} events</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Round Timeline */}
        <div className="lg:col-span-1">
          <RoundTimeline
            rounds={match.rounds}
            fighters={match.fighters}
            selectedRound={selectedRound}
            onSelectRound={setSelectedRound}
          />
        </div>

        {/* Round Detail or Event Feed */}
        <div className="lg:col-span-2">
          {selectedRound !== null && match.rounds[selectedRound] ? (
            <RoundDetail
              round={match.rounds[selectedRound]}
              fighters={match.fighters}
            />
          ) : (
            <EventFeed events={match.events} fighters={match.fighters} />
          )}
        </div>
      </div>
    </div>
  )
}

function RoundTimeline({
  rounds,
  fighters,
  selectedRound,
  onSelectRound,
}: {
  rounds: MatchRound[]
  fighters: ArenaMatch['fighters']
  selectedRound: number | null
  onSelectRound: (idx: number | null) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Round Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <button
          onClick={() => onSelectRound(null)}
          className={cn(
            'w-full text-left px-3 py-2 rounded-lg text-xs',
            selectedRound === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          All Events
        </button>
        {rounds.map((round, idx) => {
          const attacker = fighters.find(f => f.modelId === round.attackerId)
          return (
            <button
              key={idx}
              onClick={() => onSelectRound(idx)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-lg',
                selectedRound === idx ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Round {round.roundNumber}</span>
                <Badge
                  variant={round.scanVerdict === 'BLOCK' ? 'error' : 'success'}
                  className="text-[10px]"
                >
                  {round.scanVerdict}
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {attacker?.modelName ?? 'Unknown'} attacks
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">
                  {round.durationMs}ms
                </span>
                {round.injectionSuccess > 0.5 && (
                  <AlertTriangle className="h-3 w-3 text-[var(--danger)]" />
                )}
              </div>
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}

function RoundDetail({
  round,
  fighters,
}: {
  round: MatchRound
  fighters: ArenaMatch['fighters']
}) {
  const attacker = fighters.find(f => f.modelId === round.attackerId)
  const defender = fighters.find(f => f.modelId === round.defenderId)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Round {round.roundNumber} Detail
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Round Meta */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-[var(--danger)]" />
            <span>Attacker: {attacker?.modelName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--success)]" />
            <span>Defender: {defender?.modelName}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-3">
          <MetricCard label="Injection" value={`${(round.injectionSuccess * 100).toFixed(0)}%`} />
          <MetricCard label="Verdict" value={round.scanVerdict} />
          <MetricCard label="Severity" value={round.scanSeverity ?? 'None'} />
          <MetricCard label="Duration" value={`${round.durationMs}ms`} />
        </div>

        {/* Prompt */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Attack Prompt</p>
          <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
            {round.prompt}
          </pre>
        </div>

        {/* Response */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Defense Response</p>
          <pre className="text-xs bg-muted/50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
            {round.response}
          </pre>
        </div>

        {/* Round Events */}
        {round.events.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Round Events ({round.events.length})
            </p>
            <div className="space-y-1">
              {round.events.map((event, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{event.type}</span>
                  {'detail' in event.data && <span className="truncate">{String(event.data.detail)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-bold">{value}</p>
    </div>
  )
}

function EventFeed({
  events,
  fighters,
}: {
  events: MatchEvent[]
  fighters: ArenaMatch['fighters']
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Event Feed ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 max-h-[500px] overflow-y-auto">
          {events.map((event, idx) => {
            const Icon = EVENT_ICONS[event.type] ?? ChevronRight
            const fighter = fighters.find(f => f.modelId === event.fighterId)
            return (
              <div
                key={idx}
                className="flex items-start gap-2 py-1.5 border-b border-[var(--border-subtle)] last:border-0"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{event.type.replace(/_/g, ' ')}</span>
                    {event.round !== undefined && (
                      <Badge variant="outline" className="text-[10px]">R{event.round}</Badge>
                    )}
                  </div>
                  {fighter && (
                    <p className="text-[10px] text-muted-foreground">{fighter.modelName}</p>
                  )}
                  {'detail' in event.data && (
                    <p className="text-[10px] text-muted-foreground truncate">{String(event.data.detail)}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
