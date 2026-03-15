'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { NAV_ITEMS, NAV_ID_ALIASES } from './constants'
import type { NavId } from './constants'

/** Set of valid NavIds for deep-link validation */
const VALID_NAV_IDS = new Set<string>(NAV_ITEMS.map(item => item.id))

interface NavigationContextValue {
  activeTab: NavId
  setActiveTab: (tab: NavId) => void
}

export const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

/**
 * Resolve a hash fragment to a valid NavId.
 * Supports aliases for backward compat (Story 2.9).
 * Handles percent-encoding and prototype pollution defense.
 */
function resolveNavId(hash: string): NavId | null {
  let raw: string
  try {
    raw = decodeURIComponent(hash.startsWith('#') ? hash.slice(1) : hash).toLowerCase()
  } catch {
    return null // malformed percent-encoding
  }
  if (!raw) return null
  if (VALID_NAV_IDS.has(raw)) return raw as NavId
  // Use Object.hasOwn to prevent prototype pollution (e.g. #__proto__)
  if (Object.hasOwn(NAV_ID_ALIASES, raw)) {
    const aliased = NAV_ID_ALIASES[raw as keyof typeof NAV_ID_ALIASES]
    // Double-check alias target is still a valid NavId
    if (VALID_NAV_IDS.has(aliased)) return aliased
  }
  return null
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  // Always initialize to 'dashboard' for SSR/client hydration parity (H3)
  const [activeTab, setActiveTabState] = useState<NavId>('dashboard')

/** Wrapped setter that also updates the URL hash.
   *  Uses replaceState (no hashchange event fired), so no guard needed. */
  const setActiveTab = useCallback((tab: NavId) => {
    setActiveTabState(tab)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tab}`)
    }
  }, [])

  /** Sync initial hash + listen for hash changes (back/forward navigation) */
  useEffect(() => {
    function handleHashChange() {
      const navId = resolveNavId(window.location.hash)
      if (navId) setActiveTabState(navId)
    }
    // Sync on mount to pick up hash present at page load (after hydration)
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  return (
    <NavigationContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
