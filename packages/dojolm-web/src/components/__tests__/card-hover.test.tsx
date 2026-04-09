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
      // Train 1 PR-3: rounded-xl → rounded-lg (BUCC-mem0 radius scale)
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
    })

    it('has shadow-card token', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('shadow-[var(--shadow-card)]')
    })

    // Train 1 PR-3: multi-property motion stack collapsed to transition-colors
    // (card lift effect preserved via motion-safe:hover:-translate-y-1)
    it('has color transition for hover state', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('transition-colors')
    })

    it('has hover border color change', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('motion-safe:hover:border-[var(--overlay-hover)]')
    })
  })

  describe('Card hover effects (A4 remediation — NODA Story 1.7.2)', () => {
    it('has hover translate-y-1 lift', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('motion-safe:hover:-translate-y-1')
    })

    it('has hover shadow-card-hover enhancement', () => {
      const { container } = render(<Card>Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card.className).toContain('motion-safe:hover:shadow-[var(--shadow-card-hover)]')
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
      // Train 1 token consolidation: shadow-glow-primary token deleted, dojo-primary glow inlined
      expect(card.style.boxShadow).toContain('204, 58, 47')
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

    // Train 1 PR-3: surface-hero / surface-alert utility classes deleted in PR-1.
    // Variants kept for API back-compat but render the same as default.
    // Once variant-specific tinting is reintroduced (if ever), re-add assertions.
    it('hero variant renders without crashing', () => {
      const { container } = render(<Card variant="hero">Content</Card>)
      expect(container.firstElementChild).toBeTruthy()
    })

    it('alert variant renders without crashing', () => {
      const { container } = render(<Card variant="alert">Content</Card>)
      expect(container.firstElementChild).toBeTruthy()
    })

    it('custom className passes through', () => {
      const { container } = render(<Card className="custom-card">Content</Card>)
      const card = container.firstElementChild as HTMLElement
      expect(card).toHaveClass('custom-card')
    })
  })
})
