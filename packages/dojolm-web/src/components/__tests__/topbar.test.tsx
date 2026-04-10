/**
 * File: topbar.test.tsx
 * Purpose: Unit tests for the new global TopBar component (Train 1 PR-2)
 * Test IDs: TB-001..TB-010
 *
 * These tests cover behaviors relocated from Sidebar.tsx in the Train 1 PR-2
 * shell rewrite: Activity drawer toggle, unread badge, Sensei toggle event
 * dispatch, Notifications panel presence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockEvents = [
  { id: '1', type: 'scan_complete', description: 'Scan done', timestamp: '2024-01-01T00:00:00Z', read: false },
  { id: '2', type: 'threat_detected', description: 'Threat!', timestamp: '2024-01-01T01:00:00Z', read: true },
  { id: '3', type: 'test_passed', description: 'Pass', timestamp: '2024-01-01T02:00:00Z', read: false },
]

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityState: () => ({ events: mockEvents }),
  useActivityDispatch: () => vi.fn(),
}))

vi.mock('@/components/ui/ActivityFeed', () => ({
  ActivityFeed: ({ maxVisible }: { maxVisible: number }) => (
    <div data-testid="activity-feed" data-max={maxVisible}>ActivityFeed</div>
  ),
}))

vi.mock('../layout/NotificationsPanel', () => ({
  NotificationsPanel: () => (
    <div data-testid="notifications-panel">NotificationsPanel</div>
  ),
}))

// Train 2 PR-4c.3: Mock CommandPalette (cmdk dependency not available in test env)
vi.mock('../layout/CommandPalette', () => ({
  CommandPalette: ({ open }: { open: boolean }) => (
    open ? <div data-testid="command-palette">CommandPalette</div> : null
  ),
}))

import { TopBar } from '../layout/TopBar'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('TB-001: renders the header element with correct aria-label', () => {
    render(<TopBar />)
    const header = screen.getByRole('banner', { name: /top bar/i })
    expect(header).toBeInTheDocument()
  })

  it('TB-002: renders the Activity feed trigger button', () => {
    render(<TopBar />)
    const activityBtn = screen.getByRole('button', { name: /activity feed/i })
    expect(activityBtn).toBeInTheDocument()
  })

  it('TB-003: Activity button shows unread count badge (2 unread)', () => {
    render(<TopBar />)
    // mockEvents has 2 unread events (id 1 and 3)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('TB-004: Activity button aria-label includes unread count', () => {
    render(<TopBar />)
    const activityBtn = screen.getByRole('button', { name: /activity feed.*2 unread/i })
    expect(activityBtn).toBeInTheDocument()
  })

  it('TB-005: clicking Activity button opens the drawer dialog', () => {
    render(<TopBar />)
    const activityBtn = screen.getByRole('button', { name: /activity feed/i })
    fireEvent.click(activityBtn)
    expect(screen.getByRole('dialog', { name: /activity feed drawer/i })).toBeInTheDocument()
  })

  it('TB-006: Activity drawer mounts the ActivityFeed component', () => {
    render(<TopBar />)
    const activityBtn = screen.getByRole('button', { name: /activity feed/i })
    fireEvent.click(activityBtn)
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
  })

  it('TB-007: Activity drawer close button dismisses the drawer', () => {
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: /activity feed/i }))
    fireEvent.click(screen.getByRole('button', { name: /close activity feed/i }))
    expect(screen.queryByRole('dialog', { name: /activity feed drawer/i })).not.toBeInTheDocument()
  })

  it('TB-008: renders the Sensei toggle button', () => {
    render(<TopBar />)
    expect(screen.getByRole('button', { name: /sensei ai assistant/i })).toBeInTheDocument()
  })

  it('TB-009: clicking Sensei button dispatches "sensei-toggle" window event', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    render(<TopBar />)
    fireEvent.click(screen.getByRole('button', { name: /sensei ai assistant/i }))
    const dispatchedEvents = dispatchSpy.mock.calls.map(call => call[0])
    const senseiEvent = dispatchedEvents.find(
      (e): e is CustomEvent => e instanceof CustomEvent && e.type === 'sensei-toggle'
    )
    expect(senseiEvent).toBeDefined()
    dispatchSpy.mockRestore()
  })

  it('TB-010: renders the NotificationsPanel', () => {
    render(<TopBar />)
    expect(screen.getByTestId('notifications-panel')).toBeInTheDocument()
  })
})
