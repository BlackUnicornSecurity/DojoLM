/**
 * File: ComplianceCenter.tsx
 * Purpose: Main Bushido Book page with framework selector, overall score, gap summary, and sub-views
 * Story: S74, TPI-NODA-4.1
 * Index:
 * - FRAMEWORKS, COVERAGE_FRAMEWORKS constants
 * - ComplianceFrameworkData, ComplianceCenterData interfaces
 * - SubView, CoverageSubMode types
 * - ScoreMeter, FrameworkGapSummary components
 * - ComplianceCenter (main), CoveragePanel, CoverageDeltaView
 * - ComparisonView, OverviewPanel components
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  ClipboardList,
  BarChart3,
  Layers,
  ListChecks,
  GitCompareArrows,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { GapMatrix } from './GapMatrix'
import { AuditTrail } from './AuditTrail'
import { ComplianceChecklist } from './ComplianceChecklist'
import { FrameworkNavigator } from './FrameworkNavigator'
import { CoverageMap } from '@/components/coverage'
import { EnsoGauge } from '@/components/ui/EnsoGauge'
import { COVERAGE_DATA, OWASP_LLM_COVERAGE_DATA } from '@/lib/constants'
import { baissControlsToCoverageEntries } from '@/lib/data/baiss-framework'
import type { CoverageEntry } from '@/lib/types'

// --- Constants ---

const FRAMEWORKS = [
  { id: 'owasp-llm-top10', label: 'OWASP LLM Top 10', shortLabel: 'OWASP' },
  { id: 'nist-ai-600-1', label: 'NIST AI 600-1', shortLabel: 'NIST' },
  { id: 'mitre-atlas', label: 'MITRE ATLAS', shortLabel: 'ATLAS' },
  { id: 'iso-42001', label: 'ISO 42001', shortLabel: 'ISO' },
  { id: 'eu-ai-act', label: 'EU AI Act', shortLabel: 'EU AI' },
  { id: 'enisa', label: 'ENISA', shortLabel: 'ENISA' },
] as const

/** Framework options for the Coverage tab selector */
const COVERAGE_FRAMEWORKS = [
  { id: 'tpi', label: 'CrowdStrike TPI', shortLabel: 'TPI' },
  { id: 'owasp', label: 'OWASP LLM Top 10', shortLabel: 'OWASP' },
  { id: 'nist', label: 'NIST AI 600-1', shortLabel: 'NIST' },
  { id: 'mitre', label: 'MITRE ATLAS', shortLabel: 'ATLAS' },
  { id: 'iso', label: 'ISO 42001', shortLabel: 'ISO' },
  { id: 'eu-ai', label: 'EU AI Act', shortLabel: 'EU AI' },
  { id: 'enisa', label: 'ENISA', shortLabel: 'ENISA' },
  { id: 'baiss', label: 'BAISS', shortLabel: 'BAISS' },
] as const

type CoverageFrameworkId = (typeof COVERAGE_FRAMEWORKS)[number]['id']

type FrameworkId = (typeof FRAMEWORKS)[number]['id']

// --- Types ---

interface ComplianceFrameworkData {
  id: string
  name: string
  overallCoverage: number
  totalControls: number
  coveredControls: number
  gapControls: number
  partialControls: number
  lastAssessed: string
  controls?: ComplianceControlData[]
}

interface ComplianceControlData {
  id: string
  name: string
  status: 'covered' | 'partial' | 'gap'
  coverage: number
  /** Story 8.5: Whether coverage is auto-calculated from test data */
  autoCalculated?: boolean
  /** Story 8.5: Last test run timestamp */
  lastTestRun?: string
  /** Story 8.5: Test pass rate */
  testPassRate?: number
  /** Story 8.5: Confidence level */
  confidence?: 'high' | 'medium' | 'low'
  /** Story 8.5: Number of test cases covering this control */
  testCaseCount?: number
}

interface ComplianceCenterData {
  overallScore: number
  frameworks: ComplianceFrameworkData[]
  lastUpdated: string
}

type SubView = 'overview' | 'coverage' | 'gap-matrix' | 'audit-trail' | 'checklists' | 'navigator'

// --- Score Meter Component ---

// Compliance score thresholds for color coding
const SCORE_EXCELLENT = 90
const SCORE_GOOD = 75
const SCORE_FAIR = 50

