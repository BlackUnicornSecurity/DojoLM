'use client'

/**
 * File: WidgetCard.tsx
 * Purpose: Standard wrapper for dashboard widgets with title, optional actions, and consistent styling
 * Story: TPI-NODA-1.5.1, TPI-NODA-9.5
 * Index:
 * - WidgetMetaContext (line 15)
 * - WidgetMetaProvider (line 22)
 * - WidgetCardProps (line 28)
 * - WidgetCard component (line 38)
 */

import { createContext, useContext, type ReactNode } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'
import type { GlowCardProps } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'

/** Context for dashboard-level widget metadata (priority, glow) */
interface WidgetMeta {
  priority: 'hero' | 'standard' | 'compact'
  glow: NonNullable<GlowCardProps['glow']>
}

const WidgetMetaContext = createContext<WidgetMeta>({ priority: 'standard', glow: 'none' })

/** Provider for WidgetShell to pass priority/glow without modifying individual widgets */
export function WidgetMetaProvider({ priority, glow, children }: WidgetMeta & { children: ReactNode }) {
  return (
    <WidgetMetaContext.Provider value={{ priority, glow }}>
      {children}
    </WidgetMetaContext.Provider>
  )
}

interface WidgetCardProps {
  title: string
  children: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  priority?: 'hero' | 'standard' | 'compact'
  glow?: GlowCardProps['glow']
}

export function WidgetCard({ title, children, actions, className, contentClassName, priority: explicitPriority, glow: explicitGlow }: WidgetCardProps) {
  const meta = useContext(WidgetMetaContext)
  const priority = explicitPriority ?? meta.priority
  const glow = explicitGlow ?? meta.glow

  return (
    <GlowCard glow={glow} className={cn(
      'overflow-hidden',
      priority === 'hero' && 'border-t-2 border-t-[var(--dojo-primary)]',
      className
    )}>
      <CardHeader className={cn(
        'flex flex-row items-center justify-between',
        priority === 'hero' ? 'pt-6 px-6 pb-3' : priority === 'compact' ? 'pt-3 px-3 pb-1' : 'pb-2',
      )}>
        <CardTitle className={cn(
          priority === 'hero' && 'text-base font-bold',
          priority === 'standard' && 'text-sm font-semibold',
          priority === 'compact' && 'text-xs font-semibold',
        )}>{title}</CardTitle>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </CardHeader>
      <CardContent className={cn(
        priority === 'hero' && 'px-6 pb-6',
        priority === 'compact' && 'px-3 pb-3',
        contentClassName
      )}>
        {children}
      </CardContent>
    </GlowCard>
  )
}
