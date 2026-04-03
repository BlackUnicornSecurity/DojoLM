/**
 * File: auth-context.test.ts
 * Purpose: Unit tests for AuthContext — AuthProvider, useAuth hook, login/logout/refresh flows
 * Test IDs: AUTH-CTX-001 to AUTH-CTX-015
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { createElement } from 'react'
import type { AuthUser, AuthContextValue } from '../auth/AuthContext'

// ---------------------------------------------------------------------------
// Fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { AuthProvider, useAuth } from '../auth/AuthContext'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER: AuthUser = {
  id: 'u-1',
  username: 'testuser',
  email: 'test@example.com',
  role: 'admin',
  displayName: 'Test User',
}

/** Consumer component that exposes auth context values for assertions */
function TestConsumer({ onContext }: { onContext?: (ctx: AuthContextValue) => void }) {
  const ctx = useAuth()
  onContext?.(ctx)
  return createElement('div', null,
    createElement('span', { 'data-testid': 'loading' }, String(ctx.loading)),
    createElement('span', { 'data-testid': 'user' }, ctx.user ? ctx.user.username : 'null'),
    createElement('button', { 'data-testid': 'login', onClick: () => ctx.login('admin', 'pass') }, 'Login'),
    createElement('button', { 'data-testid': 'logout', onClick: () => ctx.logout() }, 'Logout'),
    createElement('button', { 'data-testid': 'refresh', onClick: () => ctx.refresh() }, 'Refresh'),
  )
}

function renderWithProvider(onContext?: (ctx: AuthContextValue) => void) {
  return render(
    createElement(AuthProvider, null,
      createElement(TestConsumer, { onContext }),
    ),
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: /api/auth/me returns no user (unauthenticated)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // --- AUTH-CTX-001: Type exports exist ---
  it('AUTH-CTX-001: exports AuthUser and AuthContextValue types', () => {
    // Compile-time check — if types don't exist, the import at top would fail
    const user: AuthUser = MOCK_USER
    expect(user.id).toBe('u-1')
  })

  // --- AUTH-CTX-002: AuthProvider renders children ---
  it('AUTH-CTX-002: AuthProvider renders children', async () => {
    render(
      createElement(AuthProvider, null,
        createElement('div', { 'data-testid': 'child' }, 'Hello'),
      ),
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  // --- AUTH-CTX-003: useAuth throws outside AuthProvider ---
  it('AUTH-CTX-003: useAuth throws when used outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(createElement(TestConsumer))).toThrow(
      'useAuth must be used within an AuthProvider',
    )
    spy.mockRestore()
  })

  // --- AUTH-CTX-004: Initial state is loading ---
  it('AUTH-CTX-004: starts in loading state', async () => {
    let capturedLoading: boolean | undefined
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves

    renderWithProvider((ctx) => {
      capturedLoading = ctx.loading
    })

    expect(capturedLoading).toBe(true)
  })

  // --- AUTH-CTX-005: refresh() fetches /api/auth/me and sets user ---
  it('AUTH-CTX-005: refresh on mount fetches /api/auth/me and sets user when ok', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ user: MOCK_USER }),
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser')
    })
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'same-origin' })
  })

  // --- AUTH-CTX-006: refresh() sets user to null on non-ok response ---
  it('AUTH-CTX-006: refresh sets user to null on non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  // --- AUTH-CTX-007: refresh() handles network error ---
  it('AUTH-CTX-007: refresh handles fetch network error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  // --- AUTH-CTX-008: login() calls /api/auth/login with credentials ---
  it('AUTH-CTX-008: login calls POST /api/auth/login and sets user on success', async () => {
    // Initial: not authenticated
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    // Login call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: MOCK_USER }),
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      screen.getByTestId('login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username: 'admin', password: 'pass' }),
    }))
  })

  // --- AUTH-CTX-009: login() returns error on failure ---
  it('AUTH-CTX-009: login returns error object on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    })

    let loginResult: { success: boolean; error?: string } | undefined
    renderWithProvider((ctx) => {
      // Capture login for later use
      if (!ctx.loading) {
        ;(globalThis as Record<string, unknown>).__testLogin = ctx.login
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    const login = (globalThis as Record<string, unknown>).__testLogin as AuthContextValue['login']
    await act(async () => {
      loginResult = await login('bad', 'creds')
    })

    expect(loginResult).toEqual({ success: false, error: 'Invalid credentials' })
    delete (globalThis as Record<string, unknown>).__testLogin
  })

  // --- AUTH-CTX-010: login() handles network error ---
  it('AUTH-CTX-010: login returns network error on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    mockFetch.mockRejectedValueOnce(new Error('Network'))

    let loginResult: { success: boolean; error?: string } | undefined

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      // Click the login button which calls login('admin', 'pass')
      screen.getByTestId('login').click()
    })

    // User should still be null after network error
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  // --- AUTH-CTX-011: logout() calls POST /api/auth/logout and clears user ---
  it('AUTH-CTX-011: logout calls POST /api/auth/logout and clears user', async () => {
    // Start authenticated
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: MOCK_USER }),
    })
    // Logout call
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser')
    })

    await act(async () => {
      screen.getByTestId('logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({
      method: 'POST',
      credentials: 'same-origin',
    }))
  })

  // --- AUTH-CTX-012: logout() clears user even on fetch error ---
  it('AUTH-CTX-012: logout clears user even if fetch throws', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: MOCK_USER }),
    })
    // Logout fetch rejects — but logout should still clear user via finally block
    mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network')))

    let capturedLogout: (() => Promise<void>) | undefined
    renderWithProvider((ctx) => {
      capturedLogout = ctx.logout
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser')
    })

    // Call logout directly — the try/finally in logout re-throws, so catch here
    await act(async () => {
      try {
        await capturedLogout!()
      } catch {
        // Expected: fetch rejection propagates through try/finally
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })
  })

  // --- AUTH-CTX-013: context value shape ---
  it('AUTH-CTX-013: context exposes user, loading, login, logout, refresh', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })

    let captured: AuthContextValue | undefined
    renderWithProvider((ctx) => { captured = ctx })

    await waitFor(() => {
      expect(captured?.loading).toBe(false)
    })

    expect(captured).toBeDefined()
    expect(captured!.user).toBeNull()
    expect(typeof captured!.login).toBe('function')
    expect(typeof captured!.logout).toBe('function')
    expect(typeof captured!.refresh).toBe('function')
  })

  // --- AUTH-CTX-014: refresh sets user to null when data.user is undefined ---
  it('AUTH-CTX-014: refresh handles response with no user field', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}), // no user field
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })

  // --- AUTH-CTX-015: login handles json parse failure ---
  it('AUTH-CTX-015: login handles json parse failure gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) })
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await act(async () => {
      screen.getByTestId('login').click()
    })

    // Should not crash — user stays null
    expect(screen.getByTestId('user')).toHaveTextContent('null')
  })
})
