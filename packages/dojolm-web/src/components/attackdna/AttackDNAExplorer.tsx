/**
 * File: AttackDNAExplorer.tsx
 * Purpose: Main AttackDNA Explorer page with sub-tab navigation, search, and stats bar
 * Story: S76 - AttackDNA Explorer
 * Index:
 * - Dynamic imports for sub-views (line 18)
 * - STATS mock data (line 31)
 * - LoadingFallback component (line 39)
 * - StatsBar component (line 52)
 * - AttackDNAExplorer component (line 90)
 */

'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

// --- Stats (mock) ---

const STATS = {
  totalNodes: 51,
  totalEdges: 38,
  totalFamilies: 7,
  totalClusters: 5,
}

// --- Sub-components ---

function LoadingFallback({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-label={label}>
      <div
        className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-2 border-[var(--dojo-primary)] border-t-transparent"
        aria-hidden="true"
      />
      <span className="ml-3 text-sm text-[var(--muted-foreground)]">{label}</span>
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="list" aria-label="AttackDNA statistics">
      {stats.map((stat) => {
        const StatIcon = stat.icon
        return (
          <Card key={stat.label} role="listitem">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-[var(--bg-quaternary)] flex items-center justify-center shrink-0">
                <StatIcon className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-[var(--foreground)] leading-tight">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// --- Tab Definitions ---

type TabId = 'family-tree' | 'clusters' | 'timeline'

interface TabDef {
  id: TabId
  label: string
  icon: typeof GitBranch
}

const TABS: TabDef[] = [
  { id: 'family-tree', label: 'Family Tree', icon: GitBranch },
  { id: 'clusters', label: 'Clusters', icon: Layers },
  { id: 'timeline', label: 'Timeline', icon: Clock },
]

// --- Main Component ---

export function AttackDNAExplorer() {
  const [activeTab, setActiveTab] = useState<TabId>('family-tree')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value)
    },
    []
  )

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: TabId) => {
      const currentIndex = TABS.findIndex((t) => t.id === tabId)
      let nextIndex = currentIndex

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        nextIndex = (currentIndex + 1) % TABS.length
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
      } else if (e.key === 'Home') {
        e.preventDefault()
        nextIndex = 0
      } else if (e.key === 'End') {
        e.preventDefault()
        nextIndex = TABS.length - 1
      }

      if (nextIndex !== currentIndex) {
        setActiveTab(TABS[nextIndex].id)
        // Focus the new tab button
        const tabEl = document.getElementById(`attackdna-tab-${TABS[nextIndex].id}`)
        tabEl?.focus()
      }
    },
    []
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--dojo-primary)]/10 flex items-center justify-center">
            <Dna className="h-5 w-5 text-[var(--dojo-primary)]" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--foreground)]">
              AttackDNA Explorer
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Analyze attack lineage, mutation families, and embedding clusters
            </p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs">
          <Dna className="h-3 w-3 mr-1" aria-hidden="true" />
          S76
        </Badge>
      </div>

      {/* Stats Bar */}
      <StatsBar />

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)] pointer-events-none"
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
      <div
        role="tablist"
        aria-label="AttackDNA views"
        className="inline-flex h-10 items-center rounded-md bg-muted p-1 text-muted-foreground"
      >
        {TABS.map((tab) => {
          const TabIcon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`attackdna-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`attackdna-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'hover:text-foreground/80'
              )}
            >
              <TabIcon className="h-3.5 w-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Panels */}
      <div
        id={`attackdna-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`attackdna-tab-${activeTab}`}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
      >
        {activeTab === 'family-tree' && <FamilyTreeView />}
        {activeTab === 'clusters' && <ClusterView />}
        {activeTab === 'timeline' && <MutationTimeline />}
      </div>
    </div>
  )
}
