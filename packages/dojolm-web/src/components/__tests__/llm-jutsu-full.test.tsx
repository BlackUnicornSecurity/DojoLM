/**
 * File: llm-jutsu-full.test.tsx
 * Purpose: Tests for LLMJutsu main component
 * Test IDs: LJF-001 to LJF-012
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

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/lib/contexts', () => ({
  useBehavioralAnalysis: () => ({
    getResult: () => null,
    isAnalyzing: false,
    runAlignment: vi.fn().mockResolvedValue(undefined),
    runRobustness: vi.fn().mockResolvedValue(undefined),
    runGeometry: vi.fn().mockResolvedValue(undefined),
    runDepthProfile: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p>{actions}</div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/ModuleGuide', () => ({
  ModuleGuide: ({ isOpen, title }: { isOpen: boolean; title: string }) => (
    isOpen ? <div data-testid="module-guide">{title}</div> : null
  ),
}))

vi.mock('@/components/ui/ConfigPanel', () => ({
  ConfigPanel: ({ isOpen, title, onSave, onReset }: {
    isOpen: boolean; title: string; values: Record<string, unknown>;
    onChange: (k: string, v: unknown) => void; onSave: () => void; onReset: () => void
  }) => (
    isOpen ? (
      <div data-testid="config-panel">
        <h2>{title}</h2>
        <button onClick={onSave}>Save</button>
        <button onClick={onReset}>Reset</button>
      </div>
    ) : null
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}))

vi.mock('../llm/JutsuModelCard', () => ({
  JutsuModelCard: ({ model, onView }: { model: { modelName: string; modelId: string }; onView: (m: unknown) => void }) => (
    <div data-testid={`model-card-${model.modelId}`} onClick={() => onView(model)}>
      {model.modelName}
    </div>
  ),
}))

vi.mock('../llm/ModelDetailView', () => ({
  ModelDetailView: ({ model, onClose }: { model: { modelName: string }; onClose: () => void }) => (
    <div data-testid="model-detail">
      <span>{model.modelName} Details</span>
      <button onClick={onClose}>Close Detail</button>
    </div>
  ),
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
  // API returns test model data (GPT-4 and Claude)
  mockFetchWithAuth.mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { id: 'e1', modelId: 'gpt-4', modelName: 'GPT-4', provider: 'OpenAI', resilienceScore: 78, passRate: 78, totalTests: 50, passed: 39, failed: 11, categoriesFailed: ['Prompt Injection'], timestamp: '2026-03-05T10:00:00Z' },
        { id: 'e2', modelId: 'claude-3.5', modelName: 'Claude 3.5 Sonnet', provider: 'Anthropic', resilienceScore: 91, passRate: 91, totalTests: 50, passed: 45, failed: 5, categoriesFailed: ['Encoding'], timestamp: '2026-03-05T11:00:00Z' },
      ],
    }),
  })
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { JutsuTab as LLMJutsu } from '../llm/JutsuTab'

// ===========================================================================
// LJF-001: Renders header
// ===========================================================================
describe('LJF-001: Renders model grid', () => {
  it('renders model grid with demo data (JutsuTab — no standalone header)', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByLabelText('Search models')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LJF-002: Model grid renders with demo data
// ===========================================================================
describe('LJF-002: Model grid renders', () => {
  it('renders model cards from demo data', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByTestId('model-card-gpt-4')).toBeInTheDocument()
    })
    expect(screen.getByTestId('model-card-claude-3.5')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-003: Search filter
// ===========================================================================
describe('LJF-003: Search filter', () => {
  it('filters models by search term', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByTestId('model-card-gpt-4')).toBeInTheDocument()
    })
    const searchInput = screen.getByLabelText('Search models')
    fireEvent.change(searchInput, { target: { value: 'Claude' } })
    expect(screen.queryByTestId('model-card-gpt-4')).not.toBeInTheDocument()
    expect(screen.getByTestId('model-card-claude-3.5')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-004: Provider filter
// ===========================================================================
describe('LJF-004: Provider filter', () => {
  it('filters models by provider', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByTestId('model-card-gpt-4')).toBeInTheDocument()
    })
    // Models are loaded — 'Anthropic' is now a valid select option
    const providerSelect = screen.getByLabelText('Filter by provider')
    fireEvent.change(providerSelect, { target: { value: 'Anthropic' } })
    await waitFor(() => {
      expect(screen.queryByTestId('model-card-gpt-4')).not.toBeInTheDocument()
      expect(screen.getByTestId('model-card-claude-3.5')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LJF-005: Model count display
// ===========================================================================
describe('LJF-005: Model count display', () => {
  it('shows correct model count', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByText(/\d+ models? found/)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LJF-006: Guide button opens guide
// ===========================================================================
describe('LJF-006: Guide button opens guide', () => {
  it('opens module guide when help button is clicked', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByLabelText('Search models')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('module-guide')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open Jutsu guide'))
    expect(screen.getByTestId('module-guide')).toBeInTheDocument()
    expect(screen.getByText('Jutsu Guide')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-007: Config button opens config
// ===========================================================================
describe('LJF-007: Config button opens config', () => {
  it('opens config panel when settings button is clicked', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByLabelText('Search models')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('config-panel')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Open Jutsu settings'))
    expect(screen.getByTestId('config-panel')).toBeInTheDocument()
    expect(screen.getByText('Jutsu Settings')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-008: Provider dropdown has All Providers option
// ===========================================================================
describe('LJF-008: Provider dropdown', () => {
  it('has All Providers as default option', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by provider')).toBeInTheDocument()
    })
    const select = screen.getByLabelText('Filter by provider') as HTMLSelectElement
    expect(select.value).toBe('all')
    expect(screen.getByText('All Providers')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-009: Model card click opens detail view
// ===========================================================================
describe('LJF-009: Model card click opens detail', () => {
  it('opens ModelDetailView when model card is clicked', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByTestId('model-card-gpt-4')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('model-card-gpt-4'))
    expect(screen.getByTestId('model-detail')).toBeInTheDocument()
    expect(screen.getByText('GPT-4 Details')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-010: Empty state when search yields no results
// ===========================================================================
describe('LJF-010: Empty state on no results', () => {
  it('shows empty state when search has no matches', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(screen.getByTestId('model-card-gpt-4')).toBeInTheDocument()
    })
    const searchInput = screen.getByLabelText('Search models')
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-011: Search placeholder text
// ===========================================================================
describe('LJF-011: Search placeholder', () => {
  it('has correct placeholder text on search input', () => {
    render(<LLMJutsu />)
    expect(screen.getByPlaceholderText('Search models, providers...')).toBeInTheDocument()
  })
})

// ===========================================================================
// LJF-012: API call on mount
// ===========================================================================
describe('LJF-012: API call on mount', () => {
  it('calls fetchWithAuth to load results on mount', async () => {
    render(<LLMJutsu />)
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/results')
    })
  })
})
