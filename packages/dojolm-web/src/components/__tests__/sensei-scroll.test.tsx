/**
 * File: sensei-scroll.test.tsx
 * Purpose: Unit tests for useSenseiScroll hidden input sequence hook
 * Test IDs: SS-001 to SS-010
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'

import { useSenseiScroll } from '@/hooks/useSenseiScroll'

// ---------------------------------------------------------------------------
// Helper: Test component that exposes hook state
// ---------------------------------------------------------------------------

function TestConsumer({ enabled }: { enabled: boolean }) {
  const { activated, reset } = useSenseiScroll(enabled)
  return (
    <div>
      <span data-testid="activated">{String(activated)}</span>
      <button data-testid="reset" onClick={reset}>Reset</button>
    </div>
  )
}

/** Fire the full sequence */
function fireSequence() {
  const keys = [
    'ArrowUp', 'ArrowUp',
    'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ]
  for (const key of keys) {
    fireEvent.keyDown(window, { key })
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSenseiScroll (SS-001 to SS-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SS-001: initial state is not activated', () => {
    render(<TestConsumer enabled={true} />)
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-002: activates after correct full sequence', () => {
    render(<TestConsumer enabled={true} />)
    act(() => { fireSequence() })
    expect(screen.getByTestId('activated').textContent).toBe('true')
  })

  it('SS-003: does not activate on partial sequence', () => {
    render(<TestConsumer enabled={true} />)
    // Only first 5 keys
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
    })
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-004: wrong key in sequence resets progress', () => {
    render(<TestConsumer enabled={true} />)
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      // Wrong key breaks the sequence
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      // Restart — but only 5 keys, not enough
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'b' })
    })
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-005: does not activate when disabled', () => {
    render(<TestConsumer enabled={false} />)
    act(() => { fireSequence() })
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-006: reset returns to non-activated state', () => {
    render(<TestConsumer enabled={true} />)
    act(() => { fireSequence() })
    expect(screen.getByTestId('activated').textContent).toBe('true')
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-007: can activate again after reset', () => {
    render(<TestConsumer enabled={true} />)
    act(() => { fireSequence() })
    expect(screen.getByTestId('activated').textContent).toBe('true')
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.getByTestId('activated').textContent).toBe('false')
    act(() => { fireSequence() })
    expect(screen.getByTestId('activated').textContent).toBe('true')
  })

  it('SS-008: ignores random key presses', () => {
    render(<TestConsumer enabled={true} />)
    act(() => {
      fireEvent.keyDown(window, { key: 'Enter' })
      fireEvent.keyDown(window, { key: 'Escape' })
      fireEvent.keyDown(window, { key: 'Tab' })
      fireEvent.keyDown(window, { key: 'x' })
      fireEvent.keyDown(window, { key: '1' })
    })
    expect(screen.getByTestId('activated').textContent).toBe('false')
  })

  it('SS-009: case-insensitive for letter keys (B and A)', () => {
    render(<TestConsumer enabled={true} />)
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'B' }) // uppercase
      fireEvent.keyDown(window, { key: 'A' }) // uppercase
    })
    expect(screen.getByTestId('activated').textContent).toBe('true')
  })

  it('SS-010: cleans up listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<TestConsumer enabled={true} />)

    const addCalls = addSpy.mock.calls.filter(c => c[0] === 'keydown').length
    expect(addCalls).toBeGreaterThan(0)

    unmount()

    const removeCalls = removeSpy.mock.calls.filter(c => c[0] === 'keydown').length
    expect(removeCalls).toBeGreaterThan(0)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
