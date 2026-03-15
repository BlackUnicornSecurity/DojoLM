/**
 * File: ScannerContext.tsx
 * Purpose: Global state management for scanner functionality
 * Phase 6: Performance optimizations with useMemo
 * Index:
 * - Types (line 13)
 * - ScannerContext (line 24)
 * - ScannerProvider (line 34)
 * - useScanner hook (line 113)
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react'
import type { ScanResult, Finding, EngineFilter } from './types'
import { scanText as apiScanText } from './api'
import { ENGINE_FILTERS } from './constants'

/**
 * Scanner context type definition
 */
interface ScannerContextType {
  // State
  findings: Finding[]
  verdict: 'BLOCK' | 'ALLOW' | null
  isScanning: boolean
  error: string | null
  engineFilters: EngineFilter[]
  lastScanTime: number
  scanResult: ScanResult | null  // Full scan result with textLength, etc.

  // Pending payload from cross-module load (H1.4)
  pendingPayload: string | null

  // Methods
  scanText: (text: string) => Promise<void>
  clear: () => void
  toggleFilter: (filterId: string) => void
  resetFilters: () => void
  loadPayload: (text: string) => void
  consumePendingPayload: () => string | null
}

/**
 * Scanner context
 */
const ScannerContext = createContext<ScannerContextType | null>(null)

/**
 * Scanner provider props
 */
interface ScannerProviderProps {
  children: ReactNode
}

/**
 * Scanner provider component
 */
export function ScannerProvider({ children }: ScannerProviderProps) {
  const [findings, setFindings] = useState<Finding[]>([])
  const [verdict, setVerdict] = useState<'BLOCK' | 'ALLOW' | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [engineFilters, setEngineFilters] = useState<EngineFilter[]>(ENGINE_FILTERS)
  const [lastScanTime, setLastScanTime] = useState(0)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [pendingPayload, setPendingPayload] = useState<string | null>(null)
  const pendingPayloadRef = useRef<string | null>(null)

  /**
   * Scan text for prompt injection
   */
  const scanText = useCallback(async (text: string) => {
    if (!text.trim()) {
      return
    }

    setIsScanning(true)
    setError(null)
    const startTime = Date.now()

    try {
      // Get actual scanner engine names from enabled filters
      const allEnabled = engineFilters.every(f => f.enabled)
      const enabledEngines = allEnabled
        ? [] // All enabled = no filter, let scanner run everything
        : engineFilters.filter(f => f.enabled).flatMap(f => f.engineIds)

      // Call API with enabled engines (empty = all engines)
      const result: ScanResult = await apiScanText(text, {
        engines: enabledEngines,
      })

      setScanResult(result)
      setFindings(result.findings)
      setVerdict(result.verdict)
      setLastScanTime(Date.now() - startTime)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed'
      setError(message)
      setFindings([])
      setVerdict(null)
    } finally {
      setIsScanning(false)
    }
  }, [engineFilters])

  /**
   * Clear scan results
   */
  const clear = useCallback(() => {
    setScanResult(null)
    setFindings([])
    setVerdict(null)
    setError(null)
    setLastScanTime(0)
  }, [])

  /**
   * Toggle engine filter
   */
  const toggleFilter = useCallback((filterId: string) => {
    setEngineFilters(prev =>
      prev.map(filter =>
        filter.id === filterId
          ? { ...filter, enabled: !filter.enabled }
          : filter
      )
    )
  }, [])

  /**
   * Reset all filters to default state
   */
  const resetFilters = useCallback(() => {
    setEngineFilters(ENGINE_FILTERS)
  }, [])

  /** Load a payload text for the scanner input to pick up */
  const loadPayload = useCallback((text: string) => {
    pendingPayloadRef.current = text
    setPendingPayload(text)
  }, [])

  /** Consume and clear pending payload (called by ScannerInput on mount/update) */
  const consumePendingPayload = useCallback(() => {
    const text = pendingPayloadRef.current
    if (text) {
      pendingPayloadRef.current = null
      setPendingPayload(null)
    }
    return text
  }, [])

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<ScannerContextType>(() => ({
    findings,
    verdict,
    isScanning,
    error,
    engineFilters,
    lastScanTime,
    scanResult,
    pendingPayload,
    scanText,
    clear,
    toggleFilter,
    resetFilters,
    loadPayload,
    consumePendingPayload,
  }), [
    findings,
    verdict,
    isScanning,
    error,
    engineFilters,
    lastScanTime,
    scanResult,
    pendingPayload,
    scanText,
    clear,
    toggleFilter,
    resetFilters,
    loadPayload,
    consumePendingPayload,
  ])

  return (
    <ScannerContext.Provider value={value}>
      {children}
    </ScannerContext.Provider>
  )
}

/**
 * Hook to use scanner context
 */
export function useScanner() {
  const context = useContext(ScannerContext)
  if (!context) {
    throw new Error('useScanner must be used within a ScannerProvider')
  }
  return context
}
