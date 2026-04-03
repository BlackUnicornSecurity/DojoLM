/**
 * File: guard-audit-widget.test.tsx
 * Purpose: Unit tests for GuardAuditWidget dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }],
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

const mockCanAccessProtectedApi = vi.fn()
vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccessProtectedApi(),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import { GuardAuditWidget } from '../dashboard/widgets/GuardAuditWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardAuditWidget', () => {
  it('renders without crashing', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    const { container } = render(<GuardAuditWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Guard Audit Log" title', () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    render(<GuardAuditWidget />)
    expect(screen.getByText('Guard Audit Log')).toBeInTheDocument()
  })

  it('shows "No guard events" when no data', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(false)
    render(<GuardAuditWidget />)
    await waitFor(() => {
      expect(screen.getByText('No guard events')).toBeInTheDocument()
    })
  })

  it('renders audit events when data available', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: '1', direction: 'input', action: 'block', timestamp: '2026-01-01T12:00:00Z', scanResult: { severity: 'CRITICAL' } },
          { id: '2', direction: 'output', action: 'allow', timestamp: '2026-01-01T12:01:00Z', scanResult: null },
        ],
      }),
    })
    render(<GuardAuditWidget />)
    await waitFor(() => {
      expect(screen.getByText('IN')).toBeInTheDocument()
      expect(screen.getByText('BLOCK')).toBeInTheDocument()
      expect(screen.getByText('OUT')).toBeInTheDocument()
      expect(screen.getByText('ALLOW')).toBeInTheDocument()
    })
  })

  it('displays severity when present in scan result', async () => {
    mockCanAccessProtectedApi.mockResolvedValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: '1', direction: 'input', action: 'block', timestamp: '2026-01-01T12:00:00Z', scanResult: { severity: 'CRITICAL' } },
        ],
      }),
    })
    render(<GuardAuditWidget />)
    await waitFor(() => {
      expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    })
  })
})
