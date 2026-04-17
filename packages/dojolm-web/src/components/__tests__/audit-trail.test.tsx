/**
 * File: audit-trail.test.tsx
 * Purpose: Tests for AuditTrail component
 * Test IDs: AT-001 to AT-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

// Mock entries now mirror what the server writes: top-level `event` plus a
// `details` object containing user/endpoint/result — matching AuditLogEntry
// from src/lib/audit-logger.ts.
const MOCK_ENTRIES = [
  { id: 'a1', timestamp: '2026-03-01T10:00:00Z', event: 'SCAN_EXECUTED', level: 'info', details: { user: 'admin', endpoint: '/api/scan', result: 'success', detail: 'Full scan completed' } },
  { id: 'a2', timestamp: '2026-03-01T11:00:00Z', event: 'COMPLIANCE_CHECK', level: 'info', details: { user: 'reviewer', endpoint: 'OWASP', result: 'pass' } },
  { id: 'a3', timestamp: '2026-03-02T09:00:00Z', event: 'AUTH_SUCCESS', level: 'info', details: { user: 'admin', endpoint: 'dashboard', result: 'success' } },
  { id: 'a4', timestamp: '2026-03-02T10:00:00Z', event: 'EXPORT_ACTION', level: 'warn', details: { user: 'admin', endpoint: 'report.pdf', result: 'warning' } },
  { id: 'a5', timestamp: '2026-03-02T11:00:00Z', event: 'CONFIG_CHANGE', level: 'error', details: { user: 'admin', endpoint: 'guard-mode', result: 'error' } },
]

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { AuditTrail } from '../compliance/AuditTrail'

// ===========================================================================
// AT-001: Loading state
// ===========================================================================
describe('AT-001: Loading state', () => {
  it('shows loading spinner while fetching', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {}))
    render(<AuditTrail />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading audit trail...')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-002: Error state
// ===========================================================================
describe('AT-002: Error state', () => {
  it('shows error message and retry button on fetch failure', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Network error/)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-003: Successful data render
// ===========================================================================
describe('AT-003: Successful data render', () => {
  it('renders audit log table with entries', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('reviewer')).toBeInTheDocument()
    expect(screen.getByText(/5 of 5 entries/)).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-004: Table column headers
// ===========================================================================
describe('AT-004: Table column headers', () => {
  it('renders Timestamp, Action, User, Resource, Result column headers', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByText('Timestamp')).toBeInTheDocument()
    })
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Resource')).toBeInTheDocument()
    expect(screen.getByText('Result')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-005: Action type filter
// ===========================================================================
describe('AT-005: Action type filter', () => {
  it('filters entries by action type', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByText(/5 of 5 entries/)).toBeInTheDocument()
    })
    const selectEl = screen.getByLabelText('Action Type')
    fireEvent.change(selectEl, { target: { value: 'SCAN_EXECUTED' } })
    expect(screen.getByText(/1 of 5 entries/)).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-006: Search filter
// ===========================================================================
describe('AT-006: Search filter', () => {
  it('filters entries by search query', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByText(/5 of 5 entries/)).toBeInTheDocument()
    })
    const searchInput = screen.getByPlaceholderText('Search audit entries...')
    fireEvent.change(searchInput, { target: { value: 'reviewer' } })
    expect(screen.getByText(/1 of 5 entries/)).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-007: Refresh button
// ===========================================================================
describe('AT-007: Refresh button', () => {
  it('calls fetch again when refresh is clicked', async () => {
    const user = userEvent.setup()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    })
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1)
    await user.click(screen.getByLabelText('Refresh audit log'))
    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledTimes(2)
    })
  })
})

// ===========================================================================
// AT-008: Empty state when no entries
// ===========================================================================
describe('AT-008: Empty state when no entries', () => {
  it('shows empty state when API returns empty array', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })
    expect(screen.getByText('No Audit Entries')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-009: Empty state on filter no match
// ===========================================================================
describe('AT-009: Empty state on filter no match', () => {
  it('shows No Matches when filter excludes all entries', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByText(/5 of 5 entries/)).toBeInTheDocument()
    })
    const searchInput = screen.getByPlaceholderText('Search audit entries...')
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })
    expect(screen.getByText('No Matches')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-010: Result badge rendering
// ===========================================================================
describe('AT-010: Result badge rendering', () => {
  it('renders result badges with correct text', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getAllByText('success').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('pass')).toBeInTheDocument()
    expect(screen.getByText('warning')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-011: Date filters render
// ===========================================================================
describe('AT-011: Date filters render', () => {
  it('renders From and To date filter inputs', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    })
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
  })
})

// ===========================================================================
// AT-012: Retry on error calls fetch again
// ===========================================================================
describe('AT-012: Retry on error', () => {
  it('clicking Retry calls fetchAuditLog again', async () => {
    mockFetchWithAuth.mockRejectedValueOnce(new Error('Fail'))
    render(<AuditTrail />)
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ENTRIES,
    })
    fireEvent.click(screen.getByText('Retry'))
    await waitFor(() => {
      expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    })
  })
})
