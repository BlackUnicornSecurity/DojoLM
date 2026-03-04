/**
 * File: enhanced-progress.test.tsx
 * Purpose: Tests for EnhancedProgress component (Story TPI-UIP-07)
 * Index:
 * - Rendering tests (line 10)
 * - ARIA tests (line 32)
 * - Color variant tests (line 62)
 * - Size variant tests (line 84)
 * - Glow tip tests (line 103)
 * - Edge case tests (line 121)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'

/** Helper: get the fill bar (inner div of the track) */
function getFill(container: HTMLElement) {
  const bar = container.querySelector('[role="progressbar"]')!
  const track = bar.firstElementChild as HTMLElement
  return track.firstElementChild as HTMLElement
}

/** Helper: get the track (outer rounded-full container) */
function getTrack(container: HTMLElement) {
  const bar = container.querySelector('[role="progressbar"]')!
  return bar.firstElementChild as HTMLElement
}

describe('EnhancedProgress', () => {
  describe('Rendering', () => {
    it('renders progressbar', () => {
      render(<EnhancedProgress value={50} />)
      const bar = screen.getByRole('progressbar')
      expect(bar).toBeInTheDocument()
    })

    it('renders fill with correct width', () => {
      const { container } = render(<EnhancedProgress value={75} />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ width: '75%' })
    })

    it('shows label when showLabel=true', () => {
      render(<EnhancedProgress value={42} showLabel />)
      expect(screen.getByText('42%')).toBeInTheDocument()
    })

    it('hides label by default', () => {
      render(<EnhancedProgress value={42} />)
      expect(screen.queryByText('42%')).not.toBeInTheDocument()
    })
  })

  describe('ARIA attributes', () => {
    it('has role="progressbar"', () => {
      render(<EnhancedProgress value={50} />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('has default aria-label', () => {
      render(<EnhancedProgress value={50} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Progress')
    })

    it('accepts custom aria-label', () => {
      render(<EnhancedProgress value={50} aria-label="Upload progress" />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Upload progress')
    })

    it('has aria-valuenow', () => {
      render(<EnhancedProgress value={50} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    })

    it('has aria-valuemin=0', () => {
      render(<EnhancedProgress value={50} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
    })

    it('has aria-valuemax defaulting to 100', () => {
      render(<EnhancedProgress value={50} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    })

    it('respects custom max', () => {
      render(<EnhancedProgress value={5} max={10} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10')
    })
  })

  describe('Color variants', () => {
    it('uses primary color by default', () => {
      const { container } = render(<EnhancedProgress value={50} />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ backgroundColor: 'var(--dojo-primary)' })
    })

    it('uses success color', () => {
      const { container } = render(<EnhancedProgress value={50} color="success" />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ backgroundColor: 'var(--success)' })
    })

    it('uses warning color', () => {
      const { container } = render(<EnhancedProgress value={50} color="warning" />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ backgroundColor: 'var(--warning)' })
    })

    it('uses danger color', () => {
      const { container } = render(<EnhancedProgress value={50} color="danger" />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ backgroundColor: 'var(--danger)' })
    })

    it('uses info color', () => {
      const { container } = render(<EnhancedProgress value={50} color="info" />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ backgroundColor: 'var(--severity-low)' })
    })
  })

  describe('Size variants', () => {
    it('defaults to md height', () => {
      const { container } = render(<EnhancedProgress value={50} />)
      const track = getTrack(container)
      expect(track).toHaveClass('h-2.5')
    })

    it('applies sm height', () => {
      const { container } = render(<EnhancedProgress value={50} size="sm" />)
      const track = getTrack(container)
      expect(track).toHaveClass('h-1.5')
    })

    it('applies lg height', () => {
      const { container } = render(<EnhancedProgress value={50} size="lg" />)
      const track = getTrack(container)
      expect(track).toHaveClass('h-4')
    })
  })

  describe('Glow tip', () => {
    it('no glow by default', () => {
      const { container } = render(<EnhancedProgress value={50} />)
      const fill = getFill(container)
      const style = fill?.getAttribute('style') || ''
      expect(style).not.toContain('box-shadow')
    })

    it('shows glow when showGlow=true and value > 0', () => {
      const { container } = render(<EnhancedProgress value={50} showGlow />)
      const fill = getFill(container)
      const style = fill?.getAttribute('style') || ''
      expect(style).toContain('box-shadow')
    })

    it('no glow when value is 0 even with showGlow', () => {
      const { container } = render(<EnhancedProgress value={0} showGlow />)
      const fill = getFill(container)
      // Should not have box-shadow when width is 0%
      const style = fill?.getAttribute('style') || ''
      expect(style).not.toContain('box-shadow')
    })
  })

  describe('Edge cases', () => {
    it('clamps value to 0 minimum', () => {
      const { container } = render(<EnhancedProgress value={-10} />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ width: '0%' })
    })

    it('clamps aria-valuenow to bounds', () => {
      render(<EnhancedProgress value={-10} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    })

    it('clamps value to 100% maximum', () => {
      const { container } = render(<EnhancedProgress value={150} />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ width: '100%' })
    })

    it('clamps aria-valuenow to max', () => {
      render(<EnhancedProgress value={150} />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    })

    it('calculates percentage with custom max', () => {
      const { container } = render(<EnhancedProgress value={5} max={10} />)
      const fill = getFill(container)
      expect(fill).toHaveStyle({ width: '50%' })
    })

    it('handles max=0 without NaN', () => {
      const { container } = render(<EnhancedProgress value={50} max={0} />)
      const fill = getFill(container)
      // Falls back to max=100
      expect(fill).toHaveStyle({ width: '50%' })
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    })

    it('applies custom className', () => {
      render(<EnhancedProgress value={50} className="my-custom-class" />)
      expect(screen.getByRole('progressbar')).toHaveClass('my-custom-class')
    })
  })

  describe('Motion-reduce', () => {
    it('has motion-safe transition class on fill', () => {
      const { container } = render(<EnhancedProgress value={50} />)
      const fill = getFill(container)
      expect(fill).toBeInTheDocument()
      expect(fill.className).toContain('motion-safe')
    })
  })
})
