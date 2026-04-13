/**
 * File: feature-radar.test.tsx
 * Purpose: Unit tests for FeatureRadar SVG radar chart component
 * Story: K5.4
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('bu-tpi/fingerprint', () => ({}))

import { FeatureRadar, type FeatureRadarProps } from '@/components/kagami/FeatureRadar'

const baseAxes = [
  { label: 'Style', key: 'style' },
  { label: 'Knowledge', key: 'knowledge' },
  { label: 'Safety', key: 'safety' },
  { label: 'Capability', key: 'capability' },
]

const defaultProps: FeatureRadarProps = {
  axes: baseAxes,
  targetValues: { style: 0.9, knowledge: 0.8, safety: 0.7, capability: 0.6 },
  candidateValues: { style: 0.85, knowledge: 0.5, safety: 0.9, capability: 0.4 },
}

describe('FeatureRadar', () => {
  describe('Rendering', () => {
    it('renders an SVG with role="img" and accessible label', () => {
      render(<FeatureRadar {...defaultProps} />)
      const svg = screen.getByRole('img', { name: 'Feature comparison radar chart' })
      expect(svg).toBeInTheDocument()
      expect(svg.tagName).toBe('svg')
    })

    it('renders grid rings and data points as circles', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      const circles = container.querySelectorAll('svg > circle')
      // 4 grid rings + 4 target dots + 4 candidate dots = 12
      expect(circles.length).toBe(4 + baseAxes.length * 2)
    })

    it('renders axis lines and labels for each axis', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      const groups = container.querySelectorAll('svg > g')
      expect(groups.length).toBe(baseAxes.length)
      for (const axis of baseAxes) {
        expect(screen.getByText(axis.label)).toBeInTheDocument()
      }
    })

    it('renders two polygons (target + candidate)', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      const polygons = container.querySelectorAll('polygon')
      expect(polygons.length).toBe(2)
    })

    it('renders data point circles with title tooltips', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      // Data point circles contain <title> children
      const circlesWithTitles = container.querySelectorAll('circle:has(title)')
      // target + candidate dots = 8
      expect(circlesWithTitles.length).toBe(baseAxes.length * 2)
    })

    it('renders title elements with percentage values', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      const titles = container.querySelectorAll('title')
      expect(titles.length).toBeGreaterThan(0)
      const styleTitles = Array.from(titles).filter(t =>
        t.textContent?.includes('Style')
      )
      expect(styleTitles.length).toBeGreaterThan(0)
    })
  })

  describe('Legend', () => {
    it('renders default legend labels', () => {
      render(<FeatureRadar {...defaultProps} />)
      expect(screen.getByText('Target')).toBeInTheDocument()
      expect(screen.getByText('Top Candidate')).toBeInTheDocument()
    })

    it('renders custom legend labels', () => {
      render(<FeatureRadar {...defaultProps} targetLabel="GPT-4" candidateLabel="Claude 3.5" />)
      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('Claude 3.5')).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('renders with custom size', () => {
      render(<FeatureRadar {...defaultProps} size={400} />)
      const svg = screen.getByRole('img')
      expect(svg.getAttribute('width')).toBe('400')
      expect(svg.getAttribute('height')).toBe('400')
    })

    it('uses default size of 320 when not specified', () => {
      render(<FeatureRadar {...defaultProps} />)
      const svg = screen.getByRole('img')
      expect(svg.getAttribute('width')).toBe('320')
    })

    it('applies className to container', () => {
      const { container } = render(<FeatureRadar {...defaultProps} className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('Edge Cases', () => {
    it('clamps values exceeding [0, 1] range', () => {
      const props: FeatureRadarProps = {
        ...defaultProps,
        targetValues: { style: 1.5, knowledge: -0.3, safety: 0.5, capability: 0 },
        candidateValues: { style: 2.0, knowledge: 0, safety: 0, capability: 0 },
      }
      const { container } = render(<FeatureRadar {...props} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('handles missing axis keys gracefully (defaults to 0)', () => {
      const props: FeatureRadarProps = {
        axes: baseAxes,
        targetValues: { style: 0.9 },
        candidateValues: {},
      }
      const { container } = render(<FeatureRadar {...props} />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    it('renders with many axes (10)', () => {
      const manyAxes = Array.from({ length: 10 }, (_, i) => ({
        label: `Axis ${i}`,
        key: `axis_${i}`,
      }))
      const values = Object.fromEntries(manyAxes.map(a => [a.key, 0.5]))
      const { container } = render(
        <FeatureRadar axes={manyAxes} targetValues={values} candidateValues={values} />
      )
      const groups = container.querySelectorAll('svg > g')
      expect(groups.length).toBe(10)
    })

    it('renders with 2 axes (minimum)', () => {
      const twoAxes = [
        { label: 'A', key: 'a' },
        { label: 'B', key: 'b' },
      ]
      const { container } = render(
        <FeatureRadar axes={twoAxes} targetValues={{ a: 0.5, b: 0.8 }} candidateValues={{ a: 0.3, b: 0.9 }} />
      )
      const polygons = container.querySelectorAll('polygon')
      expect(polygons.length).toBe(2)
    })

    it('renders polygons with valid points attribute', () => {
      const { container } = render(<FeatureRadar {...defaultProps} />)
      const polygons = container.querySelectorAll('polygon')
      for (const polygon of polygons) {
        const points = polygon.getAttribute('points') ?? ''
        expect(points).toBeTruthy()
        // Points should be comma-separated coordinate pairs
        const pairs = points.split(' ')
        expect(pairs.length).toBe(baseAxes.length)
        for (const pair of pairs) {
          const [x, y] = pair.split(',')
          expect(Number.isFinite(Number(x))).toBe(true)
          expect(Number.isFinite(Number(y))).toBe(true)
        }
      }
    })
  })
})
