'use client'

/**
 * File: DashboardConfigContext.tsx
 * Purpose: Dashboard configuration context with widget catalog and localStorage persistence
 * Story: TPI-NODA-1.5.1, KASHIWA-1.1, KASHIWA-1.5
 * Index:
 * - WidgetSize type (line 22)
 * - WidgetSlot type (line 25)
 * - DashboardConfig type (line 34)
 * - WidgetCatalogEntry type (line 40)
 * - migrateSize (line 53)
 * - WIDGET_CATALOG (line 62)
 * - DEFAULT_DASHBOARD_CONFIG (line 111)
 * - DashboardConfigProvider (line 200)
 * - useDashboardConfig hook (line 292)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react'

/** Valid column span sizes for the 12-column bento grid */
export type WidgetSize = 3 | 4 | 6 | 8 | 12

/** A single widget slot in the dashboard layout */
export interface WidgetSlot {
  id: string
  visible: boolean
  order: number
  size: WidgetSize
  rowSpan?: 1 | 2
}

/** Dashboard configuration persisted to localStorage */
export interface DashboardConfig {
  widgets: WidgetSlot[]
  layout: 'default' | 'compact' | 'wide'
}

/** Widget catalog entry with metadata */
export interface WidgetCatalogEntry {
  id: string
  label: string
  description: string
  category: 'interactive' | 'dynamic' | 'visual' | 'strategic' | 'reference'
  defaultSize: WidgetSize
  defaultRowSpan?: 1 | 2
  isDefault: boolean
}

const VALID_SIZES: readonly WidgetSize[] = [3, 4, 6, 8, 12]

/** Migrate legacy string sizes to numeric column spans */
export function migrateSize(size: unknown): WidgetSize {
  if (typeof size === 'number' && (VALID_SIZES as readonly number[]).includes(size)) return size as WidgetSize
  if (size === 'full') return 12
  if (size === 'half') return 6
  if (size === 'third') return 4
  return 6
}

