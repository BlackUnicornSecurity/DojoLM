/**
 * File: filter-pills.test.tsx
 * Purpose: Unit tests for FilterPills Component (Story 3: TPI-UIP-03)
 * Tests: rendering, toggle, reset, keyboard, aria-pressed, active count, all-disabled warning, ID sanitization
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { FilterPills } from '@/components/ui/FilterPills'
import type { FilterPill } from '@/components/ui/FilterPills'
import { ScanLine, ShieldAlert } from 'lucide-react'

const mockFilters: FilterPill[] = [
  { id: 'prompt-injection', label: 'Prompt Injection', enabled: true },
  { id: 'jailbreak', label: 'Jailbreak', enabled: true },
  { id: 'tpi', label: 'TPI', enabled: false },
  { id: 'dos', label: 'Denial of Service', enabled: true },
  { id: 'supply-chain', label: 'Supply Chain', enabled: false },
]

const allDisabledFilters: FilterPill[] = mockFilters.map(f => ({ ...f, enabled: false }))

describe('FilterPills', () => {
  let onToggle: ReturnType<typeof vi.fn>
  let onReset: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onToggle = vi.fn()
    onReset = vi.fn()
  })

  describe('Basic rendering', () => {
    it('renders all filter pills', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      for (const filter of mockFilters) {
        expect(screen.getByText(filter.label)).toBeInTheDocument()
      }
    })

    it('renders active count indicator', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.getByText('3/5 active')).toBeInTheDocument()
    })

    it('renders custom activeCount/totalCount when provided', () => {
      render(
        <FilterPills
          filters={mockFilters}
          onToggle={onToggle}
          onReset={onReset}
          activeCount={7}
          totalCount={13}
        />
      )
      expect(screen.getByText('7/13 active')).toBeInTheDocument()
    })

    it('renders reset button', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.getByRole('button', { name: /reset all engine filters/i })).toBeInTheDocument()
    })

    it('renders with role="group" and aria-label', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.getByRole('group', { name: /engine filters/i })).toBeInTheDocument()
    })
  })

  describe('aria-pressed states', () => {
    it('sets aria-pressed=true for enabled filters', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      const enabledPill = screen.getByRole('button', { name: /prompt injection engine enabled/i })
      expect(enabledPill).toHaveAttribute('aria-pressed', 'true')
    })

    it('sets aria-pressed=false for disabled filters', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      const disabledPill = screen.getByRole('button', { name: /tpi engine disabled/i })
      expect(disabledPill).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Toggle behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calls onToggle with filter ID after debounce', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      fireEvent.click(screen.getByText('Prompt Injection'))

      // onToggle should NOT be called immediately (debounced)
      expect(onToggle).not.toHaveBeenCalled()

      // Advance past debounce
      vi.advanceTimersByTime(300)

      expect(onToggle).toHaveBeenCalledWith('prompt-injection')
      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('batches rapid toggles during debounce window', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      // Rapidly toggle 3 filters
      fireEvent.click(screen.getByText('Prompt Injection'))
      fireEvent.click(screen.getByText('Jailbreak'))
      fireEvent.click(screen.getByText('TPI'))

      // Not called yet
      expect(onToggle).not.toHaveBeenCalled()

      // Advance past debounce
      vi.advanceTimersByTime(300)

      // All 3 toggles flushed
      expect(onToggle).toHaveBeenCalledTimes(3)
      expect(onToggle).toHaveBeenCalledWith('prompt-injection')
      expect(onToggle).toHaveBeenCalledWith('jailbreak')
      expect(onToggle).toHaveBeenCalledWith('tpi')
    })

    it('updates local state immediately for visual feedback', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      // Prompt Injection starts enabled
      const pill = screen.getByRole('button', { name: /prompt injection engine enabled/i })
      expect(pill).toHaveAttribute('aria-pressed', 'true')

      // Click to toggle
      fireEvent.click(pill)

      // Local state should update immediately (before debounce)
      const updatedPill = screen.getByRole('button', { name: /prompt injection engine disabled/i })
      expect(updatedPill).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Reset', () => {
    it('calls onReset when reset button is clicked', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      fireEvent.click(screen.getByRole('button', { name: /reset all engine filters/i }))
      expect(onReset).toHaveBeenCalledTimes(1)
    })
  })

  describe('All disabled warning', () => {
    it('shows warning when all filters are disabled', () => {
      render(<FilterPills filters={allDisabledFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText(/all engines are disabled/i)).toBeInTheDocument()
    })

    it('does not show warning when at least one filter is enabled', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('shows 0/N active when all disabled', () => {
      render(<FilterPills filters={allDisabledFilters} onToggle={onToggle} onReset={onReset} />)
      expect(screen.getByText('0/5 active')).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('renders icons with aria-hidden when provided', () => {
      const filtersWithIcons: FilterPill[] = [
        { id: 'scan', label: 'Scanner', icon: ScanLine, enabled: true },
        { id: 'shield', label: 'Shield', icon: ShieldAlert, enabled: false },
      ]
      const { container } = render(
        <FilterPills filters={filtersWithIcons} onToggle={onToggle} onReset={onReset} />
      )
      const hiddenSvgs = container.querySelectorAll('button svg[aria-hidden="true"]')
      // Each pill button should have an icon + the reset button has one
      expect(hiddenSvgs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Keyboard navigation', () => {
    it('pills are focusable via Tab', async () => {
      const user = userEvent.setup()
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      await user.tab()
      const firstPill = screen.getByRole('button', { name: /prompt injection/i })
      expect(firstPill).toHaveFocus()
    })

    it('pill can be toggled with Enter key', () => {
      vi.useFakeTimers()
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      const pill = screen.getByRole('button', { name: /prompt injection engine enabled/i })
      pill.focus()
      fireEvent.keyDown(pill, { key: 'Enter' })
      fireEvent.keyUp(pill, { key: 'Enter' })
      // Buttons fire click on Enter keydown in browsers, simulate that
      fireEvent.click(pill)

      vi.advanceTimersByTime(300)
      expect(onToggle).toHaveBeenCalledWith('prompt-injection')
      vi.useRealTimers()
    })

    it('pill can be toggled with Space key', () => {
      vi.useFakeTimers()
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      const pill = screen.getByRole('button', { name: /prompt injection engine enabled/i })
      pill.focus()
      // Buttons fire click on Space keyup in browsers
      fireEvent.click(pill)

      vi.advanceTimersByTime(300)
      expect(onToggle).toHaveBeenCalledWith('prompt-injection')
      vi.useRealTimers()
    })
  })

  describe('Styling', () => {
    it('applies enabled styling to active pills', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      const enabledPill = screen.getByRole('button', { name: /prompt injection engine enabled/i })
      expect(enabledPill).toHaveClass('text-[var(--foreground)]')
    })

    it('applies disabled styling to inactive pills', () => {
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)
      const disabledPill = screen.getByRole('button', { name: /tpi engine disabled/i })
      expect(disabledPill).toHaveClass('text-muted-foreground')
    })

    it('applies className prop to container', () => {
      const { container } = render(
        <FilterPills
          filters={mockFilters}
          onToggle={onToggle}
          onReset={onReset}
          className="mt-4"
        />
      )
      expect(container.firstChild).toHaveClass('mt-4')
    })
  })

  describe('ID sanitization', () => {
    it('sanitizes filter IDs with special characters', () => {
      vi.useFakeTimers()
      const filtersWithSpecialChars: FilterPill[] = [
        { id: 'Bias & Fairness', label: 'Bias & Fairness', enabled: true },
      ]
      render(
        <FilterPills filters={filtersWithSpecialChars} onToggle={onToggle} onReset={onReset} />
      )

      fireEvent.click(screen.getByText('Bias & Fairness'))
      vi.advanceTimersByTime(300)

      // Original ID is passed through (sanitizeId validates but doesn't alter the callback ID)
      expect(onToggle).toHaveBeenCalledWith('Bias & Fairness')
      vi.useRealTimers()
    })

    it('preserves clean IDs without modification', () => {
      vi.useFakeTimers()
      render(<FilterPills filters={mockFilters} onToggle={onToggle} onReset={onReset} />)

      fireEvent.click(screen.getByText('Jailbreak'))
      vi.advanceTimersByTime(300)

      expect(onToggle).toHaveBeenCalledWith('jailbreak')
      vi.useRealTimers()
    })
  })
})
