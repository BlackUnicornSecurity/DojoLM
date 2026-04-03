/**
 * File: model-selection-step.test.tsx
 * Purpose: Unit tests for ModelSelectionStep component
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/lib/contexts/LLMModelContext', () => ({
  useModelContext: () => ({
    models: [
      { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', enabled: true },
      { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', enabled: true },
    ],
    isLoading: false,
  }),
}))

vi.mock('@/lib/arena-types', () => ({
  GAME_MODE_CONFIGS: {},
  ATTACK_MODE_CONFIGS: {},
}))

vi.mock('../MatchCreationWizard', () => ({}))

import { ModelSelectionStep } from '@/components/strategic/arena/steps/ModelSelectionStep'

describe('ModelSelectionStep', () => {
  const defaultProps = {
    fighters: [],
    temperature: 0.7,
    maxTokens: 1024,
    onUpdate: vi.fn(),
  }

  it('renders without crashing', () => {
    const { container } = render(<ModelSelectionStep {...defaultProps} />)
    expect(container).toBeTruthy()
  })

  it('displays Attacker and Defender labels', () => {
    render(<ModelSelectionStep {...defaultProps} />)
    expect(screen.getByText('Attacker')).toBeInTheDocument()
    expect(screen.getByText('Defender')).toBeInTheDocument()
  })

  it('displays Model Overrides heading', () => {
    render(<ModelSelectionStep {...defaultProps} />)
    expect(screen.getByText('Model Overrides')).toBeInTheDocument()
  })

  it('renders temperature and max tokens inputs', () => {
    render(<ModelSelectionStep {...defaultProps} />)
    expect(screen.getByLabelText('Temperature')).toBeInTheDocument()
    expect(screen.getByLabelText('Max Tokens')).toBeInTheDocument()
  })

  it('renders model select dropdowns', () => {
    render(<ModelSelectionStep {...defaultProps} />)
    expect(screen.getByLabelText('Select Attacker model')).toBeInTheDocument()
    expect(screen.getByLabelText('Select Defender model')).toBeInTheDocument()
  })
})
