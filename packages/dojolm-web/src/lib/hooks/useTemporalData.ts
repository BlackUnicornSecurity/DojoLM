// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useTemporalData.ts
 * Purpose: Client-side hooks for Sengoku Temporal — plan catalog +
 *          simulate executor + run replay.
 * Story: WAVE2-TEMPORAL / ADR-0019, streaming consumer added in
 *        WAVE4-TEMPORAL-STREAMING-UI / ADR-0032.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import { classifyError, fetchJson } from './hook-utils'
import type {
  PlanRecord,
  RunRecord,
  RunTurn,
} from '@/lib/sengoku/fixtures'

const MODULE_ID = 'sengoku'

export type { PlanRecord, RunRecord, RunTurn }

interface ApiPlansResponse {
  plans: PlanRecord[]
  total: number
}

/**
 * Summary row for a resumable (partial) run. The UI does not need
 * the full turn transcript — only enough to show "N resumable runs
 * for this plan". Populated by the Wave 6 RESUME-API partials
 * endpoint.
 */
export interface PartialRunSummary {
  runId: string
  planId: string
  planName: string
  checkpointedAt: string
  completedUserTurnCount: number
}

export interface TemporalHookState {
  plans: PlanRecord[]
  loading: boolean
  error: string | null
  simulate: (planId: string) => Promise<RunRecord | null>
  simulating: string | null
  simulationError: string | null
  currentRun: RunRecord | null
  streamingTurns: RunTurn[]
  clearRun: () => void
  refresh: () => void
  partialsByPlan: Record<string, PartialRunSummary[]>
  refreshPartials: (planId: string) => Promise<void>
  resume: (planId: string, runId?: string) => Promise<RunRecord | null>
  resuming: string | null
  resumeError: string | null
}

interface ApiRunResponse {
  run: RunRecord
}

interface SseTurnPayload { type: 'turn'; turn: RunTurn }
interface SseCompletePayload { type: 'complete'; run: RunRecord }
interface SseErrorPayload { type: 'error'; reason: string }
type SsePayload = SseTurnPayload | SseCompletePayload | SseErrorPayload

function parseSsePayload(raw: unknown): SsePayload | null {
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw) as SsePayload
    if (parsed && typeof parsed === 'object' && 'type' in parsed) return parsed
    return null
  } catch {
    return null
  }
}

interface ApiPartialsResponse {
  partials: PartialRunSummary[]
}

