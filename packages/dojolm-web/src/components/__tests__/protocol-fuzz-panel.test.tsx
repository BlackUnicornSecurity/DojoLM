/**
 * File: protocol-fuzz-panel.test.tsx
 * Purpose: Unit tests for ProtocolFuzzPanel component
 * Story: H23.2 / 4.3.1
 * Test IDs: PFP-001 to PFP-008
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

import { ProtocolFuzzPanel } from '@/components/scanner/ProtocolFuzzPanel'

describe('ProtocolFuzzPanel (PFP-001 to PFP-008)', () => {
  it('PFP-001: renders without crashing', () => {
    const { container } = render(<ProtocolFuzzPanel />)
    expect(container).toBeTruthy()
  })

  it('PFP-002: displays the Protocol Fuzzer heading', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('Protocol Fuzzer')).toBeInTheDocument()
  })

  it('PFP-003: renders protocol selector buttons', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('MCP')).toBeInTheDocument()
    expect(screen.getByText('HTTP API')).toBeInTheDocument()
    expect(screen.getByText('JSON-RPC')).toBeInTheDocument()
  })

  it('PFP-004: renders mutation type chips', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('field-injection')).toBeInTheDocument()
    expect(screen.getByText('type-coercion')).toBeInTheDocument()
  })

  it('PFP-005: renders the Start Fuzz button', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('Start Fuzz')).toBeInTheDocument()
  })

  // New assertions for Story 4.3.1

  it('PFP-006: Start Fuzz button is disabled', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('Start Fuzz').closest('button')).toBeDisabled()
  })

  it('PFP-007: renders not-yet-available notice with role="status"', () => {
    render(<ProtocolFuzzPanel />)
    const notice = screen.getByRole('status')
    expect(notice).toBeInTheDocument()
    expect(notice.textContent).toMatch(/not yet available/i)
  })

  it('PFP-008: no mock results table rendered', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('FUZZ-001')).not.toBeInTheDocument()
  })
})
