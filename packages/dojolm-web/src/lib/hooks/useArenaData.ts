// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useArenaData.ts
 * Purpose: Client hooks for Battle Arena matches + leaderboards
 *          (Wave 8.8 / ADR-0080).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import { classifyError, fetchJson, type HookState } from '@/lib/hooks/hook-utils'
import type {
  ArenaLeaderboardSnapshot,
  ArenaMatchRecord,
} from '@/lib/arena/fixtures'

export type { ArenaLeaderboardSnapshot, ArenaMatchRecord, HookState }

const MODULE_ID = 'arena'

interface MatchesResponse { matches: ArenaMatchRecord[]; total: number; limit: number; offset: number; hasMore: boolean }
interface LeaderboardsResponse { leaderboards: ArenaLeaderboardSnapshot[]; total: number; limit: number; offset: number; hasMore: boolean }

export function useArenaMatches(): HookState<ArenaMatchRecord[]> {
  const [items, setItems] = useState<ArenaMatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const ref = useRef<AbortController | null>(null)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    ref.current?.abort()
    ref.current = controller
    setLoading(true)
    setError(null)
    fetchJson<MatchesResponse>('/api/arena/matches?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const next = body.matches ?? []
        setItems(next)
        emit({ name: 'feature_used', module_id: MODULE_ID, action: 'view_matches', outcome: next.length === 0 ? 'empty' : 'success' })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({ name: 'feature_error', module_id: MODULE_ID, error_class: errClass, error_code: 'matches_fetch_failed', route: '/api/arena/matches' })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort() }
  }, [nonce])

  return { items, loading, error, refresh }
}

export function useArenaLeaderboards(): HookState<ArenaLeaderboardSnapshot[]> {
  const [items, setItems] = useState<ArenaLeaderboardSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const ref = useRef<AbortController | null>(null)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    ref.current?.abort()
    ref.current = controller
    setLoading(true)
    setError(null)
    fetchJson<LeaderboardsResponse>('/api/arena/leaderboards?limit=50', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const next = body.leaderboards ?? []
        setItems(next)
        emit({ name: 'feature_used', module_id: MODULE_ID, action: 'view_leaderboards', outcome: next.length === 0 ? 'empty' : 'success' })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({ name: 'feature_error', module_id: MODULE_ID, error_class: errClass, error_code: 'leaderboards_fetch_failed', route: '/api/arena/leaderboards' })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort() }
  }, [nonce])

  return { items, loading, error, refresh }
}
