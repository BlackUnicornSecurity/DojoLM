/**
 * File: useSenseiScroll.ts
 * Purpose: Hidden input sequence detection hook — active only on dashboard
 * Index:
 * - SCROLL_SEQUENCE (line 11)
 * - useSenseiScroll (line 14)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/** The sacred sequence */
const SCROLL_SEQUENCE = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight',
  'b', 'a',
] as const

/**
 * Detects a specific keyboard sequence and triggers a callback.
 * Only listens when `enabled` is true (i.e., on the dashboard).
 */
export function useSenseiScroll(enabled: boolean) {
  const [activated, setActivated] = useState(false)
  const indexRef = useRef(0)

  const reset = useCallback(() => {
    setActivated(false)
  }, [])

  useEffect(() => {
    if (!enabled) {
      indexRef.current = 0
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip when focus is in form fields (mirrors QuickLaunchPad guard)
      const t = e.target as HTMLElement
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement || t.isContentEditable) return

      const expected = SCROLL_SEQUENCE[indexRef.current]
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key

      if (key === expected) {
        indexRef.current++
        if (indexRef.current === SCROLL_SEQUENCE.length) {
          indexRef.current = 0
          setActivated(true)
        }
      } else {
        indexRef.current = 0
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  return { activated, reset }
}
