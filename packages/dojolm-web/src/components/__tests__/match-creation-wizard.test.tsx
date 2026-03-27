import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockFetchWithAuth = vi.fn()
const mockCanAccessProtectedApi = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: (...args: unknown[]) => mockCanAccessProtectedApi(...args),
}))

import { MatchCreationWizard } from '../strategic/arena/MatchCreationWizard'

describe('MatchCreationWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ([
        {
          id: 'gpt-4',
          name: 'GPT-4',
          provider: 'openai',
          enabled: true,
        },
        {
          id: 'claude-3',
          name: 'Claude 3',
          provider: 'anthropic',
          enabled: true,
        },
      ]),
    })
  })

  it('wraps the fighter step with model context so arena duel setup can load models', async () => {
    render(
      <MatchCreationWizard
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: /capture the flag/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(screen.getByLabelText('Select Attacker model')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getAllByRole('option', { name: /GPT-4 \(openai\)/i })).toHaveLength(2)
      expect(screen.getAllByRole('option', { name: /Claude 3 \(anthropic\)/i })).toHaveLength(2)
    })

    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      '/api/llm/models',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    )
  })
})
