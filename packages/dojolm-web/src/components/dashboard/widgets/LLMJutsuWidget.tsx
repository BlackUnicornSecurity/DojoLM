'use client'

/**
 * File: LLMJutsuWidget.tsx
 * Purpose: LLM Jutsu dashboard widget — model count, belt distribution, recent tests
 * Story: NODA-3 Story 11.4
 * Index:
 * - LLMJutsuWidget component (line 12)
 */

import { useState, useEffect, useMemo } from 'react'
import { WidgetCard } from '../WidgetCard'
import { useNavigation } from '@/lib/NavigationContext'
import { ScrollText, ExternalLink, FlaskConical } from 'lucide-react'
import { getBeltRank } from '@/components/ui/BeltBadge'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ModelSummary {
  name: string
  score: number
}

/** Belt distribution counts */
interface BeltCounts {
  Black: number
  Brown: number
  Blue: number
  Green: number
  Orange: number
  Yellow: number
  White: number
}

const BELT_COLORS: Record<string, string> = {
  Black: 'var(--belt-black)', Brown: 'var(--belt-brown)', Blue: 'var(--belt-blue)',
  Green: 'var(--belt-green)', Orange: 'var(--belt-orange)', Yellow: 'var(--belt-yellow)',
  White: 'var(--belt-white)',
}

export function LLMJutsuWidget() {
  const { setActiveTab } = useNavigation()
  const [models, setModels] = useState<ModelSummary[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchWithAuth('/api/llm/results')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && Array.isArray(data.results)) {
          // Deduplicate by model name, keep latest
          const byModel = new Map<string, ModelSummary>()
          for (const r of data.results) {
            const name = String(r.modelName ?? r.modelId ?? 'Unknown')
            const score = typeof r.resilienceScore === 'number' ? r.resilienceScore : 0
            if (!byModel.has(name)) {
              byModel.set(name, { name, score })
            }
          }
          setModels(Array.from(byModel.values()))
        }
      } catch {
        // Demo fallback
        setModels([
          { name: 'GPT-4', score: 78 },
          { name: 'Claude 3.5', score: 91 },
          { name: 'Gemini 1.5', score: 72 },
          { name: 'Mistral Large', score: 65 },
          { name: 'Llama 3', score: 58 },
        ])
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const beltCounts = useMemo<BeltCounts>(() => {
    const counts: BeltCounts = { Black: 0, Brown: 0, Blue: 0, Green: 0, Orange: 0, Yellow: 0, White: 0 }
    for (const m of models) {
      const belt = getBeltRank(m.score)
      counts[belt.short as keyof BeltCounts] = (counts[belt.short as keyof BeltCounts] || 0) + 1
    }
    return counts
  }, [models])

  const totalModels = models.length

  return (
    <WidgetCard
      title="LLM Jutsu"
      actions={
        <button
          onClick={() => setActiveTab('llm')}
          className="text-xs text-[var(--dojo-primary)] hover:underline flex items-center gap-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
          aria-label="Open LLM Jutsu"
        >
          Open
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Model Count */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <FlaskConical className="h-4 w-4 text-purple-500 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-xs text-muted-foreground">Models Tested</p>
            <p className="text-lg font-bold">{totalModels}</p>
          </div>
        </div>

        {/* Belt Distribution Bar */}
        {totalModels > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Belt Distribution</p>
            <div className="flex h-4 rounded-full overflow-hidden" aria-label="Belt distribution chart">
              {Object.entries(beltCounts).map(([belt, count]) => {
                if (count === 0) return null
                const pct = (count / totalModels) * 100
                return (
                  <div
                    key={belt}
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: BELT_COLORS[belt] ?? 'var(--muted)',
                      minWidth: count > 0 ? '8px' : undefined,
                    }}
                    title={`${belt}: ${count}`}
                    aria-label={`${belt} belt: ${count} models`}
                  />
                )
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
              {Object.entries(beltCounts).map(([belt, count]) => {
                if (count === 0) return null
                return (
                  <div key={belt} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: BELT_COLORS[belt] }} aria-hidden="true" />
                    <span className="text-[10px] text-muted-foreground">{belt} ({count})</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
