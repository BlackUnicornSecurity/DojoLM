'use client'

/**
 * File: QuickLaunchOrOnboarding.tsx
 * Purpose: Wrapper that shows DojoReadiness on first launch, QuickLaunchPad after dismissal
 * Story: TPI-NODA-9.6
 */

import { useState, useEffect, useCallback } from 'react'
import { DojoReadiness } from './DojoReadiness'
import { QuickLaunchPad } from './QuickLaunchPad'
import { onboardingDismissedStore } from '@/lib/stores'

export function QuickLaunchOrOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setShowOnboarding(!onboardingDismissedStore.get())
    setHydrated(true)
  }, [])

  const handleDismiss = useCallback(() => {
    setShowOnboarding(false)
    onboardingDismissedStore.set(true)
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
