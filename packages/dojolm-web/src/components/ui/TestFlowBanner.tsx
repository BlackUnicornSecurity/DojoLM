/**
 * File: TestFlowBanner.tsx
 * Purpose: Contextual "next step" banner for testing workflow progression.
 *          Appears after key testing actions to suggest the natural next step.
 * Story: Testing UX Consolidation — Phase 4
 *
 * Flow: Scan (Scanner) → Model Test (Jutsu) → Adversarial (Atemi) → Campaign → Report (Bushido Book)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useNavigation } from '@/lib/NavigationContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, X } from 'lucide-react'
import type { NavId } from '@/lib/constants'
import type { LucideIcon } from 'lucide-react'

interface TestFlowBannerProps {
  /** Show when this condition is true */
  show: boolean
  /** Contextual message e.g. "Findings detected. Test model resilience?" */
  message: string
  /** Action button text e.g. "Open Model Lab" */
  actionLabel: string
  /** NavId to navigate to when action is clicked */
  targetNavId: NavId
  /** localStorage key for dismissal persistence */
  storageKey: string
  /** Optional leading icon */
  icon?: LucideIcon
}

export function TestFlowBanner({
  show,
  message,
  actionLabel,
  targetNavId,
  storageKey,
  icon: Icon,
}: TestFlowBannerProps) {
  const { setActiveTab } = useNavigation()
  // Start dismissed to avoid SSR flash; useEffect reads localStorage
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(storageKey)
    setDismissed(stored === 'true')
  }, [storageKey])

  const handleDismiss = useCallback(() => {
    setDismissed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, 'true')
    }
  }, [storageKey])

  const handleAction = useCallback(() => {
    setActiveTab(targetNavId)
  }, [setActiveTab, targetNavId])

  if (!show || dismissed) return null

  return (
    <Card
      className={cn(
        'border-[var(--dojo-primary)]/20 bg-[var(--dojo-primary)]/5',
        'motion-safe:animate-fade-in'
      )}
    >
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {Icon && (
          <Icon
            className="h-5 w-5 flex-shrink-0 text-[var(--dojo-primary)]"
            aria-hidden="true"
          />
        )}
        <p className="flex-1 text-sm text-[var(--foreground)]">{message}</p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-[var(--dojo-primary)] hover:text-[var(--dojo-primary)] hover:bg-[var(--dojo-primary)]/10"
          onClick={handleAction}
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-[var(--foreground)]"
          onClick={handleDismiss}
          aria-label="Dismiss suggestion"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}
