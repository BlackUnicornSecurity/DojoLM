/**
 * File: protocol-fuzz-panel.test.tsx
 * Purpose: Unit tests for ProtocolFuzzPanel component
 * Story: H23.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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

describe('ProtocolFuzzPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProtocolFuzzPanel />)
    expect(container).toBeTruthy()
  })

  it('displays the Protocol Fuzzer heading', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('Protocol Fuzzer')).toBeInTheDocument()
  })

  it('renders protocol selector buttons', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('MCP')).toBeInTheDocument()
    expect(screen.getByText('HTTP API')).toBeInTheDocument()
    expect(screen.getByText('JSON-RPC')).toBeInTheDocument()
  })

  it('renders mutation type chips', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('field-injection')).toBeInTheDocument()
    expect(screen.getByText('type-coercion')).toBeInTheDocument()
  })

  it('renders the Start Fuzz button', () => {
    render(<ProtocolFuzzPanel />)
    expect(screen.getByText('Start Fuzz')).toBeInTheDocument()
  })
})
