/**
 * File: animated-view.test.tsx
 * Purpose: Unit tests for AnimatedView component
 * Story: TPI-UI-001-19
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

import { AnimatedView } from '@/components/layout/AnimatedView'

describe('AnimatedView', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnimatedView>Content</AnimatedView>)
    expect(container).toBeTruthy()
  })

  it('renders children', () => {
    render(<AnimatedView>Test Content</AnimatedView>)
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies fade-in animation class by default', () => {
    const { container } = render(<AnimatedView>Content</AnimatedView>)
    expect(container.firstElementChild).toHaveClass('animate-fade-in')
  })

  it('applies slide-up animation class', () => {
    const { container } = render(<AnimatedView animation="slide-up">Content</AnimatedView>)
    expect(container.firstElementChild).toHaveClass('animate-slide-up')
  })

  it('applies custom className', () => {
    const { container } = render(<AnimatedView className="my-class">Content</AnimatedView>)
    expect(container.firstElementChild).toHaveClass('my-class')
  })
})
