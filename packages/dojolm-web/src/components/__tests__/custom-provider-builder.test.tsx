/**
 * File: custom-provider-builder.test.tsx
 * Purpose: Tests for CustomProviderBuilder component
 * Test IDs: CP-001 to CP-012
 * Source: src/components/llm/CustomProviderBuilder.tsx
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSaveModel = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/contexts', () => ({
  useModelContext: () => ({
    saveModel: mockSaveModel,
  }),
}))

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { CustomProviderBuilder } from '../llm/CustomProviderBuilder'
const originalFetch = global.fetch

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CustomProviderBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }) as typeof fetch
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  // CP-001
  it('renders the heading', () => {
    render(<CustomProviderBuilder />)
    expect(screen.getByText('Custom Provider Builder')).toBeInTheDocument()
  })

  // CP-002
  it('renders template buttons', () => {
    render(<CustomProviderBuilder />)
    expect(screen.getByText('OpenAI-Compatible')).toBeInTheDocument()
    expect(screen.getByText('Custom from Scratch')).toBeInTheDocument()
  })

  // CP-003
  it('renders all config input fields', () => {
    render(<CustomProviderBuilder />)
    expect(screen.getByLabelText('Display Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Model Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Base URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Request Timeout (ms)')).toBeInTheDocument()
    expect(screen.getByLabelText('Auth Type')).toBeInTheDocument()
    expect(screen.getByLabelText('API Key')).toBeInTheDocument()
  })

  // CP-004
  it('renders response path input', () => {
    render(<CustomProviderBuilder />)
    expect(screen.getByLabelText(/Response Text Path/)).toBeInTheDocument()
  })

  // CP-005
  it('has default response path for OpenAI format', () => {
    render(<CustomProviderBuilder />)
    const input = screen.getByLabelText(/Response Text Path/) as HTMLInputElement
    expect(input.value).toBe('choices[0].message.content')
  })

  // CP-006
  it('disables Test Connection when baseUrl is empty', () => {
    render(<CustomProviderBuilder />)
    const testBtn = screen.getByRole('button', { name: /test connection/i })
    expect(testBtn).toBeDisabled()
  })

  // CP-007
  it('enables Test Connection when baseUrl is provided', () => {
    render(<CustomProviderBuilder />)
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://api.example.com' } })
    const testBtn = screen.getByRole('button', { name: /test connection/i })
    expect(testBtn).not.toBeDisabled()
  })

  // CP-008
  it('disables Save when required fields are empty', () => {
    render(<CustomProviderBuilder />)
    const saveBtn = screen.getByText('Save Provider')
    expect(saveBtn).toBeDisabled()
  })

  // CP-009
  it('enables Save when all required fields are filled', () => {
    render(<CustomProviderBuilder />)
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'My Provider' } })
    fireEvent.change(screen.getByLabelText('Model Name'), { target: { value: 'my-model' } })
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://api.example.com' } })
    const saveBtn = screen.getByText('Save Provider')
    expect(saveBtn).not.toBeDisabled()
  })

  // CP-010
  it('calls saveModel on save click', async () => {
    render(<CustomProviderBuilder />)
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'My Provider' } })
    fireEvent.change(screen.getByLabelText('Model Name'), { target: { value: 'my-model' } })
    fireEvent.change(screen.getByLabelText('Base URL'), { target: { value: 'https://api.example.com' } })
    fireEvent.click(screen.getByText('Save Provider'))
    await waitFor(() => {
      expect(mockSaveModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Provider',
          model: 'my-model',
          baseUrl: 'https://api.example.com',
          requestTimeout: 60000,
          provider: 'custom',
          enabled: true,
        })
      )
    })
  })

  // CP-011
  it('toggles API key visibility', () => {
    render(<CustomProviderBuilder />)
    const keyInput = screen.getByLabelText('API Key') as HTMLInputElement
    expect(keyInput.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: /show api key/i }))
    expect(keyInput.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: /hide api key/i }))
    expect(keyInput.type).toBe('password')
  })

  // CP-012
  it('hides API Key field when auth type is none', () => {
    render(<CustomProviderBuilder />)
    fireEvent.change(screen.getByLabelText('Auth Type'), { target: { value: 'none' } })
    expect(screen.queryByLabelText('API Key')).toBeNull()
  })
})
