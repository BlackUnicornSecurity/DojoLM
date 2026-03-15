/**
 * File: fixture-search.test.tsx
 * Purpose: Unit tests for FixtureSearch component
 * Test IDs: FS-001 to FS-012
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className, 'aria-label': ariaLabel, ...props }: {
    value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; 'aria-label'?: string; [k: string]: unknown
  }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} aria-label={ariaLabel} data-testid="search-input" {...props} />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, 'aria-expanded': expanded, ...props }: {
    children: React.ReactNode; onClick?: () => void; 'aria-label'?: string; 'aria-expanded'?: boolean; [k: string]: unknown
  }) => (
    <button onClick={onClick} aria-label={ariaLabel} aria-expanded={expanded}>{children}</button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: { children: React.ReactNode; value: string; onValueChange: (v: string) => void }) => (
    <div data-testid="select" data-value={value}>{children}</div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
  SelectTrigger: ({ children, 'aria-label': ariaLabel }: { children: React.ReactNode; 'aria-label'?: string }) => (
    <div aria-label={ariaLabel}>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

vi.mock('../fixtures/brand-colors', () => ({
  BRAND_COLORS: {
    DojoLM: '#D43A2C',
    BonkLM: '#D4A843',
    Basileak: '#8B7BF5',
    PantheonLM: '#34C76A',
    Marfaak: '#E060A0',
    BlackUnicorn: '#565D6B',
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { FixtureSearch } from '../fixtures/FixtureSearch'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockCategories = {
  web: {
    story: 'S1',
    desc: 'Web attacks',
    files: [
      { file: 'xss-basic.txt', attack: 'XSS', severity: 'CRITICAL' as const, clean: false },
      { file: 'clean-input.txt', attack: null, severity: null, clean: true },
    ],
  },
  social: {
    story: 'S2',
    desc: 'Social attacks',
    files: [
      { file: 'phishing.txt', attack: 'Phishing', severity: 'WARNING' as const, clean: false },
    ],
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FixtureSearch', () => {
  const onSelectFixture = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('FS-001: renders search input', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getByLabelText('Search fixtures by name, category, or attack type')).toBeInTheDocument()
  })

  it('FS-002: renders result count', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('FS-003: renders all fixture items in the results list', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getByText('xss-basic.txt')).toBeInTheDocument()
    expect(screen.getByText('clean-input.txt')).toBeInTheDocument()
    expect(screen.getByText('phishing.txt')).toBeInTheDocument()
  })

  it('FS-004: calls onSelectFixture when a result is clicked', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    fireEvent.click(screen.getByText('xss-basic.txt').closest('[role="listitem"]')!)
    expect(onSelectFixture).toHaveBeenCalledWith('web', 'xss-basic.txt')
  })

  it('FS-005: calls onSelectFixture on Enter keypress', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    const item = screen.getByText('phishing.txt').closest('[role="listitem"]')!
    fireEvent.keyDown(item, { key: 'Enter' })
    expect(onSelectFixture).toHaveBeenCalledWith('social', 'phishing.txt')
  })

  it('FS-006: filters results after debounced search', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'xss' } })
    act(() => { vi.advanceTimersByTime(350) })
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(screen.getByText('xss-basic.txt')).toBeInTheDocument()
  })

  it('FS-007: shows no results message when nothing matches', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'nonexistent' } })
    act(() => { vi.advanceTimersByTime(350) })
    expect(screen.getByText('No fixtures match your search criteria')).toBeInTheDocument()
  })

  it('FS-008: renders Filters toggle button', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getByLabelText('Show filters')).toBeInTheDocument()
  })

  it('FS-009: shows filter dropdowns when Filters button is clicked', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    fireEvent.click(screen.getByLabelText('Show filters'))
    expect(screen.getByLabelText('Filter by severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by brand')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by type')).toBeInTheDocument()
  })

  it('FS-010: renders category label in results', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getAllByText('web').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('social').length).toBeGreaterThanOrEqual(1)
  })

  it('FS-011: renders severity badge for attack fixtures', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
    expect(screen.getByText('WARNING')).toBeInTheDocument()
  })

  it('FS-012: renders clear search button when query is present', () => {
    render(<FixtureSearch categories={mockCategories} onSelectFixture={onSelectFixture} />)
    const input = screen.getByTestId('search-input')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
