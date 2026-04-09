'use client'

/**
 * File: NODADashboard.tsx
 * Purpose: Main dashboard layout engine — reads config, renders visible widgets in sections
 * Story: TPI-NODA-1.5.1, TPI-NODA-9.5
 * Index:
 * - WIDGET_COMPONENTS map (line 37)
 * - WIDGET_META map (line 77)
 * - SECTION_DEFS (line 92)
 * - WidgetShell (line 115)
 * - DashboardContent (line 138)
 * - NODADashboard (line 218)
 */

import { Suspense, useState, useRef, useEffect, lazy, type ComponentType } from 'react'
import { DashboardConfigProvider, useDashboardConfig, type WidgetSlot, type WidgetSize } from './DashboardConfigContext'
import { DashboardCustomizer } from './DashboardCustomizer'
import { SenseiPanel } from './SenseiPanel'
import { useSenseiScroll } from '@/hooks/useSenseiScroll'
import { WidgetMetaProvider } from './WidgetCard'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { BrainCircuit, Radar, Settings2, ShieldHalf } from 'lucide-react'
import type { GlowCardProps } from '@/components/ui/GlowCard'
import type { NavId } from '@/lib/constants'
import { useNavigation } from '@/lib/NavigationContext'

/** Skeleton placeholder for lazy-loaded widgets */
function WidgetSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-4 motion-safe:animate-pulse motion-reduce:animate-none" aria-busy="true" aria-hidden="true">
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
  'platform-stats': () => import('./widgets/PlatformStatsWidget').then(m => ({ default: m.PlatformStatsWidget })),
  'ecosystem-pulse': () => import('./widgets/EcosystemPulseWidget').then(m => ({ default: m.EcosystemPulseWidget })),
  'ronin-hub': () => import('./widgets/RoninHubWidget').then(m => ({ default: m.RoninHubWidget })),
  'llm-jutsu': () => import('./widgets/LLMJutsuWidget').then(m => ({ default: m.LLMJutsuWidget })),
  'sengoku': () => import('./widgets/SengokuWidget').then(m => ({ default: m.SengokuWidget })),
  'time-chamber': () => import('./widgets/TimeChamberWidget').then(m => ({ default: m.TimeChamberWidget })),
  'kotoba': () => import('./widgets/KotobaWidget').then(m => ({ default: m.KotobaWidget })),
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

/** Widget → module navigation targets. Clicking widget header navigates to the corresponding module. */
const WIDGET_NAV_TARGET: Record<string, string> = {
  'guard-controls': 'guard',
  'guard-stats': 'guard',
  'guard-audit': 'guard',
  'kill-count': 'scanner',
  'quick-scan': 'scanner',
  'threat-radar': 'strategic',
  'arena-leaderboard': 'strategic',
  'sage-status': 'strategic',
  'mitsuke-alerts': 'strategic',
  'llm-models': 'llm',
  'llm-quick-test': 'llm',
  'batch-progress': 'llm',
  'llm-jutsu': 'llm',
  'compliance-bars': 'compliance',
  'coverage-heatmap': 'compliance',
  'engine-grid': 'scanner',
  'module-grid': 'scanner',
  'fixture-roulette': 'armory',
  'attack-of-day': 'armory',
  'ecosystem-pulse': 'attackdna',
  'ronin-hub': 'ronin-hub',
  'health-gauge': 'admin',
  'platform-stats': 'admin',
  'sengoku': 'sengoku',
  'time-chamber': 'sengoku',
  'kotoba': 'kotoba',
}

/** Dashboard sections with ordered widget IDs (3 sections) */
const SECTION_DEFS: { label: string; description: string; ids: string[] }[] = [
  {
    label: 'Command',
    description: 'High-priority actions, posture, and scanner readiness.',
    ids: ['quick-launch', 'quick-scan', 'health-gauge', 'guard-controls', 'kill-count'],
  },
  {
    label: 'Monitoring',
    description: 'Threat telemetry, activity, and live campaign motion.',
    ids: ['threat-radar', 'activity-feed', 'threat-trend', 'mitsuke-alerts', 'ecosystem-pulse', 'session-pulse', 'guard-stats', 'batch-progress', 'guard-audit', 'attack-of-day', 'fixture-roulette'],
  },
  {
    label: 'Platform',
    description: 'Coverage, model operations, and supporting intelligence systems.',
    ids: ['engine-grid', 'module-grid', 'llm-models', 'llm-jutsu', 'llm-quick-test', 'compliance-bars', 'platform-stats', 'arena-leaderboard', 'sage-status', 'ronin-hub', 'sengoku', 'time-chamber', 'kotoba', 'coverage-heatmap'],
  },
]

/** Set of all widget IDs assigned to a section */
const SECTIONED_IDS = new Set(SECTION_DEFS.flatMap(s => s.ids))

/** Grid size class mapping — 12-column bento-box layout */
function getSizeClass(size: WidgetSize, rowSpan?: 1 | 2): string {
  const colClass: Record<WidgetSize, string> = {
    3:  'col-span-12 sm:col-span-6 lg:col-span-3',
    4:  'col-span-12 sm:col-span-6 lg:col-span-4',
    6:  'col-span-12 md:col-span-6',
    8:  'col-span-12 lg:col-span-8',
    12: 'col-span-12',
  }
  const row = rowSpan === 2 ? ' row-span-2' : ''
  return (colClass[size] ?? 'col-span-12 md:col-span-6') + row
}

/**
 * R4-002: Stagger interval — widgets mount in groups to avoid overwhelming the rate limiter.
 * 4 widgets per group, 200ms between groups.
 */
const STAGGER_GROUP_SIZE = 4
const STAGGER_DELAY_MS = 200

