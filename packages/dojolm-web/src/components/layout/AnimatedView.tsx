/**
 * File: AnimatedView.tsx
 * Purpose: Wrapper component for view transitions (fade-in, slide-up, stagger)
 * Story: TPI-UI-001-19
 */

'use client'

import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

interface AnimatedViewProps {
  children: ReactNode
  animation?: 'fade-in' | 'slide-up' | 'stagger'
  className?: string
}

export function AnimatedView({
  children,
  animation = 'fade-in',
  className,
}: AnimatedViewProps) {
  const animClass = {
    'fade-in': 'animate-fade-in',
    'slide-up': 'animate-slide-up',
    'stagger': 'stagger-children',
  }

  return (
    <div className={cn(animClass[animation], className)}>
      {children}
    </div>
  )
}
