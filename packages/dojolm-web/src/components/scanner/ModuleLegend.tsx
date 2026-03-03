/**
 * File: ModuleLegend.tsx
 * Purpose: Scrollable legend of active scanner modules grouped by origin phase with toggle controls
 * Story: S71 - Scanner Results Module-Aware Display
 * Index:
 * - PHASE_MODULES map (line 18)
 * - PHASE_ORDER (line 49)
 * - ModuleLegend component (line 57)
 * - PhaseGroup component (line 122)
 * - ModuleToggle component (line 162)
 */

'use client'

import { memo, useMemo, useCallback } from 'react'
import { Finding } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ModuleBadge } from './ModuleBadge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Layers, Filter } from 'lucide-react'

/** Canonical module grouping by origin phase */
const PHASE_MODULES: Record<string, { label: string; modules: string[] }> = {
  P1: {
    label: 'P1 Core',
    modules: [
      'mcp-parser',
      'document-pdf',
      'document-office',
      'ssrf-detector',
      'encoding-engine',
      'email-webfetch',
      'enhanced-pi',
      'token-analyzer',
      'rag-analyzer',
      'vectordb-interface',
      'xxe-protopollution',
    ],
  },
  'P2.6': {
    label: 'P2.6 Category',
    modules: [
      'dos-detector',
      'supply-chain-detector',
      'bias-detector',
      'env-detector',
      'overreliance-detector',
      'model-theft-detector',
    ],
  },
  P3: {
    label: 'P3 Compliance',
    modules: [
      'pii-detector',
      'data-provenance',
      'deepfake-detector',
      'session-bypass',
    ],
  },
}

const PHASE_ORDER = ['P1', 'P2.6', 'P3'] as const

interface ModuleLegendProps {
  findings: Finding[]
  activeModules: string[]
  onToggleModule: (module: string) => void
  className?: string
}

export const ModuleLegend = memo(function ModuleLegend({
  findings,
  activeModules,
  onToggleModule,
  className,
}: ModuleLegendProps) {
  /** Set of engines that actually produced findings in the current scan */
  const enginesWithFindings = useMemo(() => {
    const engines = new Set<string>()
    for (const f of findings) {
      if (f.engine) {
        engines.add(f.engine)
      }
    }
    return engines
  }, [findings])

  /** Counts per engine */
  const findingCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of findings) {
      if (f.engine) {
        counts.set(f.engine, (counts.get(f.engine) || 0) + 1)
      }
    }
    return counts
  }, [findings])

  /** Build the phase groups, including only modules that have findings */
  const phaseGroups = useMemo(() => {
    const groups: Array<{
      phase: string
      label: string
      modules: Array<{ name: string; count: number; active: boolean }>
    }> = []

    for (const phase of PHASE_ORDER) {
      const config = PHASE_MODULES[phase]
      const modulesInPhase = config.modules
        .filter((m) => enginesWithFindings.has(m))
        .map((m) => ({
          name: m,
          count: findingCounts.get(m) || 0,
          active: activeModules.includes(m),
        }))

      if (modulesInPhase.length > 0) {
        groups.push({
          phase,
          label: config.label,
          modules: modulesInPhase,
        })
      }
    }

    // Catch any engines not in the canonical map (e.g. core-patterns, custom)
    const knownModules = new Set(
      Object.values(PHASE_MODULES).flatMap((p) => p.modules)
    )
    const unknownModules = [...enginesWithFindings]
      .filter((e) => !knownModules.has(e))
      .map((m) => ({
        name: m,
        count: findingCounts.get(m) || 0,
        active: activeModules.includes(m),
      }))

    if (unknownModules.length > 0) {
      groups.push({
        phase: 'Other',
        label: 'Other',
        modules: unknownModules,
      })
    }

    return groups
  }, [enginesWithFindings, findingCounts, activeModules])

  const totalActive = activeModules.length
  const totalAvailable = enginesWithFindings.size

  if (enginesWithFindings.size === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-[var(--border)] bg-[var(--bg-quaternary)]',
        className
      )}
      role="region"
      aria-label="Module filter legend"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold">Active Modules</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
          <Filter className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{totalActive}/{totalAvailable}</span>
        </div>
      </div>

      <ScrollArea className="max-h-[320px]">
        <div className="p-3 space-y-4">
          {phaseGroups.map((group) => (
            <PhaseGroup
              key={group.phase}
              phase={group.phase}
              label={group.label}
              modules={group.modules}
              onToggleModule={onToggleModule}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
})

interface PhaseGroupProps {
  phase: string
  label: string
  modules: Array<{ name: string; count: number; active: boolean }>
  onToggleModule: (module: string) => void
}

const PhaseGroup = memo(function PhaseGroup({
  phase,
  label,
  modules,
  onToggleModule,
}: PhaseGroupProps) {
  return (
    <div role="group" aria-label={`${label} modules`}>
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2 px-1">
        {label}
        <span className="ml-1.5 font-normal">({modules.length})</span>
      </h4>
      <div className="space-y-1">
        {modules.map((mod) => (
          <ModuleToggle
            key={mod.name}
            moduleName={mod.name}
            count={mod.count}
            active={mod.active}
            onToggle={onToggleModule}
          />
        ))}
      </div>
    </div>
  )
})

interface ModuleToggleProps {
  moduleName: string
  count: number
  active: boolean
  onToggle: (module: string) => void
}

const ModuleToggle = memo(function ModuleToggle({
  moduleName,
  count,
  active,
  onToggle,
}: ModuleToggleProps) {
  const handleCheckedChange = useCallback(() => {
    onToggle(moduleName)
  }, [onToggle, moduleName])

  return (
    <label
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer',
        'hover:bg-[var(--bg-quaternary)]/60',
        'focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-1',
        'motion-safe:transition-colors motion-safe:duration-100',
        'motion-reduce:transition-none',
        !active && 'opacity-50'
      )}
    >
      <Checkbox
        checked={active}
        onCheckedChange={handleCheckedChange}
        aria-label={`Toggle ${moduleName} module${active ? ', currently enabled' : ', currently disabled'}`}
        className="shrink-0"
      />
      <ModuleBadge moduleName={moduleName} className={cn(!active && 'opacity-60')} />
      <span className="ml-auto text-[11px] tabular-nums text-[var(--muted-foreground)] shrink-0">
        {count}
      </span>
    </label>
  )
})
