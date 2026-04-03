/**
 * File: activity-feed-widget.test.tsx
 * Purpose: Unit tests for ActivityFeedWidget dashboard widget
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

vi.mock('@/lib/NavigationContext', () => {
  const { createContext } = require('react')
  return {
    NavigationContext: createContext({ activeTab: 'dashboard', setActiveTab: () => {} }),
  }
})

vi.mock('@/lib/constants', () => ({
  NAV_ITEMS: [{ id: 'dashboard' }, { id: 'scanner' }],
}))

vi.mock('@/components/ui/ActivityFeed', () => ({
  ActivityFeed: ({ maxVisible }: { maxVisible: number }) => (
    <div data-testid="activity-feed" data-max={maxVisible}>Activity Feed Mock</div>
  ),
}))

vi.mock('../dashboard/WidgetCard', () => ({
  WidgetCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="widget-card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
}))

import { ActivityFeedWidget } from '../dashboard/widgets/ActivityFeedWidget'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivityFeedWidget', () => {
  it('renders without crashing', () => {
    const { container } = render(<ActivityFeedWidget />)
    expect(container).toBeTruthy()
  })

  it('renders with "Recent Activity" title', () => {
    render(<ActivityFeedWidget />)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
  })

  it('renders ActivityFeed child component', () => {
    render(<ActivityFeedWidget />)
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
  })

  it('passes maxVisible=8 to ActivityFeed', () => {
    render(<ActivityFeedWidget />)
    const feed = screen.getByTestId('activity-feed')
    expect(feed.getAttribute('data-max')).toBe('8')
  })

  it('wraps content in WidgetCard', () => {
    render(<ActivityFeedWidget />)
    expect(screen.getByTestId('widget-card')).toBeInTheDocument()
  })
})
