// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useRoninData.ts
 * Purpose: Client-side hooks for the live Ronin Hub Planning +
 *          Intelligence tabs.
 * Story: WAVE2-RONIN / ADR-0015.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import {
  classifyError,
  fetchJson,
  type HookState,
} from './hook-utils'
import type {
  ResearchTargetRecord,
  IntelligenceEntryRecord,
} from '@/lib/ronin/fixtures'

const MODULE_ID = 'ronin'

export type { ResearchTargetRecord, IntelligenceEntryRecord, HookState }

// ---------------------------------------------------------------------------
// Planning targets
// ---------------------------------------------------------------------------

interface ApiPlanningResponse {
  targets: ResearchTargetRecord[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface PlanningHookState extends HookState<ResearchTargetRecord[]> {
  createTarget: (input: {
    title: string
    url: string
    notes?: string
    priority?: ResearchTargetRecord['priority']
    scope?: ResearchTargetRecord['scope']
  }) => Promise<void>
  deleteTarget: (id: string) => Promise<void>
  saveError: string | null
}

export function useRoninPlanning(): PlanningHookState {
  const [items, setItems] = useState<ResearchTargetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiPlanningResponse>('/api/ronin/planning/targets?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const records = body.targets ?? []
        setItems(records)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_planning',
          outcome: records.length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'planning_fetch_failed',
          route: '/api/ronin/planning/targets',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  const createTarget = useCallback(
    async (input: {
      title: string
      url: string
      notes?: string
      priority?: ResearchTargetRecord['priority']
      scope?: ResearchTargetRecord['scope']
    }) => {
      setSaveError(null)
      try {
        const response = await fetch('/api/ronin/planning/targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(input),
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const body = (await response.json()) as { target: ResearchTargetRecord }
        setItems((prev) => [body.target, ...prev])
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'create_target',
          outcome: 'success',
        })
      } catch (err: unknown) {
        const { class: errClass, message } = classifyError(err)
        setSaveError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'planning_create_failed',
          route: '/api/ronin/planning/targets',
        })
      }
    },
    [],
  )

