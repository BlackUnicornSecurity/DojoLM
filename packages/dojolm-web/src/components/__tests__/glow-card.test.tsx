/**
 * File: glow-card.test.tsx
 * Purpose: Unit tests for GlowCard wrapper component (Story 4: TPI-UIP-04)
 * Tests: glow variants render correct classes/styles, forwardRef, Card isolation, no layout shift
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createRef } from 'react'
import { GlowCard } from '@/components/ui/GlowCard'
import { Card } from '@/components/ui/card'

describe('GlowCard', () => {
  describe('Glow variant rendering', () => {
    it('renders children correctly', () => {
      render(<GlowCard>Test content</GlowCard>)
      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('defaults to glow="none" — does not set inline box-shadow', () => {
      const { container } = render(<GlowCard>Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('')
    })

    it('applies subtle glow box-shadow', () => {
      const { container } = render(<GlowCard glow="subtle">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('inset 0 1px 0 0 var(--overlay-subtle)')
    })

    it('applies accent glow box-shadow', () => {
      const { container } = render(<GlowCard glow="accent">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('var(--shadow-glow-primary)')
    })

    it('applies glow-card-input class for input variant', () => {
      const { container } = render(<GlowCard glow="input">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('glow-card-input')
      // input variant uses CSS pseudo-element, no inline box-shadow
      expect(card.style.boxShadow).toBe('')
    })

    it('does not apply glow-card-input class for non-input variants', () => {
      const { container } = render(<GlowCard glow="subtle">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card).not.toHaveClass('glow-card-input')
    })
  })

  describe('Position and overflow', () => {
    it('always applies relative positioning', () => {
      const { container } = render(<GlowCard>Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('relative')
    })

    it('applies overflow-visible only for input variant', () => {
      const { container: inputContainer } = render(<GlowCard glow="input">Content</GlowCard>)
      const inputCard = inputContainer.firstElementChild as HTMLElement
      expect(inputCard).toHaveClass('overflow-visible')

      const { container: subtleContainer } = render(<GlowCard glow="subtle">Content</GlowCard>)
      const subtleCard = subtleContainer.firstElementChild as HTMLElement
      expect(subtleCard).not.toHaveClass('overflow-visible')

      const { container: noneContainer } = render(<GlowCard glow="none">Content</GlowCard>)
      const noneCard = noneContainer.firstElementChild as HTMLElement
      expect(noneCard).not.toHaveClass('overflow-visible')
    })

    it('applies relative on all glow variants', () => {
      const variants = ['none', 'subtle', 'accent', 'input'] as const
      for (const glow of variants) {
        const { container } = render(<GlowCard glow={glow}>Content</GlowCard>)
        const card = container.firstElementChild as HTMLElement
        expect(card).toHaveClass('relative')
      }
    })
  })

  describe('forwardRef support', () => {
    it('forwards ref to the underlying Card element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<GlowCard ref={ref}>Content</GlowCard>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('has correct displayName for debugging', () => {
      expect(GlowCard.displayName).toBe('GlowCard')
    })
  })

  describe('className and style passthrough', () => {
    it('passes additional className through to Card', () => {
      const { container } = render(
        <GlowCard className="my-custom-class">Content</GlowCard>
      )
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('my-custom-class')
    })

    it('merges inline styles with glow box-shadow', () => {
      const { container } = render(
        <GlowCard glow="subtle" style={{ borderLeftColor: 'red' }}>Content</GlowCard>
      )
      const card = container.firstElementChild as HTMLElement
      expect(card.style.borderLeftColor).toBe('red')
      expect(card.style.boxShadow).toBe('inset 0 1px 0 0 var(--overlay-subtle)')
    })

    it('glow box-shadow takes precedence over user style.boxShadow', () => {
      const { container } = render(
        <GlowCard glow="subtle" style={{ boxShadow: 'none' }}>Content</GlowCard>
      )
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('inset 0 1px 0 0 var(--overlay-subtle)')
    })
  })

  describe('Card composition (card.tsx not modified)', () => {
    it('renders as a Card element (div with card classes)', () => {
      const { container } = render(<GlowCard>Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('rounded-xl')
      expect(card).toHaveClass('border')
      expect(card).toHaveClass('shadow-sm')
    })

    it('does not modify Card internal behavior', () => {
      render(
        <GlowCard glow="accent">
          <div data-testid="inner">Inner content</div>
        </GlowCard>
      )
      expect(screen.getByTestId('inner')).toBeInTheDocument()
      expect(screen.getByTestId('inner').textContent).toBe('Inner content')
    })

    it('bare Card has no glow classes (card.tsx unmodified)', () => {
      const { container } = render(<Card>Base card</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).not.toHaveClass('glow-card-input')
      expect(card).not.toHaveClass('overflow-visible')
      // relative is NOT a native Card class
      expect(card.className).not.toContain('relative')
    })

    it('existing Card consumers are unaffected by GlowCard', () => {
      const { container: cardContainer } = render(<Card>Bare</Card>)
      const { container: glowContainer } = render(<GlowCard glow="none">Wrapped</GlowCard>)

      const bareCard = cardContainer.firstElementChild as HTMLElement
      const glowCard = glowContainer.firstElementChild as HTMLElement

      // Both should have Card's core classes
      expect(bareCard).toHaveClass('rounded-xl')
      expect(glowCard).toHaveClass('rounded-xl')

      // Only GlowCard adds relative
      expect(glowCard).toHaveClass('relative')
      expect(bareCard.className).not.toContain('relative')
    })
  })
})
