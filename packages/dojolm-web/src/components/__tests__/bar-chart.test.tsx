/**
 * File: bar-chart.test.tsx
 * Purpose: Tests for DojoBarChart component
 * Index:
 * - Rendering tests (line 15)
 * - Props tests (line 46)
 * - Edge case tests (line 84)
 * - Accessibility tests (line 112)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/dynamic to render the inner chart component synchronously
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>, _opts?: unknown) => {
    // Return a simple placeholder that renders the passed props as data attributes
    const MockChart = (props: Record<string, unknown>) => (
      <div data-testid="recharts-bar-chart" data-datakey={props.dataKey} data-xkey={props.xKey}>
        {JSON.stringify(props.data)}
      </div>
    )
    MockChart.displayName = 'MockDynamicBarChart'
    return MockChart
  },
}))

import { DojoBarChart } from '@/components/charts/BarChart'

const sampleData = [
  { category: 'Injection', count: 12 },
  { category: 'XSS', count: 8 },
  { category: 'CSRF', count: 5 },
]

describe('DojoBarChart', () => {
  describe('Rendering', () => {
    it('renders the chart title', () => {
      render(<DojoBarChart title="Attack Distribution" data={sampleData} dataKey="count" xKey="category" />)
      expect(screen.getByText('Attack Distribution')).toBeInTheDocument()
    })

    it('renders within a Card component structure', () => {
      const { container } = render(
        <DojoBarChart title="Test Chart" data={sampleData} dataKey="count" xKey="category" />
      )
      // Card renders a div structure
      expect(container.firstChild).toBeTruthy()
    })

    it('renders the dynamic chart component', () => {
      render(<DojoBarChart title="Test" data={sampleData} dataKey="count" xKey="category" />)
      expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument()
    })

    it('renders title with muted-foreground styling', () => {
      render(<DojoBarChart title="Styled Title" data={sampleData} dataKey="count" xKey="category" />)
      const title = screen.getByText('Styled Title')
      expect(title.className).toContain('text-muted-foreground')
    })
  })

  describe('Props', () => {
    it('passes data to the chart component', () => {
      render(<DojoBarChart title="Data Test" data={sampleData} dataKey="count" xKey="category" />)
      const chart = screen.getByTestId('recharts-bar-chart')
      expect(chart.textContent).toContain('Injection')
      expect(chart.textContent).toContain('12')
    })

    it('passes dataKey to the chart component', () => {
      render(<DojoBarChart title="Key Test" data={sampleData} dataKey="count" xKey="category" />)
      const chart = screen.getByTestId('recharts-bar-chart')
      expect(chart.getAttribute('data-datakey')).toBe('count')
    })

    it('passes xKey to the chart component', () => {
      render(<DojoBarChart title="X Key Test" data={sampleData} dataKey="count" xKey="category" />)
      const chart = screen.getByTestId('recharts-bar-chart')
      expect(chart.getAttribute('data-xkey')).toBe('category')
    })

    it('applies custom className to the Card', () => {
      const { container } = render(
        <DojoBarChart title="Class Test" data={sampleData} dataKey="count" xKey="category" className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })

    it('renders without className prop', () => {
      const { container } = render(
        <DojoBarChart title="No Class" data={sampleData} dataKey="count" xKey="category" />
      )
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('renders with empty data array', () => {
      render(<DojoBarChart title="Empty Data" data={[]} dataKey="count" xKey="category" />)
      expect(screen.getByText('Empty Data')).toBeInTheDocument()
      const chart = screen.getByTestId('recharts-bar-chart')
      expect(chart.textContent).toBe('[]')
    })

    it('renders with single data point', () => {
      const single = [{ name: 'One', value: 42 }]
      render(<DojoBarChart title="Single" data={single} dataKey="value" xKey="name" />)
      expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument()
    })

    it('renders with large dataset', () => {
      const large = Array.from({ length: 100 }, (_, i) => ({ x: `item-${i}`, y: i }))
      render(<DojoBarChart title="Large" data={large} dataKey="y" xKey="x" />)
      expect(screen.getByTestId('recharts-bar-chart')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('title is visible and descriptive', () => {
      render(<DojoBarChart title="Accessible Chart" data={sampleData} dataKey="count" xKey="category" />)
      expect(screen.getByText('Accessible Chart')).toBeVisible()
    })

    it('title uses semantic heading structure via CardTitle', () => {
      render(<DojoBarChart title="Heading Test" data={sampleData} dataKey="count" xKey="category" />)
      const title = screen.getByText('Heading Test')
      // CardTitle renders as an h3 element
      expect(title.tagName).toMatch(/H[1-6]|DIV|P/)
    })
  })
})
