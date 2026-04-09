/**
 * File: quick-launch-pad.test.tsx
 * Purpose: Unit tests for QuickLaunchPad dashboard widget
 * Story: TPI-NODA-1.5.2
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

vi.mock('@/lib/NavigationContext', async () => {
  const { createContext } = await import('react')
  return {
    useNavigation: () => ({ setActiveTab: vi.fn() }),
    // WidgetCard.tsx imports the React Context itself — must be a real Context
    // so useContext(NavigationContext) doesn't throw. Null default value exercises
    // the useSafeNavigation null-fallback path.
    NavigationContext: createContext(null as unknown),
    NavigationProvider: ({ children }: { children: unknown }) => children,
  }
})

vi.mock('@/components/ui/GlowCard', () => ({
  GlowCard: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="glow-card" className={className}>{children}</div>
  ),
}))

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [],
}))

import { QuickLaunchPad } from '@/components/dashboard/widgets/QuickLaunchPad'

describe('QuickLaunchPad', () => {
  it('renders without crashing', () => {
    const { container } = render(<QuickLaunchPad />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders all 6 launch action cards', () => {
    render(<QuickLaunchPad />)
    expect(screen.getByLabelText('Scan Text')).toBeInTheDocument()
    expect(screen.getByLabelText('Test LLM')).toBeInTheDocument()
    expect(screen.getByLabelText('Explore Fixtures')).toBeInTheDocument()
    expect(screen.getByLabelText('Check Guard')).toBeInTheDocument()
    expect(screen.getByLabelText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByLabelText('Run Evolution')).toBeInTheDocument()
  })

  it('displays action labels', () => {
    render(<QuickLaunchPad />)
    expect(screen.getByText('Scan Text')).toBeInTheDocument()
    expect(screen.getByText('Test LLM')).toBeInTheDocument()
    expect(screen.getByText('Explore Fixtures')).toBeInTheDocument()
    expect(screen.getByText('Check Guard')).toBeInTheDocument()
    expect(screen.getByText('Battle Arena')).toBeInTheDocument()
    expect(screen.getByText('Run Evolution')).toBeInTheDocument()
  })

  it('displays keyboard shortcuts 1-6', () => {
    render(<QuickLaunchPad />)
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument()
    }
  })

  it('displays action detail descriptions', () => {
    render(<QuickLaunchPad />)
    expect(screen.getByText('Run a live injection verdict on prompt input.')).toBeInTheDocument()
    expect(screen.getByText('Move into model evaluation and quick batch runs.')).toBeInTheDocument()
  })

  it('displays "Jump to module" text on each card', () => {
    render(<QuickLaunchPad />)
    const jumpTexts = screen.getAllByText('Jump to module')
    expect(jumpTexts).toHaveLength(6)
  })
})
