'use client'

/**
 * File: DashboardConfigContext.tsx
 * Purpose: Dashboard configuration context with widget catalog and localStorage persistence
 * Story: TPI-NODA-1.5.1
 * Index:
 * - WidgetSlot type (line 14)
 * - DashboardConfig type (line 22)
 * - WidgetCatalogEntry type (line 28)
 * - WIDGET_CATALOG (line 39)
 * - DEFAULT_DASHBOARD_CONFIG (line 123)
 * - DashboardConfigProvider (line 175)
 * - useDashboardConfig hook (line 226)
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'

/** A single widget slot in the dashboard layout */
export interface WidgetSlot {
  id: string
  visible: boolean
  order: number
  size: 'full' | 'half' | 'third'
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
  defaultSize: 'full' | 'half' | 'third'
  isDefault: boolean
}

/** Full widget catalog — all 27 available widgets */
export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  // Interactive / Action Widgets
  { id: 'quick-scan', label: 'Quick Scan Bar', description: 'Instant inline ALLOW/BLOCK verdict', category: 'interactive', defaultSize: 'full', isDefault: false },
  { id: 'quick-launch', label: 'Quick Launch Pad', description: '6 large action cards for quick navigation', category: 'interactive', defaultSize: 'full', isDefault: true },
  { id: 'guard-controls', label: 'Guard Quick Controls', description: 'Mode toggle, threshold, recent blocks', category: 'interactive', defaultSize: 'third', isDefault: true },
  { id: 'fixture-roulette', label: 'Fixture Roulette', description: 'Random fixture picker with media preview', category: 'interactive', defaultSize: 'half', isDefault: false },
  { id: 'engine-grid', label: 'Engine Toggle Grid', description: '13 engine filter pills, toggle on/off', category: 'interactive', defaultSize: 'full', isDefault: true },
  { id: 'llm-quick-test', label: 'Quick LLM Test', description: 'Pick model + preset, one-click batch start', category: 'interactive', defaultSize: 'half', isDefault: false },

  // Dynamic / Live Widgets
  { id: 'session-pulse', label: 'Session Pulse', description: 'Session stats: scans, threats, pass rate', category: 'dynamic', defaultSize: 'half', isDefault: false },
  { id: 'guard-stats', label: 'Guard Stats Card', description: 'Blocked/allowed counts, block rate %', category: 'dynamic', defaultSize: 'third', isDefault: false },
  { id: 'batch-progress', label: 'LLM Batch Progress', description: 'Active batch progress bars', category: 'dynamic', defaultSize: 'half', isDefault: false },
  { id: 'activity-feed', label: 'Recent Activity Feed', description: 'Timestamped event list with unread dots', category: 'dynamic', defaultSize: 'half', isDefault: true },
  { id: 'guard-audit', label: 'Guard Audit Mini-Log', description: 'Last 5 guard events', category: 'dynamic', defaultSize: 'half', isDefault: false },
  { id: 'threat-trend', label: 'Threat Trend Chart', description: 'Line chart of scan results over session', category: 'dynamic', defaultSize: 'half', isDefault: false },

  // Visual / Gamification Widgets
  { id: 'attack-of-day', label: 'Attack of the Day', description: 'Daily featured attack with Try It button', category: 'visual', defaultSize: 'half', isDefault: false },
  { id: 'threat-radar', label: 'Threat Radar', description: 'Animated SVG radar with 6 category sectors', category: 'visual', defaultSize: 'half', isDefault: true },
  { id: 'kill-count', label: 'Kill Count', description: 'Session scoreboard with trophy milestones', category: 'visual', defaultSize: 'half', isDefault: true },
  { id: 'health-gauge', label: 'System Health Gauge', description: 'Composite score gauge', category: 'visual', defaultSize: 'third', isDefault: true },

  // Strategic Module Widgets
  { id: 'arena-leaderboard', label: 'Arena Mini-Leaderboard', description: 'Top 5 agents: rank, name, win rate', category: 'strategic', defaultSize: 'third', isDefault: false },
  { id: 'sage-status', label: 'SAGE Evolution Status', description: 'Generation, best fitness, status badge', category: 'strategic', defaultSize: 'third', isDefault: false },
  { id: 'mitsuke-alerts', label: 'Mitsuke Alert Feed', description: 'Latest 4 threat alerts with severity', category: 'strategic', defaultSize: 'third', isDefault: false },

  // Reference Widgets
  { id: 'llm-models', label: 'LLM Models List', description: 'Configured models with provider and status', category: 'reference', defaultSize: 'half', isDefault: false },
  { id: 'module-grid', label: 'Haiku Scanner Module Grid', description: '23 modules as colored dots/chips', category: 'reference', defaultSize: 'half', isDefault: true },
  { id: 'compliance-bars', label: 'Compliance Mini-Bars', description: '6 horizontal bars for framework coverage', category: 'reference', defaultSize: 'half', isDefault: false },
  { id: 'coverage-heatmap', label: 'Coverage Heatmap', description: 'TPI categories as colored grid cells', category: 'reference', defaultSize: 'half', isDefault: false },
  { id: 'platform-stats', label: 'Platform Stats', description: 'Combined patterns, fixtures, and OWASP coverage', category: 'reference', defaultSize: 'half', isDefault: false },

  // Ecosystem Widget
  { id: 'ecosystem-pulse', label: 'Ecosystem Pulse', description: 'Cross-module data flow health and metrics', category: 'dynamic', defaultSize: 'half', isDefault: false },

  // Phase E Widgets (Stories 10.6, 11.4)
  { id: 'ronin-hub', label: 'Ronin Hub', description: 'Bug bounty submissions, subscriptions, and CVE alerts', category: 'strategic', defaultSize: 'half', isDefault: false },
  { id: 'llm-jutsu', label: 'LLM Jutsu', description: 'Model testing summary with belt distribution', category: 'strategic', defaultSize: 'half', isDefault: false },
]

const CATALOG_MAP = new Map(WIDGET_CATALOG.map(w => [w.id, w]))

/** Default widgets shown on first load (8 widgets) */
const DEFAULT_WIDGET_IDS = WIDGET_CATALOG.filter(w => w.isDefault).map(w => w.id)

/** Default dashboard config */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  widgets: DEFAULT_WIDGET_IDS.map((id, index) => ({
    id,
    visible: true,
    order: index,
    size: CATALOG_MAP.get(id)?.defaultSize ?? 'half',
  })),
  layout: 'default',
}

const STORAGE_KEY = 'noda-dashboard-config'

function loadConfig(): DashboardConfig {
  if (typeof window === 'undefined') return DEFAULT_DASHBOARD_CONFIG
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DASHBOARD_CONFIG
    const parsed = JSON.parse(raw) as DashboardConfig
    if (!parsed.widgets || !Array.isArray(parsed.widgets)) return DEFAULT_DASHBOARD_CONFIG
    // Validate each widget has valid ID and field types
    const validSizes = ['full', 'half', 'third']
    const validWidgets = parsed.widgets.filter(w =>
      CATALOG_MAP.has(w.id) &&
      typeof w.visible === 'boolean' &&
      typeof w.order === 'number' &&
      Number.isFinite(w.order) &&
      validSizes.includes(w.size)
    )
    if (validWidgets.length === 0) return DEFAULT_DASHBOARD_CONFIG
    return { ...parsed, widgets: validWidgets }
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
        widgets: [...prev.widgets, { id, visible: true, order: maxOrder + 1, size: catalogEntry.defaultSize }],
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

  return (
    <DashboardConfigContext.Provider value={{ config, toggleWidget, reorderWidgets, resetToDefaults, moveWidget }}>
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
