/**
 * File: ComplianceCenter.tsx
 * Purpose: Main Bushido Book page with framework selector, overall score, gap summary, and sub-views
 * Story: S74, TPI-NODA-4.1, BUSHIDO-BOOK-4.1
 * Index:
 * - TIER_LABELS, TIER_ORDER constants
 * - CONTROL_CATEGORIES, CATEGORY_LABELS, CATEGORY_ORDER constants (H8.1)
 * - FrameworkTier, ComplianceFrameworkData, ComplianceCenterData interfaces
 * - SubView, CoverageSubMode, GroupMode types
 * - ScoreMeter, FrameworkGapSummary components
 * - ComplianceCenter (main), TierSection (with inline group-mode toggle)
 * - CoveragePanel, CoverageDeltaView
 * - ComparisonView, OverviewPanel components (H8.3: "Test in LLM Dashboard" button)
 * - ComplianceScanPanel (H9.4: Framework Compliance tab with control heatmap + drill-down)
 */

'use client'

import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { cn, formatDate } from '@/lib/utils'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
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
  ChevronDown,
  Play,
  ShieldCheck,
  ChevronRight,
  Search,
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigation } from '@/lib/NavigationContext'
import { GapMatrix } from './GapMatrix'
import { AuditTrail } from './AuditTrail'
import { ComplianceChecklist } from './ComplianceChecklist'
import { FrameworkNavigator } from './FrameworkNavigator'
import { ComplianceExport } from './ComplianceExport'
import { CoverageMap } from '@/components/coverage'
import { EmptyState } from '@/components/ui/EmptyState'
import { EnsoGauge } from '@/components/ui/EnsoGauge'
import { COVERAGE_DATA, OWASP_LLM_COVERAGE_DATA } from '@/lib/constants'
import { baissControlsToCoverageEntries } from '@/lib/data/baiss-framework'
import type { CoverageEntry } from '@/lib/types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { getStorage } from '@/lib/client-storage'
import { jutsuComplianceFrameworkStore } from '@/lib/stores'
// Train 2 PR-4b.6 part 5 — Leaderboard + AnalyticsWorkspace relocated from LLM
// Dashboard into Bushido Book Insights tab so audit users see performance-over-time
// compliance evidence inside their primary workflow.
import { LLMModelProvider, LLMExecutionProvider, LLMResultsProvider } from '@/lib/contexts'
const LeaderboardLazy = lazy(() =>
  import('@/components/llm').then(m => ({ default: m.Leaderboard }))
)
const AnalyticsWorkspaceLazy = lazy(() =>
  import('@/components/llm').then(m => ({ default: m.AnalyticsWorkspace }))
)

// --- Constants ---

/** Tier display labels */
const TIER_LABELS: Record<string, string> = {
  implemented: 'Implemented Frameworks',
  high: 'High Priority',
  medium: 'Medium Priority',
  regional: 'Regional & Sector',
  referenced: 'Referenced Standards',
}

/** Tier display order */
const TIER_ORDER = ['implemented', 'high', 'medium', 'regional', 'referenced']

/** H8.1: Category-based grouping — maps framework IDs to control categories */
const CONTROL_CATEGORIES: Record<string, string> = {
  // Technical Controls — map to scanner modules and automated testing
  'owasp-llm': 'technical',
  'nist-ai-600-1': 'technical',
  'mitre-atlas': 'technical',
  'nist-800-218a': 'technical',
  'slsa-v1': 'technical',
  'ml-bom': 'technical',
  'openssf': 'technical',
  'owasp-asvs': 'technical',
  'owasp-api': 'technical',
  'nist-800-53-ai': 'technical',
  // Governance Controls — policies, risk management, accountability
  'iso-42001': 'governance',
  'eu-ai-act': 'governance',
  'eu-ai-act-gpai': 'governance',
  'iso-23894': 'governance',
  'ieee-p7000': 'governance',
  'google-saif': 'governance',
  'cisa-ncsc': 'governance',
  'nist-csf-2': 'governance',
  'gdpr-ai': 'governance',
  // Non-Technical Controls — bias, fairness, regional, process
  'iso-24027': 'non-technical',
  'iso-24028': 'non-technical',
  'nist-ai-100-4': 'non-technical',
  'uk-dsit': 'non-technical',
  'sg-mgaf': 'non-technical',
  'ca-aia': 'non-technical',
  'au-aie': 'non-technical',
  'iso-27001-ai': 'non-technical',
}

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical Controls',
  governance: 'Governance Controls',
  'non-technical': 'Non-Technical Controls',
}

const CATEGORY_ORDER = ['technical', 'governance', 'non-technical']

/** Merged label lookup for TierSection — combines tier + category labels */
const ALL_GROUP_LABELS: Record<string, string> = { ...TIER_LABELS, ...CATEGORY_LABELS }

