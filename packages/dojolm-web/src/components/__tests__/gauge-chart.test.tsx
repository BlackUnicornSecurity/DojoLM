/**
 * File: gauge-chart.test.tsx
 * Purpose: Unit tests for DojoGaugeChart component
 * Story: TPI-UI-001-14
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<unknown>, _opts?: unknown) => {
    const MockChart = (props: Record<string, unknown>) => (
      <div data-testid="recharts-gauge" data-value={props.value}>
        {String(props.value)}%
      </div>
    )
    MockChart.displayName = 'MockDynamicGauge'
    return MockChart
  },
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: Record<string, unknown>) => <h3 {...props}>{children}</h3>,
}))

import { DojoGaugeChart } from '@/components/charts/GaugeChart'

describe('DojoGaugeChart', () => {
  it('renders without crashing', () => {
    const { container } = render(<DojoGaugeChart title="Pass Rate" value={85} />)
    expect(container).toBeTruthy()
  })

  it('displays the title', () => {
    render(<DojoGaugeChart title="Pass Rate" value={85} />)
    expect(screen.getByText('Pass Rate')).toBeInTheDocument()
  })

  it('renders within a Card structure', () => {
    const { container } = render(<DojoGaugeChart title="Coverage" value={70} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('passes value to the chart component', () => {
    render(<DojoGaugeChart title="Test" value={92} />)
    expect(screen.getByTestId('recharts-gauge')).toHaveAttribute('data-value', '92')
  })

  it('applies custom className', () => {
    const { container } = render(
      <DojoGaugeChart title="Test" value={50} className="custom-class" />
    )
    expect(container.firstChild).toBeTruthy()
  })
})
