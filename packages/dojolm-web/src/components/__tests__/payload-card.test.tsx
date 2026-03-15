/**
 * File: payload-card.test.tsx
 * Purpose: Unit tests for PayloadCard, PayloadGrid, and PayloadFilters components
 * Test IDs: PC-001 to PC-014
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}))

vi.mock('lucide-react', () => ({
  Zap: () => <span data-testid="icon-zap">Zap</span>,
  Package: () => <span data-testid="icon-package">Pkg</span>,
}))

import { PayloadCard, PayloadGrid, PayloadFilters } from '../payloads/PayloadCard'

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const currentPayload = {
  title: 'Prompt Injection',
  desc: 'Direct instruction override attempts',
  status: 'current' as const,
  story: 'S1',
  example: 'Ignore all previous instructions',
}

const plannedPayload = {
  title: 'Future Attack',
  desc: 'Planned detection module',
  status: 'planned' as const,
  story: 'S99',
  example: 'Some future payload',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PayloadCard', () => {
  const defaultProps = {
    payload: currentPayload,
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('PC-001: renders payload title', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
  })

  it('PC-002: renders payload description', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Direct instruction override attempts')).toBeInTheDocument()
  })

  it('PC-003: renders story reference', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Story: S1')).toBeInTheDocument()
  })

  it('PC-004: renders example code', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Ignore all previous instructions')).toBeInTheDocument()
  })

  it('PC-005: shows "Active" badge for current status', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('PC-006: shows "Planned" badge for planned status', () => {
    render(<PayloadCard payload={plannedPayload} onClick={vi.fn()} />)
    expect(screen.getByText('Planned')).toBeInTheDocument()
  })

  it('PC-007: clicking card calls onClick with payload', () => {
    render(<PayloadCard {...defaultProps} />)
    const card = screen.getAllByTestId('card')[0]
    fireEvent.click(card)
    expect(defaultProps.onClick).toHaveBeenCalledWith(currentPayload)
  })

  it('PC-008: shows "Click to load into scanner" hint', () => {
    render(<PayloadCard {...defaultProps} />)
    expect(screen.getByText('Click to load into scanner')).toBeInTheDocument()
  })
})

describe('PayloadGrid', () => {
  const payloads = [currentPayload, plannedPayload]

  it('PC-009: renders current payloads when showCurrent is true', () => {
    render(<PayloadGrid payloads={payloads} showCurrent={true} showPlanned={false} onLoadPayload={vi.fn()} />)
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.queryByText('Future Attack')).not.toBeInTheDocument()
  })

  it('PC-010: renders planned payloads when showPlanned is true', () => {
    render(<PayloadGrid payloads={payloads} showCurrent={false} showPlanned={true} onLoadPayload={vi.fn()} />)
    expect(screen.queryByText('Prompt Injection')).not.toBeInTheDocument()
    expect(screen.getByText('Future Attack')).toBeInTheDocument()
  })

  it('PC-011: shows empty state when no payloads match filters', () => {
    render(<PayloadGrid payloads={payloads} showCurrent={false} showPlanned={false} onLoadPayload={vi.fn()} />)
    expect(screen.getByText('No payloads match the current filters')).toBeInTheDocument()
  })

  it('PC-012: renders both when both filters are active', () => {
    render(<PayloadGrid payloads={payloads} showCurrent={true} showPlanned={true} onLoadPayload={vi.fn()} />)
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('Future Attack')).toBeInTheDocument()
  })
})

describe('PayloadFilters', () => {
  it('PC-013: renders "Current Detection" and "TPI Planned" labels', () => {
    render(
      <PayloadFilters showCurrent={true} showPlanned={false} onCurrentChange={vi.fn()} onPlannedChange={vi.fn()} />
    )
    expect(screen.getByText('Current Detection')).toBeInTheDocument()
    expect(screen.getByText('TPI Planned')).toBeInTheDocument()
  })

  it('PC-014: renders "Show:" label', () => {
    render(
      <PayloadFilters showCurrent={true} showPlanned={false} onCurrentChange={vi.fn()} onPlannedChange={vi.fn()} />
    )
    expect(screen.getByText('Show:')).toBeInTheDocument()
  })
})
