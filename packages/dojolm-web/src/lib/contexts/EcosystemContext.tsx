/**
 * File: EcosystemContext.tsx
 * Purpose: Shared context for cross-module ecosystem findings and events (ARCH-2 simplified)
 * Story: TPI-NODA-8.2
 * Index:
 * - EcosystemState interface (line 21)
 * - EcosystemContextValue interface (line 30)
 * - EcosystemProvider component (line 56)
 * - useEcosystem hook (line 142)
 * - useEcosystemEmit hook (line 152)
 * - useEcosystemFindings hook (line 168)
 */

'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react'
import { safeUUID } from '@/lib/utils'
import { fetchWithAuth } from '../fetch-with-auth'
import type {
  EcosystemFinding,
  EcosystemEvent,
  EcosystemEventType,
  EcosystemSourceModule,
  EcosystemStats,
} from '../ecosystem-types'
import {
  VALID_EVENT_TYPES,
  VALID_SOURCE_MODULES,
  ECOSYSTEM_MAX_EVENTS,
  ECOSYSTEM_RATE_LIMIT_PER_MODULE,
} from '../ecosystem-types'

/** Read-only ecosystem state */
export interface EcosystemState {
  /** Recent findings (loaded from API) */
  findings: EcosystemFinding[]
  /** Recent cross-module events (in-memory) */
  events: EcosystemEvent[]
  /** Ecosystem statistics */
  stats: EcosystemStats | null
  /** Loading state */
  loading: boolean
  /** Error state */
  error: string | null
}

/** Context value with state + methods */
export interface EcosystemContextValue extends EcosystemState {
  /** Create a new ecosystem finding via API */
  createFinding: (finding: Omit<EcosystemFinding, 'id' | 'timestamp'>) => Promise<EcosystemFinding | null>
  /** Emit a cross-module event (in-memory + logged) */
  emitEvent: (event: Omit<EcosystemEvent, 'id' | 'timestamp'>) => void
  /** Refresh findings from the API */
  refreshFindings: () => Promise<void>
  /** Refresh stats from the API */
  refreshStats: () => Promise<void>
}

const EcosystemContext = createContext<EcosystemContextValue | undefined>(undefined)

const INITIAL_STATS: EcosystemStats = {
  totalFindings: 0,
  findings24h: 0,
  byModule: { scanner: 0, atemi: 0, sage: 0, arena: 0, mitsuke: 0, attackdna: 0, ronin: 0, jutsu: 0, guard: 0 },
  byType: { vulnerability: 0, attack_variant: 0, mutation: 0, match_result: 0, threat_intel: 0 },
  bySeverity: { CRITICAL: 0, WARNING: 0, INFO: 0 },
  activeModules: [],
  lastFindingAt: null,
}

// ===========================================================================
// Rate Limiting (SEC-9)
// ===========================================================================

type RateLimitBucketMap = Map<string, { count: number; resetAt: number }>

function checkRateLimit(source: string, buckets: RateLimitBucketMap): boolean {
  const now = Date.now()
  const bucket = buckets.get(source)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(source, { count: 1, resetAt: now + 1000 })
    return true
  }

  if (bucket.count >= ECOSYSTEM_RATE_LIMIT_PER_MODULE) {
    return false
  }

  bucket.count++
  return true
}

