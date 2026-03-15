'use client'

/**
 * File: BenchmarkPanel.tsx
 * Purpose: Benchmark comparison panel for LLM Dashboard — DojoLM Benchmark v1
 * Story: H20.5
 * Index:
 * - CATEGORIES constant (line 18)
 * - MOCK_MODELS data (line 30)
 * - scoreColor helper (line 60)
 * - BenchmarkPanel component (line 68)
 */

import { useState, useCallback } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Download, Trophy, BarChart3 } from 'lucide-react'

// MOCK DATA — replace with live data when backend is available

const CATEGORIES = [
  'Prompt Injection',
  'Jailbreak',
  'Data Exfil',
  'Hallucination',
  'Bias Detection',
  'Tool Misuse',
  'Context Overflow',
  'Compliance',
] as const

interface ModelBenchmark {
  name: string
  scores: Record<string, number>
  overall: number
  rank: number
}

const MOCK_MODELS: ModelBenchmark[] = [
  {
    name: 'GPT-4',
    scores: {
      'Prompt Injection': 82, 'Jailbreak': 75, 'Data Exfil': 88,
      'Hallucination': 70, 'Bias Detection': 65, 'Tool Misuse': 91,
      'Context Overflow': 78, 'Compliance': 85,
    },
    overall: 79,
    rank: 2,
  },
  {
    name: 'Claude 3.5',
    scores: {
      'Prompt Injection': 90, 'Jailbreak': 85, 'Data Exfil': 92,
      'Hallucination': 82, 'Bias Detection': 78, 'Tool Misuse': 88,
      'Context Overflow': 84, 'Compliance': 91,
    },
    overall: 86,
    rank: 1,
  },
  {
    name: 'Gemini 1.5',
    scores: {
      'Prompt Injection': 72, 'Jailbreak': 68, 'Data Exfil': 80,
      'Hallucination': 58, 'Bias Detection': 62, 'Tool Misuse': 74,
      'Context Overflow': 70, 'Compliance': 76,
    },
    overall: 70,
    rank: 3,
  },
]

function scoreColor(score: number): string {
  if (score > 80) return 'text-[var(--status-allow)] bg-[var(--status-allow)]/10'
  if (score >= 60) return 'text-[var(--severity-medium)] bg-[var(--severity-medium)]/10'
  return 'text-[var(--status-block)] bg-[var(--status-block)]/10'
}

export function BenchmarkPanel() {
  const [exporting, setExporting] = useState(false)

  const handleExport = useCallback(() => {
    setExporting(true)
    // Mock export — no-op
    setTimeout(() => setExporting(false), 1200)
  }, [])

  const sorted = [...MOCK_MODELS].sort((a, b) => a.rank - b.rank)

  return (
    <GlowCard glow="subtle" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-[var(--bu-electric)]" aria-hidden="true" />
          <div>
            <h3 className="text-base font-semibold">DojoLM Benchmark v1</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {CATEGORIES.length} categories &middot; weighted scoring
            </p>
          </div>
        </div>
        <Button variant="default" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4" aria-hidden="true" />
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto -mx-2">
        <table className="w-full text-sm border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">#</th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Model</th>
              {CATEGORIES.map((cat) => (
                <th key={cat} className="text-center py-2 px-1.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {cat.length > 12 ? cat.slice(0, 10) + '...' : cat}
                </th>
              ))}
              <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Overall</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((model) => (
              <tr key={model.name} className="border-b border-[var(--border-subtle)]/50 hover:bg-[var(--overlay-subtle)]">
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-1">
                    {model.rank === 1 && <Trophy className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />}
                    <span className="text-xs text-muted-foreground">{model.rank}</span>
                  </div>
                </td>
                <td className="py-2.5 px-2 font-medium whitespace-nowrap">{model.name}</td>
                {CATEGORIES.map((cat) => {
                  const score = model.scores[cat]
                  return (
                    <td key={cat} className="py-2.5 px-1.5 text-center">
                      <span className={cn('text-xs font-mono px-1.5 py-0.5 rounded', scoreColor(score))}>
                        {score}
                      </span>
                    </td>
                  )
                })}
                <td className="py-2.5 px-2 text-center">
                  <span className={cn(
                    'text-sm font-bold px-2 py-0.5 rounded',
                    scoreColor(model.overall)
                  )}>
                    {model.overall}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlowCard>
  )
}
