/**
 * File: scenario-runner.test.tsx
 * Purpose: Unit tests for ScenarioRunner component
 * Story: KENJUTSU Phase 3.3
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

import { ScenarioRunner } from '@/components/agentic/ScenarioRunner'

const defaultProps = {
  scenarioId: 'sc-001',
  scenarioName: 'Test Scenario',
  architecture: 'basic',
  difficulty: 'easy',
  targetModelId: 'gpt-4',
}

describe('ScenarioRunner', () => {
  it('renders without crashing', () => {
    const { container } = render(<ScenarioRunner {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('displays the scenario name', () => {
    render(<ScenarioRunner {...defaultProps} />)
    expect(screen.getByText('Test Scenario')).toBeInTheDocument()
  })

  it('displays architecture and difficulty', () => {
    render(<ScenarioRunner {...defaultProps} />)
    expect(screen.getByText('basic')).toBeInTheDocument()
    expect(screen.getByText('easy')).toBeInTheDocument()
  })

  it('displays the target model ID', () => {
    render(<ScenarioRunner {...defaultProps} />)
    expect(screen.getByText('gpt-4')).toBeInTheDocument()
  })

  it('wraps content in a GlowCard', () => {
    render(<ScenarioRunner {...defaultProps} />)
    expect(screen.getByTestId('glow-card')).toBeInTheDocument()
  })
})
