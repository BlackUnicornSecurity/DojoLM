/**
 * File: enso-gauge.test.tsx
 * Purpose: Unit tests for EnsoGauge SVG component — circular arc gauge with brush-stroke style
 * Story: TPI-NODA-9.8, BMAD review fix #7
 * Index:
 * - Rendering & Structure (line 13)
 * - Value Clamping (line 46)
 * - Arc Math (line 66)
 * - Color & Styling (line 95)
 * - Label (line 118)
 * - Sizing (line 141)
 * - Accessibility (line 162)
 * - Motion Safety (line 175)
 * - No Dead Classes (line 186)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EnsoGauge } from '@/components/ui/EnsoGauge'

describe('EnsoGauge', () => {
  describe('Rendering & Structure', () => {
    it('renders an SVG element', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders two path elements (background track + fill arc)', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const paths = container.querySelectorAll('path')
      expect(paths).toHaveLength(2)
    })

    it('renders a value text element', () => {
      const { container } = render(<EnsoGauge value={75} />)
      const texts = container.querySelectorAll('text')
      expect(texts.length).toBeGreaterThanOrEqual(1)
      expect(texts[0].textContent).toBe('75')
    })

    it('renders inside a flex container', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass('flex')
      expect(wrapper).toHaveClass('flex-col')
      expect(wrapper).toHaveClass('items-center')
    })
  })

  describe('Value Clamping', () => {
    it('displays clamped value at 0 when negative', () => {
      const { container } = render(<EnsoGauge value={-10} />)
      const text = container.querySelector('text')!
      expect(text.textContent).toBe('0')
    })

    it('displays clamped value at max when exceeding max', () => {
      const { container } = render(<EnsoGauge value={150} max={100} />)
      const text = container.querySelector('text')!
      expect(text.textContent).toBe('100')
    })

    it('displays exact value when within range', () => {
      const { container } = render(<EnsoGauge value={42} max={100} />)
      const text = container.querySelector('text')!
      expect(text.textContent).toBe('42')
    })

    it('handles max=0 gracefully (no division by zero)', () => {
      expect(() => render(<EnsoGauge value={50} max={0} />)).not.toThrow()
    })
  })

  describe('Arc Math', () => {
    it('at value=0 the fill arc has maximum stroke-dashoffset', () => {
      const { container } = render(<EnsoGauge value={0} max={100} />)
      const paths = container.querySelectorAll('path')
      const fillPath = paths[1]
      const dashArray = parseFloat(fillPath.getAttribute('stroke-dasharray')!)
      const dashOffset = parseFloat(fillPath.getAttribute('stroke-dashoffset')!)
      // At 0%, offset should equal the full arc length
      expect(dashOffset).toBeCloseTo(dashArray, 0)
    })

    it('at value=max the fill arc has zero stroke-dashoffset', () => {
      const { container } = render(<EnsoGauge value={100} max={100} />)
      const paths = container.querySelectorAll('path')
      const fillPath = paths[1]
      const dashOffset = parseFloat(fillPath.getAttribute('stroke-dashoffset')!)
      expect(dashOffset).toBeCloseTo(0, 0)
    })

    it('at value=50 the fill arc has ~50% stroke-dashoffset', () => {
      const { container } = render(<EnsoGauge value={50} max={100} />)
      const paths = container.querySelectorAll('path')
      const fillPath = paths[1]
      const dashArray = parseFloat(fillPath.getAttribute('stroke-dasharray')!)
      const dashOffset = parseFloat(fillPath.getAttribute('stroke-dashoffset')!)
      expect(dashOffset).toBeCloseTo(dashArray * 0.5, 0)
    })

    it('background track and fill arc share the same path d attribute', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const paths = container.querySelectorAll('path')
      expect(paths[0].getAttribute('d')).toBe(paths[1].getAttribute('d'))
    })

    it('arc path contains "A" command (SVG arc)', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const path = container.querySelector('path')!
      expect(path.getAttribute('d')).toContain('A')
    })
  })

  describe('Color & Styling', () => {
    it('uses var(--dojo-primary) as default stroke color', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const fillPath = container.querySelectorAll('path')[1]
      expect(fillPath.getAttribute('stroke')).toBe('var(--dojo-primary)')
    })

    it('applies custom color to stroke', () => {
      const { container } = render(<EnsoGauge value={50} color="var(--success)" />)
      const fillPath = container.querySelectorAll('path')[1]
      expect(fillPath.getAttribute('stroke')).toBe('var(--success)')
    })

    it('background track uses rgba white color', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const bgPath = container.querySelectorAll('path')[0]
      expect(bgPath.getAttribute('stroke')).toBe('rgba(255,255,255,0.06)')
    })

    it('both paths have round stroke-linecap', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const paths = container.querySelectorAll('path')
      expect(paths[0].getAttribute('stroke-linecap')).toBe('round')
      expect(paths[1].getAttribute('stroke-linecap')).toBe('round')
    })
  })

  describe('Label', () => {
    it('renders label text when provided', () => {
      const { container } = render(<EnsoGauge value={50} label="Guard Off" />)
      const texts = container.querySelectorAll('text')
      expect(texts).toHaveLength(2)
      expect(texts[1].textContent).toBe('Guard Off')
    })

    it('does not render label text when not provided', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const texts = container.querySelectorAll('text')
      expect(texts).toHaveLength(1)
    })

    it('label font size scales with size prop', () => {
      const { container } = render(<EnsoGauge value={50} size={200} label="Test" />)
      const labelText = container.querySelectorAll('text')[1]
      expect(labelText.style.fontSize).toBe(`${200 * 0.09}px`)
    })
  })

  describe('Sizing', () => {
    it('defaults to size=128', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('width')).toBe('128')
      expect(svg.getAttribute('height')).toBe('128')
      expect(svg.getAttribute('viewBox')).toBe('0 0 128 128')
    })

    it('applies custom size', () => {
      const { container } = render(<EnsoGauge value={50} size={200} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('width')).toBe('200')
      expect(svg.getAttribute('height')).toBe('200')
      expect(svg.getAttribute('viewBox')).toBe('0 0 200 200')
    })

    it('value font size scales with size * 0.22', () => {
      const { container } = render(<EnsoGauge value={50} size={200} />)
      const valueText = container.querySelectorAll('text')[0]
      expect(valueText.style.fontSize).toBe(`${200 * 0.22}px`)
    })
  })

  describe('Accessibility', () => {
    it('SVG has role="img"', () => {
      const { container } = render(<EnsoGauge value={75} max={100} />)
      const svg = container.querySelector('svg')!
      expect(svg.getAttribute('role')).toBe('img')
    })

    it('SVG has descriptive aria-label with value and max', () => {
      render(<EnsoGauge value={75} max={100} />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Gauge showing 75 out of 100')
    })

    it('aria-label includes label when provided', () => {
      render(<EnsoGauge value={75} max={100} label="Hattori" />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Gauge showing 75 out of 100, Hattori')
    })
  })

  describe('Motion Safety', () => {
    it('fill arc has motion-safe transition class', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const fillPath = container.querySelectorAll('path')[1]
      expect(fillPath).toHaveClass('motion-safe:transition-[stroke-dashoffset]')
      expect(fillPath).toHaveClass('motion-safe:duration-700')
      expect(fillPath).toHaveClass('motion-safe:ease-out')
    })
  })

  describe('No Dead Classes (BMAD review fix #7)', () => {
    it('value text element does not have text-2xl class', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const valueText = container.querySelectorAll('text')[0]
      expect(valueText).not.toHaveClass('text-2xl')
    })

    it('label text element does not have text-xs class', () => {
      const { container } = render(<EnsoGauge value={50} label="Test" />)
      const labelText = container.querySelectorAll('text')[1]
      expect(labelText).not.toHaveClass('text-xs')
    })

    it('value text has font-bold class', () => {
      const { container } = render(<EnsoGauge value={50} />)
      const valueText = container.querySelectorAll('text')[0]
      expect(valueText).toHaveClass('font-bold')
    })
  })

  describe('className passthrough', () => {
    it('passes custom className to wrapper div', () => {
      const { container } = render(<EnsoGauge value={50} className="my-gauge" />)
      const wrapper = container.firstElementChild as HTMLElement
      expect(wrapper).toHaveClass('my-gauge')
    })
  })
})
