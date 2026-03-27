/**
 * File: live-match-view.test.tsx
 * Purpose: Regression tests for LiveMatchView
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { ArenaMatch, MatchStatus } from '@/lib/arena-types'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Trophy: () => <span>Trophy</span>,
  RotateCcw: () => <span>RotateCcw</span>,
  Eye: () => <span>Eye</span>,
  Download: () => <span>Download</span>,
  Swords: () => <span>Swords</span>,
  Shield: () => <span>Shield</span>,
  Loader2: () => <span>Loader2</span>,
  Volume2: () => <span>Volume2</span>,
  VolumeX: () => <span>VolumeX</span>,
}))

vi.mock('../strategic/arena/LiveCommentary', () => ({
  LiveCommentary: () => <div>Commentary</div>,
}))

vi.mock('../strategic/arena/LiveInferencePanel', () => ({
  LiveInferencePanel: ({ rounds }: { rounds: Array<{ roundNumber: number }> }) => (
    <div>Rounds: {rounds.length}</div>
  ),
}))

vi.mock('../strategic/arena/WarriorCard', () => ({
  WarriorCard: ({ fighter }: { fighter: { modelName: string } }) => <div>{fighter.modelName}</div>,
}))

vi.mock('../strategic/arena/MatchAnimations', () => ({
  useMatchAnimations: () => ({ activeAnimations: [], triggerAnimation: vi.fn() }),
  MatchAnimationOverlay: () => null,
}))

vi.mock('../strategic/arena/BattleLogExporter', () => ({
  BattleLogExporter: () => null,
}))

vi.mock('@/lib/arena-audio', () => ({
  getArenaAudio: () => ({
    init: vi.fn(),
    setMuted: vi.fn(),
    play: vi.fn(),
  }),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

type StreamListener = (event: { data: string }) => void

class MockStream {
  listeners = new Map<string, StreamListener[]>()
  close = vi.fn()

  addEventListener(type: string, listener: StreamListener) {
    const current = this.listeners.get(type) ?? []
    current.push(listener)
    this.listeners.set(type, current)
  }

  emit(type: string, payload: Record<string, unknown>) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data: JSON.stringify(payload) })
    }
  }
}

let activeStream: MockStream | null = null
vi.mock('@/lib/authenticated-event-stream', () => ({
  connectAuthenticatedEventStream: () => {
    activeStream = new MockStream()
    return activeStream
  },
}))

import { LiveMatchView } from '../strategic/arena/LiveMatchView'

function makeMatch(status: MatchStatus = 'pending'): ArenaMatch {
  return {
    id: 'match-1',
    config: {
      gameMode: 'CTF',
      attackMode: 'kunai',
      maxRounds: 3,
      victoryPoints: 100,
      roundTimeoutMs: 30000,
      roleSwitchInterval: 5,
    },
    fighters: [
      { modelId: 'model-a', modelName: 'Alpha', provider: 'ollama', initialRole: 'attacker' },
      { modelId: 'model-b', modelName: 'Beta', provider: 'ollama', initialRole: 'defender' },
    ],
    status,
    rounds: [],
    scores: { 'model-a': 0, 'model-b': 0 },
    winnerId: null,
    winReason: null,
    events: [],
    createdAt: '2026-03-24T10:00:00.000Z',
    startedAt: status === 'pending' ? null : '2026-03-24T10:00:01.000Z',
    completedAt: status === 'completed' ? '2026-03-24T10:00:02.000Z' : null,
    totalDurationMs: 0,
    metadata: {},
  }
}

describe('LiveMatchView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeMatch('completed'),
    })
  })

  it('only auto-opens the results overlay once per finished match', async () => {
    render(
      <LiveMatchView
        matchId="match-1"
        match={makeMatch()}
        onClose={vi.fn()}
      />
    )

    await act(async () => {
      activeStream?.emit('match_complete', {
        winnerId: 'model-a',
        status: 'completed',
        scores: { 'model-a': 25, 'model-b': 0 },
      })
      await Promise.resolve()
    })

    await act(async () => {
      vi.advanceTimersByTime(1500)
      await Promise.resolve()
    })

    expect(screen.getByText('Victory!')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByText('Close'))
    })
    expect(screen.queryByText('Victory!')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.queryByText('Victory!')).not.toBeInTheDocument()
  })
})
