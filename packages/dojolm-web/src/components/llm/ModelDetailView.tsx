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

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { BeltBadge, getBeltRank } from '@/components/ui/BeltBadge'
import { X, BarChart3, Clock, FileText, GraduationCap, Activity, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Download, BrainCircuit } from 'lucide-react'
import { ExpandableCard } from '@/components/ui/ExpandableCard'
import { SafeCodeBlock } from '@/components/ui/SafeCodeBlock'
import type { AggregatedModel, TestExecution } from './JutsuAggregation'
import { calculateTrend } from './JutsuAggregation'
import { useBehavioralAnalysis } from '@/lib/contexts'

type DetailTab = 'overview' | 'history' | 'deliverables' | 'training' | 'metrics'

interface ModelDetailViewProps {
  model: AggregatedModel
  onClose: () => void
  /** Run OBL behavioral analysis for this model. Displayed in the Training tab. */
  onAnalyze?: (modelId: string, modelName: string) => void
}

export function ModelDetailView({ model, onClose, onAnalyze }: ModelDetailViewProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')
  const belt = getBeltRank(model.latestScore)
  const trend = calculateTrend(model.scoreTrend)

  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      // Focus trap: keep Tab/Shift+Tab within dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    document.addEventListener('keydown', handler)
    // Move focus into dialog on open
    const closeBtn = dialogRef.current?.querySelector<HTMLElement>('button[aria-label]')
    closeBtn?.focus()
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
          'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-[var(--transition-normal)]',
        )}
        ref={dialogRef}
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
            <TabsTrigger value="overview" className="gap-1 text-xs min-h-[44px]">
              <BarChart3 className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-xs min-h-[44px]">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="deliverables" className="gap-1 text-xs min-h-[44px]">
              <FileText className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="gap-1 text-xs min-h-[44px]">
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-1 text-xs min-h-[44px]">
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
              <TrainingTab model={model} onAnalyze={onAnalyze} />
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

      {/* Weaknesses — expandable per vulnerability */}
      {model.vulnerabilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">TOP VULNERABILITIES</h4>
          <div className="space-y-1.5">
            {model.vulnerabilities.slice(0, 5).map(v => (
              <ExpandableCard
                key={v.category}
                title={v.category}
                badge={<Badge variant="outline" className="text-[10px]">{v.count}x</Badge>}
                headerClassName="py-2"
              >
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3 w-3 text-[var(--severity-high)]" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">
                      Detected {v.count} time{v.count !== 1 ? 's' : ''} across test runs
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <p>Category: {v.category}</p>
                    <p>Run detailed tests from the LLM Dashboard to see full evidence.</p>
                  </div>
                </div>
              </ExpandableCard>
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
          'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
        )}
        aria-label="Filter test history"
      />
      <div className="space-y-1.5">
        {filtered.length > 0 ? filtered.map(exec => (
          <ExpandableCard
            key={exec.id}
            title={`${exec.passed}/${exec.totalTests} passed — Score ${exec.score}`}
            subtitle={formatDate(exec.timestamp, true)}
            badge={exec.batchId ? <Badge variant="outline" className="text-[10px] shrink-0">Batch</Badge> : undefined}
            headerClassName="py-2"
          >
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-muted-foreground">Score</p>
                  <p className="text-sm font-bold" style={{ color: getBeltRank(exec.score).color }}>{exec.score}</p>
                </div>
                <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-muted-foreground">Pass Rate</p>
                  <p className="text-sm font-bold">{exec.passRate}%</p>
                </div>
                <div className="p-2 rounded bg-[var(--bg-tertiary)]">
                  <p className="text-[10px] text-muted-foreground">Failed</p>
                  <p className="text-sm font-bold text-[var(--danger)]">{exec.failed}</p>
                </div>
              </div>
              {exec.categoriesFailed.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Failed Categories:</p>
                  <div className="flex flex-wrap gap-1">
                    {exec.categoriesFailed.map(cat => (
                      <Badge key={cat} variant="outline" className="text-[10px]">
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ExpandableCard>
        )) : (
          <p className="text-sm text-muted-foreground text-center py-8">No test history found</p>
        )}
      </div>
    </div>
  )
}

function DeliverablesTab({ model }: { model: AggregatedModel }) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [bulkDownloading, setBulkDownloading] = useState(false)

  const generateJSON = useCallback(() => {
    return JSON.stringify({
      model: { id: model.modelId, name: model.modelName, provider: model.provider },
      summary: {
        latestScore: model.latestScore,
        avgScore: model.avgScore,
        bestScore: model.bestScore,
        worstScore: model.worstScore,
        passRate: model.passRate,
        totalExecutions: model.totalExecutions,
        totalTests: model.totalTests,
      },
      vulnerabilities: model.vulnerabilities,
      executions: model.executions.map(e => ({
        id: e.id,
        score: e.score,
        passRate: e.passRate,
        totalTests: e.totalTests,
        passed: e.passed,
        failed: e.failed,
        categoriesFailed: e.categoriesFailed,
        timestamp: e.timestamp,
        batchId: e.batchId ?? null,
      })),
      generatedAt: new Date().toISOString(),
    }, null, 2)
  }, [model])

  const generateCSV = useCallback(() => {
    // Sanitize CSV cell values to prevent formula injection (=, +, -, @, tab, CR)
    const sanitizeCell = (val: string) => {
      if (/^[=+\-@\t\r]/.test(val)) return `'${val}`
      return val
    }
    const header = 'Execution ID,Score,Pass Rate,Total Tests,Passed,Failed,Categories Failed,Timestamp,Batch ID'
    const rows = model.executions.map(e =>
      [e.id, e.score, e.passRate, e.totalTests, e.passed, e.failed,
       `"${sanitizeCell(e.categoriesFailed.join('; '))}"`, e.timestamp, e.batchId ?? ''].join(',')
    )
    return [header, ...rows].join('\n')
  }, [model])

  const generateMarkdown = useCallback(() => {
    const lines = [
      `# Security Test Report — ${model.modelName}`,
      `**Provider:** ${model.provider}`,
      `**Generated:** ${new Date().toISOString()}`,
      '',
      '## Summary',
      '| Metric | Value |',
      '|--------|-------|',
      `| Latest Score | ${model.latestScore} |`,
      `| Average Score | ${model.avgScore} |`,
      `| Best Score | ${model.bestScore} |`,
      `| Pass Rate | ${model.passRate}% |`,
      `| Total Executions | ${model.totalExecutions} |`,
      '',
      '## Vulnerabilities',
      ...model.vulnerabilities.map(v => `- **${v.category}**: ${v.count} occurrence(s)`),
      '',
      '## Test History',
      '| Date | Score | Pass Rate | Failed Categories |',
      '|------|-------|-----------|-------------------|',
      ...model.executions.map(e =>
        `| ${formatDate(e.timestamp)} | ${e.score} | ${e.passRate}% | ${e.categoriesFailed.join(', ') || 'None'} |`
      ),
    ]
    return lines.join('\n')
  }, [model])

  const generateSARIF = useCallback(() => {
    return JSON.stringify({
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'DojoLM TPI', version: '1.0.0', informationUri: 'https://blackunicorn.tech' } },
        results: model.vulnerabilities.map(v => ({
          ruleId: v.category.toLowerCase().replace(/\s+/g, '-'),
          message: { text: `${v.category}: ${v.count} finding(s) across test executions` },
          level: v.count >= 5 ? 'error' : v.count >= 2 ? 'warning' : 'note',
        })),
      }],
    }, null, 2)
  }, [model])

  const handleDownload = useCallback((format: string) => {
    setDownloading(format)
    try {
      let content: string
      let mimeType: string
      let ext: string
      switch (format) {
        case 'JSON': content = generateJSON(); mimeType = 'application/json'; ext = 'json'; break
        case 'CSV': content = generateCSV(); mimeType = 'text/csv'; ext = 'csv'; break
        case 'Markdown': content = generateMarkdown(); mimeType = 'text/markdown'; ext = 'md'; break
        case 'SARIF': content = generateSARIF(); mimeType = 'application/json'; ext = 'sarif.json'; break
        default: return
      }
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${model.modelName.replace(/[^\w.-]/g, '_')}-report.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setTimeout(() => setDownloading(null), 500)
    }
  }, [model.modelName, generateJSON, generateCSV, generateMarkdown, generateSARIF])

  const handleBulkDownload = useCallback(() => {
    setBulkDownloading(true)
    try {
      ;['JSON', 'CSV', 'Markdown', 'SARIF'].forEach((fmt, i) => {
        setTimeout(() => handleDownload(fmt), i * 200)
      })
    } finally {
      setTimeout(() => setBulkDownloading(false), 1200)
    }
  }, [handleDownload])

  return (
    <div className="space-y-4">
      {/* H12.1: Formats are JSON/CSV/Markdown/SARIF. PDF omitted per SEC-14 (no headless browser rendering). */}
      <p className="text-sm text-muted-foreground">
        Download reports for {model.modelName} in various formats.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {['JSON', 'CSV', 'Markdown', 'SARIF'].map(format => (
          <button
            key={format}
            onClick={() => handleDownload(format)}
            disabled={downloading === format}
            className={cn(
              'p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]',
              'hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
              'flex flex-col items-center gap-2 min-h-[72px]',
              downloading === format && 'opacity-60 pointer-events-none',
            )}
            aria-label={`Download ${format} report for ${model.modelName}`}
          >
            <Download className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <span className="text-xs font-medium">
              {downloading === format ? 'Downloading...' : format}
            </span>
          </button>
        ))}
      </div>
      <button
        onClick={handleBulkDownload}
        disabled={bulkDownloading}
        className={cn(
          'w-full p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]',
          'hover:border-[var(--dojo-primary)]/40 motion-safe:transition-colors',
          'flex items-center justify-center gap-2 min-h-[44px]',
          bulkDownloading && 'opacity-60 pointer-events-none',
        )}
        aria-label={`Download all reports for ${model.modelName}`}
      >
        <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs font-medium">
          {bulkDownloading ? 'Downloading All...' : 'Download All'}
        </span>
      </button>
      <p className="text-[10px] text-muted-foreground text-center">
        Reports aggregate {model.totalExecutions} test executions across {model.totalTests} total test runs
      </p>
    </div>
  )
}

