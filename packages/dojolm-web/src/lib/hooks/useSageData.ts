// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useSageData.ts
 * Purpose: Client-side data hooks that wire the three SAGE views
 *          (`SageSeedLibrary`, `SageMutationView`, `SageQuarantineView`)
 *          to their live API routes under `/api/buki/sage/*`.
 *
 * Story: WAVE2-SAGE / ADR-0014.
 *
 * Mirrors the fetch-hook convention established by `useMitsukeData`:
 * AbortController-per-effect, `finally`-setLoading, stale-signal
 * guard, and per-hook telemetry with explicit error codes.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import {
  classifyError,
  fetchJson,
  type HookState,
} from './hook-utils'
import type {
  SeedRecord,
  MutationOperatorRecord,
  QuarantineRecord,
} from '@/lib/sage/fixtures'

const MODULE_ID = 'sage'

// ---------------------------------------------------------------------------
// Re-export shared record shapes + hook-state contract
// ---------------------------------------------------------------------------

export type { SeedRecord, MutationOperatorRecord, QuarantineRecord, HookState }

// ---------------------------------------------------------------------------
// Seeds
// ---------------------------------------------------------------------------

interface ApiSeedsResponse {
  seeds: SeedRecord[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function useSageSeeds(): HookState<SeedRecord[]> {
  const [items, setItems] = useState<SeedRecord[]>([])
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

    fetchJson<ApiSeedsResponse>('/api/buki/sage/seeds?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const records = body.seeds ?? []
        setItems(records)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_seeds',
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
          error_code: 'seeds_fetch_failed',
          route: '/api/buki/sage/seeds',
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
// Mutations
// ---------------------------------------------------------------------------

interface ApiMutationsResponse {
  operators: MutationOperatorRecord[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function useSageMutations(): HookState<MutationOperatorRecord[]> {
  const [items, setItems] = useState<MutationOperatorRecord[]>([])
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

    fetchJson<ApiMutationsResponse>('/api/buki/sage/mutations?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const records = body.operators ?? []
        setItems(records)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_mutations',
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
          error_code: 'mutations_fetch_failed',
          route: '/api/buki/sage/mutations',
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
// Quarantine
// ---------------------------------------------------------------------------

interface ApiQuarantineResponse {
  items: QuarantineRecord[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface QuarantineHookState extends HookState<QuarantineRecord[]> {
  reviewItem: (itemId: string, action: 'approve' | 'reject', notes?: string) => Promise<void>
  reviewError: string | null
}

export function useSageQuarantine(): QuarantineHookState {
  const [items, setItems] = useState<QuarantineRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiQuarantineResponse>('/api/buki/sage/quarantine?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const records = body.items ?? []
        setItems(records)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_quarantine',
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
          error_code: 'quarantine_fetch_failed',
          route: '/api/buki/sage/quarantine',
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

  const reviewItem = useCallback(
    async (itemId: string, action: 'approve' | 'reject', notes?: string) => {
      setReviewError(null)
      try {
        const response = await fetch('/api/buki/sage/quarantine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ itemId, action, notes }),
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const body = (await response.json()) as { item: QuarantineRecord }
        setItems((prev) =>
          prev.map((i) => (i.id === body.item.id ? body.item : i)),
        )
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: `quarantine_${action}`,
          outcome: 'success',
        })
      } catch (err: unknown) {
        const { class: errClass, message } = classifyError(err)
        setReviewError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'quarantine_review_failed',
          route: '/api/buki/sage/quarantine',
        })
      }
    },
    [],
  )

  return { items, loading, error, refresh, reviewItem, reviewError }
}
