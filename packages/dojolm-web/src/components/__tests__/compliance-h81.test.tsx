/**
 * File: compliance-h81.test.tsx
 * Purpose: Tests for H8.1 — Framework Coverage Categorization
 * Verifies: tier/category toggle, correct grouping in sidebar and overview
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

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title }: { title: string }) => (
    <div data-testid="module-header"><h1>{title}</h1></div>
  ),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3></div>
  ),
}))

vi.mock('@/components/ui/EnsoGauge', () => ({
  EnsoGauge: ({ value }: { value: number }) => <div data-testid="enso-gauge">{value}</div>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
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
}))

// H8.3: ComplianceCenter now uses useNavigation and Button
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ activeTab: 'compliance', setActiveTab: vi.fn() }),
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => <button {...props}>{children}</button>,
}))

vi.mock('../compliance/GapMatrix', () => ({
  GapMatrix: () => <div data-testid="gap-matrix">Gap Matrix</div>,
}))
vi.mock('../compliance/AuditTrail', () => ({
  AuditTrail: () => <div data-testid="audit-trail">Audit Trail</div>,
}))
vi.mock('../compliance/ComplianceChecklist', () => ({
  ComplianceChecklist: () => <div data-testid="checklist">Checklist</div>,
}))
vi.mock('../compliance/FrameworkNavigator', () => ({
  FrameworkNavigator: () => <div data-testid="navigator">Navigator</div>,
}))
vi.mock('@/components/coverage', () => ({
  CoverageMap: () => <div data-testid="coverage-map">Map</div>,
}))
vi.mock('@/lib/constants', () => ({
  COVERAGE_DATA: [],
  OWASP_LLM_COVERAGE_DATA: [],
}))
vi.mock('@/lib/data/baiss-framework', () => ({
  baissControlsToCoverageEntries: () => [],
  BAISS_CONTROLS: [],
  BAISS_CATEGORIES: [],
}))

// ---------------------------------------------------------------------------
// Mock data with frameworks spanning different tiers AND categories
// ---------------------------------------------------------------------------

const MOCK_DATA = {
  lastUpdated: '2026-03-10',
  summary: { avgCoverage: 70 },
  frameworks: [
    // Technical Controls (via CONTROL_CATEGORIES)
    { id: 'owasp-llm', name: 'OWASP LLM Top 10', tier: 'implemented', totalControls: 10, coveredControls: 7, partialControls: 2, gapControls: 1, overallCoverage: 70 },
    { id: 'mitre-atlas', name: 'MITRE ATLAS', tier: 'implemented', totalControls: 12, coveredControls: 9, partialControls: 2, gapControls: 1, overallCoverage: 75 },
    // Governance Controls
    { id: 'iso-42001', name: 'ISO 42001', tier: 'high', totalControls: 8, coveredControls: 6, partialControls: 1, gapControls: 1, overallCoverage: 75 },
    { id: 'eu-ai-act', name: 'EU AI Act', tier: 'high', totalControls: 10, coveredControls: 8, partialControls: 1, gapControls: 1, overallCoverage: 80 },
    // Non-Technical Controls
    { id: 'uk-dsit', name: 'UK DSIT Guidelines', tier: 'regional', totalControls: 6, coveredControls: 4, partialControls: 1, gapControls: 1, overallCoverage: 67 },
    { id: 'iso-24027', name: 'ISO 24027 Bias', tier: 'medium', totalControls: 5, coveredControls: 3, partialControls: 1, gapControls: 1, overallCoverage: 60 },
  ],
}

// ---------------------------------------------------------------------------
// Import under test (after mocks)
// ---------------------------------------------------------------------------
import ComplianceCenter from '../compliance/ComplianceCenter'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('H8.1: Framework Coverage Categorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_DATA),
    })
  })

  it('defaults to tier-based grouping with Tier toggle active', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      // The radiogroup should exist
      const radiogroup = screen.getByRole('radiogroup', { name: /group frameworks by/i })
      expect(radiogroup).toBeInTheDocument()

      // Tier radio should be checked
      const tierRadio = screen.getByRole('radio', { name: /group by tier/i })
      expect(tierRadio).toHaveAttribute('aria-checked', 'true')

      // Category radio should not be checked
      const catRadio = screen.getByRole('radio', { name: /group by category/i })
      expect(catRadio).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('shows tier-based sections (Implemented, High Priority) in default view', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      // Tier sections appear in both sidebar and overview — use getAllByText
      const implLabels = screen.getAllByText('Implemented Frameworks')
      expect(implLabels.length).toBeGreaterThanOrEqual(1)

      const highLabels = screen.getAllByText('High Priority')
      expect(highLabels.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('switches to category view when Category radio is clicked', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    // Click Category toggle
    const catRadio = screen.getByRole('radio', { name: /group by category/i })
    fireEvent.click(catRadio)

    // Should now show category labels
    expect(screen.getByRole('radio', { name: /group by category/i })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /group by tier/i })).toHaveAttribute('aria-checked', 'false')
  })

  it('displays Technical Controls, Governance Controls, Non-Technical Controls in category view', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    // Switch to category
    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))

    // Category section labels should appear in sidebar TierSections and OverviewPanel tables
    await waitFor(() => {
      const techLabels = screen.getAllByText('Technical Controls')
      expect(techLabels.length).toBeGreaterThanOrEqual(1)

      const govLabels = screen.getAllByText('Governance Controls')
      expect(govLabels.length).toBeGreaterThanOrEqual(1)

      const nonTechLabels = screen.getAllByText('Non-Technical Controls')
      expect(nonTechLabels.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('groups OWASP LLM and MITRE ATLAS under Technical Controls', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))

    await waitFor(() => {
      // The Technical Controls section should have an aria-label containing the framework count
      // Use getAllByLabelText since label appears on both sidebar button and overview table
      const techSections = screen.getAllByLabelText(/^Technical Controls: 2 frameworks/i)
      expect(techSections.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('groups ISO 42001 and EU AI Act under Governance Controls', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))

    await waitFor(() => {
      const govSection = screen.getByLabelText(/Governance Controls: 2 frameworks/i)
      expect(govSection).toBeInTheDocument()
    })
  })

  it('groups UK DSIT and ISO 24027 under Non-Technical Controls', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))

    await waitFor(() => {
      const nonTechSection = screen.getByLabelText(/Non-Technical Controls: 2 frameworks/i)
      expect(nonTechSection).toBeInTheDocument()
    })
  })

  it('can switch back to tier view after switching to category', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    // Switch to category
    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))
    // Tier labels should be gone from sidebar (overview panel now shows category too)
    expect(screen.queryByText('Implemented Frameworks')).not.toBeInTheDocument()

    // Switch back to tier
    fireEvent.click(screen.getByRole('radio', { name: /group by tier/i }))
    expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
  })

  it('overview panel table uses category grouping when category mode is active', async () => {
    render(<ComplianceCenter />)

    await waitFor(() => {
      expect(screen.getAllByText('Implemented Frameworks').length).toBeGreaterThanOrEqual(1)
    })

    fireEvent.click(screen.getByRole('radio', { name: /group by category/i }))

    await waitFor(() => {
      // Overview panel should have tables with category aria-labels
      const techTable = screen.getByLabelText('Technical Controls compliance summary')
      expect(techTable).toBeInTheDocument()

      const govTable = screen.getByLabelText('Governance Controls compliance summary')
      expect(govTable).toBeInTheDocument()

      const nonTechTable = screen.getByLabelText('Non-Technical Controls compliance summary')
      expect(nonTechTable).toBeInTheDocument()
    })
  })
})
