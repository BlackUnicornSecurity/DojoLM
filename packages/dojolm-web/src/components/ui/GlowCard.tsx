'use client'

/**
 * File: GlowCard.tsx
 * Purpose: GlowCard wrapper component - composes Card with glow effects
 * Story: TPI-UIP-04
 * Index:
 * - GlowCardProps interface (line 16)
 * - glowBoxShadow map (line 25) - exhaustive box-shadow values per variant
 * - GlowCard component (line 38)
 */

import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Glow variant: none (default), subtle (top shine), accent (red glow), input (Clean AI top gradient) */
  glow?: 'none' | 'subtle' | 'accent' | 'input'
  children: React.ReactNode
  className?: string
}

/**
 * Box-shadow values per glow variant (GPU-accelerated, no pseudo-elements needed for subtle/accent).
 * Typed exhaustively against the glow union to ensure compile-time safety on new variants.
 * The "input" variant uses a CSS pseudo-element for the top gradient line (Clean AI spec).
 */
const glowBoxShadow: Record<NonNullable<GlowCardProps['glow']>, string | undefined> = {
  none: undefined,
  subtle: 'inset 0 1px 0 0 var(--overlay-subtle)',
  accent: 'var(--shadow-glow-primary)',
  input: undefined, // handled via CSS class .glow-card-input
}

/**
 * GlowCard - wraps Card with glow effects via composition (not inheritance).
 * Uses box-shadow for GPU-accelerated glow on subtle/accent variants.
 * Uses CSS pseudo-element for the "input" variant top gradient line.
 * Adds position:relative always; overflow:visible only for "input" variant (needed for ::before).
 */
export const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ glow = 'none', children, className, style, ...props }, ref) => {
    const shadow = glowBoxShadow[glow]

    return (
      <Card
        ref={ref}
        className={cn(
          'relative',
          glow === 'input' && 'overflow-visible glow-card-input',
          className
        )}
        style={{
          ...style,
          ...(shadow ? { boxShadow: shadow } : {}),
        }}
        {...props}
      >
        {children}
      </Card>
    )
  }
)
GlowCard.displayName = 'GlowCard'
