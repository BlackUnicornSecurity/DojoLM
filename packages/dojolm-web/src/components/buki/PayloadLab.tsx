/**
 * File: PayloadLab.tsx
 * Purpose: Payload Lab (Buki) — unified hub for fixtures, payloads, generator,
 *          and fuzzer. Absorbs Armory fixtures + payloads (Testing UX Consolidation).
 *
 * Train 2 PR-4b.2 (2026-04-09): Scaffolded shell
 * Testing UX Consolidation (2026-04-13): Armory absorption — Fixtures + Payloads
 *   tabs now render real content instead of EmptyState redirects.
 *
 * Codename: Buki (武器, "weapons / arms")
 */

'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Warehouse, Sparkles, Shuffle, FileText, AlertTriangle } from 'lucide-react'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { useFixtureManagement } from '@/lib/hooks/useFixtureManagement'
import { useScanner } from '@/lib/ScannerContext'
import { useNavigation } from '@/lib/NavigationContext'
import { FixtureExplorer, FixtureDetail, FixtureComparison } from '@/components/fixtures'
import { PayloadCard } from '@/components/payloads'
import { PAYLOAD_CATALOG } from '@/lib/constants'

// Train 2 PR-4b.3 — SAGE relocated from Kumite into Payload Lab Generator tab
const SAGEDashboard = lazy(() =>
  import('@/components/strategic').then(m => ({ default: m.SAGEDashboard }))
)
// Train 3 PR-4f.3 — FuzzerPanel wires bu-tpi/src/fuzzing/ engine
const FuzzerPanel = lazy(() =>
  import('./FuzzerPanel').then(m => ({ default: m.FuzzerPanel }))
)

type BukiTab = 'fixtures' | 'payloads' | 'generator' | 'fuzzer'

/** Loading fallback for lazy sub-tabs */
function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16" aria-busy="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
    </div>
  )
}

export function PayloadLab() {
  const [activeTab, setActiveTab] = useState<BukiTab>('fixtures')
  const { setActiveTab: setNavTab } = useNavigation()
  const { loadPayload } = useScanner()

  // Fixture management (extracted from page.tsx)
  const {
    fixtureManifest,
    isLoadingFixtures,
    fixtureError,
    selectedFixture,
    comparisonItems,
    loadFixtures,
    handleScanFixture,
    handleViewFixture,
    handleCompare,
    clearSelectedFixture,
    clearComparison,
  } = useFixtureManagement()

  // Auto-load fixtures when the fixtures tab is active
  useEffect(() => {
    if (activeTab === 'fixtures') {
      void loadFixtures()
    }
  }, [activeTab, loadFixtures])

  // Payloads state
  const [showCurrent, setShowCurrent] = useState(true)
  const [showPlanned, setShowPlanned] = useState(false)

  const filteredPayloads = PAYLOAD_CATALOG.filter((payload) => {
    if (payload.status === 'current' && showCurrent) return true
    if (payload.status === 'planned' && showPlanned) return true
    return false
  })

  const handleLoadToScanner = useCallback((example: string) => {
    loadPayload(example)
    setNavTab('scanner')
  }, [loadPayload, setNavTab])

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Payload Lab"
        subtitle="武器 (Buki) — fixtures, payloads, synthetic generator, and fuzzer"
        icon={Warehouse}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BukiTab)}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="fixtures" className="gap-2">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>Fixtures</span>
          </TabsTrigger>
          <TabsTrigger value="payloads" className="gap-2">
            <Warehouse className="h-4 w-4" aria-hidden="true" />
            <span>Payloads</span>
          </TabsTrigger>
          <TabsTrigger value="generator" className="gap-2">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            <span>Generator</span>
          </TabsTrigger>
          <TabsTrigger value="fuzzer" className="gap-2">
            <Shuffle className="h-4 w-4" aria-hidden="true" />
            <span>Fuzzer</span>
          </TabsTrigger>
        </TabsList>

        {/* Fixtures — absorbed from Armory */}
        <TabsContent value="fixtures" className="mt-6 space-y-6">
          {fixtureError && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" aria-hidden="true" />
              <span className="text-sm text-red-500">{fixtureError}</span>
              <button
                onClick={() => loadFixtures({ force: true })}
                className="ml-auto text-sm text-[var(--dojo-primary)] hover:underline font-medium"
              >
                Retry
              </button>
            </div>
          )}

          <FixtureExplorer
            manifest={fixtureManifest}
            isLoading={isLoadingFixtures}
            onScanFixture={handleScanFixture}
            onViewFixture={handleViewFixture}
            onCompare={handleCompare}
          />

          {selectedFixture && (
            <FixtureDetail
              path={selectedFixture.path}
              content={selectedFixture.content}
              scanResult={selectedFixture.scanResult}
              onClose={clearSelectedFixture}
              autoScrollRef={(el: HTMLDivElement | null) => {
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
            />
          )}

          {comparisonItems && (
            <FixtureComparison
              items={comparisonItems}
              onClose={clearComparison}
            />
          )}
        </TabsContent>

        {/* Payloads — absorbed from Armory */}
        <TabsContent value="payloads" className="mt-6 space-y-6">
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
        </TabsContent>

        {/* Generator: SAGE Dashboard relocated from Kumite (PR-4b.3) */}
        <TabsContent value="generator" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <SAGEDashboard />
          </Suspense>
        </TabsContent>

        {/* Fuzzer: bu-tpi/src/fuzzing/ engine UI (Train 3 PR-4f.3) */}
        <TabsContent value="fuzzer" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <FuzzerPanel />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
