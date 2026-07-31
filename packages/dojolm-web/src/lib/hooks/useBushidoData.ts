// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useBushidoData.ts
 * Purpose: Wave 8.9 / ADR-0081 — client hooks for Bushido Book
 *          compliance frameworks + mappings + evidence templates.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import { classifyError, fetchJson, type HookState } from '@/lib/hooks/hook-utils'
import type {
  BushidoControlMapping,
  BushidoEvidenceTemplate,
  BushidoFramework,
} from '@/lib/bushido/fixtures'

export type {
  BushidoControlMapping,
  BushidoEvidenceTemplate,
  BushidoFramework,
  HookState,
}

const MODULE_ID = 'bushido'

interface FrameworksResponse { frameworks: BushidoFramework[]; total: number }
interface MappingsResponse { mappings: BushidoControlMapping[]; total: number; limit: number; offset: number; hasMore: boolean }
interface EvidenceResponse { templates: BushidoEvidenceTemplate[]; total: number; limit: number; offset: number; hasMore: boolean }

function useFetch<T, R>(
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

export function useBushidoFrameworks(): HookState<BushidoFramework[]> {
  const extract = useCallback((b: FrameworksResponse) => b.frameworks, [])
  return useFetch<BushidoFramework, FrameworksResponse>(
    '/api/bushido/frameworks',
    extract,
    'view_frameworks',
    'frameworks_fetch_failed',
  )
}

export function useBushidoMappings(): HookState<BushidoControlMapping[]> {
  const extract = useCallback((b: MappingsResponse) => b.mappings, [])
  return useFetch<BushidoControlMapping, MappingsResponse>(
    '/api/bushido/mappings?limit=500',
    extract,
    'view_mappings',
    'mappings_fetch_failed',
  )
}

export function useBushidoEvidenceTemplates(): HookState<BushidoEvidenceTemplate[]> {
  const extract = useCallback((b: EvidenceResponse) => b.templates, [])
  return useFetch<BushidoEvidenceTemplate, EvidenceResponse>(
    '/api/bushido/evidence-templates?limit=100',
    extract,
    'view_evidence_templates',
    'evidence_templates_fetch_failed',
  )
}
