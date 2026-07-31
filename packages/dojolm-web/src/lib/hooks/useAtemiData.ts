// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useAtemiData.ts
 * Purpose: Client hooks for the Atemi Lab bundled corpus (Wave 8.7 /
 *          ADR-0079).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import { classifyError, fetchJson, type HookState } from '@/lib/hooks/hook-utils'
import type {
  AtemiAttackTool,
  AtemiCampaign,
  AtemiPlaybook,
} from '@/lib/atemi/fixtures'

export type { AtemiAttackTool, AtemiCampaign, AtemiPlaybook, HookState }

const MODULE_ID = 'atemi'

interface AttackToolsResponse { tools: AtemiAttackTool[]; total: number; limit: number; offset: number; hasMore: boolean }
interface PlaybooksResponse { playbooks: AtemiPlaybook[]; total: number; limit: number; offset: number; hasMore: boolean }
interface CampaignsResponse { campaigns: AtemiCampaign[]; total: number; limit: number; offset: number; hasMore: boolean }

function useFetchList<T, R>(
  url: string,
  extract: (r: R) => T[],
  action: string,
  errorCode: string,
): HookState<T[]> {
  const [items, setItems] = useState<T[]>([])
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
    fetchJson<R>(url, controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const next = extract(body) ?? []
        setItems(next)
        emit({ name: 'feature_used', module_id: MODULE_ID, action, outcome: next.length === 0 ? 'empty' : 'success' })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({ name: 'feature_error', module_id: MODULE_ID, error_class: errClass, error_code: errorCode, route: url })
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort() }
  }, [nonce, url, extract, action, errorCode])

  return { items, loading, error, refresh }
}

export function useAtemiAttackTools(): HookState<AtemiAttackTool[]> {
  const extract = useCallback((b: AttackToolsResponse) => b.tools, [])
  return useFetchList<AtemiAttackTool, AttackToolsResponse>(
    '/api/atemi/attack-tools?limit=200',
    extract,
    'view_attack_tools',
    'attack_tools_fetch_failed',
  )
}

export function useAtemiPlaybooks(): HookState<AtemiPlaybook[]> {
  const extract = useCallback((b: PlaybooksResponse) => b.playbooks, [])
  return useFetchList<AtemiPlaybook, PlaybooksResponse>(
    '/api/atemi/playbooks?limit=200',
    extract,
    'view_playbooks',
    'playbooks_fetch_failed',
  )
}

export function useAtemiCampaigns(): HookState<AtemiCampaign[]> {
  const extract = useCallback((b: CampaignsResponse) => b.campaigns, [])
  return useFetchList<AtemiCampaign, CampaignsResponse>(
    '/api/atemi/campaigns?limit=100',
    extract,
    'view_campaigns',
    'campaigns_fetch_failed',
  )
}
