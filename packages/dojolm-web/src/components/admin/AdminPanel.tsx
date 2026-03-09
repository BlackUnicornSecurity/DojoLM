'use client'

/**
 * File: AdminPanel.tsx
 * Purpose: Admin & Settings panel with tab-based sub-sections
 * Story: TPI-NODA-002-01
 * Index:
 * - ADMIN_TABS config (line 18)
 * - AdminPanel component (line 32)
 * - GeneralSettings sub-component (line 116)
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageToolbar } from '@/components/layout/PageToolbar'
import { ApiKeyManager } from './ApiKeyManager'
import { ScannerConfig } from './ScannerConfig'
import { ExportSettings } from './ExportSettings'
import { SystemHealth } from './SystemHealth'
import { Settings, Key, Shield, Activity, FileOutput } from 'lucide-react'

const ADMIN_TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'scanner', label: 'Haiku Scanner & Guard', icon: Shield },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'export', label: 'Export', icon: FileOutput },
] as const

type AdminTabId = typeof ADMIN_TABS[number]['id']

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('general')

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Admin & Settings"
        subtitle="Settings, validation, and configuration"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTabId)}>
        <TabsList aria-label="Admin sections" className="flex flex-wrap h-auto bg-muted/50 rounded-xl">
          {ADMIN_TABS.map(({ id, label, icon: TabIcon }) => (
            <TabsTrigger key={id} value={id} className="min-h-[44px] gap-2">
              <TabIcon className="w-4 h-4" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
        <TabsContent value="apikeys">
          <ApiKeyManager />
        </TabsContent>
        <TabsContent value="scanner">
          <ScannerConfig />
        </TabsContent>
        <TabsContent value="health">
          <SystemHealth />
        </TabsContent>
        <TabsContent value="export">
          <ExportSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General Settings</h3>
      <p className="text-sm text-muted-foreground">
        Application-wide configuration and preferences.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
          <p className="text-sm font-medium text-foreground">Application</p>
          <p className="text-xs text-muted-foreground mt-1">NODA Platform</p>
        </div>
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
          <p className="text-sm font-medium text-foreground">Theme</p>
          <p className="text-xs text-muted-foreground mt-1">Dark (default)</p>
        </div>
      </div>
    </div>
  )
}
