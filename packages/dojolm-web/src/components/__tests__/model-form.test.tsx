/**
 * File: model-form.test.tsx
 * Purpose: Tests for ModelForm component
 * Test IDs: MF-001 to MF-012
 * Source: src/components/llm/ModelForm.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({
    models: [],
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/lib/llm-constants', () => ({
  PROVIDER_INFO: {
    openai: { name: 'OpenAI', description: 'OpenAI API' },
    anthropic: { name: 'Anthropic', description: 'Anthropic API' },
    ollama: { name: 'Ollama', description: 'Local Ollama' },
    lmstudio: { name: 'LM Studio', description: 'Local LM Studio' },
    llamacpp: { name: 'llama.cpp', description: 'Local llama.cpp' },
    custom: { name: 'Custom', description: 'Custom provider' },
  },
  DEFAULT_MODELS: {
    openai: ['gpt-4o', 'gpt-3.5-turbo'],
    anthropic: ['claude-3.5-sonnet'],
    ollama: [],
    custom: [],
  },
  PROVIDER_BASE_URLS: {
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234',
    llamacpp: 'http://localhost:8080',
  },
  validateApiKey: vi.fn(() => true),
  TEMPERATURE_RANGE: { min: 0, max: 2 },
  TOP_P_RANGE: { min: 0, max: 1 },
}))

// Mock UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: string; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} type={type} {...rest}>{children}</button>
  ),
}))
vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => <label {...rest}>{children}</label>,
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <h3>{children}</h3>,
  CardDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value?: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => <button data-testid={`select-trigger-${id || 'default'}`}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: { id?: string; checked?: boolean; onCheckedChange?: (v: boolean) => void }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid={`checkbox-${id}`}
    />
  ),
}))

vi.mock('../llm/LocalModelSelector', () => ({
  LocalModelSelector: ({ provider }: { provider: string }) => (
    <div data-testid="local-model-selector" data-provider={provider} />
  ),
}))

vi.mock('lucide-react', () => ({
  X: () => <span data-testid="icon-x">X</span>,
  Eye: () => <span data-testid="icon-eye">Eye</span>,
  EyeOff: () => <span data-testid="icon-eye-off">EyeOff</span>,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { ModelForm } from '../llm/ModelForm'

const mockOnSave = vi.fn().mockResolvedValue(undefined)
const mockOnCancel = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

// ===========================================================================
// MF-001: Renders "Add New Model" title when no model prop
// ===========================================================================
describe('MF-001: Add mode title', () => {
  it('shows "Add New Model" when model is not provided', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Add New Model')).toBeInTheDocument()
  })
})

// ===========================================================================
// MF-002: Renders "Edit Model" title when model prop is given
// ===========================================================================
describe('MF-002: Edit mode title', () => {
  it('shows "Edit Model" when model prop is provided', () => {
    const existing = {
      id: 'm1',
      name: 'My GPT',
      provider: 'openai' as const,
      model: 'gpt-4o',
      apiKey: 'sk-test123456789012345678901234567890',
      enabled: true,
      temperature: 0.5,
      topP: 0.9,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }
    render(<ModelForm model={existing} onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Edit Model')).toBeInTheDocument()
  })
})

// ===========================================================================
// MF-003: Renders form fields (name, provider, temperature, topP, enabled)
// ===========================================================================
describe('MF-003: Form fields rendering', () => {
  it('renders all expected form fields', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Display Name')).toBeInTheDocument()
    expect(screen.getByText('Provider')).toBeInTheDocument()
    expect(screen.getByText(/Temperature/)).toBeInTheDocument()
    expect(screen.getByText(/Top-p/)).toBeInTheDocument()
    expect(screen.getByText('Enable this model for testing')).toBeInTheDocument()
  })
})

// ===========================================================================
// MF-004: Cancel button calls onCancel
// ===========================================================================
describe('MF-004: Cancel calls onCancel', () => {
  it('fires onCancel when Cancel is clicked', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// MF-005: Submit with empty name shows validation error
// ===========================================================================
describe('MF-005: Empty name validation', () => {
  it('shows name required error on empty submit', async () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    const form = screen.getByText('Add Model').closest('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText('Model name is required')).toBeInTheDocument()
    })
    expect(mockOnSave).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// MF-006: Submit with empty model shows validation error
// ===========================================================================
describe('MF-006: Empty model validation', () => {
  it('shows model identifier required error', async () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    // Fill name but leave model empty
    fireEvent.change(screen.getByPlaceholderText('e.g., GPT-4o Production'), {
      target: { value: 'Test Model' },
    })
    const form = screen.getByText('Add Model').closest('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText('Model identifier is required')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// MF-007: API key required for non-ollama providers
// ===========================================================================
describe('MF-007: API key required validation', () => {
  it('shows API key required when provider is openai and key is empty', async () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    // Fill name
    fireEvent.change(screen.getByPlaceholderText('e.g., GPT-4o Production'), {
      target: { value: 'Test Model' },
    })
    const form = screen.getByText('Add Model').closest('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      expect(screen.getByText('API key is required for this provider')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// MF-008: Shows "Add Model" button text (add mode) vs "Update Model" (edit)
// ===========================================================================
describe('MF-008: Submit button text', () => {
  it('shows "Add Model" in add mode', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Add Model')).toBeInTheDocument()
  })

  it('shows "Update Model" in edit mode', () => {
    const existing = {
      id: 'm1', name: 'My GPT', provider: 'openai' as const, model: 'gpt-4o',
      apiKey: 'sk-test123456789012345678901234567890', enabled: true,
      temperature: 0.5, topP: 0.9, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    }
    render(<ModelForm model={existing} onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Update Model')).toBeInTheDocument()
  })
})

// ===========================================================================
// MF-009: Name input updates on change
// ===========================================================================
describe('MF-009: Name input change', () => {
  it('allows typing in the name field', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    const nameInput = screen.getByPlaceholderText('e.g., GPT-4o Production')
    fireEvent.change(nameInput, { target: { value: 'New Model' } })
    expect(nameInput).toHaveValue('New Model')
  })
})

// ===========================================================================
// MF-010: Shows temperature value in label
// ===========================================================================
describe('MF-010: Temperature label display', () => {
  it('displays current temperature value', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByText('Temperature (0.7)')).toBeInTheDocument()
  })
})

// ===========================================================================
// MF-011: Close button (X) calls onCancel
// ===========================================================================
describe('MF-011: Close (X) button', () => {
  it('calls onCancel when X button is clicked', () => {
    render(<ModelForm onSave={mockOnSave} onCancel={mockOnCancel} />)
    // The X button is the first ghost button
    const xButton = screen.getByTestId('icon-x').closest('button')!
    fireEvent.click(xButton)
    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })
})

// ===========================================================================
// MF-012: Existing model populates form fields
// ===========================================================================
describe('MF-012: Edit mode populates form', () => {
  it('pre-fills form data from existing model', () => {
    const existing = {
      id: 'm1', name: 'GPT-4o Production', provider: 'openai' as const,
      model: 'gpt-4o', apiKey: 'sk-test123456789012345678901234567890',
      enabled: false, temperature: 1.2, topP: 0.8,
      createdAt: '2026-01-01', updatedAt: '2026-01-01',
    }
    render(<ModelForm model={existing} onSave={mockOnSave} onCancel={mockOnCancel} />)
    expect(screen.getByDisplayValue('GPT-4o Production')).toBeInTheDocument()
    expect(screen.getByText('Temperature (1.2)')).toBeInTheDocument()
    expect(screen.getByText('Top-p (0.8)')).toBeInTheDocument()
  })
})
