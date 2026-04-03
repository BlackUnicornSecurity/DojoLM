/**
 * File: battle-mode-step.test.tsx
 * Purpose: Unit tests for BattleModeStep component
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

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/lib/arena-types', () => ({
  GAME_MODE_CONFIGS: {
    CTF: { id: 'CTF', name: 'Capture the Flag', description: 'Inject flag', rules: 'Flag rules', supportsRoleSwap: false },
    KOTH: { id: 'KOTH', name: 'King of the Hill', description: 'Maintain control', rules: 'KOTH rules', supportsRoleSwap: false },
    RvB: { id: 'RvB', name: 'Red vs Blue', description: 'Alternating roles', rules: 'RvB rules', supportsRoleSwap: true },
  },
}))

vi.mock('../MatchCreationWizard', () => ({}))

import { BattleModeStep } from '@/components/strategic/arena/steps/BattleModeStep'

describe('BattleModeStep', () => {
  const defaultProps = {
    selectedMode: null as null,
    onSelectMode: vi.fn(),
    maxRounds: 10,
    victoryPoints: 100,
    roleSwitchInterval: 3,
    onUpdateConfig: vi.fn(),
  }

  it('renders without crashing', () => {
    const { container } = render(<BattleModeStep {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('displays Game Mode heading', () => {
    render(<BattleModeStep {...defaultProps} />)
    expect(screen.getByText('Game Mode')).toBeInTheDocument()
  })

  it('displays all game mode names', () => {
    render(<BattleModeStep {...defaultProps} />)
    expect(screen.getByText('Capture the Flag')).toBeInTheDocument()
    expect(screen.getByText('King of the Hill')).toBeInTheDocument()
    expect(screen.getByText('Red vs Blue')).toBeInTheDocument()
  })

  it('renders radiogroup for mode selection', () => {
    render(<BattleModeStep {...defaultProps} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('shows parameters section when a mode is selected', () => {
    render(<BattleModeStep {...defaultProps} selectedMode={'CTF' as never} />)
    expect(screen.getByText('Parameters')).toBeInTheDocument()
    expect(screen.getByLabelText('Max Rounds')).toBeInTheDocument()
  })
})
