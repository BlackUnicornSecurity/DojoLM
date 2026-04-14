/**
 * File: main-page.test.tsx
 * Purpose: Unit tests for the main page component (app/page.tsx) — layout, sidebar, navigation context
 * Test IDs: MP-001 to MP-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks — must be before imports
// ---------------------------------------------------------------------------

const mockSetActiveTab = vi.fn()
let mockActiveTab = 'dashboard'

// FINDING-001 fix: AuthGate uses useRouter for redirect and useAuth for session check.
// Mock next/navigation to prevent router errors in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock AuthContext so AuthGate renders children (user is set, loading is false).
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-1',
      username: 'test-admin',
      email: 'admin@test.com',
      role: 'admin',
      displayName: 'Test Admin',
    },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    activeTab: mockActiveTab,
    setActiveTab: mockSetActiveTab,
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="navigation-provider">{children}</div>
  ),
}))

vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    scanText: vi.fn(),
    clear: vi.fn(),
    scanResult: null,
    isScanning: false,
    error: null,
    engineFilters: [],
    toggleFilter: vi.fn(),
    resetFilters: vi.fn(),
  }),
  ScannerProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scanner-provider">{children}</div>
  ),
}))

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityLogger: () => ({ logEvent: vi.fn() }),
  // Train 2 regression fix pass: ActivityFeed/TopBar also consume useActivityState.
  useActivityState: () => ({ events: [], unreadCount: 0 }),
  ActivityProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="activity-provider">{children}</div>
  ),
}))

vi.mock('@/lib/contexts/GuardContext', () => ({
  GuardProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="guard-provider">{children}</div>
  ),
}))

vi.mock('@/lib/contexts/EcosystemContext', () => ({
  EcosystemProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ecosystem-provider">{children}</div>
  ),
}))

vi.mock('@/lib/contexts/ModuleVisibilityContext', () => ({
  ModuleVisibilityProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="module-visibility-provider">{children}</div>
  ),
}))

vi.mock('@/lib/Providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [
    { id: 'dashboard', label: 'Dashboard', icon: () => null, description: 'Overview' },
    { id: 'scanner', label: 'Scanner', icon: () => null, description: 'Scan' },
    { id: 'jutsu', label: 'Model Lab', icon: () => null, description: 'Model Lab' },
  ],
  // Train 2 PR-4c.3: CommandPalette (loaded transitively via TopBar) uses NAV_GROUPS.
  NAV_GROUPS: [
    { id: 'test', label: 'Test' },
    { id: 'protect', label: 'Protect' },
    { id: 'intel', label: 'Intel & Evidence' },
  ],
  PAYLOAD_CATALOG: [],
}))

vi.mock('@/lib/api', () => ({
  scanFixture: vi.fn(),
  readFixture: vi.fn(),
}))

vi.mock('@/lib/client-data-cache', () => ({
  getCachedFixtureManifest: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/hooks', () => ({
  useScannerMetrics: () => ({
    totalScans: 0,
    threatsDetected: 0,
    passRate: '100%',
    activeEngines: 4,
    totalEngines: 4,
    threatTrend: [],
  }),
}))

// Mock all lazy-loaded module components
vi.mock('@/components/llm', () => ({
  ModelLabWithProviders: () => <div data-testid="model-lab">Model Lab</div>,
}))
vi.mock('@/components/adversarial', () => ({
  AdversarialLab: () => <div data-testid="adversarial-lab">Adversarial</div>,
}))
vi.mock('@/components/compliance', () => ({
  ComplianceCenter: () => <div data-testid="compliance-center">Compliance</div>,
}))
// Train 2 PR-4b.8: StrategicHub deleted. page.tsx no longer imports from
// @/components/strategic at the top level, so no mock needed.
vi.mock('@/components/guard', () => ({
  GuardDashboard: () => <div data-testid="guard-dashboard">Guard</div>,
}))
vi.mock('@/components/admin', () => ({
  AdminPanel: () => <div data-testid="admin-panel">Admin</div>,
}))
vi.mock('@/components/ronin', () => ({
  RoninHub: () => <div data-testid="ronin-hub">Ronin</div>,
}))
vi.mock('@/components/sengoku', () => ({
  SengokuDashboard: () => <div data-testid="sengoku-dashboard">Sengoku</div>,
}))
vi.mock('@/components/kotoba', () => ({
  KotobaDashboard: () => <div data-testid="kotoba-dashboard">Kotoba</div>,
}))

// Mock layout components
vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Sidebar</nav>,
}))

vi.mock('@/components/layout/MobileNav', () => ({
  MobileNav: () => <nav data-testid="mobile-nav">MobileNav</nav>,
}))

vi.mock('@/components/layout/PageToolbar', () => ({
  PageToolbar: (props: { title: string }) => <div data-testid="page-toolbar">{props.title}</div>,
}))

// Mock scanner components
vi.mock('@/components/scanner', () => ({
  ScannerInput: () => <div data-testid="scanner-input">ScannerInput</div>,
  FindingsList: () => <div data-testid="findings-list">FindingsList</div>,
}))

vi.mock('@/components/fixtures', () => ({
  FixtureDetail: () => <div>FixtureDetail</div>,
  FixtureComparison: () => <div>FixtureComparison</div>,
  FixtureExplorer: () => <div>FixtureExplorer</div>,
}))

vi.mock('@/components/payloads', () => ({
  PayloadCard: () => <div>PayloadCard</div>,
}))

vi.mock('@/components/dashboard', () => ({
  NODADashboard: () => <div data-testid="noda-dashboard">Dashboard</div>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: () => <div data-testid="metric-card">MetricCard</div>,
}))

vi.mock('@/components/ui/FilterPills', () => ({
  FilterPills: () => <div data-testid="filter-pills">FilterPills</div>,
}))

vi.mock('@/components/ui/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

vi.mock('@/components/sensei/SenseiDrawer', () => ({
  SenseiDrawer: () => <div data-testid="sensei-drawer">Sensei</div>,
}))

// Proxy mock covers all icon imports transitively (e.g. new TopBar adds Activity/Bot,
// Sidebar PR-2 rewrite adds PanelLeft/PanelLeftClose). Prevents "No 'X' export is defined
// on the 'lucide-react' mock" failures per lessonslearned.md (2026-03-21 / 2026-04-09).
vi.mock('lucide-react', () => mockLucideIcons('*'))

// Train 2 PR-4c.3: cmdk is loaded transitively via TopBar→CommandPalette.
// Mock it to avoid loading the real Radix Dialog in jsdom.
vi.mock('cmdk', () => ({
  Command: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="cmdk">{children}</div>,
    {
      Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
        open ? <div data-testid="cmdk-dialog">{children}</div> : null,
      Input: (props: Record<string, unknown>) => <input data-testid="cmdk-input" {...props} />,
      List: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Empty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Group: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
      Item: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    },
  ),
}))

// ---------------------------------------------------------------------------
// Import under test (after all mocks)
// ---------------------------------------------------------------------------

import Home from '../page'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Home (main page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveTab = 'dashboard'
  })

  // --- MP-001: Renders without crashing ---
  it('MP-001: renders without crashing', () => {
    const { container } = render(<Home />)
    expect(container).toBeTruthy()
  })

  // --- MP-002: Wraps content in Providers ---
  it('MP-002: wraps content in Providers', () => {
    render(<Home />)
    expect(screen.getByTestId('providers')).toBeInTheDocument()
  })

  // --- MP-003: Renders Sidebar ---
  it('MP-003: renders Sidebar', () => {
    render(<Home />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  // --- MP-004: Renders MobileNav ---
  it('MP-004: renders MobileNav', () => {
    render(<Home />)
    expect(screen.getByTestId('mobile-nav')).toBeInTheDocument()
  })

  // --- MP-005: Renders SenseiDrawer ---
  it('MP-005: renders SenseiDrawer', () => {
    render(<Home />)
    expect(screen.getByTestId('sensei-drawer')).toBeInTheDocument()
  })

  // --- MP-006: Has main content area with correct id ---
  it('MP-006: has main content area with id="main-content"', () => {
    render(<Home />)
    const main = document.getElementById('main-content')
    expect(main).toBeInTheDocument()
    expect(main?.tagName).toBe('MAIN')
  })

  // --- MP-007: Main has aria-label ---
  it('MP-007: main has aria-label for accessibility', () => {
    render(<Home />)
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('aria-label', 'Main content')
  })

  // --- MP-008: Renders dashboard by default ---
  it('MP-008: renders NODADashboard when activeTab is dashboard', () => {
    render(<Home />)
    expect(screen.getByTestId('noda-dashboard')).toBeInTheDocument()
  })

  // --- MP-009: Screen reader announcer present ---
  it('MP-009: includes screen reader announcer for active module', () => {
    render(<Home />)
    // The ScreenReaderAnnouncer renders "Viewing Dashboard"
    expect(screen.getByText('Viewing Dashboard')).toBeInTheDocument()
  })

  // --- MP-010: Has min-h-screen container ---
  it('MP-010: root container has min-h-screen for full-height layout', () => {
    render(<Home />)
    const providers = screen.getByTestId('providers')
    const root = providers.firstElementChild
    expect(root?.className).toContain('min-h-screen')
  })

  // --- MP-011: Default export is a function ---
  it('MP-011: default export is a function component', () => {
    expect(typeof Home).toBe('function')
  })

  // --- MP-012: Error boundaries wrap modules ---
  it('MP-012: wraps module content in error boundaries', () => {
    render(<Home />)
    const boundaries = screen.getAllByTestId('error-boundary')
    expect(boundaries.length).toBeGreaterThan(0)
  })

  // --- MP-013: strategic deep link renders KumiteRetiredNotice ---
  it('MP-013: activeTab=strategic renders KumiteRetiredNotice heading', () => {
    mockActiveTab = 'strategic'
    render(<Home />)
    expect(screen.getByText('The Kumite has been split')).toBeInTheDocument()
    expect(screen.getByText(/The Kumite hub is retired/)).toBeInTheDocument()
  })

  // --- MP-014: KumiteRetiredNotice exposes all 4 promoted destinations ---
  it('MP-014: KumiteRetiredNotice shows Mitsuke, DNA, Kagami, and Battle Arena buttons', () => {
    mockActiveTab = 'strategic'
    render(<Home />)
    // All 4 promoted children must be reachable from the retired-notice
    expect(screen.getByText('Mitsuke')).toBeInTheDocument()
    expect(screen.getByText('Amaterasu DNA')).toBeInTheDocument()
    expect(screen.getByText('Kagami')).toBeInTheDocument()
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    // Dashboard (default tab) must not appear simultaneously
    expect(screen.queryByTestId('noda-dashboard')).not.toBeInTheDocument()
  })
})
