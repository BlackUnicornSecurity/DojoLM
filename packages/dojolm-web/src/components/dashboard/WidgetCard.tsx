'use client'

/**
 * File: WidgetCard.tsx
 * Purpose: Standard wrapper for dashboard widgets with title, optional actions, and consistent styling
 * Story: TPI-NODA-1.5.1, TPI-NODA-9.5
 * Index:
 * - WidgetMeta interface (line 21)
 * - WidgetMetaContext (line 27)
 * - WidgetMetaProvider (line 30)
 * - WidgetCardProps (line 38)
 * - WidgetCard component (line 48)
 */

import { createContext, useContext, type ReactNode } from 'react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GlowCard } from '@/components/ui/GlowCard'
import type { GlowCardProps } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'

/** Context for dashboard-level widget metadata (priority, glow, tall) */
interface WidgetMeta {
  priority: 'hero' | 'standard' | 'compact'
  glow: NonNullable<GlowCardProps['glow']>
  tall?: boolean
}

const WidgetMetaContext = createContext<WidgetMeta>({ priority: 'standard', glow: 'none' })

/** Provider for WidgetShell to pass priority/glow/tall without modifying individual widgets */
export function WidgetMetaProvider({ priority, glow, tall, children }: WidgetMeta & { children: ReactNode }) {
  return (
    <WidgetMetaContext.Provider value={{ priority, glow, tall }}>
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
  const tall = meta.tall

  return (
    <GlowCard glow={glow} className={cn(
      'overflow-hidden',
      'motion-safe:hover:-translate-y-px motion-safe:hover:shadow-md motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--transition-fast)]',
      priority === 'hero' && 'widget-hero-border bg-[var(--card-elevated)]',
      tall && 'h-full flex flex-col',
      className
    )}>
      <CardHeader className={cn(
        'flex flex-row items-center justify-between',
        'pt-3 px-4 pb-1.5',
      )}>
        <CardTitle className={cn(
          priority === 'hero' && 'text-lg font-bold',
          priority === 'standard' && 'text-sm font-semibold',
          priority === 'compact' && 'text-xs font-semibold',
        )}>{title}</CardTitle>
        {actions && <div className="flex items-center gap-1">{actions}</div>}
      </CardHeader>
      {(priority === 'hero' || priority === 'standard') && (
        <div className="mx-4 h-px bg-[var(--border-subtle)]" />
      )}
      <CardContent className={cn(
        'px-4 pb-3',
        tall && 'flex-1 overflow-y-auto',
        contentClassName
      )}>
        {children}
      </CardContent>
    </GlowCard>
  )
}
