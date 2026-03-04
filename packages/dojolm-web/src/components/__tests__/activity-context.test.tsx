/**
 * File: activity-context.test.tsx
 * Purpose: Tests for ActivityContext — reducer, FIFO eviction, ID uniqueness, description validator
 * Story: TPI-UIP-08
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ActivityProvider, useActivityState, useActivityDispatch, useActivityLogger, isStaticDescription } from '@/lib/contexts/ActivityContext'

// Mock crypto.randomUUID
let uuidCounter = 0
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
})

// Mock sessionStorage
const mockStorage = new Map<string, string>()
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => mockStorage.get(key) ?? null,
  setItem: (key: string, value: string) => mockStorage.set(key, value),
  removeItem: (key: string) => mockStorage.delete(key),
})

beforeEach(() => {
  uuidCounter = 0
  mockStorage.clear()
})

// Test component that exposes state and dispatch
function TestConsumer() {
  const { events } = useActivityState()
  const dispatch = useActivityDispatch()

  return (
    <div>
      <div data-testid="event-count">{events.length}</div>
      <div data-testid="unread-count">{events.filter(e => !e.read).length}</div>
      {events.map(e => (
        <div key={e.id} data-testid={`event-${e.id}`}>
          {e.description}|{e.read ? 'read' : 'unread'}
        </div>
      ))}
      <button
        data-testid="add-event"
        onClick={() => dispatch({
          type: 'ADD_EVENT',
          payload: { type: 'scan_complete', description: 'Scan completed: ALLOW verdict, 0 findings', timestamp: '12:00:00' },
        })}
      />
      <button
        data-testid="add-threat"
        onClick={() => dispatch({
          type: 'ADD_EVENT',
          payload: { type: 'threat_detected', description: 'Scan completed: BLOCK verdict, 3 critical, 1 warning findings', timestamp: '12:01:00' },
        })}
      />
      <button
        data-testid="mark-all-read"
        onClick={() => dispatch({ type: 'MARK_ALL_READ' })}
      />
      <button
        data-testid="mark-read-1"
        onClick={() => dispatch({ type: 'MARK_READ', payload: 'test-uuid-1' })}
      />
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ActivityProvider>
      <TestConsumer />
    </ActivityProvider>
  )
}

describe('ActivityContext', () => {
  describe('reducer — ADD_EVENT', () => {
    it('adds an event with unique ID', () => {
      renderWithProvider()
      expect(screen.getByTestId('event-count').textContent).toBe('0')

      fireEvent.click(screen.getByTestId('add-event'))
      expect(screen.getByTestId('event-count').textContent).toBe('1')
      expect(screen.getByTestId('event-test-uuid-1')).toBeTruthy()
    })

    it('adds events in newest-first order', () => {
      renderWithProvider()
      fireEvent.click(screen.getByTestId('add-event'))
      fireEvent.click(screen.getByTestId('add-threat'))

      const events = screen.getAllByTestId(/^event-test-uuid/)
      expect(events[0].textContent).toContain('BLOCK')
      expect(events[1].textContent).toContain('ALLOW')
    })

    it('new events are unread by default', () => {
      renderWithProvider()
      fireEvent.click(screen.getByTestId('add-event'))
      expect(screen.getByTestId('unread-count').textContent).toBe('1')
      expect(screen.getByTestId('event-test-uuid-1').textContent).toContain('unread')
    })

    it('generates unique IDs for each event', () => {
      renderWithProvider()
      fireEvent.click(screen.getByTestId('add-event'))
      fireEvent.click(screen.getByTestId('add-event'))
      fireEvent.click(screen.getByTestId('add-event'))

      expect(screen.getByTestId('event-test-uuid-1')).toBeTruthy()
      expect(screen.getByTestId('event-test-uuid-2')).toBeTruthy()
      expect(screen.getByTestId('event-test-uuid-3')).toBeTruthy()
    })
  })

  describe('reducer — FIFO eviction', () => {
    it('enforces max 50 events', () => {
      renderWithProvider()
      // Add 55 events
      for (let i = 0; i < 55; i++) {
        fireEvent.click(screen.getByTestId('add-event'))
      }
      expect(screen.getByTestId('event-count').textContent).toBe('50')
    })
  })

  describe('reducer — MARK_ALL_READ', () => {
    it('marks all events as read', () => {
      renderWithProvider()
      fireEvent.click(screen.getByTestId('add-event'))
      fireEvent.click(screen.getByTestId('add-threat'))
      expect(screen.getByTestId('unread-count').textContent).toBe('2')

      fireEvent.click(screen.getByTestId('mark-all-read'))
      expect(screen.getByTestId('unread-count').textContent).toBe('0')
    })
  })

  describe('reducer — MARK_READ', () => {
    it('marks a single event as read', () => {
      renderWithProvider()
      fireEvent.click(screen.getByTestId('add-event'))
      fireEvent.click(screen.getByTestId('add-threat'))
      expect(screen.getByTestId('unread-count').textContent).toBe('2')

      fireEvent.click(screen.getByTestId('mark-read-1'))
      expect(screen.getByTestId('unread-count').textContent).toBe('1')
      expect(screen.getByTestId('event-test-uuid-1').textContent).toContain('read')
    })
  })
})

describe('isStaticDescription', () => {
  it('accepts valid static descriptions', () => {
    expect(isStaticDescription('Scan completed: ALLOW verdict, 0 findings')).toBe(true)
    expect(isStaticDescription('Scan completed: BLOCK verdict, 3 critical, 1 warning findings')).toBe(true)
    expect(isStaticDescription('Test passed: 100% detection rate')).toBe(true)
    expect(isStaticDescription('Model added: gpt-4')).toBe(true)
  })

  it('rejects empty descriptions', () => {
    expect(isStaticDescription('')).toBe(false)
  })

  it('rejects overly long descriptions', () => {
    expect(isStaticDescription('a'.repeat(201))).toBe(false)
  })

  it('rejects descriptions with HTML tags', () => {
    expect(isStaticDescription('<script>alert(1)</script>')).toBe(false)
    expect(isStaticDescription('<img src=x>')).toBe(false)
    expect(isStaticDescription('<svg onload=alert(1)>')).toBe(false)
  })

  it('rejects descriptions with special characters outside allowlist', () => {
    expect(isStaticDescription('Scanned: ${userInput}')).toBe(false)
    expect(isStaticDescription('test "quoted" value')).toBe(false)
    expect(isStaticDescription("test 'quoted' value")).toBe(false)
    expect(isStaticDescription('onerror=alert(1)')).toBe(false)
  })

  it('allows safe punctuation in descriptions', () => {
    expect(isStaticDescription('Scan completed: BLOCK verdict, 3 findings')).toBe(true)
    expect(isStaticDescription('Pass rate: 100%')).toBe(true)
    expect(isStaticDescription('Model added: gpt-4')).toBe(true)
  })
})

describe('useActivityLogger', () => {
  function LoggerConsumer() {
    const { logEvent } = useActivityLogger()
    const { events } = useActivityState()
    return (
      <div>
        <div data-testid="count">{events.length}</div>
        <button
          data-testid="log"
          onClick={() => logEvent('scan_complete', 'Scan completed: ALLOW verdict, 0 findings')}
        />
      </div>
    )
  }

  it('logs events via convenience hook', () => {
    render(
      <ActivityProvider>
        <LoggerConsumer />
      </ActivityProvider>
    )
    expect(screen.getByTestId('count').textContent).toBe('0')
    fireEvent.click(screen.getByTestId('log'))
    expect(screen.getByTestId('count').textContent).toBe('1')
  })
})

describe('sessionStorage persistence', () => {
  it('saves events to sessionStorage', () => {
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-event'))

    const stored = mockStorage.get('dojolm-activity-events')
    expect(stored).toBeTruthy()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('test-uuid-1')
  })

  it('gracefully handles sessionStorage errors', () => {
    // Override setItem to throw
    const originalSetItem = sessionStorage.setItem
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    // Should not throw
    renderWithProvider()
    fireEvent.click(screen.getByTestId('add-event'))
    expect(screen.getByTestId('event-count').textContent).toBe('1')

    vi.mocked(sessionStorage.setItem).mockRestore()
  })
})

describe('context error handling', () => {
  it('throws when useActivityState is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useActivityState must be used within ActivityProvider')
    spy.mockRestore()
  })
})
