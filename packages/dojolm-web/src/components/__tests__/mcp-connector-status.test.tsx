/**
 * File: mcp-connector-status.test.tsx
 * Purpose: Unit tests for McpConnectorStatus component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
}))

const mockFetchWithAuth = vi.fn()
const mockCanAccess = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccess(),
}))

import { McpConnectorStatus } from '@/components/adversarial/McpConnectorStatus'

describe('McpConnectorStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockCanAccess.mockReturnValue(true)
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ connected: true, latency: 42, message: 'Connected' }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders MCP label', () => {
      render(<McpConnectorStatus />)
      expect(screen.getByText('MCP')).toBeInTheDocument()
    })

    it('displays model name when provided', () => {
      render(<McpConnectorStatus modelName="DojoLM MCP" />)
      expect(screen.getByText('DojoLM MCP')).toBeInTheDocument()
    })

    it('applies className prop', () => {
      const { container } = render(<McpConnectorStatus className="custom" />)
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Connection Status', () => {
    it('shows connected indicator when API reports connected', async () => {
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument()
      })
    })

    it('shows disconnected indicator when API reports disconnected', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByText('Not connected')).toBeInTheDocument()
      })
    })

    it('shows latency when connected', async () => {
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByText(/42\s*ms/)).toBeInTheDocument()
      })
    })

    it('falls back to connected prop when API is inaccessible', async () => {
      mockCanAccess.mockReturnValue(false)
      render(<McpConnectorStatus connected={true} />)
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    it('falls back to disconnected when API fails', async () => {
      mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByText('Not connected')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh', () => {
    it('renders a refresh button', () => {
      render(<McpConnectorStatus />)
      const refreshButton = screen.getByRole('button', { name: /refresh|check/i })
      expect(refreshButton).toBeInTheDocument()
    })

    it('calls health check when refresh button is clicked', async () => {
      render(<McpConnectorStatus />)
      const refreshButton = screen.getByRole('button', { name: /refresh|check/i })

      await act(async () => {
        fireEvent.click(refreshButton)
      })

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        expect.stringContaining('/api/mcp/status'),
        expect.anything(),
      )
    })
  })

  describe('Server Controls', () => {
    it('shows Start Server button when disconnected', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
      })
    })

    it('shows Stop and Restart buttons when connected', async () => {
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /restart/i })).toBeInTheDocument()
      })
    })

    it('shows consent dialog before starting server', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /start/i }))
      expect(screen.getByText(/confirm/i)).toBeInTheDocument()
    })

    it('sends enable request when consent is confirmed', async () => {
      mockFetchWithAuth
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ connected: false }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ connected: true }),
        })

      render(<McpConnectorStatus />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /start/i }))

      const confirmBtn = screen.getByRole('button', { name: /confirm/i })
      await act(async () => {
        fireEvent.click(confirmBtn)
      })

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/mcp/status',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    it('closes consent dialog when cancelled', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /start/i }))
      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelBtn)

      // Should not have sent a POST
      const postCalls = mockFetchWithAuth.mock.calls.filter(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'POST'
      )
      expect(postCalls.length).toBe(0)
    })
  })

  describe('Troubleshooting', () => {
    it('shows troubleshooting toggle when disconnected', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /troubleshoot/i })).toBeInTheDocument()
      })
    })

    it('hides troubleshooting toggle when connected', async () => {
      render(<McpConnectorStatus />)
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument()
      })
      expect(screen.queryByRole('button', { name: /troubleshoot/i })).not.toBeInTheDocument()
    })

    it('expands troubleshooting panel on click', async () => {
      mockFetchWithAuth.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ connected: false }),
      })
      render(<McpConnectorStatus />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /troubleshoot/i })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /troubleshoot/i }))
      // Should show troubleshooting steps (ordered list)
      const steps = screen.getAllByRole('listitem')
      expect(steps.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Cleanup', () => {
    it('does not update state after unmount', async () => {
      const { unmount } = render(<McpConnectorStatus />)
      unmount()
      // Advancing timers should not throw
      await act(async () => {
        vi.advanceTimersByTime(11_000)
      })
    })
  })
})