/** Single widget shell with error boundary, suspense, staggered mount, and priority/glow context */
function WidgetShell({ slot, mountIndex }: { slot: WidgetSlot; mountIndex: number }) {
  const Widget = getLazyWidget(slot.id)
  const [ready, setReady] = useState(mountIndex < STAGGER_GROUP_SIZE)

  useEffect(() => {
    if (ready) return
    const delay = Math.floor(mountIndex / STAGGER_GROUP_SIZE) * STAGGER_DELAY_MS
    const timer = setTimeout(() => setReady(true), delay)
    return () => clearTimeout(timer)
  }, [mountIndex, ready])

  if (!Widget) return null

  const meta = WIDGET_META[slot.id] ?? DEFAULT_META

  return (
    <div className={getSizeClass(slot.size, slot.rowSpan)}>
      <ErrorBoundary
        fallbackTitle={`Widget Error`}
        fallbackDescription={`Unable to load this widget. Try refreshing.`}
      >
        {ready ? (
          <Suspense fallback={<WidgetSkeleton />}>
            <WidgetMetaProvider priority={meta.priority} glow={meta.glow} tall={slot.rowSpan === 2} navigateTo={WIDGET_NAV_TARGET[slot.id] as NavId}>
              <Widget />
            </WidgetMetaProvider>
          </Suspense>
        ) : (
          <WidgetSkeleton />
        )}
      </ErrorBoundary>
    </div>
  )
}

/** Inner dashboard content — consumes config context */
function DashboardContent({
  onOpenModuleVisibility,
}: {
  onOpenModuleVisibility: () => void
}) {
  const { config } = useDashboardConfig()
  const { setActiveTab } = useNavigation()
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const visibleWidgets = config.widgets
    .filter(w => w.visible)
    .sort((a, b) => a.order - b.order)

  const visibleSet = new Set(visibleWidgets.map(w => w.id))
  const activeSections = SECTION_DEFS.filter(section => section.ids.some(id => visibleSet.has(id)))

  // Widgets not assigned to any section (future-proofing)
  const unsectionedWidgets = visibleWidgets.filter(w => !SECTIONED_IDS.has(w.id))

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Hero header — compact command bar */}
      <section className="glass-card rounded-lg border border-[var(--border-subtle)] p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">Dashboard</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {visibleWidgets.length} widgets across {activeSections.length} zones
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="gradient" size="sm" onClick={() => setActiveTab('scanner')} aria-label="Scan Text">
              <Radar className="w-4 h-4" aria-hidden="true" />
              Scan Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => setActiveTab('llm')}>
              <BrainCircuit className="w-4 h-4" aria-hidden="true" />
              Models
            </Button>
            <Button variant="default" size="sm" onClick={() => setActiveTab('guard')}>
              <ShieldHalf className="w-4 h-4" aria-hidden="true" />
              Guard
            </Button>
            <Button
              ref={triggerRef}
              variant="ghost"
              size="icon"
              onClick={() => setCustomizerOpen(true)}
              aria-label="Customize Dashboard"
            >
              <Settings2 className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>

      {/* Sectioned Widget Grid — R4-002: track global mount index for stagger */}
      {(() => {
        let globalIdx = 0
        return (
          <>
            {SECTION_DEFS.map((section, sectionIdx) => {
              const sectionSlots = section.ids
                .filter(id => visibleSet.has(id))
                .map(id => visibleWidgets.find(w => w.id === id)!)
                .filter(Boolean)

              if (sectionSlots.length === 0) return null

              return (
                <div key={section.label} className={cn(sectionIdx > 0 && 'mt-10')}>
                  {sectionIdx > 0 && <div className="dojo-divider mb-6" role="separator" aria-label="Section divider" />}
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">{section.label}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    <span className="text-label">{sectionSlots.length} live</span>
                  </div>
                  <div className="bento-grid grid grid-cols-12 gap-4 md:gap-6 auto-rows-[minmax(0,auto)] stagger-children">
                    {sectionSlots.map(slot => {
                      const idx = globalIdx++
                      return <WidgetShell key={slot.id} slot={slot} mountIndex={idx} />
                    })}
                  </div>
                </div>
              )
            })}

            {/* Unsectioned widgets (fallback) */}
            {unsectionedWidgets.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">Additional</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Visible widgets that are not mapped to a primary dashboard lane.</p>
                  </div>
                  <span className="text-label">{unsectionedWidgets.length} live</span>
                </div>
                <div className="bento-grid grid grid-cols-12 gap-4 md:gap-6 auto-rows-[minmax(0,auto)]">
                  {unsectionedWidgets.map(slot => {
                    const idx = globalIdx++
                    return <WidgetShell key={slot.id} slot={slot} mountIndex={idx} />
                  })}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* Customizer Panel */}
      <DashboardCustomizer open={customizerOpen} onClose={() => {
        setCustomizerOpen(false)
        // BUG-037: Restore focus to trigger button after modal close
        requestAnimationFrame(() => triggerRef.current?.focus())
      }} onOpenModuleVisibility={onOpenModuleVisibility} />
    </div>
  )
}

/** Main dashboard component with config provider */
export function NODADashboard() {
  const { activated, reset } = useSenseiScroll(true)
  const [moduleVisibilityOpen, setModuleVisibilityOpen] = useState(false)
  const senseiOpen = activated || moduleVisibilityOpen

  return (
    <DashboardConfigProvider>
      <DashboardContent onOpenModuleVisibility={() => setModuleVisibilityOpen(true)} />
      <SenseiPanel open={senseiOpen} onClose={() => {
        reset()
        setModuleVisibilityOpen(false)
      }} />
    </DashboardConfigProvider>
  )
}
