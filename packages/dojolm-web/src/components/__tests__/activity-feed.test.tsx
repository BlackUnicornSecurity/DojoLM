/**
 * File: activity-feed.test.tsx
 * Purpose: Unit tests for ActivityFeed component
 * Tests: rendering, empty state, events, unread dots, mark all read, undo, accessibility
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ActivityEvent, EventType } from '@/components/ui/ActivityFeed'

// Mock state and dispatch
const mockDispatch = vi.fn()
const mockSetActiveTab = vi.fn()
let mockEvents: ActivityEvent[] = []

vi.mock('@/lib/contexts/ActivityContext', () => ({
  useActivityState: () => ({ events: mockEvents }),
  useActivityDispatch: () => mockDispatch,
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({ setActiveTab: mockSetActiveTab }),
}))

vi.mock('@/components/ui/EmptyState', () => ({
  EmptyState: ({ description, action }: { description: string; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      {description}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
  emptyStatePresets: { noData: { title: 'No Data', description: 'No data' } },
}))

// Import after mocks
import { ActivityFeed } from '@/components/ui/ActivityFeed'

function makeEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'evt-1',
    type: 'scan_complete' as EventType,
    description: 'Scan completed successfully',
    timestamp: '2025-01-15T10:30:00Z',
    read: false,
    ...overrides,
  }
}

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEvents = []
  })

  // AF-001: Shows empty state when no events
  it('AF-001: renders empty state when there are no events', () => {
    mockEvents = []
    render(<ActivityFeed />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('Run a scan or test to see activity here.')).toBeInTheDocument()
  })

  // AF-002: Renders event descriptions
  it('AF-002: renders event descriptions in the feed', () => {
    mockEvents = [makeEvent({ description: 'Scan completed successfully' })]
    render(<ActivityFeed />)
    // The description appears both in the list item and the sr-only live region
    expect(screen.getAllByText('Scan completed successfully').length).toBeGreaterThanOrEqual(1)
  })

  // AF-003: Renders event list with aria-label
  it('AF-003: event list has aria-label "Activity feed"', () => {
    mockEvents = [makeEvent()]
    render(<ActivityFeed />)
    expect(screen.getByRole('list', { name: /activity feed/i })).toBeInTheDocument()
  })

  // AF-004: Renders unread dot for unread events
  it('AF-004: shows unread dot for unread events', () => {
    mockEvents = [makeEvent({ read: false })]
    render(<ActivityFeed />)
    expect(screen.getByLabelText('Unread')).toBeInTheDocument()
  })

  // AF-005: Does not show unread dot for read events
  it('AF-005: no unread dot for read events', () => {
    mockEvents = [makeEvent({ read: true })]
    render(<ActivityFeed />)
    expect(screen.queryByLabelText('Unread')).not.toBeInTheDocument()
  })

  // AF-006: Shows unread count
  it('AF-006: displays unread count in header', () => {
    mockEvents = [
      makeEvent({ id: '1', read: false }),
      makeEvent({ id: '2', read: false }),
      makeEvent({ id: '3', read: true }),
    ]
    render(<ActivityFeed />)
    expect(screen.getByText('2 unread')).toBeInTheDocument()
  })

  // AF-007: "Mark all read" button dispatches MARK_ALL_READ
  it('AF-007: mark all read button dispatches MARK_ALL_READ', () => {
    mockEvents = [makeEvent({ read: false })]
    render(<ActivityFeed />)
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }))
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'MARK_ALL_READ' })
  })

  // AF-008: Shows undo toast after marking all read
  it('AF-008: shows undo option after marking all read', () => {
    mockEvents = [makeEvent({ read: false })]
    render(<ActivityFeed />)
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }))
    expect(screen.getByText('All marked as read')).toBeInTheDocument()
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })

  // AF-009: Undo dispatches UNDO_MARK_ALL_READ
  it('AF-009: clicking undo dispatches UNDO_MARK_ALL_READ with snapshot', () => {
    const events = [makeEvent({ read: false })]
    mockEvents = events
    render(<ActivityFeed />)
    fireEvent.click(screen.getByRole('button', { name: /mark all as read/i }))
    fireEvent.click(screen.getByText('Undo'))
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'UNDO_MARK_ALL_READ',
      payload: expect.arrayContaining([expect.objectContaining({ id: 'evt-1' })]),
    })
  })

  // AF-010: Respects maxVisible prop
  it('AF-010: limits visible events to maxVisible', () => {
    mockEvents = Array.from({ length: 15 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, description: `Event ${i}`, read: true })
    )
    render(<ActivityFeed maxVisible={5} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
  })

  // AF-011: Shows "+N more events" when list is truncated
  it('AF-011: shows overflow indicator when events exceed maxVisible', () => {
    mockEvents = Array.from({ length: 15 }, (_, i) =>
      makeEvent({ id: `evt-${i}`, description: `Event ${i}`, read: true })
    )
    render(<ActivityFeed maxVisible={10} />)
    expect(screen.getByText('+5 more events')).toBeInTheDocument()
  })

  // AF-012: No overflow indicator when events fit within maxVisible
  it('AF-012: no overflow indicator when events fit', () => {
    mockEvents = [makeEvent({ read: true })]
    render(<ActivityFeed maxVisible={10} />)
    expect(screen.queryByText(/more events/)).not.toBeInTheDocument()
  })

  // AF-013: Has a live region for screen reader announcements
  it('AF-013: contains a visually hidden live region', () => {
    mockEvents = [makeEvent({ description: 'New scan done' })]
    render(<ActivityFeed />)
    const liveRegion = document.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
  })

  // AF-014: Applies custom className
  it('AF-014: applies additional className to the container', () => {
    mockEvents = [makeEvent({ read: true })]
    const { container } = render(<ActivityFeed className="my-feed" />)
    expect(container.firstChild).toHaveClass('my-feed')
  })

  // AF-015: Hides mark-all-read when no unread events
  it('AF-015: does not show mark all read when all events are read', () => {
    mockEvents = [makeEvent({ read: true })]
    render(<ActivityFeed />)
    expect(screen.queryByRole('button', { name: /mark all as read/i })).not.toBeInTheDocument()
  })

  // AF-016: Empty state CTA navigates to scanner
  it('AF-016: empty state CTA calls setActiveTab with "scanner"', () => {
    mockEvents = []
    render(<ActivityFeed />)
    fireEvent.click(screen.getByText('Open Haiku Scanner'))
    expect(mockSetActiveTab).toHaveBeenCalledWith('scanner')
  })
})
