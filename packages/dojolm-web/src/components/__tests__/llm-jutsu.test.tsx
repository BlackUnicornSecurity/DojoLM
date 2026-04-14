/**
 * File: llm-jutsu.test.tsx
 * Purpose: Tests for LLM Jutsu module (LLMJutsu, JutsuModelCard, ModelDetailView, JutsuAggregation)
 * Test IDs: JUT-001 to JUT-020
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    // WidgetCard.tsx imports the React Context itself.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

// Mock UI components
vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p>{actions}</div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: ({ isOpen, title }: { isOpen: boolean; title: string }) => (
    isOpen ? <div data-testid="module-guide">{title}</div> : null
  ),
}))

vi.mock('@/components/ui/ConfigPanel', () => ({
  ConfigPanel: ({ isOpen, title, values, onChange, onSave, onReset }: {
    isOpen: boolean; title: string; values: Record<string, unknown>;
    onChange: (k: string, v: unknown) => void; onSave: () => void; onReset: () => void
  }) => (
    isOpen ? (
      <div data-testid="config-panel">
        <h2>{title}</h2>
        <button onClick={onSave}>Save</button>
        <button onClick={onReset}>Reset</button>
        <button onClick={() => onChange('sortBy', 'name')}>Change Sort</button>
      </div>
    ) : null
  ),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => <div data-testid="tabs-list" role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

vi.mock('@/lib/contexts', () => ({
  useBehavioralAnalysis: () => ({
    results: {},
    isAnalyzing: false,
    activeModelId: null,
    activeModelName: null,
    error: null,
    getResult: vi.fn().mockReturnValue(null),
    getActiveResult: vi.fn().mockReturnValue(null),
    runAlignment: vi.fn().mockResolvedValue(undefined),
    runRobustness: vi.fn().mockResolvedValue(undefined),
    runGeometry: vi.fn().mockResolvedValue(undefined),
    runDepthProfile: vi.fn().mockResolvedValue(undefined),
    setActiveModel: vi.fn(),
  }),
}))

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  // Default: API returns test model data (3 unique models)
  mockFetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { id: 'e1', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', resilienceScore: 78, passRate: 78, totalTests: 50, passed: 39, failed: 11, categoriesFailed: ['Prompt Injection', 'Jailbreak'], timestamp: '2026-03-05T10:00:00Z', batchId: 'b1' },
        { id: 'e2', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', resilienceScore: 82, passRate: 82, totalTests: 50, passed: 41, failed: 9, categoriesFailed: ['Prompt Injection'], timestamp: '2026-03-04T10:00:00Z' },
        { id: 'e3', modelId: 'claude-3.5', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', resilienceScore: 91, passRate: 91, totalTests: 50, passed: 45, failed: 5, categoriesFailed: ['Encoding'], timestamp: '2026-03-05T11:00:00Z' },
        { id: 'e4', modelId: 'llama-3', modelName: 'Llama 3 70B', provider: 'Meta', resilienceScore: 58, passRate: 58, totalTests: 50, passed: 29, failed: 21, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering'], timestamp: '2026-03-05T08:00:00Z' },
      ],
    }),
  })
})

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------
import { JutsuTab as LLMJutsu } from '../llm/JutsuTab'
import { JutsuModelCard } from '../llm/JutsuModelCard'
import { ModelDetailView } from '../llm/ModelDetailView'
import { aggregateByModel, calculateTrend, type TestExecution, type AggregatedModel } from '../llm/JutsuAggregation'
import { BeltBadge, getBeltRank } from '../ui/BeltBadge'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const DEMO_EXECUTIONS: TestExecution[] = [
  { id: 'e1', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', score: 78, passRate: 78, totalTests: 50, passed: 39, failed: 11, categoriesFailed: ['Prompt Injection', 'Jailbreak'], timestamp: '2026-03-05T10:00:00Z', batchId: 'b1' },
  { id: 'e2', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', score: 82, passRate: 82, totalTests: 50, passed: 41, failed: 9, categoriesFailed: ['Prompt Injection'], timestamp: '2026-03-04T10:00:00Z' },
  { id: 'e3', modelId: 'claude-3.5', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', score: 91, passRate: 91, totalTests: 50, passed: 45, failed: 5, categoriesFailed: ['Encoding'], timestamp: '2026-03-05T11:00:00Z' },
  { id: 'e4', modelId: 'llama-3', modelName: 'Llama 3 70B', provider: 'Meta', score: 58, passRate: 58, totalTests: 50, passed: 29, failed: 21, categoriesFailed: ['Prompt Injection', 'Jailbreak', 'Social Engineering'], timestamp: '2026-03-05T08:00:00Z' },
]

function createAggregatedModel(overrides: Partial<AggregatedModel> = {}): AggregatedModel {
  return {
    modelId: 'gpt-4',
    modelName: 'GPT-4',
    provider: 'OpenAI',
    latestScore: 78,
    avgScore: 80,
    bestScore: 82,
    worstScore: 78,
    passRate: 80,
    totalExecutions: 2,
    totalTests: 100,
    lastTestedAt: '2026-03-05T10:00:00Z',
    scoreTrend: [82, 78],
    vulnerabilities: [
      { category: 'Prompt Injection', count: 2 },
      { category: 'Jailbreak', count: 1 },
    ],
    executions: DEMO_EXECUTIONS.filter(e => e.modelId === 'gpt-4'),
    ...overrides,
  }
}

// ===========================================================================
// JUT-001: Model grid renders cards
// ===========================================================================
describe('JUT-001: Model grid renders cards', () => {
  it('renders model cards from API data', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      // API fixture has 3 unique models
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('Llama 3 70B')).toBeInTheDocument()
    })
  })

  it('shows model count', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByText(/models? found/)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// JUT-002: Belt ranking on cards
// ===========================================================================
describe('JUT-002: Belt ranking on cards', () => {
  it('JutsuModelCard renders BeltBadge with correct score', () => {
    const model = createAggregatedModel()
    const onView = vi.fn()
    render(<JutsuModelCard model={model} onView={onView} />)
    // Belt badge aria-label includes score
    expect(screen.getByLabelText(/Blue Belt \(score: 78\)/)).toBeInTheDocument()
  })

  it('shows belt color stripe', () => {
    const model = createAggregatedModel({ latestScore: 95 })
    const onView = vi.fn()
    const { container } = render(<JutsuModelCard model={model} onView={onView} />)
    // The color stripe is a div with h-1 class
    const stripe = container.querySelector('.h-1')
    expect(stripe).toBeInTheDocument()
  })
})

// ===========================================================================
// JUT-003 to JUT-004: Search filters by name and provider
// ===========================================================================
describe('JUT-003: Search filters by model name', () => {
  it('filters models when typing in search', async () => {
    render(<LLMJutsu />)
    const searchInput = screen.getByLabelText('Search models')
    fireEvent.change(searchInput, { target: { value: 'Claude' } })

    await waitFor(() => {
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
    })
  })
})

describe('JUT-004: Search filters by provider', () => {
  it('filters by provider text in search', async () => {
    render(<LLMJutsu />)
    const searchInput = screen.getByLabelText('Search models')
    fireEvent.change(searchInput, { target: { value: 'Meta' } })

    await waitFor(() => {
      expect(screen.getByText('Llama 3 70B')).toBeInTheDocument()
      expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
    })
  })
})

// ===========================================================================
// JUT-005 to JUT-006: Provider dropdown and score slider
// ===========================================================================
describe('JUT-005: Provider dropdown filter', () => {
  it('renders provider dropdown with All Providers option', () => {
    render(<LLMJutsu />)
    const dropdown = screen.getByLabelText('Filter by provider')
    expect(dropdown).toBeInTheDocument()
    // Has "All Providers" option
    const allOption = screen.getByText('All Providers')
    expect(allOption).toBeInTheDocument()
  })

  it('filters by provider selection', async () => {
    render(<LLMJutsu />)
    // Wait for models to load so 'Anthropic' is a valid select option
    await waitFor(() => {
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })
    const dropdown = screen.getByLabelText('Filter by provider')
    fireEvent.change(dropdown, { target: { value: 'Anthropic' } })

    await waitFor(() => {
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.queryByText('GPT-4')).not.toBeInTheDocument()
    })
  })
})

describe('JUT-006: Config min score filter', () => {
  it('renders config panel with minScore control', async () => {
    render(<LLMJutsu />)
    // Find settings button by aria-label (may be nested in button mock)
    const allButtons = screen.getAllByRole('button')
    const settingsBtn = allButtons.find(b => b.getAttribute('aria-label') === 'Open Jutsu settings')
    expect(settingsBtn).toBeDefined()
    fireEvent.click(settingsBtn!)
    await waitFor(() => {
      expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// JUT-007 to JUT-012: Detail view with 5 tabs
// ===========================================================================
describe('JUT-007 to JUT-012: ModelDetailView tabs', () => {
  const model = createAggregatedModel()

  it('JUT-007: renders detail view as modal with model name', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
  })

  it('JUT-008: renders 5 sub-tabs (overview, history, deliverables, training, metrics)', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(5)
    const values = tabs.map(t => t.getAttribute('data-value'))
    expect(values).toEqual(['overview', 'history', 'deliverables', 'training', 'metrics'])
  })

  it('JUT-009: Overview tab shows Latest, Average, Best, Trend', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    expect(screen.getByText('Latest')).toBeInTheDocument()
    expect(screen.getByText('Average')).toBeInTheDocument()
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
  })

  it('JUT-010: History tab shows test executions', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    // History tab content is rendered (all tabs rendered in mock)
    expect(screen.getByLabelText('Filter test history')).toBeInTheDocument()
  })

  it('JUT-011: Deliverables tab shows format download buttons', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    expect(screen.getByLabelText(/Download JSON report/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Download CSV report/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Download SARIF report/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Download Markdown report/)).toBeInTheDocument()
  })

  it('JUT-012: Metrics tab shows performance data', () => {
    render(<ModelDetailView model={model} onClose={vi.fn()} />)
    expect(screen.getByText('PERFORMANCE METRICS')).toBeInTheDocument()
    expect(screen.getByText('Total Executions')).toBeInTheDocument()
    // Pass Rate appears in both History expandable cards and Metrics tab
    expect(screen.getAllByText('Pass Rate').length).toBeGreaterThanOrEqual(1)
  })
})

// ===========================================================================
// JUT-013 to JUT-015: Aggregation engine
// ===========================================================================
describe('JUT-013: computeOverallScore via aggregateByModel', () => {
  it('computes average score for each model', () => {
    const models = aggregateByModel(DEMO_EXECUTIONS)
    const gpt4 = models.find(m => m.modelId === 'gpt-4')!
    expect(gpt4.avgScore).toBe(80) // (78 + 82) / 2 = 80
    expect(gpt4.latestScore).toBe(78) // latest by timestamp
    expect(gpt4.bestScore).toBe(82)
    expect(gpt4.worstScore).toBe(78)
  })
})

describe('JUT-014: handleMissingData', () => {
  it('returns empty array for no executions', () => {
    const models = aggregateByModel([])
    expect(models).toEqual([])
  })

  it('handles single execution per model', () => {
    const models = aggregateByModel([DEMO_EXECUTIONS[2]]) // claude
    expect(models.length).toBe(1)
    expect(models[0].avgScore).toBe(91)
    expect(models[0].totalExecutions).toBe(1)
  })
})

describe('JUT-015: rankModels', () => {
  it('sorts models by latestScore descending', () => {
    const models = aggregateByModel(DEMO_EXECUTIONS)
    const scores = models.map(m => m.latestScore)
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1])
    }
  })

  it('aggregates vulnerabilities correctly', () => {
    const models = aggregateByModel(DEMO_EXECUTIONS)
    const gpt4 = models.find(m => m.modelId === 'gpt-4')!
    const promptInj = gpt4.vulnerabilities.find(v => v.category === 'Prompt Injection')
    expect(promptInj).toBeDefined()
    expect(promptInj!.count).toBe(2) // appears in both executions
  })
})

// ===========================================================================
// JUT-016 to JUT-018: Config options
// ===========================================================================
function clickSettingsButton() {
  const allButtons = screen.getAllByRole('button')
  const settingsBtn = allButtons.find(b => b.getAttribute('aria-label') === 'Open Jutsu settings')
  expect(settingsBtn).toBeDefined()
  fireEvent.click(settingsBtn!)
}

describe('JUT-016: Sort config', () => {
  it('opens config panel on settings button click', async () => {
    render(<LLMJutsu />)
    clickSettingsButton()
    await waitFor(() => {
      expect(screen.getByTestId('config-panel')).toBeInTheDocument()
      expect(screen.getByText('Jutsu Settings')).toBeInTheDocument()
    })
  })
})

describe('JUT-017: Config save persists to localStorage', () => {
  // Train 2 PR-4b.8 (2026-04-09): key renamed from 'noda-llm-jutsu-config'
  // → 'noda-jutsu-config' as part of the llm→jutsu NavId rename.
  it('saves config to localStorage on save click', async () => {
    render(<LLMJutsu />)
    clickSettingsButton()
    await waitFor(() => {
      expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Save'))
    expect(localStorageMock.getItem('noda-jutsu-config')).not.toBeNull()
  })
})

describe('JUT-018: Config reset restores defaults', () => {
  it('resets config values on reset click', async () => {
    render(<LLMJutsu />)
    clickSettingsButton()
    await waitFor(() => {
      expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    })
    // Change a value first
    fireEvent.click(screen.getByText('Change Sort'))
    // Then reset
    fireEvent.click(screen.getByText('Reset'))
    // Config panel still shows - values restored
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
  })
})

// ===========================================================================
// JUT-019: Back button navigation (close detail view)
// ===========================================================================
describe('JUT-019: Back button closes detail view', () => {
  it('calls onClose when close button clicked', () => {
    const model = createAggregatedModel()
    const onClose = vi.fn()
    render(<ModelDetailView model={model} onClose={onClose} />)
    const closeBtn = screen.getByLabelText('Close model detail')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape key', () => {
    const model = createAggregatedModel()
    const onClose = vi.fn()
    render(<ModelDetailView model={model} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when clicking backdrop', () => {
    const model = createAggregatedModel()
    const onClose = vi.fn()
    render(<ModelDetailView model={model} onClose={onClose} />)
    // Click the backdrop (the outer fixed div)
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})

// ===========================================================================
// JUT-020: Card renders all required stats
// ===========================================================================
describe('JUT-020: JutsuModelCard renders all stats', () => {
  it('shows model name, provider, score, test count, pass rate, trend, last tested', () => {
    const model = createAggregatedModel({
      totalExecutions: 5,
      passRate: 80,
      lastTestedAt: '2026-03-05T10:00:00Z',
    })
    const onView = vi.fn()
    render(<JutsuModelCard model={model} onView={onView} />)

    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('78')).toBeInTheDocument() // latestScore
    expect(screen.getByText('5')).toBeInTheDocument() // totalExecutions
    expect(screen.getByText('80%')).toBeInTheDocument() // passRate
    expect(screen.getByText('Resilience Score')).toBeInTheDocument()
    expect(screen.getByText(/Last tested/)).toBeInTheDocument()
  })

  it('shows View button and calls onView on click', () => {
    const model = createAggregatedModel()
    const onView = vi.fn()
    render(<JutsuModelCard model={model} onView={onView} />)
    fireEvent.click(screen.getByLabelText(/View GPT-4 details/))
    expect(onView).toHaveBeenCalledWith(model)
  })

  it('card is clickable via keyboard (Enter)', () => {
    const model = createAggregatedModel()
    const onView = vi.fn()
    render(<JutsuModelCard model={model} onView={onView} />)
    // The outer card div has aria-label "GPT-4 — Blue Belt, score 78" and role="button"
    const card = screen.getByLabelText(/GPT-4 — .* Belt, score 78/)
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onView).toHaveBeenCalled()
  })
})

// ===========================================================================
// calculateTrend utility tests
// ===========================================================================
describe('calculateTrend utility', () => {
  it('returns stable for fewer than 2 scores', () => {
    expect(calculateTrend([80])).toBe('stable')
    expect(calculateTrend([])).toBe('stable')
  })

  it('returns up when latest score is higher', () => {
    expect(calculateTrend([70, 80])).toBe('up')
  })

  it('returns down when latest score is lower', () => {
    expect(calculateTrend([80, 70])).toBe('down')
  })

  it('returns stable for small change within threshold', () => {
    expect(calculateTrend([80, 81])).toBe('stable') // diff < 2
  })
})
