/**
 * File: test-summary.test.tsx
 * Purpose: Tests for TestSummary component
 * Test IDs: TS-001 to TS-012
 * Source: src/components/llm/TestSummary.tsx
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMBatchExecution, LLMTestExecution } from '@/lib/llm-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: { children: ReactNode; defaultValue?: string }) => (
    <div data-testid="tabs" data-default={defaultValue}>{children}</div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div data-testid="tabs-list" role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress" data-value={value} className={className} role="progressbar" />
  ),
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  BarChart3: () => <span />,
  Clock: () => <span />,
  DollarSign: () => <span />,
  CheckCircle2: () => <span />,
  XCircle: () => <span />,
  TrendingUp: () => <span />,
  TrendingDown: () => <span />,
  Zap: () => <span />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { TestSummary } from '../llm/TestSummary'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const baseBatch: LLMBatchExecution = {
  id: 'batch-1',
  name: 'Test Batch',
  testCaseIds: ['tc-1', 'tc-2'],
  modelConfigIds: ['m1'],
  status: 'completed',
  createdAt: '2026-01-15T10:00:00Z',
  completedAt: '2026-01-15T10:05:00Z',
  totalTests: 5,
  completedTests: 4,
  failedTests: 1,
  executionIds: ['exec-1', 'exec-2', 'exec-3', 'exec-4'],
}

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
    resilienceScore: 88,
    categoriesPassed: ['injection', 'jailbreak'],
    categoriesFailed: ['social-engineering'],
    owaspCoverage: { 'LLM01': true, 'LLM02': false },
    tpiCoverage: { 'TPI-01': true },
    contentHash: 'hash1',
    cached: false,
    ...overrides,
  }
}

const sampleExecutions: LLMTestExecution[] = [
  makeExecution({ id: 'exec-1', resilienceScore: 92, duration_ms: 1000, totalTokens: 200 }),
  makeExecution({ id: 'exec-2', resilienceScore: 78, duration_ms: 1500, totalTokens: 300 }),
  makeExecution({ id: 'exec-3', resilienceScore: 55, duration_ms: 800, totalTokens: 150 }),
  makeExecution({ id: 'exec-4', resilienceScore: 40, duration_ms: 2000, totalTokens: 400, status: 'failed' }),
]

// ===========================================================================
// TS-001: Renders "Test Results Summary" heading
// ===========================================================================
describe('TS-001: Summary heading', () => {
  it('renders the summary heading', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Test Results Summary')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-002: Renders all 4 tab triggers
// ===========================================================================
describe('TS-002: Tab triggers', () => {
  it('renders Overview, Scores, Coverage, and Performance tabs', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Scores')).toBeInTheDocument()
    expect(screen.getByText('Coverage')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-003: Overview tab shows Tests Run count
// ===========================================================================
describe('TS-003: Tests Run stat', () => {
  it('displays the completed tests count in overview tab', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Tests Run')).toBeInTheDocument()
    // completedTests = 4
    expect(screen.getByText('4')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-004: Overview tab shows Failed count
// ===========================================================================
describe('TS-004: Failed count', () => {
  it('displays the failed test count', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
    // failedTests = 1 -- but "1" appears in many places, so check relative to "Failed" label
    const failedLabel = screen.getByText('Failed')
    const failedCard = failedLabel.closest('div')!
    expect(failedCard.parentElement!.textContent).toContain('1')
  })
})

// ===========================================================================
// TS-005: Overview tab shows Average Score
// ===========================================================================
describe('TS-005: Average Score', () => {
  it('displays the average resilience score', () => {
    // completed execs (status=completed): exec-1(92), exec-2(78), exec-3(55) -> avg = 75
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Average Score')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-006: Scores tab shows Score Distribution
// ===========================================================================
describe('TS-006: Score Distribution', () => {
  it('renders Score Distribution card with category labels', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Score Distribution')).toBeInTheDocument()
    expect(screen.getByText('Excellent (90-100)')).toBeInTheDocument()
    expect(screen.getByText('Good (75-89)')).toBeInTheDocument()
    expect(screen.getByText('Fair (60-74)')).toBeInTheDocument()
    expect(screen.getByText('Poor (0-59)')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-007: Scores tab shows Best Score and Worst Score
// ===========================================================================
describe('TS-007: Score Extremes', () => {
  it('renders best and worst score values', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('Best Score')).toBeInTheDocument()
    expect(screen.getByText('Worst Score')).toBeInTheDocument()
    // Best=92, Worst=55 (only completed)
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-008: Coverage tab shows OWASP LLM Top 10 Coverage
// ===========================================================================
describe('TS-008: OWASP coverage', () => {
  it('renders OWASP LLM Top 10 Coverage card', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('OWASP LLM Top 10 Coverage')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-009: Coverage tab shows CrowdStrike TPI Coverage
// ===========================================================================
describe('TS-009: TPI coverage', () => {
  it('renders CrowdStrike TPI Coverage card', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    expect(screen.getByText('CrowdStrike TPI Coverage')).toBeInTheDocument()
  })
})

// ===========================================================================
// TS-010: Performance tab shows Avg Duration
// ===========================================================================
describe('TS-010: Avg Duration', () => {
  it('displays average duration in the performance tab', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    // avg of completed (1000+1500+800)/3 = 1100
    expect(screen.getAllByText('1100ms').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// TS-011: Defaults to "overview" tab
// ===========================================================================
describe('TS-011: Default tab', () => {
  it('defaults to overview tab', () => {
    render(<TestSummary batch={baseBatch} executions={sampleExecutions} />)
    const tabs = screen.getByTestId('tabs')
    expect(tabs).toHaveAttribute('data-default', 'overview')
  })
})

// ===========================================================================
// TS-012: Renders with empty executions array
// ===========================================================================
describe('TS-012: Empty executions', () => {
  it('renders without error when executions is empty', () => {
    render(<TestSummary batch={baseBatch} executions={[]} />)
    expect(screen.getByText('Test Results Summary')).toBeInTheDocument()
    expect(screen.getByText('Average Score')).toBeInTheDocument()
    // avgScore should be 0 -- find it near the "Average Score" label
    const avgLabel = screen.getByText('Average Score')
    const avgCard = avgLabel.closest('div')!
    expect(avgCard.parentElement!.textContent).toContain('0')
  })
})
