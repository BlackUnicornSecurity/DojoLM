// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const mockCanAccessProtectedApi = vi.fn()
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: (...args: unknown[]) => mockCanAccessProtectedApi(...args),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('lucide-react', () => {
  const Icon = () => <span data-testid="icon" />
  return {
    ChevronRight: Icon,
    ChevronLeft: Icon,
    Check: Icon,
    Loader2: Icon,
  }
})

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@/lib/sengoku-types', () => ({
  ALL_SKILLS: [
    {
      id: 'skill-recon',
      name: 'Recon Sweep',
      description: 'Run recon checks',
      category: 'recon',
    },
  ],
  SKILL_CATEGORIES: ['recon'],
}))

import { SengokuCampaignBuilder } from '../sengoku/SengokuCampaignBuilder'

describe('SengokuCampaignBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    })
  })

  it('shows an auth error and skips campaign creation when protected access is unavailable', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)

    render(<SengokuCampaignBuilder />)

    fireEvent.change(screen.getByPlaceholderText('Production API Scan'), {
      target: { value: 'Nightly Campaign' },
    })
    fireEvent.change(screen.getByPlaceholderText('https://api.example.com/v1/chat'), {
      target: { value: 'https://example.com/api' },
    })
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText(/Select All/))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Create Campaign'))

    await waitFor(() => {
      expect(screen.getByText('Authentication required to create a campaign')).toBeInTheDocument()
    })

    expect(mockFetchWithAuth).not.toHaveBeenCalled()
  })
})
