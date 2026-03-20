'use client'

/**
 * File: ModuleGridWidget.tsx
 * Purpose: 23 scanner modules as colored dots/chips with hover info
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ModuleInfo {
  name: string
  count: number
  source: string
}

const PHASE_COLORS: Record<string, string> = {
  'core': 'bg-[var(--bu-electric)]',
  'p1': 'bg-[var(--status-allow)]',
  'p2': 'bg-[var(--severity-medium)]',
  'p3': 'bg-[var(--status-output)]',
  'p4': 'bg-[var(--status-block)]',
}

function getPhaseColor(source: string): string {
  const lower = source.toLowerCase()
  if (lower.includes('core')) return PHASE_COLORS['core']
  if (lower.includes('p1') || lower.includes('phase-1')) return PHASE_COLORS['p1']
  if (lower.includes('p2')) return PHASE_COLORS['p2']
  if (lower.includes('p3')) return PHASE_COLORS['p3']
  return PHASE_COLORS['p4']
}

export function ModuleGridWidget() {
  const [modules, setModules] = useState<ModuleInfo[]>([])

  useEffect(() => {
    let cancelled = false
    async function fetchModules() {
      try {
        const res = await fetchWithAuth('/api/stats')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setModules(data.patternGroups ?? [])
        }
      } catch {
        // Silent
      }
    }
    fetchModules()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard title={`Haiku Scanner Modules (${modules.length})`}>
      <div className="flex flex-wrap gap-1.5">
        {modules.map((mod, idx) => (
          <span
            key={`${mod.name}-${mod.source}-${idx}`}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
              'bg-muted hover:bg-[var(--bg-quaternary)] cursor-default'
            )}
            title={`${mod.name}: ${mod.count} patterns (${mod.source})`}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', getPhaseColor(mod.source))} />
            {mod.name.length > 15 ? mod.name.slice(0, 13) + '...' : mod.name}
          </span>
        ))}
        {modules.length === 0 && (
          <p className="text-xs text-muted-foreground">Loading modules...</p>
        )}
      </div>
    </WidgetCard>
  )
}
