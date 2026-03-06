/**
 * File: card-hover.test.tsx
 * Purpose: Unit tests verifying Card hover isolation from GlowCard (no double-transform)
 * Story: TPI-NODA-9.4, TPI-NODA-9.5, BMAD review fix #2
 * Index:
 * - Card base classes (line 13)
 * - Card hover isolation (line 36)
 * - GlowCard composition (line 56)
 * - Card variants (line 79)
 */

import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'

describe('Card hover isolation (BMAD review fix #2)', () => {
  describe('Card base classes', () => {
    it('has rounded-lg border', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
    })

    it('has shadow-sm', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('shadow-sm')
    })

    it('has motion-safe transition for border-color', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('motion-safe:transition-[border-color]')
    })

    it('has hover border color change', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('motion-safe:hover:border-[rgba(255,255,255,0.08)]')
    })
  })

  describe('Card hover isolation — no transform or box-shadow', () => {
    it('does NOT have hover translate-y class', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).not.toContain('hover:-translate-y')
      expect(card.className).not.toContain('hover:translate-y')
    })

    it('does NOT have hover shadow-[0_8px_24px] class', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).not.toContain('hover:shadow-[0_8px_24px')
    })

    it('does NOT transition transform or box-shadow', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).not.toContain('transition-[transform')
      expect(card.className).not.toContain('transition-[box-shadow')
    })
  })

  describe('GlowCard composition', () => {
    it('GlowCard inner element has relative class', () => {
      const { container } = render(<GlowCard>Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('relative')
    })

    it('bare Card does not have relative class', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).not.toContain('relative')
    })

    it('GlowCard accent glow applied via inline style, not Tailwind', () => {
      const { container } = render(<GlowCard glow="accent">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('0 -1px 16px -5px rgba(198,40,40,0.2)')
    })

    it('GlowCard none glow has no inline box-shadow', () => {
      const { container } = render(<GlowCard glow="none">Content</GlowCard>)
      const card = container.firstElementChild as HTMLElement
      expect(card.style.boxShadow).toBe('')
    })

    it('Card inside GlowCard shares core Card classes', () => {
      const { container: bareContainer } = render(<Card>Bare</Card>)
      const { container: glowContainer } = render(<GlowCard>Wrapped</GlowCard>)
      const bareCard = bareContainer.firstElementChild as HTMLElement
      const glowCard = glowContainer.firstElementChild as HTMLElement
      expect(bareCard).toHaveClass('rounded-lg')
      expect(glowCard).toHaveClass('rounded-lg')
      expect(bareCard).toHaveClass('bg-card')
      expect(glowCard).toHaveClass('bg-card')
    })
  })

  describe('Card variants', () => {
    it('default variant has no glass-card class', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).not.toHaveClass('glass-card')
    })

    it('glass variant has glass-card class', () => {
      const { container } = render(<Card variant="glass">Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('glass-card')
    })

    it('custom className passes through', () => {
      const { container } = render(<Card className="custom-card">Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('custom-card')
    })
  })
})
