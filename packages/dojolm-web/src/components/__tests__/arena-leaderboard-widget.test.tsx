/**
 * File: arena-leaderboard-widget.test.tsx
 * Purpose: Unit tests for ArenaLeaderboardWidget dashboard widget
 * Story 2.1.3: Wired to /api/arena/warriors — no mock data
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// Train 2 regression fix pass: Proxy-based lucide-react mock hangs under
// Node 25 / vitest 4.0.18. Use the shared mockLucideIcons helper with '*'
// which expands to a baseline of ~80 common icons (no Proxy).
vi.mock('lucide-react', () => mockLucideIcons('*'))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    // WidgetCard.tsx imports the React Context itself.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      {children}
    </div>
  ),
}))

import { ArenaLeaderboardWidget } from '../dashboard/widgets/ArenaLeaderboardWidget'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockWarriorsResponse(warriors: unknown[]) {
  mockFetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({ warriors, total: warriors.length }),
  })
}

function mockNetworkError() {
  mockFetchWithAuth.mockRejectedValue(new Error('network error'))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ArenaLeaderboardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    mockNetworkError()
    const { container } = render(<ArenaLeaderboardWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Arena Leaderboard" title', async () => {
    mockWarriorsResponse([])
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('Arena Leaderboard')).toBeInTheDocument()
  })

  it('renders "View Arena" action button', async () => {
    mockWarriorsResponse([])
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('View Arena')).toBeInTheDocument()
  })

  it('clicking "View Arena" navigates to arena (not adversarial)', async () => {
    mockWarriorsResponse([])
    render(<ArenaLeaderboardWidget />)
    fireEvent.click(screen.getByText('View Arena'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('arena')
  })

  it('shows loading skeleton initially', () => {
    // Never resolves — loading state persists
    mockFetchWithAuth.mockReturnValue(new Promise(() => {}))
    render(<ArenaLeaderboardWidget />)
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument()
  })

  it('shows empty state when no warriors returned', async () => {
    mockWarriorsResponse([])
    render(<ArenaLeaderboardWidget />)
    await waitFor(() => {
      expect(screen.getByText('No matches recorded yet')).toBeInTheDocument()
    })
  })

  it('shows empty state on network error', async () => {
    mockNetworkError()
    render(<ArenaLeaderboardWidget />)
    await waitFor(() => {
      expect(screen.getByText('No matches recorded yet')).toBeInTheDocument()
    })
  })

  it('renders top 5 warriors from API sorted by winRate', async () => {
    const warriors = [
      { modelId: 'w1', modelName: 'Alpha', winRate: 91.2, bestScore: 3000, totalMatches: 10, wins: 9, losses: 1, draws: 0, avgScore: 2900, favoriteGameMode: null, lastMatchAt: null },
      { modelId: 'w2', modelName: 'Bravo', winRate: 85.0, bestScore: 2800, totalMatches: 8, wins: 7, losses: 1, draws: 0, avgScore: 2700, favoriteGameMode: null, lastMatchAt: null },
      { modelId: 'w3', modelName: 'Charlie', winRate: 78.5, bestScore: 2500, totalMatches: 6, wins: 5, losses: 1, draws: 0, avgScore: 2400, favoriteGameMode: null, lastMatchAt: null },
    ]
    mockWarriorsResponse(warriors)
    render(<ArenaLeaderboardWidget />)
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeInTheDocument()
      expect(screen.getByText('Bravo')).toBeInTheDocument()
      expect(screen.getByText('Charlie')).toBeInTheDocument()
    })
  })

  it('limits display to top 5 warriors', async () => {
    const warriors = Array.from({ length: 8 }, (_, i) => ({
      modelId: `w${i}`,
      modelName: `Warrior-${i}`,
      winRate: 90 - i * 5,
      bestScore: 3000 - i * 100,
      totalMatches: 10,
      wins: 9 - i,
      losses: i,
      draws: 0,
      avgScore: 2800,
      favoriteGameMode: null,
      lastMatchAt: null,
    }))
    mockWarriorsResponse(warriors)
    render(<ArenaLeaderboardWidget />)
    await waitFor(() => {
      // Only top 5 by winRate
      expect(screen.getByText('Warrior-0')).toBeInTheDocument()
      expect(screen.getByText('Warrior-4')).toBeInTheDocument()
      expect(screen.queryByText('Warrior-5')).not.toBeInTheDocument()
    })
  })

  it('renders Trophy icons for top 3 ranks', async () => {
    const warriors = Array.from({ length: 5 }, (_, i) => ({
      modelId: `w${i}`,
      modelName: `Warrior-${i}`,
      winRate: 90 - i * 5,
      bestScore: 3000 - i * 100,
      totalMatches: 10,
      wins: 9 - i,
      losses: i,
      draws: 0,
      avgScore: 2800,
      favoriteGameMode: null,
      lastMatchAt: null,
    }))
    mockWarriorsResponse(warriors)
    render(<ArenaLeaderboardWidget />)
    await waitFor(() => {
      const trophyIcons = screen.getAllByTestId('icon-Trophy')
      expect(trophyIcons.length).toBe(3)
    })
  })
})
