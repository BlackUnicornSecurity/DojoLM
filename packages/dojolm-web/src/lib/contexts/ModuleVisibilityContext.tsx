/**
 * File: ModuleVisibilityContext.tsx
 * Purpose: Module on/off visibility state with localStorage persistence
 * Index:
 * - STORAGE_KEY (line 13)
 * - ModuleVisibilityProvider (line 22)
 * - useModuleVisibility (line 68)
 */

'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { NavId } from '@/lib/constants'

const STORAGE_KEY = 'noda-module-vis'

/** Modules that cannot be toggled off */
const ALWAYS_VISIBLE: ReadonlySet<NavId> = new Set(['dashboard'])

type ModuleVisibilityState = Record<string, boolean>

interface ModuleVisibilityContextValue {
  /** Check if a module is visible (defaults to true if not in state) */
  isVisible: (id: NavId) => boolean
  /** Toggle a module's visibility */
  toggle: (id: NavId) => void
  /** Reset all modules to visible */
  resetAll: () => void
  /** The raw visibility map */
  visibility: ModuleVisibilityState
}

const ModuleVisibilityContext = createContext<ModuleVisibilityContextValue | null>(null)

function loadState(): ModuleVisibilityState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw, (_key, value) => {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        return Object.assign(Object.create(null), value)
      }
      return value
    }) as ModuleVisibilityState
  } catch {
    return {}
  }
}

function saveState(state: ModuleVisibilityState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded — silently ignore */ }
}

export function ModuleVisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<ModuleVisibilityState>(loadState)

  const isVisible = useCallback((id: NavId): boolean => {
    if (ALWAYS_VISIBLE.has(id)) return true
    return visibility[id] !== false
  }, [visibility])

  const toggle = useCallback((id: NavId) => {
    if (ALWAYS_VISIBLE.has(id)) return
    setVisibility(prev => {
      const next = { ...prev, [id]: prev[id] === false ? true : false }
      saveState(next)
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setVisibility({})
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const value = useMemo(() => ({
    isVisible, toggle, resetAll, visibility,
  }), [isVisible, toggle, resetAll, visibility])

  return (
    <ModuleVisibilityContext.Provider value={value}>
      {children}
    </ModuleVisibilityContext.Provider>
  )
}

export function useModuleVisibility() {
  const ctx = useContext(ModuleVisibilityContext)
  if (!ctx) throw new Error('useModuleVisibility must be used within ModuleVisibilityProvider')
  return ctx
}
