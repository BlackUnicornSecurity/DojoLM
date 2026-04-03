/**
 * File: supply-chain-panel.test.tsx
 * Purpose: Unit tests for SupplyChainPanel component
 * Story: H24.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

import { SupplyChainPanel } from '@/components/strategic/SupplyChainPanel'

describe('SupplyChainPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<SupplyChainPanel />)
    expect(container).toBeTruthy()
  })

  it('displays the Supply Chain Security heading', () => {
    render(<SupplyChainPanel />)
    expect(screen.getByText('Supply Chain Security')).toBeInTheDocument()
  })

  it('displays Model Verification section', () => {
    render(<SupplyChainPanel />)
    expect(screen.getByText('Model Verification')).toBeInTheDocument()
  })

  it('displays Dependency Audit section', () => {
    render(<SupplyChainPanel />)
    expect(screen.getByText('Dependency Audit')).toBeInTheDocument()
  })

  it('renders the Verify button', () => {
    render(<SupplyChainPanel />)
    expect(screen.getByText('Verify')).toBeInTheDocument()
  })
})
