'use client'

/**
 * File: NODADashboard.tsx
 * Purpose: Main dashboard layout engine — reads config, renders visible widgets in sections
 * Story: TPI-NODA-1.5.1, TPI-NODA-9.5
 * Index:
 * - WIDGET_COMPONENTS map (line 24)
 * - WIDGET_META map (line 63)
 * - SECTION_DEFS (line 82)
 * - WidgetShell (line 102)
 * - DashboardContent (line 126)
 * - NODADashboard (line 183)
 */

import { Suspense, useState, lazy, type ComponentType } from 'react'
import { DashboardConfigProvider, useDashboardConfig, type WidgetSlot } from './DashboardConfigContext'
import { DashboardCustomizer } from './DashboardCustomizer'
import { WidgetMetaProvider } from './WidgetCard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Settings2 } from 'lucide-react'
import type { GlowCardProps } from '@/components/ui/GlowCard'

/** Skeleton placeholder for lazy-loaded widgets */
function WidgetSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-4 motion-safe:animate-pulse" aria-busy="true" aria-hidden="true">
      <div className="h-4 w-24 bg-muted rounded mb-3" />
      <div className="h-20 bg-muted/50 rounded" />
    </div>
  )
}

/** Lazy widget component map — widgets load only when enabled */
const WIDGET_COMPONENTS: Record<string, () => Promise<{ default: ComponentType }>> = {
  'quick-launch': () => import('./widgets/QuickLaunchOrOnboarding').then(m => ({ default: m.QuickLaunchOrOnboarding })),
  'health-gauge': () => import('./widgets/SystemHealthGauge').then(m => ({ default: m.SystemHealthGauge })),
  'guard-controls': () => import('./widgets/GuardQuickPanel').then(m => ({ default: m.GuardQuickPanel })),
  'guard-stats': () => import('./widgets/GuardStatsCard').then(m => ({ default: m.GuardStatsCard })),
  'attack-of-day': () => import('./widgets/AttackOfTheDay').then(m => ({ default: m.AttackOfTheDay })),
  'fixture-roulette': () => import('./widgets/FixtureRoulette').then(m => ({ default: m.FixtureRoulette })),
  'session-pulse': () => import('./widgets/SessionPulse').then(m => ({ default: m.SessionPulse })),
  'kill-count': () => import('./widgets/KillCount').then(m => ({ default: m.KillCount })),
  'engine-grid': () => import('./widgets/EngineToggleGrid').then(m => ({ default: m.EngineToggleGrid })),
  'batch-progress': () => import('./widgets/LLMBatchProgress').then(m => ({ default: m.LLMBatchProgress })),
  'threat-radar': () => import('./widgets/ThreatRadar').then(m => ({ default: m.ThreatRadar })),
  'arena-leaderboard': () => import('./widgets/ArenaLeaderboardWidget').then(m => ({ default: m.ArenaLeaderboardWidget })),
  'sage-status': () => import('./widgets/SAGEStatusWidget').then(m => ({ default: m.SAGEStatusWidget })),
  'mitsuke-alerts': () => import('./widgets/MitsukeAlertWidget').then(m => ({ default: m.MitsukeAlertWidget })),
  'llm-models': () => import('./widgets/LLMModelsWidget').then(m => ({ default: m.LLMModelsWidget })),
  'quick-scan': () => import('./widgets/QuickScanWidget').then(m => ({ default: m.QuickScanWidget })),
  'llm-quick-test': () => import('./widgets/QuickLLMTestWidget').then(m => ({ default: m.QuickLLMTestWidget })),
  'activity-feed': () => import('./widgets/ActivityFeedWidget').then(m => ({ default: m.ActivityFeedWidget })),
  'guard-audit': () => import('./widgets/GuardAuditWidget').then(m => ({ default: m.GuardAuditWidget })),
  'threat-trend': () => import('./widgets/ThreatTrendWidget').then(m => ({ default: m.ThreatTrendWidget })),
  'module-grid': () => import('./widgets/ModuleGridWidget').then(m => ({ default: m.ModuleGridWidget })),
  'compliance-bars': () => import('./widgets/ComplianceBarsWidget').then(m => ({ default: m.ComplianceBarsWidget })),
  'coverage-heatmap': () => import('./widgets/CoverageHeatmapWidget').then(m => ({ default: m.CoverageHeatmapWidget })),
  'owasp-summary': () => import('./widgets/OWASPSummaryWidget').then(m => ({ default: m.OWASPSummaryWidget })),
  'pattern-count': () => import('./widgets/PatternCountWidget').then(m => ({ default: m.PatternCountWidget })),
  'fixture-count': () => import('./widgets/FixtureCountWidget').then(m => ({ default: m.FixtureCountWidget })),
  'ecosystem-pulse': () => import('./widgets/EcosystemPulseWidget').then(m => ({ default: m.EcosystemPulseWidget })),
  'ronin-hub': () => import('./widgets/RoninHubWidget').then(m => ({ default: m.RoninHubWidget })),
  'llm-jutsu': () => import('./widgets/LLMJutsuWidget').then(m => ({ default: m.LLMJutsuWidget })),
}

/** Lazy components created once at module load — immutable, HMR-safe */
const LAZY_WIDGETS: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(WIDGET_COMPONENTS).map(([id, loader]) => [id, lazy(loader)])
)

