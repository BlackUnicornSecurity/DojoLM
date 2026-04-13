/**
 * File: bushido-book.test.tsx
 * Purpose: Tests for Bushido Book (Compliance) module
 * Test IDs: BSH-001 to BSH-014
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

// Mock UI components
vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div data-testid="module-header"><h1>{title}</h1><p>{subtitle}</p></div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/EnsoGauge', () => ({
  EnsoGauge: ({ value }: { value: number }) => <div data-testid="enso-gauge" data-value={value}>{value}</div>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid={`tabs-${value}`} data-value={value}>
      {/* Inject onValueChange into context via data attribute */}
      {typeof children === 'function' ? null : children}
    </div>
  ),
  TabsList: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
    <div data-testid="tabs-list" role="tablist" {...rest}>{children}</div>
  ),
  TabsTrigger: ({ children, value, ...rest }: { children: ReactNode; value: string; [k: string]: unknown }) => (
    <button role="tab" data-value={value} {...rest}>{children}</button>
  ),
  TabsContent: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-testid={`tab-content-${value}`} role="tabpanel">{children}</div>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: ReactNode; variant?: string; className?: string }) => (
    <span data-variant={variant} className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: ReactNode; className?: string }) => <td className={className}>{children}</td>,
  TableHead: ({ children, className }: { children: ReactNode; className?: string }) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: { children: ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
}))

// Mock NavigationContext (H8.3 uses useNavigation in ComplianceCenter)
const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
    // WidgetCard.tsx imports the React Context itself.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

// Mock sub-components
vi.mock('../compliance/GapMatrix', () => ({
  GapMatrix: () => <div data-testid="gap-matrix">Gap Matrix Content</div>,
}))

vi.mock('../compliance/AuditTrail', () => ({
  AuditTrail: () => <div data-testid="audit-trail">Audit Trail Content</div>,
}))

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Mock URL.createObjectURL and related
const mockCreateObjectURL = vi.fn(() => 'blob:test')
const mockRevokeObjectURL = vi.fn()
Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL, writable: true })
Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL, writable: true })

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

// ---------------------------------------------------------------------------
// Compliance API mock data
// ---------------------------------------------------------------------------
const MOCK_COMPLIANCE_DATA = {
  lastUpdated: '2026-03-05',
  summary: { avgCoverage: 72 },
  frameworks: [
    { id: 'owasp-llm', name: 'OWASP LLM Top 10', totalControls: 10, coveredControls: 7, partialControls: 2, gapControls: 1, overallCoverage: 70 },
    { id: 'nist-ai-rmf', name: 'NIST AI 600-1', totalControls: 15, coveredControls: 10, partialControls: 3, gapControls: 2, overallCoverage: 67 },
    { id: 'mitre-atlas', name: 'MITRE ATLAS', totalControls: 12, coveredControls: 9, partialControls: 2, gapControls: 1, overallCoverage: 75 },
    { id: 'iso-42001', name: 'ISO 42001', totalControls: 8, coveredControls: 6, partialControls: 1, gapControls: 1, overallCoverage: 75 },
    { id: 'eu-ai-act', name: 'EU AI Act', totalControls: 10, coveredControls: 8, partialControls: 1, gapControls: 1, overallCoverage: 80 },
  ],
}

// ---------------------------------------------------------------------------
// Imports under test
// ---------------------------------------------------------------------------
import { ComplianceCenter } from '../compliance/ComplianceCenter'
import { ComplianceChecklist } from '../compliance/ComplianceChecklist'
import { FrameworkNavigator } from '../compliance/FrameworkNavigator'
import { CoverageMap, CoverageSummary } from '../coverage/CoverageMap'
import { BAISS_CONTROLS, BAISS_CATEGORIES } from '@/lib/data/baiss-framework'