// Coverage bar thresholds
const COVERAGE_HIGH = 80
const COVERAGE_MODERATE = 50

function ScoreMeter({ value, className }: { value: number; className?: string }) {
  const getColor = (v: number): string => {
    if (v >= SCORE_EXCELLENT) return 'var(--success, #22c55e)'
    if (v >= SCORE_GOOD) return 'var(--warning, #eab308)'
    if (v >= SCORE_FAIR) return 'var(--dojo-primary, #f97316)'
    return 'var(--danger, #ef4444)'
  }

  return (
    <EnsoGauge
      value={value}
      max={100}
      size={140}
      color={getColor(value)}
      label="Overall Score"
      className={className}
    />
  )
}

// --- Framework Gap Summary ---

function FrameworkGapSummary({
  framework,
  isSelected,
  onSelect,
}: {
  framework: ComplianceFrameworkData
  isSelected: boolean
  onSelect: () => void
}) {
  const gapCount = framework.gapControls + framework.partialControls

  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 rounded-md text-left',
        'motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
        isSelected
          ? 'bg-[var(--bg-quaternary)] border border-[var(--dojo-primary)]'
          : 'hover:bg-[var(--bg-secondary)] border border-transparent'
      )}
      aria-pressed={isSelected}
      aria-label={`${framework.name}: ${framework.overallCoverage}% coverage, ${gapCount} gaps`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="w-4 h-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--foreground)] truncate">
          {framework.name}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="text-xs font-mono text-muted-foreground">
          {framework.overallCoverage}%
        </span>
        {gapCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {gapCount}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            0
          </span>
        )}
      </div>
    </button>
  )
}

// --- Main Bushido Book ---

