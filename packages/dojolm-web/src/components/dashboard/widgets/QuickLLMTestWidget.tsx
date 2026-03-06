'use client'

/**
 * File: QuickLLMTestWidget.tsx
 * Purpose: Model dropdown + preset selector for one-click batch start
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'
import { cn } from '@/lib/utils'
import { Play, Loader2 } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ModelOption {
  id: string
  name: string
}

export function QuickLLMTestWidget() {
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModel, setSelectedModel] = useState('')
  const [preset, setPreset] = useState<'quick' | 'compliance' | 'full'>('quick')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      try {
        const res = await fetchWithAuth('/api/llm/models')
        if (res.ok) {
          const data = await res.json()
          const list: ModelOption[] = (Array.isArray(data) ? data : data.models ?? [])
            .filter((m: { enabled?: boolean }) => m.enabled)
            .map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))
          if (!cancelled) {
            setModels(list)
            if (list.length > 0) setSelectedModel(list[0].id)
          }
        }
      } catch {
        // Silent
      }
    }
    loadModels()
    return () => { cancelled = true }
  }, [])

  const handleRun = async () => {
    if (!selectedModel || running) return
    setRunning(true)
    setProgress(0)
    setProgress(10)
    try {
      const res = await fetchWithAuth('/api/llm/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelIds: [selectedModel], preset }),
      })
      if (res.ok) {
        setProgress(100)
      } else {
        setProgress(0)
      }
    } catch {
      setProgress(0)
    } finally {
      setRunning(false)
    }
  }

  return (
    <WidgetCard title="Quick LLM Test">
      <div className="space-y-2">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full px-2 py-1.5 text-xs bg-muted/50 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--dojo-primary)]"
          disabled={running || models.length === 0}
        >
          {models.length === 0 && <option value="">No models available</option>}
          {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <div className="flex gap-1" role="radiogroup" aria-label="Test preset">
          {(['quick', 'compliance', 'full'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              disabled={running}
              className={cn(
                'flex-1 px-2 py-1 text-xs font-medium rounded',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--dojo-primary)]',
                preset === p
                  ? 'bg-[var(--dojo-subtle)] text-[var(--dojo-primary)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
              role="radio"
              aria-checked={preset === p}
            >
              {p === 'quick' ? 'Quick (20)' : p === 'compliance' ? 'Bushido (8)' : 'Full (132)'}
            </button>
          ))}
        </div>

        <button
          onClick={handleRun}
          disabled={running || !selectedModel}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg',
            'bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-primary-hover)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
            'disabled:opacity-50'
          )}
        >
          {running
            ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" aria-hidden="true" />
            : <Play className="w-3 h-3" aria-hidden="true" />
          }
          Run Test
        </button>

        {progress > 0 && (
          <EnhancedProgress value={progress} max={100} color="primary" size="sm" />
        )}
      </div>
    </WidgetCard>
  )
}
