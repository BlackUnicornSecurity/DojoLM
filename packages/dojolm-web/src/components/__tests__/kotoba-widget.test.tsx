/**
 * File: kotoba-widget.test.tsx
 * Purpose: Unit tests for KotobaWidget dashboard widget
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

const mockSetActiveTab = vi.fn()
vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
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

import { KotobaWidget } from '../dashboard/widgets/KotobaWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('KotobaWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<KotobaWidget />)
    expect(container).toBeTruthy()
  })

  it('displays "Kotoba Studio" title', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Kotoba Studio')).toBeInTheDocument()
  })

  it('shows rule count of 24', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('24')).toBeInTheDocument()
    expect(screen.getByText('rules')).toBeInTheDocument()
  })

  it('displays grade badge B+', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('B+')).toBeInTheDocument()
  })

  it('shows average score of 78%', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Avg Score')).toBeInTheDocument()
    expect(screen.getByText('78%')).toBeInTheDocument()
  })

  it('renders "Open" action button', () => {
    render(<KotobaWidget />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })
})
