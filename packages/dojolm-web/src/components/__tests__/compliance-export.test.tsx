/**
 * File: compliance-export.test.tsx
 * Purpose: Unit tests for ComplianceExport component
 * Test IDs: CE-001 to CE-007
 * Story: 5.3.2 — type fix (status: 'covered'|'partial'|'gap'), UI rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange?: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

vi.mock('lucide-react', () => ({
  Download: () => <svg data-testid="download-icon" />,
}))

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------

import { ComplianceExport } from '@/components/compliance/ComplianceExport'
import type { ComplianceFrameworkExport, ComplianceControl } from '@/components/compliance/ComplianceExport'

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const makeControl = (overrides: Partial<ComplianceControl> = {}): ComplianceControl => ({
  id: 'LLM01',
  name: 'Prompt Injection',
  status: 'covered',
  coverage: 85,
  ...overrides,
})

const frameworkData: ComplianceFrameworkExport = {
  id: 'owasp-llm',
  name: 'OWASP LLM Top 10',
  overallCoverage: 78,
  controls: [
    makeControl({ id: 'LLM01', status: 'covered', coverage: 85 }),
    makeControl({ id: 'LLM02', name: 'Insecure Output Handling', status: 'partial', coverage: 60 }),
    makeControl({ id: 'LLM03', name: 'Training Data Poisoning', status: 'gap', coverage: 10 }),
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ComplianceExport (CE-001 to CE-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CE-001: renders without crashing when frameworkData is provided', () => {
    const { container } = render(<ComplianceExport frameworkData={frameworkData} />)
    expect(container).toBeTruthy()
  })

  it('CE-002: renders nothing when frameworkData is null', () => {
    const { container } = render(<ComplianceExport frameworkData={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('CE-003: export button is enabled when frameworkData is provided', () => {
    render(<ComplianceExport frameworkData={frameworkData} />)
    const btn = screen.getByTestId('button')
    expect(btn).not.toBeDisabled()
  })

  it('CE-004: ComplianceControl type accepts only covered | partial | gap', () => {
    // TypeScript compile-time test — verify all three literal values are valid at runtime
    const controls: ComplianceControl[] = [
      makeControl({ status: 'covered' }),
      makeControl({ status: 'partial' }),
      makeControl({ status: 'gap' }),
    ]
    expect(controls.map(c => c.status)).toEqual(['covered', 'partial', 'gap'])
  })

  it('CE-005: format selector is rendered', () => {
    render(<ComplianceExport frameworkData={frameworkData} />)
    expect(screen.getByTestId('select')).toBeInTheDocument()
  })

  it('CE-006: shows Markdown, JSON, and CSV format options', () => {
    render(<ComplianceExport frameworkData={frameworkData} />)
    expect(screen.getByText('Markdown')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('CSV')).toBeInTheDocument()
  })

  it('CE-007: export button is present with download icon', () => {
    render(<ComplianceExport frameworkData={frameworkData} />)
    expect(screen.getByTestId('download-icon')).toBeInTheDocument()
    expect(screen.getByTestId('button')).toBeInTheDocument()
  })
})