  const deleteTarget = useCallback(async (id: string) => {
    setSaveError(null)
    try {
      const response = await fetch(
        `/api/ronin/planning/targets?id=${encodeURIComponent(id)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      setItems((prev) => prev.filter((t) => t.id !== id))
      emit({
        name: 'feature_used',
        module_id: MODULE_ID,
        action: 'delete_target',
        outcome: 'success',
      })
    } catch (err: unknown) {
      const { class: errClass, message } = classifyError(err)
      setSaveError(message)
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'planning_delete_failed',
        route: '/api/ronin/planning/targets',
      })
    }
  }, [])

  return { items, loading, error, refresh, createTarget, deleteTarget, saveError }
}

// ---------------------------------------------------------------------------
// Intelligence entries
// ---------------------------------------------------------------------------

interface ApiIntelligenceResponse {
  entries: IntelligenceEntryRecord[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function useRoninIntelligence(): HookState<IntelligenceEntryRecord[]> {
  const [items, setItems] = useState<IntelligenceEntryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiIntelligenceResponse>('/api/ronin/intelligence?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const records = body.entries ?? []
        setItems(records)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_intelligence',
          outcome: records.length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'intelligence_fetch_failed',
          route: '/api/ronin/intelligence',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  return { items, loading, error, refresh }
}

// ---------------------------------------------------------------------------
// Intelligence ingest poller (ADR-0026 endpoints, ADR-0033 UI)
// ---------------------------------------------------------------------------

import type { PollerRunResult } from '@/lib/ronin/intel-poller'

export type { PollerRunResult }

export type PollerStatus =
  | 'healthy'
  | 'degraded'
  | 'no-runs-yet'
  | 'disabled'
  | 'unknown'

interface PollerHealthApiResponse {
  status?: PollerStatus
  lastRun?: PollerRunResult | null
}

export interface PollerHealthState {
  readonly status: PollerStatus
  readonly lastRun: PollerRunResult | null
  readonly loading: boolean
  readonly polling: boolean
  readonly pollerError: string | null
  readonly triggerPoll: () => Promise<void>
  readonly refreshHealth: () => void
}

const DEFAULT_HEALTH_REFRESH_MS = 60_000

export function useRoninIntelligencePoller(
  refreshIntervalMs: number = DEFAULT_HEALTH_REFRESH_MS,
): PollerHealthState {
  const [status, setStatus] = useState<PollerStatus>('unknown')
  const [lastRun, setLastRun] = useState<PollerRunResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)
  const [pollerError, setPollerError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const mountedRef = useRef(true)
  const controllerRef = useRef<AbortController | null>(null)
  // Monotonic timestamp of the most recent state-mutation (either a
  // health-tick write or a triggerPoll resolve). Tick handlers consult
  // it before writing — a tick that started before the latest mutation
  // is dropped on the floor so triggerPoll's authoritative result is
  // not overwritten by an in-flight stale tick.
  const lastWriteRef = useRef(0)

  const refreshHealth = useCallback(() => setNonce((n) => n + 1), [])

  const fetchHealth = useCallback(async (signal: AbortSignal): Promise<void> => {
    const startedAt = Date.now()
    try {
      const response = await fetch('/api/ronin/intelligence/poller-health', {
        signal,
        credentials: 'same-origin',
      })
      if (response.status === 503) {
        if (!mountedRef.current) return
        if (startedAt < lastWriteRef.current) return
        lastWriteRef.current = Date.now()
        setStatus('disabled')
        setLastRun(null)
        setPollerError(null)
        return
      }
      if (!response.ok) {
        if (!mountedRef.current) return
        if (startedAt < lastWriteRef.current) return
        lastWriteRef.current = Date.now()
        setStatus('unknown')
        setPollerError(`HTTP ${response.status}`)
        return
      }
      const body = (await response.json()) as PollerHealthApiResponse
      if (!mountedRef.current) return
      if (startedAt < lastWriteRef.current) return
      lastWriteRef.current = Date.now()
      setStatus(body.status ?? 'unknown')
      setLastRun(body.lastRun ?? null)
      setPollerError(null)
    } catch (err: unknown) {
      if (signal.aborted) return
      if (!mountedRef.current) return
      const { class: errClass } = classifyError(err)
      // Failed health reads do not advance lastWriteRef — they should
      // not block a fresh trigger result from landing.
      setStatus('unknown')
      setPollerError('Could not load poller health.')
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'intel_poller_health_fetch_failed',
        route: '/api/ronin/intelligence/poller-health',
      })
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)

    void fetchHealth(controller.signal).finally(() => {
      if (!controller.signal.aborted && mountedRef.current) setLoading(false)
    })

    const interval = refreshIntervalMs > 0
      ? window.setInterval(() => {
          if (!mountedRef.current) return
          // Use a fresh abort controller per tick so a slow request
          // never blocks the next refresh from queueing.
          const tickController = new AbortController()
          void fetchHealth(tickController.signal)
        }, refreshIntervalMs)
      : null

    return () => {
      mountedRef.current = false
      controller.abort()
      controllerRef.current = null
      if (interval !== null) window.clearInterval(interval)
    }
  }, [nonce, refreshIntervalMs, fetchHealth])

  const triggerPoll = useCallback(async (): Promise<void> => {
    if (polling) return
    setPolling(true)
    setPollerError(null)
    try {
      const response = await fetch('/api/ronin/intelligence/poll', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (response.status === 503) {
        if (!mountedRef.current) return
        setStatus('disabled')
        setPollerError('Intelligence ingest is disabled.')
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: 'precondition',
          error_code: 'intel_poll_disabled',
          route: '/api/ronin/intelligence/poll',
        })
        return
      }
      if (response.status === 403) {
        if (!mountedRef.current) return
        setPollerError('Admin role required to trigger a poll.')
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: 'permission',
          error_code: 'intel_poll_forbidden',
          route: '/api/ronin/intelligence/poll',
        })
        return
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = (await response.json()) as PollerRunResult
      if (!mountedRef.current) return
      // Authoritative — bump lastWriteRef so any in-flight health tick
      // that started before this resolve cannot revert the status.
      lastWriteRef.current = Date.now()
      setLastRun(result)
      setStatus(result.totals.errors === 0 ? 'healthy' : 'degraded')
      emit({
        name: 'feature_used',
        module_id: MODULE_ID,
        action: 'intel_poll',
        outcome: result.totals.errors === 0 ? 'success' : 'partial',
      })
    } catch (err: unknown) {
      if (!mountedRef.current) return
      const { class: errClass } = classifyError(err)
      setPollerError('Poll failed — please try again.')
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'intel_poll_failed',
        route: '/api/ronin/intelligence/poll',
      })
    } finally {
      if (mountedRef.current) setPolling(false)
    }
  }, [polling])

  return {
    status,
    lastRun,
    loading,
    polling,
    pollerError,
    triggerPoll,
    refreshHealth,
  }
}
