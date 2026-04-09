/**
 * File: page.tsx
 * Purpose: Main application page with context-based navigation
 * Stories: TPI-UI-001-08 (tab refactor), TPI-UI-001-09 (layout integration), TPI-UI-001-15 (toolbar)
 */

'use client'

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useScanner } from '@/lib/ScannerContext'
import { useNavigation } from '@/lib/NavigationContext'
import { useActivityLogger } from '@/lib/contexts/ActivityContext'
import { Providers } from '@/lib/Providers'
import { NAV_ITEMS } from '@/lib/constants'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageToolbar } from '@/components/layout/PageToolbar'
import { ScannerInput } from '@/components/scanner'
import { ScannerInsightsPanel } from '@/components/scanner'
import { FixtureDetail, FixtureComparison, FixtureExplorer } from '@/components/fixtures'
import type { ComparisonItem } from '@/components/fixtures/FixtureComparison'
import { PayloadCard } from '@/components/payloads'
import { NODADashboard } from '@/components/dashboard'
import { scanFixture, readFixture } from '@/lib/api'
import { getCachedFixtureManifest } from '@/lib/client-data-cache'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { PAYLOAD_CATALOG } from '@/lib/constants'
import type { ScanResult, TextFixtureResponse, BinaryFixtureResponse, FixtureManifest } from '@/lib/types'
import { AlertTriangle, ScanLine, ShieldAlert, CheckCircle, Cpu } from 'lucide-react'
import { MetricCard } from '@/components/ui/MetricCard'
import { FilterPills } from '@/components/ui/FilterPills'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useScannerMetrics } from '@/lib/hooks'
import { SenseiDrawer } from '@/components/sensei/SenseiDrawer'

// Lazy-loaded module components (Story 2.5 — C-05 code splitting)
// Train 2 PR-4b.6 (2026-04-09): ModelLabWithProviders replaces LLMDashboardWithProviders
// as the Jutsu tab target. LLMDashboardWithProviders kept for back-compat until PR-4b.8.
const ModelLabWithProviders = lazy(() => import('@/components/llm').then(m => ({ default: m.ModelLabWithProviders })))
const AdversarialLab = lazy(() => import('@/components/adversarial').then(m => ({ default: m.AdversarialLab })))
const ComplianceCenter = lazy(() => import('@/components/compliance').then(m => ({ default: m.ComplianceCenter })))
const StrategicHub = lazy(() => import('@/components/strategic').then(m => ({ default: m.StrategicHub })))
const GuardDashboard = lazy(() => import('@/components/guard').then(m => ({ default: m.GuardDashboard })))
const AdminPanel = lazy(() => import('@/components/admin').then(m => ({ default: m.AdminPanel })))
const RoninHub = lazy(() => import('@/components/ronin').then(m => ({ default: m.RoninHub })))
const SengokuDashboard = lazy(() => import('@/components/sengoku').then(m => ({ default: m.SengokuDashboard })))
const KotobaDashboard = lazy(() => import('@/components/kotoba').then(m => ({ default: m.KotobaDashboard })))
// Train 2 PR-4b.1 (2026-04-09) — 4 Kumite children promoted to first-class tabs
const MitsukeLibrary = lazy(() => import('@/components/strategic').then(m => ({ default: m.MitsukeLibrary })))
const AttackDNAExplorer = lazy(() => import('@/components/attackdna').then(m => ({ default: m.AttackDNAExplorer })))
const KagamiPanel = lazy(() => import('@/components/kagami').then(m => ({ default: m.KagamiPanel })))
const ArenaBrowser = lazy(() => import('@/components/strategic').then(m => ({ default: m.ArenaBrowser })))
// Train 2 PR-4b.2 — Payload Lab (Buki) scaffolded shell
const PayloadLab = lazy(() => import('@/components/buki').then(m => ({ default: m.PayloadLab })))
// Train 2 PR-4b.4 — Shingan relocated from Kumite into Scanner Deep Scan tab
const ShinganPanel = lazy(() => import('@/components/shingan').then(m => ({ default: m.ShinganPanel })))
// Arena's MatchCreationWizard requires LLMModelProvider context
import { LLMModelProvider } from '@/lib/contexts/LLMModelContext'

