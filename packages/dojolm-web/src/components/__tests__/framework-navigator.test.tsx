/**
 * File: framework-navigator.test.tsx
 * Purpose: Tests for FrameworkNavigator component
 * Test IDs: FN-001 to FN-012
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
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children, className }: { children: ReactNode; className?: string }) => <h3 className={className}>{children}</h3>,
}))

// Mock BAISS framework data with mapped frameworks
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
        iso: [],
        euAi: [],
        enisa: [],
      },
    },
    {
      id: 'BAISS-002',
      title: 'Data Poisoning Detection',
      description: 'Detect training data poisoning',
      category: 'data',
      assessmentType: 'semi-automated',
      mappedFrameworks: {
        owasp: ['LLM03'],
        nist: [],
        mitre: ['AML.T002'],
        iso: ['ISO-42001-A.1'],
        euAi: [],
        enisa: [],
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

import { FrameworkNavigator } from '../compliance/FrameworkNavigator'

// ===========================================================================
// FN-001: Renders title
// ===========================================================================
describe('FN-001: Renders title', () => {
  it('shows Framework Navigator header', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('Framework Navigator')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-002: Direction toggle renders
// ===========================================================================
describe('FN-002: Direction toggle renders', () => {
  it('shows BAISS to Source and Source to BAISS radio buttons', () => {
    render(<FrameworkNavigator />)
    const baissToSource = screen.getByRole('radio', { name: /BAISS.*Source/ })
    const sourceToBaiss = screen.getByRole('radio', { name: /Source.*BAISS/ })
    expect(baissToSource).toBeInTheDocument()
    expect(sourceToBaiss).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-003: Default direction is BAISS to Source
// ===========================================================================
describe('FN-003: Default direction', () => {
  it('defaults to BAISS to Source direction', () => {
    render(<FrameworkNavigator />)
    const baissToSource = screen.getByRole('radio', { name: /BAISS.*Source/ })
    expect(baissToSource).toHaveAttribute('aria-checked', 'true')
  })
})

// ===========================================================================
// FN-004: Search input renders
// ===========================================================================
describe('FN-004: Search input renders', () => {
  it('shows search input with correct placeholder', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByLabelText('Search controls')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search BAISS controls...')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-005: BAISS controls list renders
// ===========================================================================
describe('FN-005: BAISS controls list renders', () => {
  it('shows BAISS Controls heading and control items', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('BAISS Controls')).toBeInTheDocument()
    expect(screen.getByText('BAISS-001')).toBeInTheDocument()
    expect(screen.getByText('BAISS-002')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-006: Empty detail panel prompt
// ===========================================================================
describe('FN-006: Empty detail panel prompt', () => {
  it('shows selection prompt when no control selected', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('Select a control to see its framework mappings')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-007: Control selection shows mappings
// ===========================================================================
describe('FN-007: Control selection shows mappings', () => {
  it('shows framework mappings when BAISS control is selected', () => {
    render(<FrameworkNavigator />)
    const baiss001Button = screen.getByLabelText('BAISS-001: Prompt Injection Prevention')
    fireEvent.click(baiss001Button)
    // Should show mapped frameworks
    expect(screen.getByText('OWASP LLM Top 10')).toBeInTheDocument()
    expect(screen.getByText('LLM01')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-008: Search filters controls
// ===========================================================================
describe('FN-008: Search filters controls', () => {
  it('filters BAISS controls by search query', () => {
    render(<FrameworkNavigator />)
    const searchInput = screen.getByLabelText('Search controls')
    fireEvent.change(searchInput, { target: { value: 'Poisoning' } })
    expect(screen.queryByText('BAISS-001')).not.toBeInTheDocument()
    expect(screen.getByText('BAISS-002')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-009: Direction toggle switches view
// ===========================================================================
describe('FN-009: Direction toggle switches view', () => {
  it('switches to Source to BAISS mode when toggled', () => {
    render(<FrameworkNavigator />)
    const sourceToBaiss = screen.getByRole('radio', { name: /Source.*BAISS/ })
    fireEvent.click(sourceToBaiss)
    expect(sourceToBaiss).toHaveAttribute('aria-checked', 'true')
    // Should show framework tier selectors
    expect(screen.getByText('Implemented')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-010: Source to BAISS shows framework pills
// ===========================================================================
describe('FN-010: Source to BAISS shows framework pills', () => {
  it('shows framework selector pills in source-to-baiss mode', () => {
    render(<FrameworkNavigator />)
    fireEvent.click(screen.getByRole('radio', { name: /Source.*BAISS/ }))
    expect(screen.getByText('OWASP LLM Top 10')).toBeInTheDocument()
    expect(screen.getByText('NIST AI 600-1')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-011: Search placeholder changes with direction
// ===========================================================================
describe('FN-011: Search placeholder changes with direction', () => {
  it('updates search placeholder for source-to-baiss mode', () => {
    render(<FrameworkNavigator />)
    fireEvent.click(screen.getByRole('radio', { name: /Source.*BAISS/ }))
    expect(screen.getByPlaceholderText('Search source control IDs...')).toBeInTheDocument()
  })
})

// ===========================================================================
// FN-012: Column headings change with direction
// ===========================================================================
describe('FN-012: Column headings change with direction', () => {
  it('shows Source Framework Mappings on right panel in BAISS to Source', () => {
    render(<FrameworkNavigator />)
    expect(screen.getByText('Source Framework Mappings')).toBeInTheDocument()
  })

  it('shows BAISS Mappings on right panel in Source to BAISS', () => {
    render(<FrameworkNavigator />)
    fireEvent.click(screen.getByRole('radio', { name: /Source.*BAISS/ }))
    expect(screen.getByText('BAISS Mappings')).toBeInTheDocument()
  })
})
