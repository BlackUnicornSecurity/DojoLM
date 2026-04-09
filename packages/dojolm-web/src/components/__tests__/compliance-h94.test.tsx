/**
 * File: compliance-h94.test.tsx
 * Purpose: Tests for H9.4 — Bushido Book Compliance Scan tab
 * Test IDs: H94-001 to H94-006
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
}))

const mockFetchWithAuth = vi.fn()
vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

vi.mock('@/components/ui/ModuleHeader', () => ({
  ModuleHeader: ({ title }: { title: string }) => <div data-testid="module-header">{title}</div>,
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state"><h3>{title}</h3><p>{description}</p></div>
  ),
}))

vi.mock('@/components/ui/EnsoGauge', () => ({
  EnsoGauge: ({ value }: { value: number }) => <div data-testid="enso-gauge">{value}</div>,
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid={`tabs-${value}`} data-value={value} data-onvaluechange={onValueChange ? 'yes' : 'no'}>
      {children}
      {/* Expose onValueChange for tests to call */}
      {onValueChange && (
        <button data-testid="tab-switch-trigger" onClick={() => onValueChange('compliance-scan')} />
      )}
    </div>
  ),
  TabsList: ({ children, ...rest }: { children: ReactNode; [k: string]: unknown }) => (
    <div data-testid="tabs-list" role="tablist" {...rest}>{children}</div>
  ),
  TabsTrigger: ({ children, value, ...rest }: { children: ReactNode; value: string; [k: string]: unknown }) => (
    <button role="tab" data-testid={`tab-trigger-${value}`} data-value={value} {...rest}>{children}</button>
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
  Button: ({ children, onClick, ...rest }: { children: ReactNode; onClick?: () => void; [k: string]: unknown }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))

// Mock sub-components that are loaded by ComplianceCenter
vi.mock('../compliance/GapMatrix', () => ({
  GapMatrix: () => <div data-testid="gap-matrix">Gap Matrix</div>,
}))
vi.mock('../compliance/AuditTrail', () => ({
  AuditTrail: () => <div data-testid="audit-trail">Audit Trail</div>,
}))
vi.mock('../compliance/ComplianceChecklist', () => ({
  ComplianceChecklist: () => <div data-testid="checklists">Checklists</div>,
}))
vi.mock('../compliance/FrameworkNavigator', () => ({
  FrameworkNavigator: () => <div data-testid="navigator">Navigator</div>,
}))
vi.mock('@/components/coverage', () => ({
  CoverageMap: () => <div data-testid="coverage-map">Coverage Map</div>,
}))
vi.mock('@/lib/constants', () => ({
  COVERAGE_DATA: [],
  OWASP_LLM_COVERAGE_DATA: [],
}))
vi.mock('@/lib/data/baiss-framework', () => ({
  baissControlsToCoverageEntries: () => [],
}))

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_CONTROLS = [
  { id: 'LLM01', name: 'Prompt Injection', status: 'covered', coverage: 92 },
  { id: 'LLM02', name: 'Insecure Output', status: 'partial', coverage: 65 },
  { id: 'LLM03', name: 'Training Data Poisoning', status: 'gap', coverage: 20 },
  { id: 'LLM04', name: 'Model Denial of Service', status: 'covered', coverage: 88 },
  { id: 'LLM05', name: 'Supply Chain', status: 'partial', coverage: 55 },
]

const MOCK_FRAMEWORKS = [
  {
    id: 'owasp-llm',
    name: 'OWASP LLM Top 10',
    overallCoverage: 72,
    totalControls: 5,
    coveredControls: 2,
    gapControls: 1,
    partialControls: 2,
    lastAssessed: '2026-03-10',
    tier: 'implemented',
    controls: MOCK_CONTROLS,
  },
  {
    id: 'nist-ai-600-1',
    name: 'NIST AI 600-1',
    overallCoverage: 60,
    totalControls: 3,
    coveredControls: 1,
    gapControls: 1,
    partialControls: 1,
    lastAssessed: '2026-03-08',
    tier: 'high',
    controls: [
      { id: 'NIST-01', name: 'Risk Management', status: 'covered', coverage: 85 },
      { id: 'NIST-02', name: 'Governance', status: 'partial', coverage: 55 },
      { id: 'NIST-03', name: 'Monitoring', status: 'gap', coverage: 30 },
    ],
  },
]

