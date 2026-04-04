/**
 * File: kotoba-dashboard.test.tsx
 * Purpose: Unit tests for KotobaDashboard component
 * Test IDs: KD-001 to KD-008
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  PenTool: (props: Record<string, unknown>) => <svg data-testid="pen-icon" {...props} />,
  Shield: (props: Record<string, unknown>) => <svg data-testid="shield-icon" {...props} />,
  ShieldAlert: (props: Record<string, unknown>) => <svg data-testid="shield-alert-icon" {...props} />,
  AlertTriangle: (props: Record<string, unknown>) => <svg data-testid="alert-triangle-icon" {...props} />,
  AlertCircle: (props: Record<string, unknown>) => <svg data-testid="alert-circle-icon" {...props} />,
  Info: (props: Record<string, unknown>) => <svg data-testid="info-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
  ChevronDown: (props: Record<string, unknown>) => <svg data-testid="chevron-down-icon" {...props} />,
  ChevronUp: (props: Record<string, unknown>) => <svg data-testid="chevron-up-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glow-card" className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick, ...props }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; [k: string]: unknown }) => (
    <button data-testid="button" disabled={disabled} onClick={onClick} {...props}>{children}</button>
  ),
}))

vi.mock('../kotoba/KotobaWorkshop', () => ({
  KotobaWorkshop: () => <div data-testid="kotoba-workshop">KotobaWorkshop</div>,
}))

import { KotobaDashboard } from '../kotoba/KotobaDashboard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KotobaDashboard (KD-001 to KD-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('KD-001: renders module header with Kotoba title', () => {
    render(<KotobaDashboard />)
    expect(screen.getByText('Kotoba')).toBeInTheDocument()
    expect(screen.getByText('Prompt Optimization Studio and hardening workshop')).toBeInTheDocument()
  })

  it('KD-002: renders stats row with 3 stat cards', () => {
    render(<KotobaDashboard />)
    expect(screen.getByText('Rules Loaded')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('Score Categories')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Avg Grade')).toBeInTheDocument()
  })

  it('KD-003: renders prompt text input with label', () => {
    render(<KotobaDashboard />)
    expect(screen.getByLabelText('Prompt text input')).toBeInTheDocument()
    expect(screen.getByText('Prompt Text')).toBeInTheDocument()
  })

  it('KD-004: renders "How it works" section when no analysis', () => {
    render(<KotobaDashboard />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
    expect(screen.getByText('Boundary Definition')).toBeInTheDocument()
    expect(screen.getByText('Role Clarity')).toBeInTheDocument()
    expect(screen.getByText('Defense Layers')).toBeInTheDocument()
  })

  it('KD-005: Score button is disabled when prompt text is too short', () => {
    render(<KotobaDashboard />)
    const scoreButton = screen.getByText('Score Prompt').closest('button')
    expect(scoreButton).toBeDisabled()
  })

  it('KD-006: shows analysis results after scoring a prompt', () => {
    render(<KotobaDashboard />)
    const textarea = screen.getByLabelText('Prompt text input')
    fireEvent.change(textarea, { target: { value: 'This is a test prompt that is more than twenty characters long for scoring' } })
    fireEvent.click(screen.getByText('Score Prompt'))
    expect(screen.getByText('78')).toBeInTheDocument()
    expect(screen.getByText(/Grade: B\+/)).toBeInTheDocument()
  })

  it('KD-007: renders load example dropdown', () => {
    render(<KotobaDashboard />)
    expect(screen.getByLabelText('Load example prompt')).toBeInTheDocument()
  })

  it('KD-008: renders character counter', () => {
    render(<KotobaDashboard />)
    expect(screen.getByText('0 / 5,000')).toBeInTheDocument()
  })

  it('KD-009: exposes a Workshop view and renders the workshop when selected', () => {
    render(<KotobaDashboard />)
    const workshopTab = screen.getByRole('tab', { name: 'Workshop' })
    fireEvent.click(workshopTab)
    expect(screen.getByTestId('kotoba-workshop')).toBeInTheDocument()
  })
})
