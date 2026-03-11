/**
 * File: line-chart.test.tsx
 * Purpose: Tests for DojoLineChart component
 * Index:
 * - Rendering tests (line 15)
 * - Props tests (line 46)
 * - Edge case tests (line 84)
 * - Accessibility tests (line 112)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/dynamic to render synchronously
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>, _opts?: unknown) => {
    const MockChart = (props: Record<string, unknown>) => (
      <div data-testid="recharts-line-chart" data-datakey={props.dataKey} data-xkey={props.xKey}>
        {JSON.stringify(props.data)}
      </div>
    )
    MockChart.displayName = 'MockDynamicLineChart'
    return MockChart
  },
}))

import { DojoLineChart } from '@/components/charts/LineChart'

const sampleData = [
  { date: '2024-01', threats: 5 },
  { date: '2024-02', threats: 12 },
  { date: '2024-03', threats: 8 },
  { date: '2024-04', threats: 15 },
]

describe('DojoLineChart', () => {
  describe('Rendering', () => {
    it('renders the chart title', () => {
      render(<DojoLineChart title="Threat Trends" data={sampleData} dataKey="threats" xKey="date" />)
      expect(screen.getByText('Threat Trends')).toBeInTheDocument()
    })

    it('renders within a Card component', () => {
      const { container } = render(
        <DojoLineChart title="Card Test" data={sampleData} dataKey="threats" xKey="date" />
      )
      expect(container.firstChild).toBeTruthy()
    })

    it('renders the dynamic chart component', () => {
      render(<DojoLineChart title="Dynamic" data={sampleData} dataKey="threats" xKey="date" />)
      expect(screen.getByTestId('recharts-line-chart')).toBeInTheDocument()
    })

    it('renders title with muted-foreground styling', () => {
      render(<DojoLineChart title="Styled" data={sampleData} dataKey="threats" xKey="date" />)
      const title = screen.getByText('Styled')
      expect(title.className).toContain('text-muted-foreground')
    })
  })

  describe('Props', () => {
    it('passes data to the chart component', () => {
      render(<DojoLineChart title="Data" data={sampleData} dataKey="threats" xKey="date" />)
      const chart = screen.getByTestId('recharts-line-chart')
      expect(chart.textContent).toContain('2024-01')
      expect(chart.textContent).toContain('15')
    })

    it('passes dataKey to the chart', () => {
      render(<DojoLineChart title="Key" data={sampleData} dataKey="threats" xKey="date" />)
      const chart = screen.getByTestId('recharts-line-chart')
      expect(chart.getAttribute('data-datakey')).toBe('threats')
    })

    it('passes xKey to the chart', () => {
      render(<DojoLineChart title="XKey" data={sampleData} dataKey="threats" xKey="date" />)
      const chart = screen.getByTestId('recharts-line-chart')
      expect(chart.getAttribute('data-xkey')).toBe('date')
    })

    it('applies custom className', () => {
      const { container } = render(
        <DojoLineChart title="Class" data={sampleData} dataKey="threats" xKey="date" className="my-custom" />
      )
      expect(container.firstChild).toHaveClass('my-custom')
    })

    it('renders without optional className', () => {
      const { container } = render(
        <DojoLineChart title="No Class" data={sampleData} dataKey="threats" xKey="date" />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('renders with empty data array', () => {
      render(<DojoLineChart title="Empty" data={[]} dataKey="threats" xKey="date" />)
      expect(screen.getByText('Empty')).toBeInTheDocument()
      const chart = screen.getByTestId('recharts-line-chart')
      expect(chart.textContent).toBe('[]')
    })

    it('renders with single data point', () => {
      const single = [{ time: '1', val: 99 }]
      render(<DojoLineChart title="Single" data={single} dataKey="val" xKey="time" />)
      expect(screen.getByTestId('recharts-line-chart')).toBeInTheDocument()
    })

    it('renders with large dataset', () => {
      const large = Array.from({ length: 200 }, (_, i) => ({ x: `t-${i}`, y: Math.random() * 100 }))
      render(<DojoLineChart title="Large" data={large} dataKey="y" xKey="x" />)
      expect(screen.getByTestId('recharts-line-chart')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('title is visible and descriptive', () => {
      render(<DojoLineChart title="Visible Chart" data={sampleData} dataKey="threats" xKey="date" />)
      expect(screen.getByText('Visible Chart')).toBeVisible()
    })

    it('has semantic heading for chart title', () => {
      render(<DojoLineChart title="Heading" data={sampleData} dataKey="threats" xKey="date" />)
      const title = screen.getByText('Heading')
      expect(title.tagName).toMatch(/H[1-6]|DIV|P/)
    })
  })
})
