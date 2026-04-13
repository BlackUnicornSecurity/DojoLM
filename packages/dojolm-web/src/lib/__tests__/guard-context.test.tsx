/**
 * File: guard-context.test.tsx
 * Purpose: Unit tests for GuardContext provider and hooks
 * Story: TPI-UIP-11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'

const mockFetchWithAuth = vi.fn()
const mockCanAccess = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/client-auth-access', () => ({
  canAccessProtectedApi: () => mockCanAccess(),
}))

vi.mock('@/lib/guard-constants', () => ({
  DEFAULT_GUARD_CONFIG: {
    enabled: false,
    mode: 'shinobi',
    blockThreshold: 'CRITICAL',
    engines: null,
  },
}))

vi.mock('@/lib/guard-types', () => ({}))

import { GuardProvider, useGuard, useGuardMode, useGuardStats } from '@/lib/contexts/GuardContext'

function wrapper({ children }: { children: ReactNode }) {
  return <GuardProvider>{children}</GuardProvider>
}

const mockConfig = {
  enabled: true,
  mode: 'samurai',
  blockThreshold: 'CRITICAL',
  engines: null,
}

const mockStats = {
  totalEvents: 100,
  blockedCount: 15,
  loggedCount: 85,
  lastEventAt: '2026-04-13T10:00:00Z',
}

const mockEvents = [
  { id: 'e1', timestamp: '2026-04-13T10:00:00Z', action: 'block', severity: 'CRITICAL' },
  { id: 'e2', timestamp: '2026-04-13T09:00:00Z', action: 'log', severity: 'WARNING' },
]

function mockFetchResponses() {
  mockCanAccess.mockResolvedValue(true)
  mockFetchWithAuth.mockImplementation((url: string) => {
    if (url === '/api/llm/guard') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockConfig }),
      })
    }
    if (url === '/api/llm/guard/stats') {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockStats }),
      })
    }
    if (url.startsWith('/api/llm/guard/audit')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockEvents }),
      })
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  })
}

describe('GuardContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useGuard hook', () => {
    it('throws when used outside GuardProvider', () => {
      expect(() => {
        renderHook(() => useGuard())
      }).toThrow('useGuard must be used within GuardProvider')
    })
  })

  describe('GuardProvider', () => {
    it('provides default config when API is inaccessible', async () => {
      mockCanAccess.mockResolvedValue(false)

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.config.mode).toBe('shinobi')
      expect(result.current.config.enabled).toBe(false)
    })

    it('loads config, stats, and events on mount', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.config.mode).toBe('samurai')
      expect(result.current.config.enabled).toBe(true)
      expect(result.current.stats).toEqual(mockStats)
      expect(result.current.recentEvents).toEqual(mockEvents)
      expect(result.current.error).toBeNull()
    })

    it('handles partial API failures (Promise.allSettled)', async () => {
      mockCanAccess.mockResolvedValue(true)
      mockFetchWithAuth.mockImplementation((url: string) => {
        if (url === '/api/llm/guard') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: mockConfig }),
          })
        }
        // Stats and events fail
        return Promise.reject(new Error('Network error'))
      })

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Config loaded but stats/events stay at defaults
      expect(result.current.config.mode).toBe('samurai')
      expect(result.current.stats).toBeNull()
      expect(result.current.recentEvents).toEqual([])
    })

    it('sets error on total load failure', async () => {
      mockCanAccess.mockRejectedValue(new Error('Auth check failed'))

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe('Failed to load guard configuration')
    })
  })

  describe('updateConfig', () => {
    it('sends PUT with merged config and updates state', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Mock PUT response
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockConfig, mode: 'sensei' } }),
      })

      await act(async () => {
        await result.current.updateConfig({ mode: 'sensei' as never })
      })

      expect(mockFetchWithAuth).toHaveBeenCalledWith(
        '/api/llm/guard',
        expect.objectContaining({ method: 'PUT' }),
      )
    })

    it('sets error on failed config update', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Validation failed' }),
      })

      await act(async () => {
        await result.current.updateConfig({ mode: 'invalid' as never })
      })

      expect(result.current.error).toBe('Validation failed')
    })
  })

  describe('useGuardMode', () => {
    it('returns current mode and enabled state', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuardMode(), { wrapper })

      await waitFor(() => {
        expect(result.current.mode).toBe('samurai')
      })

      expect(result.current.enabled).toBe(true)
      expect(typeof result.current.setMode).toBe('function')
      expect(typeof result.current.setEnabled).toBe('function')
    })
  })

  describe('useGuardStats', () => {
    it('returns stats and refresh function', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuardStats(), { wrapper })

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats)
      })

      expect(typeof result.current.refreshStats).toBe('function')
    })

    it('refreshStats calls API and updates state', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuardStats(), { wrapper })

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats)
      })

      const newStats = { ...mockStats, totalEvents: 200 }
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: newStats }),
      })

      await act(async () => {
        await result.current.refreshStats()
      })

      expect(result.current.stats).toEqual(newStats)
    })

    it('refreshStats sets null when API inaccessible', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuardStats(), { wrapper })

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats)
      })

      mockCanAccess.mockResolvedValue(false)

      await act(async () => {
        await result.current.refreshStats()
      })

      expect(result.current.stats).toBeNull()
    })
  })

  describe('setMode / setEnabled / setBlockThreshold / setEngines', () => {
    it('setMode calls updateConfig with mode', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockConfig, mode: 'hattori' } }),
      })

      await act(async () => {
        await result.current.setMode('hattori' as never)
      })

      const putCall = mockFetchWithAuth.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'PUT'
      )
      expect(putCall).toBeDefined()
      const body = JSON.parse((putCall![1] as Record<string, string>).body)
      expect(body.mode).toBe('hattori')
    })

    it('setEnabled calls updateConfig with enabled flag', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockConfig, enabled: false } }),
      })

      await act(async () => {
        await result.current.setEnabled(false)
      })

      const putCall = mockFetchWithAuth.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'PUT'
      )
      const body = JSON.parse((putCall![1] as Record<string, string>).body)
      expect(body.enabled).toBe(false)
    })

    it('setBlockThreshold calls updateConfig with blockThreshold', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockConfig, blockThreshold: 'WARNING' } }),
      })

      await act(async () => {
        await result.current.setBlockThreshold('WARNING')
      })

      const putCall = mockFetchWithAuth.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'PUT'
      )
      const body = JSON.parse((putCall![1] as Record<string, string>).body)
      expect(body.blockThreshold).toBe('WARNING')
    })

    it('setEngines calls updateConfig with engines array', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { ...mockConfig, engines: ['regex', 'ml'] } }),
      })

      await act(async () => {
        await result.current.setEngines(['regex', 'ml'])
      })

      const putCall = mockFetchWithAuth.mock.calls.find(
        (call: unknown[]) => (call[1] as Record<string, unknown>)?.method === 'PUT'
      )
      const body = JSON.parse((putCall![1] as Record<string, string>).body)
      expect(body.engines).toEqual(['regex', 'ml'])
    })
  })

  describe('refreshEvents', () => {
    it('refreshes events from API', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.recentEvents).toEqual(mockEvents)
      })

      const newEvents = [{ id: 'e3', timestamp: '2026-04-13T11:00:00Z', action: 'block', severity: 'WARNING' }]
      mockFetchWithAuth.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: newEvents }),
      })

      await act(async () => {
        await result.current.refreshEvents()
      })

      expect(result.current.recentEvents).toEqual(newEvents)
    })

    it('clears events when API is inaccessible', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.recentEvents.length).toBeGreaterThan(0)
      })

      mockCanAccess.mockResolvedValue(false)

      await act(async () => {
        await result.current.refreshEvents()
      })

      expect(result.current.recentEvents).toEqual([])
    })

    it('silently handles network errors during refresh', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockCanAccess.mockResolvedValue(true)
      mockFetchWithAuth.mockRejectedValueOnce(new Error('Network failure'))

      // Should not throw
      await act(async () => {
        await result.current.refreshEvents()
      })

      // Events stay at their previous value (no crash)
      expect(result.current.error).toBeNull()
    })
  })

  describe('updateConfig network error', () => {
    it('sets error when fetchWithAuth rejects', async () => {
      mockFetchResponses()

      const { result } = renderHook(() => useGuard(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      mockFetchWithAuth.mockRejectedValueOnce(new Error('Network down'))

      await act(async () => {
        await result.current.updateConfig({ enabled: true })
      })

      expect(result.current.error).toBe('Network down')
    })
  })

  describe('isLoading initial state', () => {
    it('starts with isLoading true before API resolves', () => {
      mockCanAccess.mockReturnValue(new Promise(() => {})) // never resolves

      const { result } = renderHook(() => useGuard(), { wrapper })

      expect(result.current.isLoading).toBe(true)
    })
  })
})
