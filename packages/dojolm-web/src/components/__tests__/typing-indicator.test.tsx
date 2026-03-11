/**
 * File: typing-indicator.test.tsx
 * Purpose: Tests for TypingIndicator component
 * Test IDs: TI-001 to TI-011
 * Source: src/components/llm/TypingIndicator.tsx
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Import under test
// ---------------------------------------------------------------------------
import { TypingIndicator } from '../llm/TypingIndicator'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TypingIndicator', () => {
  // TI-001
  it('renders a status element', () => {
    render(<TypingIndicator />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  // TI-002
  it('has aria-label describing typing state', () => {
    render(<TypingIndicator />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Assistant is typing')
  })

  // TI-003
  it('renders exactly three dot spans', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    expect(dots).toHaveLength(3)
  })

  // TI-004
  it('dots are hidden from screen readers (aria-hidden)', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    dots.forEach(dot => {
      expect(dot).toHaveAttribute('aria-hidden', 'true')
    })
  })

  // TI-005
  it('dots have the animate-bounce class', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    dots.forEach(dot => {
      expect(dot.className).toContain('animate-bounce')
    })
  })

  // TI-006
  it('dots have motion-reduce:animate-none for accessibility', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    dots.forEach(dot => {
      expect(dot.className).toContain('motion-reduce:animate-none')
    })
  })

  // TI-007
  it('first dot has animation-delay -0.3s', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    expect(dots[0].className).toContain('[animation-delay:-0.3s]')
  })

  // TI-008
  it('second dot has animation-delay -0.15s', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    expect(dots[1].className).toContain('[animation-delay:-0.15s]')
  })

  // TI-009
  it('third dot has no animation-delay', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    expect(dots[2].className).not.toContain('animation-delay')
  })

  // TI-010
  it('dots are rounded (rounded-full class)', () => {
    const { container } = render(<TypingIndicator />)
    const dots = container.querySelectorAll('span[aria-hidden="true"]')
    dots.forEach(dot => {
      expect(dot.className).toContain('rounded-full')
    })
  })

  // TI-011
  it('outer container has correct structural classes', () => {
    render(<TypingIndicator />)
    const el = screen.getByRole('status')
    expect(el.className).toContain('flex')
    expect(el.className).toContain('items-center')
    expect(el.className).toContain('gap-1')
  })
})
