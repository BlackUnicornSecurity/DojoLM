/**
 * File: gap-matrix.test.tsx
 * Purpose: Tests for GapMatrix component
 * Test IDs: GM-001 to GM-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

// Mock BAISS framework data
vi.mock('@/lib/data/baiss-framework', () => ({
  BAISS_CONTROLS: [
    {
      id: 'BAISS-001',
      title: 'Prompt Injection Prevention',
      description: 'Prevent prompt injection attacks',
      category: 'security',
      assessmentType: 'automated',
      mappedFrameworks: {
        owasp: ['LLM01'],
        nist: ['AI-RMF-1.1'],
        mitre: ['AML.T001'],
        iso: ['A.1'],
        euAi: ['Art-6'],
        enisa: ['SEC-1'],
        nist218a: [],
        iso23894: [],
        iso24027: [],
        iso24028: [],
        saif: [],
        cisaNcsc: [],
        slsa: [],
        mlBom: [],
        openssf: [],
        nistCsf2: [],
        ukDsit: [],
        ieeeP7000: [],
        nistAi1004: [],
        euAiGpai: [],
        sgMgaf: [],
        caAia: [],
        auAie: [],
        iso27001: [],
        owaspAsvs: [],
        owaspApi: [],
        nist80053: [],
        gdpr: [],
      },
    },
    {
      id: 'BAISS-002',
      title: 'Data Poisoning Detection',
      description: 'Detect data poisoning',
      category: 'data',
      assessmentType: 'semi-automated',
      mappedFrameworks: {
        owasp: ['LLM03'],
        nist: [],
        mitre: [],
        iso: [],
        euAi: [],
        enisa: [],
        nist218a: [],
        iso23894: [],
        iso24027: [],
        iso24028: [],
        saif: [],
        cisaNcsc: [],
        slsa: [],
        mlBom: [],
        openssf: [],
        nistCsf2: [],
        ukDsit: [],
        ieeeP7000: [],
        nistAi1004: [],
        euAiGpai: [],
        sgMgaf: [],
        caAia: [],
        auAie: [],
        iso27001: [],
        owaspAsvs: [],
        owaspApi: [],
        nist80053: [],
        gdpr: [],
      },
    },
  ],
  BAISS_CATEGORIES: [
    { id: 'security', label: 'Security' },
    { id: 'data', label: 'Data' },
  ],
}))

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { GapMatrix } from '../compliance/GapMatrix'

// ===========================================================================
// GM-001: Renders title
// ===========================================================================
describe('GM-001: Renders title', () => {
  it('shows BAISS Cross-Framework Gap Matrix heading', () => {
    render(<GapMatrix />)
    expect(screen.getByText('BAISS Cross-Framework Gap Matrix')).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-002: Shows control and framework count
// ===========================================================================
describe('GM-002: Shows control and framework count', () => {
  it('displays controls x frameworks count', () => {
    render(<GapMatrix />)
    // 2 controls, 6 implemented columns by default
    expect(screen.getByText(/2 controls.*6 frameworks/)).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-003: Table renders
// ===========================================================================
describe('GM-003: Table renders', () => {
  it('renders a table with BAISS Control column header', () => {
    render(<GapMatrix />)
    expect(screen.getByText('BAISS Control')).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-004: Framework column headers render
// ===========================================================================
describe('GM-004: Framework column headers render', () => {
  it('shows implemented framework short labels in table header', () => {
    render(<GapMatrix />)
    expect(screen.getByText('OWASP')).toBeInTheDocument()
    expect(screen.getByText('NIST')).toBeInTheDocument()
    expect(screen.getByText('MITRE')).toBeInTheDocument()
    expect(screen.getByText('ISO')).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-005: Control rows render
// ===========================================================================
describe('GM-005: Control rows render', () => {
  it('renders control IDs and titles in table rows', () => {
    render(<GapMatrix />)
    expect(screen.getByText('BAISS-001')).toBeInTheDocument()
    expect(screen.getByText('BAISS-002')).toBeInTheDocument()
    expect(screen.getByText('Prompt Injection Prevention')).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-006: Category header rows
// ===========================================================================
describe('GM-006: Category header rows', () => {
  it('renders category group header rows', () => {
    render(<GapMatrix />)
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-007: Status dots for mappings
// ===========================================================================
describe('GM-007: Status dots for mappings', () => {
  it('renders mapped and unmapped status indicators', () => {
    render(<GapMatrix />)
    // BAISS-001 has all 6 implemented frameworks mapped
    const mappedLabels = screen.getAllByLabelText(/Mapped:/)
    expect(mappedLabels.length).toBeGreaterThan(0)
    // Some should have no mapping
    const unmappedLabels = screen.getAllByLabelText('No mapping')
    expect(unmappedLabels.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// GM-008: Coverage summary row
// ===========================================================================
describe('GM-008: Coverage summary row', () => {
  it('renders Coverage row with percentage stats', () => {
    render(<GapMatrix />)
    expect(screen.getByText(/Coverage \(2 controls\)/)).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-009: Show All toggle
// ===========================================================================
describe('GM-009: Show All toggle', () => {
  it('has a Show All button that expands to all framework columns', () => {
    render(<GapMatrix />)
    const showAllBtn = screen.getByRole('button', { name: /Show All/i })
    expect(showAllBtn).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(showAllBtn)
    expect(showAllBtn).toHaveAttribute('aria-pressed', 'true')
    // After clicking, should show more columns - count increases
    expect(screen.getByText(/2 controls.*\d+ frameworks/)).toBeInTheDocument()
  })
})

// ===========================================================================
// GM-010: Column picker toggle
// ===========================================================================
describe('GM-010: Column picker toggle', () => {
  it('toggles column picker panel with Columns button', () => {
    render(<GapMatrix />)
    const columnsBtn = screen.getByRole('button', { name: /Columns/i })
    expect(columnsBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(columnsBtn)
    expect(columnsBtn).toHaveAttribute('aria-expanded', 'true')
    // Should show tier group labels
    expect(screen.getAllByText('Implemented').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// GM-011: Column picker checkboxes
// ===========================================================================
describe('GM-011: Column picker checkboxes', () => {
  it('renders checkboxes for framework columns in picker', () => {
    render(<GapMatrix />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
    // First 6 (implemented) should be checked
    const owaspCheckbox = checkboxes.find(
      (cb) => cb.closest('label')?.textContent?.includes('OWASP LLM Top 10')
    )
    expect(owaspCheckbox).toBeChecked()
  })
})

// ===========================================================================
// GM-012: Table has aria-label
// ===========================================================================
describe('GM-012: Table has aria-label', () => {
  it('renders table with accessible label', () => {
    render(<GapMatrix />)
    expect(screen.getByRole('table', { name: 'BAISS cross-framework gap matrix' })).toBeInTheDocument()
  })
})
