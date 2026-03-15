/**
 * File: program-card.test.tsx
 * Purpose: Unit tests for ProgramCard component
 * Test IDs: PC-001 to PC-012
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
  isSafeHref: (url: string) => url.startsWith('https://'),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('lucide-react', () => ({
  ExternalLink: () => <span data-testid="icon-external">ExternalLink</span>,
  Star: () => <span data-testid="icon-star">Star</span>,
  StarOff: () => <span data-testid="icon-star-off">StarOff</span>,
  DollarSign: () => <span data-testid="icon-dollar">$</span>,
}))

vi.mock('@/lib/data/ronin-seed-programs', () => ({
  PLATFORM_META: {
    hackerone: { label: 'HackerOne', color: '#8B5CF6' },
    bugcrowd: { label: 'Bugcrowd', color: '#3B82F6' },
    huntr: { label: 'Huntr', color: '#22C55E' },
    '0din': { label: '0din.ai', color: '#F59E0B' },
  },
  STATUS_META: {
    active: { label: 'Active', color: '#22C55E' },
    paused: { label: 'Paused', color: '#F59E0B' },
    upcoming: { label: 'Upcoming', color: '#3B82F6' },
    closed: { label: 'Closed', color: '#6B7280' },
  },
}))

import { ProgramCard } from '../ronin/ProgramCard'
import type { BountyProgram } from '@/lib/data/ronin-seed-programs'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProgram: BountyProgram = {
  id: 'prog-001',
  name: 'OpenAI Bug Bounty',
  company: 'OpenAI',
  platform: 'bugcrowd',
  status: 'active',
  scopeSummary: 'API, ChatGPT, plugins, DALL-E. Prompt injection, data exfiltration.',
  rewardMin: 200,
  rewardMax: 20000,
  currency: 'USD',
  aiScope: true,
  owaspAiCategories: ['LLM01', 'LLM02', 'LLM06', 'LLM07'],
  tags: ['LLM', 'API', 'Plugins', 'Image Generation'],
  url: 'https://bugcrowd.com/openai',
  updatedAt: '2026-02-15',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProgramCard', () => {
  const defaultProps = {
    program: mockProgram,
    isSubscribed: false,
    onToggleSubscribe: vi.fn(),
    onSelect: vi.fn(),
  }

  it('PC-001: renders program name and company', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('OpenAI Bug Bounty')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  it('PC-002: renders platform label', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('Bugcrowd')).toBeInTheDocument()
  })

  it('PC-003: renders status label', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('PC-004: renders scope summary', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText(/API, ChatGPT, plugins/)).toBeInTheDocument()
  })

  it('PC-005: shows reward range when showRewards is true (default)', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('$200 – $20,000')).toBeInTheDocument()
  })

  it('PC-006: hides reward range when showRewards is false', () => {
    render(<ProgramCard {...defaultProps} showRewards={false} />)
    expect(screen.queryByText('$200 – $20,000')).not.toBeInTheDocument()
  })

  it('PC-007: shows first 3 OWASP categories and +N for overflow', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('LLM01')).toBeInTheDocument()
    expect(screen.getByText('LLM02')).toBeInTheDocument()
    expect(screen.getByText('LLM06')).toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('PC-008: renders first 3 tags', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByText('LLM')).toBeInTheDocument()
    expect(screen.getByText('API')).toBeInTheDocument()
    expect(screen.getByText('Plugins')).toBeInTheDocument()
  })

  it('PC-009: calls onSelect when card is clicked', () => {
    const onSelect = vi.fn()
    render(<ProgramCard {...defaultProps} onSelect={onSelect} />)
    fireEvent.click(screen.getByRole('button', { name: /OpenAI Bug Bounty by OpenAI/ }))
    expect(onSelect).toHaveBeenCalledWith(mockProgram)
  })

  it('PC-010: calls onToggleSubscribe when subscribe button is clicked', () => {
    const onToggleSubscribe = vi.fn()
    const onSelect = vi.fn()
    render(<ProgramCard {...defaultProps} onToggleSubscribe={onToggleSubscribe} onSelect={onSelect} />)
    fireEvent.click(screen.getByLabelText(/Subscribe to OpenAI Bug Bounty/))
    expect(onToggleSubscribe).toHaveBeenCalledWith('prog-001')
    // Should NOT bubble to onSelect
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('PC-011: shows Star icon when subscribed and StarOff when not', () => {
    const { rerender } = render(<ProgramCard {...defaultProps} isSubscribed={false} />)
    expect(screen.getByTestId('icon-star-off')).toBeInTheDocument()
    expect(screen.queryByTestId('icon-star')).not.toBeInTheDocument()

    rerender(<ProgramCard {...defaultProps} isSubscribed={true} />)
    expect(screen.getByTestId('icon-star')).toBeInTheDocument()
  })

  it('PC-012: has correct aria-label on the card for accessibility', () => {
    render(<ProgramCard {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'OpenAI Bug Bounty by OpenAI' })).toBeInTheDocument()
  })
})
