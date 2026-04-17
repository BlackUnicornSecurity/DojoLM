/**
 * File: useJutsuModels.ts
 * Purpose: Fetch the list of enabled LLM models configured via Jutsu
 *          (Admin → Providers / API Keys) as the single source of truth
 *          for any model dropdown in the app.
 *
 * Why a standalone hook (not useEnabledModels from LLMModelContext):
 * - Many surfaces (Kagami, AdversarialLab target-model selector, Atemi
 *   Lab, Attack DNA BlackBoxAnalysis) live outside the LLMModelProvider
 *   tree. Wrapping each one individually would require re-rendering the
 *   whole provider per surface and bloat the bundle.
 * - This hook makes a direct, auth-aware GET to /api/llm/models?enabled=true
 *   and returns a slim dropdown-friendly shape.
 *
 * Consumers receive:
 *   - models: { id, name, provider }[]   — empty array when loading / on error
 *   - isLoading: boolean
 *   - error: string | null
 *   - refresh: () => void
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import type { LLMModelConfig } from '@/lib/llm-types'

export interface JutsuModelOption {
  readonly id: string
  readonly name: string
  readonly provider: string
}

export interface UseJutsuModelsResult {
  readonly models: readonly JutsuModelOption[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly refresh: () => void
}

function toOption(model: LLMModelConfig): JutsuModelOption {
  return {
    id: model.id,
    name: model.name,
    provider: String(model.provider),
  }
}

export function useJutsuModels(): UseJutsuModelsResult {
  const [models, setModels] = useState<readonly JutsuModelOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => {
    setTick((t) => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (!(await canAccessProtectedApi())) {
          if (!cancelled) setModels([])
          return
        }

        const res = await fetchWithAuth('/api/llm/models?enabled=true')
        if (!res.ok) {
          throw new Error(`Failed to load models (${res.status})`)
        }
        const data = (await res.json()) as LLMModelConfig[]
        if (cancelled) return
        setModels(Array.isArray(data) ? data.map(toOption) : [])
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load models')
        setModels([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [tick])

  return { models, isLoading, error, refresh }
}
