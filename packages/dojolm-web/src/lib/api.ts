/**
 * File: api.ts
 * Purpose: API client functions for scanner backend
 * Index:
 * - fetchAPI() (line 28)
 * - scanText() (line 56)
 * - getFixtures() (line 69)
 * - readFixture() (line 76)
 * - scanFixture() (line 87)
 * - getStats() (line 96)
 * - runTests() (line 106)
 */

import type {
  ScanResult,
  FixtureManifest,
  TextFixtureResponse,
  BinaryFixtureResponse,
  TestSuiteResult,
  ScanOptions
} from './types'
import { fetchWithAuth } from './fetch-with-auth'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

/**
 * Generic fetch wrapper with error handling and auth (Story 13.9)
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const url = `${API_BASE_URL}/api${endpoint}`
    const response = await fetchWithAuth(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error)
    throw error
  }
}

/**
 * Scan text for prompt injection
 */
export async function scanText(
  text: string,
  options?: ScanOptions
): Promise<ScanResult> {
  return fetchAPI<ScanResult>('/scan', {
    method: 'POST',
    body: JSON.stringify({ text, ...options }),
  })
}

/**
 * Get fixture manifest
 */
export async function getFixtures(): Promise<FixtureManifest> {
  return fetchAPI<FixtureManifest>('/fixtures')
}

/**
 * Read a specific fixture file
 */
export async function readFixture(
  path: string
): Promise<TextFixtureResponse | BinaryFixtureResponse> {
  return fetchAPI<TextFixtureResponse | BinaryFixtureResponse>(
    `/read-fixture?path=${encodeURIComponent(path)}`
  )
}

/**
 * Scan a specific fixture file (BUG-005: handle nested response structure)
 */
export async function scanFixture(path: string): Promise<ScanResult & { path: string }> {
  const response = await fetchAPI<{ path: string; skipped: boolean; result: ScanResult | null }>(
    `/scan-fixture?path=${encodeURIComponent(path)}`
  )

  // Unwrap nested response — API returns { path, skipped, result }
  if (response.skipped || !response.result) {
    return {
      path: response.path,
      findings: [],
      verdict: 'ALLOW' as const,
      elapsed: 0,
      textLength: 0,
      normalizedLength: 0,
      counts: { critical: 0, warning: 0, info: 0 },
    }
  }

  return { ...response.result, path: response.path }
}

/**
 * Get scanner statistics
 */
export async function getStats(): Promise<{
  patternCount: number
  patternGroups: string[]
}> {
  return fetchAPI<{ patternCount: number; patternGroups: string[] }>('/stats')
}

/**
 * Run test suite
 */
export async function runTests(
  filter?: string,
  verbose?: boolean
): Promise<TestSuiteResult> {
  return fetchAPI<TestSuiteResult>('/tests', {
    method: 'POST',
    body: JSON.stringify({ filter }),
  })
}