const MOCK_API_RESPONSE = {
  frameworks: MOCK_FRAMEWORKS,
  summary: { avgCoverage: 66 },
  lastUpdated: '2026-03-10T12:00:00Z',
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function renderComplianceCenter() {
  mockFetchWithAuth.mockResolvedValueOnce({
    ok: true,
    json: async () => MOCK_API_RESPONSE,
  })

  const { default: ComplianceCenter } = await import('../compliance/ComplianceCenter')
  const result = render(<ComplianceCenter />)

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading compliance data...')).not.toBeInTheDocument()
  })

  return result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('H9.4: Bushido Book Framework Compliance Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('H94-001: renders ComplianceScanPanel under the Evidence tab (PR-4b.7)', async () => {
    // Train 2 PR-4b.7 (2026-04-09): Bushido Book tabs collapsed from 8 → 4.
    // The legacy "Framework Compliance" tab trigger no longer exists as a
    // top-level tab — ComplianceScanPanel is now rendered inside the
    // "Evidence" parent tab (which is the default active tab). H94-002..006
    // continue to validate the panel body via its testId.
    await renderComplianceCenter()
    // ComplianceScanPanel now renders inside the Evidence parent tab (the
    // default active tab). Its presence in the DOM confirms the recomposition
    // is wired correctly; the panel body is validated by H94-002..006.
    const panel = screen.getByTestId('compliance-scan-panel')
    expect(panel).toBeInTheDocument()
    const evidenceTab = screen.getAllByRole('tab').find(
      (t) => t.getAttribute('data-value') === 'evidence'
    )
    expect(evidenceTab).toBeDefined()
  })

  it('H94-002: renders compliance scan panel with framework selector', async () => {
    await renderComplianceCenter()
    const panel = screen.getByTestId('compliance-scan-panel')
    expect(panel).toBeInTheDocument()

    const selector = screen.getByTestId('compliance-scan-fw-select')
    expect(selector).toBeInTheDocument()
    // Should have framework options
    const options = selector.querySelectorAll('option')
    expect(options.length).toBe(MOCK_FRAMEWORKS.length)
  })

  it('H94-003: switching framework updates controls table', async () => {
    await renderComplianceCenter()
    const selector = screen.getByTestId('compliance-scan-fw-select')

    // Initially shows OWASP controls
    expect(screen.getByTestId('compliance-controls-table')).toBeInTheDocument()
    expect(screen.getByTestId('control-row-LLM01')).toBeInTheDocument()

    // Switch to NIST
    fireEvent.change(selector, { target: { value: 'nist-ai-600-1' } })

    await waitFor(() => {
      expect(screen.getByTestId('control-row-NIST-01')).toBeInTheDocument()
    })
    // OWASP controls should be gone
    expect(screen.queryByTestId('control-row-LLM01')).not.toBeInTheDocument()
  })

  it('H94-004: controls display correct status badges', async () => {
    await renderComplianceCenter()

    // Check status badges by testid
    const coveredStatus = screen.getByTestId('control-status-LLM01')
    expect(coveredStatus).toHaveTextContent('Covered')

    const partialStatus = screen.getByTestId('control-status-LLM02')
    expect(partialStatus).toHaveTextContent('Partial')

    const gapStatus = screen.getByTestId('control-status-LLM03')
    expect(gapStatus).toHaveTextContent('Gap')
  })

  it('H94-005: clicking control expands drill-down with evidence', async () => {
    await renderComplianceCenter()

    // LLM01 detail should not be visible initially
    expect(screen.queryByTestId('control-detail-LLM01')).not.toBeInTheDocument()

    // Click on LLM01 row
    const row = screen.getByTestId('control-row-LLM01')
    fireEvent.click(row)

    // Detail panel should appear
    const detail = screen.getByTestId('control-detail-LLM01')
    expect(detail).toBeInTheDocument()

    // Should show mapped test modules
    expect(detail).toHaveTextContent('prompt-injection')
    expect(detail).toHaveTextContent('input-sanitization')

    // Should show evidence
    expect(detail).toHaveTextContent('PI-001 payload blocked')

    // Click again to collapse
    fireEvent.click(row)
    expect(screen.queryByTestId('control-detail-LLM01')).not.toBeInTheDocument()
  })

  it('H94-006: Run Compliance Scan button triggers navigation', async () => {
    await renderComplianceCenter()

    const scanBtn = screen.getByTestId('run-compliance-scan')
    expect(scanBtn).toBeInTheDocument()
    expect(scanBtn).toHaveTextContent('Run Compliance Scan')

    fireEvent.click(scanBtn)

    // Should set localStorage and navigate to Model Lab tab
    expect(mockSetActiveTab).toHaveBeenCalledWith('jutsu')
  })
})
