/**
 * File: guard-badge.test.tsx
 * Purpose: Unit tests for GuardBadge component
 * Test IDs: GB-001 to GB-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('lucide-react', () => ({
  Eye: (props: Record<string, unknown>) => <span data-testid="icon-eye" {...props}>Eye</span>,
  Shield: (props: Record<string, unknown>) => <span data-testid="icon-shield" {...props}>Shield</span>,
  ShieldAlert: (props: Record<string, unknown>) => <span data-testid="icon-shield-alert" {...props}>ShieldAlert</span>,
  ShieldCheck: (props: Record<string, unknown>) => <span data-testid="icon-shield-check" {...props}>ShieldCheck</span>,
}))

vi.mock('@/lib/guard-constants', () => ({
  GUARD_MODES: [
    { id: 'shinobi', name: 'Shinobi' },
    { id: 'samurai', name: 'Samurai' },
    { id: 'sensei', name: 'Sensei' },
    { id: 'hattori', name: 'Hattori' },
  ],
  GUARD_MODE_ICONS: {
    shinobi: (props: Record<string, unknown>) => <span data-testid="icon-shinobi" {...props}>Shinobi</span>,
    samurai: (props: Record<string, unknown>) => <span data-testid="icon-samurai" {...props}>Samurai</span>,
    sensei: (props: Record<string, unknown>) => <span data-testid="icon-sensei" {...props}>Sensei</span>,
    hattori: (props: Record<string, unknown>) => <span data-testid="icon-hattori" {...props}>Hattori</span>,
  },
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import { GuardBadge } from '../guard/GuardBadge'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockApiResponse(data: Record<string, unknown>) {
  mockFetchWithAuth.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data }),
  })
}

function mockApiFailure() {
  mockFetchWithAuth.mockRejectedValueOnce(new Error('Network error'))
}

function mockApiNotOk() {
  mockFetchWithAuth.mockResolvedValueOnce({ ok: false })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GB-001: renders nothing while loading', () => {
    mockFetchWithAuth.mockReturnValueOnce(new Promise(() => {})) // never resolves
    const { container } = render(<GuardBadge />)
    expect(container.innerHTML).toBe('')
  })

  it('GB-002: renders nothing when API fails', async () => {
    mockApiFailure()
    const { container } = render(<GuardBadge />)
    await waitFor(() => expect(mockFetchWithAuth).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('GB-003: renders nothing when API returns non-ok', async () => {
    mockApiNotOk()
    const { container } = render(<GuardBadge />)
    await waitFor(() => expect(mockFetchWithAuth).toHaveBeenCalled())
    expect(container.innerHTML).toBe('')
  })

  it('GB-004: fetches guard config from /api/llm/guard', async () => {
    mockApiResponse({ enabled: true, mode: 'shinobi' })
    render(<GuardBadge />)
    await waitFor(() => expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/llm/guard'))
  })

  it('GB-005: displays mode name when guard is enabled', async () => {
    mockApiResponse({ enabled: true, mode: 'samurai' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getAllByText('Samurai').length).toBeGreaterThan(0)
    })
  })

  it('GB-006: displays "Off" when guard is disabled', async () => {
    mockApiResponse({ enabled: false, mode: 'shinobi' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getByText('Off')).toBeInTheDocument()
    })
  })

  it('GB-007: has correct aria-label when enabled', async () => {
    mockApiResponse({ enabled: true, mode: 'hattori' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getByLabelText('Guard active: Hattori mode')).toBeInTheDocument()
    })
  })

  it('GB-008: has correct aria-label when disabled', async () => {
    mockApiResponse({ enabled: false, mode: 'shinobi' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getByLabelText('Guard disabled')).toBeInTheDocument()
    })
  })

  it('GB-009: renders the correct mode icon', async () => {
    mockApiResponse({ enabled: true, mode: 'hattori' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getByTestId('icon-hattori')).toBeInTheDocument()
    })
  })

  it('GB-010: applies active styling when enabled', async () => {
    mockApiResponse({ enabled: true, mode: 'shinobi' })
    render(<GuardBadge />)
    await waitFor(() => {
      const badge = screen.getByLabelText('Guard active: Shinobi mode')
      expect(badge.className).toContain('bg-[var(--dojo-subtle)]')
    })
  })

  it('GB-011: applies muted styling when disabled', async () => {
    mockApiResponse({ enabled: false, mode: 'shinobi' })
    render(<GuardBadge />)
    await waitFor(() => {
      const badge = screen.getByLabelText('Guard disabled')
      expect(badge.className).toContain('bg-muted')
    })
  })

  it('GB-012: falls back to raw mode string for unknown mode', async () => {
    mockApiResponse({ enabled: true, mode: 'custom-unknown' })
    render(<GuardBadge />)
    await waitFor(() => {
      expect(screen.getByText('custom-unknown')).toBeInTheDocument()
    })
  })
})