function TrainingTab({ model, onAnalyze }: { model: AggregatedModel; onAnalyze?: (modelId: string, modelName: string) => void }) {
  const { getResult, isAnalyzing } = useBehavioralAnalysis()
  const oblResult = getResult(model.modelId)
  const hasOBLData = !!(oblResult?.alignment || oblResult?.robustness || oblResult?.geometry || oblResult?.refusalDepth)

  return (
    <div className="space-y-4">
      {/* OBL Behavioral Analysis */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-3">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          OBL Behavioral Analysis
        </p>
        {hasOBLData ? (
          <ul className="space-y-0.5 text-xs text-muted-foreground list-none">
            {oblResult?.alignment && <li>✓ Alignment imprint analyzed</li>}
            {oblResult?.robustness && <li>✓ Defense robustness analyzed</li>}
            {oblResult?.geometry && <li>✓ Concept geometry analyzed</li>}
            {oblResult?.refusalDepth && <li>✓ Refusal depth profiled</li>}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">
            No OBL data for {model.modelName} yet.
          </p>
        )}
        {onAnalyze && (
          <button
            onClick={() => onAnalyze(model.modelId, model.modelName)}
            disabled={isAnalyzing}
            className={cn(
              'flex items-center gap-2 px-3 py-2 w-full rounded-lg border text-xs font-medium',
              'border-[var(--dojo-primary)] text-[var(--dojo-primary)]',
              'hover:bg-[var(--dojo-primary)]/10 motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
              isAnalyzing && 'opacity-50 pointer-events-none',
            )}
            aria-label={`Run OBL analysis for ${model.modelName}`}
          >
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
            {isAnalyzing ? 'Analyzing...' : hasOBLData ? 'Re-analyze with OBL' : 'Analyze with OBL'}
          </button>
        )}
      </div>

      {/* Hardening Sessions placeholder */}
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <GraduationCap className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
        <p className="text-sm font-medium">Hardening Sessions</p>
        <p className="text-xs text-muted-foreground mt-1">
          No hardening data available yet for {model.modelName}.
          Run adversarial training sessions from the Atemi Lab to populate this view.
        </p>
      </div>
    </div>
  )
}

function ComparisonBar({ label, value, average, max, suffix = '' }: { label: string; value: number; average: number; max: number; suffix?: string }) {
  const safeMax = max > 0 ? max : 100
  const valuePct = Math.min((value / safeMax) * 100, 100)
  const avgPct = Math.min((average / safeMax) * 100, 100)
  const delta = value - average
  const deltaColor = delta >= 0 ? 'var(--success)' : 'var(--danger)'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums">
          {value}{suffix}
          <span className="ml-1.5 text-muted-foreground">avg: {average}{suffix}</span>
          <span className="ml-1" style={{ color: deltaColor }}>({delta >= 0 ? '+' : ''}{delta}{suffix})</span>
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-[var(--bg-tertiary)]">
        <div className="absolute h-full rounded-full bg-[var(--dojo-primary)] motion-safe:transition-all" style={{ width: `${valuePct}%` }} />
        <div className="absolute top-0 h-full w-0.5 bg-[var(--warning)]" style={{ left: `${avgPct}%` }} title={`Platform average: ${average}${suffix}`} />
      </div>
    </div>
  )
}

