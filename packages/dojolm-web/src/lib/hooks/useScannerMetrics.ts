'use client'

/**
 * File: useScannerMetrics.ts
 * Purpose: Derive display-only metrics from scanner context for MetricCards
 * Story: TPI-UIP-02
 *
 * @description Display-only metrics. NOT for security decisions.
 * Metrics are derived from in-memory session state and reset on refresh.
 * They reflect the current scan result and engine filter state only.
 *
 * FINDING-007 fix: use useState for history to trigger re-render when
 * scan count changes. The prior useRef + useMemo pattern caused totalScans
 * to always lag by 1 because useEffect runs AFTER render.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useScanner } from '@/lib/ScannerContext'

/**
 * Display-only scanner metrics for MetricCards.
 * NOT for security decisions — approximate session estimates only.
 */
export interface ScannerMetrics {
  /** Count of scan events in current session (resets on refresh). */
  totalScans: number
  /** Number of findings in the most recent scan result. */
  threatsDetected: number
  /** Percentage of scans with zero threats, or '-' if no scans yet. */
  passRate: string
  /** Number of currently enabled engines. */
  activeEngines: number
  /** Total number of available engines. */
  totalEngines: number
  /** Sparkline data points (last 10 scan threat counts). Session-only, resets on refresh. */
  threatTrend: number[]
}

/** Max history entries to retain for sparkline. */
const MAX_HISTORY = 10

/**
 * Derive display-only scanner metrics from context state.
 * NOT for security decisions — display purposes only.
 */
export function useScannerMetrics(): ScannerMetrics {
  const { scanResult, engineFilters } = useScanner()

  // FINDING-007 fix: use state instead of ref so changes trigger re-render.
  const [history, setHistory] = useState<{ threats: number }[]>([])
  const lastScanRef = useRef<object | null>(null)

  useEffect(() => {
    if (scanResult && scanResult !== lastScanRef.current) {
      lastScanRef.current = scanResult
      setHistory(prev => [...prev, { threats: scanResult.findings.length }].slice(-MAX_HISTORY))
    }
  }, [scanResult])

  return useMemo(() => {
    const totalScans = history.length
    const threatsDetected = scanResult ? scanResult.findings.length : 0
    const activeEngines = engineFilters.filter(f => f.enabled).length
    const totalEngines = engineFilters.length

    const allowCount = history.filter(s => s.threats === 0).length
    const passRate = totalScans > 0
      ? `${Math.round((allowCount / totalScans) * 100)}%`
      : 'N/A'

    const threatTrend = history.map(s => s.threats)

    return {
      totalScans,
      threatsDetected,
      passRate,
      activeEngines,
      totalEngines,
      threatTrend,
    }
  }, [history, scanResult, engineFilters])
}

/** Reset scan history. Exported for testing only. */
export function _resetScanHistory(): void {
  // No-op: history is now per-instance via useState, not module-level.
  // Kept for API compatibility with existing tests.
}
