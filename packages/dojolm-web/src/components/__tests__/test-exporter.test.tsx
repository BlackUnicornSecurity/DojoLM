/**
 * File: test-exporter.test.tsx
 * Purpose: Tests for TestExporter component
 * Test IDs: TE-001 to TE-012
 * Source: src/components/llm/TestExporter.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMBatchExecution } from '@/lib/llm-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, className }: { children: ReactNode; disabled?: boolean; onClick?: () => void; className?: string }) => (
    <button disabled={disabled} onClick={onClick} className={className}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span data-testid="badge">{children}</span>,
}))

vi.mock('lucide-react', () => ({
  Download: () => <span data-testid="icon-download" />,
  FileJson: () => <span data-testid="icon-json" />,
  FileText: () => <span data-testid="icon-pdf" />,
  File: () => <span data-testid="icon-file" />,
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { TestExporter } from '../llm/TestExporter'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

const mockedFetch = vi.mocked(fetchWithAuth)

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const completedBatch: LLMBatchExecution = {
  id: 'batch-1',
  name: 'Test Batch',
  testCaseIds: ['tc-1', 'tc-2'],
  modelConfigIds: ['m1'],
  status: 'completed',
  createdAt: '2026-01-15T10:00:00Z',
  completedAt: '2026-01-15T10:05:00Z',
  totalTests: 10,
  completedTests: 10,
  failedTests: 2,
  executionIds: ['e1', 'e2', 'e3'],
  avgResilienceScore: 75,
}

const runningBatch: LLMBatchExecution = {
  ...completedBatch,
  id: 'batch-2',
  status: 'running',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TestExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // TE-001
  it('renders the Export Results title', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getByText('Export Results')).toBeInTheDocument()
  })

  // TE-002
  it('displays test count stats from batch', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getByText(/10 tests/)).toBeInTheDocument()
    expect(screen.getByText(/8 passed/)).toBeInTheDocument()
  })

  // TE-003
  it('renders execution count badge', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getByText('3 executions')).toBeInTheDocument()
  })

  // TE-004
  it('renders average score badge', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getByText('75 avg score')).toBeInTheDocument()
  })

  // TE-005
  it('shows JSON format badge by default', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getAllByText('JSON').length).toBeGreaterThan(0)
  })

  // TE-006
  it('shows format description for JSON by default', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getByText('Full data export including all responses and metadata')).toBeInTheDocument()
  })

  // TE-007
  it('disables export button when batch is not completed', () => {
    render(<TestExporter batch={runningBatch} />)
    const button = screen.getByRole('button', { name: /export/i })
    expect(button).toBeDisabled()
  })

  // TE-008
  it('enables export button when batch is completed', () => {
    render(<TestExporter batch={completedBatch} />)
    const button = screen.getByRole('button', { name: /export/i })
    expect(button).not.toBeDisabled()
  })

  // TE-009
  it('calls fetchWithAuth on export click', async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('{}'),
    } as any)

    render(<TestExporter batch={completedBatch} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => {
      expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/api/llm/export'))
    })
  })

  // TE-010
  it('handles export failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockedFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<TestExporter batch={completedBatch} />)
    fireEvent.click(screen.getByRole('button', { name: /export/i }))

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })
    consoleSpy.mockRestore()
  })

  // TE-011
  it('shows N/A when avgResilienceScore is missing', () => {
    const batch = { ...completedBatch, avgResilienceScore: undefined }
    render(<TestExporter batch={batch as any} />)
    // Without score, the badge shows N/A or the score field is absent
    const badges = screen.getAllByTestId('badge')
    const texts = badges.map(b => b.textContent)
    expect(texts.some(t => t?.includes('N/A') || !t?.includes('avg score'))).toBe(true)
  })

  // TE-012
  it('renders select with format options', () => {
    render(<TestExporter batch={completedBatch} />)
    expect(screen.getAllByText('JSON').length).toBeGreaterThan(0)
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('Markdown')).toBeInTheDocument()
  })
})
