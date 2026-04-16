/**
 * File: use-sensei.test.ts
 * Purpose: Unit tests for useSensei hook
 * Test IDs: USH-001 to USH-008
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetchWithAuth = vi.fn()

vi.mock('@/lib/fetch-with-auth', () => ({
  fetchWithAuth: (...args: unknown[]) => mockFetchWithAuth(...args),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).slice(2, 8)) },
})

import { useSensei } from '@/hooks/useSensei'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSensei (USH-001 to USH-008)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  it('USH-001: initial state has empty messages and isOpen false', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    expect(result.current.messages).toEqual([])
    expect(result.current.isOpen).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.selectedModelId).toBe(null)
    expect(result.current.pendingConfirmations).toEqual([])
    expect(result.current.error).toBe(null)
  })

  it('USH-002: toggle switches isOpen state', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    expect(result.current.isOpen).toBe(false)
    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(true)
    act(() => { result.current.toggle() })
    expect(result.current.isOpen).toBe(false)
  })

  it('USH-003: open and close set isOpen directly', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    act(() => { result.current.open() })
    expect(result.current.isOpen).toBe(true)
    act(() => { result.current.close() })
    expect(result.current.isOpen).toBe(false)
  })

  it('USH-004: setSelectedModelId updates state and persists to localStorage', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    act(() => { result.current.setSelectedModelId('model-abc') })
    expect(result.current.selectedModelId).toBe('model-abc')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('sensei-model', '"model-abc"')
  })

  it('USH-005: sendMessage sets error when no model is selected', async () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    await act(async () => { await result.current.sendMessage('Hello') })
    expect(result.current.error).toBe('Please select a model before sending a message.')
    expect(result.current.messages).toEqual([])
  })

  it('USH-006: clearHistory empties messages and removes from localStorage', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    act(() => { result.current.clearHistory() })
    expect(result.current.messages).toEqual([])
    expect(result.current.pendingConfirmations).toEqual([])
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('sensei-messages')
  })

  it('USH-007: clearError resets error to null', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    // Trigger error first
    act(() => {
      void result.current.sendMessage('Hello')
    })
    // Manually wait for state update
    expect(result.current.error).toBe('Please select a model before sending a message.')
    act(() => { result.current.clearError() })
    expect(result.current.error).toBe(null)
  })

  it('USH-008: responds to sensei-toggle custom event', () => {
    const { result } = renderHook(() => useSensei('dashboard'))
    expect(result.current.isOpen).toBe(false)
    act(() => { window.dispatchEvent(new Event('sensei-toggle')) })
    expect(result.current.isOpen).toBe(true)
    act(() => { window.dispatchEvent(new Event('sensei-toggle')) })
    expect(result.current.isOpen).toBe(false)
  })
})
