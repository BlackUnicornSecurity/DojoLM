/**
 * File: RoninHub.tsx
 * Purpose: Main Ronin Hub — Bug bounty research and submission management
 * Story: NODA-3 Story 10.1
 * Index:
 * - RoninTab type (line 20)
 * - TAB_CONFIG (line 22)
 * - RoninHub component (line 54)
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { roninConfigStore } from '@/lib/stores'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Bug, Search, Send, Brain, Radio, HelpCircle, Settings } from 'lucide-react'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import type { LucideIcon } from 'lucide-react'
import { ModuleGuide, type GuideSection } from '@/components/ui/ModuleGuide'
import { ConfigPanel, type ConfigSection } from '@/components/ui/ConfigPanel'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgramsTab } from './ProgramsTab'
import { SubmissionsTab } from './SubmissionsTab'

type RoninTab = 'programs' | 'submissions' | 'planning' | 'intelligence'

const TAB_CONFIG: { key: RoninTab; label: string; icon: LucideIcon; description: string }[] = [
  { key: 'programs', label: 'Programs', icon: Search, description: 'Browse and filter bug bounty programs' },
  { key: 'submissions', label: 'Submissions', icon: Send, description: 'Create and track bug submissions' },
  { key: 'planning', label: 'Planning', icon: Brain, description: 'Research planning and target selection' },
  { key: 'intelligence', label: 'Intelligence', icon: Radio, description: 'CVE feeds and threat intelligence' },
]

const GUIDE_SECTIONS: GuideSection[] = [
  { title: 'Programs', content: 'Browse curated AI bug bounty programs from HackerOne, Bugcrowd, Huntr, and 0din.ai. Filter by scope, rewards, and OWASP AI mapping.', icon: Search },
  { title: 'Submissions', content: 'Create and track vulnerability submissions with a 4-step wizard. Link NODA test results as evidence and calculate AI-specific severity scores.', icon: Send },
  { title: 'Planning', content: 'Plan your research targets and track methodology notes. Organize your bug bounty hunting workflow.', icon: Brain },
  { title: 'Intelligence', content: 'Stay updated with AI-related CVE feeds and threat intelligence from NVD. Monitor emerging vulnerabilities in real-time.', icon: Radio },
]

const CONFIG_SECTIONS: ConfigSection[] = [
  {
    id: 'display',
    label: 'Display',
    defaultOpen: true,
    controls: [
      { type: 'dropdown', key: 'defaultTab', label: 'Default Tab', options: [
        { value: 'programs', label: 'Programs' },
        { value: 'submissions', label: 'Submissions' },
        { value: 'planning', label: 'Planning' },
        { value: 'intelligence', label: 'Intelligence' },
      ] },
      { type: 'toggle', key: 'showRewards', label: 'Show Reward Amounts', description: 'Display reward ranges on program cards' },
      { type: 'number', key: 'pageSize', label: 'Items per Page', min: 10, max: 50, step: 5 },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    controls: [
      { type: 'toggle', key: 'cveAlerts', label: 'CVE Alert Notifications', description: 'Get notified when new AI CVEs are published' },
      { type: 'toggle', key: 'programUpdates', label: 'Program Update Alerts', description: 'Alert when subscribed programs change scope or rewards' },
    ],
  },
]

const DEFAULT_CONFIG: Record<string, unknown> = {
  defaultTab: 'programs',
  showRewards: true,
  pageSize: 20,
  cveAlerts: true,
  programUpdates: false,
}


/**
 * RoninHub — Main bug bounty management module
 */
export function RoninHub() {
  const [activeTab, setActiveTab] = useState<RoninTab>('programs')
  const [guideOpen, setGuideOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [configValues, setConfigValues] = useState<Record<string, unknown>>(DEFAULT_CONFIG)
  const [refreshKey, setRefreshKey] = useState(0)

  // Refresh data when tab becomes visible again
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) setRefreshKey(k => k + 1)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleConfigChange = useCallback((key: string, value: unknown) => {
    setConfigValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleConfigSave = useCallback(() => {
    roninConfigStore.set(configValues)
  }, [configValues])

  const handleConfigReset = useCallback(() => {
    setConfigValues({ ...DEFAULT_CONFIG })
  }, [])

  const planningTab = TAB_CONFIG.find(t => t.key === 'planning') ?? TAB_CONFIG[0]
  const intelligenceTab = TAB_CONFIG.find(t => t.key === 'intelligence') ?? TAB_CONFIG[0]

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <ModuleHeader
        title="Ronin Hub"
        subtitle="Bug bounty research and submissions"
        icon={Bug}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGuideOpen(true)}
              aria-label="Open Ronin Hub guide"
            >
              <HelpCircle className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfigOpen(true)}
              aria-label="Open Ronin Hub settings"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const validTabs: RoninTab[] = ['programs', 'submissions', 'planning', 'intelligence']
          if (validTabs.includes(v as RoninTab)) setActiveTab(v as RoninTab)
        }}
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full h-auto gap-1 bg-muted/50 p-1 rounded-full" aria-label="Ronin Hub sections">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-2 min-h-[44px]">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="programs">
          <ProgramsTab key={refreshKey} />
        </TabsContent>
        <TabsContent value="submissions">
          <SubmissionsTab key={refreshKey} />
        </TabsContent>
        <TabsContent value="planning">
          <EmptyState
            icon={planningTab.icon}
            title={planningTab.label}
            description={planningTab.description}
          />
        </TabsContent>
        <TabsContent value="intelligence">
          <EmptyState
            icon={intelligenceTab.icon}
            title={intelligenceTab.label}
            description={intelligenceTab.description}
          />
        </TabsContent>
      </Tabs>

      {/* Guide Panel */}
      <ModuleGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="Ronin Hub Guide"
        description="Ronin Hub is your centralized bug bounty management platform. Discover programs, plan research, submit findings, and track AI-related vulnerability intelligence."
        sections={GUIDE_SECTIONS}
      />

      {/* Config Panel */}
      <ConfigPanel
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        title="Ronin Hub Settings"
        sections={CONFIG_SECTIONS}
        values={configValues}
        onChange={handleConfigChange}
        onSave={handleConfigSave}
        onReset={handleConfigReset}
      />
    </div>
  )
}
