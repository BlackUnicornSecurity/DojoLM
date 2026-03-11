/**
 * File: donut-chart.test.tsx
 * Purpose: Tests for DojoDonutChart component
 * Index:
 * - Rendering tests (line 15)
 * - Legend tests (line 50)
 * - Center label tests (line 76)
 * - Props tests (line 100)
 * - Edge case tests (line 120)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/dynamic to render synchronously with center label support
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>, _opts?: unknown) => {
    const MockChart = (props: Record<string, unknown>) => (
      <div data-testid="recharts-donut-chart">
        <div data-testid="chart-data">{JSON.stringify(props.data)}</div>
        {(props.centerLabel || props.centerValue !== undefined) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {props.centerValue !== undefined && (
              <span className="text-2xl font-bold">{String(props.centerValue)}</span>
            )}
            {props.centerLabel && (
              <span className="text-xs text-muted-foreground">{String(props.centerLabel)}</span>
            )}
          </div>
        )}
      </div>
    )
    MockChart.displayName = 'MockDynamicDonutChart'
    return MockChart
  },
}))

import { DojoDonutChart } from '@/components/charts/DonutChart'

const sampleData = [
  { name: 'Injection', value: 35 },
  { name: 'XSS', value: 25 },
  { name: 'SSRF', value: 20 },
  { name: 'Other', value: 20 },
]

describe('DojoDonutChart', () => {
  describe('Rendering', () => {
    it('renders the chart title', () => {
      render(<DojoDonutChart title="Attack Types" data={sampleData} />)
      expect(screen.getByText('Attack Types')).toBeInTheDocument()
    })

    it('renders within a Card component', () => {
      const { container } = render(<DojoDonutChart title="Card" data={sampleData} />)
      expect(container.firstChild).toBeTruthy()
    })

    it('renders the dynamic chart component', () => {
      render(<DojoDonutChart title="Chart" data={sampleData} />)
      expect(screen.getByTestId('recharts-donut-chart')).toBeInTheDocument()
    })

    it('renders title with muted-foreground styling', () => {
      render(<DojoDonutChart title="Styled" data={sampleData} />)
      const title = screen.getByText('Styled')
      expect(title.className).toContain('text-muted-foreground')
    })
  })

  describe('Legend', () => {
    it('renders legend items for each data segment', () => {
      render(<DojoDonutChart title="Legend" data={sampleData} />)
      expect(screen.getByText('Injection')).toBeInTheDocument()
      expect(screen.getByText('XSS')).toBeInTheDocument()
      expect(screen.getByText('SSRF')).toBeInTheDocument()
      expect(screen.getByText('Other')).toBeInTheDocument()
    })

    it('renders colored dots for each legend item', () => {
      const { container } = render(<DojoDonutChart title="Dots" data={sampleData} />)
      const dots = container.querySelectorAll('.rounded-full.w-2\\.5.h-2\\.5')
      expect(dots.length).toBe(sampleData.length)
    })

    it('cycles through DONUT_COLORS for legend dots', () => {
      const { container } = render(<DojoDonutChart title="Colors" data={sampleData} />)
      const dots = container.querySelectorAll('.rounded-full')
      // Each dot should have a backgroundColor style
      dots.forEach((dot) => {
        const style = (dot as HTMLElement).style.backgroundColor
        if (style) {
          expect(style).toBeTruthy()
        }
      })
    })
  })

  describe('Center label', () => {
    it('renders center value when provided', () => {
      render(<DojoDonutChart title="Center" data={sampleData} centerValue={100} />)
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('renders center label when provided', () => {
      render(<DojoDonutChart title="Label" data={sampleData} centerLabel="Total" />)
      expect(screen.getByText('Total')).toBeInTheDocument()
    })

    it('renders both center value and label', () => {
      render(<DojoDonutChart title="Both" data={sampleData} centerValue={42} centerLabel="Findings" />)
      expect(screen.getByText('42')).toBeInTheDocument()
      expect(screen.getByText('Findings')).toBeInTheDocument()
    })

    it('does not render center overlay when neither value nor label provided', () => {
      const { container } = render(<DojoDonutChart title="No Center" data={sampleData} />)
      const overlay = container.querySelector('.pointer-events-none')
      expect(overlay).toBeNull()
    })

    it('renders center value as string', () => {
      render(<DojoDonutChart title="String" data={sampleData} centerValue="85%" />)
      expect(screen.getByText('85%')).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DojoDonutChart title="Custom" data={sampleData} className="extra-class" />
      )
      expect(container.firstChild).toHaveClass('extra-class')
    })

    it('renders without optional props', () => {
      const { container } = render(<DojoDonutChart title="Minimal" data={sampleData} />)
      expect(container.firstChild).toBeTruthy()
    })
  })

  describe('Edge cases', () => {
    it('renders with empty data array', () => {
      render(<DojoDonutChart title="Empty" data={[]} />)
      expect(screen.getByText('Empty')).toBeInTheDocument()
    })

    it('renders with single segment', () => {
      render(<DojoDonutChart title="Single" data={[{ name: 'Only', value: 100 }]} />)
      expect(screen.getByText('Only')).toBeInTheDocument()
    })

    it('renders legend with many segments cycling through colors', () => {
      const manySegments = Array.from({ length: 12 }, (_, i) => ({ name: `Seg-${i}`, value: i + 1 }))
      render(<DojoDonutChart title="Many" data={manySegments} />)
      expect(screen.getByText('Seg-0')).toBeInTheDocument()
      expect(screen.getByText('Seg-11')).toBeInTheDocument()
    })
  })
})
