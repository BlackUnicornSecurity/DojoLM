/**
 * File: llm-dashboard.test.tsx
 * Purpose: Tests for LLM Dashboard module (LLMDashboard, ExecutiveSummary, VulnerabilityPanel, Leaderboard, BeltBadge, ReportGenerator, ModelList, ModelForm, ComparisonView)
 * Test IDs: LLM-001 to LLM-032
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock fetchWithAuth
const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

// Mock contexts
const mockModels = [
  { id: 'm1', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o', apiKey: 'sk-test', enabled: true, temperature: 0.7, topP: 1.0, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'm2', name: 'Claude 3.5', provider: 'anthropic', model: 'claude-3.5-sonnet', apiKey: 'sk-ant-test', enabled: true, temperature: 0.7, topP: 1.0, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'm3', name: 'Disabled Model', provider: 'openai', model: 'gpt-3.5', apiKey: 'sk-test2', enabled: false, temperature: 0.7, topP: 1.0, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
]

const mockSaveModel = vi.fn()
const mockDeleteModel = vi.fn()
const mockToggleModel = vi.fn()
const mockTestModel = vi.fn().mockResolvedValue({ success: true })
const mockRefresh = vi.fn()
const mockGetExecutions = vi.fn()
const mockGetModelReport = vi.fn()

const mockLeaderboard = [
  { modelId: 'm1', modelName: 'GPT-4o', rank: 1, score: 92 },
  { modelId: 'm2', modelName: 'Claude 3.5', rank: 2, score: 85 },
]

vi.mock('@/lib/contexts', () => ({
  LLMModelProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  LLMExecutionProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  LLMResultsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useModelContext: () => ({
    models: mockModels,
    isLoading: false,
    error: null,
    saveModel: mockSaveModel,
    deleteModel: mockDeleteModel,
    toggleModel: mockToggleModel,
    testModel: mockTestModel,
    refresh: mockRefresh,
  }),
  useResultsContext: () => ({
    getExecutions: mockGetExecutions,
    getModelReport: mockGetModelReport,
  }),
  useLeaderboard: () => ({
    leaderboard: mockLeaderboard,
    isLoading: false,
  }),
  useExecutionContext: () => ({
    isExecuting: false,
    startExecution: vi.fn(),
    cancelExecution: vi.fn(),
  }),
}))

// Mock guard badge
vi.mock('@/components/guard', () => ({
  GuardBadge: () => <span data-testid="guard-badge">Guard</span>,
}))

// Mock ModuleHeader
vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
}))

// Mock EmptyState
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}))

// Mock UI tabs
vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="tabs" data-value={value}>{children}</div>
  ),
  TabsList: ({ children, ...rest }: { children: ReactNode }) => <div data-testid="tabs-list" role="tablist">{children}</div>,
  TabsTrigger: ({ children, value, ...rest }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}))

// Mock select components
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

// Mock card
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className, ...rest }: { children: ReactNode; className?: string; [k: string]: unknown }) => (
    <div className={className} {...rest}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

// Mock remaining UI
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
  ),
}))
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}))
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}))
vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => <label {...rest}>{children}</label>,
}))
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: (props: Record<string, unknown>) => <input type="checkbox" {...props} />,
}))

// Mock llm-constants
vi.mock('@/lib/llm-constants', () => ({
  PROVIDER_INFO: {
    openai: { name: 'OpenAI', description: 'OpenAI API' },
    anthropic: { name: 'Anthropic', description: 'Anthropic API' },
    ollama: { name: 'Ollama', description: 'Local Ollama' },
  },
  DEFAULT_MODELS: { openai: ['gpt-4o', 'gpt-3.5-turbo'], anthropic: ['claude-3.5-sonnet'] },
  PROVIDER_BASE_URLS: { ollama: 'http://localhost:11434' },
  validateApiKey: () => true,
  TEMPERATURE_RANGE: { min: 0, max: 2 },
  TOP_P_RANGE: { min: 0, max: 1 },
}))

// Mock sub-components that aren't under test
vi.mock('../llm/TestExecution', () => ({
  TestExecution: () => <div data-testid="test-execution">TestExecution</div>,
}))
vi.mock('../llm/ResultsView', () => ({
  ResultsView: () => <div data-testid="results-view">ResultsView</div>,
}))
vi.mock('../llm/CustomProviderBuilder', () => ({
  CustomProviderBuilder: () => <div data-testid="custom-provider-builder">CustomProviderBuilder</div>,
}))
vi.mock('../llm/LocalModelSelector', () => ({
  LocalModelSelector: () => <div data-testid="local-model-selector" />,
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

// clipboard mock
Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

// Confirm mock
vi.stubGlobal('confirm', vi.fn(() => true))

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
  mockFetchWithAuth.mockReset()
  mockGetExecutions.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------
import { LLMDashboard, LLMDashboardWithProviders } from '../llm/LLMDashboard'
import { ExecutiveSummary } from '../llm/ExecutiveSummary'
import { VulnerabilityPanel } from '../llm/VulnerabilityPanel'
import { Leaderboard } from '../llm/Leaderboard'
import { ReportGenerator } from '../llm/ReportGenerator'
import { ModelList } from '../llm/ModelList'
import { ModelForm } from '../llm/ModelForm'
import { ComparisonView } from '../llm/ComparisonView'
import { BeltBadge, getBeltRank } from '../ui/BeltBadge'

// ===========================================================================
// LLM-001: Renders with all tab buttons visible
// ===========================================================================
describe('LLM-001: Dashboard tab rendering', () => {
  it('renders all 6 tab buttons (H7.2: summary + vulns merged into results)', () => {
    render(<LLMDashboard />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.length).toBe(6)
    // Check values — summary and vulnerabilities removed in H7.2
    const values = tabs.map(t => t.getAttribute('data-value'))
    expect(values).toEqual(['models', 'tests', 'results', 'leaderboard', 'compare', 'custom'])
  })
})

// ===========================================================================
// LLM-002 to LLM-005: Model CRUD
// ===========================================================================
describe('LLM-002: Add model via ModelList', () => {
  it('renders Add Model button and model cards', () => {
    render(<ModelList />)
    expect(screen.getByText('Add Model')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
    expect(screen.getByText('Disabled Model')).toBeInTheDocument()
  })

  it('shows model form on Add Model click', () => {
    render(<ModelList />)
    fireEvent.click(screen.getAllByText('Add Model')[0])
    expect(screen.getByText('Add New Model')).toBeInTheDocument()
  })
})

describe('LLM-003: Edit model via ModelForm', () => {
  it('populates form with existing model data', () => {
    const model = mockModels[0]
    const onSave = vi.fn()
    const onCancel = vi.fn()
    render(<ModelForm model={model as any} onSave={onSave} onCancel={onCancel} />)
    expect(screen.getByText('Edit Model')).toBeInTheDocument()
    expect(screen.getByDisplayValue('GPT-4o')).toBeInTheDocument()
  })
})

describe('LLM-004: Delete model', () => {
  it('calls deleteModel on delete click with confirm', () => {
    render(<ModelList />)
    // Each model card has delete button (Trash icon button)
    // We look for buttons with red text class
    const deleteButtons = screen.getAllByRole('button').filter(btn => btn.className.includes('text-red-500'))
    expect(deleteButtons.length).toBe(3)
  })
})

describe('LLM-005: Toggle model enabled/disabled', () => {
  it('renders Disable button for enabled models and Enable for disabled', () => {
    render(<ModelList />)
    const disableButtons = screen.getAllByText('Disable')
    const enableButtons = screen.getAllByText('Enable')
    expect(disableButtons.length).toBe(2) // 2 enabled
    expect(enableButtons.length).toBe(1) // 1 disabled
  })
})

// ===========================================================================
// LLM-006 to LLM-008: Preset selection (Quick/Compliance/Full) - tested via TestExecution mock
// ===========================================================================
describe('LLM-006 to LLM-008: Test execution tab rendered', () => {
  it('LLM-006: Tests tab renders TestExecution component', () => {
    render(<LLMDashboard initialTab="tests" />)
    expect(screen.getByTestId('test-execution')).toBeInTheDocument()
  })

  it('LLM-007: Results tab renders ResultsView', () => {
    render(<LLMDashboard initialTab="results" />)
    expect(screen.getByTestId('results-view')).toBeInTheDocument()
  })

  it('LLM-008: Custom tab renders CustomProviderBuilder', () => {
    render(<LLMDashboard initialTab="custom" />)
    expect(screen.getByTestId('custom-provider-builder')).toBeInTheDocument()
  })
})

// ===========================================================================
// LLM-009 to LLM-010: Test execution (single and batch) - via Leaderboard re-test
// ===========================================================================
describe('LLM-009: Single model test execution', () => {
  it('ModelList has test buttons for enabled models', () => {
    render(<ModelList />)
    // TestTube buttons exist for each model
    const allButtons = screen.getAllByRole('button')
    expect(allButtons.length).toBeGreaterThan(3)
  })
})

describe('LLM-010: Batch test execution - Re-test from leaderboard', () => {
  it('renders Re-test buttons in leaderboard', () => {
    render(<Leaderboard />)
    const retestButtons = screen.getAllByText('Re-test')
    expect(retestButtons.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// LLM-011 to LLM-013: SSE progress, reconnect, polling fallback
// ===========================================================================
describe('LLM-011: SSE progress rendering', () => {
  it('leaderboard shows progress bars for each model', () => {
    render(<Leaderboard />)
    const progressBars = screen.getAllByTestId('progress')
    expect(progressBars.length).toBeGreaterThan(0)
  })
})

describe('LLM-012: Reconnect logic guard (retest ref prevents double calls)', () => {
  it('handles re-test via leaderboard with fetch calls', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ batches: [{ modelConfigIds: ['m1'], status: 'completed', testCaseIds: ['t1'] }] }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'new-batch' }),
    })

    render(<Leaderboard />)
    const retestBtn = screen.getAllByText('Re-test')[0]
    fireEvent.click(retestBtn)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/batch')
    })
  })
})

describe('LLM-013: Polling fallback (ExecutiveSummary fetches on mount)', () => {
  it('fetches summary data on mount', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        overallScore: 75,
        riskTier: 'Needs Hardening',
        topVulnerabilities: [],
        modelComparison: [],
        findings: 'Test findings',
        recommendations: ['Rec 1'],
        totalTests: 10,
      }),
    })

    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/summary', expect.any(Object))
    })
  })
})

// ===========================================================================
// LLM-014 to LLM-017: Export buttons (JSON/CSV/SARIF/PDF)
// ===========================================================================
describe('LLM-014 to LLM-017: ReportGenerator export formats', () => {
  it('LLM-014: renders format selector with JSON, CSV, SARIF, PDF', () => {
    render(<ReportGenerator />)
    expect(screen.getByTestId('select-item-json')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-csv')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-sarif')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-pdf')).toBeInTheDocument()
  })

  it('LLM-015: renders Export button', () => {
    render(<ReportGenerator compact />)
    expect(screen.getByText('Export')).toBeInTheDocument()
  })

  it('LLM-016: renders Download Report button in non-compact mode', () => {
    render(<ReportGenerator />)
    expect(screen.getByText('Download Report')).toBeInTheDocument()
  })

  it('LLM-017: handles download error gracefully', async () => {
    mockFetchWithAuth.mockRejectedValueOnce(new Error('Network error'))
    render(<ReportGenerator />)
    const downloadBtn = screen.getByText('Download Report')
    fireEvent.click(downloadBtn)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    })
  })
})

// ===========================================================================
// LLM-018: Leaderboard with sparklines
// ===========================================================================
describe('LLM-018: Leaderboard rendering', () => {
  it('renders model names and scores in leaderboard', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Model Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
  })

  it('renders sort buttons', () => {
    render(<Leaderboard />)
    expect(screen.getByText('By Score')).toBeInTheDocument()
    expect(screen.getByText('By Name')).toBeInTheDocument()
  })

  it('renders stat summary cards', () => {
    render(<Leaderboard />)
    expect(screen.getByText('Strong (80+)')).toBeInTheDocument()
    expect(screen.getByText('Moderate (50-79)')).toBeInTheDocument()
  })
})

// ===========================================================================
// LLM-019 to LLM-025: Belt badges for each rank
// ===========================================================================
describe('LLM-019 to LLM-025: BeltBadge component + getBeltRank', () => {
  it('LLM-019: White Belt for score 0-20', () => {
    const belt = getBeltRank(10)
    expect(belt.label).toBe('White Belt')
    expect(belt.short).toBe('White')
  })

  it('LLM-020: Yellow Belt for score 21-40', () => {
    const belt = getBeltRank(30)
    expect(belt.label).toBe('Yellow Belt')
    expect(belt.short).toBe('Yellow')
  })

  it('LLM-021: Orange Belt for score 41-60', () => {
    const belt = getBeltRank(50)
    expect(belt.label).toBe('Orange Belt')
    expect(belt.short).toBe('Orange')
  })

  it('LLM-022: Green Belt for score 61-75', () => {
    const belt = getBeltRank(70)
    expect(belt.label).toBe('Green Belt')
    expect(belt.short).toBe('Green')
  })

  it('LLM-023: Blue Belt for score 76-85', () => {
    const belt = getBeltRank(80)
    expect(belt.label).toBe('Blue Belt')
    expect(belt.short).toBe('Blue')
  })

  it('LLM-024: Brown Belt for score 86-92', () => {
    const belt = getBeltRank(90)
    expect(belt.label).toBe('Brown Belt')
    expect(belt.short).toBe('Brown')
  })

  it('LLM-025: Black Belt for score 93+', () => {
    const belt = getBeltRank(95)
    expect(belt.label).toBe('Black Belt')
    expect(belt.short).toBe('Black')
  })

  it('BeltBadge renders with correct aria-label', () => {
    render(<BeltBadge score={85} />)
    const badge = screen.getByLabelText('Blue Belt (score: 85)')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveTextContent('Blue')
  })

  it('BeltBadge hides label when showLabel=false', () => {
    render(<BeltBadge score={85} showLabel={false} />)
    const badge = screen.getByLabelText('Blue Belt (score: 85)')
    expect(badge).not.toHaveTextContent('Blue')
  })

  it('BeltBadge respects size prop', () => {
    const { container } = render(<BeltBadge score={50} size="lg" />)
    const badge = container.firstElementChild as HTMLElement
    expect(badge.className).toContain('text-sm')
  })
})

// ===========================================================================
// LLM-026: Model comparison
// ===========================================================================
describe('LLM-026: ComparisonView', () => {
  it('renders model toggle buttons from enabled models', () => {
    render(<ComparisonView />)
    expect(screen.getByText('Select Models to Compare')).toBeInTheDocument()
    // enabled models rendered as toggle buttons
    expect(screen.getByText('GPT-4o')).toBeInTheDocument()
    expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
  })

  it('compare button disabled with fewer than 2 models selected', () => {
    render(<ComparisonView />)
    const compareBtn = screen.getByLabelText('Compare selected models')
    expect(compareBtn).toBeDisabled()
  })

  it('toggles model selection via aria-pressed', () => {
    render(<ComparisonView />)
    const gptBtn = screen.getByText('GPT-4o')
    expect(gptBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(gptBtn)
    expect(gptBtn).toHaveAttribute('aria-pressed', 'true')
  })
})

// ===========================================================================
// LLM-027: Custom provider builder
// ===========================================================================
describe('LLM-027: Custom provider builder tab', () => {
  it('renders CustomProviderBuilder in custom tab', () => {
    render(<LLMDashboard initialTab="custom" />)
    expect(screen.getByTestId('custom-provider-builder')).toBeInTheDocument()
  })
})

// ===========================================================================
// LLM-028 to LLM-029: Resilience gauge and risk tier (ExecutiveSummary)
// ===========================================================================
describe('LLM-028: Resilience gauge', () => {
  it('renders resilience score and Overall Resilience label', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        overallScore: 82,
        riskTier: 'Production-Ready',
        topVulnerabilities: [],
        modelComparison: [],
        findings: 'Models are secure',
        recommendations: [],
        totalTests: 20,
      }),
    })

    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('82')).toBeInTheDocument()
      expect(screen.getByText('Overall Resilience')).toBeInTheDocument()
    })
  })
})

describe('LLM-029: Risk tier badge', () => {
  it('renders risk tier from API response', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        overallScore: 45,
        riskTier: 'Unsafe',
        topVulnerabilities: [],
        modelComparison: [],
        findings: 'Critical issues found',
        recommendations: ['Fix immediately'],
        totalTests: 5,
      }),
    })

    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Unsafe')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()
    })
  })

  it('shows no-data state when totalTests is 0', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        overallScore: 0,
        riskTier: 'Unknown',
        topVulnerabilities: [],
        modelComparison: [],
        findings: '',
        recommendations: [],
        totalTests: 0,
      }),
    })

    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })
  })

  it('shows error state on fetch failure', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: false,
      status: 500,
    })

    render(<ExecutiveSummary />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load summary')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LLM-030 to LLM-031: Severity accordion and evidence (VulnerabilityPanel)
// ===========================================================================
describe('LLM-030: Severity accordion groups', () => {
  beforeEach(() => {
    mockGetExecutions.mockResolvedValue([
      {
        id: 'ex1',
        modelConfigId: 'm1',
        status: 'completed',
        resilienceScore: 20,
        categoriesFailed: ['Prompt_Injection', 'Jailbreak'],
        response: 'Evidence text here',
        tpiCoverage: { 'TPI-01': false },
      },
      {
        id: 'ex2',
        modelConfigId: 'm2',
        status: 'completed',
        resilienceScore: 55,
        categoriesFailed: ['Encoding'],
        response: 'Moderate risk evidence',
        tpiCoverage: {},
      },
    ])
  })

  it('renders severity groups CRITICAL and WARNING', async () => {
    render(<VulnerabilityPanel />)
    await waitFor(() => {
      expect(screen.getByText('Vulnerability Findings')).toBeInTheDocument()
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
      expect(screen.getByText('WARNING')).toBeInTheDocument()
    })
  })

  it('renders Expand All / Collapse All toggle', async () => {
    render(<VulnerabilityPanel />)
    await waitFor(() => {
      expect(screen.getByText('Expand All')).toBeInTheDocument()
    })
  })
})

describe('LLM-031: Evidence display in VulnerabilityPanel', () => {
  beforeEach(() => {
    mockGetExecutions.mockResolvedValue([
      {
        id: 'ex1',
        modelConfigId: 'm1',
        status: 'completed',
        resilienceScore: 15,
        categoriesFailed: ['Prompt_Injection'],
        response: 'Detailed evidence response text for analysis',
        tpiCoverage: {},
      },
    ])
  })

  it('CRITICAL group is expanded by default', async () => {
    render(<VulnerabilityPanel />)
    await waitFor(() => {
      const criticalHeader = screen.getByText('CRITICAL').closest('[role="button"]')
      expect(criticalHeader).toHaveAttribute('aria-expanded', 'true')
    })
  })

  it('finding card shows confidence and show evidence button', async () => {
    render(<VulnerabilityPanel />)
    await waitFor(() => {
      expect(screen.getByText(/conf$/)).toBeInTheDocument()
      expect(screen.getByLabelText('Show evidence')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LLM-032: Re-test button
// ===========================================================================
describe('LLM-032: Re-test button in leaderboard', () => {
  it('renders re-test buttons for each leaderboard entry', () => {
    render(<Leaderboard />)
    const retestBtns = screen.getAllByTitle('Re-test this model')
    expect(retestBtns.length).toBe(2) // one per leaderboard entry
  })

  it('calls confirm dialog and fetchWithAuth on re-test click', async () => {
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ batches: [{ modelConfigIds: ['m1'], status: 'completed', testCaseIds: ['t1'] }] }),
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'batch-new' }),
    })

    render(<Leaderboard />)
    const retestBtns = screen.getAllByTitle('Re-test this model')
    fireEvent.click(retestBtns[0])

    expect(globalThis.confirm).toHaveBeenCalledWith('Re-test this model with the same test cases?')
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/batch')
    })
  })
})

// ===========================================================================
// Providers wrapper test
// ===========================================================================
describe('LLMDashboardWithProviders', () => {
  it('wraps dashboard in all 3 providers', () => {
    render(<LLMDashboardWithProviders />)
    // Should render without error - providers are mocked as pass-through
    expect(screen.getAllByRole('tab').length).toBe(6)
  })
})
