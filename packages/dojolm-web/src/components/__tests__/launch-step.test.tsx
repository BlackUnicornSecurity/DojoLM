/**
 * File: launch-step.test.tsx
 * Purpose: Unit tests for LaunchStep component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/lib/arena-types', () => ({
  GAME_MODE_CONFIGS: {
    CTF: { id: 'CTF', name: 'Capture the Flag', supportsRoleSwap: false },
  },
  ATTACK_MODE_CONFIGS: {
    kunai: { id: 'kunai', name: 'Kunai', description: 'Single-source attacks' },
  },
}))

vi.mock('../MatchCreationWizard', () => ({}))

import { LaunchStep } from '@/components/strategic/arena/steps/LaunchStep'

const mockFormData = {
  gameMode: 'CTF' as const,
  attackMode: 'kunai' as const,
  fighters: [
    { modelId: 'm1', modelName: 'GPT-4', provider: 'OpenAI', initialRole: 'attacker' as const, temperature: 0.7, maxTokens: 1024 },
    { modelId: 'm2', modelName: 'Claude 3', provider: 'Anthropic', initialRole: 'defender' as const, temperature: 0.7, maxTokens: 1024 },
  ],
  maxRounds: 10,
  victoryPoints: 100,
  temperature: 0.7,
  maxTokens: 1024,
  roleSwitchInterval: 3,
}

describe('LaunchStep', () => {
  it('renders without crashing', () => {
    const { container } = render(<LaunchStep formData={mockFormData as never} />)
    expect(container).toBeTruthy()
  })

  it('displays Battle Summary heading', () => {
    render(<LaunchStep formData={mockFormData as never} />)
    expect(screen.getByText('Battle Summary')).toBeInTheDocument()
  })

  it('displays the game mode name', () => {
    render(<LaunchStep formData={mockFormData as never} />)
    expect(screen.getByText('Capture the Flag')).toBeInTheDocument()
  })

  it('displays Fighters heading', () => {
    render(<LaunchStep formData={mockFormData as never} />)
    expect(screen.getByText('Fighters')).toBeInTheDocument()
  })

  it('displays fighter model names', () => {
    render(<LaunchStep formData={mockFormData as never} />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude 3')).toBeInTheDocument()
  })
})
