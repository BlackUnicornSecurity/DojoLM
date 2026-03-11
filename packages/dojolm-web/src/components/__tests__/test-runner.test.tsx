/**
 * File: test-runner.test.tsx
 * Purpose: Unit tests for TestRunner component
 * Test IDs: TR-001 to TR-012
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
  formatDuration: (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select-wrapper" data-value={value}>
      {children}
      <select data-testid="filter-select" value={value} onChange={(e) => onValueChange(e.target.value)}>
        <option value="all">All Tests</option>
        <option value="typecheck">Type Check Only</option>
        <option value="regression">Regression Tests</option>
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode; value: string }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode; className?: string }) => <div>{children}</div>,
  SelectValue: () => <span>Select</span>,
}))

vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="icon-play">Play</span>,
  Loader2: () => <span data-testid="icon-loader">Loading</span>,
  CheckCircle2: () => <span data-testid="icon-check">OK</span>,
  XCircle: () => <span data-testid="icon-x">X</span>,
  SkipForward: () => <span data-testid="icon-skip">Skip</span>,
  Trash2: () => <span data-testid="icon-trash">Trash</span>,
}))

import { TestRunner } from '../tests/TestRunner'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockResults = {
  summary: { total: 10, passed: 8, failed: 1, skipped: 1 },
  results: [
    { name: 'Type Check', status: 'pass' as const, duration_ms: 150, required: true, output: '' },
    { name: 'Regression Test', status: 'fail' as const, duration_ms: 3200, required: false, output: 'Error: assertion failed' },
    { name: 'Optional Test', status: 'skip' as const, duration_ms: 0, required: false, output: '' },
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TestRunner', () => {
  const defaultProps = {
    onRunTests: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TR-001: renders "Test Runner" heading', () => {
    render(<TestRunner {...defaultProps} />)
    expect(screen.getByText('Test Runner')).toBeInTheDocument()
  })

  it('TR-002: renders "Run Tests" button', () => {
    render(<TestRunner {...defaultProps} />)
    expect(screen.getByText('Run Tests')).toBeInTheDocument()
  })

  it('TR-003: renders "Clear" button', () => {
    render(<TestRunner {...defaultProps} />)
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })

  it('TR-004: clicking Run Tests calls onRunTests', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    expect(defaultProps.onRunTests).toHaveBeenCalled()
  })

  it('TR-005: shows summary after tests complete', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument()
      expect(screen.getByText('Passed')).toBeInTheDocument()
      expect(screen.getByText('Failed')).toBeInTheDocument()
      expect(screen.getByText('Skipped')).toBeInTheDocument()
    })
  })

  it('TR-006: shows test results table after completion', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('Test Results')).toBeInTheDocument()
      expect(screen.getByText('Type Check')).toBeInTheDocument()
      expect(screen.getByText('Regression Test')).toBeInTheDocument()
    })
  })

  it('TR-007: shows status badges (PASS, FAIL, SKIP)', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('PASS')).toBeInTheDocument()
      expect(screen.getByText('FAIL')).toBeInTheDocument()
      expect(screen.getByText('SKIP')).toBeInTheDocument()
    })
  })

  it('TR-008: shows formatted duration', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('150ms')).toBeInTheDocument()
      expect(screen.getByText('3.20s')).toBeInTheDocument()
    })
  })

  it('TR-009: shows output for failed test', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('Error: assertion failed')).toBeInTheDocument()
    })
  })

  it('TR-010: clicking Clear removes results', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => screen.getByText('Test Results'))
    await user.click(screen.getByText('Clear'))
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument()
  })

  it('TR-011: shows "Running..." during test execution', async () => {
    let resolveTests: (value: unknown) => void
    defaultProps.onRunTests.mockReturnValueOnce(new Promise(r => { resolveTests = r }))
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    expect(screen.getByText('Running...')).toBeInTheDocument()
    resolveTests!(mockResults)
    await waitFor(() => {
      expect(screen.queryByText('Running...')).not.toBeInTheDocument()
    })
  })

  it('TR-012: shows Required badge for required tests', async () => {
    defaultProps.onRunTests.mockResolvedValueOnce(mockResults)
    const user = userEvent.setup()
    render(<TestRunner {...defaultProps} />)
    await user.click(screen.getByText('Run Tests'))
    await waitFor(() => {
      expect(screen.getByText('Required')).toBeInTheDocument()
    })
  })
})
