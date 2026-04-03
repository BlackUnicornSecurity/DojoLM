/**
 * File: attack-mode-step.test.tsx
 * Purpose: Unit tests for AttackModeStep component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_target, prop) => {
    if (prop === '__esModule') return true
    return (props: Record<string, unknown>) => <span data-testid={`icon-${String(prop)}`} {...props} />
  },
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/lib/arena-types', () => ({
  ATTACK_MODE_CONFIGS: {
    kunai: { id: 'kunai', name: 'Kunai', description: 'Single-source', sources: ['template'], weights: null },
    shuriken: { id: 'shuriken', name: 'Shuriken', description: 'SAGE-powered', sources: ['sage'], weights: null },
    naginata: { id: 'naginata', name: 'Naginata', description: 'Armory-based', sources: ['armory'], weights: null },
    musashi: { id: 'musashi', name: 'Musashi', description: 'Multi-source', sources: ['template', 'sage', 'armory'], weights: { template: 40, sage: 30, armory: 30 } },
  },
}))

import { AttackModeStep } from '@/components/strategic/arena/steps/AttackModeStep'

describe('AttackModeStep', () => {
  it('renders without crashing', () => {
    const { container } = render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
    expect(container).toBeTruthy()
  })

  it('displays Attack Strategy heading', () => {
    render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
    expect(screen.getByText('Attack Strategy')).toBeInTheDocument()
  })

  it('displays all attack mode names', () => {
    render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
    expect(screen.getByText('Kunai')).toBeInTheDocument()
    expect(screen.getByText('Shuriken')).toBeInTheDocument()
    expect(screen.getByText('Naginata')).toBeInTheDocument()
    expect(screen.getByText('Musashi')).toBeInTheDocument()
  })

  it('renders radiogroup for mode selection', () => {
    render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('calls onSelectMode when a mode is clicked', () => {
    const handler = vi.fn()
    render(<AttackModeStep selectedMode={null} onSelectMode={handler} />)
    fireEvent.click(screen.getByText('Kunai'))
    expect(handler).toHaveBeenCalledWith('kunai')
  })
})
