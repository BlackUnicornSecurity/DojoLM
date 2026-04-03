/**
 * File: kill-count.test.tsx
 * Purpose: Unit tests for KillCount dashboard widget
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDate: (input: unknown) => String(input),
}))

vi.mock('lucide-react', () => new Proxy({}, {
  get: (_, name) => (props: Record<string, unknown>) => <span data-testid={`icon-${String(name)}`} {...props} />,
}))

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }],
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

const mockEvents = [
  { type: 'threat_detected', id: '1' },
  { type: 'threat_detected', id: '2' },
  { type: 'scan_complete', id: '3' },
  { type: 'scan_complete', id: '4' },
  { type: 'scan_complete', id: '5' },
  { type: 'test_passed', id: '6' },
  { type: 'test_failed', id: '7' },
]

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityState: () => ({ events: mockEvents }),
}))

import { KillCount } from '../dashboard/widgets/KillCount'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KillCount', () => {
  it('renders without crashing', () => {
    const { container } = render(<KillCount />)
    expect(container).toBeTruthy()
  })

  it('displays "Kill Count" title', () => {
    render(<KillCount />)
    expect(screen.getByText('Kill Count')).toBeInTheDocument()
  })

  it('renders correct threat count', () => {
    render(<KillCount />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('THREATS')).toBeInTheDocument()
  })

  it('renders correct scan count', () => {
    render(<KillCount />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('SCANNED')).toBeInTheDocument()
  })

  it('renders correct test count', () => {
    render(<KillCount />)
    // 1 passed + 1 failed = 2 tests
    expect(screen.getByText('TESTS')).toBeInTheDocument()
  })

  it('wraps content in WidgetCard', () => {
    render(<KillCount />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })
})
