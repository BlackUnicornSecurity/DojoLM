/**
 * File: ModelDetailView.tsx
 * Purpose: Detailed model analysis view with 5 sub-tabs
 * Story: NODA-3 Story 11.3
 * Index:
 * - DetailTab type (line 15)
 * - ModelDetailViewProps (line 17)
 * - ModelDetailView component (line 27)
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BeltBadge, getBeltRank } from '@/components/ui/BeltBadge'
import { X, BarChart3, Clock, FileText, GraduationCap, Activity, TrendingUp, TrendingDown, Minus, Shield } from 'lucide-react'
import type { AggregatedModel, TestExecution } from './JutsuAggregation'
import { calculateTrend } from './JutsuAggregation'

type DetailTab = 'overview' | 'history' | 'deliverables' | 'training' | 'metrics'

interface ModelDetailViewProps {
  model: AggregatedModel
  onClose: () => void
}

export function ModelDetailView({ model, onClose }: ModelDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const belt = getBeltRank(model.latestScore)
  const trend = calculateTrend(model.scoreTrend)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handler)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'relative w-full max-w-3xl max-h-[90vh] mx-0 sm:mx-4 overflow-hidden',
          'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-xl sm:rounded-xl shadow-lg',
          'flex flex-col',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-200',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${model.modelName} detail view`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
              backgroundColor: `color-mix(in srgb, ${belt.color} 15%, transparent)`,
            }}>
              <span className="text-lg font-bold" style={{ color: belt.color }}>{model.latestScore}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{model.modelName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                <BeltBadge score={model.latestScore} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label="Close model detail"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const valid: DetailTab[] = ['overview', 'history', 'deliverables', 'training', 'metrics']
            if (valid.includes(v as DetailTab)) setActiveTab(v as DetailTab)
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid grid-cols-5 w-full h-auto gap-1 bg-muted/50 p-1 mx-5 mt-2 max-w-[calc(100%-40px)]" aria-label="Model detail sections">
            <TabsTrigger value="overview" className="gap-1 text-xs min-h-[36px]">
              <BarChart3 className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs min-h-[36px]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-1 text-xs min-h-[36px]">
              <FileText className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-1 text-xs min-h-[36px]">
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1 text-xs min-h-[36px]">
              <Activity className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Metrics</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto p-5">
            <TabsContent value="overview" className="mt-0">
              <OverviewTab model={model} trend={trend} />
            </TabsContent>
            <TabsContent value="history" className="mt-0">
              <HistoryTab executions={model.executions} />
            </TabsContent>
            <TabsContent value="deliverables" className="mt-0">
              <DeliverablesTab model={model} />
            </TabsContent>
            <TabsContent value="training" className="mt-0">
              <TrainingTab model={model} />
            </TabsContent>
            <TabsContent value="metrics" className="mt-0">
              <MetricsTab model={model} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-Tab Components
// ---------------------------------------------------------------------------

function OverviewTab({ model, trend }: { model: AggregatedModel; trend: 'up' | 'down' | 'stable' }) {
  const belt = getBeltRank(model.latestScore)
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--muted-foreground)'

  return (
    <div className="space-y-5">
      {/* Score Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Latest</p>
          <p className="text-xl font-bold" style={{ color: belt.color }}>{model.latestScore}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Average</p>
          <p className="text-xl font-bold">{model.avgScore}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Best</p>
          <p className="text-xl font-bold text-[var(--success)]">{model.bestScore}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
          <p className="text-xs text-muted-foreground">Trend</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <TrendIcon className="h-5 w-5" style={{ color: trendColor }} aria-hidden="true" />
            <span className="text-sm font-medium capitalize" style={{ color: trendColor }}>{trend}</span>
          </div>
        </div>
      </div>

      {/* Score History (Sparkline) */}
      {model.scoreTrend.length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">SCORE HISTORY</h4>
          <div className="flex items-end gap-1 h-16 p-2 rounded-lg bg-[var(--bg-tertiary)]">
            {model.scoreTrend.map((score, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] text-muted-foreground tabular-nums">{score}</span>
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((score / 100) * 40, 4)}px`,
                    backgroundColor: i === model.scoreTrend.length - 1 ? belt.color : `color-mix(in srgb, ${belt.color} 40%, transparent)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {model.vulnerabilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">TOP VULNERABILITIES</h4>
          <div className="space-y-1.5">
            {model.vulnerabilities.slice(0, 5).map(v => (
              <div key={v.category} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-tertiary)]">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-[var(--severity-high)]" aria-hidden="true" />
                  <span className="text-xs">{v.category}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">{v.count}x</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HistoryTab({ executions }: { executions: TestExecution[] }) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return executions
    const s = filter.toLowerCase()
    return executions.filter(e =>
      e.modelName.toLowerCase().includes(s) ||
      (e.batchId && e.batchId.toLowerCase().includes(s))
    )
  }, [executions, filter])

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by name or batch ID..."
        className={cn(
          'w-full px-3 py-2 rounded-lg text-sm min-h-[40px]',
          'bg-[var(--bg-primary)] border border-[var(--border)]',
          'text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]',
        )}
        aria-label="Filter test history"
      />
      <div className="space-y-1.5">
        {filtered.length > 0 ? filtered.map(exec => (
          <div key={exec.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{
              backgroundColor: `color-mix(in srgb, ${getBeltRank(exec.score).color} 15%, transparent)`,
              color: getBeltRank(exec.score).color,
            }}>
              {exec.score}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">{exec.passed}/{exec.totalTests} passed</p>
              <p className="text-[10px] text-muted-foreground">{new Date(exec.timestamp).toLocaleString()}</p>
            </div>
            {exec.batchId && (
              <Badge variant="outline" className="text-[9px] shrink-0">Batch</Badge>
            )}
          </div>
        )) : (
          <p className="text-sm text-muted-foreground text-center py-8">No test history found</p>
        )}
      </div>
    </div>
  )
}

