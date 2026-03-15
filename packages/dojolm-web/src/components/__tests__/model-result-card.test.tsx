/**
 * File: model-result-card.test.tsx
 * Purpose: Tests for ModelResultCard and aggregateByModel
 * Test IDs: MR-001 to MR-014
 * Source: src/components/llm/ModelResultCard.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMTestExecution, LLMModelConfig } from '@/lib/llm-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/BeltBadge', () => ({
  BeltBadge: ({ score, size }: { score: number; size: string }) => (
    <span data-testid="belt-badge" data-score={score} data-size={size}>Belt</span>
  ),
  getBeltRank: (score: number) => {
    if (score >= 93) return { label: 'Black Belt', color: '#000', short: 'Black' }
    if (score >= 76) return { label: 'Blue Belt', color: '#00f', short: 'Blue' }
    if (score >= 41) return { label: 'Orange Belt', color: '#f80', short: 'Orange' }
    return { label: 'White Belt', color: '#fff', short: 'White' }
  },
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': label, 'aria-expanded': expanded, className, variant, size }: any) => (
    <button onClick={onClick} aria-label={label} aria-expanded={expanded} className={className}>{children}</button>
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

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
  Download: () => <span data-testid="icon-download" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  ShieldAlert: () => <span data-testid="icon-shield" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  AlertTriangle: () => <span data-testid="icon-alert" />,
}))

vi.mock('@/components/ui/ExpandableCard', () => ({
  ExpandableCard: ({ title, subtitle, badge, children, className }: any) => (
    <div data-testid={`expandable-card-${title}`} className={className}>
      <span>{title}</span>
      <span>{subtitle}</span>
      {badge}
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ code, maxLines, className }: any) => (
    <pre data-testid="safe-code-block" className={className}>{code}</pre>
  ),
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ModelResultCard, aggregateByModel, type AggregatedModelResult } from '../llm/ModelResultCard'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

function makeExecution(overrides: Partial<LLMTestExecution> = {}): LLMTestExecution {
  return {
    id: 'exec-1',
    testCaseId: 'tc-1',
    modelConfigId: 'm1',
    timestamp: '2026-01-15T10:01:00Z',
    status: 'completed',
    prompt: 'Test prompt',
    response: 'Test response',
    duration_ms: 1200,
    promptTokens: 100,
    completionTokens: 150,
    totalTokens: 250,
    injectionSuccess: 0.1,
    harmfulness: 0.05,
    resilienceScore: 85,
    categoriesPassed: ['injection'],
    categoriesFailed: [],
    owaspCoverage: { 'LLM01': true },
    tpiCoverage: { 'TPI-01': true },
    contentHash: 'hash1',
    cached: false,
    ...overrides,
  }
}

const baseResult: AggregatedModelResult = {
  modelId: 'm1',
  modelName: 'GPT-4',
  provider: 'openai',
  latestScore: 85,
  avgScore: 80,
  testCount: 10,
  passedCount: 8,
  failedCount: 2,
  lastTestedAt: '2026-01-15T10:01:00Z',
  executions: [makeExecution()],
  vulnerabilities: [
    { category: 'injection', severity: 'CRITICAL', count: 2 },
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModelResultCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // MR-001
  it('renders model name', () => {
    render(<ModelResultCard result={baseResult} />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
  })

  // MR-002
  it('renders provider name', () => {
    render(<ModelResultCard result={baseResult} />)
    expect(screen.getByText('openai')).toBeInTheDocument()
  })

  // MR-003
  it('renders latest score prominently', () => {
    render(<ModelResultCard result={baseResult} />)
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText('/100')).toBeInTheDocument()
  })

  // MR-004
  it('renders belt badge with correct score', () => {
    render(<ModelResultCard result={baseResult} />)
    const badge = screen.getByTestId('belt-badge')
    expect(badge).toHaveAttribute('data-score', '85')
  })

  // MR-005
  it('renders test count stats', () => {
    render(<ModelResultCard result={baseResult} />)
    expect(screen.getByText('10 tests')).toBeInTheDocument()
    expect(screen.getByText('8 passed')).toBeInTheDocument()
    expect(screen.getByText('2 failed')).toBeInTheDocument()
  })

  // MR-006
  it('renders average score', () => {
    render(<ModelResultCard result={baseResult} />)
    expect(screen.getByText('Avg: 80/100')).toBeInTheDocument()
  })

  // MR-007
  it('hides failed count when zero', () => {
    const result = { ...baseResult, failedCount: 0 }
    render(<ModelResultCard result={result} />)
    expect(screen.queryByText(/failed/)).toBeNull()
  })

  // MR-008
  it('calls onDownload with model ID when download clicked', () => {
    const onDownload = vi.fn()
    render(<ModelResultCard result={baseResult} onDownload={onDownload} />)
    fireEvent.click(screen.getByRole('button', { name: /download/i }))
    expect(onDownload).toHaveBeenCalledWith('m1')
  })

  // MR-009
  it('calls onRetest with model ID when re-test clicked', () => {
    const onRetest = vi.fn()
    render(<ModelResultCard result={baseResult} onRetest={onRetest} />)
    fireEvent.click(screen.getByRole('button', { name: /re-test/i }))
    expect(onRetest).toHaveBeenCalledWith('m1')
  })

  // MR-010
  it('toggles expanded state to show vulnerability details', () => {
    render(<ModelResultCard result={baseResult} />)
    const toggle = screen.getByRole('button', { name: /expand/i })
    fireEvent.click(toggle)
    expect(screen.getByText(/Findings/)).toBeInTheDocument()
    expect(screen.getByText('injection')).toBeInTheDocument()
  })

  // MR-011
  it('shows "No vulnerabilities detected" when no vulns and expanded', () => {
    const result = { ...baseResult, vulnerabilities: [] }
    render(<ModelResultCard result={result} />)
    fireEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getByText('No vulnerabilities detected')).toBeInTheDocument()
  })

  // MR-012
  it('shows recent tests when expanded', () => {
    render(<ModelResultCard result={baseResult} />)
    fireEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getByText('Recent Tests')).toBeInTheDocument()
  })
})

describe('aggregateByModel', () => {
  const models: LLMModelConfig[] = [
    { id: 'm1', name: 'GPT-4', provider: 'openai', model: 'gpt-4', enabled: true, createdAt: '', updatedAt: '' },
    { id: 'm2', name: 'Claude', provider: 'anthropic', model: 'claude-3', enabled: true, createdAt: '', updatedAt: '' },
  ]

  // MR-013
  it('groups executions by model and sorts by latest score descending', () => {
    const execs = [
      makeExecution({ id: 'e1', modelConfigId: 'm1', resilienceScore: 90, timestamp: '2026-01-15T10:02:00Z' }),
      makeExecution({ id: 'e2', modelConfigId: 'm2', resilienceScore: 70, timestamp: '2026-01-15T10:01:00Z' }),
    ]
    const results = aggregateByModel(execs, models)
    expect(results).toHaveLength(2)
    expect(results[0].modelId).toBe('m1')
    expect(results[0].latestScore).toBe(90)
    expect(results[1].modelId).toBe('m2')
  })

  // MR-014
  it('calculates average score correctly', () => {
    const execs = [
      makeExecution({ id: 'e1', modelConfigId: 'm1', resilienceScore: 80, timestamp: '2026-01-15T10:02:00Z' }),
      makeExecution({ id: 'e2', modelConfigId: 'm1', resilienceScore: 60, timestamp: '2026-01-15T10:01:00Z' }),
    ]
    const results = aggregateByModel(execs, models)
    expect(results[0].avgScore).toBe(70)
  })
})
