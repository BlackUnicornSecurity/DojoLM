import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetchWithAuth = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

import {
  clearClientDataCache,
  getCachedFixtureManifest,
  getCachedScannerStats,
} from '../client-data-cache'

describe('client-data-cache', () => {
  beforeEach(() => {
    clearClientDataCache()
    mockFetchWithAuth.mockReset()
  })

  it('deduplicates concurrent fixture manifest requests', async () => {
    const manifest = {
      version: '1.0.0',
      description: 'Test fixtures',
      categories: {},
    }

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => manifest,
    } as Response)

    const [first, second] = await Promise.all([
      getCachedFixtureManifest(),
      getCachedFixtureManifest(),
    ])

    expect(first).toEqual(manifest)
    expect(second).toEqual(manifest)
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1)
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/fixtures')
  })

  it('reuses cached fixture data for later calls inside the ttl window', async () => {
    const manifest = {
      version: '1.0.0',
      description: 'Test fixtures',
      categories: {},
    }

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => manifest,
    } as Response)

    await getCachedFixtureManifest()
    await getCachedFixtureManifest()

    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1)
  })

  it('clears failed fixture requests so the next call can retry', async () => {
    const manifest = {
      version: '1.0.0',
      description: 'Recovered fixtures',
      categories: {},
    }

    mockFetchWithAuth
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => manifest,
      } as Response)

    await expect(getCachedFixtureManifest()).rejects.toThrow('Failed to fetch /api/fixtures: 500')
    await expect(getCachedFixtureManifest()).resolves.toEqual(manifest)

    expect(mockFetchWithAuth).toHaveBeenCalledTimes(2)
  })

  it('deduplicates scanner stats requests', async () => {
    const stats = {
      patternCount: 1234,
      groupCount: 12,
    }

    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => stats,
    } as Response)

    const [first, second] = await Promise.all([
      getCachedScannerStats(),
      getCachedScannerStats(),
    ])

    expect(first).toEqual(stats)
    expect(second).toEqual(stats)
    expect(mockFetchWithAuth).toHaveBeenCalledTimes(1)
    expect(mockFetchWithAuth).toHaveBeenCalledWith('/api/stats')
  })
})