// --- Types ---

type FrameworkTier = 'implemented' | 'high' | 'medium' | 'regional' | 'referenced'

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
  tier?: FrameworkTier
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
  /** OBL: behavioral evidence from OBL analysis */
  behavioralEvidence?: { refusalRate: number; coherenceScore: number; drift: number }
}

interface ComplianceCenterData {
  overallScore: number
  frameworks: ComplianceFrameworkData[]
  lastUpdated: string
}

// Train 2 PR-4b.7 (2026-04-09): Bushido Book tab restructure per UI-ALIGNMENT
// v2.1. Top-level tabs collapsed from 8 → 4 (Evidence | Coverage | Insights |
// Audit). Existing sub-panels are preserved but recomposed under these new
// parent tabs. The Insights tab is a placeholder that will absorb Leaderboard
// + AnalyticsWorkspace from LLMDashboard in PR-4b.6.
type SubView = 'evidence' | 'coverage' | 'results' | 'audit'

/** H8.1: Group mode for framework list and overview panel */
type GroupMode = 'tier' | 'category'

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
    if (v >= SCORE_EXCELLENT) return 'var(--success)'
    if (v >= SCORE_GOOD) return 'var(--warning)'
    if (v >= SCORE_FAIR) return 'var(--dojo-primary)'
    return 'var(--danger)'
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
        'flex items-center justify-between w-full px-3 py-2 rounded-lg text-left',
        'motion-safe:transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
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
  const [selectedFramework, setSelectedFramework] = useState<string>('owasp-llm')
  const [subView, setSubView] = useState<SubView>('evidence')
  const [groupMode, setGroupMode] = useState<GroupMode>('tier')
  const { setActiveTab } = useNavigation()

  /** H8.3: Navigate to Model Lab with framework pre-populated.
   *
   * Train 2 PR-4b.8 (2026-04-09): key renamed from 'llm-compliance-framework'
   * → 'jutsu-compliance-framework' to track the llm→jutsu NavId rename.
   * TestExecution (the reader) reads both keys for in-flight migration. */
  const handleStartComplianceCheck = useCallback((frameworkId: string) => {
    jutsuComplianceFrameworkStore.set(frameworkId)
    // Since PR-4b.6 moved TestExecution into Atemi Test Cases, navigate there.
    setActiveTab('adversarial')
  }, [setActiveTab])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchWithAuth('/api/compliance')
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
            // Parse tier from API response
            const rawTier = String(f.tier ?? 'implemented')
            const tier: FrameworkTier = (['implemented', 'high', 'medium', 'regional', 'referenced'].includes(rawTier)
              ? rawTier : 'implemented') as FrameworkTier
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
              tier,
            }
          }
        )
        // Use API summary avgCoverage (implemented frameworks only) for the overall score
        const overallScore =
          apiData.summary?.avgCoverage ??
          (() => {
            const impl = frameworks.filter((f) => f.tier === 'implemented')
            return impl.length > 0
              ? Math.round(impl.reduce((sum: number, f: ComplianceFrameworkData) => sum + f.overallCoverage, 0) / impl.length)
              : 0
          })()

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

  const handleFrameworkSelect = useCallback((id: string) => {
    setSelectedFramework(id)
  }, [])

  const handleSubViewChange = useCallback((view: SubView) => {
    setSubView(view)
  }, [])

  /** Group frameworks by tier for display — must be before early returns (Rules of Hooks) */
  const frameworksByTier = useMemo(() => {
    if (!data) return {}
    const groups: Record<string, ComplianceFrameworkData[]> = {}
    for (const fw of data.frameworks) {
      const tier = fw.tier ?? 'implemented'
      if (!groups[tier]) groups[tier] = []
      groups[tier].push(fw)
    }
    return groups
  }, [data])

  /** H8.1: Group frameworks by control category */
  const frameworksByCategory = useMemo(() => {
    if (!data) return {}
    const groups: Record<string, ComplianceFrameworkData[]> = {}
    for (const fw of data.frameworks) {
      const cat = CONTROL_CATEGORIES[fw.id] ?? 'non-technical'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(fw)
    }
    return groups
  }, [data])

  const handleGroupModeChange = useCallback((mode: GroupMode) => {
    setGroupMode(mode)
  }, [])

  // --- Loading state --- render heading immediately so E2E can find it; spinner below ---
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-xl font-semibold">Framework Coverage</h2>
        <div
          className="flex items-center gap-3"
          role="status"
          aria-label="Loading Bushido Book"
        >
          <div
            className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-[var(--dojo-primary)]"
            aria-hidden="true"
          />
          <span className="text-muted-foreground">Loading compliance data...</span>
        </div>
      </div>
    )
  }

  // --- Error state ---
  if (error || !data) {
    return (
      <div className="p-4 rounded-lg bg-[var(--danger)]/10" role="alert">
        <p className="text-[var(--danger)]">
          Error loading compliance data: {error}
        </p>
      </div>
    )
  }

  const selectedFw = data.frameworks.find((f) => f.id === selectedFramework) ?? data.frameworks[0]
  const implementedFrameworks = data.frameworks.filter((f) => f.tier === 'implemented')
  const totalGaps = implementedFrameworks.reduce((sum, f) => sum + f.gapControls + f.partialControls, 0)
  const selectedFrameworkExport = {
    id: selectedFw.id,
    name: selectedFw.name,
    overallCoverage: selectedFw.overallCoverage,
    controls: (selectedFw.controls ?? []).map((control) => ({
      id: control.id,
      name: control.name,
      status: control.status,
      coverage: control.coverage,
    })),
  }

  // Train 2 PR-4b.7: 4-tab structure (Evidence | Coverage | Insights | Audit)
  // per UI-ALIGNMENT v2.1 §5.3. Sub-panels from the legacy 8-tab layout are
  // recomposed under these new parent tabs.
  const subTabs: { id: SubView; label: string; icon: typeof BarChart3 }[] = [
    { id: 'evidence', label: 'Evidence', icon: ShieldCheck },
    { id: 'coverage', label: 'Coverage', icon: Layers },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'audit', label: 'Audit', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModuleHeader
        title="Bushido Book"
        subtitle={`Compliance frameworks and coverage analysis — Last updated: ${formatDate(data.lastUpdated, true)}`}
        icon={Shield}
      />

      {/* Top Section: Score + Framework Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Meter */}
        <Card className="lg:col-span-3">
          <CardContent className="p-4 flex flex-col items-center justify-center">
            <ScoreMeter value={data.overallScore} />
            <div className="mt-4 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {data.frameworks.length} Frameworks
              </p>
              <p className="text-xs text-muted-foreground">
                {totalGaps} gaps (implemented)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Framework list grouped by tier */}
        <Card className="lg:col-span-9">
          <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Framework Coverage
            </h3>
            {/* H8.1: Group mode toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-quaternary)] p-0.5" role="radiogroup" aria-label="Group frameworks by">
              <button
                role="radio"
                aria-checked={groupMode === 'tier'}
                aria-label="Group by tier"
                onClick={() => handleGroupModeChange('tier')}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-md motion-safe:transition-colors min-h-[28px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                  groupMode === 'tier'
                    ? 'bg-[var(--dojo-primary)] text-white font-semibold'
                    : 'text-muted-foreground hover:text-[var(--foreground)]'
                )}
              >
                Tier
              </button>
              <button
                role="radio"
                aria-checked={groupMode === 'category'}
                aria-label="Group by category"
                onClick={() => handleGroupModeChange('category')}
                className={cn(
                  'px-2 py-0.5 text-xs rounded-md motion-safe:transition-colors min-h-[28px]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                  groupMode === 'category'
                    ? 'bg-[var(--dojo-primary)] text-white font-semibold'
                    : 'text-muted-foreground hover:text-[var(--foreground)]'
                )}
              >
                Category
              </button>
            </div>
          </div>
          <div className="space-y-1">
            {groupMode === 'tier'
              ? TIER_ORDER.map((tier) => {
                  const tierFrameworks = frameworksByTier[tier]
                  if (!tierFrameworks || tierFrameworks.length === 0) return null
                  return (
                    <TierSection
                      key={tier}
                      tier={tier}
                      frameworks={tierFrameworks}
                      selectedFrameworkId={selectedFramework}
                      onSelect={handleFrameworkSelect}
                      defaultExpanded={tier === 'implemented'}
                    />
                  )
                })
              : CATEGORY_ORDER.map((cat) => {
                  const catFrameworks = frameworksByCategory[cat]
                  if (!catFrameworks || catFrameworks.length === 0) return null
                  return (
                    <TierSection
                      key={cat}
                      tier={cat}
                      frameworks={catFrameworks}
                      selectedFrameworkId={selectedFramework}
                      onSelect={handleFrameworkSelect}
                      defaultExpanded={cat === 'technical'}
                    />
                  )
                })
            }
          </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selected Framework
            </p>
            <h3 className="text-lg font-semibold text-foreground">{selectedFw.name}</h3>
            <p className="text-sm text-muted-foreground">
              Export the current framework snapshot or switch to the classic coverage dashboard for a wider framework-by-framework summary.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ComplianceExport frameworkData={selectedFrameworkExport} />
            <Button
              type="button"
              variant={subView === 'coverage' ? 'default' : 'outline'}
              onClick={() => handleSubViewChange('coverage')}
              className="min-h-[44px]"
            >
              Open Coverage Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

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

          {/* Sub-view content — Train 2 PR-4b.7: 4-tab recomposition */}
          <div className="p-4">
            {/* Evidence: per-framework overview + compliance scan drill-down + sign-off checklists */}
            <TabsContent value="evidence" className="mt-0 space-y-8">
              <OverviewPanel framework={selectedFw} allFrameworks={data.frameworks} groupMode={groupMode} onStartComplianceCheck={handleStartComplianceCheck} />
              <ComplianceScanPanel frameworks={data.frameworks} onStartComplianceCheck={handleStartComplianceCheck} />
              <ComplianceChecklist />
            </TabsContent>

            {/* Coverage: pre/post coverage map + cross-framework gap matrix + bidirectional navigator */}
            <TabsContent value="coverage" className="mt-0 space-y-8">
              <CoveragePanel frameworks={data.frameworks} />
              <GapMatrix />
              <FrameworkNavigator />
            </TabsContent>

            {/* Insights: Leaderboard + AnalyticsWorkspace relocated from LLM Dashboard
             *  (PR-4b.6 part 5). Gives audit users performance-over-time evidence
             *  inside their primary workflow. Wrapped in the LLM provider trio so the
             *  relocated components can consume their contexts without mounting the
             *  old LLMDashboard shell. */}
            <TabsContent value="results" className="mt-0 space-y-8">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-16" aria-busy="true">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
                  </div>
                }
              >
                <LLMModelProvider>
                  <LLMExecutionProvider>
                    <LLMResultsProvider>
                      <LeaderboardLazy />
                      <AnalyticsWorkspaceLazy />
                    </LLMResultsProvider>
                  </LLMExecutionProvider>
                </LLMModelProvider>
              </Suspense>
            </TabsContent>

            {/* Audit: immutable audit trail. The legacy ComplianceDashboard
             *  (header Score Meter + framework list already cover its
             *  gauge/summary role) is no longer rendered as part of the 4-tab
             *  recomposition. */}
            <TabsContent value="audit" className="mt-0">
              <AuditTrail />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  )
}

