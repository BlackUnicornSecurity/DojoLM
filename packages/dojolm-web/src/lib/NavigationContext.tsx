'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { NavId } from './constants'

interface NavigationContextValue {
  activeTab: NavId
  setActiveTab: (tab: NavId) => void
}

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<NavId>('dashboard')

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
