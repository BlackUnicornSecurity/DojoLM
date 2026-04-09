/**
 * File: benchmark-panel.test.tsx
 * Purpose: Unit tests for BenchmarkPanel component
 * Story: H20.5
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// Train 2 regression fix pass: replaced Proxy-based lucide-react mock with an
// explicit object via the shared `mockLucideIcons` helper. The Proxy pattern
// hangs under Node 25 / vitest 4.0.18 — vitest's module resolver probes the
// proxy with Symbol keys that trigger re-entrant mock loading and deadlock the
// worker pool. Explicit-list mock works fine.
vi.mock('lucide-react', () => mockLucideIcons(['Download', 'Trophy', 'BarChart3']))

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
