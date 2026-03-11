/**
 * File: local-model-selector.test.tsx
 * Purpose: Tests for LocalModelSelector component
 * Test IDs: LMS-001 to LMS-012
 * Source: src/components/llm/LocalModelSelector.tsx
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

vi.mock('@/lib/llm-constants', () => ({
  PROVIDER_BASE_URLS: {
    ollama: 'http://localhost:11434',
    lmstudio: 'http://localhost:1234',
    llamacpp: 'http://localhost:8080',
  },
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...rest }: { children: ReactNode; onClick?: () => void; disabled?: boolean; className?: string; [k: string]: unknown }) => (
    <button onClick={onClick} disabled={disabled} className={className} {...rest}>{children}</button>
  ),
}))
vi.mock('@/components/ui/label', () => ({
  Label: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => <label {...rest}>{children}</label>,
}))
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

vi.mock('lucide-react', () => ({
  RefreshCw: () => <span data-testid="icon-refresh" />,
  Server: () => <span data-testid="icon-server" />,
  ServerOff: () => <span data-testid="icon-server-off" />,
  Check: () => <span data-testid="icon-check" />,
  Loader2: () => <span data-testid="icon-loader" />,
}))

const mockOnSelectModel = vi.fn()
const mockOnBaseUrlChange = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { LocalModelSelector } from '../llm/LocalModelSelector'

// ===========================================================================
// LMS-001: Renders base URL input with default value
// ===========================================================================
describe('LMS-001: Base URL input', () => {
  it('renders base URL input with default ollama URL', () => {
    render(
      <LocalModelSelector
        provider="ollama"
        onSelectModel={mockOnSelectModel}
      />
    )
    const input = screen.getByDisplayValue('http://localhost:11434')
    expect(input).toBeInTheDocument()
  })
})

// ===========================================================================
// LMS-002: Renders Connect button
// ===========================================================================
describe('LMS-002: Connect button', () => {
  it('renders Connect or Connecting button text', async () => {
    mockFetchWithAuth.mockResolvedValue({ ok: true, json: () => Promise.resolve({ models: [] }) })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    // With a custom URL (not the default), auto-fetch does not trigger
    expect(screen.getByText('Connect')).toBeInTheDocument()
  })
})

// ===========================================================================
// LMS-003: Uses currentBaseUrl prop if provided
// ===========================================================================
describe('LMS-003: Custom base URL', () => {
  it('uses provided currentBaseUrl', () => {
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://192.168.1.100:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    expect(screen.getByDisplayValue('http://192.168.1.100:11434')).toBeInTheDocument()
  })
})

// ===========================================================================
// LMS-004: Connect button fetches models from API
// ===========================================================================
describe('LMS-004: Fetch models on Connect', () => {
  it('calls fetchWithAuth when Connect is clicked', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [{ id: 'llama3.2', name: 'Llama 3.2' }] }),
    })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('provider=ollama')
      )
    })
  })
})

// ===========================================================================
// LMS-005: Displays models after successful fetch
// ===========================================================================
describe('LMS-005: Model list display', () => {
  it('shows Available Models count after fetching', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: [
          { id: 'llama3.2', name: 'Llama 3.2', sizeFormatted: '4.7GB' },
          { id: 'mistral', name: 'Mistral', sizeFormatted: '4.1GB' },
        ],
      }),
    })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText('Available Models (2)')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LMS-006: Clicking a model calls onSelectModel
// ===========================================================================
describe('LMS-006: Model selection callback', () => {
  it('calls onSelectModel with model id when model is clicked', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: [{ id: 'llama3.2', name: 'Llama 3.2' }],
      }),
    })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText('Llama 3.2')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Llama 3.2'))
    expect(mockOnSelectModel).toHaveBeenCalledWith('llama3.2')
  })
})

// ===========================================================================
// LMS-007: Shows error message on fetch failure
// ===========================================================================
describe('LMS-007: Fetch error display', () => {
  it('shows error message when fetch fails', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Connection refused'))
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText(/Connection refused/)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LMS-008: Shows connected status after successful fetch
// ===========================================================================
describe('LMS-008: Connected status', () => {
  it('shows "Connected to Ollama" after models load', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        models: [{ id: 'llama3.2', name: 'Llama 3.2' }],
      }),
    })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText('Connected to Ollama')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LMS-009: Shows unavailable status on error
// ===========================================================================
describe('LMS-009: Unavailable status', () => {
  it('shows "Ollama unavailable" when there is an error', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('fail'))
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText('Ollama unavailable')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LMS-010: Base URL change calls onBaseUrlChange callback
// ===========================================================================
describe('LMS-010: Base URL change callback', () => {
  it('calls onBaseUrlChange when base URL input changes', () => {
    render(
      <LocalModelSelector
        provider="ollama"
        onSelectModel={mockOnSelectModel}
        onBaseUrlChange={mockOnBaseUrlChange}
      />
    )
    const input = screen.getByDisplayValue('http://localhost:11434')
    fireEvent.change(input, { target: { value: 'http://192.168.1.50:11434' } })
    expect(mockOnBaseUrlChange).toHaveBeenCalledWith('http://192.168.1.50:11434')
  })
})

// ===========================================================================
// LMS-011: Renders "No models found" when provider returns empty
// ===========================================================================
describe('LMS-011: Empty models state', () => {
  it('shows no models message when fetch returns empty array', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ models: [] }),
    })
    render(
      <LocalModelSelector
        provider="ollama"
        currentBaseUrl="http://custom:11434"
        onSelectModel={mockOnSelectModel}
      />
    )
    fireEvent.click(screen.getByText('Connect'))
    await waitFor(() => {
      expect(screen.getByText('No models found. Ensure the provider is running.')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// LMS-012: Uses LM Studio default URL for lmstudio provider
// ===========================================================================
describe('LMS-012: LM Studio default URL', () => {
  it('uses lmstudio default URL when provider is lmstudio', () => {
    render(
      <LocalModelSelector
        provider="lmstudio"
        onSelectModel={mockOnSelectModel}
      />
    )
    expect(screen.getByDisplayValue('http://localhost:1234')).toBeInTheDocument()
  })
})