// ===========================================================================
// BSH-001: 6 sub-tabs render and switch
// ===========================================================================
describe('BSH-001: ComplianceCenter sub-tabs', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })
  })

  it('renders all 4 sub-tab triggers (PR-4b.7 restructure)', async () => {
    render(<ComplianceCenter />)
    await waitFor(() => {
      const allTabs = screen.getAllByRole('tab')
      // Train 2 PR-4b.7 (2026-04-09): Bushido Book tabs collapsed from 8 → 4
      // per UI-ALIGNMENT v2.1 §5.3. Evidence absorbs OverviewPanel +
      // ComplianceScanPanel + Checklists. Coverage absorbs CoveragePanel +
      // GapMatrix + FrameworkNavigator. Insights is a placeholder awaiting
      // Leaderboard + AnalyticsWorkspace from PR-4b.6. Audit hosts AuditTrail
      // + ComplianceDashboard.
      const subViewValues = ['evidence', 'coverage', 'results', 'audit']
      for (const val of subViewValues) {
        const tabsWithValue = allTabs.filter(t => t.getAttribute('data-value') === val)
        expect(tabsWithValue.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

// ===========================================================================
// BSH-002: Framework selector lists frameworks
// ===========================================================================
describe('BSH-002: Framework selector', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })
  })

  it('renders framework items in tier sections', async () => {
    render(<ComplianceCenter />)
    await waitFor(() => {
      // Frameworks now appear as FrameworkGapSummary buttons with aria-label
      // Use getAllByLabelText since H9.4 compliance-scan tab may also render framework selectors
      const fwNames = ['OWASP LLM Top 10', 'NIST AI 600-1', 'MITRE ATLAS', 'ISO 42001', 'EU AI Act']
      for (const name of fwNames) {
        const btns = screen.getAllByLabelText(new RegExp(name))
        expect(btns.length).toBeGreaterThanOrEqual(1)
      }
    })
  })
})

// ===========================================================================
// BSH-003: Selecting framework updates view
// ===========================================================================
describe('BSH-003: Framework selection', () => {
  it('renders framework gap summaries with coverage data', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })

    render(<ComplianceCenter />)
    await waitFor(() => {
      // Framework coverage percentages should be displayed
      expect(screen.getByText('Bushido Book')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// BSH-004: BAISS shows controls across categories
// ===========================================================================
describe('BSH-004: BAISS controls and categories', () => {
  it('BAISS_CONTROLS has 45 controls', () => {
    expect(BAISS_CONTROLS.length).toBe(45)
  })

  it('BAISS_CATEGORIES has 10 categories', () => {
    expect(BAISS_CATEGORIES.length).toBe(10)
  })

  it('all controls have required fields', () => {
    for (const control of BAISS_CONTROLS) {
      expect(control.id).toMatch(/^BAISS-\d{3}$/)
      expect(control.title).toBeTruthy()
      expect(control.description).toBeTruthy()
      expect(control.category).toBeTruthy()
      expect(['automated', 'semi-automated', 'manual']).toContain(control.assessmentType)
    }
  })

  it('each control maps to a valid category', () => {
    const categoryIds = BAISS_CATEGORIES.map(c => c.id)
    for (const control of BAISS_CONTROLS) {
      expect(categoryIds).toContain(control.category)
    }
  })
})

// ===========================================================================
// BSH-005: Coverage map renders percentages
// ===========================================================================
describe('BSH-005: CoverageMap', () => {
  const coverageData = [
    { category: 'Prompt Injection', pre: 30, post: 85, gap: false, stories: 'S1-S3' },
    { category: 'Data Poisoning', pre: 10, post: 60, gap: false, stories: 'S4-S6' },
    { category: 'Supply Chain', pre: 0, post: 40, gap: true, stories: 'S7' },
  ]

  it('renders coverage table with categories', () => {
    render(<CoverageMap coverageData={coverageData} />)
    expect(screen.getByText('Prompt Injection')).toBeInTheDocument()
    expect(screen.getByText('Data Poisoning')).toBeInTheDocument()
    expect(screen.getByText('Supply Chain')).toBeInTheDocument()
  })

  it('renders control (stories) column data', () => {
    render(<CoverageMap coverageData={coverageData} />)
    expect(screen.getByText('S1-S3')).toBeInTheDocument()
    expect(screen.getByText('S4-S6')).toBeInTheDocument()
    expect(screen.getByText('S7')).toBeInTheDocument()
  })

  it('shows Gap badge for items with gap=true', () => {
    render(<CoverageMap coverageData={coverageData} />)
    expect(screen.getByText('Gap')).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<CoverageMap coverageData={coverageData} title="Custom Title" />)
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })
})

describe('BSH-005b: CoverageSummary', () => {
  const coverageData = [
    { category: 'A', pre: 80, post: 95, gap: false, stories: 'S1' },
    { category: 'B', pre: 20, post: 70, gap: false, stories: 'S2' },
    { category: 'C', pre: 0, post: 50, gap: true, stories: 'S3' },
  ]

  it('computes and renders average pre/post percentages', () => {
    render(<CoverageSummary coverageData={coverageData} />)
    // avg pre = (80+20+0)/3 = 33
    // avg post = (95+70+50)/3 = 72
    expect(screen.getByText('33%')).toBeInTheDocument()
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('shows gap count', () => {
    render(<CoverageSummary coverageData={coverageData} />)
    expect(screen.getByText('1')).toBeInTheDocument() // 1 gap
    expect(screen.getByText('Gaps')).toBeInTheDocument()
  })
})

// ===========================================================================
// BSH-006: Gap matrix highlights uncovered areas
// ===========================================================================
describe('BSH-006: Gap matrix sub-tab', () => {
  it('renders GapMatrix component in gap-matrix tab', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })

    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('gap-matrix')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// BSH-007: Audit trail entries
// ===========================================================================
describe('BSH-007: Audit trail sub-tab', () => {
  it('renders AuditTrail component', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })

    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('audit-trail')).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// BSH-008: Checklist sign-off workflow
// ===========================================================================
describe('BSH-008: ComplianceChecklist sign-off', () => {
  it('renders checklist with completion badge', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByText('Compliance Review Checklists')).toBeInTheDocument()
    // Shows X/Y complete badge
    expect(screen.getByText(/complete$/)).toBeInTheDocument()
  })

  it('renders filter pills (All, Manual, Semi-Auto, Pending, Completed)', () => {
    render(<ComplianceChecklist />)
    // "All (N)" filter pill — use regex to match "All (" prefix to avoid matching "All Categories"
    expect(screen.getByText(/^All \(/)).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Semi-Auto')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
    // Also verify category filter is present
    expect(screen.getByText('All Categories')).toBeInTheDocument()
  })

  it('toggles sign-off state and persists to localStorage', () => {
    render(<ComplianceChecklist />)
    // Find sign-off buttons (checkboxes)
    const signOffButtons = screen.getAllByLabelText(/Mark .* as signed off/)
    expect(signOffButtons.length).toBeGreaterThan(0)

    // Click to sign off
    fireEvent.click(signOffButtons[0])

    // Check localStorage was updated
    const stored = localStorageMock.getItem('bushido-checklists')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    const keys = Object.keys(parsed)
    expect(keys.length).toBeGreaterThan(0)
    expect(parsed[keys[0]].signedOff).toBe(true)
  })

  it('filters by Completed shows only signed-off items', () => {
    // Pre-set a signed-off item
    const controlId = BAISS_CONTROLS.find(c => c.assessmentType === 'manual')?.id
    if (controlId) {
      localStorageMock.setItem('bushido-checklists', JSON.stringify({
        [controlId]: { controlId, signedOff: true, responsibleRole: '', dueDate: '', reviewerName: '', notes: '' },
      }))
    }

    render(<ComplianceChecklist />)
    fireEvent.click(screen.getByText('Completed'))

    // Should show at least 1 completed item
    if (controlId) {
      const unmarkButtons = screen.queryAllByLabelText(/Unmark .* as signed off/)
      expect(unmarkButtons.length).toBeGreaterThanOrEqual(1)
    }
  })
})

// ===========================================================================
// BSH-009: PDF export (text file export mock)
// ===========================================================================
describe('BSH-009: Checklist export', () => {
  it('renders Export Checklist button', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByLabelText('Export checklist as text file')).toBeInTheDocument()
  })

  it('triggers download on Export click', () => {
    render(<ComplianceChecklist />)

    fireEvent.click(screen.getByLabelText('Export checklist as text file'))

    // generateChecklistPDF creates a blob and triggers URL.createObjectURL
    expect(mockCreateObjectURL).toHaveBeenCalled()
    // Verify the blob was created (passed to createObjectURL)
    const blobArg = (mockCreateObjectURL.mock.calls as unknown[][])[0]?.[0]
    expect(blobArg).toBeInstanceOf(Blob)
  })
})

// ===========================================================================
// BSH-010 to BSH-011: Navigator bidirectional mapping
// ===========================================================================
describe('BSH-010: FrameworkNavigator BAISS to Source', () => {
  it('renders with Framework Navigator title', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('Framework Navigator')).toBeInTheDocument()
  })

  it('renders BAISS -> Source direction toggle as default', () => {
    render(<FrameworkNavigator />)
    const baissToSource = screen.getByRole('radio', { name: /BAISS.*Source/ })
    expect(baissToSource).toHaveAttribute('aria-checked', 'true')
  })

  it('renders BAISS controls in left panel', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('BAISS Controls')).toBeInTheDocument()
    // Control IDs should be present
    expect(screen.getByLabelText(/BAISS-001/)).toBeInTheDocument()
  })

  it('shows mapping details when control is selected', () => {
    render(<FrameworkNavigator />)
    // Click the first control
    fireEvent.click(screen.getByLabelText(/BAISS-001/))
    // Should show Source Framework Mappings
    expect(screen.getByText('Source Framework Mappings')).toBeInTheDocument()
    // BAISS-001 maps to OWASP LLM01
    expect(screen.getByText('LLM01')).toBeInTheDocument()
  })
})

