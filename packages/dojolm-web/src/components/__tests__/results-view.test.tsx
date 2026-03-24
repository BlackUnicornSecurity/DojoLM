/**
 * File: results-view.test.tsx
 * Purpose: Tests for ResultsView component
 * Test IDs: RV-001 to RV-012
 * Source: src/components/llm/ResultsView.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMTestExecution, LLMModelConfig } from '@/lib/llm-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetExecutions = vi.fn()
const mockSetFilter = vi.fn()
const mockClearFilter = vi.fn()
const mockModels: LLMModelConfig[] = [
  {
    id: 'm1', name: 'GPT-4o', provider: 'openai', model: 'gpt-4o',
    apiKey: 'sk-test', enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
  {
    id: 'm2', name: 'Claude 3.5', provider: 'anthropic', model: 'claude-3.5',
    apiKey: 'sk-ant-test', enabled: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
  },
]

const mockExecution: LLMTestExecution = {
  id: 'exec-1',
  testCaseId: 'tc-1',
  modelConfigId: 'm1',
  timestamp: '2026-01-15T10:00:00Z',
  status: 'completed',
  prompt: 'Test prompt',
  response: 'Test response',
  duration_ms: 1500,
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  injectionSuccess: 0.1,
  harmfulness: 0.05,
  resilienceScore: 85,
  categoriesPassed: ['injection'],
  categoriesFailed: ['jailbreak'],
  owaspCoverage: { 'LLM01': true },
  tpiCoverage: { 'TPI-01': true },
  contentHash: 'abc123',
  cached: false,
}

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({
    models: mockModels,
  }),
  useResultsContext: () => ({
    getExecutions: mockGetExecutions,
    isLoading: false,
    error: null,
    filter: {},
    setFilter: mockSetFilter,
    clearFilter: mockClearFilter,
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
  ),
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className, ...rest }: { children: ReactNode; className?: string; [k: string]: unknown }) => (
    <div className={className} {...rest}>{children}</div>
  ),
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, className }: { children: ReactNode; className?: string }) => <button data-testid="select-trigger">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))
vi.mock('@/components/ui/BeltBadge', () => ({
  BeltBadge: ({ score }: { score: number }) => <span data-testid="belt-badge">{score}</span>,
}))
vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))
vi.mock('../llm/ExecutiveSummary', () => ({
  ExecutiveSummary: () => <div data-testid="executive-summary">Executive Summary</div>,
}))
vi.mock('../llm/VulnerabilityPanel', () => ({
  VulnerabilityPanel: () => <div data-testid="vulnerability-panel">Vulnerability Findings</div>,
}))
vi.mock('../llm/ModelResultCard', () => ({
  ModelResultCard: ({ result }: { result: { modelId: string; modelName: string } }) => (
    <div data-testid={`model-result-card-${result.modelId}`}>{result.modelName}</div>
  ),
  aggregateByModel: (executions: LLMTestExecution[], models: LLMModelConfig[]) => {
    const groups: Record<string, { modelId: string; modelName: string; avgScore: number; lastTestedAt: string }> = {}
    for (const exec of executions) {
      const model = models.find(m => m.id === exec.modelConfigId)
      if (!groups[exec.modelConfigId]) {
        groups[exec.modelConfigId] = {
          modelId: exec.modelConfigId,
          modelName: model?.name || exec.modelConfigId,
          avgScore: exec.resilienceScore,
          lastTestedAt: exec.timestamp,
        }
      }
    }
    return Object.values(groups)
  },
}))

vi.mock('lucide-react', () => ({
  Download: () => <span>Download</span>,
  Filter: () => <span>Filter</span>,
  ChevronDown: () => <span>V</span>,
  ChevronUp: () => <span>^</span>,
  AlertTriangle: () => <span>!</span>,
  CheckCircle2: () => <span>ok</span>,
  XCircle: () => <span>x</span>,
  LayoutGrid: () => <span>Grid</span>,
  List: () => <span>List</span>,
  Eye: () => <span>Eye</span>,
  EyeOff: () => <span>EyeOff</span>,
  Shield: () => <span>Shield</span>,
  ShieldAlert: () => <span>ShieldAlert</span>,
  ShieldCheck: () => <span>ShieldCheck</span>,
  ShieldX: () => <span>ShieldX</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  Lightbulb: () => <span>Lightbulb</span>,
  Copy: () => <span>Copy</span>,
  Check: () => <span>Check</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Info: () => <span>Info</span>,
}))

// Mock URL.createObjectURL
vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })

beforeEach(() => {
  vi.clearAllMocks()
  mockGetExecutions.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ResultsView } from '../llm/ResultsView'

async function renderResultsView() {
  await act(async () => {
    render(<ResultsView />)
    await Promise.resolve()
  })
}

// ===========================================================================
// RV-001: Renders empty state when no results
// ===========================================================================
describe('RV-001: Empty state', () => {
  it('shows empty state when there are no executions', async () => {
    mockGetExecutions.mockResolvedValue([])
    await renderResultsView()
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No results found')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// RV-002: Renders model filter dropdown with "All Models"
// ===========================================================================
describe('RV-002: Model filter', () => {
  it('renders All Models and individual model options', async () => {
    await renderResultsView()
    expect(screen.getByTestId('select-item-all')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-m1')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-m2')).toBeInTheDocument()
  })
})

// ===========================================================================
// RV-003: Renders view mode toggle buttons
// ===========================================================================
describe('RV-003: View mode toggles', () => {
  it('renders Model view and List view buttons', async () => {
    await renderResultsView()
    expect(screen.getByLabelText('Model view')).toBeInTheDocument()
    expect(screen.getByLabelText('List view')).toBeInTheDocument()
  })
})

// ===========================================================================
// RV-004: Clear filter button renders
// ===========================================================================
describe('RV-004: Clear filter button', () => {
  it('renders Clear filter button', async () => {
    await renderResultsView()
    expect(screen.getByText('Clear')).toBeInTheDocument()
  })
})

// ===========================================================================
// RV-005: Clear filter calls clearFilter
// ===========================================================================
describe('RV-005: Clear filter action', () => {
  it('calls clearFilter when Clear button is clicked', async () => {
    await renderResultsView()
    fireEvent.click(screen.getByText('Clear'))
    expect(mockClearFilter).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// RV-006: Download All button renders with aria-label
// ===========================================================================
describe('RV-006: Download All button', () => {
  it('renders Download All with accessible label', async () => {
    await renderResultsView()
    expect(screen.getByLabelText('Download all results')).toBeInTheDocument()
  })
})

// ===========================================================================
// RV-007: Renders model cards when executions exist (model view)
// ===========================================================================
describe('RV-007: Model cards render', () => {
  it('shows model result cards for executions in model view', async () => {
    mockGetExecutions.mockResolvedValue([mockExecution])
    await renderResultsView()
    await waitFor(() => {
      expect(screen.getByTestId('model-result-card-m1')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// RV-008: Shows sort selector in model view mode
// ===========================================================================
describe('RV-008: Sort selector', () => {
  it('renders sort options in model view mode', async () => {
    await renderResultsView()
    expect(screen.getByTestId('select-item-score')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-date')).toBeInTheDocument()
    expect(screen.getByTestId('select-item-name')).toBeInTheDocument()
  })
})

// ===========================================================================
// RV-009: Shows loading skeletons initially
// ===========================================================================
describe('RV-009: Loading skeletons', () => {
  it('shows skeleton loaders while results are loading', async () => {
    // Make getExecutions hang so loading stays true
    mockGetExecutions.mockReturnValue(new Promise(() => {}))
    await renderResultsView()
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// RV-010: Shows result count in list view
// ===========================================================================
describe('RV-010: Result count in list view', () => {
  it('shows execution count text after switching to list view', async () => {
    mockGetExecutions.mockResolvedValue([mockExecution])
    await renderResultsView()
    // Switch to list view
    fireEvent.click(screen.getByLabelText('List view'))
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 result/)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// RV-011: getExecutions is called on mount
// ===========================================================================
describe('RV-011: Initial fetch', () => {
  it('calls getExecutions on component mount', async () => {
    mockGetExecutions.mockResolvedValue([])
    await renderResultsView()
    await waitFor(() => {
      expect(mockGetExecutions).toHaveBeenCalled()
    })
  })
})

// ===========================================================================
// RV-012: Model count text in model view
// ===========================================================================
describe('RV-012: Model count text', () => {
  it('shows models tested count in model view', async () => {
    mockGetExecutions.mockResolvedValue([mockExecution])
    await renderResultsView()
    await waitFor(() => {
      expect(screen.getByText(/1 model tested/)).toBeInTheDocument()
    })
  })
})