function getLazyWidget(id: string): ComponentType | null {
  return LAZY_WIDGETS[id] ?? null
}

/** Priority + glow metadata per widget (defaults: standard priority, no glow) */
const WIDGET_META: Record<string, { priority: 'hero' | 'standard' | 'compact'; glow: NonNullable<GlowCardProps['glow']> }> = {
  'quick-launch': { priority: 'hero', glow: 'none' },
  'health-gauge': { priority: 'hero', glow: 'accent' },
  'threat-radar': { priority: 'standard', glow: 'accent' },
  'kill-count': { priority: 'standard', glow: 'none' },
  'session-pulse': { priority: 'standard', glow: 'none' },
  'guard-stats': { priority: 'standard', glow: 'none' },
  'engine-grid': { priority: 'compact', glow: 'none' },
  'llm-models': { priority: 'compact', glow: 'none' },
  'activity-feed': { priority: 'compact', glow: 'none' },
}

const DEFAULT_META = { priority: 'standard' as const, glow: 'none' as const }

/** Dashboard sections with ordered widget IDs */
const SECTION_DEFS: { label: string; ids: string[] }[] = [
  { label: 'QUICK ACTIONS', ids: ['quick-launch', 'quick-scan'] },
  { label: 'SYSTEM STATUS', ids: ['health-gauge', 'guard-controls', 'guard-stats', 'session-pulse'] },
  { label: 'ACTIVITY', ids: ['kill-count', 'attack-of-day', 'batch-progress', 'activity-feed', 'guard-audit', 'threat-trend', 'fixture-roulette'] },
  { label: 'INTELLIGENCE', ids: ['threat-radar', 'mitsuke-alerts', 'ecosystem-pulse'] },
  { label: 'MODELS & ARENA', ids: ['engine-grid', 'llm-models', 'llm-jutsu', 'llm-quick-test', 'arena-leaderboard', 'sage-status', 'ronin-hub', 'compliance-bars', 'coverage-heatmap', 'owasp-summary', 'pattern-count', 'fixture-count', 'module-grid'] },
]

/** Set of all widget IDs assigned to a section */
const SECTIONED_IDS = new Set(SECTION_DEFS.flatMap(s => s.ids))

/** Grid size class mapping */
function getSizeClass(size: WidgetSlot['size']): string {
  switch (size) {
    case 'full': return 'col-span-full'
    case 'half': return 'col-span-full md:col-span-1'
    case 'third': return 'col-span-full md:col-span-1 lg:col-span-1'
    default: return 'col-span-full md:col-span-1'
  }
}

/** Single widget shell with error boundary, suspense, and priority/glow context */
function WidgetShell({ slot }: { slot: WidgetSlot }) {
  const Widget = getLazyWidget(slot.id)
  if (!Widget) return null

  const meta = WIDGET_META[slot.id] ?? DEFAULT_META

  return (
    <div className={getSizeClass(slot.size)}>
      <ErrorBoundary
        fallbackTitle={`Widget Error`}
        fallbackDescription={`Unable to load this widget. Try refreshing.`}
      >
        <Suspense fallback={<WidgetSkeleton />}>
          <WidgetMetaProvider priority={meta.priority} glow={meta.glow}>
            <Widget />
          </WidgetMetaProvider>
        </Suspense>
      </ErrorBoundary>
    </div>
  )
}

/** Inner dashboard content — consumes config context */
function DashboardContent() {
  const { config } = useDashboardConfig()
  const [customizerOpen, setCustomizerOpen] = useState(false)

  const visibleWidgets = config.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)

  const visibleSet = new Set(visibleWidgets.map(w => w.id))

  // Widgets not assigned to any section (future-proofing)
  const unsectionedWidgets = visibleWidgets.filter(w => !SECTIONED_IDS.has(w.id))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">System overview and quick actions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomizerOpen(true)}
          aria-label="Customize Dashboard"
        >
          <Settings2 className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">Customize</span>
        </Button>
      </div>

      {/* Sectioned Widget Grid */}
      {SECTION_DEFS.map((section, sectionIdx) => {
        const sectionSlots = section.ids
          .filter(id => visibleSet.has(id))
          .map(id => visibleWidgets.find(w => w.id === id)!)
          .filter(Boolean)

        if (sectionSlots.length === 0) return null

        return (
          <div key={section.label} className={cn(sectionIdx > 0 && 'mt-8')}>
            {sectionIdx > 0 && <div className="dojo-divider mb-4" role="separator" />}
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {section.label}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
              {sectionSlots.map(slot => (
                <WidgetShell key={slot.id} slot={slot} />
              ))}
            </div>
          </div>
        )
      })}

      {/* Unsectioned widgets (fallback) */}
      {unsectionedWidgets.length > 0 && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unsectionedWidgets.map(slot => (
              <WidgetShell key={slot.id} slot={slot} />
            ))}
          </div>
        </div>
      )}

      {/* Customizer Panel */}
      <DashboardCustomizer open={customizerOpen} onClose={() => setCustomizerOpen(false)} />
    </div>
  )
}

/** Main dashboard component with config provider */
export function NODADashboard() {
  return (
    <DashboardConfigProvider>
      <DashboardContent />
    </DashboardConfigProvider>
  )
}
