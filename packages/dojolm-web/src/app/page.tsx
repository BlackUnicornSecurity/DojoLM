/**
 * File: page.tsx
 * Purpose: Main application page with context-based navigation
 * Stories: TPI-UI-001-08 (tab refactor), TPI-UI-001-09 (layout integration), TPI-UI-001-15 (toolbar)
 */

'use client'

import { useState, useEffect } from 'react'
import { ScannerProvider, useScanner } from '@/lib/ScannerContext'
import { NavigationProvider, useNavigation } from '@/lib/NavigationContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PageToolbar } from '@/components/layout/PageToolbar'
import { Button } from '@/components/ui/button'
import { ScannerInput } from '@/components/scanner'
import { FindingsList } from '@/components/scanner'
import { FixtureList, FixtureDetail } from '@/components/fixtures'
import { PayloadCard } from '@/components/payloads'
import { CoverageMap } from '@/components/coverage'
import { PatternReference } from '@/components/reference'
import { TestRunner } from '@/components/tests'
import { LLMDashboardWithProviders } from '@/components/llm'
import { AdversarialLab } from '@/components/adversarial'
import { ComplianceCenter } from '@/components/compliance'
import { StrategicHub } from '@/components/strategic'
import { AttackDNAExplorer } from '@/components/attackdna'
import { getFixtures, scanFixture, readFixture, runTests } from '@/lib/api'
import { cn } from '@/lib/utils'
import { PAYLOAD_CATALOG, COVERAGE_DATA, OWASP_LLM_COVERAGE_DATA } from '@/lib/constants'
import {
  PI_PATTERNS,
  JB_PATTERNS,
  SETTINGS_WRITE_PATTERNS,
  AGENT_OUTPUT_PATTERNS,
  SEARCH_RESULT_PATTERNS,
} from '@dojolm/scanner'
import type { ScanResult, TextFixtureResponse, BinaryFixtureResponse, FixtureManifest, TestSuiteResult } from '@/lib/types'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Page content - routes activeTab from NavigationContext to the correct content section
 */
function PageContent() {
  const { activeTab, setActiveTab } = useNavigation()
  const { scanText, clear } = useScanner()

  // Fixtures state (shared between scanner and test lab)
  const [fixtureManifest, setFixtureManifest] = useState<FixtureManifest | null>(null)
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<{
    path: string
    content: TextFixtureResponse | BinaryFixtureResponse
    scanResult: ScanResult | null
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      setIsLoadingFixtures(true)
      try {
        const manifest = await getFixtures()
        setFixtureManifest(manifest)
      } catch (error) {
        console.error('Failed to load fixtures:', error)
      } finally {
        setIsLoadingFixtures(false)
      }
    }
    load()
  }, [])

  const handleScanFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const result = await scanFixture(path)
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: result })
      setActiveTab('testing')
    } catch (error) {
      console.error('Failed to scan fixture:', error)
    }
  }

  const handleViewFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: null })
      setActiveTab('testing')
    } catch (error) {
      console.error('Failed to view fixture:', error)
    }
  }

  const handleRunTests = async (filter?: string, verbose?: boolean) => {
    return await runTests(filter, verbose)
  }

  return (
    <>
      {activeTab === 'scanner' && (
        <ScannerContent onScan={scanText} onClear={clear} />
      )}
      {activeTab === 'testing' && (
        <TestLabContent
          manifest={fixtureManifest}
          isLoading={isLoadingFixtures}
          onScanFixture={handleScanFixture}
          onViewFixture={handleViewFixture}
          selectedFixture={selectedFixture}
          onCloseFixtureDetail={() => setSelectedFixture(null)}
          onScan={scanText}
        />
      )}
      {activeTab === 'coverage' && (
        <CoverageContent />
      )}
      {activeTab === 'validation' && (
        <ValidationContent onRunTests={handleRunTests} />
      )}
      {activeTab === 'llm' && (
        <LLMDashboardWithProviders />
      )}
      {activeTab === 'adversarial' && (
        <AdversarialLab />
      )}
      {activeTab === 'compliance' && (
        <ComplianceCenter />
      )}
      {activeTab === 'strategic' && (
        <StrategicHub />
      )}
      {activeTab === 'attackdna' && (
        <AttackDNAExplorer />
      )}
    </>
  )
}

/**
 * Scanner content
 */
