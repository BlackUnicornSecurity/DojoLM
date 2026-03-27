'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  X, Trophy, RotateCcw, Eye, Download,
  Swords, Shield, Loader2, Volume2, VolumeX,
} from 'lucide-react'
import type {
  ArenaMatch, MatchEvent, MatchRound, MatchStatus,
} from '@/lib/arena-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { LiveCommentary } from './LiveCommentary'
import { LiveInferencePanel } from './LiveInferencePanel'
import { WarriorCard } from './WarriorCard'
import { useMatchAnimations, MatchAnimationOverlay } from './MatchAnimations'
import { getArenaAudio } from '@/lib/arena-audio'
import type { SoundType } from '@/lib/arena-audio'
import { BattleLogExporter } from './BattleLogExporter'
import { connectAuthenticatedEventStream, type AuthenticatedEventStream } from '@/lib/authenticated-event-stream'

// ===========================================================================
// SSE Hook
// ===========================================================================

interface ArenaStreamState {
  events: MatchEvent[]
  status: MatchStatus
  scores: Record<string, number>
  winnerId: string | null
  connected: boolean
  error: string | null
}

function useArenaStream(matchId: string | null): ArenaStreamState {
  const [state, setState] = useState<ArenaStreamState>({
    events: [],
    status: 'pending',
    scores: {},
    winnerId: null,
    connected: false,
    error: null,
  })
  const eventSourceRef = useRef<AuthenticatedEventStream | null>(null)

  useEffect(() => {
    if (!matchId) return

    const es = connectAuthenticatedEventStream(`/api/arena/${encodeURIComponent(matchId)}/stream`)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setState((prev) => ({ ...prev, connected: true, error: null }))
    })

    es.addEventListener('match_event', (e) => {
      try {
        const event = JSON.parse(e.data) as MatchEvent
        setState((prev) => ({
          ...prev,
          events: [...prev.events, event],
        }))
      } catch { /* ignore malformed */ }
    })

    es.addEventListener('status', (e) => {
      try {
        const data = JSON.parse(e.data) as { status: MatchStatus; scores: Record<string, number> }
        setState((prev) => ({
          ...prev,
          status: data.status,
          scores: data.scores,
        }))
      } catch { /* ignore malformed */ }
    })

    es.addEventListener('match_complete', (e) => {
      try {
        const data = JSON.parse(e.data) as { winnerId: string | null; status: MatchStatus; scores: Record<string, number> }
        setState((prev) => ({
          ...prev,
          status: data.status,
          scores: data.scores,
          winnerId: data.winnerId,
        }))
      } catch { /* ignore malformed */ }
      es.close()
    })

    es.addEventListener('error', () => {
      setState((prev) => ({ ...prev, connected: false, error: 'Connection lost' }))
    })

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [matchId])

  return state
}

// ===========================================================================
// Types
// ===========================================================================

interface LiveMatchViewProps {
  matchId: string
  match: ArenaMatch
  onClose: () => void
  onRematch?: () => void
}

// ===========================================================================
// Component
// ===========================================================================

// Map match event types to sound types
const EVENT_SOUND_MAP: Partial<Record<string, SoundType>> = {
  attack_success: 'katana',
  flag_captured: 'katana',
  hill_claimed: 'katana',
  attack_blocked: 'block',
  defense_hold: 'block',
  hill_held: 'block',
  score_update: 'score',
  match_start: 'match-start',
  match_end: 'match-end',
}

