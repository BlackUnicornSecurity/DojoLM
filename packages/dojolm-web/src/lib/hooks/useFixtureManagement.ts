/**
 * File: useFixtureManagement.ts
 * Purpose: Custom hook extracting fixture state and logic from page.tsx PageContent.
 *          Used by Buki (PayloadLab) and any module needing fixture management.
 * Story: Testing UX Consolidation — Phase 2
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { ScanResult, TextFixtureResponse, BinaryFixtureResponse, FixtureManifest } from '@/lib/types'
import type { ComparisonItem } from '@/components/fixtures/FixtureComparison'
import { scanFixture, readFixture } from '@/lib/api'
import { getCachedFixtureManifest } from '@/lib/client-data-cache'

export interface SelectedFixture {
  readonly path: string
  readonly content: TextFixtureResponse | BinaryFixtureResponse
  readonly scanResult: ScanResult | null
}

export interface UseFixtureManagementReturn {
  readonly fixtureManifest: FixtureManifest | null
  readonly isLoadingFixtures: boolean
  readonly fixtureError: string | null
  readonly selectedFixture: SelectedFixture | null
  readonly comparisonItems: [ComparisonItem, ComparisonItem] | null
  readonly loadFixtures: (options?: { force?: boolean }) => Promise<void>
  readonly handleScanFixture: (category: string, file: string) => Promise<void>
  readonly handleViewFixture: (category: string, file: string) => Promise<void>
  readonly handleCompare: (selections: [{ category: string; file: string }, { category: string; file: string }]) => Promise<void>
  readonly clearSelectedFixture: () => void
  readonly clearComparison: () => void
}

export function useFixtureManagement(): UseFixtureManagementReturn {
  const [fixtureManifest, setFixtureManifest] = useState<FixtureManifest | null>(null)
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [fixtureError, setFixtureError] = useState<string | null>(null)
  const [selectedFixture, setSelectedFixture] = useState<SelectedFixture | null>(null)
  const [comparisonItems, setComparisonItems] = useState<[ComparisonItem, ComparisonItem] | null>(null)
  const fixtureLoadAttemptedRef = useRef(false)

  const loadFixtures = useCallback(async (options?: { force?: boolean }) => {
    if (isLoadingFixtures) return
    if (!options?.force && (fixtureManifest || fixtureLoadAttemptedRef.current)) {
      return
    }

    fixtureLoadAttemptedRef.current = true
    setIsLoadingFixtures(true)
    setFixtureError(null)
    try {
      const manifest = await getCachedFixtureManifest()
      setFixtureManifest(manifest)
    } catch {
      setFixtureError('Could not load fixtures. Check connection and try again.')
    } finally {
      setIsLoadingFixtures(false)
    }
  }, [fixtureManifest, isLoadingFixtures])

  const handleScanFixture = useCallback(async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const result = await scanFixture(path)
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: result })
    } catch {
      setFixtureError('Unable to scan fixture. Check connection and try again.')
    }
  }, [])

  const handleViewFixture = useCallback(async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: null })
    } catch {
      setFixtureError('Unable to load fixture. Check connection and try again.')
    }
  }, [])

  const handleCompare = useCallback(async (
    selections: [{ category: string; file: string }, { category: string; file: string }]
  ) => {
    const loadItem = async (sel: { category: string; file: string }): Promise<ComparisonItem> => {
      const path = `${sel.category}/${sel.file}`
      try {
        const [content, scanResult] = await Promise.all([
          readFixture(path),
          scanFixture(path).catch(() => null),
        ])
        return { path, content, scanResult }
      } catch {
        return { path, content: null, scanResult: null }
      }
    }

    const [left, right] = await Promise.all([
      loadItem(selections[0]),
      loadItem(selections[1]),
    ])
    if (left.content === null && right.content === null) {
      setFixtureError('Unable to load fixtures for comparison. Check connection and try again.')
      return
    }
    setComparisonItems([left, right])
  }, [])

  const clearSelectedFixture = useCallback(() => setSelectedFixture(null), [])
  const clearComparison = useCallback(() => setComparisonItems(null), [])

  return {
    fixtureManifest,
    isLoadingFixtures,
    fixtureError,
    selectedFixture,
    comparisonItems,
    loadFixtures,
    handleScanFixture,
    handleViewFixture,
    handleCompare,
    clearSelectedFixture,
    clearComparison,
  }
}
