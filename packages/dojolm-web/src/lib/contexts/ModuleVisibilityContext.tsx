// SPDX-License-Identifier: Apache-2.0
/**
 * File: ModuleVisibilityContext.tsx
 * Purpose: Module on/off visibility state with localStorage persistence
 * Index:
 * - STORAGE_KEY (line 13)
 * - ModuleVisibilityProvider (line 22)
 * - useModuleVisibility (line 68)
 */

'use client'

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
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

const EMPTY_STATE: ModuleVisibilityState = {}

function saveState(state: ModuleVisibilityState): void {
  moduleVisibilityStore.set(state)
}

// E8.S1 — SSR/CSR hydration parity hardening (F-9-001 follow-up).
//
// The initial state MUST be deterministic across SSR and the first client
// commit so we never emit a value-driven hydration mismatch. The previous
// `useState(loadState)` lazy initializer reached into `moduleVisibilityStore.get()`
// which itself calls `getStorage('local')`. On the server `getStorage` returns
// `null` and the default `{}` is used; on the client `getStorage` returns the
// real `Storage` and any persisted user preference is read into the very first
// render. That divergence would surface React #418 the moment any consumer
// rendered visibility-conditional markup.
//
// We seed with the empty default and reconcile against the persisted value
// inside `useEffect`, which fires AFTER hydration has committed — at which
// point a state update is just a normal re-render, not a hydration mismatch.
export function ModuleVisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<ModuleVisibilityState>(EMPTY_STATE)

  useEffect(() => {
    const persisted = moduleVisibilityStore.get()
    if (persisted && Object.keys(persisted).length > 0) {
      setVisibility(persisted)
    }
  }, [])

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