// --- Tier Section (collapsible framework group) ---

function TierSection({
  tier,
  frameworks,
  selectedFrameworkId,
  onSelect,
  defaultExpanded,
}: {
  tier: string
  frameworks: ComplianceFrameworkData[]
  selectedFrameworkId: string
  onSelect: (id: string) => void
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const tierAvg = frameworks.length > 0
    ? Math.round(frameworks.reduce((sum, f) => sum + f.overallCoverage, 0) / frameworks.length)
    : 0

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center justify-between w-full px-3 py-2 bg-[var(--bg-quaternary)] hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors text-left min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-inset"
        aria-expanded={expanded}
        aria-label={`${ALL_GROUP_LABELS[tier] ?? tier}: ${frameworks.length} frameworks, ${tierAvg}% average coverage`}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground motion-safe:transition-transform',
              !expanded && '-rotate-90'
            )}
            aria-hidden="true"
          />
          <span className="text-xs font-semibold text-[var(--foreground)]">
            {ALL_GROUP_LABELS[tier] ?? tier}
          </span>
          <span className="text-[10px] text-muted-foreground">({frameworks.length})</span>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{tierAvg}%</span>
      </button>
      {expanded && (
        <div className="p-1.5 space-y-0.5">
          {frameworks.map((f) => (
            <FrameworkGapSummary
              key={f.id}
              framework={f}
              isSelected={f.id === selectedFrameworkId}
              onSelect={() => onSelect(f.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Coverage Panel (Story 4.1, BUSHIDO-BOOK-4.1) ---

/** Maps compliance API framework IDs to legacy coverage IDs for static data lookup */
const COMPLIANCE_TO_LEGACY_ID: Record<string, string> = {
  'owasp-llm': 'owasp',
  'nist-ai-rmf': 'nist',
  'mitre-atlas': 'mitre',
  'iso-42001': 'iso',
  'eu-ai-act': 'eu-ai',
  'enisa-ai': 'enisa',
}

/** Converts compliance API controls to CoverageEntry format for CoverageMap.
 *  pre ratio varies by control status to show distinct pre vs post values. */
function controlsToCoverageEntries(controls: ComplianceControlData[]): CoverageEntry[] {
  return controls.map((c) => {
    const ratio = c.status === 'gap' ? 0.3 : c.status === 'partial' ? 0.6 : 0.85
    return {
      category: `${c.id}: ${c.name}`,
      pre: Math.round(c.coverage * ratio),
      post: c.coverage,
      stories: c.id,
      gap: c.status === 'gap',
    }
  })
}

type CoverageSubMode = 'coverage' | 'comparison' | 'changes'

function CoveragePanel({ frameworks }: { frameworks: ComplianceFrameworkData[] }) {
  const [selectedCovFw, setSelectedCovFw] = useState<string>('tpi')
  const [subMode, setSubMode] = useState<CoverageSubMode>('coverage')

  /** Build coverage framework options from API data, grouped by tier */
  const coverageOptions = useMemo(() => {
    const special = [
      { id: 'tpi', name: 'CrowdStrike TPI', tier: 'implemented' as const },
      { id: 'baiss', name: 'BAISS Unified', tier: 'implemented' as const },
    ]
    const apiOptions = frameworks.map((fw) => ({
      id: fw.id,
      name: fw.name,
      tier: fw.tier ?? 'implemented',
    }))
    return [...special, ...apiOptions]
  }, [frameworks])

  /** Build a lookup from compliance API framework ID → controls */
  const controlsByFramework = useMemo(() => {
    const map: Record<string, ComplianceControlData[]> = {}
    for (const fw of frameworks) {
      // Map by both the API id and legacy id
      if (fw.controls) {
        map[fw.id] = fw.controls
        const legacyId = COMPLIANCE_TO_LEGACY_ID[fw.id]
        if (legacyId) map[legacyId] = fw.controls
      }
    }
    return map
  }, [frameworks])

  /** Returns CoverageEntry[] for the selected coverage framework */
  const coverageDataForFramework = useMemo((): CoverageEntry[] => {
    if (selectedCovFw === 'tpi') return COVERAGE_DATA
    if (selectedCovFw === 'baiss') return baissControlsToCoverageEntries()
    // Check legacy OWASP static data
    const legacyId = Object.entries(COMPLIANCE_TO_LEGACY_ID).find(([, v]) => v === selectedCovFw)?.[0]
    if (selectedCovFw === 'owasp' || legacyId === 'owasp-llm') return OWASP_LLM_COVERAGE_DATA
    // Dynamic: use API controls
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

  const frameworkLabel = coverageOptions.find((f) => f.id === selectedCovFw)?.name ?? selectedCovFw

  // Save current snapshot whenever coverage data changes
  useEffect(() => {
    if (coverageDataForFramework.length === 0) return
    const storage = getStorage('local')
    if (!storage) return
    const key = `bushido-coverage-snapshot-${selectedCovFw}`
    try {
      const existing = storage.getItem(key)
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
        storage.setItem(key, JSON.stringify(snapshot))
      }
    } catch {
      // storage unavailable or corrupted — gracefully ignore
    }
  }, [coverageDataForFramework, selectedCovFw])

  if (subMode === 'comparison') {
    return (
      <ComparisonView
        frameworks={frameworks}
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
        <div className="flex items-center gap-2">
          <label htmlFor="coverage-framework-select" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Framework:
          </label>
          <select
            id="coverage-framework-select"
            value={selectedCovFw}
            onChange={(e) => setSelectedCovFw(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] min-h-[44px] min-w-[200px]"
            aria-label="Coverage framework selector"
          >
            {TIER_ORDER.map((tier) => {
              const tierOptions = coverageOptions.filter((o) => o.tier === tier)
              if (tierOptions.length === 0) return null
              return (
                <optgroup key={tier} label={TIER_LABELS[tier] ?? tier}>
                  {tierOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name}</option>
                  ))}
                </optgroup>
              )
            })}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSubMode('changes')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg',
              'border border-[var(--border)] text-muted-foreground',
              'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
            )}
          >
            <GitCompareArrows className="w-4 h-4" aria-hidden="true" />
            Changes
          </button>
          <button
            onClick={() => setSubMode('comparison')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg',
              'border border-[var(--border)] text-muted-foreground',
              'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
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
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {summaryStats.avgCoverage}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Coverage</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--success)]">
                {summaryStats.fullCoverage}
              </p>
              <p className="text-xs text-muted-foreground">Full ({'\u2265'}80%)</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {summaryStats.total}
              </p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
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
        <EmptyState icon={Layers} title="No Coverage Data" description="No coverage data available. Run a compliance assessment to populate." />
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
  frameworkId: string
  frameworkLabel: string
  onBack: () => void
}) {
  const deltaEntries = useMemo((): DeltaEntry[] => {
    const key = `bushido-coverage-snapshot-${frameworkId}`
    let previousData: CoverageEntry[] | null = null
    try {
      const stored = getStorage('local')?.getItem(key)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Validate shape: must have previous.data as array
        if (parsed && typeof parsed === 'object' && parsed.previous && Array.isArray(parsed.previous.data)) {
          previousData = parsed.previous.data as CoverageEntry[]
        }
      }
    } catch {
      // storage unavailable or corrupted
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
            'px-3 py-1.5 text-sm rounded-lg',
            'border border-[var(--border)] text-muted-foreground',
            'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--success)]">{improvements}</p>
              <p className="text-xs text-muted-foreground">Improvements</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
              <p className="text-2xl font-bold text-[var(--danger)]">{regressions}</p>
              <p className="text-xs text-muted-foreground">Regressions</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
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
  onBack,
}: {
  frameworks: ComplianceFrameworkData[]
  onBack: () => void
}) {
  /** Build comparison data from all frameworks */
  const comparisonData = useMemo(() => {
    // TPI and BAISS as special entries
    const tpiAvg = COVERAGE_DATA.length > 0
      ? Math.round(COVERAGE_DATA.reduce((s, e) => s + e.post, 0) / COVERAGE_DATA.length)
      : 0
    const baissData = baissControlsToCoverageEntries()
    const baissAvg = baissData.length > 0
      ? Math.round(baissData.reduce((s, e) => s + e.post, 0) / baissData.length)
      : 0

    const rows: { id: string; label: string; avgCoverage: number; totalCategories: number; gaps: number; tier: string }[] = [
      {
        id: 'tpi',
        label: 'CrowdStrike TPI',
        avgCoverage: tpiAvg,
        totalCategories: COVERAGE_DATA.length,
        gaps: COVERAGE_DATA.filter((e) => e.gap).length,
        tier: 'implemented',
      },
    ]

    // Add all API frameworks
    for (const fw of frameworks) {
      rows.push({
        id: fw.id,
        label: fw.name,
        avgCoverage: fw.overallCoverage,
        totalCategories: fw.totalControls,
        gaps: fw.gapControls,
        tier: fw.tier ?? 'implemented',
      })
    }

    // Add BAISS as final entry
    rows.push({
      id: 'baiss',
      label: 'BAISS Unified',
      avgCoverage: baissAvg,
      totalCategories: baissData.length,
      gaps: baissData.filter((e) => e.gap).length,
      tier: 'implemented',
    })

    return rows
  }, [frameworks])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">
          Cross-Framework Coverage Comparison
        </h3>
        <button
          onClick={onBack}
          className={cn(
            'px-3 py-1.5 text-sm rounded-lg',
            'border border-[var(--border)] text-muted-foreground',
            'hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]'
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
                          'h-full rounded-full motion-safe:transition-all motion-safe:duration-[var(--transition-emphasis)]',
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
  groupMode = 'tier',
  onStartComplianceCheck,
}: {
  framework: ComplianceFrameworkData | undefined
  allFrameworks: ComplianceFrameworkData[]
  groupMode?: GroupMode
  onStartComplianceCheck?: (frameworkId: string) => void
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
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {framework.overallCoverage}%
            </p>
            <p className="text-xs text-muted-foreground">Coverage</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--success)]">
              {framework.coveredControls}
            </p>
            <p className="text-xs text-muted-foreground">Covered</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--warning)]">
              {framework.partialControls}
            </p>
            <p className="text-xs text-muted-foreground">Policy Gaps</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--danger)]">
              {framework.gapControls}
            </p>
            <p className="text-xs text-muted-foreground">Technical Gaps</p>
          </div>
        </div>
        {framework.lastAssessed && (
          <p className="text-xs text-muted-foreground mt-2">
            Last assessed: {framework.lastAssessed}
          </p>
        )}
        {/* H8.3: Start Compliance Check button */}
        {onStartComplianceCheck && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => onStartComplianceCheck(framework.id)}
              aria-label={`Start compliance check for ${framework.name}`}
              data-testid={`compliance-check-${framework.id}`}
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              Test in Atemi Lab
            </Button>
          </div>
        )}
      </div>

      {/* All frameworks summary table grouped by tier or category (H8.1) */}
      {(groupMode === 'category' ? CATEGORY_ORDER : TIER_ORDER).map((groupKey) => {
        const groupFrameworks = groupMode === 'category'
          ? allFrameworks.filter((fw) => (CONTROL_CATEGORIES[fw.id] ?? 'non-technical') === groupKey)
          : allFrameworks.filter((fw) => (fw.tier ?? 'implemented') === groupKey)
        if (groupFrameworks.length === 0) return null
        const groupLabel = ALL_GROUP_LABELS[groupKey] ?? groupKey
        return (
          <div key={groupKey}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {groupLabel}
            </h3>
            <div className="overflow-x-auto mb-4">
              <table
                className="min-w-full text-sm"
                aria-label={`${groupLabel} compliance summary`}
              >
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Framework</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Coverage</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Controls</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Technical Gaps</th>
                    <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Policy Gaps</th>
                  </tr>
                </thead>
                <tbody>
                  {groupFrameworks.map((fw) => (
                    <tr
                      key={fw.id}
                      className={cn(
                        'border-b border-[var(--border)] last:border-0',
                        fw.id === framework.id && 'bg-[var(--bg-quaternary)]'
                      )}
                    >
                      <td className="px-3 py-2 font-medium text-[var(--foreground)]">{fw.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">{fw.overallCoverage}%</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{fw.totalControls}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn('font-medium', fw.gapControls > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]')}>
                          {fw.gapControls}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn('font-medium', fw.partialControls > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]')}>
                          {fw.partialControls}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Compliance Scan Panel (H9.4: Framework Compliance tab) ---

/** Mock evidence entries for drill-down — maps control IDs to test modules and evidence */
const MOCK_EVIDENCE: Record<string, { modules: string[]; evidence: string[]; lastRun?: string }> = {
  'LLM01': { modules: ['prompt-injection', 'input-sanitization'], evidence: ['PI-001 payload blocked', 'PI-002 boundary test passed'], lastRun: '2026-03-10' },
  'LLM02': { modules: ['output-validation', 'content-safety'], evidence: ['OV-001 output filtered', 'CS-001 PII redacted'], lastRun: '2026-03-09' },
  'LLM03': { modules: ['training-data-analysis'], evidence: ['TD-001 poisoning check passed'], lastRun: '2026-03-08' },
  'LLM04': { modules: ['resource-monitor', 'rate-limiter'], evidence: ['RM-001 DoS mitigated'], lastRun: '2026-03-07' },
  'LLM05': { modules: ['supply-chain-audit'], evidence: ['SC-001 dependency scan clean'] },
  'LLM06': { modules: ['data-leakage-detection'], evidence: ['DL-001 PII exposure blocked', 'DL-002 training data leak prevented'], lastRun: '2026-03-11' },
  'LLM07': { modules: ['plugin-security'], evidence: ['PL-001 auth bypass blocked'] },
  'LLM08': { modules: ['overreliance-detector'], evidence: ['OR-001 hallucination flagged'], lastRun: '2026-03-06' },
  'LLM09': { modules: ['access-control'], evidence: ['AC-001 escalation prevented', 'AC-002 RBAC enforced'] },
  'LLM10': { modules: ['model-theft-prevention'], evidence: ['MT-001 extraction blocked'], lastRun: '2026-03-05' },
}

function ComplianceScanPanel({
  frameworks,
  onStartComplianceCheck,
}: {
  frameworks: ComplianceFrameworkData[]
  onStartComplianceCheck: (frameworkId: string) => void
}) {
  const [selectedFwId, setSelectedFwId] = useState<string>(
    frameworks.length > 0 ? frameworks[0].id : ''
  )
  const [expandedControl, setExpandedControl] = useState<string | null>(null)

  const selectedFramework = useMemo(
    () => frameworks.find((f) => f.id === selectedFwId),
    [frameworks, selectedFwId]
  )

  const controls = useMemo(
    () => selectedFramework?.controls ?? [],
    [selectedFramework]
  )

  /** Coverage status color */
  const getStatusColor = (coverage: number): string => {
    if (coverage >= COVERAGE_HIGH) return 'var(--success)'
    if (coverage >= COVERAGE_MODERATE) return 'var(--warning)'
    return 'var(--danger)'
  }

  const getStatusLabel = (status: 'covered' | 'partial' | 'gap'): string => {
    if (status === 'covered') return 'Covered'
    if (status === 'partial') return 'Partial'
    return 'Gap'
  }

  /** Summary stats for the selected framework */
  const stats = useMemo(() => {
    if (controls.length === 0) return { covered: 0, partial: 0, gap: 0, avgCoverage: 0 }
    const covered = controls.filter((c) => c.status === 'covered').length
    const partial = controls.filter((c) => c.status === 'partial').length
    const gap = controls.filter((c) => c.status === 'gap').length
    const avgCoverage = Math.round(controls.reduce((sum, c) => sum + c.coverage, 0) / controls.length)
    return { covered, partial, gap, avgCoverage }
  }, [controls])

  const handleControlClick = useCallback((controlId: string) => {
    setExpandedControl((prev) => (prev === controlId ? null : controlId))
  }, [])

  return (
    <div className="space-y-6" data-testid="compliance-scan-panel">
      {/* Header: Framework selector + Run button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="compliance-scan-fw-select" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Framework:
          </label>
          <select
            id="compliance-scan-fw-select"
            value={selectedFwId}
            onChange={(e) => {
              setSelectedFwId(e.target.value)
              setExpandedControl(null)
            }}
            className="px-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] min-h-[44px] min-w-[200px]"
            aria-label="Compliance scan framework selector"
            data-testid="compliance-scan-fw-select"
          >
            {frameworks.map((fw) => (
              <option key={fw.id} value={fw.id}>{fw.name}</option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => onStartComplianceCheck(selectedFwId)}
          aria-label="Run compliance scan"
          data-testid="run-compliance-scan"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          Run Compliance Scan
        </Button>
      </div>

      {/* Summary stats */}
      {controls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--foreground)]">{stats.avgCoverage}%</p>
            <p className="text-xs text-muted-foreground">Avg Coverage</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--success)]">{stats.covered}</p>
            <p className="text-xs text-muted-foreground">Covered</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--warning)]">{stats.partial}</p>
            <p className="text-xs text-muted-foreground">Partial</p>
          </div>
          <div className="rounded-lg bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--danger)]">{stats.gap}</p>
            <p className="text-xs text-muted-foreground">Gaps</p>
          </div>
        </div>
      )}

      {/* Control heatmap table */}
      {controls.length > 0 ? (
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            aria-label={`${selectedFramework?.name ?? 'Framework'} control compliance heatmap`}
            data-testid="compliance-controls-table"
          >
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Control ID</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase min-w-[120px]">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {controls.map((control) => {
                const isExpanded = expandedControl === control.id
                const evidence = MOCK_EVIDENCE[control.id]
                const statusColor = getStatusColor(control.coverage)

                return (
                  <tr key={control.id} className="group">
                    <td colSpan={4} className="p-0">
                      <button
                        onClick={() => handleControlClick(control.id)}
                        className={cn(
                          'w-full text-left grid grid-cols-[minmax(80px,auto)_1fr_100px_minmax(120px,1fr)] items-center',
                          'px-3 py-2 border-b border-[var(--border)]',
                          'hover:bg-[var(--bg-secondary)] motion-safe:transition-colors',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--bu-electric)]',
                          isExpanded && 'bg-[var(--bg-secondary)]'
                        )}
                        aria-expanded={isExpanded}
                        aria-label={`${control.id}: ${control.name}, ${control.coverage}% coverage, ${getStatusLabel(control.status)}`}
                        data-testid={`control-row-${control.id}`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-mono text-[var(--foreground)]">
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 text-muted-foreground motion-safe:transition-transform',
                              isExpanded && 'rotate-90'
                            )}
                            aria-hidden="true"
                          />
                          {control.id}
                        </span>
                        <span className="text-sm text-[var(--foreground)] truncate px-2">{control.name}</span>
                        <span className="text-center">
                          <span
                            className={cn(
                              'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
                              control.status === 'covered' && 'bg-[var(--success)]/10 text-[var(--success)]',
                              control.status === 'partial' && 'bg-[var(--warning)]/10 text-[var(--warning)]',
                              control.status === 'gap' && 'bg-[var(--danger)]/10 text-[var(--danger)]'
                            )}
                            data-testid={`control-status-${control.id}`}
                          >
                            {getStatusLabel(control.status)}
                          </span>
                          {control.behavioralEvidence && (
                            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                              OBL {Math.round(control.behavioralEvidence.refusalRate * 100)}%
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[var(--bg-quaternary)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full motion-safe:transition-all motion-safe:duration-[var(--transition-emphasis)]"
                              style={{
                                width: `${Math.min(control.coverage, 100)}%`,
                                backgroundColor: statusColor,
                              }}
                              role="progressbar"
                              aria-valuenow={control.coverage}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={`${control.coverage}% coverage`}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground min-w-[4ch] text-right">
                            {control.coverage}%
                          </span>
                        </span>
                      </button>
                      {/* Drill-down: evidence and mapped test modules */}
                      {isExpanded && (
                        <div
                          className="px-6 py-3 bg-[var(--bg-tertiary)] border-b border-[var(--border)]"
                          data-testid={`control-detail-${control.id}`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                                Mapped Test Modules
                              </h4>
                              {evidence?.modules && evidence.modules.length > 0 ? (
                                <ul className="space-y-1">
                                  {evidence.modules.map((mod) => (
                                    <li key={mod} className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                                      <Search className="h-3 w-3 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                                      {mod}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No test modules mapped</p>
                              )}
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                                Evidence
                              </h4>
                              {evidence?.evidence && evidence.evidence.length > 0 ? (
                                <ul className="space-y-1">
                                  {evidence.evidence.map((ev) => (
                                    <li key={ev} className="flex items-center gap-1.5 text-sm text-[var(--foreground)]">
                                      <CheckCircle className="h-3 w-3 text-[var(--success)] flex-shrink-0" aria-hidden="true" />
                                      {ev}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">No evidence collected</p>
                              )}
                              {evidence?.lastRun && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Last run: {evidence.lastRun}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="No Controls Available"
          description="Select a framework with controls or run a compliance assessment to populate control data."
        />
      )}
    </div>
  )
}

export { ComplianceCenter }
