'use client'

/**
 * File: QuickLaunchOrOnboarding.tsx
 * Purpose: Wrapper that shows DojoReadiness on first launch, QuickLaunchPad after dismissal
 * Story: TPI-NODA-9.6
 */

import { useState, useEffect, useCallback } from 'react'
import { DojoReadiness } from './DojoReadiness'
import { QuickLaunchPad } from './QuickLaunchPad'

const STORAGE_KEY = 'dojo-onboarding-dismissed'

export function QuickLaunchOrOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY) === 'true'
    setShowOnboarding(!dismissed)
    setHydrated(true)
  }, [])

  const handleDismiss = useCallback(() => {
    setShowOnboarding(false)
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Silently handle QuotaExceededError
    }
  }, [])

  // Avoid flash — render skeleton until hydrated
  if (!hydrated) return (
    <div className="rounded-lg border border-[var(--border)] bg-card p-4 motion-safe:animate-pulse motion-reduce:animate-none" aria-busy="true">
      <div className="h-4 w-32 bg-muted rounded mb-3" />
      <div className="h-20 bg-muted/50 rounded" />
    </div>
  )

  if (showOnboarding) {
    return <DojoReadiness onDismiss={handleDismiss} />
  }

  return <QuickLaunchPad />
}
