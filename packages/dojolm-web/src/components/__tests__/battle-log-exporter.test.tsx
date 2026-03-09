/**
 * File: __tests__/battle-log-exporter.test.tsx
 * Tests for BattleLogExporter component (Story 19.3)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BattleLogExporter } from '@/components/strategic/arena/BattleLogExporter'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { ArenaMatch } from '@/lib/arena-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  X: (p: Record<string, unknown>) => <span data-testid="icon-x" {...p} />,
  Download: (p: Record<string, unknown>) => <span data-testid="icon-download" {...p} />,
  Dna: (p: Record<string, unknown>) => <span data-testid="icon-dna" {...p} />,
  FileText: (p: Record<string, unknown>) => <span data-testid="icon-filetext" {...p} />,
  Check: (p: Record<string, unknown>) => <span data-testid="icon-check" {...p} />,
  Loader2: (p: Record<string, unknown>) => <span data-testid="icon-loader" {...p} />,
  AlertTriangle: (p: Record<string, unknown>) => <span data-testid="icon-alert" {...p} />,
}))

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeMatch(overrides = {}): ArenaMatch {
  return {
    id: 'test-match-123',
    config: {
      gameMode: 'CTF' as const,
      attackMode: 'kunai' as const,
      maxRounds: 20,
      victoryPoints: 100,
      roundTimeoutMs: 30000,
      roleSwitchInterval: 5,
    },
    fighters: [
      { modelId: 'model-a', modelName: 'Model A', provider: 'test', initialRole: 'attacker' as const },
      { modelId: 'model-b', modelName: 'Model B', provider: 'test', initialRole: 'defender' as const },
    ],
    status: 'completed' as const,
    rounds: [
      {
        roundNumber: 1,
        attackerId: 'model-a',
        defenderId: 'model-b',
        attackSource: { type: 'template' as const, id: 'tpl-1' },
        prompt: 'test prompt',
        response: 'test response',
        injectionSuccess: 0.7,
        scanVerdict: 'BLOCK' as const,
        scanSeverity: 'WARNING' as const,
        scores: {},
        events: [],
        durationMs: 1000,
        timestamp: '2026-03-09T10:00:00Z',
      },
    ],
    scores: { 'model-a': 25, 'model-b': 10 },
    winnerId: 'model-a',
    winReason: 'Victory points',
    events: [],
    createdAt: '2026-03-09T09:59:00Z',
    startedAt: '2026-03-09T10:00:00Z',
    completedAt: '2026-03-09T10:00:05Z',
    totalDurationMs: 5000,
    metadata: {},
    ...overrides,
  } as ArenaMatch
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = fetchWithAuth as ReturnType<typeof vi.fn>

function mockFetchOkJson(data: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  })
}

function mockFetchOkBlob() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    blob: () => Promise.resolve(new Blob(['content'], { type: 'application/octet-stream' })),
  })
}

function mockFetchError(error: string, status = 400) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BattleLogExporter', () => {
  const defaultProps = {
    match: makeMatch(),
    open: true,
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock URL.createObjectURL / revokeObjectURL for file download tests
    global.URL.createObjectURL = vi.fn(() => 'blob:test')
    global.URL.revokeObjectURL = vi.fn()
  })

  // -----------------------------------------------------------------------
  // 1. Returns null when open=false
  // -----------------------------------------------------------------------
  it('returns null when open is false', () => {
    const { container } = render(
      <BattleLogExporter {...defaultProps} open={false} />,
    )
    expect(container.innerHTML).toBe('')
  })

  // -----------------------------------------------------------------------
  // 2. Renders dialog with title when open=true
  // -----------------------------------------------------------------------
  it('renders dialog with title when open is true', () => {
    render(<BattleLogExporter {...defaultProps} />)
    expect(screen.getByText('Export Battle Log')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 3. Shows match summary badges
  // -----------------------------------------------------------------------
  it('shows match summary badges with game mode and attack mode', () => {
    render(<BattleLogExporter {...defaultProps} />)
    expect(screen.getByText('CTF')).toBeInTheDocument()
    expect(screen.getByText('kunai')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 4. Renders all 3 export buttons
  // -----------------------------------------------------------------------
  it('renders all 3 export option buttons', () => {
    render(<BattleLogExporter {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Push to DNA' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download Training Set' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download Report' })).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // 5. Calls onClose when close button clicked
  // -----------------------------------------------------------------------
  it('calls onClose when close button is clicked', () => {
    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close export dialog' }))
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------
  // 6. Calls onClose when clicking backdrop
  // -----------------------------------------------------------------------
  it('calls onClose when clicking backdrop', () => {
    render(<BattleLogExporter {...defaultProps} />)
    const backdrop = screen.getByRole('dialog')
    // Click the backdrop element itself (not a child)
    fireEvent.click(backdrop)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  // -----------------------------------------------------------------------
  // 7. DNA export: calls fetchWithAuth with correct body and shows success
  // -----------------------------------------------------------------------
  it('calls fetchWithAuth for DNA export and shows success message', async () => {
    mockFetchOkJson({ vectorCount: 3 })
    render(<BattleLogExporter {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'Push to DNA' }))

    expect(mockFetch).toHaveBeenCalledWith('/api/arena/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'test-match-123', format: 'dna' }),
    })

    await waitFor(() => {
      expect(screen.getByText('3 vectors pushed to DNA pipeline')).toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // 8. Training export: triggers file download on success
  // -----------------------------------------------------------------------
  it('triggers file download for training set export', async () => {
    mockFetchOkBlob()
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const removeSpy = vi.spyOn(document.body, 'removeChild')

    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download Training Set' }))

    expect(mockFetch).toHaveBeenCalledWith('/api/arena/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'test-match-123', format: 'training' }),
    })

    await waitFor(() => {
      expect(screen.getByText('Training data downloaded')).toBeInTheDocument()
    })

    expect(appendSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()
    expect(global.URL.createObjectURL).toHaveBeenCalled()
    expect(global.URL.revokeObjectURL).toHaveBeenCalled()

    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })

  // -----------------------------------------------------------------------
  // 9. Markdown export: triggers file download on success
  // -----------------------------------------------------------------------
  it('triggers file download for markdown report export', async () => {
    mockFetchOkBlob()

    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download Report' }))

    expect(mockFetch).toHaveBeenCalledWith('/api/arena/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: 'test-match-123', format: 'markdown' }),
    })

    await waitFor(() => {
      expect(screen.getByText('Match report downloaded')).toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // 10. Shows error message on failed export
  // -----------------------------------------------------------------------
  it('shows error message on failed export', async () => {
    mockFetchError('Match not found')

    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Push to DNA' }))

    await waitFor(() => {
      expect(screen.getByText('Match not found')).toBeInTheDocument()
    })
  })

  // -----------------------------------------------------------------------
  // 11. Disables buttons while export is loading
  // -----------------------------------------------------------------------
  it('disables all buttons while export is loading', async () => {
    // Never-resolving promise to keep loading state
    mockFetch.mockReturnValueOnce(new Promise(() => {}))

    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Push to DNA' }))

    await waitFor(() => {
      const buttons = [
        screen.getByRole('button', { name: 'Push to DNA' }),
        screen.getByRole('button', { name: 'Download Training Set' }),
        screen.getByRole('button', { name: 'Download Report' }),
      ]
      buttons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  // -----------------------------------------------------------------------
  // Additional: shows rounds count and injection count in summary
  // -----------------------------------------------------------------------
  it('shows rounds count and injection count in summary', () => {
    render(<BattleLogExporter {...defaultProps} />)
    expect(screen.getByText('1 rounds')).toBeInTheDocument()
    expect(screen.getByText('1 injections')).toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // Additional: shows network error on fetch rejection
  // -----------------------------------------------------------------------
  it('shows network error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failure'))

    render(<BattleLogExporter {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'Download Report' }))

    await waitFor(() => {
      expect(screen.getByText('Network error during export')).toBeInTheDocument()
    })
  })
})
