/**
 * File: guard-mode-selector.test.tsx
 * Purpose: Tests for GuardModeSelector component
 * Index:
 * - Rendering tests (line 30)
 * - Enable/disable toggle tests (line 60)
 * - Mode selection tests (line 90)
 * - Block threshold tests (line 120)
 * - Disabled state tests (line 145)
 * - Accessibility tests (line 165)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSetMode = vi.fn()
const mockSetEnabled = vi.fn()
const mockSetBlockThreshold = vi.fn()

// Mock useGuard context
vi.mock('@/lib/contexts/GuardContext', () => ({
  useGuard: () => ({
    config: mockConfig,
    setMode: mockSetMode,
    setEnabled: mockSetEnabled,
    setBlockThreshold: mockSetBlockThreshold,
  }),
}))

// Mock GlowCard to just render children
vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glow-card" className={className}>{children}</div>
  ),
}))

import { GuardModeSelector } from '@/components/guard/GuardModeSelector'

let mockConfig = {
  enabled: true,
  mode: 'shinobi' as const,
  blockThreshold: 'WARNING' as const,
  engines: null,
  persist: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockConfig = {
    enabled: true,
    mode: 'shinobi' as const,
    blockThreshold: 'WARNING' as const,
    engines: null,
    persist: false,
  }
})

describe('GuardModeSelector', () => {
  describe('Rendering', () => {
    it('renders the enable/disable toggle button', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText('Guard Active')).toBeInTheDocument()
    })

    it('renders all four guard mode cards', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText('Shinobi')).toBeInTheDocument()
      expect(screen.getByText('Samurai')).toBeInTheDocument()
      expect(screen.getByText('Sensei')).toBeInTheDocument()
      expect(screen.getByText('Hattori')).toBeInTheDocument()
    })

    it('renders mode subtitles', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText('Stealth Monitor')).toBeInTheDocument()
      expect(screen.getByText('Active Defense')).toBeInTheDocument()
      expect(screen.getByText('Aggressive Defense')).toBeInTheDocument()
      expect(screen.getByText('Full Protection')).toBeInTheDocument()
    })

    it('renders mode descriptions', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText(/Stealth monitoring/)).toBeInTheDocument()
      expect(screen.getByText(/Active defense/)).toBeInTheDocument()
    })

    it('renders mode cards in a radiogroup', () => {
      render(<GuardModeSelector />)
      expect(screen.getByRole('radiogroup', { name: 'Guard mode selection' })).toBeInTheDocument()
    })
  })

  describe('Enable/disable toggle', () => {
    it('shows "Guard Active" when enabled', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText('Guard Active')).toBeInTheDocument()
    })

    it('shows "Guard Off" when disabled', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      expect(screen.getByText('Guard Off')).toBeInTheDocument()
    })

    it('calls setEnabled(false) when clicking active toggle', () => {
      render(<GuardModeSelector />)
      fireEvent.click(screen.getByText('Guard Active'))
      expect(mockSetEnabled).toHaveBeenCalledWith(false)
    })

    it('calls setEnabled(true) when clicking inactive toggle', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      fireEvent.click(screen.getByText('Guard Off'))
      expect(mockSetEnabled).toHaveBeenCalledWith(true)
    })
  })

  describe('Mode selection', () => {
    it('marks the active mode with aria-checked=true', () => {
      render(<GuardModeSelector />)
      const shinobiRadio = screen.getByRole('radio', { name: /Shinobi/ })
      expect(shinobiRadio).toHaveAttribute('aria-checked', 'true')
    })

    it('marks inactive modes with aria-checked=false', () => {
      render(<GuardModeSelector />)
      const samuraiRadio = screen.getByRole('radio', { name: /Samurai/ })
      expect(samuraiRadio).toHaveAttribute('aria-checked', 'false')
    })

    it('calls setMode when clicking a mode card', () => {
      render(<GuardModeSelector />)
      const hattoriRadio = screen.getByRole('radio', { name: /Hattori/ })
      fireEvent.click(hattoriRadio)
      expect(mockSetMode).toHaveBeenCalledWith('hattori')
    })

    it('renders scan indicators for each mode', () => {
      render(<GuardModeSelector />)
      // Shinobi: IN ON, OUT OFF
      const inOns = screen.getAllByText('IN ON')
      expect(inOns.length).toBeGreaterThanOrEqual(1)
      const outOffs = screen.getAllByText('OUT OFF')
      expect(outOffs.length).toBeGreaterThanOrEqual(1)
    })

    it('renders BLOCK indicator for modes that can block', () => {
      render(<GuardModeSelector />)
      const blockBadges = screen.getAllByText('BLOCK')
      // Samurai, Sensei, Hattori can block = 3
      expect(blockBadges.length).toBe(3)
    })
  })

  describe('Block threshold', () => {
    it('renders threshold buttons when guard is enabled', () => {
      render(<GuardModeSelector />)
      expect(screen.getByText('WARNING+')).toBeInTheDocument()
      expect(screen.getByText('CRITICAL only')).toBeInTheDocument()
    })

    it('hides threshold buttons when guard is disabled', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      expect(screen.queryByText('WARNING+')).not.toBeInTheDocument()
      expect(screen.queryByText('CRITICAL only')).not.toBeInTheDocument()
    })

    it('calls setBlockThreshold("CRITICAL") when clicking CRITICAL button', () => {
      render(<GuardModeSelector />)
      fireEvent.click(screen.getByText('CRITICAL only'))
      expect(mockSetBlockThreshold).toHaveBeenCalledWith('CRITICAL')
    })

    it('calls setBlockThreshold("WARNING") when clicking WARNING button', () => {
      mockConfig.blockThreshold = 'CRITICAL'
      render(<GuardModeSelector />)
      fireEvent.click(screen.getByText('WARNING+'))
      expect(mockSetBlockThreshold).toHaveBeenCalledWith('WARNING')
    })

    it('marks active threshold with aria-pressed=true', () => {
      render(<GuardModeSelector />)
      expect(screen.getByLabelText(/Block on WARNING/)).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByLabelText(/Block on CRITICAL/)).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Disabled state', () => {
    it('disables mode radio buttons when guard is disabled', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      const radios = screen.getAllByRole('radio')
      radios.forEach(radio => {
        expect(radio).toBeDisabled()
      })
    })

    it('mode cards have opacity when disabled', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      const radios = screen.getAllByRole('radio')
      radios.forEach(radio => {
        expect(radio.className).toContain('opacity-50')
      })
    })
  })

  describe('Accessibility', () => {
    it('toggle button has aria-pressed attribute', () => {
      render(<GuardModeSelector />)
      const toggle = screen.getByLabelText(/Guard enabled/)
      expect(toggle).toHaveAttribute('aria-pressed', 'true')
    })

    it('toggle button has descriptive aria-label when disabled', () => {
      mockConfig.enabled = false
      render(<GuardModeSelector />)
      const toggle = screen.getByLabelText(/Guard disabled/)
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
    })

    it('mode radio buttons have descriptive aria-labels', () => {
      render(<GuardModeSelector />)
      expect(screen.getByLabelText(/Select Shinobi mode/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select Samurai mode/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select Sensei mode/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Select Hattori mode/)).toBeInTheDocument()
    })
  })
})
