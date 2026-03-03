/**
 * File: ModuleBadge.tsx
 * Purpose: Small badge showing a module name with a deterministic colored dot
 * Story: S71 - Scanner Results Module-Aware Display
 * Index:
 * - MODULE_COLORS palette (line 15)
 * - hashModuleName helper (line 34)
 * - ModuleBadge component (line 46)
 */

'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'

const MODULE_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-lime-500',
  'bg-fuchsia-500',
  'bg-sky-500',
  'bg-yellow-500',
  'bg-red-400',
  'bg-green-500',
  'bg-purple-500',
] as const

/**
 * Deterministic hash of a module name to a stable index.
 * Uses djb2 for fast, low-collision distribution.
 */
function hashModuleName(name: string): number {
  let hash = 5381
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) + hash + name.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % MODULE_COLORS.length
}

interface ModuleBadgeProps {
  moduleName: string
  className?: string
}

export const ModuleBadge = memo(function ModuleBadge({
  moduleName,
  className,
}: ModuleBadgeProps) {
  const colorClass = useMemo(
    () => MODULE_COLORS[hashModuleName(moduleName)],
    [moduleName]
  )

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'text-xs font-medium',
        'bg-[var(--bg-quaternary)] text-[var(--muted-foreground)]',
        'border border-[var(--border)]',
        className
      )}
      aria-label={`Module: ${moduleName}`}
    >
      <span
        className={cn('w-2 h-2 rounded-full shrink-0', colorClass)}
        aria-hidden="true"
      />
      <span className="truncate max-w-[140px]">{moduleName}</span>
    </span>
  )
})
