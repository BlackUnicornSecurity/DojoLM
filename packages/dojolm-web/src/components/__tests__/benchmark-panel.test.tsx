/**
 * File: benchmark-panel.test.tsx
 * Purpose: Unit tests for BenchmarkPanel component
 * Story: H20.5
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
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

import { BenchmarkPanel } from '@/components/llm/BenchmarkPanel'

describe('BenchmarkPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<BenchmarkPanel />)
    expect(container).toBeTruthy()
  })

  it('displays the DojoLM Benchmark v1 heading', () => {
    render(<BenchmarkPanel />)
    expect(screen.getByText('DojoLM Benchmark v1')).toBeInTheDocument()
  })

  it('displays model names in the table', () => {
    render(<BenchmarkPanel />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
    expect(screen.getByText('Gemini 1.5')).toBeInTheDocument()
  })

  it('renders the Export button', () => {
    render(<BenchmarkPanel />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('wraps content in a GlowCard', () => {
    render(<BenchmarkPanel />)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
  })
})
