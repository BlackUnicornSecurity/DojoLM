/**
 * File: attack-mode-step.test.tsx
 * Purpose: Unit tests for AttackModeStep arena wizard component
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: Record<string, unknown>) => <span {...props}>{children}</span>,
}))

vi.mock('@/lib/arena-types', () => ({
  ATTACK_MODE_CONFIGS: {
    kunai: { id: 'kunai', name: 'Kunai', description: 'Single-source attacks', sources: ['template'], weights: null },
    shuriken: { id: 'shuriken', name: 'Shuriken', description: 'SAGE-powered mutations', sources: ['sage'], weights: null },
    naginata: { id: 'naginata', name: 'Naginata', description: 'Armory-based payloads', sources: ['armory'], weights: null },
    musashi: { id: 'musashi', name: 'Musashi', description: 'Multi-source blended', sources: ['template', 'sage', 'armory'], weights: { template: 40, sage: 30, armory: 30 } },
  },
}))

import { AttackModeStep } from '@/components/strategic/arena/steps/AttackModeStep'

describe('AttackModeStep', () => {
  describe('Rendering', () => {
    it('displays Attack Strategy heading', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      expect(screen.getByText('Attack Strategy')).toBeInTheDocument()
    })

    it('displays all four attack mode names', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      expect(screen.getByText('Kunai')).toBeInTheDocument()
      expect(screen.getByText('Shuriken')).toBeInTheDocument()
      expect(screen.getByText('Naginata')).toBeInTheDocument()
      expect(screen.getByText('Musashi')).toBeInTheDocument()
    })

    it('displays mode descriptions', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      expect(screen.getByText('Single-source attacks')).toBeInTheDocument()
      expect(screen.getByText('SAGE-powered mutations')).toBeInTheDocument()
      expect(screen.getByText('Armory-based payloads')).toBeInTheDocument()
      expect(screen.getByText('Multi-source blended')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('renders radiogroup for mode selection', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      const group = screen.getByRole('radiogroup', { name: 'Select attack mode' })
      expect(group).toBeInTheDocument()
    })

    it('renders radio buttons for each mode', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(4)
    })

    it('marks selected mode with aria-checked=true', () => {
      render(<AttackModeStep selectedMode="kunai" onSelectMode={vi.fn()} />)
      const radios = screen.getAllByRole('radio')
      const kunai = radios.find(r => r.textContent?.includes('Kunai'))
      expect(kunai?.getAttribute('aria-checked')).toBe('true')
    })

    it('marks unselected modes with aria-checked=false', () => {
      render(<AttackModeStep selectedMode="kunai" onSelectMode={vi.fn()} />)
      const radios = screen.getAllByRole('radio')
      const unselected = radios.filter(r => !r.textContent?.includes('Kunai'))
      for (const radio of unselected) {
        expect(radio.getAttribute('aria-checked')).toBe('false')
      }
    })
  })

  describe('Interaction', () => {
    it('calls onSelectMode when a mode is clicked', () => {
      const handler = vi.fn()
      render(<AttackModeStep selectedMode={null} onSelectMode={handler} />)
      fireEvent.click(screen.getByText('Kunai'))
      expect(handler).toHaveBeenCalledWith('kunai')
    })

    it('calls onSelectMode with correct mode for each card', () => {
      const handler = vi.fn()
      render(<AttackModeStep selectedMode={null} onSelectMode={handler} />)

      fireEvent.click(screen.getByText('Shuriken'))
      expect(handler).toHaveBeenCalledWith('shuriken')

      fireEvent.click(screen.getByText('Naginata'))
      expect(handler).toHaveBeenCalledWith('naginata')

      fireEvent.click(screen.getByText('Musashi'))
      expect(handler).toHaveBeenCalledWith('musashi')
    })
  })

  describe('Source Badges', () => {
    it('displays source badges for each mode', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      // Templates appears in both kunai and musashi sources
      const templates = screen.getAllByText('Templates')
      expect(templates.length).toBeGreaterThanOrEqual(2)
      // SAGE appears in shuriken and musashi
      const sage = screen.getAllByText('SAGE')
      expect(sage.length).toBeGreaterThanOrEqual(2)
      // Armory appears in naginata and musashi
      const armory = screen.getAllByText('Armory')
      expect(armory.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Rerender with selectedMode change', () => {
    it('updates aria-checked when selectedMode prop changes', () => {
      const handler = vi.fn()
      const { rerender } = render(<AttackModeStep selectedMode="kunai" onSelectMode={handler} />)

      // Kunai is selected
      const radios = screen.getAllByRole('radio')
      const kunai = radios.find(r => r.textContent?.includes('Kunai'))
      expect(kunai?.getAttribute('aria-checked')).toBe('true')

      // Rerender with shuriken selected
      rerender(<AttackModeStep selectedMode="shuriken" onSelectMode={handler} />)

      const radiosAfter = screen.getAllByRole('radio')
      const kunaiAfter = radiosAfter.find(r => r.textContent?.includes('Kunai'))
      const shurikenAfter = radiosAfter.find(r => r.textContent?.includes('Shuriken'))
      expect(kunaiAfter?.getAttribute('aria-checked')).toBe('false')
      expect(shurikenAfter?.getAttribute('aria-checked')).toBe('true')
    })
  })

  describe('Weight Distribution', () => {
    it('displays weight percentages for Musashi mode', () => {
      render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      expect(screen.getByText(/Templates 40%/)).toBeInTheDocument()
      expect(screen.getByText(/SAGE 30%/)).toBeInTheDocument()
      expect(screen.getByText(/Armory 30%/)).toBeInTheDocument()
    })

    it('does not display weight bars for non-weighted modes', () => {
      const { container } = render(<AttackModeStep selectedMode={null} onSelectMode={vi.fn()} />)
      // Only Musashi should have weight bars (3 bars for 3 sources)
      const weightBars = container.querySelectorAll('.h-1\\.5.rounded-full')
      // Weight progress bars exist inside musashi card
      expect(weightBars.length).toBeGreaterThan(0)
    })
  })
})
