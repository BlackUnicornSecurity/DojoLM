// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useGuardData.ts
 * Purpose: Client-side hooks for the live Hattori Guard hardening +
 *          forge-defense surfaces.
 * Story: WAVE2-GUARD / ADR-0018.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import { classifyError, fetchJson } from './hook-utils'
import type {
  DefenseTemplateRecord,
  HardeningAnalysis,
  HardeningWeakness,
} from '@/lib/guard/fixtures'

const MODULE_ID = 'guard'

export type { DefenseTemplateRecord, HardeningAnalysis, HardeningWeakness }

// ---------------------------------------------------------------------------
// Hardening
// ---------------------------------------------------------------------------

export interface HardeningHookState {
  analysis: HardeningAnalysis | null
  analyzing: boolean
  error: string | null
  analyze: (prompt: string) => Promise<void>
  reset: () => void
}

export function useGuardHardening(): HardeningHookState {
  const [analysis, setAnalysis] = useState<HardeningAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(async (prompt: string) => {
    setAnalyzing(true)
    setError(null)
    try {
      const response = await fetch('/api/guard/hardening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ prompt }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as HardeningAnalysis
      setAnalysis(body)
      emit({
        name: 'feature_used',
        module_id: MODULE_ID,
        action: 'hardening_analyze',
        outcome: body.weaknesses.length === 0 ? 'empty' : 'success',
      })
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      setError('Analysis failed — please try again.')
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'guard_hardening_failed',
        route: '/api/guard/hardening',
      })
    } finally {
      setAnalyzing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setAnalysis(null)
    setError(null)
  }, [])

  return { analysis, analyzing, error, analyze, reset }
}

// ---------------------------------------------------------------------------
// Forge Defense — templates + applied state
// ---------------------------------------------------------------------------

interface ApiTemplatesResponse {
  templates: DefenseTemplateRecord[]
  total: number
}

interface AppliedRecord {
  templateId: string
  appliedAt: string
}

interface ApiAppliedResponse {
  applied: AppliedRecord[]
}

export interface ForgeDefenseHookState {
  templates: DefenseTemplateRecord[]
  applied: AppliedRecord[]
  loading: boolean
  error: string | null
  saveError: string | null
  apply: (templateId: string) => Promise<void>
  remove: (templateId: string) => Promise<void>
  refresh: () => void
}

export function useForgeDefense(): ForgeDefenseHookState {
  const [templates, setTemplates] = useState<DefenseTemplateRecord[]>([])
  const [applied, setApplied] = useState<AppliedRecord[]>([])
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

    Promise.all([
      fetchJson<ApiTemplatesResponse>('/api/guard/forge-defense/templates', controller.signal),
      fetchJson<ApiAppliedResponse>('/api/guard/forge-defense/applied', controller.signal),
    ])
      .then(([templatesBody, appliedBody]) => {
        if (controller.signal.aborted) return
        setTemplates(templatesBody.templates ?? [])
        setApplied(appliedBody.applied ?? [])
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_forge_defense',
          outcome: (templatesBody.templates?.length ?? 0) === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass } = classifyError(err)
        setError('Could not load defense templates.')
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'forge_defense_fetch_failed',
          route: '/api/guard/forge-defense',
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

  const apply = useCallback(async (templateId: string) => {
    setSaveError(null)
    try {
      const response = await fetch('/api/guard/forge-defense/applied', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ templateId }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as ApiAppliedResponse
      setApplied(body.applied)
      emit({
        name: 'feature_used',
        module_id: MODULE_ID,
        action: 'defense_apply',
        outcome: 'success',
      })
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      setSaveError('Apply failed — please try again.')
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'forge_defense_apply_failed',
        route: '/api/guard/forge-defense/applied',
      })
    }
  }, [])

  const remove = useCallback(async (templateId: string) => {
    setSaveError(null)
    try {
      const response = await fetch(
        `/api/guard/forge-defense/applied?id=${encodeURIComponent(templateId)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      )
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as ApiAppliedResponse
      setApplied(body.applied)
      emit({
        name: 'feature_used',
        module_id: MODULE_ID,
        action: 'defense_remove',
        outcome: 'success',
      })
    } catch (err: unknown) {
      const { class: errClass } = classifyError(err)
      setSaveError('Remove failed — please try again.')
      emit({
        name: 'feature_error',
        module_id: MODULE_ID,
        error_class: errClass,
        error_code: 'forge_defense_remove_failed',
        route: '/api/guard/forge-defense/applied',
      })
    }
  }, [])

  return { templates, applied, loading, error, saveError, apply, remove, refresh }
}
