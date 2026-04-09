/**
 * File: noda-dashboard-render.test.tsx
 * Purpose: Render tests for the NODADashboard component — verifies layout, sections, hero header
 * Test IDs: DSH-R-001 to DSH-R-010
 *
 * Note: noda-dashboard.test.tsx covers DashboardConfigContext logic.
 * This file covers the actual NODADashboard component rendering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

const mockSetActiveTab = vi.fn()
let mockActiveTab = 'dashboard'

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children }: { children: React.ReactNode }) => <div data-testid="glow-card">{children}</div>,
}))

// Mock contexts used by widgets that render inside the dashboard
vi.mock('@/lib/contexts/GuardContext', () => ({
  useGuard: () => ({
    guardMode: 'shinobi',
    setGuardMode: vi.fn(),
    stats: { blocked: 0, logged: 0, allowed: 0 },
    isLoading: false,
  }),
  useGuardMode: () => ({
    mode: 'shinobi',
    setMode: vi.fn(),
    isLoading: false,
  }),
  GuardProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityState: () => ({ events: [] }),
  useActivityDispatch: () => vi.fn(),
  useActivityLogger: () => ({ logEvent: vi.fn() }),
  ActivityProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    scanResult: null,
    isScanning: false,
    error: null,
    engineFilters: [],
    toggleFilter: vi.fn(),
    resetFilters: vi.fn(),
    scanText: vi.fn(),
    clear: vi.fn(),
  }),
  ScannerProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/contexts/EcosystemContext', () => ({
  useEcosystem: () => ({ species: [], isLoading: false }),
  EcosystemProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/contexts/ModuleVisibilityContext', () => ({
  useModuleVisibility: () => ({ isVisible: () => true, toggle: vi.fn(), resetAll: vi.fn(), visibility: {} }),
  ModuleVisibilityProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/hooks', () => ({
  useScannerMetrics: () => ({
    totalScans: 0, threatsDetected: 0, passRate: '100%',
    activeEngines: 4, totalEngines: 4, threatTrend: [],
  }),
}))

vi.mock('../dashboard/DashboardCustomizer', () => ({
  DashboardCustomizer: ({ open, onOpenModuleVisibility }: { open: boolean; onOpenModuleVisibility?: () => void }) => (
    open ? (
      <div data-testid="dashboard-customizer">
        <button onClick={onOpenModuleVisibility}>Module Visibility</button>
        Customizer
      </div>
    ) : null
  ),
}))

vi.mock('../dashboard/SenseiPanel', () => ({
  SenseiPanel: ({ open }: { open: boolean }) => (
    open ? <div data-testid="sensei-panel">Sensei</div> : null
  ),
}))

vi.mock('@/hooks/useSenseiScroll', () => ({
  useSenseiScroll: () => ({ scrollRef: { current: null }, isNearBottom: true, activated: false, reset: vi.fn() }),
}))

// Mock WidgetCard with all exports the widgets and dashboard need
vi.mock('../dashboard/WidgetCard', () => ({
  WidgetMetaProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="widget-meta-provider">{children}</div>
  ),
  WidgetCard: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid={`widget-card-${title}`}>{children}</div>
  ),
  useWidgetMeta: () => ({ priority: 'standard', glow: 'none', tall: false }),
}))

// Mock lucide-react with all icons — use importOriginal to cover all exports
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const Stub = () => <span data-testid="lucide-icon" />
  const mocked: Record<string, unknown> = {}
  for (const key of Object.keys(actual)) {
    mocked[key] = typeof actual[key] === 'function' ? Stub : actual[key]
  }
  return mocked
})

// Mock all widget modules at the @/ alias path that vitest resolves
const widgetNames = [
  'QuickLaunchOrOnboarding', 'SystemHealthGauge', 'GuardQuickPanel', 'GuardStatsCard',
  'AttackOfTheDay', 'FixtureRoulette', 'SessionPulse', 'KillCount',
  'EngineToggleGrid', 'LLMBatchProgress', 'ThreatRadar', 'ArenaLeaderboardWidget',
  'SAGEStatusWidget', 'MitsukeAlertWidget', 'LLMModelsWidget', 'QuickScanWidget',
  'QuickLLMTestWidget', 'ActivityFeedWidget', 'GuardAuditWidget', 'ThreatTrendWidget',
  'ModuleGridWidget', 'ComplianceBarsWidget', 'CoverageHeatmapWidget', 'PlatformStatsWidget',
  'EcosystemPulseWidget', 'RoninHubWidget', 'LLMJutsuWidget', 'SengokuWidget',
  'TimeChamberWidget', 'KotobaWidget',
]

// Mock via both path formats to ensure vitest intercepts regardless of resolution
for (const name of widgetNames) {
  vi.mock(`@/components/dashboard/widgets/${name}`, () => ({
    [name]: () => <div data-testid={`widget-${name}`}>{name}</div>,
  }))
  vi.mock(`../dashboard/widgets/${name}`, () => ({
    [name]: () => <div data-testid={`widget-${name}`}>{name}</div>,
  }))
}

// Mock other UI components that widgets may import
vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: () => <div data-testid="metric-card">MetricCard</div>,
}))

vi.mock('@/components/ui/EnsoGauge', () => ({
  EnsoGauge: () => <div data-testid="enso-gauge">Gauge</div>,
}))

vi.mock('@/lib/client-data-cache', () => ({
  getCachedFixtureManifest: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/api', () => ({
  scanFixture: vi.fn(),
  readFixture: vi.fn(),
  fetchGuardStats: vi.fn().mockResolvedValue({ blocked: 0, logged: 0, allowed: 0 }),
}))

// Mock DashboardConfigContext — provides a minimal default config
vi.mock('../dashboard/DashboardConfigContext', () => {
  const defaultWidgets = [
    { id: 'quick-launch', visible: true, order: 0, size: 6 as const },
    { id: 'health-gauge', visible: true, order: 1, size: 6 as const },
    { id: 'threat-radar', visible: true, order: 2, size: 4 as const },
    { id: 'activity-feed', visible: true, order: 3, size: 4 as const },
    { id: 'engine-grid', visible: true, order: 4, size: 4 as const },
  ]
  const mockConfig = {
    widgets: defaultWidgets,
    layout: 'bento' as const,
    version: 2,
    senseiEnabled: true,
  }
  return {
    DashboardConfigProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="dashboard-config-provider">{children}</div>
    ),
    useDashboardConfig: () => ({
      config: mockConfig,
      toggleWidget: vi.fn(),
      reorderWidgets: vi.fn(),
      resetToDefaults: vi.fn(),
      moveWidget: vi.fn(),
      setLayout: vi.fn(),
      resizeWidget: vi.fn(),
      toggleSensei: vi.fn(),
    }),
    WIDGET_CATALOG: [],
    DEFAULT_DASHBOARD_CONFIG: mockConfig,
    migrateSize: (s: number) => s,
  }
})

// ---------------------------------------------------------------------------
// Import under test (after all mocks)
// ---------------------------------------------------------------------------

import { NODADashboard } from '../dashboard/NODADashboard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NODADashboard render', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveTab = 'dashboard'
  })

  // --- DSH-R-001: Renders without crashing ---
  it('DSH-R-001: renders without crashing', () => {
    const { container } = render(<NODADashboard />)
    expect(container).toBeTruthy()
  })

  // --- DSH-R-002: Wraps content in DashboardConfigProvider ---
  it('DSH-R-002: wraps content in DashboardConfigProvider', () => {
    render(<NODADashboard />)
    expect(screen.getByTestId('dashboard-config-provider')).toBeInTheDocument()
  })

  // --- DSH-R-003: Contains Dashboard heading ---
  it('DSH-R-003: contains Dashboard heading', () => {
    render(<NODADashboard />)
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  // --- DSH-R-004: Shows widget count summary ---
  it('DSH-R-004: shows widget count in hero header', () => {
    render(<NODADashboard />)
    // "5 widgets across N zones"
    expect(screen.getByText(/5 widgets/)).toBeInTheDocument()
  })

  // --- DSH-R-005: Contains action buttons (Scan Text, Models, Guard) ---
  it('DSH-R-005: contains action buttons in hero header', () => {
    render(<NODADashboard />)
    expect(screen.getByText('Scan Text')).toBeInTheDocument()
    expect(screen.getByText('Models')).toBeInTheDocument()
    expect(screen.getByText('Guard')).toBeInTheDocument()
  })

  // --- DSH-R-006: Contains section headings ---
  it('DSH-R-006: renders section headings for visible sections', () => {
    render(<NODADashboard />)
    // With the mock config, widgets span Command, Monitoring, Platform sections
    expect(screen.getByText('Command')).toBeInTheDocument()
    expect(screen.getByText('Monitoring')).toBeInTheDocument()
    expect(screen.getByText('Platform')).toBeInTheDocument()
  })

  // --- DSH-R-007: Scan Text button triggers navigation ---
  it('DSH-R-007: Scan Text button navigates to scanner', () => {
    render(<NODADashboard />)
    screen.getByText('Scan Text').click()
    expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
  })

  // --- DSH-R-008: Models button triggers navigation ---
  it('DSH-R-008: Models button navigates to jutsu (Model Lab)', () => {
    render(<NODADashboard />)
    screen.getByText('Models').click()
    expect(mockSetActiveTab).toHaveBeenCalledWith('jutsu')
  })

  // --- DSH-R-009: Guard button triggers navigation ---
  it('DSH-R-009: Guard button navigates to guard', () => {
    render(<NODADashboard />)
    screen.getByText('Guard').click()
    expect(mockSetActiveTab).toHaveBeenCalledWith('guard')
  })

  // --- DSH-R-010: Error boundaries wrap widget areas ---
  it('DSH-R-010: wraps widgets in error boundaries', () => {
    render(<NODADashboard />)
    const boundaries = screen.getAllByTestId('error-boundary')
    expect(boundaries.length).toBeGreaterThan(0)
  })

  it('DSH-R-011: visible dashboard settings can open module visibility controls', () => {
    render(<NODADashboard />)
    fireEvent.click(screen.getByLabelText('Customize Dashboard'))
    expect(screen.getByTestId('dashboard-customizer')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Module Visibility'))
    expect(screen.getByTestId('sensei-panel')).toBeInTheDocument()
  })
})
