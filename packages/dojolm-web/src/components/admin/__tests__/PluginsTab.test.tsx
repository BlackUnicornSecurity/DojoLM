/**
 * File: PluginsTab.test.tsx
 * Purpose: Component tests for the admin Plugins tab.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PluginsTab } from '../PluginsTab'

const mockFetchWithAuth = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

function response(ok: boolean, status: number, body: unknown) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

const storedPlugin = {
  manifest: {
    id: 'scanner-a',
    name: 'Scanner A',
    version: '1.0.0',
    type: 'scanner',
    description: 'Detects things',
    author: 'QA',
    dependencies: [],
    capabilities: ['scan'],
  },
  enabled: true,
  registeredAt: '2026-04-17T00:00:00.000Z',
  state: 'loaded',
  lastError: null,
}

describe('PluginsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWithAuth.mockResolvedValue(
      response(true, 200, {
        plugins: [storedPlugin],
        counts: { scanner: 1, transform: 0, reporter: 0, orchestrator: 0 },
      }),
    )
  })

  it('defers the fetch until active=true and does not re-fetch on re-renders', async () => {
    const { rerender } = render(<PluginsTab active={false} />)
    // Idle while inactive — no network call.
    expect(mockFetchWithAuth).not.toHaveBeenCalled()

    rerender(<PluginsTab active={true} />)
    await waitFor(() => expect(mockFetchWithAuth).toHaveBeenCalledTimes(1))

    // Flipping active back and forth should not trigger another load — the
    // hasLoaded guard keeps the fetch idempotent per mount.
    rerender(<PluginsTab active={false} />)
    rerender(<PluginsTab active={true} />)
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1)
  })

  it('renders the summary tiles with live counts', async () => {
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByTestId('plugin-count-scanner')).toHaveTextContent('1 registered'))
    expect(screen.getByTestId('plugin-count-transform')).toHaveTextContent('0 registered')
  })

  it('renders a registered plugin row', async () => {
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByTestId('plugin-row-scanner-a')).toBeDefined())
    expect(screen.getByText('Scanner A')).toBeDefined()
    expect(screen.getByText(/Detects things/)).toBeDefined()
  })

  it('shows empty state when no plugins are registered', async () => {
    mockFetchWithAuth.mockResolvedValue(
      response(true, 200, {
        plugins: [],
        counts: { scanner: 0, transform: 0, reporter: 0, orchestrator: 0 },
      }),
    )
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByText(/No plugins registered yet/i)).toBeDefined())
  })

  it('shows inline error when list request fails', async () => {
    mockFetchWithAuth.mockResolvedValue(response(false, 500, {}))
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByText(/Plugin registry error/i)).toBeDefined())
  })

  it('issues a PATCH to toggle the plugin', async () => {
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByTestId('plugin-row-scanner-a')).toBeDefined())

    // After PATCH the tab re-fetches the list; return list shape for both calls.
    mockFetchWithAuth.mockResolvedValueOnce(
      response(true, 200, { ...storedPlugin, enabled: false }),
    )
    mockFetchWithAuth.mockResolvedValueOnce(
      response(true, 200, {
        plugins: [{ ...storedPlugin, enabled: false }],
        counts: { scanner: 1, transform: 0, reporter: 0, orchestrator: 0 },
      }),
    )

    fireEvent.click(screen.getByTestId('plugin-toggle-scanner-a'))

    await waitFor(() => {
      const calls = mockFetchWithAuth.mock.calls.map(c => ({ url: c[0] as string, init: c[1] as RequestInit | undefined }))
      const patchCall = calls.find(c => c.url.endsWith('/api/admin/plugins/scanner-a') && c.init?.method === 'PATCH')
      expect(patchCall).toBeTruthy()
      expect(patchCall!.init!.body).toContain('"enabled":false')
    })
  })

  it('register dialog wires capabilities fieldset with aria-labelledby and no htmlFor', async () => {
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByTestId('plugins-register-trigger')).toBeDefined())

    fireEvent.click(screen.getByTestId('plugins-register-trigger'))
    await waitFor(() => expect(screen.getByTestId('plugin-form-capabilities')).toBeDefined())

    const group = screen.getByTestId('plugin-form-capabilities')
    expect(group.getAttribute('role')).toBe('group')
    expect(group.getAttribute('aria-labelledby')).toBe('plugin-form-capabilities-label')

    // The group's label exists with the matching id but must NOT carry htmlFor
    // (a label pointing at a non-focusable div confuses screen readers).
    const label = document.getElementById('plugin-form-capabilities-label')
    expect(label).not.toBeNull()
    expect(label?.getAttribute('for')).toBeNull()

    // Non-group fields keep htmlFor wired to their input id.
    const idLabel = document.getElementById('plugin-form-id-label')
    expect(idLabel?.getAttribute('for')).toBe('plugin-form-id')
  })

  it('asks for confirmation before deleting a plugin', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<PluginsTab />)
    await waitFor(() => expect(screen.getByTestId('plugin-row-scanner-a')).toBeDefined())

    fireEvent.click(screen.getByTestId('plugin-delete-scanner-a'))
    expect(confirmSpy).toHaveBeenCalledOnce()

    const deleteCall = mockFetchWithAuth.mock.calls.find(c => (c[1] as RequestInit | undefined)?.method === 'DELETE')
    expect(deleteCall).toBeUndefined()

    confirmSpy.mockRestore()
  })
})