export function useTemporalPlans(): TemporalHookState {
  const [plans, setPlans] = useState<PlanRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState<string | null>(null)
  const [simulationError, setSimulationError] = useState<string | null>(null)
  const [currentRun, setCurrentRun] = useState<RunRecord | null>(null)
  const [streamingTurns, setStreamingTurns] = useState<RunTurn[]>([])
  const [partialsByPlan, setPartialsByPlan] = useState<Record<string, PartialRunSummary[]>>({})
  const [resuming, setResuming] = useState<string | null>(null)
  const [resumeError, setResumeError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      eventSourceRef.current?.close()
      eventSourceRef.current = null
    }
  }, [])

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiPlansResponse>('/api/sengoku/temporal/plans', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        setPlans(body.plans ?? [])
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_temporal_plans',
          outcome: (body.plans?.length ?? 0) === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass } = classifyError(err)
        setError('Could not load temporal plans.')
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'temporal_plans_fetch_failed',
          route: '/api/sengoku/temporal/plans',
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

  const runSyncSimulate = useCallback(async (planId: string): Promise<RunRecord | null> => {
    try {
      const response = await fetch('/api/sengoku/temporal/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ planId }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as ApiRunResponse
      if (mountedRef.current) {
        setCurrentRun(body.run)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'temporal_run',
          outcome: 'success',
        })
      }
      return body.run
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      if (mountedRef.current) {
        setSimulationError('Simulation failed — please try again.')
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'temporal_run_failed',
          route: '/api/sengoku/temporal/runs',
        })
      }
      return null
    }
  }, [])

  const simulate = useCallback(async (planId: string): Promise<RunRecord | null> => {
    setSimulating(planId)
    setSimulationError(null)
    setCurrentRun(null)
    setStreamingTurns([])

    eventSourceRef.current?.close()
    eventSourceRef.current = null

    // ADR-0032: try the SSE stream first so an LLM-driven multi-turn
    // run renders incrementally. The endpoint emits an `error` event
    // with `reason: 'llm-not-configured'` when `sengoku.llm` is off,
    // which transparently falls back to the synchronous POST. The
    // same fallback covers transport-level failures (network, 4xx/5xx)
    // so a streaming-route outage degrades to the existing sync path
    // rather than surfacing as a UI error.
    if (typeof EventSource === 'undefined') {
      const result = await runSyncSimulate(planId)
      if (mountedRef.current) setSimulating(null)
      return result
    }

    const url = `/api/sengoku/temporal/runs/stream?planId=${encodeURIComponent(planId)}`
    let es: EventSource
    try {
      es = new EventSource(url, { withCredentials: true })
    } catch {
      // Some browsers throw synchronously on construction (CSP blocks
      // the SSE URL, sandboxed iframe without `allow-same-origin`,
      // etc.). Treat this exactly like a transport-level error and
      // fall through to the sync POST so `simulating` is reset and
      // the operator still sees a result.
      const result = await runSyncSimulate(planId)
      if (mountedRef.current) setSimulating(null)
      return result
    }
    eventSourceRef.current = es

    return await new Promise<RunRecord | null>((resolve) => {
      let completed = false
      let fallenBack = false

      const fallback = async (): Promise<void> => {
        if (fallenBack || completed) return
        fallenBack = true
        es.close()
        if (eventSourceRef.current === es) eventSourceRef.current = null
        const result = await runSyncSimulate(planId)
        if (mountedRef.current) setSimulating(null)
        resolve(result)
      }

      es.addEventListener('turn', (ev) => {
        const payload = parseSsePayload((ev as MessageEvent).data)
        if (payload?.type !== 'turn') return
        if (mountedRef.current) setStreamingTurns((prev) => [...prev, payload.turn])
      })

      es.addEventListener('complete', (ev) => {
        const payload = parseSsePayload((ev as MessageEvent).data)
        if (payload?.type !== 'complete') return
        completed = true
        es.close()
        if (eventSourceRef.current === es) eventSourceRef.current = null
        if (mountedRef.current) {
          setCurrentRun(payload.run)
          setSimulating(null)
          emit({
            name: 'feature_used',
            module_id: MODULE_ID,
            action: 'temporal_run',
            outcome: 'success',
          })
        }
        resolve(payload.run)
      })

      // Server-emitted `event: error` SSE entries arrive as MessageEvents
      // with `.data`. Transport-level failures arrive as plain Events
      // with no `.data`. Both paths fall back to the sync POST so the
      // operator never sees a streaming-only failure mode.
      es.addEventListener('error', (ev) => {
        if (completed) return
        void fallback()
        void ev
      })
    })
  }, [runSyncSimulate])

  const clearRun = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
    setCurrentRun(null)
    setSimulationError(null)
    setStreamingTurns([])
    setResumeError(null)
  }, [])

  const refreshPartials = useCallback(async (planId: string): Promise<void> => {
    try {
      const response = await fetch(
        `/api/sengoku/temporal/runs/partials?planId=${encodeURIComponent(planId)}`,
        { credentials: 'same-origin' },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as ApiPartialsResponse
      if (mountedRef.current) {
        setPartialsByPlan((prev) => ({ ...prev, [planId]: body.partials ?? [] }))
      }
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'temporal_partials_fetch_failed',
        route: '/api/sengoku/temporal/runs/partials',
      })
    }
  }, [])

  const resume = useCallback(async (
    planId: string,
    runId?: string,
  ): Promise<RunRecord | null> => {
    setResuming(planId)
    setResumeError(null)
    setCurrentRun(null)
    setStreamingTurns([])
    try {
      const body: Record<string, string> = { planId }
      if (runId !== undefined) body.runId = runId
      const response = await fetch('/api/sengoku/temporal/runs/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(errorBody.error ?? `HTTP ${response.status}`)
      }
      const parsed = (await response.json()) as ApiRunResponse
      if (mountedRef.current) {
        setCurrentRun(parsed.run)
        setResuming(null)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'temporal_resume',
          outcome: 'success',
        })
      }
      // The resumed run's partial has been consumed server-side; drop
      // it from the local map so the UI no longer shows a Resume
      // affordance for that run.
      if (mountedRef.current) {
        setPartialsByPlan((prev) => {
          const list = prev[planId] ?? []
          const filtered = runId === undefined ? list.slice(1) : list.filter((p) => p.runId !== runId)
          return { ...prev, [planId]: filtered }
        })
      }
      return parsed.run
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      if (mountedRef.current) {
        setResumeError(err instanceof Error ? err.message : 'Resume failed')
        setResuming(null)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'temporal_resume_failed',
          route: '/api/sengoku/temporal/runs/resume',
        })
      }
      return null
    }
  }, [])

  return {
    plans,
    loading,
    error,
    simulate,
    simulating,
    simulationError,
    currentRun,
    streamingTurns,
    clearRun,
    refresh,
    partialsByPlan,
    refreshPartials,
    resume,
    resuming,
    resumeError,
  }
}
