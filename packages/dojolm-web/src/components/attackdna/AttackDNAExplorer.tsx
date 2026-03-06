/**
 * File: AttackDNAExplorer.tsx
 * Purpose: Main Amaterasu DNA page with sub-tab navigation, search, and stats bar
 * Story: S76, TPI-NODA-6.4 - Amaterasu DNA
 * Index:
 * - Dynamic imports for sub-views (line 22)
 * - STATS mock data (line 35)
 * - GUIDE_SECTIONS data (line 43)
 * - LoadingFallback component (line 65)
 * - StatsBar component (line 78)
 * - AttackDNAExplorer component (line 116)
 */

'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { AmaterasuGuide, resetAmaterasuGuide, TabHelpButton } from './AmaterasuGuide'
import { Button } from '@/components/ui/button'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { AmaterasuConfig } from './AmaterasuConfig'
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
  BookOpen,
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

// MOCK DATA — not wired to API. Replace with live data when backend integration is available.

const STATS = {
  totalNodes: 51,
  totalEdges: 38,
  totalFamilies: 7,
  totalClusters: 5,
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

function StatsBar() {
  const stats = [
    { label: 'Nodes', value: STATS.totalNodes, icon: Network },
    { label: 'Edges', value: STATS.totalEdges, icon: ArrowRightLeft },
    { label: 'Families', value: STATS.totalFamilies, icon: Users },
    { label: 'Clusters', value: STATS.totalClusters, icon: LayoutGrid },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list" aria-label="Amaterasu DNA statistics">
      {stats.map((stat) => {
        const StatIcon = stat.icon
        return (
          <Card key={stat.label} role="listitem">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center shrink-0">
                <StatIcon className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)] leading-tight">
                  {stat.value.toLocaleString()}
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

  // Keyboard navigation handled by Radix Tabs

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

      {/* Stats Bar */}
      <StatsBar />

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
            <FamilyTreeView />
          </div>
        </TabsContent>
        <TabsContent value="clusters">
          <div className="space-y-3">
            <div className="flex justify-end relative">
              <TabHelpButton tabId="clusters" />
            </div>
            <ClusterView />
          </div>
        </TabsContent>
        <TabsContent value="timeline">
          <div className="space-y-3">
            <div className="flex justify-end relative">
              <TabHelpButton tabId="timeline" />
            </div>
            <MutationTimeline />
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
