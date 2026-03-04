'use client'

/**
 * File: ScanningState.tsx
 * Purpose: Premium scanning animation with three concentric rings
 * Story: TPI-UIP-06
 * Index:
 * - ScanningStateProps interface (line 14)
 * - ScanningState component (line 19)
 */

import { ScanLine } from 'lucide-react'

export interface ScanningStateProps {
  className?: string
}

/**
 * Three-ring scanning animation. Uses a single @keyframes (scan-ring)
 * with staggered animation-delay for the outer, middle, and inner rings.
 * Unmounts when not rendered (parent conditionally renders).
 * Falls back to static icon + text for prefers-reduced-motion.
 */
export function ScanningState({ className }: ScanningStateProps) {
  return (
    <div
      role="status"
      aria-label="Scanning in progress"
      className={className}
    >
      {/* Animated rings - hidden when motion is reduced */}
      <div className="relative flex items-center justify-center w-16 h-16 mx-auto overflow-hidden motion-reduce:hidden">
        {/* Outer ring */}
        <span
          className="absolute inset-0 rounded-full border-2 border-[var(--dojo-primary)] opacity-30 motion-safe:animate-[scan-ring_1.5s_ease-in-out_infinite] motion-reduce:animate-none"
          aria-hidden="true"
        />
        {/* Middle ring */}
        <span
          className="absolute inset-2 rounded-full border-2 border-[var(--dojo-primary)] opacity-50 motion-safe:animate-[scan-ring_1.5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: '200ms' }}
          aria-hidden="true"
        />
        {/* Inner ring */}
        <span
          className="absolute inset-4 rounded-full border-2 border-[var(--dojo-primary)] opacity-70 motion-safe:animate-[scan-ring_1.5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: '400ms' }}
          aria-hidden="true"
        />
        {/* Center icon */}
        <ScanLine className="h-6 w-6 text-[var(--dojo-primary)]" aria-hidden="true" />
      </div>

      {/* Static fallback for reduced motion */}
      <div className="hidden motion-reduce:flex flex-col items-center gap-2">
        <ScanLine className="h-8 w-8 text-[var(--dojo-primary)]" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Scanning...</span>
      </div>

      {/* Label below animation */}
      <p className="text-center text-sm text-muted-foreground mt-3 motion-reduce:hidden">
        Scanning...
      </p>
    </div>
  )
}