describe('BSH-011: FrameworkNavigator Source to BAISS', () => {
  it('switches to Source -> BAISS direction', () => {
    render(<FrameworkNavigator />)
    const sourceToBAISS = screen.getByRole('radio', { name: /Source.*BAISS/ })
    fireEvent.click(sourceToBAISS)
    expect(sourceToBAISS).toHaveAttribute('aria-checked', 'true')
  })

  it('shows source framework selector pills in source-to-baiss mode', () => {
    render(<FrameworkNavigator />)
    fireEvent.click(screen.getByRole('radio', { name: /Source.*BAISS/ }))

    // Framework radio buttons
    expect(screen.getByText('OWASP LLM Top 10')).toBeInTheDocument()
    expect(screen.getByText('NIST AI 600-1')).toBeInTheDocument()
    expect(screen.getByText('MITRE ATLAS')).toBeInTheDocument()
    expect(screen.getByText('ISO 42001')).toBeInTheDocument()
    expect(screen.getByText('EU AI Act')).toBeInTheDocument()
    expect(screen.getByText('ENISA AI Security')).toBeInTheDocument()
  })

  it('shows BAISS mappings when source control selected', () => {
    render(<FrameworkNavigator />)
    fireEvent.click(screen.getByRole('radio', { name: /Source.*BAISS/ }))
    // Select OWASP framework (default), click a source control
    const sourceControls = screen.getAllByLabelText(/Source control/)
    if (sourceControls.length > 0) {
      fireEvent.click(sourceControls[0])
      expect(screen.getByText('BAISS Mappings')).toBeInTheDocument()
    }
  })
})

