/**
 * File: fixture-roulette.test.tsx
 * Purpose: Unit tests for FixtureRoulette dashboard widget
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

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }],
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/SeverityBadge', () => ({
  SeverityBadge: ({ severity }: { severity: string }) => <span data-testid="severity-badge">{severity}</span>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <img {...props} />,
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}))

vi.mock('@/lib/client-data-cache', () => ({
  getCachedFixtureManifest: vi.fn().mockResolvedValue({ categories: {} }),
}))

import { FixtureRoulette } from '../dashboard/widgets/FixtureRoulette'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixtureRoulette', () => {
  it('renders without crashing', () => {
    const { container } = render(<FixtureRoulette />)
    expect(container).toBeTruthy()
  })

  it('displays "Fixture Roulette" title', () => {
    render(<FixtureRoulette />)
    expect(screen.getByText('Fixture Roulette')).toBeInTheDocument()
  })

  it('shows initial empty state with description', () => {
    render(<FixtureRoulette />)
    expect(screen.getByText('Need a fresh attack sample?')).toBeInTheDocument()
  })

  it('shows feature tags in empty state', () => {
    render(<FixtureRoulette />)
    expect(screen.getByText('Random category')).toBeInTheDocument()
    expect(screen.getByText('Inline preview')).toBeInTheDocument()
    expect(screen.getByText('One-click scan')).toBeInTheDocument()
  })

  it('renders "Discover an Attack" button in empty state', () => {
    render(<FixtureRoulette />)
    expect(screen.getByText('Discover an Attack')).toBeInTheDocument()
  })

  it('wraps content in WidgetCard', () => {
    render(<FixtureRoulette />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })
})
