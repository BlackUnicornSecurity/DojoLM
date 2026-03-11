/**
 * File: api-key-manager.test.tsx
 * Purpose: Unit tests for ApiKeyManager admin component
 * Test IDs: AKM-001 to AKM-016
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/llm-types', () => ({
  LLM_PROVIDERS: ['openai', 'anthropic', 'ollama', 'google', 'custom'],
}))

import { ApiKeyManager } from '../admin/ApiKeyManager'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockProviders = [
  {
    id: 'p1',
    name: 'GPT-4o Production',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    hasApiKey: true,
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    id: 'p2',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    enabled: true,
    hasApiKey: true,
  },
  {
    id: 'p3',
    name: 'Local Ollama',
    provider: 'ollama',
    model: 'llama3',
    enabled: false,
    hasApiKey: false,
  },
]

function setupFetchSuccess(models = mockProviders) {
  mockFetchWithAuth.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ models }),
  })
}

function setupFetchError() {
  mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ApiKeyManager', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('AKM-001: shows loading state initially', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {}))
    render(<ApiKeyManager />)
    expect(screen.getByText('Loading API keys...')).toBeInTheDocument()
  })

  it('AKM-002: renders provider list after loading', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByText('GPT-4o Production')).toBeInTheDocument()
    })
    expect(screen.getByText('Claude Sonnet')).toBeInTheDocument()
    expect(screen.getByText('Local Ollama')).toBeInTheDocument()
  })

  it('AKM-003: renders API Key Management heading', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByText('API Key Management')).toBeInTheDocument()
    })
  })

  it('AKM-004: shows error alert on fetch failure', async () => {
    setupFetchError()
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('Unable to load model configurations.')).toBeInTheDocument()
    })
  })

  it('AKM-005: renders empty state when no providers', async () => {
    setupFetchSuccess([])
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByText('No API keys configured.')).toBeInTheDocument()
    })
  })

  it('AKM-006: displays model name for each provider', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByText(/Model: gpt-4o/)).toBeInTheDocument()
      expect(screen.getByText(/Model: claude-sonnet-4-20250514/)).toBeInTheDocument()
    })
  })

  it('AKM-007: shows masked key indicator for providers with keys', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      const maskedKeys = screen.getAllByText(/Key:/)
      expect(maskedKeys.length).toBeGreaterThan(0)
    })
  })

  it('AKM-008: shows Not set for providers without keys', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      expect(screen.getByText(/Key: Not set/)).toBeInTheDocument()
    })
  })

  it('AKM-009: renders Test button for each provider', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      const testButtons = screen.getAllByRole('button', { name: /test connection/i })
      expect(testButtons).toHaveLength(3)
    })
  })

  it('AKM-010: renders Delete button for each provider', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      expect(deleteButtons).toHaveLength(3)
    })
  })

  it('AKM-011: clicking Add Key shows the add form', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('Add Key'))
    fireEvent.click(screen.getByText('Add Key'))
    expect(screen.getByText('Add New Provider')).toBeInTheDocument()
  })

  it('AKM-012: add form has name, provider, model, api key, base url fields', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('Add Key'))
    fireEvent.click(screen.getByText('Add Key'))
    expect(document.getElementById('admin-key-name')).toBeInTheDocument()
    expect(document.getElementById('admin-key-provider')).toBeInTheDocument()
    expect(document.getElementById('admin-key-model')).toBeInTheDocument()
    expect(document.getElementById('admin-key-apikey')).toBeInTheDocument()
    expect(document.getElementById('admin-key-baseurl')).toBeInTheDocument()
  })

  it('AKM-013: add form Cancel button hides the form', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('Add Key'))
    fireEvent.click(screen.getByText('Add Key'))
    expect(screen.getByText('Add New Provider')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Add New Provider')).not.toBeInTheDocument()
  })

  it('AKM-014: clicking Test triggers connection test', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('GPT-4o Production'))

    mockFetchWithAuth.mockResolvedValueOnce({ ok: true })

    const testButtons = screen.getAllByRole('button', { name: /test connection/i })
    fireEvent.click(testButtons[0]!)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/models/p1/test', { method: 'POST' })
    })
  })

  it('AKM-015: clicking Delete calls fetchWithAuth with DELETE', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('GPT-4o Production'))

    mockFetchWithAuth.mockResolvedValueOnce({ ok: true })

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0]!)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/api/llm/models?id='),
        { method: 'DELETE' },
      )
    })
  })

  it('AKM-016: refresh button re-fetches providers', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('GPT-4o Production'))

    const callCountBefore = mockFetchWithAuth.mock.calls.length
    setupFetchSuccess()
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() => {
      expect(mockFetchWithAuth.mock.calls.length).toBeGreaterThan(callCountBefore)
    })
  })

  it('AKM-017: add form show/hide API key toggle works', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('Add Key'))
    fireEvent.click(screen.getByText('Add Key'))

    // Use the specific form input by id
    const apiKeyInput = document.getElementById('admin-key-apikey') as HTMLInputElement
    expect(apiKeyInput.type).toBe('password')

    const toggleBtn = screen.getByRole('button', { name: /show api key/i })
    fireEvent.click(toggleBtn)
    expect(apiKeyInput.type).toBe('text')

    const hideBtn = screen.getByRole('button', { name: /hide api key/i })
    fireEvent.click(hideBtn)
    expect(apiKeyInput.type).toBe('password')
  })

  it('AKM-018: shows sr-only Enabled/Disabled text for provider status', async () => {
    setupFetchSuccess()
    render(<ApiKeyManager />)
    await waitFor(() => screen.getByText('GPT-4o Production'))
    // Check for screen-reader only status text
    const enabledTexts = screen.getAllByText('Enabled')
    expect(enabledTexts.length).toBeGreaterThan(0)
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })
})
