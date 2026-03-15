/**
 * File: compliance-checklist.test.tsx
 * Purpose: Tests for ComplianceChecklist component
 * Test IDs: CLC-001 to CLC-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: { children: ReactNode; className?: string }) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardHeader: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

// Mock BAISS framework data
vi.mock('@/lib/data/baiss-framework', () => ({
  BAISS_CONTROLS: [
    {
      id: 'BAISS-GOV-001',
      title: 'AI Governance Policy',
      description: 'Establish AI governance policy',
      category: 'governance',
      assessmentType: 'manual',
      mappedFrameworks: {},
    },
    {
      id: 'BAISS-GOV-002',
      title: 'Risk Assessment',
      description: 'Conduct risk assessment',
      category: 'governance',
      assessmentType: 'semi-automated',
      mappedFrameworks: {},
    },
    {
      id: 'BAISS-SEC-001',
      title: 'Input Validation',
      description: 'Validate all inputs',
      category: 'security',
      assessmentType: 'automated',
      mappedFrameworks: {},
    },
    {
      id: 'BAISS-SEC-002',
      title: 'Access Control Review',
      description: 'Review access controls',
      category: 'security',
      assessmentType: 'manual',
      mappedFrameworks: {},
    },
  ],
  BAISS_CATEGORIES: [
    { id: 'governance', label: 'Governance' },
    { id: 'security', label: 'Security' },
  ],
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

beforeEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { ComplianceChecklist } from '../compliance/ComplianceChecklist'

// ===========================================================================
// CLC-001: Renders title and summary
// ===========================================================================
describe('CLC-001: Renders title and summary', () => {
  it('shows Compliance Review Checklists title', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByText('Compliance Review Checklists')).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-002: Shows completion count
// ===========================================================================
describe('CLC-002: Shows completion count', () => {
  it('displays 0/N complete initially', () => {
    render(<ComplianceChecklist />)
    // 3 non-automated controls (GOV-001 manual, GOV-002 semi-auto, SEC-002 manual)
    expect(screen.getByText('0/3 complete')).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-003: Filter pills render
// ===========================================================================
describe('CLC-003: Filter pills render', () => {
  it('renders all filter options', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByText('All (3)')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Semi-Auto')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-004: Filter by Manual
// ===========================================================================
describe('CLC-004: Filter by Manual', () => {
  it('filters to show only manual controls when Manual filter is pressed', () => {
    render(<ComplianceChecklist />)
    fireEvent.click(screen.getByText('Manual'))
    // Should show GOV-001 and SEC-002 (manual), not GOV-002 (semi-automated)
    expect(screen.getByText(/BAISS-GOV-001/)).toBeInTheDocument()
    expect(screen.getByText(/BAISS-SEC-002/)).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-005: Category filter
// ===========================================================================
describe('CLC-005: Category filter', () => {
  it('renders All Categories button and category filter chips', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByText('All Categories')).toBeInTheDocument()
    expect(screen.getAllByText('Governance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Security').length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// CLC-006: Category filter click
// ===========================================================================
describe('CLC-006: Category filter filters controls', () => {
  it('filters by category when category chip is clicked', () => {
    render(<ComplianceChecklist />)
    // Click Security category
    const securityButtons = screen.getAllByText('Security')
    // The first "Security" is the category filter chip
    fireEvent.click(securityButtons[0])
    // Should show only security controls
    expect(screen.getByText(/BAISS-SEC-002/)).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-007: Export button renders
// ===========================================================================
describe('CLC-007: Export button renders', () => {
  it('shows Export Checklist button', () => {
    render(<ComplianceChecklist />)
    expect(screen.getByText('Export Checklist')).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-008: Category section collapsible
// ===========================================================================
describe('CLC-008: Category section collapsible', () => {
  it('collapses category section when header clicked', () => {
    render(<ComplianceChecklist />)
    const govHeader = screen.getByRole('button', { name: /Governance.*0\/\d/ })
    expect(govHeader).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(govHeader)
    expect(govHeader).toHaveAttribute('aria-expanded', 'false')
  })
})

// ===========================================================================
// CLC-009: Checklist item row renders input fields
// ===========================================================================
describe('CLC-009: Checklist item row renders input fields', () => {
  it('renders responsible role, due date, reviewer, and notes fields', () => {
    render(<ComplianceChecklist />)
    // Should have inputs for each non-automated control
    const roleInputs = screen.getAllByLabelText(/Responsible role for/)
    expect(roleInputs.length).toBeGreaterThan(0)
    const dateInputs = screen.getAllByLabelText(/Due date for/)
    expect(dateInputs.length).toBeGreaterThan(0)
    const reviewerInputs = screen.getAllByLabelText(/Reviewer name for/)
    expect(reviewerInputs.length).toBeGreaterThan(0)
    const notesInputs = screen.getAllByLabelText(/Notes for/)
    expect(notesInputs.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// CLC-010: Sign-off toggle
// ===========================================================================
describe('CLC-010: Sign-off toggle', () => {
  it('has sign-off button for each control', () => {
    render(<ComplianceChecklist />)
    const signoffButtons = screen.getAllByLabelText(/Mark .* as signed off/)
    expect(signoffButtons.length).toBe(3) // 3 non-automated controls
  })
})

// ===========================================================================
// CLC-011: Empty state when no matches
// ===========================================================================
describe('CLC-011: Empty state when no matches', () => {
  it('shows empty state when filter yields no results', () => {
    render(<ComplianceChecklist />)
    // Click Completed filter (nothing completed yet)
    fireEvent.click(screen.getByText('Completed'))
    expect(screen.getByText('No controls match the current filter.')).toBeInTheDocument()
  })
})

// ===========================================================================
// CLC-012: Assessment type badge renders
// ===========================================================================
describe('CLC-012: Assessment type badge renders', () => {
  it('shows assessment type badges on control rows', () => {
    render(<ComplianceChecklist />)
    const manualBadges = screen.getAllByText('manual')
    expect(manualBadges.length).toBeGreaterThan(0)
  })
})
