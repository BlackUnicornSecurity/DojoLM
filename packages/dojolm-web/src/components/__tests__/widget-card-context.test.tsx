/**
 * File: widget-card-context.test.tsx
 * Purpose: Unit tests for WidgetCard priority/glow context system
 * Story: TPI-NODA-9.5, BMAD review fix #12
 * Index:
 * - Default rendering (line 16)
 * - Priority tiers (line 33)
 * - Glow integration (line 77)
 * - Context system (line 100)
 * - Props passthrough (line 133)
 * - Padding correctness (line 153)
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }, { id: 'scanner' }],
}))

import { WidgetCard, WidgetMetaProvider } from '@/components/dashboard/WidgetCard'

describe('WidgetCard', () => {
  describe('Default rendering', () => {
    it('renders title text', () => {
      render(<WidgetCard title="Test Widget">Content</WidgetCard>)
      expect(screen.getByText('Test Widget')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(<WidgetCard title="Widget">Child Content</WidgetCard>)
      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    it('renders with overflow-hidden class', () => {
      const { container } = render(<WidgetCard title="Widget">Content</WidgetCard>)
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('overflow-hidden')
    })
  })

  describe('Priority tiers', () => {
    it('hero priority adds widget-hero-border class and elevated bg', () => {
      const { container } = render(
        <WidgetCard title="Hero Widget" priority="hero">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('widget-hero-border')
    })

    it('hero priority title has text-lg and font-bold', () => {
      render(<WidgetCard title="Hero Widget" priority="hero">Content</WidgetCard>)
      const title = screen.getByText('Hero Widget')
      expect(title).toHaveClass('text-lg')
      expect(title).toHaveClass('font-bold')
    })

    it('standard priority title has text-sm and font-semibold', () => {
      render(<WidgetCard title="Standard Widget" priority="standard">Content</WidgetCard>)
      const title = screen.getByText('Standard Widget')
      expect(title).toHaveClass('text-sm')
      expect(title).toHaveClass('font-semibold')
    })

    it('compact priority title has text-xs and font-semibold', () => {
      render(<WidgetCard title="Compact Widget" priority="compact">Content</WidgetCard>)
      const title = screen.getByText('Compact Widget')
      expect(title).toHaveClass('text-xs')
      expect(title).toHaveClass('font-semibold')
    })

    it('standard priority does not add widget-hero-border', () => {
      const { container } = render(
        <WidgetCard title="Standard" priority="standard">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).not.toHaveClass('widget-hero-border')
    })

    it('compact priority does not add widget-hero-border', () => {
      const { container } = render(
        <WidgetCard title="Compact" priority="compact">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).not.toHaveClass('widget-hero-border')
    })
  })

  describe('Glow integration', () => {
    it('wraps content in GlowCard (relative class present)', () => {
      const { container } = render(<WidgetCard title="Widget">Content</WidgetCard>)
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('relative')
    })

    it('passes glow="accent" to GlowCard', () => {
      const { container } = render(
        <WidgetCard title="Widget" glow="accent">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      // Train 1 token consolidation: shadow-glow-primary token deleted, dojo-primary glow inlined
      expect(root.style.boxShadow).toContain('204, 58, 47')
    })

    it('defaults to glow="none" (no inline box-shadow)', () => {
      const { container } = render(<WidgetCard title="Widget">Content</WidgetCard>)
      const root = container.firstElementChild as HTMLElement
      expect(root.style.boxShadow).toBe('')
    })
  })

  describe('Context system (WidgetMetaProvider)', () => {
    it('inherits priority from WidgetMetaProvider', () => {
      render(
        <WidgetMetaProvider priority="hero" glow="none">
          <WidgetCard title="Context Hero">Content</WidgetCard>
        </WidgetMetaProvider>
      )
      const title = screen.getByText('Context Hero')
      expect(title).toHaveClass('text-lg')
      expect(title).toHaveClass('font-bold')
    })

    it('inherits glow from WidgetMetaProvider', () => {
      const { container } = render(
        <WidgetMetaProvider priority="standard" glow="accent">
          <WidgetCard title="Context Glow">Content</WidgetCard>
        </WidgetMetaProvider>
      )
      const root = container.firstElementChild as HTMLElement
      // Train 1 token consolidation: shadow-glow-primary token deleted, dojo-primary glow inlined
      expect(root.style.boxShadow).toContain('204, 58, 47')
    })

    it('explicit priority prop overrides context', () => {
      render(
        <WidgetMetaProvider priority="hero" glow="none">
          <WidgetCard title="Override" priority="compact">Content</WidgetCard>
        </WidgetMetaProvider>
      )
      const title = screen.getByText('Override')
      expect(title).toHaveClass('text-xs')
    })

    it('explicit glow prop overrides context', () => {
      const { container } = render(
        <WidgetMetaProvider priority="standard" glow="accent">
          <WidgetCard title="Override" glow="none">Content</WidgetCard>
        </WidgetMetaProvider>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root.style.boxShadow).toBe('')
    })
  })

  describe('Props passthrough', () => {
    it('actions slot renders beside title', () => {
      render(
        <WidgetCard title="Widget" actions={<button>Action</button>}>Content</WidgetCard>
      )
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('actions not rendered when not provided', () => {
      render(<WidgetCard title="Widget">Content</WidgetCard>)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('passes custom className to root', () => {
      const { container } = render(
        <WidgetCard title="Widget" className="custom-class">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('custom-class')
    })
  })

  describe('Padding correctness (KASHIWA Story 4.2 — compact breathing room)', () => {
    it('hero header uses pt-3 px-4 pb-1.5', () => {
      const { container } = render(
        <WidgetCard title="Hero" priority="hero">Content</WidgetCard>
      )
      const header = container.querySelector('[class*="flex"][class*="flex-row"]') as HTMLElement
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('pt-3')
      expect(header).toHaveClass('px-4')
    })

    it('compact header uses pt-3 px-4 pb-1.5', () => {
      const { container } = render(
        <WidgetCard title="Compact" priority="compact">Content</WidgetCard>
      )
      const header = container.querySelector('[class*="flex"][class*="flex-row"]') as HTMLElement
      expect(header).toHaveClass('pt-3')
      expect(header).toHaveClass('px-4')
    })

    it('hero/standard tiers have header/content divider', () => {
      const { container } = render(
        <WidgetCard title="Hero" priority="hero">Content</WidgetCard>
      )
      const divider = container.querySelector('.mx-4.h-px') as HTMLElement
      expect(divider).toBeInTheDocument()
    })

    it('compact tier has no header/content divider', () => {
      const { container } = render(
        <WidgetCard title="Compact" priority="compact">Content</WidgetCard>
      )
      const divider = container.querySelector('.mx-4.h-px') as HTMLElement
      expect(divider).not.toBeInTheDocument()
    })

    it('hover lift classes applied', () => {
      const { container } = render(
        <WidgetCard title="Widget">Content</WidgetCard>
      )
      const root = container.firstElementChild as HTMLElement
      expect(root.className).toContain('motion-safe:hover:-translate-y-px')
      expect(root.className).toContain('motion-safe:hover:shadow-md')
    })
  })
})
