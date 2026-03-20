/**
 * File: jutsu-model-card.test.tsx
 * Purpose: Tests for JutsuModelCard component
 * Test IDs: JMC-001 to JMC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/BeltBadge', () => ({
  BeltBadge: ({ score }: { score: number }) => (
    <div data-testid="belt-badge" data-score={score}>Belt</div>
  ),
  getBeltRank: (score: number) => {
    if (score >= 90) return { label: 'Black Belt', color: '#1a1a1a', rank: 'black' }
    if (score >= 75) return { label: 'Brown Belt', color: '#8B4513', rank: 'brown' }
    if (score >= 60) return { label: 'Purple Belt', color: '#800080', rank: 'purple' }
    if (score >= 40) return { label: 'Blue Belt', color: '#0000FF', rank: 'blue' }
    return { label: 'White Belt', color: '#FFFFFF', rank: 'white' }
  },
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('../jutsu/JutsuAggregation', () => ({
  calculateTrend: (scores: number[]) => {
    if (scores.length < 2) return 'stable'
    return scores[scores.length - 1] > scores[0] ? 'up' : scores[scores.length - 1] < scores[0] ? 'down' : 'stable'
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { JutsuModelCard } from '../llm/JutsuModelCard'
import type { AggregatedModel } from '../llm/JutsuAggregation'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createModel(overrides: Partial<AggregatedModel> = {}): AggregatedModel {
  return {
    modelId: 'gpt-4',
    modelName: 'GPT-4',
    provider: 'OpenAI',
    latestScore: 78,
    avgScore: 80,
    bestScore: 82,
    worstScore: 75,
    passRate: 80,
    totalExecutions: 3,
    totalTests: 150,
    lastTestedAt: '2026-03-05T10:00:00Z',
    scoreTrend: [75, 82, 78],
    vulnerabilities: [
      { category: 'Prompt Injection', count: 5 },
      { category: 'Jailbreak', count: 2 },
    ],
    executions: [],
    ...overrides,
  }
}

// ===========================================================================
// JMC-001: Renders model name
// ===========================================================================
describe('JMC-001: Renders model name', () => {
  it('displays the model name', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-002: Renders provider badge
// ===========================================================================
describe('JMC-002: Renders provider badge', () => {
  it('shows provider name as badge', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-003: Belt badge renders
// ===========================================================================
describe('JMC-003: Belt badge renders', () => {
  it('renders BeltBadge component with correct score', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    const belt = screen.getByTestId('belt-badge')
    expect(belt).toBeInTheDocument()
    expect(belt).toHaveAttribute('data-score', '78')
  })
})

// ===========================================================================
// JMC-004: Score display
// ===========================================================================
describe('JMC-004: Score display', () => {
  it('shows resilience score value and /100', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText('/100')).toBeInTheDocument()
    expect(screen.getByText('Resilience Score')).toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-005: Stats row shows tests, pass rate, trend
// ===========================================================================
describe('JMC-005: Stats row shows tests, pass rate, trend', () => {
  it('displays test count, pass rate, and trend', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.getByText('Tests')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Pass Rate')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-006: Last tested date
// ===========================================================================
describe('JMC-006: Last tested date', () => {
  it('shows last tested timestamp', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.getByText(/Last tested:/)).toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-007: View button calls onView
// ===========================================================================
describe('JMC-007: View button calls onView', () => {
  it('calls onView when View button is clicked', () => {
    const onView = vi.fn()
    const model = createModel()
    render(<JutsuModelCard model={model} onView={onView} />)
    fireEvent.click(screen.getByLabelText('View GPT-4 details'))
    expect(onView).toHaveBeenCalledWith(model)
  })
})

// ===========================================================================
// JMC-008: Re-Test button renders when onRetest provided
// ===========================================================================
describe('JMC-008: Re-Test button', () => {
  it('renders Re-Test button when onRetest is provided', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} onRetest={vi.fn()} />)
    expect(screen.getByLabelText('Re-test GPT-4')).toBeInTheDocument()
  })

  it('does not render Re-Test button when onRetest is not provided', () => {
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} />)
    expect(screen.queryByLabelText('Re-test GPT-4')).not.toBeInTheDocument()
  })
})

// ===========================================================================
// JMC-009: Re-Test button calls onRetest
// ===========================================================================
describe('JMC-009: Re-Test button calls onRetest', () => {
  it('calls onRetest with modelId on click', () => {
    const onRetest = vi.fn()
    render(<JutsuModelCard model={createModel()} onView={vi.fn()} onRetest={onRetest} />)
    fireEvent.click(screen.getByLabelText('Re-test GPT-4'))
    expect(onRetest).toHaveBeenCalledWith('gpt-4')
  })
})

// ===========================================================================
// JMC-010: Card click calls onView
// ===========================================================================
describe('JMC-010: Card click calls onView', () => {
  it('calls onView when the card area is clicked', () => {
    const onView = vi.fn()
    const model = createModel()
    render(<JutsuModelCard model={model} onView={onView} />)
    // Click the card container (role="button")
    const card = screen.getByRole('button', { name: /GPT-4.*Brown Belt.*score 78/ })
    fireEvent.click(card)
    expect(onView).toHaveBeenCalledWith(model)
  })
})

// ===========================================================================
// JMC-011: Keyboard activation
// ===========================================================================
describe('JMC-011: Keyboard activation', () => {
  it('activates on Enter key press', () => {
    const onView = vi.fn()
    const model = createModel()
    render(<JutsuModelCard model={model} onView={onView} />)
    // Get the card container (the outer role="button" with tabIndex=0)
    const card = screen.getByRole('button', { name: /GPT-4 — Brown Belt, score 78/ })
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
    expect(onView).toHaveBeenCalled()
  })
})

// ===========================================================================
// JMC-012: Sparkline renders with multiple scores
// ===========================================================================
describe('JMC-012: Sparkline renders', () => {
  it('renders sparkline bars when scoreTrend has multiple values', () => {
    render(<JutsuModelCard model={createModel({ scoreTrend: [60, 70, 78] })} onView={vi.fn()} />)
    expect(screen.getByLabelText(/Score trend/)).toBeInTheDocument()
  })

  it('does not render sparkline with single score', () => {
    render(<JutsuModelCard model={createModel({ scoreTrend: [78] })} onView={vi.fn()} />)
    expect(screen.queryByLabelText(/Score trend/)).not.toBeInTheDocument()
  })
})
