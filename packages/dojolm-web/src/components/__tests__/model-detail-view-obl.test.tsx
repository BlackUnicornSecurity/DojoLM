/**
 * File: model-detail-view-obl.test.tsx
 * Purpose: Tests for ModelDetailView TrainingTab OBL panel (Story 3.1.1)
 * Test IDs: MDV-OBL-001 to MDV-OBL-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// Controllable OBL mock
const mockGetResult = vi.fn(() => null)
const mockIsAnalyzing = { value: false }
vi.mock('@/lib/contexts', () => ({
  useBehavioralAnalysis: () => ({
    getResult: mockGetResult,
    isAnalyzing: mockIsAnalyzing.value,
  }),
}))

const TabsCtx = createContext<{ value: string; setValue: (v: string) => void } | null>(null)
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <TabsCtx.Provider value={{ value, setValue: (v) => onValueChange?.(v) }}>
      <div>{children}</div>
    </TabsCtx.Provider>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(TabsCtx)
    return (
      <button role="tab" aria-selected={ctx?.value === value} onClick={() => ctx?.setValue(value)}>
        {children}
      </button>
    )
  },
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => {
    const ctx = useContext(TabsCtx)
    if (ctx?.value !== value) return null
    return <div>{children}</div>
  },
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/components/ui/BeltBadge', () => ({
  BeltBadge: () => <div data-testid="belt-badge" />,
  getBeltRank: () => ({ label: 'White Belt', color: '#fff', rank: 'white' }),
}))

vi.mock('../llm/JutsuAggregation', () => ({
  calculateTrend: () => 'stable',
}))

vi.mock('@/components/ui/ExpandableCard', () => ({
  ExpandableCard: ({ children, title }: { children: ReactNode; title: string }) => (
    <div data-testid="expandable-card"><span>{title}</span>{children}</div>
  ),
}))

vi.mock('@/components/ui/SafeCodeBlock', () => ({
  SafeCodeBlock: ({ children }: { children: ReactNode }) => <pre>{children}</pre>,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { ModelDetailView } from '../llm/ModelDetailView'
import type { AggregatedModel } from '../llm/JutsuAggregation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModel(overrides: Partial<AggregatedModel> = {}): AggregatedModel {
  return {
    modelId: 'gpt-4',
    modelName: 'GPT-4',
    provider: 'OpenAI',
    latestScore: 78,
    avgScore: 78,
    bestScore: 82,
    worstScore: 72,
    passRate: 80,
    totalExecutions: 3,
    totalTests: 150,
    lastTestedAt: '2026-03-05T10:00:00Z',
    scoreTrend: [75, 78],
    vulnerabilities: [],
    executions: [],
    ...overrides,
  }
}

function openTrainingTab() {
  // Training tab is the 4th tab button
  const tabs = screen.getAllByRole('tab')
  const trainingTab = tabs.find(t => t.textContent?.includes('Training'))
  if (!trainingTab) throw new Error('Training tab not found')
  fireEvent.click(trainingTab)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetResult.mockReturnValue(null)
  mockIsAnalyzing.value = false
})

// ===========================================================================
// MDV-OBL-001: Training tab shows OBL empty state when no data
// ===========================================================================
describe('MDV-OBL-001: Training tab shows OBL empty state when no OBL data', () => {
  it('renders "No OBL data" message', () => {
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} />)
    openTrainingTab()
    expect(screen.getByText(/No OBL data for GPT-4 yet/)).toBeInTheDocument()
  })
})

// ===========================================================================
// MDV-OBL-002: Training tab shows OBL section heading
// ===========================================================================
describe('MDV-OBL-002: Training tab shows OBL Behavioral Analysis heading', () => {
  it('renders the section heading', () => {
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} />)
    openTrainingTab()
    expect(screen.getByText('OBL Behavioral Analysis')).toBeInTheDocument()
  })
})

// ===========================================================================
// MDV-OBL-003: Training tab shows analyzed modules when OBL data present
// ===========================================================================
describe('MDV-OBL-003: Training tab shows analyzed-module list when OBL data present', () => {
  it('renders checkmarks for available modules', () => {
    mockGetResult.mockReturnValue({
      schemaVersion: 1,
      modelId: 'gpt-4',
      timestamp: '2026-04-14T00:00:00Z',
      alignment: { methodProbabilities: { DPO: 0.8 }, dominantMethod: 'DPO', confidence: 0.8 },
      robustness: { baselineRefusalRate: 0.9, pressuredRefusalRate: 0.7, recoveryRate: 0.85, degradationCurve: [] },
    })

    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} />)
    openTrainingTab()

    expect(screen.getByText(/Alignment imprint analyzed/)).toBeInTheDocument()
    expect(screen.getByText(/Defense robustness analyzed/)).toBeInTheDocument()
    expect(screen.queryByText(/Concept geometry analyzed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Refusal depth profiled/)).not.toBeInTheDocument()
  })
})

// ===========================================================================
// MDV-OBL-004: Analyze button renders when onAnalyze provided
// ===========================================================================
describe('MDV-OBL-004: Analyze button renders when onAnalyze prop provided', () => {
  it('shows "Analyze with OBL" button', () => {
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} onAnalyze={vi.fn()} />)
    openTrainingTab()
    expect(screen.getByLabelText('Run OBL analysis for GPT-4')).toBeInTheDocument()
  })

  it('does not render Analyze button when onAnalyze not provided', () => {
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} />)
    openTrainingTab()
    expect(screen.queryByLabelText('Run OBL analysis for GPT-4')).not.toBeInTheDocument()
  })
})

// ===========================================================================
// MDV-OBL-005: Analyze button calls onAnalyze with correct args
// ===========================================================================
describe('MDV-OBL-005: Analyze button calls onAnalyze with modelId and modelName', () => {
  it('fires onAnalyze(modelId, modelName) on click', () => {
    const onAnalyze = vi.fn()
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} onAnalyze={onAnalyze} />)
    openTrainingTab()
    fireEvent.click(screen.getByLabelText('Run OBL analysis for GPT-4'))
    expect(onAnalyze).toHaveBeenCalledWith('gpt-4', 'GPT-4')
  })
})

// ===========================================================================
// MDV-OBL-006: Analyze button disabled when isAnalyzing
// ===========================================================================
describe('MDV-OBL-006: Analyze button disabled while analysis is in flight', () => {
  it('is disabled when isAnalyzing is true', () => {
    mockIsAnalyzing.value = true
    render(<ModelDetailView model={makeModel()} onClose={vi.fn()} onAnalyze={vi.fn()} />)
    openTrainingTab()
    expect(screen.getByLabelText('Run OBL analysis for GPT-4')).toBeDisabled()
  })
})
