/**
 * File: engine-toggle-grid.test.tsx
 * Purpose: Unit tests for EngineToggleGrid dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

const mockToggleFilter = vi.fn()
const mockResetFilters = vi.fn()
const mockEngineFilters = [
  { id: 'engine-1', name: 'Engine 1', enabled: true },
  { id: 'engine-2', name: 'Engine 2', enabled: false },
  { id: 'engine-3', name: 'Engine 3', enabled: true },
]

vi.mock('@/lib/ScannerContext', () => ({
  useScanner: () => ({
    engineFilters: mockEngineFilters,
    toggleFilter: mockToggleFilter,
    resetFilters: mockResetFilters,
  }),
}))

vi.mock('@/components/ui/FilterPills', () => ({
  FilterPills: ({ filters }: { filters: Array<{ id: string; name: string; enabled: boolean }> }) => (
    <div data-testid="filter-pills">
      {filters.map((f: { id: string; name: string }) => (
        <span key={f.id} data-testid={`pill-${f.id}`}>{f.name}</span>
      ))}
    </div>
  ),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

import { EngineToggleGrid } from '../dashboard/widgets/EngineToggleGrid'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EngineToggleGrid', () => {
  it('renders without crashing', () => {
    const { container } = render(<EngineToggleGrid />)
    expect(container).toBeTruthy()
  })

  it('displays title with active count', () => {
    render(<EngineToggleGrid />)
    // 2 of 3 are enabled
    expect(screen.getByText('Engine Filters — 2 of 3 active')).toBeInTheDocument()
  })

  it('renders FilterPills component', () => {
    render(<EngineToggleGrid />)
    expect(screen.getByTestId('filter-pills')).toBeInTheDocument()
  })

  it('renders all engine filter pills', () => {
    render(<EngineToggleGrid />)
    expect(screen.getByTestId('pill-engine-1')).toBeInTheDocument()
    expect(screen.getByTestId('pill-engine-2')).toBeInTheDocument()
    expect(screen.getByTestId('pill-engine-3')).toBeInTheDocument()
  })

  it('wraps content in WidgetCard', () => {
    render(<EngineToggleGrid />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })
})
