/**
 * File: guard-quick-panel.test.tsx
 * Purpose: Unit tests for GuardQuickPanel dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mockLucideIcons } from '@/test/mock-lucide-react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  truncate: (str: string, len: number) => str.length > len ? str.slice(0, len) + '...' : str,
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => mockLucideIcons('*'))

const mockSetMode = vi.fn()
const mockSetEnabled = vi.fn()
const mockSetBlockThreshold = vi.fn()
const mockRefreshEvents = vi.fn()

vi.mock('@/lib/contexts/GuardContext', () => ({
  useGuard: () => ({
    config: { mode: 'samurai', enabled: true, blockThreshold: 'WARNING' },
    stats: {},
    recentEvents: [],
    setMode: mockSetMode,
    setEnabled: mockSetEnabled,
    setBlockThreshold: mockSetBlockThreshold,
    refreshEvents: mockRefreshEvents,
    isLoading: false,
  }),
}))

vi.mock('@/lib/guard-constants', () => ({
  GUARD_MODES: [
    { id: 'shinobi', name: 'Shinobi', description: 'Log only', icon: (props: Record<string, unknown>) => <span {...props}>S</span> },
    { id: 'samurai', name: 'Samurai', description: 'Block input', icon: (props: Record<string, unknown>) => <span {...props}>Sa</span> },
    { id: 'sensei', name: 'Sensei', description: 'Block output', icon: (props: Record<string, unknown>) => <span {...props}>Se</span> },
    { id: 'hattori', name: 'Hattori', description: 'Block both', icon: (props: Record<string, unknown>) => <span {...props}>H</span> },
  ],
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {actions && <div data-testid="widget-actions">{actions}</div>}
      {children}
    </div>
  ),
}))

import { GuardQuickPanel } from '../dashboard/widgets/GuardQuickPanel'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GuardQuickPanel', () => {
  it('renders without crashing', () => {
    const { container } = render(<GuardQuickPanel />)
    expect(container).toBeTruthy()
  })

  it('displays "Hattori Guard" title', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('Hattori Guard')).toBeInTheDocument()
  })

  it('shows current mode name', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('Samurai')).toBeInTheDocument()
  })

  it('shows "Online" when guard is enabled', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders mode selector buttons when enabled', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('Shi')).toBeInTheDocument() // Shinobi.slice(0, 3)
    expect(screen.getByText('Sam')).toBeInTheDocument() // Samurai.slice(0, 3)
    expect(screen.getByText('Sen')).toBeInTheDocument() // Sensei.slice(0, 3)
    expect(screen.getByText('Hat')).toBeInTheDocument() // Hattori.slice(0, 3)
  })

  it('renders block threshold buttons', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('Block threshold:')).toBeInTheDocument()
    expect(screen.getByText('WARNING+')).toBeInTheDocument()
    expect(screen.getByText('CRITICAL')).toBeInTheDocument()
  })

  it('shows "No recent events" when event list is empty', () => {
    render(<GuardQuickPanel />)
    expect(screen.getByText('No recent events')).toBeInTheDocument()
  })
})