// ===========================================================================
// Provider
// ===========================================================================

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const [findings, setFindings] = useState<EcosystemFinding[]>([])
  const [events, setEvents] = useState<EcosystemEvent[]>([])
  const [stats, setStats] = useState<EcosystemStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const rateLimitRef = useRef<RateLimitBucketMap>(new Map())

  useEffect(() => {
    return () => { mountedRef.current = false }
  }, [])

  // Fetch recent findings from API
  const refreshFindings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/ecosystem/findings?limit=50')
      if (!res.ok) throw new Error('Failed to fetch findings')
      const json = await res.json()
      if (mountedRef.current) {
        setFindings(json.data?.findings || [])
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  // Fetch stats from API
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/ecosystem/findings?mode=stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      const json = await res.json()
      if (mountedRef.current) {
        setStats(json.data || INITIAL_STATS)
      }
    } catch {
      // Stats fetch failure is non-critical, keep existing stats
    }
  }, [])

  // Initial load
  useEffect(() => {
    refreshFindings()
    refreshStats()
  }, [refreshFindings, refreshStats])

  // Create a finding via API
  const createFinding = useCallback(async (
    finding: Omit<EcosystemFinding, 'id' | 'timestamp'>
  ): Promise<EcosystemFinding | null> => {
    try {
      const res = await fetchWithAuth('/api/ecosystem/findings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finding),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || 'Failed to create finding')
      }
      const json = await res.json()
      const saved = json.data as EcosystemFinding

      // Optimistic update: prepend to local state
      if (mountedRef.current) {
        setFindings(prev => [saved, ...prev].slice(0, 50))
        // Refresh stats in background
        refreshStats()
      }

      return saved
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to create finding')
      }
      return null
    }
  }, [refreshStats])

  // Emit in-memory cross-module event (SEC-9: validated + rate-limited)
  const emitEvent = useCallback((eventData: Omit<EcosystemEvent, 'id' | 'timestamp'>) => {
    // Validate event type (SEC-9)
    if (!VALID_EVENT_TYPES.has(eventData.type)) {
      console.warn(`Invalid ecosystem event type: ${eventData.type}`)
      return
    }

    // Validate source (SEC-9)
    if (!VALID_SOURCE_MODULES.has(eventData.source)) {
      console.warn(`Invalid ecosystem event source: ${eventData.source}`)
      return
    }

    // Rate limit check (SEC-9) — uses instance-scoped ref, not module-level
    if (!checkRateLimit(eventData.source, rateLimitRef.current)) {
      console.warn(`Rate limit exceeded for module: ${eventData.source}`)
      return
    }

    const event: EcosystemEvent = {
      ...eventData,
      id: safeUUID(),
      timestamp: new Date().toISOString(),
    }

    setEvents(prev => [event, ...prev].slice(0, ECOSYSTEM_MAX_EVENTS))
  }, [])

  const value = useMemo<EcosystemContextValue>(() => ({
    findings,
    events,
    stats,
    loading,
    error,
    createFinding,
    emitEvent,
    refreshFindings,
    refreshStats,
  }), [findings, events, stats, loading, error, createFinding, emitEvent, refreshFindings, refreshStats])

  return (
    <EcosystemContext.Provider value={value}>
      {children}
    </EcosystemContext.Provider>
  )
}

// ===========================================================================
// Hooks
// ===========================================================================

/** Access the full ecosystem context */
export function useEcosystem(): EcosystemContextValue {
  const context = useContext(EcosystemContext)
  if (!context) {
    throw new Error('useEcosystem must be used within EcosystemProvider')
  }
  return context
}

/**
 * Hook for modules to emit findings and events.
 * Only pulls emitEvent + createFinding to minimize re-renders.
 */
export function useEcosystemEmit(sourceModule: EcosystemSourceModule) {
  if (!VALID_SOURCE_MODULES.has(sourceModule)) {
    throw new Error(`useEcosystemEmit: invalid sourceModule "${sourceModule}"`)
  }
  const { createFinding, emitEvent } = useEcosystem()

  const emitFinding = useCallback(async (
    finding: Omit<EcosystemFinding, 'id' | 'timestamp' | 'sourceModule'>
  ) => {
    const saved = await createFinding({ ...finding, sourceModule })
    if (saved) {
      emitEvent({
        type: 'ecosystem:finding_created',
        source: sourceModule,
        findingId: saved.id,
        payload: { findingType: saved.findingType, severity: saved.severity },
      })
    }
    return saved
  }, [createFinding, emitEvent, sourceModule])

  const emitModuleEvent = useCallback((
    type: EcosystemEventType,
    payload: Record<string, unknown> = {},
    findingId?: string,
  ) => {
    emitEvent({ type, source: sourceModule, findingId, payload })
  }, [emitEvent, sourceModule])

  return { emitFinding, emitModuleEvent }
}

/**
 * Hook for reading ecosystem findings with optional filtering.
 * Minimizes re-renders by returning stable references.
 */
export function useEcosystemFindings(sourceModule?: EcosystemSourceModule) {
  const { findings, stats, loading, error, refreshFindings } = useEcosystem()

  const filtered = useMemo(
    () => sourceModule ? findings.filter(f => f.sourceModule === sourceModule) : findings,
    [findings, sourceModule]
  )

  return { findings: filtered, stats, loading, error, refreshFindings }
}
