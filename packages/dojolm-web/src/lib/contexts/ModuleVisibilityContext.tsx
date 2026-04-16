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
import { moduleVisibilityStore } from '@/lib/stores'

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
  return moduleVisibilityStore.get()
}

function saveState(state: ModuleVisibilityState): void {
  moduleVisibilityStore.set(state)
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
    moduleVisibilityStore.remove()
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