/** Full widget catalog — all 27 available widgets (KASHIWA bento-box sizes per spec 1.4) */
export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  // Interactive / Action Widgets
  { id: 'quick-scan', label: 'Quick Scan Bar', description: 'Instant inline ALLOW/BLOCK verdict', category: 'interactive', defaultSize: 8, isDefault: false },
  { id: 'quick-launch', label: 'Quick Launch Pad', description: '6 large action cards for quick navigation', category: 'interactive', defaultSize: 12, isDefault: true },
  { id: 'guard-controls', label: 'Guard Quick Controls', description: 'Mode toggle, threshold, recent blocks', category: 'interactive', defaultSize: 4, defaultRowSpan: 2, isDefault: true },
  { id: 'fixture-roulette', label: 'Fixture Roulette', description: 'Random fixture picker with media preview', category: 'interactive', defaultSize: 6, isDefault: false },
  { id: 'engine-grid', label: 'Engine Toggle Grid', description: '13 engine filter pills, toggle on/off', category: 'interactive', defaultSize: 12, isDefault: true },
  { id: 'llm-quick-test', label: 'Quick LLM Test', description: 'Pick model + preset, one-click batch start', category: 'interactive', defaultSize: 4, isDefault: false },

  // Dynamic / Live Widgets
  { id: 'session-pulse', label: 'Session Pulse', description: 'Session stats: scans, threats, pass rate', category: 'dynamic', defaultSize: 3, isDefault: false },
  { id: 'guard-stats', label: 'Guard Stats Card', description: 'Blocked/allowed counts, block rate %', category: 'dynamic', defaultSize: 3, isDefault: false },
  { id: 'batch-progress', label: 'LLM Batch Progress', description: 'Active batch progress bars', category: 'dynamic', defaultSize: 6, isDefault: false },
  { id: 'activity-feed', label: 'Recent Activity Feed', description: 'Timestamped event list with unread dots', category: 'dynamic', defaultSize: 6, defaultRowSpan: 2, isDefault: true },
  { id: 'guard-audit', label: 'Guard Audit Mini-Log', description: 'Last 5 guard events', category: 'dynamic', defaultSize: 6, isDefault: false },
  { id: 'threat-trend', label: 'Threat Trend Chart', description: 'Line chart of scan results over session', category: 'dynamic', defaultSize: 8, isDefault: false },

  // Visual / Gamification Widgets
  { id: 'attack-of-day', label: 'Attack of the Day', description: 'Daily featured attack with Try It button', category: 'visual', defaultSize: 6, isDefault: false },
  { id: 'threat-radar', label: 'Threat Radar', description: 'Animated SVG radar with 6 category sectors', category: 'visual', defaultSize: 6, defaultRowSpan: 2, isDefault: true },
  { id: 'kill-count', label: 'Kill Count', description: 'Session scoreboard with trophy milestones', category: 'visual', defaultSize: 8, isDefault: true },
  { id: 'health-gauge', label: 'System Health Gauge', description: 'Composite score gauge', category: 'visual', defaultSize: 4, isDefault: true },

  // Strategic Module Widgets
  { id: 'arena-leaderboard', label: 'Arena Mini-Leaderboard', description: 'Top 5 agents: rank, name, win rate', category: 'strategic', defaultSize: 4, isDefault: false },
  { id: 'sage-status', label: 'SAGE Evolution Status', description: 'Generation, best fitness, status badge', category: 'strategic', defaultSize: 4, isDefault: false },
  { id: 'mitsuke-alerts', label: 'Mitsuke Alert Feed', description: 'Latest 4 threat alerts with severity', category: 'strategic', defaultSize: 4, isDefault: false },

  // Reference Widgets
  { id: 'llm-models', label: 'LLM Models List', description: 'Configured models with provider and status', category: 'reference', defaultSize: 4, defaultRowSpan: 2, isDefault: false },
  { id: 'module-grid', label: 'Haiku Scanner Module Grid', description: '23 modules as colored dots/chips', category: 'reference', defaultSize: 8, isDefault: true },
  { id: 'compliance-bars', label: 'Compliance Mini-Bars', description: '6 horizontal bars for framework coverage', category: 'reference', defaultSize: 6, isDefault: false },
  { id: 'coverage-heatmap', label: 'Coverage Heatmap', description: 'TPI categories as colored grid cells', category: 'reference', defaultSize: 12, isDefault: false },
  { id: 'platform-stats', label: 'Platform Stats', description: 'Combined patterns, fixtures, and OWASP coverage', category: 'reference', defaultSize: 6, isDefault: false },

  // Ecosystem Widget
  { id: 'ecosystem-pulse', label: 'Ecosystem Pulse', description: 'Cross-module data flow health and metrics', category: 'dynamic', defaultSize: 6, isDefault: false },

  // Phase E Widgets (Stories 10.6, 11.4)
  { id: 'ronin-hub', label: 'Ronin Hub', description: 'Bug bounty submissions, subscriptions, and CVE alerts', category: 'strategic', defaultSize: 4, isDefault: false },
  { id: 'llm-jutsu', label: 'LLM Jutsu', description: 'Model testing summary with belt distribution', category: 'strategic', defaultSize: 4, isDefault: false },

  // Phase 10 Widgets (HAKONE H17.9, H18.7, H19.7)
  { id: 'sengoku', label: 'Sengoku Campaigns', description: 'Active campaigns, findings, and regression alerts', category: 'strategic', defaultSize: 4, isDefault: false },
  { id: 'time-chamber', label: 'Time Chamber', description: 'Temporal attack plans and last run summary', category: 'strategic', defaultSize: 4, isDefault: false },
  { id: 'kotoba', label: 'Kotoba Studio', description: 'Prompt optimization rules and average score', category: 'strategic', defaultSize: 4, isDefault: false },
]

const CATALOG_MAP = new Map(WIDGET_CATALOG.map(w => [w.id, w]))

/** Default widgets shown on first load (8 widgets) */
const DEFAULT_WIDGET_IDS = WIDGET_CATALOG.filter(w => w.isDefault).map(w => w.id)

/** Default dashboard config */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: DEFAULT_WIDGET_IDS.map((id, index) => {
    const entry = CATALOG_MAP.get(id)
    return {
      id,
      visible: true,
      order: index,
      size: entry?.defaultSize ?? 6,
      ...(entry?.defaultRowSpan === 2 ? { rowSpan: 2 as const } : {}),
    }
  }),
  layout: 'default',
}

const STORAGE_KEY = 'noda-dashboard-config'
const BACKUP_KEY = 'noda-dashboard-config-backup'

