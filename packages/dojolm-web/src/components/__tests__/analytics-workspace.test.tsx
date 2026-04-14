/**
 * File: analytics-workspace.test.tsx
 * Purpose: Unit tests for AnalyticsWorkspace component
 * Test IDs: AW-001 to AW-004
 * Story: 5.1.1 — fix dead-end "Tests tab" text with CTA
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetActiveTab = vi.fn()

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
}))

// Execution context: default — no active batch
let mockActiveBatchId: string | null = null
const mockGetBatch = vi.fn().mockResolvedValue(null)
const mockGetBatchExecutions = vi.fn().mockResolvedValue([])

vi.mock('@/lib/contexts', () => ({
  useExecutionContext: () => ({
    activeBatchId: mockActiveBatchId,
    getBatch: mockGetBatch,
    getBatchExecutions: mockGetBatchExecutions,
  }),
}))

vi.mock('lucide-react', () => ({
  Download: () => <svg data-testid="download-icon" />,
  ArrowRight: () => <svg data-testid="arrow-right-icon" />,
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} data-testid="button">{children}</button>
  ),
}))

vi.mock('@/components/llm/BenchmarkPanel', () => ({
  BenchmarkPanel: () => <div data-testid="benchmark-panel" />,
}))

vi.mock('@/components/llm/TransferMatrixPanel', () => ({
  TransferMatrixPanel: () => <div data-testid="transfer-matrix-panel" />,
}))

vi.mock('@/components/llm/TestExporter', () => ({
  TestExporter: () => <div data-testid="test-exporter" />,
}))

vi.mock('@/components/reports/ConsolidatedReportButton', () => ({
  ConsolidatedReportButton: () => <div data-testid="consolidated-report-btn" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { AnalyticsWorkspace } from '../llm/AnalyticsWorkspace'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AnalyticsWorkspace (AW-001 to AW-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveBatchId = null
  })

  it('AW-001: renders BenchmarkPanel and TransferMatrixPanel', () => {
    render(<AnalyticsWorkspace />)
    expect(screen.getByTestId('benchmark-panel')).toBeInTheDocument()
    expect(screen.getByTestId('transfer-matrix-panel')).toBeInTheDocument()
  })

  it('AW-002: shows no-batch card with updated message when no active batch', () => {
    render(<AnalyticsWorkspace />)
    expect(screen.getByText('Run a test batch to unlock the richer export panel.')).toBeInTheDocument()
    expect(screen.queryByTestId('test-exporter')).not.toBeInTheDocument()
  })

  it('AW-003: no-batch card has "Go to Atemi Lab" CTA button', () => {
    render(<AnalyticsWorkspace />)
    expect(screen.getByText('Go to Atemi Lab')).toBeInTheDocument()
  })

  it('AW-004: clicking "Go to Atemi Lab" calls setActiveTab with "adversarial"', () => {
    render(<AnalyticsWorkspace />)
    const btn = screen.getByText('Go to Atemi Lab')
    // Button is inside a <button> wrapper from the mock
    fireEvent.click(btn.closest('button') ?? btn)
    expect(mockSetActiveTab).toHaveBeenCalledWith('adversarial')
  })
})
