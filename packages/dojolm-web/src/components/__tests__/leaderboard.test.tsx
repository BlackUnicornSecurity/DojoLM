/**
 * File: leaderboard.test.tsx
 * Purpose: Tests for Leaderboard component
 * Test IDs: LB-001 to LB-012
 * Source: src/components/llm/Leaderboard.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockModels = [
  { id: 'm1', name: 'GPT-4', provider: 'openai', enabled: true },
  { id: 'm2', name: 'Claude', provider: 'anthropic', enabled: true },
  { id: 'm3', name: 'Disabled', provider: 'ollama', enabled: false },
]

const mockLeaderboard = [
  { modelId: 'm1', modelName: 'GPT-4', rank: 1, score: 92 },
  { modelId: 'm2', modelName: 'Claude', rank: 2, score: 78 },
]

let mockIsLoading = false

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({ models: mockModels }),
  useLeaderboard: () => ({
    leaderboard: mockIsLoading ? null : mockLeaderboard,
    isLoading: mockIsLoading,
  }),
}))

vi.mock('@/lib/llm-constants', () => ({
  PROVIDER_INFO: {
    openai: { name: 'OpenAI' },
    anthropic: { name: 'Anthropic' },
    ollama: { name: 'Ollama' },
  },
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn().mockResolvedValue({ ok: false }),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, title, className }: any) => (
    <button onClick={onClick} data-variant={variant} disabled={disabled} title={title} className={className}>{children}</button>
  ),
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} role="progressbar" />,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><p>{title}</p><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/BeltBadge', () => ({
  getBeltRank: (score: number) => {
    if (score >= 93) return { label: 'Black Belt', color: '#000', short: 'Black' }
    if (score >= 76) return { label: 'Blue Belt', color: '#00f', short: 'Blue' }
    return { label: 'White Belt', color: '#fff', short: 'White' }
  },
}))

vi.mock('lucide-react', () => ({
  Trophy: (props: any) => <span data-testid="icon-trophy" {...props} />,
  Medal: (props: any) => <span data-testid="icon-medal" />,
  RefreshCw: () => <span />,
  TrendingUp: () => <span data-testid="trending-up" />,
  TrendingDown: () => <span data-testid="trending-down" />,
  Minus: () => <span data-testid="trending-flat" />,
  Play: () => <span data-testid="icon-play" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { Leaderboard } from '../llm/Leaderboard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoading = false
    // Mock localStorage
    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(k => store[k] ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((k, v) => { store[k] = v })
  })

  // LB-001
  it('renders loading skeletons when isLoading', () => {
    mockIsLoading = true
    render(<Leaderboard />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  // LB-002
  it('renders leaderboard header', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Model Leaderboard')).toBeInTheDocument()
  })

  // LB-003
  it('shows model count in description', () => {
    render(<Leaderboard />)
    expect(screen.getByText(/2 models ranked/)).toBeInTheDocument()
  })

  // LB-004
  it('renders model names in the rows', () => {
    render(<Leaderboard />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  // LB-005
  it('renders scores for each model', () => {
    render(<Leaderboard />)
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument()
  })

  // LB-006
  it('shows Strong badge for score >= 80', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Strong')).toBeInTheDocument()
  })

  // LB-007
  it('shows Moderate badge for score 50-79', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Moderate')).toBeInTheDocument()
  })

  // LB-008
  it('sorts by score by default (highest first)', () => {
    render(<Leaderboard />)
    const scores = screen.getAllByRole('progressbar')
    expect(Number(scores[0].getAttribute('data-value'))).toBeGreaterThanOrEqual(
      Number(scores[1].getAttribute('data-value'))
    )
  })

  // LB-009
  it('switches to sort by name when clicked', () => {
    render(<Leaderboard />)
    fireEvent.click(screen.getByText('By Name'))
    // Claude comes before GPT-4 alphabetically
    const names = screen.getAllByText(/GPT-4|Claude/)
    expect(names[0].textContent).toBe('Claude')
  })

  // LB-010
  it('shows stats summary cards (Strong, Moderate, Weak counts)', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Strong (80+)')).toBeInTheDocument()
    expect(screen.getByText('Moderate (50-79)')).toBeInTheDocument()
  })

  // LB-011
  it('renders provider names from PROVIDER_INFO', () => {
    render(<Leaderboard />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  // LB-012
  it('renders re-test buttons for enabled models', () => {
    render(<Leaderboard />)
    const retestButtons = screen.getAllByTitle('Re-test this model')
    expect(retestButtons.length).toBe(2)
  })
})
