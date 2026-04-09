/**
 * File: arena-leaderboard-widget.test.tsx
 * Purpose: Unit tests for ArenaLeaderboardWidget dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
// Tests
// ---------------------------------------------------------------------------

describe('ArenaLeaderboardWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<ArenaLeaderboardWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Arena Leaderboard" title', () => {
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('Arena Leaderboard')).toBeInTheDocument()
  })

  it('renders all 5 mock leaderboard agents', () => {
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('Sentinel-v4')).toBeInTheDocument()
    expect(screen.getByText('Guardian-Pro')).toBeInTheDocument()
    expect(screen.getByText('Aegis-Net')).toBeInTheDocument()
    expect(screen.getByText('ShieldWall-2')).toBeInTheDocument()
    expect(screen.getByText('Bastion-ML')).toBeInTheDocument()
  })

  it('displays win rate percentages', () => {
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('87.5%')).toBeInTheDocument()
    expect(screen.getByText('82.3%')).toBeInTheDocument()
  })

  it('displays scores', () => {
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('2450')).toBeInTheDocument()
    expect(screen.getByText('1580')).toBeInTheDocument()
  })

  it('renders "View Arena" action button', () => {
    render(<ArenaLeaderboardWidget />)
    expect(screen.getByText('View Arena')).toBeInTheDocument()
  })

  it('renders Trophy icons for top 3 ranks', () => {
    render(<ArenaLeaderboardWidget />)
    const trophyIcons = screen.getAllByTestId('icon-Trophy')
    expect(trophyIcons.length).toBe(3)
  })
})
