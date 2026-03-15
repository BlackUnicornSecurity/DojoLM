/**
 * File: empty-state-enhanced.test.tsx
 * Purpose: Unit tests for enhanced EmptyState component + dojo-flavored presets
 * Story: TPI-NODA-9.6
 * Index:
 * - Basic rendering (line 13)
 * - Illustration prop (line 39)
 * - Hint prop (line 55)
 * - Action button (line 69)
 * - Animation & Motion (line 86)
 * - Presets (line 103)
 * - Accessibility (line 133)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EmptyState, emptyStatePresets } from '@/components/ui/EmptyState'

describe('EmptyState', () => {
  describe('Basic rendering', () => {
    it('renders title', () => {
      render(<EmptyState title="No data" description="Nothing here" />)
      expect(screen.getByText('No data')).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<EmptyState title="No data" description="Nothing to show" />)
      expect(screen.getByText('Nothing to show')).toBeInTheDocument()
    })

    it('renders default icon (SearchX) as aria-hidden', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      const icons = container.querySelectorAll('[aria-hidden="true"]')
      expect(icons.length).toBeGreaterThan(0)
    })

    it('renders in a centered flex container', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('flex')
      expect(root).toHaveClass('flex-col')
      expect(root).toHaveClass('items-center')
      expect(root).toHaveClass('text-center')
    })

    it('passes custom className', () => {
      const { container } = render(
        <EmptyState title="Test" description="Desc" className="custom-empty" />
      )
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('custom-empty')
    })
  })

  describe('Illustration prop', () => {
    it('renders illustration when provided', () => {
      render(
        <EmptyState
          title="Test"
          description="Desc"
          illustration={<svg data-testid="custom-svg" />}
        />
      )
      expect(screen.getByTestId('custom-svg')).toBeInTheDocument()
    })

    it('does not render illustration wrapper when not provided', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      // The illustration wrapper has animationDelay: 50ms
      const illustrationWrappers = Array.from(container.querySelectorAll('div')).filter(
        el => el.style.animationDelay === '50ms'
      )
      expect(illustrationWrappers).toHaveLength(0)
    })
  })

  describe('Hint prop', () => {
    it('renders hint text when provided', () => {
      render(<EmptyState title="Test" description="Desc" hint="Try something else" />)
      expect(screen.getByText('Try something else')).toBeInTheDocument()
    })

    it('does not render hint when not provided', () => {
      render(<EmptyState title="Test" description="Desc" />)
      // Only title and description text should be present
      const paragraphs = screen.getAllByText(/.+/)
      expect(paragraphs.some(p => p.classList.contains('text-xs'))).toBe(false)
    })
  })

  describe('Action button', () => {
    it('renders action button when provided', () => {
      const onClick = vi.fn()
      render(
        <EmptyState title="Test" description="Desc" action={{ label: 'Try Again', onClick }} />
      )
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('fires onClick when action button clicked', () => {
      const onClick = vi.fn()
      render(
        <EmptyState title="Test" description="Desc" action={{ label: 'Retry', onClick }} />
      )
      fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not render button when action is not provided', () => {
      render(<EmptyState title="Test" description="Desc" />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('Animation & Motion', () => {
    it('root has motion-safe:animate-fade-in class', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('motion-safe:animate-fade-in')
    })

    it('icon container has animation-delay of 100ms', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      // Find the icon wrapper (rounded-full div)
      const iconWrapper = container.querySelector('.rounded-full') as HTMLElement
      expect(iconWrapper.style.animationDelay).toBe('100ms')
    })

    it('title has animation-delay of 150ms', () => {
      render(<EmptyState title="Test Title" description="Desc" />)
      const title = screen.getByText('Test Title')
      expect(title.style.animationDelay).toBe('150ms')
    })

    it('description has animation-delay of 200ms', () => {
      render(<EmptyState title="Test" description="Test Description" />)
      const desc = screen.getByText('Test Description')
      expect(desc.style.animationDelay).toBe('200ms')
    })
  })

  describe('Presets', () => {
    it('noScans preset has dojo title', () => {
      expect(emptyStatePresets.noScans.title).toBe('The dojo is quiet')
    })

    it('noTests preset has correct title', () => {
      expect(emptyStatePresets.noTests.title).toBe('No test sessions recorded')
    })

    it('noResults preset has correct title', () => {
      expect(emptyStatePresets.noResults.title).toBe('No matches found')
    })

    it('noData preset has correct title', () => {
      expect(emptyStatePresets.noData.title).toBe('No sessions yet')
    })

    it('noScans renders correctly via spread', () => {
      render(<EmptyState {...emptyStatePresets.noScans} />)
      expect(screen.getByText('The dojo is quiet')).toBeInTheDocument()
    })

    it('noTests renders correctly via spread', () => {
      render(<EmptyState {...emptyStatePresets.noTests} />)
      expect(screen.getByText('No test sessions recorded')).toBeInTheDocument()
    })

    it('all presets have description text', () => {
      for (const [, preset] of Object.entries(emptyStatePresets)) {
        expect(preset.description).toBeTruthy()
        expect(preset.description.length).toBeGreaterThan(10)
      }
    })

    it('all presets have an icon', () => {
      for (const [, preset] of Object.entries(emptyStatePresets)) {
        expect(preset.icon).toBeDefined()
      }
    })
  })

  describe('Accessibility', () => {
    it('icon is marked aria-hidden', () => {
      const { container } = render(<EmptyState title="Test" description="Desc" />)
      const hiddenIcons = container.querySelectorAll('svg[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })

    it('title is rendered as h3 heading', () => {
      render(<EmptyState title="Empty Title" description="Desc" />)
      const heading = screen.getByRole('heading', { level: 3 })
      expect(heading).toHaveTextContent('Empty Title')
    })
  })
})
