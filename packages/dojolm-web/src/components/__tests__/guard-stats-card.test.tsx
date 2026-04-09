/**
 * File: guard-stats-card.test.tsx
 * Purpose: Unit tests for GuardStatsCard dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }],
}))

const mockStats = {
  totalEvents: 42,
  byAction: { block: 10, allow: 30, log: 2 },
  blockRate: 24,
}

vi.mock('@/lib/contexts/GuardContext', () => ({
  useGuardStats: () => ({ stats: mockStats }),
}))

vi.mock('@/components/charts', () => ({
  DojoDonutChart: ({ data, centerLabel, centerValue }: { data: Array<{ name: string; value: number }>; centerLabel: string; centerValue: string }) => (
    <div data-testid="donut-chart" data-center-label={centerLabel} data-center-value={centerValue}>
      {data.map((d: { name: string; value: number }) => (
        <span key={d.name}>{d.name}: {d.value}</span>
      ))}
    </div>
  ),
}))

vi.mock('@/components/ui/MetricCard', () => ({
  MetricCard: ({ label, value }: { label: string; value: number }) => (
    <div data-testid={`metric-${label.toLowerCase()}`}>{label}: {value}</div>
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

import { GuardStatsCard } from '../dashboard/widgets/GuardStatsCard'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardStatsCard', () => {
  it('renders without crashing', () => {
    const { container } = render(<GuardStatsCard />)
    expect(container).toBeTruthy()
  })

  it('displays "Guard Stats" title', () => {
    render(<GuardStatsCard />)
    expect(screen.getByText('Guard Stats')).toBeInTheDocument()
  })

  it('renders DojoDonutChart with correct center label', () => {
    render(<GuardStatsCard />)
    const chart = screen.getByTestId('donut-chart')
    expect(chart.getAttribute('data-center-label')).toBe('Block Rate')
    expect(chart.getAttribute('data-center-value')).toBe('24%')
  })

  it('renders donut chart segments for non-zero values', () => {
    render(<GuardStatsCard />)
    expect(screen.getByText('Blocked: 10')).toBeInTheDocument()
    expect(screen.getByText('Allowed: 30')).toBeInTheDocument()
    expect(screen.getByText('Logged: 2')).toBeInTheDocument()
  })

  it('renders three metric cards', () => {
    render(<GuardStatsCard />)
    expect(screen.getByTestId('metric-total')).toBeInTheDocument()
    expect(screen.getByTestId('metric-blocked')).toBeInTheDocument()
    expect(screen.getByTestId('metric-allowed')).toBeInTheDocument()
  })
})
