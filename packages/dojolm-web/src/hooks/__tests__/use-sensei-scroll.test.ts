/**
 * File: use-sensei-scroll.test.ts
 * Purpose: Unit tests for useSenseiScroll hook using renderHook
 * Test IDs: USS-001 to USS-007
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

import { useSenseiScroll } from '@/hooks/useSenseiScroll'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

describe('useSenseiScroll (USS-001 to USS-007)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('USS-001: initial state is not activated', () => {
    const { result } = renderHook(() => useSenseiScroll(true))
    expect(result.current.activated).toBe(false)
  })

  it('USS-002: activates after correct full sequence', () => {
    const { result } = renderHook(() => useSenseiScroll(true))
    act(() => { fireSequence() })
    expect(result.current.activated).toBe(true)
  })

  it('USS-003: does not activate when disabled', () => {
    const { result } = renderHook(() => useSenseiScroll(false))
    act(() => { fireSequence() })
    expect(result.current.activated).toBe(false)
  })

  it('USS-004: reset returns to non-activated state', () => {
    const { result } = renderHook(() => useSenseiScroll(true))
    act(() => { fireSequence() })
    expect(result.current.activated).toBe(true)
    act(() => { result.current.reset() })
    expect(result.current.activated).toBe(false)
  })

  it('USS-005: partial sequence does not activate', () => {
    const { result } = renderHook(() => useSenseiScroll(true))
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
    })
    expect(result.current.activated).toBe(false)
  })

  it('USS-006: wrong key resets sequence progress', () => {
    const { result } = renderHook(() => useSenseiScroll(true))
    act(() => {
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: 'x' }) // wrong key
      // Even if we continue with the rest, it should not activate
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'b' })
      fireEvent.keyDown(window, { key: 'a' })
    })
    expect(result.current.activated).toBe(false)
  })

  it('USS-007: cleans up listener on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useSenseiScroll(true))

    const addCalls = addSpy.mock.calls.filter((c) => c[0] === 'keydown').length
    expect(addCalls).toBeGreaterThan(0)

    unmount()

    const removeCalls = removeSpy.mock.calls.filter((c) => c[0] === 'keydown').length
    expect(removeCalls).toBeGreaterThan(0)

    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
