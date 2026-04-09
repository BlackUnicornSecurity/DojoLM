/**
 * File: match-stats-widget.test.tsx
 * Purpose: Unit tests for MatchStatsWidget component
 * Story: H14.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

import { MatchStatsWidget } from '@/components/strategic/arena/MatchStatsWidget'

describe('MatchStatsWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<MatchStatsWidget />)
    expect(container).toBeTruthy()
  })

  it('displays total matches count', () => {
    render(<MatchStatsWidget />)
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('Total Matches')).toBeInTheDocument()
  })

  it('displays total rounds count', () => {
    render(<MatchStatsWidget />)
    expect(screen.getByText('523')).toBeInTheDocument()
    expect(screen.getByText('Total Rounds')).toBeInTheDocument()
  })

  it('displays the Leaderboard heading', () => {
    render(<MatchStatsWidget />)
    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
  })

  it('displays Most Used Attack Types heading', () => {
    render(<MatchStatsWidget />)
    expect(screen.getByText('Most Used Attack Types')).toBeInTheDocument()
  })
})
