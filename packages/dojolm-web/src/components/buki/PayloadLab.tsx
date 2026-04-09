/**
 * File: PayloadLab.tsx
 * Purpose: Payload Lab (Buki) — top-level hub for payload catalog, generator,
 *          and fuzzer. Train 2 PR-4b.2 scaffolded shell with empty tabs.
 *
 * Train 2 PR-4b.2 (2026-04-09):
 * - Scaffolded component with 3 empty tab shells
 * - Payloads tab will absorb Armory in a later sub-PR
 * - Generator tab will absorb SAGE in PR-4b.3
 * - Fuzzer tab will wire bu-tpi/src/fuzzing/ in Train 3 PR-4f.3
 *
 * Codename: Buki (武器, "weapons / arms")
 */

'use client'

import { useState, lazy, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Warehouse, Sparkles, Shuffle } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useNavigation } from '@/lib/NavigationContext'
import { Button } from '@/components/ui/button'

// Train 2 PR-4b.3 — SAGE relocated from Kumite into Payload Lab Generator tab
const SAGEDashboard = lazy(() =>
  import('@/components/strategic').then(m => ({ default: m.SAGEDashboard }))
)

type BukiTab = 'payloads' | 'generator' | 'fuzzer'

/** Loading fallback for lazy sub-tabs */
function TabLoading() {
  return (
    <div className="flex items-center justify-center py-16" aria-busy="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
    </div>
  )
}

export function PayloadLab() {
  const [activeTab, setActiveTab] = useState<BukiTab>('payloads')
  const { setActiveTab: setNavTab } = useNavigation()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Payload Lab
        </h1>
        <p className="text-sm text-muted-foreground">
          武器 (Buki) — payload catalog, synthetic generator, and fuzzer
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BukiTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
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

        {/* Payloads: delegates to the legacy Armory view (back-compat)
         *  until ArmoryContent is extracted from page.tsx in a follow-up. */}
        <TabsContent value="payloads" className="mt-6">
          <EmptyState
            icon={Warehouse}
            title="Payloads live in Armory (for now)"
            description="Fixtures, payloads, and comparison workflows are currently in the Armory tab. Full merge into Payload Lab requires extracting ArmoryContent from page.tsx — tracked as a PR-4b.3 follow-up."
            action={{
              label: 'Open Armory',
              onClick: () => setNavTab('armory'),
            }}
          />
        </TabsContent>

        {/* Generator: SAGE Dashboard relocated from Kumite (PR-4b.3) */}
        <TabsContent value="generator" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <SAGEDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="fuzzer" className="mt-6">
          <EmptyState
            icon={Shuffle}
            title="Fuzzer — coming soon"
            description="Mutation-based fuzzing engine (bu-tpi/src/fuzzing/) will wire up in Train 3 PR-4f.3."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
