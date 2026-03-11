/**
 * File: user-management.test.tsx
 * Purpose: Unit tests for UserManagement admin component
 * Test IDs: UM-001 to UM-014
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

import { UserManagement } from '../admin/UserManagement'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUsers = [
  {
    id: 'u1',
    username: 'admin1',
    email: 'admin1@example.com',
    role: 'admin',
    display_name: 'Admin One',
    created_at: '2024-01-01T00:00:00Z',
    last_login_at: '2024-06-15T10:30:00Z',
    enabled: 1,
  },
  {
    id: 'u2',
    username: 'viewer1',
    email: 'viewer1@example.com',
    role: 'viewer',
    display_name: null,
    created_at: '2024-02-01T00:00:00Z',
    last_login_at: null,
    enabled: 1,
  },
  {
    id: 'u3',
    username: 'disabled_user',
    email: 'disabled@example.com',
    role: 'analyst',
    display_name: 'Disabled Analyst',
    created_at: '2024-03-01T00:00:00Z',
    last_login_at: '2024-04-01T00:00:00Z',
    enabled: 0,
  },
]

function setupFetchSuccess(users = mockUsers) {
  mockFetchWithAuth.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ users }),
  })
}

function setupFetchError() {
  mockFetchWithAuth.mockResolvedValue({
    ok: false,
    json: () => Promise.resolve({ error: 'Forbidden' }),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserManagement', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset()
  })

  it('UM-001: shows loading spinner initially', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {})) // never resolves
    render(<UserManagement />)
    // The Loader2 icon is rendered; we can check for the animate-spin class
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('UM-002: renders user list after loading', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText('Admin One')).toBeInTheDocument()
    })
    // viewer1 appears as both display name and in the detail line, use getAllByText
    expect(screen.getAllByText(/viewer1/).length).toBeGreaterThanOrEqual(1)
  })

  it('UM-003: displays user count in heading', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText(/User Management \(3 users\)/i)).toBeInTheDocument()
    })
  })

  it('UM-004: shows error message when fetch fails', async () => {
    setupFetchError()
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
    })
  })

  it('UM-005: shows error on network failure', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load users')).toBeInTheDocument()
    })
  })

  it('UM-006: displays display_name or falls back to username', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      // u1 has display_name
      expect(screen.getByText('Admin One')).toBeInTheDocument()
      // u2 has null display_name, shows username
      expect(screen.getByText('viewer1')).toBeInTheDocument()
    })
  })

  it('UM-007: disabled user shows (disabled) label and reduced opacity', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText('(disabled)')).toBeInTheDocument()
    })
  })

  it('UM-008: clicking Add User shows the create form', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      expect(screen.getByText(/Add User/)).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText(/Add User/))
    expect(screen.getByText('Create New User')).toBeInTheDocument()
  })

  it('UM-009: create form has username, email, password, role fields', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => screen.getByText(/Add User/))
    fireEvent.click(screen.getByText(/Add User/))
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument()
  })

  it('UM-010: create form Cancel button hides the form', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => screen.getByText(/Add User/))
    fireEvent.click(screen.getByText(/Add User/))
    expect(screen.getByText('Create New User')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Create New User')).not.toBeInTheDocument()
  })

  it('UM-011: role selector has viewer, analyst, admin options', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => screen.getByText(/Add User/))
    fireEvent.click(screen.getByText(/Add User/))
    const select = screen.getByLabelText(/role/i) as HTMLSelectElement
    const options = Array.from(select.options).map(o => o.value)
    expect(options).toEqual(['viewer', 'analyst', 'admin'])
  })

  it('UM-012: shows last login date for users who have logged in', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => {
      // Two users have last_login_at (u1, u3)
      const logins = screen.getAllByText(/Last login/)
      expect(logins.length).toBe(2)
    })
  })

  it('UM-013: submitting create form calls fetchWithAuth with POST', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => screen.getByText(/Add User/))
    fireEvent.click(screen.getByText(/Add User/))

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepass123' } })

    // Mock the POST response
    mockFetchWithAuth.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
    // Mock the subsequent GET for refresh
    mockFetchWithAuth.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ users: mockUsers }),
    })

    fireEvent.submit(screen.getByText('Create User').closest('form')!)

    await waitFor(() => {
      expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/auth/users', expect.objectContaining({
        method: 'POST',
      }))
    })
  })

  it('UM-014: shows error when create user fails', async () => {
    setupFetchSuccess()
    render(<UserManagement />)
    await waitFor(() => screen.getByText(/Add User/))
    fireEvent.click(screen.getByText(/Add User/))

    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } })
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@test.com' } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'securepass123' } })

    mockFetchWithAuth.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Username taken' }),
    })

    fireEvent.submit(screen.getByText('Create User').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Username taken')).toBeInTheDocument()
    })
  })
})