export default function ComplianceCenter() {
  const [data, setData] = useState<ComplianceCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>('owasp-llm-top10')
  const [subView, setSubView] = useState<SubView>('overview')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch('/api/compliance')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch compliance data')
        return res.json()
      })
      .then((apiData) => {
        if (cancelled) return
        // Normalize API response to our shape, preserve controls for Coverage tab
        const frameworks: ComplianceFrameworkData[] = (apiData.frameworks ?? []).map(
          (f: Record<string, unknown>) => {
            const controls = Array.isArray(f.controls)
              ? (f.controls as Record<string, unknown>[]).map((c) => ({
                  id: String(c.id ?? ''),
                  name: String(c.name ?? ''),
                  status: String(c.status ?? 'gap') as 'covered' | 'partial' | 'gap',
                  coverage: Number(c.coverage ?? 0),
                  autoCalculated: c.autoCalculated === true ? true : undefined,
                  lastTestRun: typeof c.lastTestRun === 'string' ? c.lastTestRun : undefined,
                  testPassRate: typeof c.testPassRate === 'number' ? c.testPassRate : undefined,
                  confidence: typeof c.confidence === 'string' && ['high', 'medium', 'low'].includes(c.confidence as string) ? c.confidence as 'high' | 'medium' | 'low' : undefined,
                  testCaseCount: typeof c.testCaseCount === 'number' ? c.testCaseCount : undefined,
                }))
              : undefined
            return {
              id: String(f.id ?? ''),
              name: String(f.name ?? ''),
              overallCoverage: Number(f.overallCoverage ?? 0),
              totalControls: controls ? controls.length : Number(f.totalControls ?? 0),
              coveredControls: controls
                ? controls.filter((c) => c.status === 'covered').length
                : Number(f.coveredControls ?? 0),
              gapControls: controls
                ? controls.filter((c) => c.status === 'gap').length
                : Number(f.gapControls ?? 0),
              partialControls: controls
                ? controls.filter((c) => c.status === 'partial').length
                : Number(f.partialControls ?? 0),
              lastAssessed: String(f.lastAssessed ?? ''),
              controls,
            }
          }
        )
        const overallScore =
          apiData.summary?.avgCoverage ??
          (frameworks.length > 0
            ? Math.round(frameworks.reduce((sum: number, f: ComplianceFrameworkData) => sum + f.overallCoverage, 0) / frameworks.length)
            : 0)

        setData({
          overallScore,
          frameworks,
          lastUpdated: String(apiData.lastUpdated ?? new Date().toISOString()),
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleFrameworkSelect = useCallback((id: FrameworkId) => {
    setSelectedFramework(id)
  }, [])

  const handleSubViewChange = useCallback((view: SubView) => {
    setSubView(view)
  }, [])

  // --- Loading state ---
  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-12"
        role="status"
        aria-label="Loading Bushido Book"
      >
        <div
          className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-[var(--dojo-primary)]"
          aria-hidden="true"
        />
        <span className="ml-3 text-muted-foreground">
          Loading compliance data...
        </span>
      </div>
    )
  }

  // --- Error state ---
  if (error || !data) {
    return (
      <div className="p-6 rounded-lg bg-[var(--danger)]/10" role="alert">
        <p className="text-[var(--danger)]">
          Error loading compliance data: {error}
        </p>
      </div>
    )
  }

  const selectedFw = data.frameworks.find((f) => f.id === selectedFramework) ?? data.frameworks[0]
  const totalGaps = data.frameworks.reduce((sum, f) => sum + f.gapControls + f.partialControls, 0)

  const subTabs: { id: SubView; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'coverage', label: 'Coverage', icon: Layers },
    { id: 'gap-matrix', label: 'Gap Matrix', icon: ClipboardList },
    { id: 'audit-trail', label: 'Audit Trail', icon: FileText },
    { id: 'checklists', label: 'Checklists', icon: ListChecks },
    { id: 'navigator', label: 'Navigator', icon: GitCompareArrows },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Bushido Book
        </h2>
        <span className="text-sm text-muted-foreground">
          Last updated: {data.lastUpdated}
        </span>
      </div>

      {/* Top Section: Score + Framework Selector + Gap Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Meter */}
        <Card className="lg:col-span-3">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <ScoreMeter value={data.overallScore} />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {data.frameworks.length} Frameworks
              </p>
              <p className="text-xs text-muted-foreground">
                {totalGaps} total gaps
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Framework Selector Tabs */}
        <Card className="lg:col-span-9">
          <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Framework Coverage
          </h3>

          {/* Framework selector tabs */}
          <Tabs value={selectedFramework} onValueChange={(v) => handleFrameworkSelect(v as FrameworkId)}>
            <TabsList aria-label="Compliance framework selector" className="flex flex-wrap h-auto gap-1 mb-4 bg-transparent border-b border-border pb-3">
              {FRAMEWORKS.map((fw) => (
                <TabsTrigger
                  key={fw.id}
                  value={fw.id}
                  className="data-[state=active]:bg-[var(--dojo-primary)] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <span className="hidden sm:inline">{fw.label}</span>
                  <span className="sm:hidden">{fw.shortLabel}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Per-framework gap list (shown for all tabs) */}
            {FRAMEWORKS.map((fw) => (
              <TabsContent key={fw.id} value={fw.id} className="mt-0">
                {data.frameworks.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No framework data available.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {data.frameworks.map((f) => (
                      <FrameworkGapSummary
                        key={f.id}
                        framework={f}
                        isSelected={f.id === fw.id}
                        onSelect={() => handleFrameworkSelect(f.id as FrameworkId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Sub-View Navigation */}
      <Card>
        <Tabs value={subView} onValueChange={(v) => handleSubViewChange(v as SubView)}>
          <TabsList aria-label="Compliance sub-view navigation" className="w-full justify-start h-auto bg-transparent border-b border-border rounded-none p-0">
            {subTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-[var(--dojo-primary)] data-[state=active]:text-[var(--dojo-primary)] data-[state=active]:shadow-none py-3 -mb-px"
                >
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          {/* Sub-view content */}
          <div className="p-4">
            <TabsContent value="overview" className="mt-0">
              <OverviewPanel framework={selectedFw} allFrameworks={data.frameworks} />
            </TabsContent>
            <TabsContent value="coverage" className="mt-0">
              <CoveragePanel frameworks={data.frameworks} />
            </TabsContent>
            <TabsContent value="gap-matrix" className="mt-0">
              <GapMatrix framework={selectedFramework} />
            </TabsContent>
            <TabsContent value="audit-trail" className="mt-0">
              <AuditTrail />
            </TabsContent>
            <TabsContent value="checklists" className="mt-0">
              <ComplianceChecklist />
            </TabsContent>
            <TabsContent value="navigator" className="mt-0">
              <FrameworkNavigator />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  )
}

// --- Coverage Panel (Story 4.1) ---

/** Maps compliance API framework IDs to coverage framework selector IDs */
const COMPLIANCE_TO_COVERAGE_ID: Record<string, CoverageFrameworkId> = {
  'owasp-llm': 'owasp',
  'nist-ai-rmf': 'nist',
  'mitre-atlas': 'mitre',
  'iso-42001': 'iso',
  'eu-ai-act': 'eu-ai',
  'enisa-ai': 'enisa',
}

/** Converts compliance API controls to CoverageEntry format for CoverageMap.
 *  pre = 60% of post: approximates baseline coverage before TPI implementation. */
function controlsToCoverageEntries(controls: ComplianceControlData[]): CoverageEntry[] {
  const PRE_TPI_RATIO = 0.6
  return controls.map((c) => ({
    category: `${c.id}: ${c.name}`,
    pre: Math.round(c.coverage * PRE_TPI_RATIO),
    post: c.coverage,
    stories: c.id,
    gap: c.status === 'gap',
  }))
}

type CoverageSubMode = 'coverage' | 'comparison' | 'changes'

function CoveragePanel({ frameworks }: { frameworks: ComplianceFrameworkData[] }) {
  const [selectedCovFw, setSelectedCovFw] = useState<CoverageFrameworkId>('tpi')
  const [subMode, setSubMode] = useState<CoverageSubMode>('coverage')

  /** Build a lookup from compliance API framework ID → controls */
  const controlsByFramework = useMemo(() => {
    const map: Record<string, ComplianceControlData[]> = {}
    for (const fw of frameworks) {
      const covId = COMPLIANCE_TO_COVERAGE_ID[fw.id]
      if (covId && fw.controls) {
        map[covId] = fw.controls
      }
    }
    return map
  }, [frameworks])

  /** Returns CoverageEntry[] for the selected coverage framework */
  const coverageDataForFramework = useMemo((): CoverageEntry[] => {
    if (selectedCovFw === 'tpi') return COVERAGE_DATA
    if (selectedCovFw === 'owasp') return OWASP_LLM_COVERAGE_DATA
    if (selectedCovFw === 'baiss') return baissControlsToCoverageEntries()
    const controls = controlsByFramework[selectedCovFw]
    return controls ? controlsToCoverageEntries(controls) : []
  }, [selectedCovFw, controlsByFramework])

  /** Coverage summary stats for the selected framework */
  const summaryStats = useMemo(() => {
    if (coverageDataForFramework.length === 0) {
      return { avgCoverage: 0, gaps: 0, fullCoverage: 0, total: 0 }
    }
    const avgCoverage = Math.round(
      coverageDataForFramework.reduce((sum, e) => sum + e.post, 0) / coverageDataForFramework.length
    )
    const gaps = coverageDataForFramework.filter((e) => e.gap).length
    const fullCoverage = coverageDataForFramework.filter((e) => e.post >= 80).length
    return { avgCoverage, gaps, fullCoverage, total: coverageDataForFramework.length }
  }, [coverageDataForFramework])

  const frameworkLabel =
    COVERAGE_FRAMEWORKS.find((f) => f.id === selectedCovFw)?.label ?? selectedCovFw

  // Save current snapshot to localStorage whenever coverage data changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (coverageDataForFramework.length === 0) return
    const key = `bushido-coverage-snapshot-${selectedCovFw}`
    try {
      const existing = localStorage.getItem(key)
      let parsed: { data?: unknown; timestamp?: string } | null = null
      if (existing) {
        const raw = JSON.parse(existing)
        // Validate shape before using
        if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
          parsed = raw as { data: unknown; timestamp: string }
        }
      }
      // Only save if data has changed (compare by stringifying)
      const currentStr = JSON.stringify(coverageDataForFramework)
      if (!parsed || JSON.stringify(parsed.data) !== currentStr) {
        const snapshot = {
          timestamp: new Date().toISOString(),
          framework: selectedCovFw,
          data: coverageDataForFramework,
          previous: parsed ?? null,
        }
        localStorage.setItem(key, JSON.stringify(snapshot))
      }
    } catch {
      // localStorage unavailable or corrupted — gracefully ignore
    }
  }, [coverageDataForFramework, selectedCovFw])

  if (subMode === 'comparison') {
    return (
      <ComparisonView
        frameworks={frameworks}
        controlsByFramework={controlsByFramework}
        onBack={() => setSubMode('coverage')}
      />
    )
  }

  if (subMode === 'changes') {
    return (
      <CoverageDeltaView
        currentData={coverageDataForFramework}
        frameworkId={selectedCovFw}
        frameworkLabel={frameworkLabel}
        onBack={() => setSubMode('coverage')}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Framework Selector + Comparison Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Tabs value={selectedCovFw} onValueChange={(v) => setSelectedCovFw(v as CoverageFrameworkId)}>
          <TabsList aria-label="Coverage framework selector" className="flex flex-wrap h-auto bg-transparent gap-1">
            {COVERAGE_FRAMEWORKS.map((fw) => (
              <TabsTrigger
                key={fw.id}
                value={fw.id}
                className="data-[state=active]:bg-[var(--dojo-primary)] data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                <span className="hidden sm:inline">{fw.label}</span>
                <span className="sm:hidden">{fw.shortLabel}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <button
            onClick={() => setSubMode('changes')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md',
              'border border-[var(--border)] text-muted-foreground',
              'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]'
            )}
          >
            <GitCompareArrows className="w-4 h-4" aria-hidden="true" />
            Changes
          </button>
          <button
            onClick={() => setSubMode('comparison')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-md',
              'border border-[var(--border)] text-muted-foreground',
              'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]'
            )}
          >
            <Layers className="w-4 h-4" aria-hidden="true" />
            Comparison
          </button>
        </div>
      </div>

      {/* Coverage summary cards */}
      <div id="coverage-framework-panel" role="tabpanel" aria-label={`${frameworkLabel} coverage`}>
      {coverageDataForFramework.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {summaryStats.avgCoverage}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Coverage</p>
            </div>
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--success)]">
                {summaryStats.fullCoverage}
              </p>
              <p className="text-xs text-muted-foreground">Full ({'\u2265'}80%)</p>
            </div>
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {summaryStats.total}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className={cn(
                'text-2xl font-bold',
                summaryStats.gaps > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'
              )}>
                {summaryStats.gaps}
              </p>
              <p className="text-xs text-muted-foreground">Gaps</p>
            </div>
          </div>

          {/* Coverage Map Table */}
          <CoverageMap
            coverageData={coverageDataForFramework}
            title={`${frameworkLabel} Coverage Map`}
            subtitle={`Detection coverage by ${frameworkLabel} category`}
            icon={selectedCovFw === 'tpi' ? 'shield' : 'database'}
          />
        </>
      )}

      {/* Empty state for frameworks with no data */}
      {coverageDataForFramework.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No Coverage Data
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No coverage data available for {frameworkLabel}. Run a compliance assessment to generate coverage metrics.
          </p>
        </div>
      )}
      </div>
    </div>
  )
}

// --- Coverage Delta View (Story 4.3) ---

interface DeltaEntry {
  category: string
  currentCoverage: number
  previousCoverage: number
  change: number
  status: 'improvement' | 'regression' | 'unchanged' | 'new-gap' | 'gap-closed'
}

function CoverageDeltaView({
  currentData,
  frameworkId,
  frameworkLabel,
  onBack,
}: {
  currentData: CoverageEntry[]
  frameworkId: CoverageFrameworkId
  frameworkLabel: string
  onBack: () => void
}) {
  const deltaEntries = useMemo((): DeltaEntry[] => {
    if (typeof window === 'undefined') return []
    const key = `bushido-coverage-snapshot-${frameworkId}`
    let previousData: CoverageEntry[] | null = null
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate shape: must have previous.data as array
        if (parsed && typeof parsed === 'object' && parsed.previous && Array.isArray(parsed.previous.data)) {
          previousData = parsed.previous.data as CoverageEntry[]
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }

    if (!previousData || previousData.length === 0) {
      return []
    }

    const prevMap = new Map<string, CoverageEntry>()
    for (const e of previousData) {
      prevMap.set(e.category, e)
    }

    return currentData.map((current) => {
      const prev = prevMap.get(current.category)
      const previousCoverage = prev?.post ?? 0
      const change = current.post - previousCoverage
      let status: DeltaEntry['status'] = 'unchanged'
      if (!prev) {
        status = current.gap ? 'new-gap' : 'improvement'
      } else if (change > 0) {
        status = 'improvement'
      } else if (change < 0) {
        status = 'regression'
      } else if (prev.gap && !current.gap) {
        status = 'gap-closed'
      } else if (!prev.gap && current.gap) {
        status = 'new-gap'
      }
      return {
        category: current.category,
        currentCoverage: current.post,
        previousCoverage,
        change,
        status,
      }
    })
  }, [currentData, frameworkId])

  const improvements = deltaEntries.filter((e) => e.status === 'improvement' || e.status === 'gap-closed').length
  const regressions = deltaEntries.filter((e) => e.status === 'regression' || e.status === 'new-gap').length
  const unchanged = deltaEntries.filter((e) => e.status === 'unchanged').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Coverage Changes — {frameworkLabel}
        </h3>
        <button
          onClick={onBack}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md',
            'border border-[var(--border)] text-muted-foreground',
            'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]'
          )}
        >
          Back to Coverage
        </button>
      </div>

      {deltaEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <GitCompareArrows className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            No Previous Data
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            No previous coverage snapshot found for {frameworkLabel}. Delta analysis requires at least two coverage snapshots. Run another assessment to generate comparison data.
          </p>
        </div>
      ) : (
        <>
          {/* Delta summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--success)]">{improvements}</p>
              <p className="text-xs text-muted-foreground">Improvements</p>
            </div>
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--danger)]">{regressions}</p>
              <p className="text-xs text-muted-foreground">Regressions</p>
            </div>
            <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{unchanged}</p>
              <p className="text-xs text-muted-foreground">Unchanged</p>
            </div>
          </div>

          {/* Delta table */}
          <div className="overflow-x-auto">
            <table
              className="min-w-full text-sm"
              aria-label={`Coverage changes for ${frameworkLabel}`}
            >
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Category
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                    Previous
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                    Current
                  </th>
                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                    Change
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {deltaEntries.map((entry) => (
                  <tr
                    key={entry.category}
                    className="border-b border-[var(--border)] last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                      {entry.category}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                      {entry.previousCoverage}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">
                      {entry.currentCoverage}%
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={cn(
                        'font-medium',
                        entry.change > 0 ? 'text-[var(--success)]' : entry.change < 0 ? 'text-[var(--danger)]' : 'text-muted-foreground'
                      )}>
                        {entry.change > 0 ? '+' : ''}{entry.change}%
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                        entry.status === 'improvement' && 'bg-[var(--success)]/10 text-[var(--success)]',
                        entry.status === 'gap-closed' && 'bg-[var(--success)]/10 text-[var(--success)]',
                        entry.status === 'regression' && 'bg-[var(--danger)]/10 text-[var(--danger)]',
                        entry.status === 'new-gap' && 'bg-[var(--danger)]/10 text-[var(--danger)]',
                        entry.status === 'unchanged' && 'bg-[var(--bg-quaternary)] text-muted-foreground'
                      )}>
                        {entry.status === 'improvement' && '\u2191 Improved'}
                        {entry.status === 'gap-closed' && '\u2713 Gap Closed'}
                        {entry.status === 'regression' && '\u2193 Regressed'}
                        {entry.status === 'new-gap' && '\u2717 New Gap'}
                        {entry.status === 'unchanged' && '\u2014 Unchanged'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// --- Comparison View (Story 4.1) ---

function ComparisonView({
  frameworks,
  controlsByFramework,
  onBack,
}: {
  frameworks: ComplianceFrameworkData[]
  controlsByFramework: Record<string, ComplianceControlData[]>
  onBack: () => void
}) {
  /** Build comparison data: for each coverage framework, compute stats */
  const comparisonData = useMemo(() => {
    return COVERAGE_FRAMEWORKS.map((fw) => {
      let avgCoverage = 0
      let totalCategories = 0
      let gaps = 0

      if (fw.id === 'tpi') {
        avgCoverage = Math.round(COVERAGE_DATA.reduce((s, e) => s + e.post, 0) / COVERAGE_DATA.length)
        totalCategories = COVERAGE_DATA.length
        gaps = COVERAGE_DATA.filter((e) => e.gap).length
      } else if (fw.id === 'owasp') {
        avgCoverage = Math.round(OWASP_LLM_COVERAGE_DATA.reduce((s, e) => s + e.post, 0) / OWASP_LLM_COVERAGE_DATA.length)
        totalCategories = OWASP_LLM_COVERAGE_DATA.length
        gaps = OWASP_LLM_COVERAGE_DATA.filter((e) => e.gap).length
      } else if (fw.id === 'baiss') {
        const baissData = baissControlsToCoverageEntries()
        if (baissData.length > 0) {
          avgCoverage = Math.round(baissData.reduce((s, e) => s + e.post, 0) / baissData.length)
          totalCategories = baissData.length
          gaps = baissData.filter((e) => e.gap).length
        }
      } else {
        const controls = controlsByFramework[fw.id]
        if (controls && controls.length > 0) {
          avgCoverage = Math.round(controls.reduce((s, c) => s + c.coverage, 0) / controls.length)
          totalCategories = controls.length
          gaps = controls.filter((c) => c.status === 'gap').length
        }
      }

      return { id: fw.id, label: fw.label, avgCoverage, totalCategories, gaps }
    })
  }, [controlsByFramework])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Cross-Framework Coverage Comparison
        </h3>
        <button
          onClick={onBack}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md',
            'border border-[var(--border)] text-muted-foreground',
            'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]'
          )}
        >
          Back to Coverage
        </button>
      </div>

      <div className="overflow-x-auto">
        <table
          className="min-w-full text-sm"
          aria-label="Cross-framework coverage comparison"
        >
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                Framework
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                Avg Coverage
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                Categories
              </th>
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">
                Gaps
              </th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-[120px]">
                Bar
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                  {row.label}
                </td>
                <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">
                  {row.totalCategories > 0 ? `${row.avgCoverage}%` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {row.totalCategories || '—'}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={cn(
                    'font-medium',
                    row.gaps > 0 ? 'text-[var(--danger)]' : row.totalCategories > 0 ? 'text-[var(--success)]' : 'text-muted-foreground'
                  )}>
                    {row.totalCategories > 0 ? row.gaps : '—'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {row.totalCategories > 0 ? (
                    <div className="h-2 bg-[var(--bg-quaternary)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full motion-safe:transition-all motion-safe:duration-500',
                          row.avgCoverage >= COVERAGE_HIGH ? 'bg-[var(--success)]' : row.avgCoverage >= COVERAGE_MODERATE ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                        )}
                        style={{ width: `${Math.min(row.avgCoverage, 100)}%` }}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// --- Overview Panel ---

function OverviewPanel({
  framework,
  allFrameworks,
}: {
  framework: ComplianceFrameworkData | undefined
  allFrameworks: ComplianceFrameworkData[]
}) {
  if (!framework) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Select a framework to view details.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selected framework detail */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">
          {framework.name}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {framework.overallCoverage}%
            </p>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--success)]">
              {framework.coveredControls}
            </p>
            <p className="text-xs text-muted-foreground">Covered</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--warning)]">
              {framework.partialControls}
            </p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--danger)]">
              {framework.gapControls}
            </p>
            <p className="text-xs text-muted-foreground">Gaps</p>
          </div>
        </div>
        {framework.lastAssessed && (
          <p className="text-xs text-muted-foreground mt-2">
            Last assessed: {framework.lastAssessed}
          </p>
        )}
      </div>

      {/* All frameworks summary table */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          All Frameworks Summary
        </h3>
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            aria-label="All frameworks compliance summary"
          >
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase"
                >
                  Framework
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase"
                >
                  Coverage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase"
                >
                  Controls
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase"
                >
                  Gaps
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase"
                >
                  Partial
                </th>
              </tr>
            </thead>
            <tbody>
              {allFrameworks.map((fw) => (
                <tr
                  key={fw.id}
                  className={cn(
                    'border-b border-[var(--border)] last:border-0',
                    fw.id === framework.id && 'bg-[var(--bg-quaternary)]'
                  )}
                >
                  <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                    {fw.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">
                    {fw.overallCoverage}%
                  </td>
                  <td className="px-3 py-2 text-right text-muted-foreground">
                    {fw.totalControls}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        'font-medium',
                        fw.gapControls > 0
                          ? 'text-[var(--danger)]'
                          : 'text-[var(--success)]'
                      )}
                    >
                      {fw.gapControls}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        'font-medium',
                        fw.partialControls > 0
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--success)]'
                      )}
                    >
                      {fw.partialControls}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export { ComplianceCenter }
