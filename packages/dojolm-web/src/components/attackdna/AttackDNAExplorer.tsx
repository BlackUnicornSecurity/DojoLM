/**
 * File: AttackDNAExplorer.tsx
 * Purpose: Main Amaterasu DNA page with sub-tab navigation, search, stats bar, and tier filtering
 * Story: S76, KASHIWA-12.3
 * Index:
 * - Dynamic imports for sub-views (line 24)
 * - useDNAData hook (line 50)
 * - GUIDE_SECTIONS data (line 115)
 * - LoadingFallback component (line 125)
 * - StatsBar component (line 140)
 * - AttackDNAExplorer component (line 170)
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { AmaterasuGuide, resetAmaterasuGuide, TabHelpButton } from './AmaterasuGuide'
import { Button } from '@/components/ui/button'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { AmaterasuConfig } from './AmaterasuConfig'
import { DataSourceSelector, type MasterSyncStatus } from './DataSourceSelector'
import { DATA_SOURCE_TIERS, mergeStats, type TierStats } from './data-source-tiers'
import type { DataSourceTier } from 'bu-tpi/attackdna'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import {
  Dna,
  Search,
  GitBranch,
  Layers,
  Clock,
  Network,
  ArrowRightLeft,
  Users,
  LayoutGrid,
  HelpCircle,
  Settings,
  Target,
  Microscope,
} from 'lucide-react'

// --- Dynamic imports (S76 requirement: use next/dynamic for visualization components) ---

const FamilyTreeView = dynamic(
  () => import('./FamilyTreeView').then((mod) => ({ default: mod.FamilyTreeView })),
  { loading: () => <LoadingFallback label="Loading Family Tree..." />, ssr: false }
)

const ClusterView = dynamic(
  () => import('./ClusterView').then((mod) => ({ default: mod.ClusterView })),
  { loading: () => <LoadingFallback label="Loading Clusters..." />, ssr: false }
)

const MutationTimeline = dynamic(
  () => import('./MutationTimeline').then((mod) => ({ default: mod.MutationTimeline })),
  { loading: () => <LoadingFallback label="Loading Timeline..." />, ssr: false }
)

const BlackBoxAnalysis = dynamic(
  () => import('./BlackBoxAnalysis').then((mod) => ({ default: mod.BlackBoxAnalysis })),
  { loading: () => <LoadingFallback label="Loading Analysis..." />, ssr: false }
)

// ===========================================================================
// Data Hook — fetches from API based on active tiers
// ===========================================================================

const EMPTY_STATS: TierStats = {
  totalNodes: 0,
  totalEdges: 0,
  totalFamilies: 0,
  totalClusters: 0,
  byCategory: {},
  bySeverity: {},
  bySource: {},
}

interface DNAData {
  stats: TierStats
  families: unknown[]
  clusters: unknown[]
  timeline: unknown[]
  masterSyncStatus: MasterSyncStatus | null
  loading: boolean
}

function useDNAData(activeTiers: Set<DataSourceTier>): DNAData {
  const [stats, setStats] = useState<TierStats>(EMPTY_STATS)
  const [families, setFamilies] = useState<unknown[]>([])
  const [clusters, setClusters] = useState<unknown[]>([])
  const [timeline, setTimeline] = useState<unknown[]>([])
  const [masterSyncStatus, setMasterSyncStatus] = useState<MasterSyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel previous fetch
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    async function fetchData() {
      setLoading(true)
      const tierArr = Array.from(activeTiers)
      const allStats: TierStats[] = []
      let allFamilies: unknown[] = []
      let allClusters: unknown[] = []
      let allTimeline: unknown[] = []

      try {
        for (const tier of tierArr) {
          if (controller.signal.aborted) return

          const tierParam = `sourceTier=${tier}`

          // Fetch stats, families, clusters, timeline in parallel per tier
          const [statsRes, familiesRes, clustersRes, timelineRes] = await Promise.all([
            fetchWithAuth(`/api/attackdna/query?type=stats&${tierParam}`, { signal: controller.signal }),
            fetchWithAuth(`/api/attackdna/query?type=families&${tierParam}`, { signal: controller.signal }),
            fetchWithAuth(`/api/attackdna/query?type=clusters&${tierParam}`, { signal: controller.signal }),
            fetchWithAuth(`/api/attackdna/query?type=timeline&${tierParam}`, { signal: controller.signal }),
          ])

          if (statsRes.ok) {
            const d = await statsRes.json()
            if (d.stats) allStats.push(d.stats)
          }
          if (familiesRes.ok) {
            const d = await familiesRes.json()
            if (d.families) allFamilies = allFamilies.concat(d.families)
          }
          if (clustersRes.ok) {
            const d = await clustersRes.json()
            if (d.clusters) allClusters = allClusters.concat(d.clusters)
          }
          if (timelineRes.ok) {
            const d = await timelineRes.json()
            if (d.timeline) allTimeline = allTimeline.concat(d.timeline)
          }
        }

        // Fetch master sync status if master tier active
        if (activeTiers.has('master') && !controller.signal.aborted) {
          try {
            const syncRes = await fetchWithAuth('/api/attackdna/sync', { signal: controller.signal })
            if (syncRes.ok) {
              const d = await syncRes.json()
              setMasterSyncStatus({
                lastSyncAt: d.config?.lastSyncAt ?? null,
                syncInProgress: d.syncInProgress ?? false,
              })
            }
          } catch {
            // Non-critical — sync status is informational
          }
        }

        if (!controller.signal.aborted) {
          setStats(allStats.length > 0 ? mergeStats(...allStats) : EMPTY_STATS)
          setFamilies(allFamilies)
          setClusters(allClusters)
          setTimeline(allTimeline)
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('DNA data fetch failed:', err)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      controller.abort()
    }
  }, [activeTiers])

  return { stats, families, clusters, timeline, masterSyncStatus, loading }
}

// --- Guide sections ---

const GUIDE_SECTIONS: GuideSection[] = [
  { title: 'Family Trees', content: 'Visualize parent-child relationships between attacks. Each node represents an attack prompt, and edges show how mutations created new variants. Click any node to see its full mutation history.', icon: GitBranch },
  { title: 'Embedding Clusters', content: 'Attacks are grouped by semantic similarity using embedding vectors. Clusters reveal common evasion patterns that span different attack families, helping identify structural weaknesses.', icon: Layers },
  { title: 'Mutation Timeline', content: 'View how attacks evolved chronologically. The timeline highlights mutation bursts, drift patterns, and convergence events where independent attack families developed similar techniques.', icon: Clock },
  { title: 'Cross-Module Actions', content: 'From any node detail panel, you can send attacks to the Atemi Lab for re-testing, export to SAGE for evolution, or flag for Mitsuke threat intelligence tracking.', icon: Target },
]

// --- Sub-components ---

function LoadingFallback({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label={label}>
      <div
        className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-2 border-[var(--dojo-primary)] border-t-transparent"
        aria-hidden="true"
      />
      <span className="ml-3 text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

interface StatsBarProps {
  stats: TierStats
  loading: boolean
}

function StatsBar({ stats, loading }: StatsBarProps) {
  const items = [
    { label: 'Nodes', value: stats.totalNodes, icon: Network },
    { label: 'Edges', value: stats.totalEdges, icon: ArrowRightLeft },
    { label: 'Families', value: stats.totalFamilies, icon: Users },
    { label: 'Clusters', value: stats.totalClusters, icon: LayoutGrid },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list" aria-label="Amaterasu DNA statistics">
      {items.map((stat) => {
        const StatIcon = stat.icon
        return (
          <Card key={stat.label} role="listitem">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center shrink-0">
                <StatIcon className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)] leading-tight">
                  {loading ? '—' : stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// --- Tab Definitions ---

type TabId = 'family-tree' | 'clusters' | 'timeline' | 'analysis'

interface TabDef {
  id: TabId
  label: string
  icon: typeof GitBranch
}

const TABS: TabDef[] = [
  { id: 'family-tree', label: 'Family Tree', icon: GitBranch },
  { id: 'clusters', label: 'Clusters', icon: Layers },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'analysis', label: 'Analysis', icon: Microscope },
]

// --- Main Component ---

export function AttackDNAExplorer() {
  const [activeTab, setActiveTab] = useState<TabId>('family-tree')
  const [searchQuery, setSearchQuery] = useState('')
  const [guideOpen, setGuideOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [guideResetKey, setGuideResetKey] = useState(0)
  const [activeTiers, setActiveTiers] = useState<Set<DataSourceTier>>(
    () => new Set<DataSourceTier>(['dojo-local'])
  )

  const { stats, families, clusters, timeline, masterSyncStatus, loading } = useDNAData(activeTiers)

  const closeGuide = useCallback(() => setGuideOpen(false), [])
  const closeConfig = useCallback(() => setConfigOpen(false), [])

  const handleHelpClick = useCallback(() => {
    resetAmaterasuGuide()
    setGuideResetKey((prev) => prev + 1)
    setGuideOpen(true)
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  const handleTierToggle = useCallback((tier: DataSourceTier) => {
    setActiveTiers((prev) => {
      const next = new Set(prev)
      if (next.has(tier)) {
        // Don't allow deselecting the last tier
        if (next.size > 1) next.delete(tier)
      } else {
        next.add(tier)
      }
      return next
    })
  }, [])

  const handleTierReset = useCallback(() => {
    const available = DATA_SOURCE_TIERS.filter((t) => t.available).map((t) => t.id)
    setActiveTiers(new Set(available))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <ModuleHeader
        title="Amaterasu DNA"
        subtitle="Analyze attack lineage, mutation families, and embedding clusters"
        icon={Dna}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHelpClick}
              aria-label="Open Amaterasu DNA guide"
            >
              <HelpCircle className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigOpen(true)}
              aria-label="Open Amaterasu DNA configuration"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* Getting started tutorial (first visit) */}
      <AmaterasuGuide key={`guide-${guideResetKey}`} />

      {/* Data Source Selector */}
      <DataSourceSelector
        activeTiers={activeTiers}
        onToggle={handleTierToggle}
        onReset={handleTierReset}
        masterSyncStatus={masterSyncStatus}
      />

      {/* Stats Bar */}
      <StatsBar stats={stats} loading={loading} />

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search attacks by ID, category, or content..."
          aria-label="Search attacks"
          className="pl-10"
        />
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <TabsList aria-label="Amaterasu DNA views">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
                <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="family-tree">
          <div className="space-y-3">
            <div className="flex justify-end relative">
              <TabHelpButton tabId="family-tree" />
            </div>
            <FamilyTreeView families={families} activeTiers={activeTiers} />
          </div>
        </TabsContent>
        <TabsContent value="clusters">
          <div className="space-y-3">
            <div className="flex justify-end relative">
              <TabHelpButton tabId="clusters" />
            </div>
            <ClusterView clusters={clusters} activeTiers={activeTiers} />
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <div className="space-y-3">
            <div className="flex justify-end relative">
              <TabHelpButton tabId="timeline" />
            </div>
            <MutationTimeline timelineEntries={timeline} activeTiers={activeTiers} />
          </div>
        </TabsContent>
        <TabsContent value="analysis">
          <BlackBoxAnalysis />
        </TabsContent>
      </Tabs>

      {/* Guide and config panels */}
      <ModuleGuide
        isOpen={guideOpen}
        onClose={closeGuide}
        title="Amaterasu DNA Guide"
        description="Analyze attack lineage, mutation families, and embedding clusters to understand how adversarial prompts evolve and relate to each other."
        sections={GUIDE_SECTIONS}
      />
      <AmaterasuConfig isOpen={configOpen} onClose={closeConfig} />
    </div>
  )
}
