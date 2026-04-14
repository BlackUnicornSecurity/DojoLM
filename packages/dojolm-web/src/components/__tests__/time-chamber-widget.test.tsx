/**
 * File: time-chamber-widget.test.tsx
 * Purpose: Unit tests for TimeChamberWidget dashboard widget
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

vi.mock('@/lib/utils', () => ({ cn: (...args: unknown[]) => args.filter(Boolean).join(' ') }))
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
vi.mock('../dashboard/WidgetCard', () => ({ WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => <div data-testid="widget-card"><h3>{title}</h3>{children}</div> }))

import { TimeChamberWidget } from '../dashboard/widgets/TimeChamberWidget'

describe('TimeChamberWidget', () => {
  it('renders without crashing', () => { expect(render(<TimeChamberWidget />).container).toBeTruthy() })
  it('wraps in WidgetCard', () => { render(<TimeChamberWidget />); expect(screen.getByTestId('widget-card')).toBeInTheDocument() })
  // Story 2.1.3: No mock data — shows "not yet available" state
  it('shows not-yet-available state', () => { render(<TimeChamberWidget />); expect(screen.getByText('Not yet available')).toBeInTheDocument() })
  it('does not render old mock plan values', () => {
    render(<TimeChamberWidget />)
    expect(screen.queryByText('20')).not.toBeInTheDocument()
    expect(screen.queryByText('Replay Attack')).not.toBeInTheDocument()
  })
})
