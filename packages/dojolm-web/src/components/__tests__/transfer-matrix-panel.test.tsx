/**
 * File: transfer-matrix-panel.test.tsx
 * Purpose: Unit tests for TransferMatrixPanel component
 * Story: H25.2
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

import { TransferMatrixPanel } from '@/components/llm/TransferMatrixPanel'

describe('TransferMatrixPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<TransferMatrixPanel />)
    expect(container).toBeTruthy()
  })

  it('displays the Transfer Matrix heading', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getByText('Transfer Matrix')).toBeInTheDocument()
  })

  it('displays the description', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getByText('Cross-model vulnerability transfer analysis')).toBeInTheDocument()
  })

  it('renders model names in the table', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getAllByText('GPT-4').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Claude 3.5').length).toBeGreaterThan(0)
  })

  it('renders the legend with transfer rate labels', () => {
    render(<TransferMatrixPanel />)
    expect(screen.getByText('Transfer rate:')).toBeInTheDocument()
    expect(screen.getByText('0-39%')).toBeInTheDocument()
    expect(screen.getByText('80-100%')).toBeInTheDocument()
  })
})
