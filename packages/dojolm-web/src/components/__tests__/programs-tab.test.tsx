/**
 * File: programs-tab.test.tsx
 * Purpose: Unit tests for ProgramsTab component
 * Test IDs: PT-001 to PT-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  Search: () => <span data-testid="icon-search">Search</span>,
  Filter: () => <span data-testid="icon-filter">Filter</span>,
  Star: ({ className }: { className?: string }) => <span data-testid="icon-star" className={className}>Star</span>,
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('../ronin/ProgramCard', () => ({
  ProgramCard: ({ program, onSelect, onToggleSubscribe, isSubscribed }: {
    program: { id: string; name: string };
    onSelect: (p: unknown) => void;
    onToggleSubscribe: (id: string) => void;
    isSubscribed: boolean;
  }) => (
    <div data-testid={`program-card-${program.id}`}>
      <span>{program.name}</span>
      <button data-testid={`select-${program.id}`} onClick={() => onSelect(program)}>Select</button>
      <button data-testid={`subscribe-${program.id}`} onClick={() => onToggleSubscribe(program.id)}>
        {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
      </button>
    </div>
  ),
}))

vi.mock('../ronin/ProgramDetail', () => ({
  ProgramDetail: ({ program, onClose }: { program: { name: string }; onClose: () => void }) => (
    <div data-testid="program-detail">
      <span>{program.name}</span>
      <button data-testid="close-detail" onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('@/lib/data/ronin-seed-programs', () => ({
  SEED_PROGRAMS: [
    {
      id: 'prog-001',
      name: 'OpenAI Bug Bounty',
      company: 'OpenAI',
      platform: 'bugcrowd',
      status: 'active',
      scopeSummary: 'API, ChatGPT, plugins.',
      rewardMin: 200,
      rewardMax: 20000,
      currency: 'USD',
      aiScope: true,
      owaspAiCategories: ['LLM01'],
      tags: ['LLM', 'API'],
      url: 'https://bugcrowd.com/openai',
      updatedAt: '2026-02-15',
    },
    {
      id: 'prog-002',
      name: 'Google AI Safety',
      company: 'Google',
      platform: 'hackerone',
      status: 'paused',
      scopeSummary: 'Gemini, Bard API.',
      rewardMin: 500,
      rewardMax: 31337,
      currency: 'USD',
      aiScope: true,
      owaspAiCategories: ['LLM04'],
      tags: ['LLM', 'Multimodal'],
      url: 'https://hackerone.com/google-ai',
      updatedAt: '2026-03-01',
    },
  ],
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

import { ProgramsTab } from '../ronin/ProgramsTab'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProgramsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockFetchWithAuth.mockRejectedValue(new Error('no api'))
  })

  it('PT-001: renders program cards from seed data', async () => {
    render(<ProgramsTab />)
    await waitFor(() => {
      expect(screen.getByTestId('program-card-prog-001')).toBeInTheDocument()
      expect(screen.getByTestId('program-card-prog-002')).toBeInTheDocument()
    })
  })

  it('PT-002: shows correct program count', async () => {
    render(<ProgramsTab />)
    await waitFor(() => {
      expect(screen.getByText('2 programs found')).toBeInTheDocument()
    })
  })

  it('PT-003: search input is rendered with correct aria-label', () => {
    render(<ProgramsTab />)
    expect(screen.getByLabelText('Search programs')).toBeInTheDocument()
  })

  it('PT-004: platform filter select is rendered', () => {
    render(<ProgramsTab />)
    expect(screen.getByLabelText('Filter by platform')).toBeInTheDocument()
  })

  it('PT-005: status filter select is rendered', () => {
    render(<ProgramsTab />)
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument()
  })

  it('PT-006: subscribed toggle button is rendered', () => {
    render(<ProgramsTab />)
    expect(screen.getByLabelText('Show subscribed programs only')).toBeInTheDocument()
  })

  it('PT-007: filtering by platform shows matching programs', async () => {
    render(<ProgramsTab />)
    const platformSelect = screen.getByLabelText('Filter by platform')
    fireEvent.change(platformSelect, { target: { value: 'bugcrowd' } })
    await waitFor(() => {
      expect(screen.getByText('1 program found')).toBeInTheDocument()
    })
  })

  it('PT-008: filtering by status shows matching programs', async () => {
    render(<ProgramsTab />)
    const statusSelect = screen.getByLabelText('Filter by status')
    fireEvent.change(statusSelect, { target: { value: 'paused' } })
    await waitFor(() => {
      expect(screen.getByText('1 program found')).toBeInTheDocument()
    })
  })

  it('PT-009: clicking select on a card opens program detail', async () => {
    const user = userEvent.setup()
    render(<ProgramsTab />)
    await waitFor(() => screen.getByTestId('select-prog-001'))
    await user.click(screen.getByTestId('select-prog-001'))
    expect(screen.getByTestId('program-detail')).toBeInTheDocument()
  })

  it('PT-010: closing detail removes the detail modal', async () => {
    const user = userEvent.setup()
    render(<ProgramsTab />)
    await waitFor(() => screen.getByTestId('select-prog-001'))
    await user.click(screen.getByTestId('select-prog-001'))
    await user.click(screen.getByTestId('close-detail'))
    expect(screen.queryByTestId('program-detail')).not.toBeInTheDocument()
  })

  it('PT-011: shows "No programs found" when filters match nothing', async () => {
    render(<ProgramsTab />)
    const statusSelect = screen.getByLabelText('Filter by status')
    fireEvent.change(statusSelect, { target: { value: 'closed' } })
    await waitFor(() => {
      expect(screen.getByText('No programs found')).toBeInTheDocument()
    })
  })

  it('PT-012: shows 0 subscribed initially', () => {
    render(<ProgramsTab />)
    expect(screen.getByText('0 subscribed')).toBeInTheDocument()
  })
})
