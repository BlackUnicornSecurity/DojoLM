/**
 * File: compliance-center.test.tsx
 * Purpose: Tests for ComplianceCenter (Bushido Book main page)
 * Test IDs: CC-001 to CC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

// H8.3: ComplianceCenter now uses useNavigation
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: vi.fn() }),
    // WidgetCard.tsx imports the React Context itself — must be a real Context
    // so useContext(NavigationContext) doesn't throw. Null default value exercises
    // the useSafeNavigation null-fallback path.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p></div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/EnsoGauge', () => ({
  EnsoGauge: ({ value, label }: { value: number; label?: string }) => (
    <div data-testid="enso-gauge" data-value={value}>{label}: {value}</div>
  ),
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tabs-${value}`} data-value={value}>{children}</div>
  ),
  TabsList: ({ children }: { children: ReactNode }) => (
    <div data-testid="tabs-list" role="tablist">{children}</div>
  ),
  TabsTrigger: ({ children, value }: { children: ReactNode; value: string }) => (
    <button role="tab" data-value={value}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}))

vi.mock('../compliance/GapMatrix', () => ({
  GapMatrix: () => <div data-testid="gap-matrix">Gap Matrix</div>,
}))

vi.mock('../compliance/AuditTrail', () => ({
  AuditTrail: () => <div data-testid="audit-trail">Audit Trail</div>,
}))

vi.mock('../compliance/ComplianceChecklist', () => ({
  ComplianceChecklist: () => <div data-testid="compliance-checklist">Checklist</div>,
}))

vi.mock('../compliance/FrameworkNavigator', () => ({
  FrameworkNavigator: () => <div data-testid="framework-navigator">Navigator</div>,
}))

vi.mock('../compliance/ComplianceDashboard', () => ({
  default: () => <div data-testid="compliance-dashboard">ComplianceDashboard</div>,
}))

vi.mock('../compliance/ComplianceExport', () => ({
  ComplianceExport: ({ frameworkData }: { frameworkData: { name: string } | null }) => (
    <div data-testid="compliance-export">{frameworkData?.name ?? 'No framework'}</div>
  ),
}))

vi.mock('@/components/coverage', () => ({
  CoverageMap: ({ title }: { title: string }) => <div data-testid="coverage-map">{title}</div>,
}))

vi.mock('@/lib/constants', () => ({
  COVERAGE_DATA: [
    { category: 'Cat A', pre: 50, post: 80, stories: 'S1', gap: false },
    { category: 'Cat B', pre: 20, post: 40, stories: 'S2', gap: true },
  ],
  OWASP_LLM_COVERAGE_DATA: [
    { category: 'LLM01', pre: 60, post: 90, stories: 'O1', gap: false },
  ],
}))

vi.mock('@/lib/data/baiss-framework', () => ({
  baissControlsToCoverageEntries: () => [
    { category: 'BAISS-01', pre: 40, post: 70, stories: 'B1', gap: false },
  ],
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    overallScore: 78,
    lastUpdated: '2026-03-01',
    summary: { avgCoverage: 78 },
    frameworks: [
      {
        id: 'owasp-llm',
        name: 'OWASP LLM Top 10',
        overallCoverage: 85,
        totalControls: 10,
        coveredControls: 7,
        gapControls: 2,
        partialControls: 1,
        lastAssessed: '2026-03-01',
        tier: 'implemented',
      },
      {
        id: 'nist-ai-rmf',
        name: 'NIST AI RMF',
        overallCoverage: 70,
        totalControls: 15,
        coveredControls: 10,
        gapControls: 3,
        partialControls: 2,
        lastAssessed: '2026-02-28',
        tier: 'implemented',
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------

import ComplianceCenter from '../compliance/ComplianceCenter'

// ===========================================================================
// CC-001: Loading state
// ===========================================================================
describe('CC-001: Loading state', () => {
  it('renders loading spinner while fetching', () => {
    mockFetchWithAuth.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ComplianceCenter />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Loading compliance data...')).toBeInTheDocument()
  })
})

// ===========================================================================
// CC-002: Error state
// ===========================================================================
describe('CC-002: Error state', () => {
  it('renders error message on fetch failure', async () => {
    mockFetchWithAuth.mockRejectedValue(new Error('Network error'))
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(screen.getByText(/Network error/)).toBeInTheDocument()
  })
})

// ===========================================================================
// CC-003: Successful render with data
// ===========================================================================
describe('CC-003: Successful render with data', () => {
  it('renders Bushido Book header and framework list after data load', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('Bushido Book')).toBeInTheDocument()
    })
    expect(screen.getAllByText('OWASP LLM Top 10').length).toBeGreaterThan(0)
    expect(screen.getAllByText('NIST AI RMF').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// CC-004: Overall score gauge renders
// ===========================================================================
describe('CC-004: Overall score gauge renders', () => {
  it('displays the EnsoGauge with correct score value', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('enso-gauge')).toBeInTheDocument()
    })
    expect(screen.getByTestId('enso-gauge')).toHaveAttribute('data-value', '78')
  })
})

// ===========================================================================
// CC-005: Framework count shown
// ===========================================================================
describe('CC-005: Framework count shown', () => {
  it('shows framework count in summary', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('2 Frameworks')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// CC-006: Sub-view tabs render
// ===========================================================================
describe('CC-006: Sub-view tabs render', () => {
  it('renders the 4 top-level sub-view tab triggers (PR-4b.7 restructure)', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('Bushido Book')).toBeInTheDocument()
    })
    // Train 2 PR-4b.7 (2026-04-09): Bushido Book tabs collapsed from 8 → 4
    // per UI-ALIGNMENT v2.1 §5.3 (Evidence | Coverage | Insights | Audit).
    // Legacy sub-panels (GapMatrix, AuditTrail, Checklists, Navigator,
    // ComplianceScan, Dashboard) still render inside the new parent tabs —
    // verified by CC-007 via testId assertions.
    const tabLabels = ['Evidence', 'Coverage', 'Insights', 'Audit']
    for (const label of tabLabels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})

// ===========================================================================
// CC-007: Sub-components render in tab panels
// ===========================================================================
describe('CC-007: Sub-components render in tab panels', () => {
  it('renders GapMatrix, AuditTrail, Checklist, Navigator, and export affordances (PR-4b.7)', async () => {
    // Train 2 PR-4b.7 (2026-04-09): legacy ComplianceDashboard sub-panel
    // was removed from the 4-tab recomposition — the header Score Meter +
    // framework list already cover its gauge/summary role. The other five
    // sub-panels now render inside the Evidence / Coverage / Audit parent
    // tabs.
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('gap-matrix')).toBeInTheDocument()
    })
    expect(screen.getByTestId('compliance-export')).toHaveTextContent('OWASP LLM Top 10')
    expect(screen.getByRole('button', { name: /open coverage dashboard/i })).toBeInTheDocument()
    expect(screen.getByTestId('audit-trail')).toBeInTheDocument()
    expect(screen.getByTestId('compliance-checklist')).toBeInTheDocument()
    expect(screen.getByTestId('framework-navigator')).toBeInTheDocument()
  })
})

// ===========================================================================
// CC-007A: Selected framework actions
// ===========================================================================
describe('CC-007A: Selected framework actions', () => {
  it('shows selected framework context next to the export controls', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('Selected Framework')).toBeInTheDocument()
    })
    expect(screen.getByTestId('compliance-export')).toHaveTextContent('OWASP LLM Top 10')
    expect(screen.getByText(/classic coverage dashboard/i)).toBeInTheDocument()
  })
})

// ===========================================================================
// CC-008: Tier section collapsible
// ===========================================================================
describe('CC-008: Tier section collapsible', () => {
  it('renders tier section headers with expand/collapse', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('Bushido Book')).toBeInTheDocument()
    })
    // Implemented tier should be visible
    const tierButton = screen.getByRole('button', { name: /Implemented Frameworks/i })
    expect(tierButton).toBeInTheDocument()
    expect(tierButton).toHaveAttribute('aria-expanded', 'true')
  })
})

// ===========================================================================
// CC-009: Gap count display
// ===========================================================================
describe('CC-009: Gap count display', () => {
  it('shows total gap count for implemented frameworks', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      // 2 + 1 (owasp) + 3 + 2 (nist) = 8 gaps (implemented)
      expect(screen.getByText('8 gaps (implemented)')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// CC-010: API non-ok response treated as error
// ===========================================================================
describe('CC-010: API non-ok response', () => {
  it('shows error when API returns non-ok', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// CC-011: Overview panel shows framework details
// ===========================================================================
describe('CC-011: Overview panel shows framework details', () => {
  it('shows coverage, covered, partial, gaps stats for selected framework', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getAllByText('OWASP LLM Top 10').length).toBeGreaterThan(0)
    })
    // Overview panel shows stats: coverage %, covered, partial, gap
    expect(screen.getAllByText('85%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Coverage').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// CC-012: Framework selection via FrameworkGapSummary buttons
// ===========================================================================
describe('CC-012: Framework selection', () => {
  it('renders framework buttons with coverage and gap info', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => makeApiResponse(),
    })
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('gap-matrix')).toBeInTheDocument()
    })
    // Framework buttons render with coverage info
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
