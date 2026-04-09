/**
 * File: orchestrator-builder.test.tsx
 * Purpose: Unit tests for OrchestratorBuilder component
 * Story: TESSENJUTSU Phase 2.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

import { OrchestratorBuilder } from '@/components/sengoku/OrchestratorBuilder'

const models = [
  { id: 'model-1', name: 'GPT-4' },
  { id: 'model-2', name: 'Claude 3' },
]

describe('OrchestratorBuilder', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <OrchestratorBuilder availableModels={models} onLaunch={vi.fn()} isRunning={false} />
    )
    expect(container).toBeTruthy()
  })

  it('displays orchestrator type names', () => {
    render(<OrchestratorBuilder availableModels={models} onLaunch={vi.fn()} isRunning={false} />)
    expect(screen.getByText('PAIR')).toBeInTheDocument()
    expect(screen.getByText('Crescendo')).toBeInTheDocument()
    expect(screen.getByText('TAP')).toBeInTheDocument()
    expect(screen.getByText('MAD-MAX')).toBeInTheDocument()
    expect(screen.getByText('Sensei Adaptive')).toBeInTheDocument()
  })

  it('displays Model Configuration heading', () => {
    render(<OrchestratorBuilder availableModels={models} onLaunch={vi.fn()} isRunning={false} />)
    expect(screen.getByText('Model Configuration')).toBeInTheDocument()
  })

  it('displays Attack Objective heading', () => {
    render(<OrchestratorBuilder availableModels={models} onLaunch={vi.fn()} isRunning={false} />)
    expect(screen.getByText('Attack Objective')).toBeInTheDocument()
  })

  it('renders the Launch button', () => {
    render(<OrchestratorBuilder availableModels={models} onLaunch={vi.fn()} isRunning={false} />)
    expect(screen.getByText('Launch PAIR')).toBeInTheDocument()
  })
})
