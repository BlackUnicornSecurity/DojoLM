/**
 * File: dojo-readiness.test.tsx
 * Purpose: Unit tests for DojoReadiness onboarding widget
 * Story: TPI-NODA-9.6
 * Index:
 * - Rendering (line 22)
 * - Readiness items (line 42)
 * - Dismiss behavior (line 73)
 * - Navigation (line 88)
 * - Accessibility (line 105)
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DojoReadiness } from '@/components/dashboard/widgets/DojoReadiness'

// Mock NavigationContext
const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    activeTab: 'dashboard',
    setActiveTab: mockSetActiveTab,
  }),
}))

beforeEach(() => {
  mockSetActiveTab.mockClear()
})

describe('DojoReadiness', () => {
  describe('Rendering', () => {
    it('renders "Begin Your Training" title', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Begin Your Training')).toBeInTheDocument()
    })

    it('renders welcome text', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText(/Welcome to the Dojo/)).toBeInTheDocument()
    })

    it('renders as a hero-priority WidgetCard', () => {
      const { container } = render(<DojoReadiness onDismiss={() => {}} />)
      // Hero cards have border-t-2
      const root = container.firstElementChild as HTMLElement
      expect(root).toHaveClass('border-t-2')
    })
  })

  describe('Readiness items', () => {
    it('renders 4 readiness items', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const items = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-label')?.includes('—')
      )
      expect(items).toHaveLength(4)
    })

    it('renders "Run your first scan" item', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Run your first scan')).toBeInTheDocument()
    })

    it('renders "Configure a model" item', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Configure a model')).toBeInTheDocument()
    })

    it('renders "Enable Hattori Guard" item', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Enable Hattori Guard')).toBeInTheDocument()
    })

    it('renders "Explore attack fixtures" item', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Explore attack fixtures')).toBeInTheDocument()
    })

    it('each item has description text', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByText('Detect prompt injection threats in text')).toBeInTheDocument()
      expect(screen.getByText('Set up an LLM provider for testing')).toBeInTheDocument()
      expect(screen.getByText('Activate real-time content protection')).toBeInTheDocument()
      expect(screen.getByText('Browse categorized test payloads')).toBeInTheDocument()
    })
  })

  describe('Dismiss behavior', () => {
    it('dismiss button has aria-label "Dismiss onboarding"', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByLabelText('Dismiss onboarding')).toBeInTheDocument()
    })

    it('dismiss button fires onDismiss callback', () => {
      const onDismiss = vi.fn()
      render(<DojoReadiness onDismiss={onDismiss} />)
      fireEvent.click(screen.getByLabelText('Dismiss onboarding'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('Navigation', () => {
    it('clicking scan item navigates to scanner', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const scanItem = screen.getByLabelText(/Run your first scan/)
      fireEvent.click(scanItem)
      expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
    })

    it('clicking model item navigates to llm', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const modelItem = screen.getByLabelText(/Configure a model/)
      fireEvent.click(modelItem)
      expect(mockSetActiveTab).toHaveBeenCalledWith('llm')
    })

    it('clicking guard item navigates to guard', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const guardItem = screen.getByLabelText(/Enable Hattori Guard/)
      fireEvent.click(guardItem)
      expect(mockSetActiveTab).toHaveBeenCalledWith('guard')
    })

    it('clicking fixtures item navigates to armory', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const fixtureItem = screen.getByLabelText(/Explore attack fixtures/)
      fireEvent.click(fixtureItem)
      expect(mockSetActiveTab).toHaveBeenCalledWith('armory')
    })
  })

  describe('Accessibility', () => {
    it('each readiness item has combined aria-label (label + description)', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      expect(screen.getByLabelText('Run your first scan — Detect prompt injection threats in text')).toBeInTheDocument()
      expect(screen.getByLabelText('Configure a model — Set up an LLM provider for testing')).toBeInTheDocument()
    })

    it('icons are aria-hidden', () => {
      const { container } = render(<DojoReadiness onDismiss={() => {}} />)
      const hiddenIcons = container.querySelectorAll('svg[aria-hidden="true"]')
      // At least the X icon + 4 item icons + 4 arrow icons = 9
      expect(hiddenIcons.length).toBeGreaterThanOrEqual(5)
    })

    it('dismiss button meets 44px touch target', () => {
      render(<DojoReadiness onDismiss={() => {}} />)
      const dismissBtn = screen.getByLabelText('Dismiss onboarding')
      expect(dismissBtn).toHaveClass('min-w-[44px]')
      expect(dismissBtn).toHaveClass('min-h-[44px]')
    })
  })
})
