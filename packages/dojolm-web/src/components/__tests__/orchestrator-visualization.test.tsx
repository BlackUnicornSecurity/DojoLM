/**
 * File: orchestrator-visualization.test.tsx
 * Purpose: Unit tests for OrchestratorVisualization component
 * Story: TESSENJUTSU Phase 2.3
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, ...props }: Record<string, unknown>) => (
    <div data-testid="glow-card" {...props}>{children}</div>
  ),
}))

import { OrchestratorVisualization } from '@/components/sengoku/OrchestratorVisualization'

describe('OrchestratorVisualization', () => {
  it('renders empty state when no state provided', () => {
    render(
      <OrchestratorVisualization state={null} allTurns={[]} selectedTurnIndex={null} onSelectTurn={vi.fn()} />
    )
    expect(screen.getByText(/No orchestrator run active/)).toBeInTheDocument()
  })

  it('renders without crashing with state', () => {
    const state = {
      configType: 'pair',
      status: 'running' as const,
      currentTurn: 3,
      totalTurns: 20,
      branches: [{ id: 'main', parentId: null, depth: 0, turns: [], currentScore: 5, pruned: false, prunedReason: null }],
      bestScore: 5.0,
      bestTurnIndex: 2,
      totalTokensUsed: 1500,
      totalCostUsd: 0.05,
      startedAt: '2026-01-01',
    }
    const { container } = render(
      <OrchestratorVisualization state={state} allTurns={[]} selectedTurnIndex={null} onSelectTurn={vi.fn()} />
    )
    expect(container).toBeTruthy()
  })

  it('displays status badge text', () => {
    const state = {
      configType: 'pair',
      status: 'running' as const,
      currentTurn: 3,
      totalTurns: 20,
      branches: [{ id: 'main', parentId: null, depth: 0, turns: [], currentScore: 5, pruned: false, prunedReason: null }],
      bestScore: 5.0,
      bestTurnIndex: 2,
      totalTokensUsed: 1500,
      totalCostUsd: 0.05,
      startedAt: '2026-01-01',
    }
    render(
      <OrchestratorVisualization state={state} allTurns={[]} selectedTurnIndex={null} onSelectTurn={vi.fn()} />
    )
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('displays Turn Timeline heading', () => {
    const state = {
      configType: 'pair',
      status: 'succeeded' as const,
      currentTurn: 10,
      totalTurns: 10,
      branches: [{ id: 'main', parentId: null, depth: 0, turns: [], currentScore: 9, pruned: false, prunedReason: null }],
      bestScore: 9.0,
      bestTurnIndex: 8,
      totalTokensUsed: 5000,
      totalCostUsd: 0.15,
      startedAt: '2026-01-01',
    }
    render(
      <OrchestratorVisualization state={state} allTurns={[]} selectedTurnIndex={null} onSelectTurn={vi.fn()} />
    )
    expect(screen.getByText('Turn Timeline')).toBeInTheDocument()
  })
})
