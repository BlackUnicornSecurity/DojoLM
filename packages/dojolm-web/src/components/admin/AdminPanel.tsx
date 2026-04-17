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

import { useCallback, useEffect, useState, lazy, Suspense } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageToolbar } from '@/components/layout/PageToolbar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { LLMModelProvider, LLMExecutionProvider } from '@/lib/contexts'
import { ApiKeyManager } from './ApiKeyManager'
import { ScannerConfig } from './ScannerConfig'
import { ExportSettings } from './ExportSettings'
import { SystemHealth } from './SystemHealth'
import { UserManagement } from './UserManagement'
import { Scoreboard } from './Scoreboard'
import { AdminSettings } from './AdminSettings'
import { ValidationManager } from './ValidationManager'
import { PluginsTab } from './PluginsTab'
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
  { name: 'Haiku Scanner', alias: 'Scanning', desc: 'Text and multimodal content analysis (includes Deep Scan / Shingan trust-boundary view)' },
  { name: 'Model Lab', alias: 'Model Testing', desc: 'Model security testing, benchmarks, and Jutsu workflows' },
  { name: 'Atemi Lab', alias: 'Adversarial Testing', desc: 'Attack Tools, Playbooks, Campaigns, Arena, and Test Cases' },
  { name: 'Battle Arena', alias: 'Adversarial Matches', desc: 'Multi-agent adversarial matches with leaderboards' },
  { name: 'Hattori Guard', alias: 'Protection', desc: 'Input and output protection controls' },
  { name: 'Bushido Book', alias: 'Compliance', desc: 'Framework mapping, evidence, and audit views' },
  { name: 'Amaterasu DNA', alias: 'Threat Intelligence', desc: 'Attack lineage and clustering' },
  { name: 'Kagami', alias: 'Mirror Testing', desc: 'Behavioral comparison across model versions' },
  { name: 'Mitsuke', alias: 'Threat Feed', desc: 'Threat indicators and alert triage' },
  { name: 'Sengoku', alias: 'Red Teaming', desc: 'Continuous campaign execution (includes Temporal workflows)' },
  { name: 'Kotoba', alias: 'Prompt Hardening', desc: 'Prompt optimization and scoring' },
  { name: 'Ronin Hub', alias: 'Bug Bounty', desc: 'Research and submission tracking' },
  { name: 'Buki', alias: 'Payload Lab', desc: 'Fixtures, payloads, generator, and fuzzer (formerly Armory)' },
] as const

/**
 * VIS-09: Other components can deep-link into an admin sub-tab by writing the
 * tab id to sessionStorage under this key before navigating to #admin.
 * Only valid AdminTabId values are honored — anything else is ignored.
 */
const ADMIN_DEEP_LINK_KEY = 'admin-initial-tab'
const VALID_ADMIN_TABS = new Set<string>(ADMIN_TABS.map(t => t.id))

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTabId>('general')

  // VIS-09: pick up a one-shot deep-link hint set by other modules (e.g. Sensei
  // "No models — configure in Admin → Providers" CTA). The hint is read once
  // on mount and immediately cleared so back-navigation doesn't re-trigger it.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const hint = window.sessionStorage.getItem(ADMIN_DEEP_LINK_KEY)
      if (hint && VALID_ADMIN_TABS.has(hint)) {
        setActiveTab(hint as AdminTabId)
      }
      window.sessionStorage.removeItem(ADMIN_DEEP_LINK_KEY)
    } catch {
      // sessionStorage unavailable (Safari private mode, tests) — ignore
    }
  }, [])

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
          <PluginsTab active={activeTab === 'plugins'} />
        </TabsContent>
        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
        <TabsContent value="validation">
          <ErrorBoundary
            fallbackTitle="KATANA Validation unavailable"
            fallbackDescription="The validation manager failed to load. Open the browser console for details, then reload."
          >
            <ValidationManager />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="test-runner">
          <ErrorBoundary
            fallbackTitle="Test Runner unavailable"
            fallbackDescription="The test runner failed to load. Open the browser console for details, then reload."
          >
            <TestRunner onRunTests={handleRunTests} />
          </ErrorBoundary>
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
              <LLMExecutionProvider>
                <CustomProviderBuilderLazy />
              </LLMExecutionProvider>
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

interface BuildInfo {
  sha: string | null
  date: string | null
  version: string
  environment: string
}

function GeneralSettings() {
  // VIS-17: replace hard-coded "UNKNOWN" / "HAKONE (v3.0)" with live
  // /api/build-info response so the deployed SHA + build date are visible.
  const [buildInfo, setBuildInfo] = useState<BuildInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/build-info', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((data: BuildInfo | null) => {
        if (!cancelled && data) setBuildInfo(data)
      })
      .catch(() => {
        /* leave buildInfo null — fallback text rendered below */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const versionDisplay = buildInfo
    ? `v${buildInfo.version}${buildInfo.sha ? ` (${buildInfo.sha})` : ''}`
    : 'Loading...'

  const buildDateDisplay = buildInfo?.date
    ? new Date(buildInfo.date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : buildInfo
      ? 'Unknown'
      : 'Loading...'

  const environmentDisplay = buildInfo?.environment
    ? buildInfo.environment.charAt(0).toUpperCase() + buildInfo.environment.slice(1)
    : process.env.NODE_ENV === 'production'
      ? 'Production'
      : 'Development'

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
            <p className="text-sm font-semibold text-foreground mt-1 font-mono" data-testid="platform-version">{versionDisplay}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Build Date</p>
            <p className="text-sm font-semibold text-foreground mt-1" data-testid="build-date">{buildDateDisplay}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Environment</p>
            <p className="text-sm font-semibold text-foreground mt-1">{environmentDisplay}</p>
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
        <p className="text-xs text-muted-foreground">
          Platform Guide and API Reference are available in the <code className="font-mono text-[var(--bu-electric)]">docs/user/</code> directory of the repository.
        </p>
      </div>
    </div>
  )
}
