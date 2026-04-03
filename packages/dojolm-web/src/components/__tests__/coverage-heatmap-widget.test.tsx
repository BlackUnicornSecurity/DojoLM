/**
 * File: coverage-heatmap-widget.test.tsx
 * Purpose: Unit tests for CoverageHeatmapWidget dashboard widget
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

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  COVERAGE_DATA: [
    { category: 'Injection', post: 75 },
    { category: 'XSS', post: 90 },
    { category: 'SSRF', post: 40 },
  ],
  NAV_ITEMS: [{ id: 'dashboard' }],
}))

vi.mock('@/components/charts', () => ({
  DojoCoverageMap: ({ data, title }: { data: Array<{ label: string; value: number }>; title: string }) => (
    <div data-testid="coverage-map" data-title={title}>
      {data.map((d: { label: string; value: number }) => (
        <span key={d.label} data-testid={`cell-${d.label}`}>{d.label}: {d.value}</span>
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

import { CoverageHeatmapWidget } from '../dashboard/widgets/CoverageHeatmapWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoverageHeatmapWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<CoverageHeatmapWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Coverage Heatmap" title', () => {
    render(<CoverageHeatmapWidget />)
    expect(screen.getByText('Coverage Heatmap')).toBeInTheDocument()
  })

  it('renders DojoCoverageMap component', () => {
    render(<CoverageHeatmapWidget />)
    expect(screen.getByTestId('coverage-map')).toBeInTheDocument()
  })

  it('maps COVERAGE_DATA to cells with correct labels', () => {
    render(<CoverageHeatmapWidget />)
    expect(screen.getByTestId('cell-Injection')).toBeInTheDocument()
    expect(screen.getByTestId('cell-XSS')).toBeInTheDocument()
    expect(screen.getByTestId('cell-SSRF')).toBeInTheDocument()
  })

  it('passes empty title to DojoCoverageMap', () => {
    render(<CoverageHeatmapWidget />)
    const map = screen.getByTestId('coverage-map')
    expect(map.getAttribute('data-title')).toBe('')
  })
})
