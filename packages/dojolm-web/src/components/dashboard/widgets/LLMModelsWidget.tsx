'use client'

/**
 * File: LLMModelsWidget.tsx
 * Purpose: Configured LLM models with provider, status dot, and Test button
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { cn } from '@/lib/utils'
import { Brain, Play, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ModelInfo {
  id: string
  name: string
  provider: string
  enabled: boolean
}

export function LLMModelsWidget() {
  const [models, setModels] = useState<ModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [testingId, setTestingId] = useState<string | null>(null)
  const { setActiveTab } = useNavigation()

  useEffect(() => {
    let cancelled = false
    async function fetchModels() {
      try {
        if (!(await canAccessProtectedApi())) {
          if (!cancelled) setModels([])
          return
        }

        const res = await fetchWithAuth('/api/llm/models')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setModels(Array.isArray(data) ? data : data.models ?? [])
        }
      } catch {
        // Silent failure
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchModels()
    return () => { cancelled = true }
  }, [])

  const handleTest = async (modelId: string) => {
    setTestingId(modelId)
    try {
      const res = await fetchWithAuth(`/api/llm/models/${encodeURIComponent(modelId)}/test`, { method: 'POST' })
      if (res.ok) {
        // Test succeeded — visual feedback via the status dot update
      }
    } catch {
      // Silent failure
    } finally {
      setTestingId(null)
    }
  }

  return (
    <WidgetCard
      title="LLM Models"
      actions={
        <button
          onClick={() => setActiveTab('llm')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="Manage LLM Models"
        >
          Manage
        </button>
      }
    >
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 motion-safe:animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        )}

        {!loading && models.length === 0 && (
          <div className="text-center py-4 space-y-2">
            <Brain className="w-8 h-8 mx-auto text-muted-foreground/50" aria-hidden="true" />
            <p className="text-xs text-muted-foreground">No models configured</p>
            <button
              onClick={() => setActiveTab('llm')}
              className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
            >
              Configure in LLM Dashboard
            </button>
          </div>
        )}

        {models.map(model => (
          <div key={model.id} className="flex items-center gap-2 py-1">
            <span className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              model.enabled ? 'bg-[var(--status-online)]' : 'bg-[var(--status-offline)]'
            )} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" title={model.name}>{model.name}</div>
              <div className="text-xs text-muted-foreground">{model.provider}</div>
            </div>
            <button
              onClick={() => handleTest(model.id)}
              disabled={testingId === model.id}
              className={cn(
                'p-1 rounded text-muted-foreground hover:text-foreground',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]',
                'disabled:opacity-50'
              )}
              aria-label={`Test ${model.name}`}
            >
              {testingId === model.id
                ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
                : <Play className="w-3.5 h-3.5" aria-hidden="true" />
              }
            </button>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
