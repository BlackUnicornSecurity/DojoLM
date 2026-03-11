/**
 * File: comparison-view.test.tsx
 * Purpose: Tests for ComparisonView component
 * Test IDs: CV-001 to CV-012
 * Source: src/components/llm/ComparisonView.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetModelReport = vi.fn()
const mockModels = [
  { id: 'm1', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'm2', name: 'Claude 3.5', provider: 'anthropic', model: 'claude-3.5-sonnet', enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'm3', name: 'Disabled', provider: 'openai', model: 'gpt-3.5', enabled: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
]

vi.mock('@/lib/contexts', () => ({
  useResultsContext: () => ({
    getModelReport: mockGetModelReport,
  }),
  useModelContext: () => ({
    models: mockModels,
  }),
}))

// No extra UI mocks needed -- this component uses plain HTML elements

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ComparisonView } from '../llm/ComparisonView'

// ===========================================================================
// CV-001: Renders "Select Models to Compare" heading
// ===========================================================================
describe('CV-001: Heading renders', () => {
  it('renders the selection heading', () => {
    render(<ComparisonView />)
    expect(screen.getByText('Select Models to Compare')).toBeInTheDocument()
  })
})

// ===========================================================================
// CV-002: Only enabled models appear as toggle buttons
// ===========================================================================
describe('CV-002: Enabled models only', () => {
  it('shows only enabled models as buttons', () => {
    render(<ComparisonView />)
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument()
  })
})

// ===========================================================================
// CV-003: Toggle buttons have aria-pressed attribute
// ===========================================================================
describe('CV-003: aria-pressed on toggle buttons', () => {
  it('sets aria-pressed=false initially', () => {
    render(<ComparisonView />)
    const btn = screen.getByText('GPT-4o')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })
})

// ===========================================================================
// CV-004: Clicking a model toggles aria-pressed to true
// ===========================================================================
describe('CV-004: Toggle selection', () => {
  it('toggles aria-pressed when clicked', () => {
    render(<ComparisonView />)
    const btn = screen.getByText('GPT-4o')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })
})

// ===========================================================================
// CV-005: Compare button is disabled when fewer than 2 models selected
// ===========================================================================
describe('CV-005: Compare button disabled', () => {
  it('disables Compare when fewer than 2 models selected', () => {
    render(<ComparisonView />)
    const compareBtn = screen.getByLabelText('Compare selected models')
    expect(compareBtn).toBeDisabled()

    fireEvent.click(screen.getByText('GPT-4o'))
    expect(compareBtn).toBeDisabled()
  })
})

// ===========================================================================
// CV-006: Compare button is enabled when 2+ models selected
// ===========================================================================
describe('CV-006: Compare button enabled', () => {
  it('enables Compare when 2 models are selected', () => {
    render(<ComparisonView />)
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Claude 3.5'))
    const compareBtn = screen.getByLabelText('Compare selected models')
    expect(compareBtn).not.toBeDisabled()
  })
})

// ===========================================================================
// CV-007: Compare button text shows model count
// ===========================================================================
describe('CV-007: Compare button text', () => {
  it('displays the number of selected models', () => {
    render(<ComparisonView />)
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Claude 3.5'))
    expect(screen.getByLabelText('Compare selected models')).toHaveTextContent('Compare 2 Models')
  })
})

// ===========================================================================
// CV-008: Clicking Compare calls getModelReport for each selected model
// ===========================================================================
describe('CV-008: Compare triggers report fetch', () => {
  it('calls getModelReport for each selected model', async () => {
    mockGetModelReport.mockResolvedValue({
      modelConfigId: 'm1',
      modelName: 'GPT-4o',
      provider: 'openai',
      avgResilienceScore: 85,
      byCategory: [{ category: 'injection', passRate: 0.9, avgScore: 90, count: 10 }],
    })
    render(<ComparisonView />)
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Claude 3.5'))
    fireEvent.click(screen.getByLabelText('Compare selected models'))

    await waitFor(() => {
      expect(mockGetModelReport).toHaveBeenCalledTimes(2)
      expect(mockGetModelReport).toHaveBeenCalledWith('m1')
      expect(mockGetModelReport).toHaveBeenCalledWith('m2')
    })
  })
})

// ===========================================================================
// CV-009: Comparison table appears after successful compare
// ===========================================================================
describe('CV-009: Table renders after compare', () => {
  it('shows comparison table with model names', async () => {
    mockGetModelReport.mockImplementation((id: string) =>
      Promise.resolve({
        modelConfigId: id,
        modelName: id === 'm1' ? 'GPT-4o' : 'Claude 3.5',
        provider: id === 'm1' ? 'openai' : 'anthropic',
        avgResilienceScore: id === 'm1' ? 85 : 78,
        byCategory: [{ category: 'injection', passRate: 0.8, avgScore: 80, count: 5 }],
      })
    )
    render(<ComparisonView />)
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Claude 3.5'))
    fireEvent.click(screen.getByLabelText('Compare selected models'))

    await waitFor(() => {
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// CV-010: Table has accessible aria-label
// ===========================================================================
describe('CV-010: Table accessibility', () => {
  it('table has aria-label "Model compliance comparison"', async () => {
    mockGetModelReport.mockImplementation((id: string) =>
      Promise.resolve({
        modelConfigId: id,
        modelName: id === 'm1' ? 'GPT-4o' : 'Claude 3.5',
        provider: id === 'm1' ? 'openai' : 'anthropic',
        avgResilienceScore: 85,
        byCategory: [{ category: 'injection', passRate: 0.8, avgScore: 80, count: 5 }],
      })
    )
    render(<ComparisonView />)
    fireEvent.click(screen.getByText('GPT-4o'))
    fireEvent.click(screen.getByText('Claude 3.5'))
    fireEvent.click(screen.getByLabelText('Compare selected models'))

    await waitFor(() => {
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Model compliance comparison')
    })
  })
})

// ===========================================================================
// CV-011: Deselecting a model toggles aria-pressed back to false
// ===========================================================================
describe('CV-011: Deselect model', () => {
  it('toggles model off on second click', () => {
    render(<ComparisonView />)
    const btn = screen.getByText('GPT-4o')
    fireEvent.click(btn) // select
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(btn) // deselect
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })
})

// ===========================================================================
// CV-012: Displays LLM Compliance Rate note
// ===========================================================================
describe('CV-012: Compliance rate note', () => {
  it('shows explanatory note about LLM Compliance Rate vs Scanner Detection Rate', () => {
    render(<ComparisonView />)
    expect(screen.getByText(/LLM Compliance Rate/)).toBeInTheDocument()
    expect(screen.getByText(/Scanner Detection Rate/)).toBeInTheDocument()
  })
})
