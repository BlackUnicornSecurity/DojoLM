'use client'

import type { FixtureManifest } from './types'
import { fetchWithAuth } from './fetch-with-auth'

export interface ScannerPatternGroup {
  name: string
  count: number
  source: string
}

export interface ScannerStatsResponse {
  patternCount?: number
  patternGroups?: ScannerPatternGroup[]
  groupCount?: number
  sourceCount?: number
}

interface CacheEntry<T> {
  expiresAt: number
  promise?: Promise<T>
  value?: T
}

const FIXTURE_MANIFEST_TTL_MS = 5 * 60 * 1000
const SCANNER_STATS_TTL_MS = 30 * 1000

const clientDataCache = new Map<string, CacheEntry<unknown>>()

async function fetchJsonOrThrow<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return await response.json() as T
}

function getCacheEntry<T>(key: string): CacheEntry<T> | undefined {
  return clientDataCache.get(key) as CacheEntry<T> | undefined
}

async function getCachedData<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const now = Date.now()
  const existing = getCacheEntry<T>(key)

  if (existing) {
    if (existing.value !== undefined && existing.expiresAt > now) {
      return existing.value
    }
    if (existing.promise) {
      return existing.promise
    }
  }

  const promise = loader()
    .then((value) => {
      clientDataCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    })
    .catch((error) => {
      const latest = getCacheEntry<T>(key)
      if (latest?.promise === promise) {
        clientDataCache.delete(key)
      }
      throw error
    })

  clientDataCache.set(key, {
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}

export function getCachedFixtureManifest(): Promise<FixtureManifest> {
  return getCachedData(
    'fixture-manifest',
    FIXTURE_MANIFEST_TTL_MS,
    () => fetchJsonOrThrow<FixtureManifest>('/api/fixtures'),
  )
}

export function getCachedScannerStats(): Promise<ScannerStatsResponse> {
  return getCachedData(
    'scanner-stats',
    SCANNER_STATS_TTL_MS,
    () => fetchJsonOrThrow<ScannerStatsResponse>('/api/stats'),
  )
}

export function clearClientDataCache(): void {
  clientDataCache.clear()
}