function MetricsTab({ model }: { model: AggregatedModel }) {
  // Mock platform averages for comparison
  const platformAvg = useMemo(() => ({
    score: 72,
    passRate: 78,
    totalExecutions: 15,
  }), [])

  return (
    <div className="space-y-5">
      <h4 className="text-xs font-semibold text-muted-foreground">PERFORMANCE METRICS</h4>

      {/* Stats grid — existing 4 cards */}
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

      {/* Platform Comparison - NEW */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">PLATFORM COMPARISON</h4>
        <div className="space-y-2">
          <ComparisonBar label="Score" value={model.latestScore} average={platformAvg.score} max={100} />
          <ComparisonBar label="Pass Rate" value={model.passRate} average={platformAvg.passRate} max={100} suffix="%" />
          <ComparisonBar label="Executions" value={model.totalExecutions} average={platformAvg.totalExecutions} max={Math.max(model.totalExecutions, platformAvg.totalExecutions) * 1.2} />
        </div>
      </div>

      {/* Score Trend Over Time - NEW */}
      {model.scoreTrend.length > 1 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">SCORE TREND</h4>
          <div className="flex items-end gap-1 h-20 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            {model.scoreTrend.map((score, i) => {
              const height = Math.max((score / 100) * 60, 4)
              const isLast = i === model.scoreTrend.length - 1
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] text-muted-foreground tabular-nums">{score}</span>
                  <div
                    className="w-full rounded-t-sm motion-safe:transition-all"
                    style={{
                      height: `${height}px`,
                      backgroundColor: isLast ? 'var(--dojo-primary)' : 'color-mix(in srgb, var(--dojo-primary) 40%, transparent)',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time-to-Fix Metrics - NEW (mock data) */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">TIME-TO-FIX ESTIMATES</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
            <p className="text-xs text-muted-foreground">Avg Fix Time</p>
            <p className="text-lg font-bold">4.2d</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
            <p className="text-xs text-muted-foreground">Open Findings</p>
            <p className="text-lg font-bold text-[var(--severity-high)]">{model.vulnerabilities.reduce((s, v) => s + v.count, 0)}</p>
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
            <p className="text-xs text-muted-foreground">Fix Rate</p>
            <p className="text-lg font-bold text-[var(--success)]">67%</p>
          </div>
        </div>
      </div>

      {/* Category Breakdown - existing vulnerability distribution enhanced */}
      {model.vulnerabilities.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">CATEGORY BREAKDOWN</h4>
          <div className="space-y-2">
            {model.vulnerabilities.map(v => {
              const maxCount = model.vulnerabilities[0].count
              const safeMax = maxCount > 0 ? maxCount : 1
              const pct = (v.count / safeMax) * 100
              return (
                <div key={v.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{v.category}</span>
                    <span className="text-muted-foreground tabular-nums">{v.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-tertiary)]">
                    <div className="h-full rounded-full bg-[var(--severity-high)] motion-safe:transition-all" style={{ width: `${pct}%` }} />
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
