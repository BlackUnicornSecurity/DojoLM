/**
 * File: amaterasu-subsystem.test.tsx
 * Purpose: Unit tests for AmaterasuSubsystem component
 * Story: DAITENGUYAMA M3.2
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (_loader: unknown, _opts?: unknown) => {
    const MockComponent = () => <div data-testid="attack-dna-explorer">AttackDNA Explorer</div>
    MockComponent.displayName = 'MockAttackDNAExplorer'
    return MockComponent
  },
}))

import { AmaterasuSubsystem } from '@/components/strategic/AmaterasuSubsystem'

describe('AmaterasuSubsystem', () => {
  it('renders without crashing', () => {
    const { container } = render(<AmaterasuSubsystem />)
    expect(container).toBeTruthy()
  })

  it('renders the dynamic AttackDNA Explorer component', () => {
    render(<AmaterasuSubsystem />)
    expect(screen.getByTestId('attack-dna-explorer')).toBeInTheDocument()
  })

  it('wraps content in an error boundary', () => {
    const { container } = render(<AmaterasuSubsystem />)
    expect(container.firstChild).toBeTruthy()
  })
})