/** Minimal loading fallback for lazy-loaded modules */
function ModuleLoading() {
  return (
    <div className="flex items-center justify-center h-64" aria-busy="true" aria-label="Loading module">
      <div className="w-8 h-8 border-2 border-[var(--dojo-primary)] border-t-transparent rounded-full motion-safe:animate-spin" />
    </div>
  )
}

/**
 * Page content - routes activeTab from NavigationContext to the correct content section
 */
function PageContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { scanText, clear } = useScanner()

  // Fixtures state (shared between scanner and armory)
  const [fixtureManifest, setFixtureManifest] = useState<FixtureManifest | null>(null)
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [fixtureError, setFixtureError] = useState<string | null>(null)
  const [selectedFixture, setSelectedFixture] = useState<{
    path: string
    content: TextFixtureResponse | BinaryFixtureResponse
    scanResult: ScanResult | null
  } | null>(null)
  const fixtureLoadAttemptedRef = useRef(false)
  // Comparison state (Story 3.3)
  const [comparisonItems, setComparisonItems] = useState<[ComparisonItem, ComparisonItem] | null>(null)

  const loadFixtures = useCallback(async (options?: { force?: boolean }) => {
    if (isLoadingFixtures) return
    if (!options?.force && (fixtureManifest || fixtureLoadAttemptedRef.current)) {
      return
    }

    fixtureLoadAttemptedRef.current = true
    setIsLoadingFixtures(true)
    setFixtureError(null)
    try {
      const manifest = await getCachedFixtureManifest()
      setFixtureManifest(manifest)
    } catch {
      setFixtureError('Could not load fixtures. Check connection and try again.')
    } finally {
      setIsLoadingFixtures(false)
    }
  }, [fixtureManifest, isLoadingFixtures])

  useEffect(() => {
    if (activeTab !== 'armory' || fixtureManifest || fixtureLoadAttemptedRef.current) {
      return
    }
    void loadFixtures()
  }, [activeTab, fixtureManifest, loadFixtures])

  const handleScanFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const result = await scanFixture(path)
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: result })
      setActiveTab('armory')
    } catch {
      setFixtureError('Unable to scan fixture. Check connection and try again.')
    }
  }

  const handleViewFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: null })
      setActiveTab('armory')
    } catch {
      setFixtureError('Unable to load fixture. Check connection and try again.')
    }
  }

  const handleCompare = async (selections: [{ category: string; file: string }, { category: string; file: string }]) => {
    const loadItem = async (sel: { category: string; file: string }): Promise<ComparisonItem> => {
      const path = `${sel.category}/${sel.file}`
      try {
        const [content, scanResult] = await Promise.all([
          readFixture(path),
          scanFixture(path).catch(() => null),
        ])
        return { path, content, scanResult }
      } catch {
        return { path, content: null, scanResult: null }
      }
    }

    const [left, right] = await Promise.all([
      loadItem(selections[0]),
      loadItem(selections[1]),
    ])
    if (left.content === null && right.content === null) {
      setFixtureError('Unable to load fixtures for comparison. Check connection and try again.')
      return
    }
    setComparisonItems([left, right])
  }

  return (
    <>
      {activeTab === 'dashboard' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Dashboard Error" fallbackDescription="Unable to load dashboard. Please try again.">
            <NODADashboard />
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'scanner' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Scanner Error" fallbackDescription="Unable to load scanner. Please try again.">
            <ScannerContent onScan={scanText} onClear={clear} />
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'armory' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Armory Error" fallbackDescription="Unable to load Armory. Please try again.">
            <ArmoryContent
              manifest={fixtureManifest}
              isLoading={isLoadingFixtures}
              fixtureError={fixtureError}
              onRetryFixtures={() => loadFixtures({ force: true })}
              onScanFixture={handleScanFixture}
              onViewFixture={handleViewFixture}
              selectedFixture={selectedFixture}
              onCloseFixtureDetail={() => setSelectedFixture(null)}
              onScan={scanText}
              comparisonItems={comparisonItems}
              onCloseComparison={() => setComparisonItems(null)}
              onCompare={handleCompare}
            />
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'jutsu' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Model Lab Error" fallbackDescription="Unable to load Model Lab. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <ModelLabWithProviders />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'guard' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Hattori Guard Error" fallbackDescription="Unable to load Hattori Guard. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <GuardDashboard />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'admin' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Admin Error" fallbackDescription="Unable to load admin panel. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <AdminPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'adversarial' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Atemi Lab Error" fallbackDescription="Unable to load Atemi Lab. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <AdversarialLab />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'compliance' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Bushido Book Error" fallbackDescription="Unable to load Bushido Book. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <ComplianceCenter />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'strategic' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="The Kumite Error" fallbackDescription="Unable to load The Kumite. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <StrategicHub />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {activeTab === 'ronin-hub' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Ronin Hub Error" fallbackDescription="Unable to load Ronin Hub. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <RoninHub />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'sengoku' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Sengoku Error" fallbackDescription="Unable to load Sengoku. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <SengokuDashboard />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'kotoba' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Kotoba Error" fallbackDescription="Unable to load Kotoba. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <KotobaDashboard />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Train 2 PR-4b.1 — Kumite children promoted to first-class tabs */}
      {activeTab === 'mitsuke' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Mitsuke Error" fallbackDescription="Unable to load Mitsuke threat feed. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <MitsukeLibrary />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'dna' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Attack DNA Error" fallbackDescription="Unable to load Amaterasu DNA explorer. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <AttackDNAExplorer />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'kagami' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Kagami Error" fallbackDescription="Unable to load Kagami mirror test. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <KagamiPanel />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {activeTab === 'arena' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Battle Arena Error" fallbackDescription="Unable to load Battle Arena. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              {/* LLMModelProvider is required because MatchCreationWizard
                  inside ArenaBrowser uses useModelContext() to list models. */}
              <LLMModelProvider>
                <ArenaBrowser />
              </LLMModelProvider>
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {/* Train 2 PR-4b.2 — Payload Lab (Buki) scaffolded shell */}
      {activeTab === 'buki' && (
        <div className="motion-safe:animate-fade-in">
          <ErrorBoundary fallbackTitle="Payload Lab Error" fallbackDescription="Unable to load Payload Lab. Please try again.">
            <Suspense fallback={<ModuleLoading />}>
              <PayloadLab />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </>
  )
}

/**
 * Scanner content
 */
type ScannerSubTab = 'interactive' | 'deep-scan'

function ScannerContent({ onScan, onClear }: { onScan: (text: string) => void; onClear: () => void }) {
  const { scanResult, isScanning, error, engineFilters, toggleFilter, resetFilters } = useScanner()
  const metrics = useScannerMetrics()
  const { logEvent } = useActivityLogger()
  const allEnginesDisabled = engineFilters.every(f => !f.enabled)
  const prevScanResultRef = useRef<ScanResult | null>(null)
  // Train 2 PR-4b.4 — Shingan merged into Scanner Deep Scan sub-tab
  const [scannerTab, setScannerTab] = useState<ScannerSubTab>('interactive')

  // Log scan events to activity feed — static descriptions only, never user input
  useEffect(() => {
    if (scanResult && scanResult !== prevScanResultRef.current) {
      prevScanResultRef.current = scanResult
      if (scanResult.verdict === 'BLOCK') {
        logEvent('threat_detected', `Scan completed: BLOCK verdict, ${scanResult.counts.critical} critical, ${scanResult.counts.warning} warning findings`)
      } else {
        logEvent('scan_complete', `Scan completed: ALLOW verdict, ${scanResult.findings.length} findings`)
      }
    }
  }, [scanResult, logEvent])

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Haiku Scanner"
        subtitle="Live prompt injection detection"
        searchPlaceholder="Search engines, patterns..."
      />

      <Tabs value={scannerTab} onValueChange={(v) => setScannerTab(v as ScannerSubTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="interactive">Interactive</TabsTrigger>
          <TabsTrigger value="deep-scan">Deep Scan</TabsTrigger>
        </TabsList>

        <TabsContent value="interactive" className="mt-6 space-y-6">
      {/* Metric Cards - Display-only metrics, NOT for security decisions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Scans"
          value={metrics.totalScans}
          icon={ScanLine}
          accent="primary"
        />
        <MetricCard
          label="Threats Detected"
          value={metrics.threatsDetected}
          icon={ShieldAlert}
          sparklineData={metrics.threatTrend}
          accent={metrics.threatsDetected > 0 ? 'danger' : 'success'}
        />
        <MetricCard
          label="Pass Rate"
          value={metrics.passRate}
          icon={CheckCircle}
          accent="success"
        />
        <MetricCard
          label="Active Engines"
          value={`${metrics.activeEngines}/${metrics.totalEngines}`}
          icon={Cpu}
          accent={metrics.activeEngines === metrics.totalEngines ? 'primary' : 'warning'}
        />
      </div>

      {/* Engine Filters */}
      <div className="glass-card rounded-lg border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">Engine Stack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curate which detectors participate in this scan lane. Keep at least one engine active for meaningful coverage.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {metrics.activeEngines} active scanners across {metrics.totalEngines} available engines
          </p>
        </div>
        <FilterPills
          filters={engineFilters}
          onToggle={toggleFilter}
          onReset={resetFilters}
          className="mt-4"
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Scanner Grid */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:gap-5">
        <div className="clean-context">
          <ScannerInput onScan={onScan} onClear={onClear} isScanning={isScanning} allEnginesDisabled={allEnginesDisabled} />
        </div>
        <div className="blundesi-context xl:sticky xl:top-4 self-start">
          <ScannerInsightsPanel result={scanResult} />
        </div>
      </div>
        </TabsContent>

        <TabsContent value="deep-scan" className="mt-6">
          <Suspense fallback={<ModuleLoading />}>
            <ShinganPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Armory content - combines Fixtures + Test Payloads with sub-navigation
 */
function ArmoryContent({
  manifest,
  isLoading,
  fixtureError,
  onRetryFixtures,
  onScanFixture,
  onViewFixture,
  selectedFixture,
  onCloseFixtureDetail,
  onScan,
  comparisonItems,
  onCloseComparison,
  onCompare,
}: {
  manifest: FixtureManifest | null
  isLoading: boolean
  fixtureError: string | null
  onRetryFixtures: () => void
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  selectedFixture: { path: string; content: TextFixtureResponse | BinaryFixtureResponse; scanResult: ScanResult | null } | null
  onCloseFixtureDetail: () => void
  onScan: (text: string) => void
  comparisonItems: [ComparisonItem, ComparisonItem] | null
  onCloseComparison: () => void
  onCompare: (selections: [{ category: string; file: string }, { category: string; file: string }]) => void
}) {
  const [subTab, setSubTab] = useState<'fixtures' | 'payloads'>('fixtures')

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Armory"
        subtitle="Fixtures and test payloads"
        searchPlaceholder="Search fixtures, payloads..."
      />

      {/* Sub-navigation */}
      <Tabs value={subTab} onValueChange={(v) => setSubTab(v as 'fixtures' | 'payloads')}>
        <TabsList aria-label="Armory sections" className="bg-muted/50">
          <TabsTrigger value="fixtures" className="min-h-[44px]">
            Fixtures
          </TabsTrigger>
          <TabsTrigger value="payloads" className="min-h-[44px]">
            Test Payloads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixtures">
          <FixturesSection
            manifest={manifest}
            isLoading={isLoading}
            fixtureError={fixtureError}
            onRetryFixtures={onRetryFixtures}
            onScanFixture={onScanFixture}
            onViewFixture={onViewFixture}
            selectedFixture={selectedFixture}
            onCloseFixtureDetail={onCloseFixtureDetail}
            comparisonItems={comparisonItems}
            onCloseComparison={onCloseComparison}
            onCompare={onCompare}
          />
        </TabsContent>

        <TabsContent value="payloads">
          <PayloadsSection onScan={onScan} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Fixtures section within Armory
 */
function FixturesSection({
  manifest,
  isLoading,
  fixtureError,
  onRetryFixtures,
  onScanFixture,
  onViewFixture,
  selectedFixture,
  onCloseFixtureDetail,
  comparisonItems,
  onCloseComparison,
  onCompare,
}: {
  manifest: FixtureManifest | null
  isLoading: boolean
  fixtureError: string | null
  onRetryFixtures: () => void
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  selectedFixture: { path: string; content: TextFixtureResponse | BinaryFixtureResponse; scanResult: ScanResult | null } | null
  onCloseFixtureDetail: () => void
  comparisonItems: [ComparisonItem, ComparisonItem] | null
  onCloseComparison: () => void
  onCompare: (selections: [{ category: string; file: string }, { category: string; file: string }]) => void
}) {
  return (
    <div className="space-y-6">
      {/* Error state — generic message, no server details */}
      {fixtureError && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-red-500">{fixtureError}</span>
          <button
            onClick={onRetryFixtures}
            className="ml-auto text-sm text-[var(--dojo-primary)] hover:underline font-medium"
          >
            Retry
          </button>
        </div>
      )}

      <FixtureExplorer
        manifest={manifest}
        isLoading={isLoading}
        onScanFixture={onScanFixture}
        onViewFixture={onViewFixture}
        onCompare={onCompare}
      />

      {selectedFixture && (
        <FixtureDetail
          path={selectedFixture.path}
          content={selectedFixture.content}
          scanResult={selectedFixture.scanResult}
          onClose={onCloseFixtureDetail}
          autoScrollRef={(el: HTMLDivElement | null) => {
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      )}

      {comparisonItems && (
        <FixtureComparison
          items={comparisonItems}
          onClose={onCloseComparison}
        />
      )}
    </div>
  )
}

/**
 * Payloads section within Armory
 */
function PayloadsSection({ onScan }: { onScan: (text: string) => void }) {
  const [showCurrent, setShowCurrent] = useState(true)
  const [showPlanned, setShowPlanned] = useState(false)
  const { loadPayload } = useScanner()
  const { setActiveTab } = useNavigation()

  const filteredPayloads = PAYLOAD_CATALOG.filter((payload) => {
    if (payload.status === 'current' && showCurrent) return true
    if (payload.status === 'planned' && showPlanned) return true
    return false
  })

  const handleLoadToScanner = useCallback((example: string) => {
    loadPayload(example)
    setActiveTab('scanner')
  }, [loadPayload, setActiveTab])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <span className="text-sm font-semibold">Show:</span>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showCurrent}
            onChange={(e) => setShowCurrent(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          Current Detection
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showPlanned}
            onChange={(e) => setShowPlanned(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          TPI Planned
        </label>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPayloads.map((payload) => (
          <PayloadCard
            key={payload.title}
            payload={payload}
            onClick={() => {
              handleLoadToScanner(payload.example)
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** Connected SenseiDrawer — reads activeTab from NavigationContext (SH8.1) */
function ConnectedSenseiDrawer() {
  const { activeTab, setActiveTab } = useNavigation()
  return <SenseiDrawer activeModule={activeTab} onNavigate={setActiveTab} />
}

/** Screen reader announcer for module navigation changes (Story 5.3) */
function ScreenReaderAnnouncer() {
  const { activeTab } = useNavigation()
  const activeLabel = NAV_ITEMS.find(item => item.id === activeTab)?.label ?? activeTab
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {`Viewing ${activeLabel}`}
    </div>
  )
}

/**
 * Main page component with providers and sidebar layout
 */
export default function Home() {
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        {/* Desktop/Tablet Sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Desktop/Tablet TopBar — global chrome (Activity drawer, Sensei, Notifications) */}
        <TopBar />

        {/* Mobile Bottom Nav (hidden on tablet/desktop) */}
        <MobileNav />

        {/* Sensei AI Assistant Drawer (SH8.1) */}
        <ConnectedSenseiDrawer />

        {/* Main Content — offset for sidebar (left) and top bar (top).
         *  Train 1 PR-2: removed BUG-006 --sidebar-current runtime variable.
         *  Fixed sidebar width → fixed content padding, no runtime sync. */}
        <main
          id="main-content"
          aria-label="Main content"
          className={cn(
            "pb-16 md:pb-8 pr-6 pl-6",
            "pt-[calc(var(--header-height)+16px)] md:pt-[calc(var(--header-height)+24px)]",
            "md:pl-[calc(var(--sidebar-width)+24px)]"
          )}
        >
          <ScreenReaderAnnouncer />
          <div className="max-w-7xl mx-auto">
            <PageContent />
          </div>
        </main>
      </div>
    </Providers>
  )
}