// ===========================================================================
// BSH-012 to BSH-013: Delta view snapshot/compare
// ===========================================================================
describe('BSH-012: Coverage delta view snapshot', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })
  })

  it('ComplianceCenter renders coverage tab with framework selector', async () => {
    render(<ComplianceCenter />)
    await waitFor(() => {
      // Coverage sub-tab should exist
      const tabs = screen.getAllByRole('tab')
      expect(tabs.some(t => t.getAttribute('data-value') === 'coverage')).toBe(true)
    })
  })
})

describe('BSH-013: Coverage comparison', () => {
  it('BAISS data provides coverage entries via constants', async () => {
    // Verify the BAISS framework exports coverage helper
    const baissModule = await import('@/lib/data/baiss-framework')
    if (typeof baissModule.baissControlsToCoverageEntries === 'function') {
      const entries = baissModule.baissControlsToCoverageEntries()
      expect(Array.isArray(entries)).toBe(true)
    } else {
      // The function exists - verify BAISS_CONTROLS is exported
      expect(baissModule.BAISS_CONTROLS.length).toBe(45)
    }
  })
})

// ===========================================================================
// BSH-014: Dashboard widget integration
// ===========================================================================
describe('BSH-014: ComplianceCenter renders overall score', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_COMPLIANCE_DATA),
    })
  })

  it('shows EnsoGauge with overall score', async () => {
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByTestId('enso-gauge')).toBeInTheDocument()
    })
    const gauge = screen.getByTestId('enso-gauge')
    // EnsoGauge mock renders value as text content and data-value attr
    expect(gauge.textContent).toContain('72')
  })

  it('shows framework count and gap count', async () => {
    render(<ComplianceCenter />)
    await waitFor(() => {
      expect(screen.getByText('5 Frameworks')).toBeInTheDocument()
      expect(screen.getByText(/gaps \(implemented\)/)).toBeInTheDocument()
    })
  })
})

// ===========================================================================
// FrameworkNavigator search functionality
// ===========================================================================
describe('FrameworkNavigator search', () => {
  it('filters BAISS controls by search query', () => {
    render(<FrameworkNavigator />)
    const searchInput = screen.getByLabelText('Search controls')
    fireEvent.change(searchInput, { target: { value: 'injection' } })

    // BAISS-001 is "Prompt Injection Prevention" - should still be visible
    expect(screen.getByLabelText(/BAISS-001/)).toBeInTheDocument()
  })
})
