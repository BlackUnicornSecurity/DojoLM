/**
 * File: scanning-state.test.tsx
 * Purpose: Tests for ScanningState animation component (Story TPI-UIP-06)
 * Index:
 * - Rendering tests (line 11)
 * - Animation tests (line 23)
 * - Accessibility tests (line 44)
 * - Motion-reduce tests (line 57)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScanningState } from '@/components/scanner/ScanningState'

describe('ScanningState', () => {
  describe('Rendering', () => {
    it('renders scanning text in both animated and fallback views', () => {
      render(<ScanningState />)
      const scanningTexts = screen.getAllByText('Scanning...')
      expect(scanningTexts).toHaveLength(2)
    })

    it('renders ScanLine icon', () => {
      const { container } = render(<ScanningState />)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('Animation rings', () => {
    it('renders three concentric rings', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      expect(rings.length).toBe(3)
    })

    it('rings have staggered animation delays', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      // Outer ring has no inline delay (default 0); middle and inner have staggered delays
      expect(rings[1]).toHaveStyle({ animationDelay: '200ms' })
      expect(rings[2]).toHaveStyle({ animationDelay: '400ms' })
    })

    it('rings use scan-ring animation class', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      rings.forEach(ring => {
        expect(ring.className).toContain('scan-ring')
      })
    })

    it('rings use dojo-primary color', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      rings.forEach(ring => {
        expect(ring.className).toContain('border-[var(--dojo-primary)]')
      })
    })
  })

  describe('Accessibility', () => {
    it('has role="status"', () => {
      const { container } = render(<ScanningState />)
      const statusElement = container.querySelector('[role="status"]')
      expect(statusElement).toBeInTheDocument()
    })

    it('has aria-label for scanning state', () => {
      const { container } = render(<ScanningState />)
      const statusElement = container.querySelector('[aria-label="Scanning in progress"]')
      expect(statusElement).toBeInTheDocument()
    })

    it('decorative rings have aria-hidden', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      rings.forEach(ring => {
        expect(ring).toHaveAttribute('aria-hidden', 'true')
      })
    })

    it('icons have aria-hidden', () => {
      const { container } = render(<ScanningState />)
      const icons = container.querySelectorAll('svg')
      icons.forEach(icon => {
        expect(icon).toHaveAttribute('aria-hidden', 'true')
      })
    })
  })

  describe('Motion-reduce fallback', () => {
    it('animated container has motion-reduce:hidden class', () => {
      const { container } = render(<ScanningState />)
      const animatedContainer = container.querySelector('.motion-reduce\\:hidden')
      expect(animatedContainer).toBeInTheDocument()
    })

    it('static fallback has motion-reduce:flex class', () => {
      const { container } = render(<ScanningState />)
      const fallback = container.querySelector('.motion-reduce\\:flex')
      expect(fallback).toBeInTheDocument()
    })

    it('all rings have motion-reduce:animate-none class', () => {
      const { container } = render(<ScanningState />)
      const rings = container.querySelectorAll('.rounded-full.border-2')
      rings.forEach(ring => {
        expect(ring.className).toContain('motion-reduce:animate-none')
      })
    })
  })

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<ScanningState className="py-4" />)
      const root = container.querySelector('[role="status"]')
      expect(root).toHaveClass('py-4')
    })
  })
})
