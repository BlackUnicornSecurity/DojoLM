/**
 * File: executive-summary.test.tsx
 * Purpose: Tests for ExecutiveSummary component
 * Test IDs: ES-001 to ES-013
 * Source: src/components/llm/ExecutiveSummary.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className, role, tabIndex, onClick, onKeyDown, 'aria-expanded': expanded }: any) => (
    <div className={className} role={role} tabIndex={tabIndex} onClick={onClick} onKeyDown={onKeyDown} aria-expanded={expanded}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" />
  ),
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('lucide-react', () => ({
  Shield: () => <span data-testid="icon-shield" />,
  ShieldAlert: () => <span data-testid="icon-shield-alert" />,
  ShieldCheck: () => <span data-testid="icon-shield-check" />,
  ShieldX: () => <span data-testid="icon-shield-x" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
  TrendingUp: () => <span data-testid="icon-trending" />,
  Lightbulb: () => <span data-testid="icon-lightbulb" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ExecutiveSummary } from '../llm/ExecutiveSummary'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const mockedFetch = vi.mocked(fetchWithAuth)

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const fullData = {
  overallScore: 78,
  riskTier: 'Needs Hardening',
  topVulnerabilities: [
    { category: 'prompt_injection', count: 5, avgScore: 35, severity: 'CRITICAL' },
    { category: 'data_leak', count: 2, avgScore: 55, severity: 'HIGH' },
  ],
  modelComparison: [
    { modelId: 'm1', modelName: 'GPT-4', avgScore: 85, testCount: 10, riskTier: 'Production-Ready' },
    { modelId: 'm2', modelName: 'Claude', avgScore: 72, testCount: 8, riskTier: 'Needs Hardening' },
  ],
  findings: 'Several prompt injection vulnerabilities detected.',
  recommendations: ['Implement input filtering', 'Add rate limiting'],
  totalTests: 18,
  generatedAt: '2026-01-15T10:00:00Z',
}

function mockFetchSuccess(data = fullData) {
  mockedFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(data),
  } as any)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ExecutiveSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ES-001
  it('shows loading skeletons initially', () => {
    mockedFetch.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ExecutiveSummary />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  // ES-002
  it('shows error state on fetch failure', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false } as any)
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load summary')).toBeInTheDocument()
    })
  })

  // ES-003
  it('shows empty state when totalTests is 0', async () => {
    mockFetchSuccess({ ...fullData, totalTests: 0 })
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  // ES-004
  it('renders overall score', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('78')).toBeInTheDocument()
      expect(screen.getByText('Overall Resilience')).toBeInTheDocument()
    })
  })

  // ES-005
  it('renders risk tier badge', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Needs Hardening')).toBeInTheDocument()
    })
  })

  // ES-006
  it('renders findings text', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText(/Several prompt injection/)).toBeInTheDocument()
    })
  })

  // ES-007
  it('renders total tests count', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText(/18 test executions/)).toBeInTheDocument()
    })
  })

  // ES-008
  it('renders top vulnerabilities section', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Top Vulnerabilities')).toBeInTheDocument()
      expect(screen.getByText('prompt injection')).toBeInTheDocument()
      expect(screen.getByText('data leak')).toBeInTheDocument()
    })
  })

  // ES-009
  it('renders model comparison when more than 1 model', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Model Comparison')).toBeInTheDocument()
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })
  })

  // ES-010
  it('renders recommendations', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Recommendations')).toBeInTheDocument()
      expect(screen.getByText('Implement input filtering')).toBeInTheDocument()
      expect(screen.getByText('Add rate limiting')).toBeInTheDocument()
    })
  })

  // ES-011
  it('hides model comparison when only 1 model', async () => {
    mockFetchSuccess({
      ...fullData,
      modelComparison: [fullData.modelComparison[0]],
    })
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('78')).toBeInTheDocument()
    })
    expect(screen.queryByText('Model Comparison')).toBeNull()
  })

  // ES-012
  it('collapses vulnerability list on click', async () => {
    mockFetchSuccess()
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Top Vulnerabilities')).toBeInTheDocument()
    })
    const header = screen.getByText('Top Vulnerabilities').closest('[role="button"]')!
    fireEvent.click(header)
    // After collapse, vulnerability items should be hidden
    expect(header).toHaveAttribute('aria-expanded', 'false')
  })

  // ES-013
  it('clamps score to 0-100 range', async () => {
    mockFetchSuccess({ ...fullData, overallScore: 150 })
    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument()
    })
  })
})
