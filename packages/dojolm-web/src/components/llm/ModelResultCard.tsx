'use client'

/**
 * File: ModelResultCard.tsx
 * Purpose: Aggregated result card per model with belt badge, score, vuln accordion
 * Story: NODA-3 Story 6.2
 * Index:
 * - AggregatedModelResult type (line 16)
 * - aggregateByModel helper (line 28)
 * - ModelResultCard component (line 56)
 * - VulnAccordion sub-component (line 140)
 */

import { memo, useMemo, useState, useCallback } from 'react'
import type { LLMTestExecution, LLMModelConfig } from '@/lib/llm-types'
import { BeltBadge, getBeltRank } from '@/components/ui/BeltBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'

export interface AggregatedModelResult {
  modelId: string
  modelName: string
  provider: string
  latestScore: number
  avgScore: number
  testCount: number
  passedCount: number
  failedCount: number
  lastTestedAt: string
  executions: LLMTestExecution[]
  vulnerabilities: Array<{ category: string; severity: string; count: number }>
}

/** Aggregate raw executions into per-model results */
export function aggregateByModel(
  executions: LLMTestExecution[],
  models: LLMModelConfig[]
): AggregatedModelResult[] {
  const modelMap = new Map<string, LLMTestExecution[]>()

  for (const exec of executions) {
    const list = modelMap.get(exec.modelConfigId) ?? []
    list.push(exec)
    modelMap.set(exec.modelConfigId, list)
  }

  const results: AggregatedModelResult[] = []

  for (const [modelId, execs] of modelMap.entries()) {
    const model = models.find(m => m.id === modelId)
    const sorted = [...execs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    const scores = sorted.filter(e => e.status === 'completed').map(e => e.resilienceScore)
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0
    const latestScore = scores[0] ?? 0

    // Build vulnerability summary
    const vulnMap = new Map<string, { severity: string; count: number }>()
    for (const exec of sorted) {
      for (const cat of exec.categoriesFailed) {
        const existing = vulnMap.get(cat)
        if (existing) {
          existing.count++
        } else {
          const severity = exec.scanResult?.severity ?? 'WARNING'
          vulnMap.set(cat, { severity, count: 1 })
        }
      }
    }

    results.push({
      modelId,
      modelName: model?.name ?? modelId,
      provider: model?.provider ?? 'unknown',
      latestScore,
      avgScore,
      testCount: sorted.length,
      passedCount: sorted.filter(e => e.categoriesFailed.length === 0 && e.status === 'completed').length,
      failedCount: sorted.filter(e => e.categoriesFailed.length > 0).length,
      lastTestedAt: sorted[0]?.timestamp ?? '',
      executions: sorted,
      vulnerabilities: Array.from(vulnMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      })),
    })
  }

  // Sort by latest score descending
  return results.sort((a, b) => b.latestScore - a.latestScore)
}

interface ModelResultCardProps {
  result: AggregatedModelResult
  onDownload?: (modelId: string) => void
  onRetest?: (modelId: string) => void
}

export const ModelResultCard = memo(function ModelResultCard({
  result,
  onDownload,
  onRetest,
}: ModelResultCardProps) {
  const [expanded, setExpanded] = useState(false)
  const belt = useMemo(() => getBeltRank(result.latestScore), [result.latestScore])

  const toggleExpand = useCallback(() => setExpanded(prev => !prev), [])

  const passRate = result.testCount > 0
    ? Math.round((result.passedCount / result.testCount) * 100)
    : 0

  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${belt.color} 30%, var(--border))` }}
    >
      {/* Belt accent stripe */}
      <div className="h-1" style={{ backgroundColor: belt.color }} />

      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BeltBadge score={result.latestScore} size="md" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold truncate">{result.modelName}</h3>
              <p className="text-xs text-muted-foreground capitalize">{result.provider}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-bold tabular-nums" style={{ color: belt.color }}>
              {result.latestScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Score progress bar */}
        <Progress value={result.latestScore} className="h-1.5" />

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{result.testCount} tests</span>
          <span className="text-[var(--success)]">{result.passedCount} passed</span>
          {result.failedCount > 0 && (
            <span className="text-[var(--danger)]">{result.failedCount} failed</span>
          )}
          <span>Avg: {result.avgScore}/100</span>
          {result.lastTestedAt && (
            <span className="ml-auto">
              {new Date(result.lastTestedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => onDownload(result.modelId)}
              aria-label={`Download results for ${result.modelName}`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download
            </Button>
          )}
          {onRetest && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 gap-1 text-xs"
              onClick={() => onRetest(result.modelId)}
              aria-label={`Re-test ${result.modelName}`}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Re-Test
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs ml-auto"
            onClick={toggleExpand}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {expanded ? 'Less' : 'Details'}
          </Button>
        </div>

        {/* Expanded: Vulnerability accordion */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            {result.vulnerabilities.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--danger)]" aria-hidden="true" />
                  Vulnerabilities ({result.vulnerabilities.length})
                </h4>
                {result.vulnerabilities.map(vuln => (
                  <div
                    key={vuln.category}
                    className="flex items-center justify-between px-3 py-1.5 rounded bg-[var(--bg-secondary)] text-xs"
                  >
                    <span className="capitalize">{vuln.category}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={vuln.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                        className="text-xs px-1.5 py-0"
                      >
                        {vuln.severity}
                      </Badge>
                      <span className="text-muted-foreground">{vuln.count}×</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--success)]">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                No vulnerabilities detected
              </div>
            )}

            {/* Recent test history */}
            <div className="space-y-1">
              <h4 className="text-xs font-semibold">Recent Tests</h4>
              <ScrollArea className="max-h-40">
                {result.executions.slice(0, 10).map(exec => (
                  <div
                    key={exec.id}
                    className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground"
                  >
                    <span className="truncate max-w-48">{exec.prompt?.slice(0, 60)}...</span>
                    <span className="tabular-nums font-mono shrink-0">
                      {exec.resilienceScore}/100
                    </span>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
