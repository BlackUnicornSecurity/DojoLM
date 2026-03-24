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
import { UserManagement } from './UserManagement'
import { Scoreboard } from './Scoreboard'
import { AdminSettings } from './AdminSettings'
import { ValidationManager } from './ValidationManager'
import { Settings, Key, Shield, Activity, FileOutput, Users, Trophy, Lock, ClipboardCheck } from 'lucide-react'

const ADMIN_TABS = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'scoreboard', label: 'Scoreboard', icon: Trophy },
  { id: 'apikeys', label: 'API Keys', icon: Key },
  { id: 'scanner', label: 'Haiku Scanner & Guard', icon: Shield },
  { id: 'health', label: 'System Health', icon: Activity },
  { id: 'export', label: 'Export', icon: FileOutput },
  { id: 'settings', label: 'Admin Settings', icon: Lock },
  { id: 'validation', label: 'Validation', icon: ClipboardCheck },
] as const

type AdminTabId = typeof ADMIN_TABS[number]['id']

const PLATFORM_MODULES = [
  { name: 'Haiku Scanner', alias: 'Scanning', desc: 'Text and multimodal content analysis' },
  { name: 'LLM Jutsu', alias: 'Model Testing', desc: 'Model security testing and benchmarks' },
  { name: 'Atemi Lab', alias: 'Adversarial Testing', desc: 'Tool and MCP attack simulation' },
  { name: 'Hattori Guard', alias: 'Protection', desc: 'Input and output protection controls' },
  { name: 'Bushido Book', alias: 'Compliance', desc: 'Framework mapping, evidence, and audit views' },
  { name: 'Amaterasu DNA', alias: 'Threat Intelligence', desc: 'Attack lineage and clustering' },
  { name: 'The Kumite', alias: 'Strategic Hub', desc: 'Arena, Mitsuke, SAGE, and DNA workflows' },
  { name: 'Sengoku', alias: 'Red Teaming', desc: 'Continuous campaign execution' },
  { name: 'Time Chamber', alias: 'Temporal Testing', desc: 'Time-based attack simulation experiences' },
  { name: 'Kotoba', alias: 'Prompt Hardening', desc: 'Prompt optimization and scoring' },
  { name: 'Ronin Hub', alias: 'Bug Bounty', desc: 'Research and submission tracking' },
  { name: 'Armory', alias: 'Fixture Library', desc: 'Fixtures, payloads, and comparisons' },
] as const

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('general')

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Admin & Settings"
        subtitle="Settings, validation, and configuration"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTabId)}>
        <TabsList aria-label="Admin sections" className="flex flex-wrap h-auto bg-muted/50 rounded-full">
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
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="scoreboard">
          <Scoreboard />
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
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationManager />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function GeneralSettings() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Platform Information</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Application</p>
            <p className="text-sm font-semibold text-foreground mt-1">NODA Platform</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Version</p>
            <p className="text-sm font-semibold text-foreground mt-1">HAKONE (v3.0)</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Environment</p>
            <p className="text-sm font-semibold text-foreground mt-1">{process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Theme</p>
            <p className="text-sm font-semibold text-foreground mt-1">Dark (default)</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4 md:col-span-2 lg:col-span-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">System Status</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-[var(--status-allow)] shrink-0" aria-hidden="true" />
              <p className="text-sm font-semibold text-[var(--status-allow)]">All systems operational</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Modules</h3>
        <p className="text-sm text-muted-foreground">
          Active platform modules and capabilities. Branded names stay intact here, with plain-language aliases to make ownership easier to scan.
        </p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {PLATFORM_MODULES.map(mod => (
            <div key={mod.name} className="flex items-center gap-2 rounded border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] px-3 py-2">
              <span className="w-2 h-2 rounded-full bg-[var(--status-allow)] shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  {mod.name}
                  <span className="text-muted-foreground font-normal"> / {mod.alias}</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{mod.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Documentation</h3>
        <div className="grid gap-2 md:grid-cols-2">
          <a
            href="/docs/user/PLATFORM_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--bu-electric)] hover:underline"
          >
            Platform Guide →
          </a>
          <a
            href="/docs/user/API_REFERENCE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-[var(--bu-electric)] hover:underline"
          >
            API Reference →
          </a>
        </div>
      </div>
    </div>
  )
}
