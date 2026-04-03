/**
 * File: kotoba-workshop.test.tsx
 * Purpose: Unit tests for KotobaWorkshop component
 * Test IDs: KW-001 to KW-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Shield: (props: Record<string, unknown>) => <svg data-testid="shield-icon" {...props} />,
  Zap: (props: Record<string, unknown>) => <svg data-testid="zap-icon" {...props} />,
  CheckCircle2: (props: Record<string, unknown>) => <svg data-testid="check-icon" {...props} />,
  ArrowRight: (props: Record<string, unknown>) => <svg data-testid="arrow-icon" {...props} />,
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glow-card" className={className}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>
  ),
}))

import { KotobaWorkshop } from '../kotoba/KotobaWorkshop'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KotobaWorkshop (KW-001 to KW-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('KW-001: renders hardening level controls', () => {
    render(<KotobaWorkshop />)
    expect(screen.getByText('Hardening Level')).toBeInTheDocument()
    expect(screen.getByText('Moderate')).toBeInTheDocument()
    expect(screen.getByText('Aggressive')).toBeInTheDocument()
  })

  it('KW-002: renders radiogroup with correct aria', () => {
    render(<KotobaWorkshop />)
    const radioGroup = screen.getByRole('radiogroup')
    expect(radioGroup).toHaveAttribute('aria-label', 'Hardening level')
  })

  it('KW-003: Moderate is selected by default', () => {
    render(<KotobaWorkshop />)
    const moderateBtn = screen.getByRole('radio', { name: '' })
    // Check the first radio (Moderate) is checked
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('KW-004: renders Original Prompt side', () => {
    render(<KotobaWorkshop />)
    expect(screen.getByText('Original Prompt')).toBeInTheDocument()
    // Contains the demo original text
    expect(screen.getByText(/You are a helpful customer support assistant/)).toBeInTheDocument()
  })

  it('KW-005: renders Hardened Prompt side with placeholder before apply', () => {
    render(<KotobaWorkshop />)
    expect(screen.getByText('Hardened Prompt')).toBeInTheDocument()
    expect(screen.getByText(/Click .* to generate a hardened variant/)).toBeInTheDocument()
  })

  it('KW-006: shows hardened result with applied rules after clicking Apply', () => {
    render(<KotobaWorkshop />)
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText(/Applied Rules/)).toBeInTheDocument()
    expect(screen.getByText('Boundary Header')).toBeInTheDocument()
    expect(screen.getByText('Instruction Privacy')).toBeInTheDocument()
    expect(screen.getByText('Injection Defense')).toBeInTheDocument()
    expect(screen.getByText('Output Length Constraint')).toBeInTheDocument()
  })

  it('KW-007: switching level resets the result', () => {
    render(<KotobaWorkshop />)
    fireEvent.click(screen.getByText('Apply'))
    expect(screen.getByText('Applied')).toBeInTheDocument()
    // Switch to Aggressive
    fireEvent.click(screen.getByText('Aggressive'))
    expect(screen.queryByText('Applied')).not.toBeInTheDocument()
    expect(screen.getByText(/Click .* to generate a hardened variant/)).toBeInTheDocument()
  })
})
