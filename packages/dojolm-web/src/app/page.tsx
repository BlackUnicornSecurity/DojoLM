/**
 * File: page.tsx
 * Purpose: Main application page with tab navigation
 * Index:
 * - Imports (line 12)
 * - Main Page component (line 60)
 * - ScannerTab component (line 200)
 * - FixturesTab component (line 280)
 * - PayloadsTab component (line 370)
 * - CoverageMapTab component (line 420)
 * - PatternReferenceTab component (line 460)
 * - TestRunnerTab component (line 510)
 */

'use client'

import { useState, useEffect } from 'react'
import { ScannerProvider, useScanner } from '@/lib/ScannerContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ScannerInput } from '@/components/scanner'
import { FindingsList } from '@/components/scanner'
import { FixtureList, FixtureDetail } from '@/components/fixtures'
import { PayloadCard } from '@/components/payloads'
import { CoverageMap } from '@/components/coverage'
import { PatternReference } from '@/components/reference'
import { TestRunner } from '@/components/tests'
import { getFixtures, scanFixture, readFixture, runTests } from '@/lib/api'
import { PAYLOAD_CATALOG, COVERAGE_DATA, TABS, APP_METADATA } from '@/lib/constants'
import {
  PI_PATTERNS,
  JB_PATTERNS,
  SETTINGS_WRITE_PATTERNS,
  AGENT_OUTPUT_PATTERNS,
  SEARCH_RESULT_PATTERNS,
  getPatternGroups
} from '@dojolm/scanner'
import type { ScanResult, TextFixtureResponse, BinaryFixtureResponse, FixtureManifest } from '@/lib/types'
import { Shield, AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Main application content component
 */
function AppContent() {
  const { scanText, clear } = useScanner()
  const [activeTab, setActiveTab] = useState('scanner')

  // Fixtures state
  const [fixtureManifest, setFixtureManifest] = useState<FixtureManifest | null>(null)
  const [isLoadingFixtures, setIsLoadingFixtures] = useState(false)
  const [selectedFixture, setSelectedFixture] = useState<{
    path: string
    content: TextFixtureResponse | BinaryFixtureResponse
    scanResult: ScanResult | null
  } | null>(null)

  // Load fixtures on mount
  useEffect(() => {
    loadFixtures()
  }, [])

  const loadFixtures = async () => {
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

  const handleScanFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const result = await scanFixture(path)
      const content = await readFixture(path)

      setSelectedFixture({
        path,
        content,
        scanResult: result,
      })

      // Switch to fixtures tab to show results
      setActiveTab('fixtures')
    } catch (error) {
      console.error('Failed to scan fixture:', error)
    }
  }

  const handleViewFixture = async (category: string, file: string) => {
    const path = `${category}/${file}`
    try {
      const content = await readFixture(path)
      setSelectedFixture({ path, content, scanResult: null })
      setActiveTab('fixtures')
    } catch (error) {
      console.error('Failed to view fixture:', error)
    }
  }

  const handleCloseFixtureDetail = () => {
    setSelectedFixture(null)
  }

  const handleRunTests = async (filter?: string, verbose?: boolean) => {
    return await runTests(filter, verbose)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {APP_METADATA.title}
            </h1>
          </div>
          <p className="text-muted-foreground">{APP_METADATA.description}</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
              Current Validators
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
              TPI Planned
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
              Gaps
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full h-auto gap-2 bg-muted/50 p-2">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-6">
            <ScannerTab onScan={scanText} onClear={clear} />
          </TabsContent>

          {/* Fixtures Tab */}
          <TabsContent value="fixtures" className="space-y-6">
            <FixturesTab
              manifest={fixtureManifest}
              isLoading={isLoadingFixtures}
              onScanFixture={handleScanFixture}
              onViewFixture={handleViewFixture}
              selectedFixture={selectedFixture}
              onCloseFixtureDetail={handleCloseFixtureDetail}
              onReloadFixtures={loadFixtures}
            />
          </TabsContent>

          {/* Payloads Tab */}
          <TabsContent value="payloads" className="space-y-6">
            <PayloadsTab onScan={scanText} />
          </TabsContent>

          {/* Coverage Map Tab */}
          <TabsContent value="coverage" className="space-y-6">
            <CoverageMapTab />
          </TabsContent>

          {/* Pattern Reference Tab */}
          <TabsContent value="reference" className="space-y-6">
            <PatternReferenceTab />
          </TabsContent>

          {/* Test Runner Tab */}
          <TabsContent value="tests" className="space-y-6">
            <TestRunnerTab onRunTests={handleRunTests} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

/**
 * Scanner tab component
 */
function ScannerTab({ onScan, onClear }: { onScan: (text: string) => void; onClear: () => void }) {
  const { scanResult, isScanning, error, engineFilters, toggleFilter, resetFilters } = useScanner()

  return (
    <div className="space-y-6">
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
          <RotateCcw className="h-3 w-3" />
          Reset Filters
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500">
          <AlertTriangle className="h-5 w-5" />
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
 * Fixtures tab component
 */
function FixturesTab({
  manifest,
  isLoading,
  onScanFixture,
  onViewFixture,
  selectedFixture,
  onCloseFixtureDetail,
  onReloadFixtures,
}: {
  manifest: FixtureManifest | null
  isLoading: boolean
  onScanFixture: (category: string, file: string) => void
  onViewFixture: (category: string, file: string) => void
  selectedFixture: { path: string; content: TextFixtureResponse | BinaryFixtureResponse; scanResult: ScanResult | null } | null
  onCloseFixtureDetail: () => void
  onReloadFixtures: () => void
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
 * Payloads tab component
 */
function PayloadsTab({ onScan }: { onScan: (text: string) => void }) {
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
        {filteredPayloads.map((payload, index) => (
          <PayloadCard
            key={index}
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
 * Coverage map tab component
 */
function CoverageMapTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">TPI Coverage Map</h2>
        <p className="text-sm text-muted-foreground mt-1">
          CrowdStrike taxonomy coverage visualization
        </p>
      </div>
      <CoverageMap coverageData={COVERAGE_DATA} />
    </div>
  )
}

/**
 * Pattern reference tab component
 */
function PatternReferenceTab() {
  // Build pattern groups from scanner package
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
 * Test runner tab component
 */
function TestRunnerTab({ onRunTests }: { onRunTests: (filter?: string, verbose?: boolean) => Promise<any> }) {
  return (
    <div className="space-y-6">
      <TestRunner onRunTests={onRunTests} />
    </div>
  )
}

/**
 * Main page component with provider
 */
export default function Home() {
  return (
    <ScannerProvider>
      <AppContent />
    </ScannerProvider>
  )
}
