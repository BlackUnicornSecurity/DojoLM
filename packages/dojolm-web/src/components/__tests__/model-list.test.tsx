/**
 * File: model-list.test.tsx
 * Purpose: Tests for ModelList component
 * Test IDs: ML-001 to ML-012
 * Source: src/components/llm/ModelList.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'
import type { LLMModelConfig } from '@/lib/llm-types'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSaveModel = vi.fn()
const mockDeleteModel = vi.fn()
const mockToggleModel = vi.fn()
const mockTestModel = vi.fn().mockResolvedValue({ success: true })
const mockRefresh = vi.fn()
let mockModels: LLMModelConfig[] = []
let mockIsLoading = false
let mockError: string | null = null

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({
    models: mockModels,
    isLoading: mockIsLoading,
    error: mockError,
    saveModel: mockSaveModel,
    deleteModel: mockDeleteModel,
    toggleModel: mockToggleModel,
    testModel: mockTestModel,
    refresh: mockRefresh,
  }),
}))

vi.mock('@/lib/llm-constants', () => ({
  PROVIDER_INFO: {
    openai: { name: 'OpenAI' },
    anthropic: { name: 'Anthropic' },
    custom: { name: 'Custom' },
  },
}))

vi.mock('../llm/ModelForm', () => ({
  ModelForm: ({ onSave, onCancel }: { onSave: (d: any) => void; onCancel: () => void }) => (
    <div data-testid="model-form">
      <button onClick={() => onSave({ name: 'New', provider: 'openai', model: 'gpt-4', enabled: true })}>Save</button>
      <button onClick={onCancel}>Cancel Form</button>
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, variant, size }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
  CardDescription: ({ children, className }: { children: ReactNode; className?: string }) => <p className={className}>{children}</p>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}))

vi.mock('lucide-react', () => ({
  Plus: () => <span data-testid="icon-plus" />,
  Pencil: () => <span data-testid="icon-pencil" />,
  Trash2: () => <span data-testid="icon-trash" />,
  TestTube: () => <span data-testid="icon-test" />,
  Check: () => <span data-testid="icon-check" />,
  X: () => <span data-testid="icon-x" />,
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Brain: () => <span data-testid="icon-brain" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ModelList } from '../llm/ModelList'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const sampleModels: LLMModelConfig[] = [
  { id: 'm1', name: 'GPT-4', provider: 'openai', model: 'gpt-4', enabled: true, createdAt: '', updatedAt: '' },
  { id: 'm2', name: 'Claude', provider: 'anthropic', model: 'claude-3', enabled: false, createdAt: '', updatedAt: '' },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ModelList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockModels = sampleModels
    mockIsLoading = false
    mockError = null
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true)
  })

  // ML-001
  it('shows loading skeletons when isLoading', () => {
    mockIsLoading = true
    render(<ModelList />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  // ML-002
  it('shows error state with retry button', () => {
    mockError = 'Failed to load'
    render(<ModelList />)
    expect(screen.getByText(/Error loading models/)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  // ML-003
  it('calls refresh when retry is clicked', () => {
    mockError = 'Failed to load'
    render(<ModelList />)
    fireEvent.click(screen.getByText('Retry'))
    expect(mockRefresh).toHaveBeenCalled()
  })

  // ML-004
  it('shows empty state when no models configured', () => {
    mockModels = []
    render(<ModelList />)
    expect(screen.getByText('No models configured')).toBeInTheDocument()
  })

  // ML-005
  it('renders model cards with names', () => {
    render(<ModelList />)
    expect(screen.getByText('GPT-4')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  // ML-006
  it('shows model count in header', () => {
    render(<ModelList />)
    expect(screen.getByText(/Configured Models \(2\)/)).toBeInTheDocument()
  })

  // ML-007
  it('shows Enabled/Disabled badges', () => {
    render(<ModelList />)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  // ML-008
  it('opens form when Add Model is clicked', () => {
    render(<ModelList />)
    // The first "Add Model" button in the header
    const addButtons = screen.getAllByText('Add Model')
    fireEvent.click(addButtons[0])
    expect(screen.getByTestId('model-form')).toBeInTheDocument()
  })

  // ML-009
  it('calls deleteModel when delete is confirmed', async () => {
    render(<ModelList />)
    const trashButtons = screen.getAllByTestId('icon-trash')
    fireEvent.click(trashButtons[0].closest('button')!)
    await waitFor(() => {
      expect(mockDeleteModel).toHaveBeenCalledWith('m1')
    })
  })

  // ML-010
  it('calls toggleModel when Enable/Disable is clicked', async () => {
    render(<ModelList />)
    // First model is enabled, so it shows "Disable" button
    fireEvent.click(screen.getByText('Disable'))
    await waitFor(() => {
      expect(mockToggleModel).toHaveBeenCalledWith('m1', false)
    })
  })

  // ML-011
  it('shows provider badge for each model', () => {
    render(<ModelList />)
    expect(screen.getByText('OpenAI')).toBeInTheDocument()
    expect(screen.getByText('Anthropic')).toBeInTheDocument()
  })

  // ML-012
  it('closes form on cancel', () => {
    render(<ModelList />)
    const addButtons = screen.getAllByText('Add Model')
    fireEvent.click(addButtons[0])
    expect(screen.getByTestId('model-form')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel Form'))
    expect(screen.queryByTestId('model-form')).toBeNull()
  })
})
