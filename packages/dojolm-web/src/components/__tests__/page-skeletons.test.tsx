/**
 * File: page-skeletons.test.tsx
 * Purpose: Tests for page-specific skeleton layouts
 * Story: TPI-UIP-09
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ScannerPageSkeleton, ArmorySkeleton, CoverageSkeleton } from '@/components/ui/PageSkeletons'

describe('ScannerPageSkeleton', () => {
  it('renders with aria-busy attribute', () => {
    const { container } = render(<ScannerPageSkeleton />)
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(root.getAttribute('aria-label')).toBe('Loading scanner')
  })

  it('renders shimmer skeleton elements with aria-hidden', () => {
    const { container } = render(<ScannerPageSkeleton />)
    const hiddenElements = container.querySelectorAll('[aria-hidden="true"]')
    expect(hiddenElements.length).toBeGreaterThan(0)
  })
})

describe('ArmorySkeleton', () => {
  it('renders with aria-busy attribute', () => {
    const { container } = render(<ArmorySkeleton />)
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(root.getAttribute('aria-label')).toBe('Loading armory')
  })

  it('renders card grid skeleton items', () => {
    const { container } = render(<ArmorySkeleton />)
    // Should render 6 card skeletons
    const gridItems = container.querySelectorAll('.grid > div')
    expect(gridItems.length).toBe(6)
  })
})

describe('CoverageSkeleton', () => {
  it('renders with aria-busy attribute', () => {
    const { container } = render(<CoverageSkeleton />)
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('aria-busy')).toBe('true')
    expect(root.getAttribute('aria-label')).toBe('Loading coverage')
  })

  it('renders progress bar skeletons', () => {
    const { container } = render(<CoverageSkeleton />)
    // Should have multiple shimmer elements for progress bars
    const shimmers = container.querySelectorAll('.animate-shimmer')
    expect(shimmers.length).toBeGreaterThan(5)
  })
})
