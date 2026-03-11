/**
 * File: fixture-filters.test.tsx
 * Purpose: Unit tests for FixtureFilters component and filter utility functions
 * Test IDs: FF-001 to FF-012
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

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, 'aria-label': ariaLabel, 'aria-expanded': ariaExpanded, ...props }: {
    children: React.ReactNode; onClick?: () => void; 'aria-label'?: string; 'aria-expanded'?: boolean; [k: string]: unknown
  }) => (
    <button onClick={onClick} aria-label={ariaLabel} aria-expanded={ariaExpanded}>{children}</button>
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  FixtureFilters,
  filterManifest,
  countFilteredFixtures,
  INITIAL_FILTER_STATE,
  type FixtureFilterState,
} from '../fixtures/FixtureFilters'

// ---------------------------------------------------------------------------
// Test Data
// ---------------------------------------------------------------------------

const mockManifest = {
  generated: '2024-01-01',
  version: '1.0',
  description: 'test',
  categories: {
    web: {
      story: 'S1',
      desc: 'Web attacks',
      files: [
        { file: 'xss.txt', attack: 'XSS', severity: 'CRITICAL' as const, clean: false },
        { file: 'clean.txt', attack: null, severity: null, clean: true },
        { file: 'image.png', attack: 'steganography', severity: 'WARNING' as const, clean: false },
      ],
    },
    social: {
      story: 'S2',
      desc: 'Social attacks',
      files: [
        { file: 'phish.txt', attack: 'Phishing', severity: 'WARNING' as const, clean: false },
        { file: 'audio.mp3', attack: null, severity: null, clean: true },
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// Unit tests for utility functions
// ---------------------------------------------------------------------------

describe('filterManifest', () => {
  it('FF-001: returns all categories when no filters are active', () => {
    const result = filterManifest(mockManifest, INITIAL_FILTER_STATE)
    expect(Object.keys(result)).toEqual(['web', 'social'])
    expect(result.web.files.length).toBe(3)
  })

  it('FF-002: filters by category', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, category: 'web' }
    const result = filterManifest(mockManifest, filters)
    expect(Object.keys(result)).toEqual(['web'])
    expect(result.web.files.length).toBe(3)
  })

  it('FF-003: filters by severity', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, severity: 'CRITICAL' }
    const result = filterManifest(mockManifest, filters)
    expect(result.web.files.length).toBe(1)
    expect(result.web.files[0].file).toBe('xss.txt')
    expect(result.social).toBeUndefined()
  })

  it('FF-004: filters by detection status', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, detectionStatus: 'clean' }
    const result = filterManifest(mockManifest, filters)
    expect(result.web.files.length).toBe(1)
    expect(result.web.files[0].file).toBe('clean.txt')
    expect(result.social.files.length).toBe(1)
  })

  it('FF-005: filters by file type', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, fileType: 'image' }
    const result = filterManifest(mockManifest, filters)
    expect(result.web.files.length).toBe(1)
    expect(result.web.files[0].file).toBe('image.png')
    expect(result.social).toBeUndefined()
  })
})

describe('countFilteredFixtures', () => {
  it('FF-006: counts total fixtures across categories', () => {
    const count = countFilteredFixtures(mockManifest.categories)
    expect(count).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------

describe('FixtureFilters component', () => {
  const onFiltersChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('FF-007: renders Filters button', () => {
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={INITIAL_FILTER_STATE}
        onFiltersChange={onFiltersChange}
        filteredCount={5}
        totalCount={5}
      />
    )
    expect(screen.getByText('Filters')).toBeInTheDocument()
  })

  it('FF-008: shows filter dropdowns when Filters button is clicked', () => {
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={INITIAL_FILTER_STATE}
        onFiltersChange={onFiltersChange}
        filteredCount={5}
        totalCount={5}
      />
    )
    fireEvent.click(screen.getByLabelText('Show filters'))
    expect(screen.getByLabelText('Filter by Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by Severity')).toBeInTheDocument()
  })

  it('FF-009: shows active filter count badge when filters active', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, category: 'web' }
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filteredCount={3}
        totalCount={5}
      />
    )
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('FF-010: shows Clear all button when filters active', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, severity: 'CRITICAL' }
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filteredCount={1}
        totalCount={5}
      />
    )
    expect(screen.getByLabelText('Clear all filters')).toBeInTheDocument()
  })

  it('FF-011: calls onFiltersChange with initial state when Clear all is clicked', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, severity: 'CRITICAL' }
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filteredCount={1}
        totalCount={5}
      />
    )
    fireEvent.click(screen.getByLabelText('Clear all filters'))
    expect(onFiltersChange).toHaveBeenCalledWith(INITIAL_FILTER_STATE)
  })

  it('FF-012: renders filter pills for active filters', () => {
    const filters: FixtureFilterState = { ...INITIAL_FILTER_STATE, category: 'web', severity: 'CRITICAL' }
    render(
      <FixtureFilters
        manifest={mockManifest}
        filters={filters}
        onFiltersChange={onFiltersChange}
        filteredCount={1}
        totalCount={5}
      />
    )
    expect(screen.getByText('Category: web')).toBeInTheDocument()
    expect(screen.getByText('Severity: CRITICAL')).toBeInTheDocument()
  })
})
