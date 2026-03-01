/**
 * File: MobileNav.tsx
 * Purpose: Bottom navigation bar for mobile (<768px) with 44px touch targets
 * Story: TPI-UI-001-10
 */

'use client'

import { useNavigation } from '@/lib/NavigationContext'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/constants'

export function MobileNav() {
  const { activeTab, setActiveTab } = useNavigation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-[var(--bg-secondary)] border-t border-[var(--border)] flex items-center justify-around md:hidden z-[var(--z-mobile-nav)] pb-safe"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] w-full h-full",
              "motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]",
              isActive ? "text-[var(--dojo-primary)]" : "text-[var(--text-tertiary)]"
            )}
          >
            <Icon className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] mt-1">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
