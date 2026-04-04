/**
 * File: platform-stats-widget.test.tsx
 * Purpose: Unit tests for PlatformStatsWidget dashboard widget
 * Story: NODA-4 Story 3.2
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}))

vi.mock('@/components/dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <div data-testid="widget-title">{title}</div>
      <div data-testid="widget-content">{children}</div>
    </div>
  ),
}))

vi.mock('@/lib/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants')>()
  return {
    ...actual,
    OWASP_LLM_COVERAGE_DATA: [
      { id: 'LLM01', pre: 30, post: 80 },
      { id: 'LLM02', pre: 20, post: 60 },
    ],
  }
})

vi.mock('@/lib/client-data-cache', () => ({
  getCachedScannerStats: vi.fn().mockResolvedValue({ patternCount: 0, groupCount: 0, patternGroups: [] }),
  getCachedFixtureManifest: vi.fn().mockResolvedValue({ categories: {} }),
}))

import { PlatformStatsWidget } from '@/components/dashboard/widgets/PlatformStatsWidget'

describe('PlatformStatsWidget', () => {
  it('renders without crashing', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })

  it('displays the widget title', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByTestId('widget-title')).toHaveTextContent('Platform Stats')
  })

  it('displays all 5 stat labels', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByText('Patterns')).toBeInTheDocument()
    expect(screen.getByText('Fixtures')).toBeInTheDocument()
    expect(screen.getByText('OWASP')).toBeInTheDocument()
    expect(screen.getByText('Engines')).toBeInTheDocument()
    expect(screen.getByText('Modules')).toBeInTheDocument()
  })

  it('displays sub-labels', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByText('LLM Top 10')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('displays static engine count of 13', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByText('13')).toBeInTheDocument()
  })

  it('renders all 5 stat icons', () => {
    render(<PlatformStatsWidget />)
    expect(screen.getByTestId('icon-Layers')).toBeInTheDocument()
    expect(screen.getByTestId('icon-FlaskConical')).toBeInTheDocument()
    expect(screen.getByTestId('icon-Shield')).toBeInTheDocument()
    expect(screen.getByTestId('icon-Cpu')).toBeInTheDocument()
    expect(screen.getByTestId('icon-Activity')).toBeInTheDocument()
  })
})