export function LiveMatchView({ matchId, match, onClose, onRematch }: LiveMatchViewProps) {
  const stream = useArenaStream(matchId)
  const { activeAnimations, triggerAnimation } = useMatchAnimations()
  const [soundMuted, setSoundMuted] = useState(true)
  const lastProcessedRef = useRef(0)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [currentMatch, setCurrentMatch] = useState<ArenaMatch>(match)
  const [showResults, setShowResults] = useState(false)
  const [showExporter, setShowExporter] = useState(false)
  const [hasAutoOpenedResults, setHasAutoOpenedResults] = useState(false)
  const [exportableMatch, setExportableMatch] = useState<ArenaMatch>(match)

  // Sync mute state to audio singleton
  useEffect(() => {
    getArenaAudio().setMuted(soundMuted)
  }, [soundMuted])

  // Handle sound toggle — init AudioContext on first unmute (user gesture)
  const handleToggleSound = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev
      const audio = getArenaAudio()
      if (!next) audio.init()
      audio.setMuted(next)
      return next
    })
  }, [])

  // Route SSE events to animations + audio with 200ms batch debounce
  useEffect(() => {
    if (stream.events.length <= lastProcessedRef.current) return

    const newEvents = stream.events.slice(lastProcessedRef.current)
    lastProcessedRef.current = stream.events.length

    // Debounce: batch events across rapid state updates, then process all
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      for (const event of newEvents) {
        // Trigger animation (respects motion-reduce via CSS)
        triggerAnimation({
          id: event.id,
          type: event.type,
          data: event.data as Record<string, unknown> | undefined,
        })

        // Trigger sound (respects mute independently)
        const sound = EVENT_SOUND_MAP[event.type]
        if (sound) {
          getArenaAudio().play(sound)
        }
      }
    }, 200)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [stream.events, triggerAnimation])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const refreshCurrentMatch = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`/api/arena/${encodeURIComponent(matchId)}`)
      if (!response.ok) return
      const data = await response.json()
      setCurrentMatch(data as ArenaMatch)
      setExportableMatch(data as ArenaMatch)
    } catch {
      // Keep the last known snapshot if refresh fails
    }
  }, [matchId])

  useEffect(() => {
    setCurrentMatch(match)
    setExportableMatch(match)
    setShowResults(false)
    setShowExporter(false)
    setHasAutoOpenedResults(false)
  }, [match, matchId])

  const fighterNames = useMemo(() => {
    const names: Record<string, string> = {}
    for (const f of currentMatch.fighters) {
      names[f.modelId] = f.modelName
    }
    return names
  }, [currentMatch.fighters])

  const isMirrorMatch = currentMatch.fighters.length >= 2 &&
    currentMatch.fighters[0].modelId === currentMatch.fighters[1].modelId

  const isFinished = stream.status === 'completed' || stream.status === 'aborted'

  // Determine current roles from stream events (role_swap) or fall back to initial roles
  const currentRoles = useMemo(() => {
    const roles: Record<string, 'attacker' | 'defender'> = {}
    if (currentMatch.fighters.length >= 2) {
      // Default to initial roles
      for (const f of currentMatch.fighters) {
        roles[f.modelId] = f.initialRole
      }
      // Check stream events for role swaps (more up-to-date than match.rounds)
      for (const evt of stream.events) {
        if (evt.type === 'role_swap' && evt.data) {
          const swapData = evt.data as Record<string, string>
          if (swapData.attackerId) roles[swapData.attackerId] = 'attacker'
          if (swapData.defenderId) roles[swapData.defenderId] = 'defender'
          if (swapData.newAttacker) roles[swapData.newAttacker] = 'attacker'
          if (swapData.newDefender) roles[swapData.newDefender] = 'defender'
        }
      }
    }
    return roles
  }, [currentMatch.fighters, stream.events])

  const latestEventRound = stream.events.length > 0
    ? stream.events[stream.events.length - 1].round
    : undefined

  useEffect(() => {
    if (!isFinished) return
    void refreshCurrentMatch()
  }, [isFinished, refreshCurrentMatch])

  useEffect(() => {
    const latestEventType = stream.events[stream.events.length - 1]?.type
    if (!latestEventType) return
    if (!['round_end', 'fighter_error', 'match_end'].includes(latestEventType)) return
    void refreshCurrentMatch()
  }, [refreshCurrentMatch, stream.events])

  useEffect(() => {
    if (isFinished && !hasAutoOpenedResults) {
      // Delay results overlay for dramatic effect
      const timer = setTimeout(() => {
        setShowResults(true)
        setHasAutoOpenedResults(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [hasAutoOpenedResults, isFinished])

  const matchError = typeof currentMatch.metadata.error === 'string'
    ? currentMatch.metadata.error
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-match-title"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <Swords className="w-5 h-5 text-[var(--dojo-primary)]" aria-hidden="true" />
          <div>
            <h2 id="live-match-title" className="text-base font-bold text-[var(--foreground)]">
              {currentMatch.config.gameMode} — {currentMatch.config.attackMode}
            </h2>
            <p className="text-xs text-muted-foreground">
              Match {matchId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badge */}
          <Badge
            variant={
              stream.status === 'running' ? 'active' :
              stream.status === 'completed' ? 'success' :
              stream.status === 'aborted' ? 'error' : 'pending'
            }
            dot={stream.status === 'running'}
          >
            {stream.status === 'running' ? 'Live' : stream.status}
          </Badge>

          {/* Connection indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              stream.connected ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'
            )}
            role="status"
            aria-label={stream.connected ? 'Connected' : 'Disconnected'}
          />

          {/* Sound toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSound}
            aria-label={soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
          >
            {soundMuted ? (
              <VolumeX className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Volume2 className="w-4 h-4" aria-hidden="true" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close live view"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Main content: 3-column layout */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_2fr_1fr] gap-4 p-4">
        {/* Left: Attacker card */}
        <div className="flex flex-col gap-4">
          {currentMatch.fighters.filter((f) => currentRoles[f.modelId] === 'attacker').map((fighter) => (
            <WarriorCard
              key={fighter.modelId + '-attacker'}
              fighter={fighter}
              currentRole="attacker"
              score={stream.scores[fighter.modelId] ?? 0}
              isWinner={stream.winnerId === null ? null : stream.winnerId === fighter.modelId}
              isMirrorMatch={isMirrorMatch}
              lastEventRound={latestEventRound}
            />
          ))}

          {/* Score comparison */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between text-center">
                {currentMatch.fighters.map((fighter) => (
                  <div key={fighter.modelId} className="flex-1">
                    <p className="text-2xl font-bold font-mono text-[var(--foreground)]">
                      {stream.scores[fighter.modelId] ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{fighter.modelName}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center: Commentary */}
        <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--card)]">
          <div className="flex-1 overflow-hidden p-4">
            <LiveCommentary
              events={stream.events}
              fighterNames={fighterNames}
            />
          </div>
        </div>

        {/* Right: Defender card */}
        <div className="flex flex-col gap-4">
          {currentMatch.fighters.filter((f) => currentRoles[f.modelId] === 'defender').map((fighter) => (
            <WarriorCard
              key={fighter.modelId + '-defender'}
              fighter={fighter}
              currentRole="defender"
              score={stream.scores[fighter.modelId] ?? 0}
              isWinner={stream.winnerId === null ? null : stream.winnerId === fighter.modelId}
              isMirrorMatch={isMirrorMatch}
              lastEventRound={latestEventRound}
            />
          ))}

          {/* Match info */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Rounds</span>
                <span className="font-mono text-[var(--foreground)]">
                  {currentMatch.rounds.length} / {currentMatch.config.maxRounds}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Victory Points</span>
                <span className="font-mono text-[var(--foreground)]">{currentMatch.config.victoryPoints}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Events</span>
                <span className="font-mono text-[var(--foreground)]">{stream.events.length}</span>
              </div>
              {matchError && (
                <p className="text-xs text-[var(--danger)] break-words">{matchError}</p>
              )}
              {stream.error && (
                <p className="text-xs text-[var(--danger)]">{stream.error}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom: Inference panel */}
      <LiveInferencePanel
        rounds={currentMatch.rounds}
        fighterNames={fighterNames}
      />

      {/* Animation overlay */}
      <MatchAnimationOverlay animations={activeAnimations} />

      {/* Results overlay */}
      {showResults && isFinished && (
        <MatchResultsOverlay
          match={currentMatch}
          scores={stream.scores}
          winnerId={stream.winnerId}
          status={stream.status}
          onClose={() => setShowResults(false)}
          onRematch={onRematch}
          onViewLog={() => setShowResults(false)}
          onExport={() => { setShowResults(false); setShowExporter(true) }}
        />
      )}

      {/* Battle Log Exporter */}
      <BattleLogExporter
        match={exportableMatch}
        open={showExporter}
        onClose={() => setShowExporter(false)}
      />
    </div>
  )
}

// ===========================================================================
// Match Results Overlay (Story 16.5)
// ===========================================================================

function MatchResultsOverlay({
  match,
  scores,
  winnerId,
  status,
  onClose,
  onRematch,
  onViewLog,
  onExport,
}: {
  match: ArenaMatch
  scores: Record<string, number>
  winnerId: string | null
  status: MatchStatus
  onClose: () => void
  onRematch?: () => void
  onViewLog: () => void
  onExport: () => void
}) {
  const winner = match.fighters.find((f) => f.modelId === winnerId)
  const isDraw = winnerId === null && status === 'completed'
  const matchError = typeof match.metadata.error === 'string'
    ? match.metadata.error
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md mx-4 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-lg overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95">
        {/* Trophy header */}
        <div className="text-center py-6 bg-gradient-to-b from-[var(--accent-gold)]/10 to-transparent">
          <Trophy className="w-12 h-12 mx-auto text-[var(--accent-gold)] mb-3" aria-hidden="true" />
          <h3 className="text-xl font-bold text-[var(--foreground)]">
            {status === 'aborted' ? 'Match Aborted' : isDraw ? 'Draw!' : 'Victory!'}
          </h3>
          {winner && (
            <p className="text-sm text-[var(--accent-gold)] font-medium mt-1">
              {winner.modelName}
            </p>
          )}
          {matchError && (
            <p className="text-xs text-[var(--danger)] mt-2 px-6 break-words">
              {matchError}
            </p>
          )}
        </div>

        {/* Score comparison */}
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between py-4">
            {match.fighters.map((fighter, i) => {
              const isWinner = fighter.modelId === winnerId
              return (
                <div key={fighter.modelId} className={cn('text-center flex-1', i > 0 && 'border-l border-[var(--border)]')}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {fighter.initialRole === 'attacker' ? (
                      <Swords className="w-3.5 h-3.5 text-[var(--danger)]" aria-hidden="true" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-[var(--success)]" aria-hidden="true" />
                    )}
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {fighter.modelName}
                    </span>
                  </div>
                  <p className={cn(
                    'text-3xl font-bold font-mono',
                    isWinner ? 'text-[var(--accent-gold)]' : 'text-[var(--foreground)]'
                  )}>
                    {scores[fighter.modelId] ?? 0}
                  </p>
                  {isWinner && (
                    <Badge variant="strike" className="text-xs mt-1">Winner</Badge>
                  )}
                </div>
              )
            })}
          </div>

          {/* Round breakdown */}
          <div className="text-center text-xs text-muted-foreground mb-4">
            {match.rounds.length} rounds completed in {match.config.gameMode} mode
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 gap-1"
              onClick={onViewLog}
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              View Log
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-1"
              onClick={onExport}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export
            </Button>
            {onRematch && (
              <Button
                variant="outline"
                className="flex-1 gap-1"
                onClick={onRematch}
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Rematch
              </Button>
            )}
            <Button
              variant="ghost"
              className="flex-1 gap-1"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