function loadConfig(): DashboardConfig {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DASHBOARD_CONFIG
    // Reviver strips dangerous keys at parse time to prevent prototype pollution
    const parsed = JSON.parse(raw, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return undefined
      return value
    })

    if (!parsed.widgets || !Array.isArray(parsed.widgets)) return DEFAULT_DASHBOARD_CONFIG

    // Detect legacy format and backup before migration
    const needsMigration = parsed.widgets.some((w: Record<string, unknown>) => typeof w.size === 'string')
    if (needsMigration) {
      try {
        localStorage.setItem(BACKUP_KEY, raw)
        // eslint-disable-next-line no-console
        console.warn('Dashboard config migrated v1->v2')
      } catch { /* backup is best-effort */ }
    }

    // Migrate and validate each widget
    const validWidgets: WidgetSlot[] = []
    for (const w of parsed.widgets) {
      if (typeof w.id !== 'string' || !CATALOG_MAP.has(w.id)) continue
      if (typeof w.visible !== 'boolean') continue
      if (typeof w.order !== 'number' || !Number.isFinite(w.order)) continue

      // Migrate size: string -> number
      const migratedSize = migrateSize(w.size)

      // Validate rowSpan
      const rowSpan = (!w.rowSpan || w.rowSpan === 1 || w.rowSpan === 2) ? w.rowSpan : undefined

      validWidgets.push({
        id: w.id as string,
        visible: w.visible as boolean,
        order: w.order as number,
        size: migratedSize,
        ...(rowSpan === 2 ? { rowSpan: 2 as const } : {}),
      })
    }

    if (validWidgets.length === 0) return DEFAULT_DASHBOARD_CONFIG
    return { ...DEFAULT_DASHBOARD_CONFIG, widgets: validWidgets, layout: parsed.layout === 'compact' || parsed.layout === 'wide' ? parsed.layout : 'default' }
  } catch {
    return DEFAULT_DASHBOARD_CONFIG
  }
}

function saveConfig(config: DashboardConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Silently handle QuotaExceededError or private browsing
  }
}

interface DashboardConfigContextValue {
  config: DashboardConfig
  toggleWidget: (id: string) => void
  reorderWidgets: (orderedIds: string[]) => void
  resetToDefaults: () => void
  moveWidget: (id: string, direction: 'up' | 'down') => void
  resizeWidget: (id: string, size: WidgetSize) => void
}

const DashboardConfigContext = createContext<DashboardConfigContextValue | undefined>(undefined)

export function DashboardConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_DASHBOARD_CONFIG)
  const hydratedRef = useRef(false)

  // Hydrate from localStorage on mount
  useEffect(() => {
    setConfig(loadConfig())
  }, [])

  // Persist to localStorage on change (skip initial render)
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true
      return
    }
    saveConfig(config)
  }, [config])

  const toggleWidget = useCallback((id: string) => {
    setConfig(prev => {
      const existing = prev.widgets.find(w => w.id === id)
      if (existing) {
        return {
          ...prev,
          widgets: prev.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w),
        }
      }
      // Add new widget from catalog
      const catalogEntry = CATALOG_MAP.get(id)
      if (!catalogEntry) return prev
      const maxOrder = prev.widgets.reduce((max, w) => Math.max(max, w.order), -1)
      return {
        ...prev,
        widgets: [...prev.widgets, {
          id, visible: true, order: maxOrder + 1, size: catalogEntry.defaultSize,
          ...(catalogEntry.defaultRowSpan === 2 ? { rowSpan: 2 as const } : {}),
        }],
      }
    })
  }, [])

  const reorderWidgets = useCallback((orderedIds: string[]) => {
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => {
        const newOrder = orderedIds.indexOf(w.id)
        return newOrder >= 0 ? { ...w, order: newOrder } : w
      }),
    }))
  }, [])

  const moveWidget = useCallback((id: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex(w => w.id === id)
      if (idx < 0) return prev
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev
      const newWidgets = [...sorted]
      const tempOrder = newWidgets[idx].order
      newWidgets[idx] = { ...newWidgets[idx], order: newWidgets[swapIdx].order }
      newWidgets[swapIdx] = { ...newWidgets[swapIdx], order: tempOrder }
      return { ...prev, widgets: newWidgets }
    })
  }, [])

  const resetToDefaults = useCallback(() => {
    setConfig({
      ...DEFAULT_DASHBOARD_CONFIG,
      widgets: DEFAULT_DASHBOARD_CONFIG.widgets.map(w => ({ ...w })),
    })
  }, [])

  const resizeWidget = useCallback((id: string, size: WidgetSize) => {
    if (!(VALID_SIZES as readonly number[]).includes(size)) return
    setConfig(prev => ({
      ...prev,
      widgets: prev.widgets.map(w => w.id === id ? { ...w, size } : w),
    }))
  }, [])

  const value = useMemo(() => ({
    config, toggleWidget, reorderWidgets, resetToDefaults, moveWidget, resizeWidget,
  }), [config, toggleWidget, reorderWidgets, resetToDefaults, moveWidget, resizeWidget])

  return (
    <DashboardConfigContext.Provider value={value}>
      {children}
    </DashboardConfigContext.Provider>
  )
}

export function useDashboardConfig() {
  const context = useContext(DashboardConfigContext)
  if (!context) {
    throw new Error('useDashboardConfig must be used within DashboardConfigProvider')
  }
  return context
}
