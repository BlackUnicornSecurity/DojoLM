'use client'

/**
 * File: ModelResultCard.tsx
 * Purpose: Aggregated result card per model with belt badge, score, evidence accordion, compliance badges
 * Story: NODA-3 Story 6.2, HAKONE H7.3 (evidence cards), H7.5 (compliance badges)
 * Index:
 * - ComplianceBadge interface (line 20)
 * - calculateBadges helper (line 26)
 * - AggregatedModelResult type (line 67)
 * - aggregateByModel helper (line 79)
 * - ModelResultCard component (line 108)
 * - FindingEvidence sub-component (line 200)
 */

import { memo, useMemo, useState, useCallback } from 'react'
import type { LLMTestExecution, LLMModelConfig } from '@/lib/llm-types'
import { BeltBadge, getBeltRank } from '@/components/ui/BeltBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ExpandableCard } from '@/components/ui/ExpandableCard'
import { SafeCodeBlock } from '@/components/ui/SafeCodeBlock'
import { cn, formatDate } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

/** Compliance badge derived from test execution data (H7.5) */
export interface ComplianceBadge {
  label: string
  color: string
  earned: boolean
}

/** Calculate compliance badges from aggregated model results — purely derived, no API calls */
export function calculateBadges(result: AggregatedModelResult): ComplianceBadge[] {
  const badges: ComplianceBadge[] = []

  // OWASP LLM Top 10 badge: earned when all tested OWASP categories pass (min 5 categories)
  const owaspCoverage = new Map<string, boolean>()
  for (const exec of result.executions) {
    if (exec.owaspCoverage) {
      for (const [cat, passed] of Object.entries(exec.owaspCoverage)) {
        const current = owaspCoverage.get(cat)
        // If any execution fails a category, it stays failed
        if (current === undefined || current) {
          owaspCoverage.set(cat, passed as boolean)
        }
      }
    }
  }
  const owaspTested = owaspCoverage.size
  const owaspPassed = Array.from(owaspCoverage.values()).filter(Boolean).length
  if (owaspTested >= 5 && owaspPassed === owaspTested) {
    badges.push({ label: 'OWASP LLM Top 10', color: '#4caf50', earned: true })
  }

  // Security Resilient badge: avg score >= 80 with zero failures
  if (result.avgScore >= 80 && result.failedCount === 0) {
    badges.push({ label: 'Security Resilient', color: '#2196f3', earned: true })
  }

  // Thoroughly Tested badge: 10+ test executions
  if (result.testCount >= 10) {
    badges.push({ label: 'Thoroughly Tested', color: '#9c27b0', earned: true })
  }

  return badges
}

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
  const badges = useMemo(() => calculateBadges(result), [result])

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
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-[var(--bg-quaternary)] flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <span className="text-[9px] font-bold text-[var(--bu-electric)]">
                    {result.provider.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 capitalize">{result.provider}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl font-bold tabular-nums" style={{ color: belt.color }}>
              {result.latestScore}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Score progress bar — color matches belt rank */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(result.latestScore, 100)}%`, backgroundColor: belt.color }}
          />
        </div>

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
              {formatDate(result.lastTestedAt)}
            </span>
          )}
        </div>

        {/* Compliance badges (H7.5) — server-derived, static CSS only */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid="compliance-badges">
            {badges.map(badge => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: badge.color }}
                aria-label={`Badge: ${badge.label}`}
              >
                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                {badge.label}
              </span>
            ))}
          </div>
        )}

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
              variant="outline"
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

        {/* Expanded: Findings with evidence (H7.3) */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t border-[var(--border)]" data-testid="model-result-details">
            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded bg-[var(--bg-secondary)] p-2">
                <p className="text-lg font-bold tabular-nums">{result.avgScore}</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
              <div className="rounded bg-[var(--bg-secondary)] p-2">
                <p className="text-lg font-bold tabular-nums">{passRate}%</p>
                <p className="text-xs text-muted-foreground">Pass Rate</p>
              </div>
              <div className="rounded bg-[var(--bg-secondary)] p-2">
                <p className="text-lg font-bold tabular-nums">{result.testCount}</p>
                <p className="text-xs text-muted-foreground">Total Runs</p>
              </div>
            </div>

            {/* Vulnerability findings with expandable evidence */}
            {result.vulnerabilities.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--danger)]" aria-hidden="true" />
                  Findings ({result.vulnerabilities.length})
                </h4>
                {result.vulnerabilities.map(vuln => {
                  // Collect evidence executions for this vulnerability category
                  const evidenceExecs = result.executions.filter(
                    exec => exec.categoriesFailed.includes(vuln.category)
                  ).slice(0, 5)

                  return (
                    <ExpandableCard
                      key={vuln.category}
                      title={vuln.category.replace(/_/g, ' ')}
                      subtitle={`${vuln.count} occurrence${vuln.count !== 1 ? 's' : ''}`}
                      badge={
                        <Badge
                          variant={vuln.severity === 'CRITICAL' ? 'destructive' : 'secondary'}
                          className="text-xs px-1.5 py-0"
                          data-testid={`severity-badge-${vuln.category}`}
                        >
                          {vuln.severity}
                        </Badge>
                      }
                      className="border-0 bg-[var(--bg-secondary)]"
                    >
                      <div className="space-y-2" data-testid={`finding-evidence-${vuln.category}`}>
                        <p className="text-xs text-muted-foreground">
                          Evidence from {evidenceExecs.length} test run{evidenceExecs.length !== 1 ? 's' : ''}:
                        </p>
                        {evidenceExecs.map(exec => (
                          <div key={exec.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <AlertTriangle className="h-3 w-3 text-[var(--danger)]" aria-hidden="true" />
                              <span className="text-muted-foreground">
                                Score: {exec.resilienceScore}/100 — {formatDate(exec.timestamp)}
                              </span>
                            </div>
                            {exec.response && (
                              <SafeCodeBlock
                                code={exec.response.slice(0, 500)}
                                maxLines={8}
                                className="text-xs"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </ExpandableCard>
                  )
                })}
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