function DeliverablesTab({ model }: { model: AggregatedModel }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Download reports for {model.modelName} in various formats.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {['JSON', 'CSV', 'SARIF', 'PDF'].map(format => (
          <button
            key={format}
            className={cn(
              'p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]',
              'hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
              'flex flex-col items-center gap-2 min-h-[72px]',
            )}
            aria-label={`Download ${format} report for ${model.modelName}`}
          >
            <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium">{format}</span>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Reports aggregate {model.totalExecutions} test executions across {model.totalTests} total test runs
      </p>
    </div>
  )
}

function TrainingTab({ model }: { model: AggregatedModel }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <GraduationCap className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
      <p className="text-sm font-medium">Hardening Sessions</p>
      <p className="text-xs text-muted-foreground mt-1">
        No hardening data available yet for {model.modelName}.
        Run adversarial training sessions from the Atemi Lab to populate this view.
      </p>
    </div>
  )
}

function MetricsTab({ model }: { model: AggregatedModel }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold text-muted-foreground">PERFORMANCE METRICS</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-muted-foreground">Total Executions</p>
          <p className="text-lg font-bold">{model.totalExecutions}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-muted-foreground">Total Tests Run</p>
          <p className="text-lg font-bold">{model.totalTests}</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-muted-foreground">Pass Rate</p>
          <p className="text-lg font-bold">{model.passRate}%</p>
        </div>
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
          <p className="text-xs text-muted-foreground">Score Range</p>
          <p className="text-lg font-bold">{model.worstScore}—{model.bestScore}</p>
        </div>
      </div>

      {/* Vulnerability distribution */}
      {model.vulnerabilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">VULNERABILITY DISTRIBUTION</h4>
          <div className="space-y-1.5">
            {model.vulnerabilities.map(v => {
              const maxCount = model.vulnerabilities[0].count
              const pct = maxCount > 0 ? (v.count / maxCount) * 100 : 0
              return (
                <div key={v.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{v.category}</span>
                    <span className="text-muted-foreground tabular-nums">{v.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)]">
                    <div
                      className="h-full rounded-full bg-[var(--severity-high)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
