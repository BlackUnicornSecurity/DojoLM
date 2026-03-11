/**
 * File: sage-dashboard.test.tsx
 * Purpose: Unit tests for SAGEDashboard component
 * Test IDs: SD-001 to SD-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h3 className={className}>{children}</h3>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, dot }: { children: React.ReactNode; variant?: string; dot?: boolean }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, disabled, ...props }: {
    children: React.ReactNode; onClick?: () => void; 'aria-label'?: string; disabled?: boolean; [k: string]: unknown
  }) => (
    <button onClick={onClick} aria-label={ariaLabel} disabled={disabled}>{children}</button>
  ),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { SAGEDashboard } from '../strategic/SAGEDashboard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SAGEDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SD-001: renders SAGE Evolution Engine header', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('SAGE Evolution Engine')).toBeInTheDocument()
  })

  it('SD-002: displays Running status badge initially', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('SD-003: renders key metrics - Generation, Best Fitness, Total Seeds, Quarantined', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Generation')).toBeInTheDocument()
    expect(screen.getAllByText('142').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Best Fitness')).toBeInTheDocument()
    expect(screen.getAllByText('0.94').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Total Seeds')).toBeInTheDocument()
    expect(screen.getByText('Quarantined')).toBeInTheDocument()
    expect(screen.getAllByText('23').length).toBeGreaterThanOrEqual(1)
  })

  it('SD-004: toggles status from Running to Paused on pause click', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Pause evolution'))
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('SD-005: toggles status from Paused back to Running on resume click', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Pause evolution'))
    expect(screen.getByText('Paused')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Resume evolution'))
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('SD-006: stops evolution on Reset click', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Stop evolution'))
    expect(screen.getByText('Stopped')).toBeInTheDocument()
  })

  it('SD-007: disables Reset button when status is stopped', () => {
    render(<SAGEDashboard />)
    fireEvent.click(screen.getByLabelText('Stop evolution'))
    expect(screen.getByLabelText('Stop evolution')).toBeDisabled()
  })

  it('SD-008: renders Fitness Over Generations chart section', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Fitness Over Generations')).toBeInTheDocument()
  })

  it('SD-009: renders Content Safety section with threshold', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Content Safety')).toBeInTheDocument()
    expect(screen.getByText('Safety Threshold')).toBeInTheDocument()
    expect(screen.getByText('0.85')).toBeInTheDocument()
  })

  it('SD-010: renders Seed Library with categories', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Seed Library')).toBeInTheDocument()
    expect(screen.getByLabelText('Seed library categories')).toBeInTheDocument()
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('Jailbreak')).toBeInTheDocument()
  })

  it('SD-011: renders Mutation Operators list', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Mutation Operators')).toBeInTheDocument()
    expect(screen.getByLabelText('Mutation operators')).toBeInTheDocument()
    expect(screen.getByText('Role Swap')).toBeInTheDocument()
    expect(screen.getByText('Base64 Encode')).toBeInTheDocument()
  })

  it('SD-012: shows Disabled badge for disabled operators', () => {
    render(<SAGEDashboard />)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getByText('Semantic Shift')).toBeInTheDocument()
  })
})