function ScannerContent({ onScan, onClear }: { onScan: (text: string) => void; onClear: () => void }) {
  const { scanResult, isScanning, error, engineFilters, toggleFilter, resetFilters } = useScanner()

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Scanner"
        subtitle="Live prompt injection detection"
        searchPlaceholder="Search engines, patterns..."
      />

      {/* Engine Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-semibold">Engines:</span>
          {engineFilters.map((filter) => (
            <label key={filter.id} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={() => toggleFilter(filter.id)}
                className="accent-primary w-4 h-4"
              />
              {filter.label}
            </label>
          ))}
        </div>
        <Button
          onClick={resetFilters}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" />
          Reset Filters
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Scanner Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ScannerInput onScan={onScan} onClear={onClear} isScanning={isScanning} />
        <FindingsList result={scanResult} />
      </div>
    </div>
  )
}

/**
 * Test Lab content - combines Fixtures + Test Payloads with sub-navigation
 */
function TestLabContent({
  manifest,
  isLoading,
  onScanFixture,
  onViewFixture,
  selectedFixture,
  onCloseFixtureDetail,
  onScan,
}: {
  manifest: FixtureManifest | null
  isLoading: boolean
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  selectedFixture: { path: string; content: TextFixtureResponse | BinaryFixtureResponse; scanResult: ScanResult | null } | null
  onCloseFixtureDetail: () => void
  onScan: (text: string) => void
}) {
  const [subTab, setSubTab] = useState<'fixtures' | 'payloads'>('fixtures')

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Test Lab"
        subtitle="Fixtures and test payloads"
        searchPlaceholder="Search fixtures, payloads..."
      />

      {/* Sub-navigation */}
      <div role="tablist" aria-label="Test Lab sections" className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
        <button
          role="tab"
          aria-selected={subTab === 'fixtures'}
          aria-controls="panel-fixtures"
          id="tab-fixtures"
          onClick={() => setSubTab('fixtures')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium min-h-[44px]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            subTab === 'fixtures'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Fixtures
        </button>
        <button
          role="tab"
          aria-selected={subTab === 'payloads'}
          aria-controls="panel-payloads"
          id="tab-payloads"
          onClick={() => setSubTab('payloads')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium min-h-[44px]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            subTab === 'payloads'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Test Payloads
        </button>
      </div>

      {subTab === 'fixtures' && (
        <div id="panel-fixtures" role="tabpanel" aria-labelledby="tab-fixtures">
          <FixturesSection
            manifest={manifest}
            isLoading={isLoading}
            onScanFixture={onScanFixture}
            onViewFixture={onViewFixture}
            selectedFixture={selectedFixture}
            onCloseFixtureDetail={onCloseFixtureDetail}
          />
        </div>
      )}

      {subTab === 'payloads' && (
        <div id="panel-payloads" role="tabpanel" aria-labelledby="tab-payloads">
          <PayloadsSection onScan={onScan} />
        </div>
      )}
    </div>
  )
}

/**
 * Fixtures section within Test Lab
 */
function FixturesSection({
  manifest,
  isLoading,
  onScanFixture,
  onViewFixture,
  selectedFixture,
  onCloseFixtureDetail,
}: {
  manifest: FixtureManifest | null
  isLoading: boolean
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  selectedFixture: { path: string; content: TextFixtureResponse | BinaryFixtureResponse; scanResult: ScanResult | null } | null
  onCloseFixtureDetail: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attack Fixture Files</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Real attack artifacts for testing TPI validators
          </p>
        </div>
      </div>

      <FixtureList
        manifest={manifest}
        isLoading={isLoading}
        onScanFixture={onScanFixture}
        onViewFixture={onViewFixture}
      />

      {selectedFixture && (
        <FixtureDetail
          path={selectedFixture.path}
          content={selectedFixture.content}
          scanResult={selectedFixture.scanResult}
          onClose={onCloseFixtureDetail}
        />
      )}
    </div>
  )
}

/**
 * Payloads section within Test Lab
 */
function PayloadsSection({ onScan }: { onScan: (text: string) => void }) {
  const [showCurrent, setShowCurrent] = useState(true)
  const [showPlanned, setShowPlanned] = useState(false)

  const filteredPayloads = PAYLOAD_CATALOG.filter((payload) => {
    if (payload.status === 'current' && showCurrent) return true
    if (payload.status === 'planned' && showPlanned) return true
    return false
  })

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPayloads.map((payload) => (
          <PayloadCard
            key={payload.title}
            payload={payload}
            onClick={() => {
              onScan(payload.example)
            }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Coverage content - combines Coverage Map + Pattern Reference with sub-navigation
 */
function CoverageContent() {
  const [subTab, setSubTab] = useState<'map' | 'reference'>('map')

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Coverage"
        subtitle="Coverage maps and pattern reference"
        searchPlaceholder="Search categories, patterns..."
      />

      {/* Sub-navigation */}
      <div role="tablist" aria-label="Coverage sections" className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
        <button
          role="tab"
          aria-selected={subTab === 'map'}
          aria-controls="panel-coverage-map"
          id="tab-coverage-map"
          onClick={() => setSubTab('map')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium min-h-[44px]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            subTab === 'map'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Coverage Map
        </button>
        <button
          role="tab"
          aria-selected={subTab === 'reference'}
          aria-controls="panel-pattern-ref"
          id="tab-pattern-ref"
          onClick={() => setSubTab('reference')}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium min-h-[44px]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            subTab === 'reference'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Pattern Reference
        </button>
      </div>

      {subTab === 'map' && (
        <div id="panel-coverage-map" role="tabpanel" aria-labelledby="tab-coverage-map">
          <CoverageMapSection />
        </div>
      )}
      {subTab === 'reference' && (
        <div id="panel-pattern-ref" role="tabpanel" aria-labelledby="tab-pattern-ref">
          <PatternReferenceSection />
        </div>
      )}
    </div>
  )
}

/**
 * Coverage map section
 */
function CoverageMapSection() {
  const [coverageType, setCoverageType] = useState<'tpi' | 'owasp'>('tpi')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Coverage Maps</h2>
          <p className="text-sm text-muted-foreground mt-1">
            TPI taxonomy and OWASP LLM Top 10 coverage visualization
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
          <button
            onClick={() => setCoverageType('tpi')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              coverageType === 'tpi'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            TPI Coverage
          </button>
          <button
            onClick={() => setCoverageType('owasp')}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              coverageType === 'owasp'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            OWASP LLM Top 10
          </button>
        </div>
      </div>

      {coverageType === 'tpi' ? (
        <CoverageMap
          coverageData={COVERAGE_DATA}
          title="TPI Coverage Map"
          subtitle="CrowdStrike TPI taxonomy coverage • 100% across all categories"
          icon="shield"
        />
      ) : (
        <CoverageMap
          coverageData={OWASP_LLM_COVERAGE_DATA}
          title="OWASP LLM Top 10 Coverage"
          subtitle="OWASP LLM Top 10 vulnerability coverage • 100% across all categories"
          icon="database"
        />
      )}
    </div>
  )
}

/**
 * Pattern reference section
 */
function PatternReferenceSection() {
  const patternGroups = [
    {
      name: 'Prompt Injection',
      patterns: PI_PATTERNS.map(p => ({
        name: p.name,
        cat: p.cat,
        sev: p.sev,
        desc: p.desc,
        source: p.source || 'current',
      })),
      type: 'current' as const,
    },
    {
      name: 'Jailbreak',
      patterns: JB_PATTERNS.map(p => ({
        name: p.name,
        cat: p.cat,
        sev: p.sev,
        desc: p.desc,
        source: p.source || 'current',
        weight: p.weight,
      })),
      type: 'current' as const,
    },
    {
      name: 'Settings Write',
      patterns: SETTINGS_WRITE_PATTERNS.map(p => ({
        name: p.name,
        cat: p.cat,
        sev: p.sev,
        desc: p.desc,
        source: p.source || 'current',
      })),
      type: 'current' as const,
    },
    {
      name: 'Agent Output',
      patterns: AGENT_OUTPUT_PATTERNS.map(p => ({
        name: p.name,
        cat: p.cat,
        sev: p.sev,
        desc: p.desc,
        source: p.source || 'current',
      })),
      type: 'current' as const,
    },
    {
      name: 'Search Result',
      patterns: SEARCH_RESULT_PATTERNS.map(p => ({
        name: p.name,
        cat: p.cat,
        sev: p.sev,
        desc: p.desc,
        source: p.source || 'current',
      })),
      type: 'current' as const,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pattern Reference</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete pattern documentation
        </p>
      </div>
      <PatternReference patternGroups={patternGroups} />
    </div>
  )
}

/**
 * Validation content - test runner
 */
function ValidationContent({ onRunTests }: { onRunTests: (filter?: string, verbose?: boolean) => Promise<TestSuiteResult> }) {
  return (
    <TestRunner onRunTests={onRunTests} />
  )
}

/**
 * Main page component with providers and sidebar layout
 */
export default function Home() {
  return (
    <NavigationProvider>
      <ScannerProvider>
        <div className="min-h-screen bg-background">
          {/* Desktop/Tablet Sidebar (hidden on mobile) */}
          <Sidebar />

          {/* Mobile Bottom Nav (hidden on tablet/desktop) */}
          <MobileNav />

          {/* Main Content - offset for sidebar */}
          <main className={cn(
            "pt-6 pb-16 md:pb-6 pr-4 pl-4",
            "md:pl-[calc(var(--sidebar-collapsed)+16px)] lg:pl-[calc(var(--sidebar-width)+16px)]",
            "motion-safe:transition-[padding-left] motion-safe:duration-[var(--transition-normal)]"
          )}>
            <div className="max-w-7xl mx-auto">
              <PageContent />
            </div>
          </main>
        </div>
      </ScannerProvider>
    </NavigationProvider>
  )
}
