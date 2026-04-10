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

import { useCallback, useState, lazy, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageToolbar } from '@/components/layout/PageToolbar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LLMModelProvider } from '@/lib/contexts'
import { ApiKeyManager } from './ApiKeyManager'
import { ScannerConfig } from './ScannerConfig'
import { ExportSettings } from './ExportSettings'
import { SystemHealth } from './SystemHealth'
import { UserManagement } from './UserManagement'
import { Scoreboard } from './Scoreboard'
import { AdminSettings } from './AdminSettings'
import { ValidationManager } from './ValidationManager'
import { TestRunner } from '@/components/tests/TestRunner'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { TestSuiteResult } from '@/lib/types'
import { Settings, Key, Shield, Activity, FileOutput, Users, Trophy, Lock, ClipboardCheck, FlaskConical, Plug, Blocks } from 'lucide-react'

// Lazy-load CustomProviderBuilder to avoid pulling the full LLM barrel eagerly
const CustomProviderBuilderLazy = lazy(() =>
  import('@/components/llm').then(m => ({ default: m.CustomProviderBuilder }))
)

// Train 2 PR-4d (2026-04-10): Apply function/codename pattern to Admin internal
// sections. Each tab has a functional label (what it does) and a codename (the
// branded identity), mirroring the sidebar two-line label pattern from PR-4b.1.
const ADMIN_TABS = [
  { id: 'general', label: 'General', codename: 'Overview', icon: Settings },
  { id: 'users', label: 'Users', codename: 'Access Control', icon: Users },
  { id: 'scoreboard', label: 'Scoreboard', codename: 'Leaderboard', icon: Trophy },
  { id: 'apikeys', label: 'API Keys', codename: 'Credentials', icon: Key },
  { id: 'scanner', label: 'Scanner & Guard', codename: 'Detection Config', icon: Shield },
  { id: 'health', label: 'System Health', codename: 'Diagnostics', icon: Activity },
  { id: 'export', label: 'Export', codename: 'Deliverables', icon: FileOutput },
  { id: 'providers', label: 'Providers', codename: 'LLM Endpoints', icon: Plug },
  { id: 'plugins', label: 'Plugins', codename: 'Extensions', icon: Blocks },
  { id: 'settings', label: 'Settings', codename: 'Configuration', icon: Lock },
  { id: 'validation', label: 'Validation', codename: 'KATANA Suite', icon: ClipboardCheck },
  { id: 'test-runner', label: 'Test Runner', codename: 'CI/CD', icon: FlaskConical },
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
  { name: 'Sengoku', alias: 'Red Teaming', desc: 'Continuous campaign execution (includes Temporal workflows)' },
  { name: 'Kotoba', alias: 'Prompt Hardening', desc: 'Prompt optimization and scoring' },
  { name: 'Ronin Hub', alias: 'Bug Bounty', desc: 'Research and submission tracking' },
  { name: 'Armory', alias: 'Fixture Library', desc: 'Fixtures, payloads, and comparisons' },
] as const

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('general')

  const handleRunTests = useCallback(async (filter?: string): Promise<TestSuiteResult> => {
    const response = await fetchWithAuth('/api/tests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter }),
    })

    if (!response.ok) {
      throw new Error(`Test runner request failed with status ${response.status}`)
    }

    const data = await response.json() as {
      summary?: {
        total?: number
        passed?: number
        failed?: number
        skipped?: number
        duration_ms?: number
      }
      results?: Array<{
        name: string
        status: string
        duration?: number
        duration_ms?: number
        output?: string
        required?: boolean
      }>
      timestamp?: string
    }

    return {
      summary: {
        total: data.summary?.total ?? 0,
        passed: data.summary?.passed ?? 0,
        failed: data.summary?.failed ?? 0,
        skipped: data.summary?.skipped ?? 0,
        duration_ms: data.summary?.duration_ms ?? 0,
      },
      results: (data.results ?? []).map((result) => ({
        name: result.name,
        status: result.status === 'pass' || result.status === 'skip' ? result.status : 'fail',
        duration_ms: result.duration_ms ?? result.duration ?? 0,
        output: result.output ?? '',
        required: Boolean(result.required),
      })),
      timestamp: data.timestamp ?? new Date().toISOString(),
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageToolbar
        title="Admin & Settings"
        subtitle="Settings, validation, and configuration"
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AdminTabId)}>
        <TabsList aria-label="Admin sections" className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {ADMIN_TABS.map(({ id, label, codename, icon: TabIcon }) => (
            <TabsTrigger key={id} value={id} aria-label={label} className="min-h-[44px] gap-2 text-xs">
              <TabIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span className="flex flex-col items-start leading-tight">
                <span className="font-medium">{label}</span>
                <span className="text-[10px] text-muted-foreground" aria-hidden="true">{codename}</span>
              </span>
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
        <TabsContent value="providers">
          <ProvidersTab />
        </TabsContent>
        <TabsContent value="plugins">
          <PluginsTab />
        </TabsContent>
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
        <TabsContent value="validation">
          <ValidationManager />
        </TabsContent>
        <TabsContent value="test-runner">
          <TestRunner onRunTests={handleRunTests} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * ProvidersTab — LLM endpoint management (Train 2 PR-4d).
 *
 * Lazy-loads CustomProviderBuilder from the llm barrel, wrapped in
 * LLMModelProvider so saveModel() context is available. The local
 * LLMModelProvider is intentionally isolated — admin saves persist via
 * the API, and other surfaces (Model Lab, Arena) will pick up the new
 * provider on their next mount or refresh. Real-time cross-tab
 * propagation is not required for admin-level configuration changes.
 */
function ProvidersTab() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Provider Configuration
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Register custom LLM providers, test connections, and manage endpoint configurations.
          Changes are persisted immediately and reflected in Model Lab on next load.
        </p>
        <ErrorBoundary fallbackTitle="Provider Builder Error" fallbackDescription="Unable to load the provider builder. Please try again.">
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" /></div>}>
            <LLMModelProvider>
              <CustomProviderBuilderLazy />
            </LLMModelProvider>
          </Suspense>
        </ErrorBoundary>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          API Key Vault
        </h3>
        <ApiKeyManager />
      </div>
    </div>
  )
}

/**
 * PluginsTab — Extension management (Train 2 PR-4d).
 *
 * Scaffolded shell for the bu-tpi plugin system. Shows registered plugin
 * types and an empty state for the plugin registry. Full CRUD and lifecycle
 * management is a Train 3 deliverable after the backend Plugin API is
 * ready (blocked on backend readiness matrix).
 */
/** Plugin type categories from bu-tpi/src/plugins/types.ts */
const PLUGIN_TYPES = ['scanner', 'transform', 'reporter', 'orchestrator'] as const

function PluginsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Plugin Registry
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Extend DojoLM with scanner plugins, result transformers, report generators, and
          orchestrator extensions. Plugin CRUD and lifecycle management will be available
          when the backend Plugin API ships in Train 3.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLUGIN_TYPES.map(type => (
            <div
              key={type}
              className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center"
            >
              <Blocks className="h-6 w-6 mx-auto text-[var(--text-tertiary)] mb-2" aria-hidden="true" />
              <p className="text-xs font-semibold capitalize text-[var(--foreground)]">{type}</p>
              <p className="text-[10px] text-muted-foreground mt-1">0 registered</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground italic">
          Plugin types: scanner (detection engines), transform (result processors), reporter (output
          formatters), orchestrator (workflow automation). See bu-tpi/src/plugins/ for the type
          definitions and loader API.
        </p>
      </div>
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
