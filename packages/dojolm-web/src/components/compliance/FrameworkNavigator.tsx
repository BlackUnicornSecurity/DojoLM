/**
 * File: FrameworkNavigator.tsx
 * Purpose: Bidirectional BAISS to source framework control mapping navigator
 * Story: TPI-NODA-6.2 - Bushido Book Framework Navigator
 * Index:
 * - FRAMEWORK_LABELS constant (line 20)
 * - FrameworkNavigatorProps interface (line 32)
 * - FrameworkNavigator component (line 37)
 * - MappingRow component (line 150)
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeftRight,
  Search,
  GitCompareArrows,
  ChevronRight,
} from 'lucide-react'
import {
  BAISS_CONTROLS,
  BAISS_CATEGORIES,
  type BAISSControl,
} from '@/lib/data/baiss-framework'

const FRAMEWORK_LABELS: Record<string, string> = {
  owasp: 'OWASP LLM Top 10',
  nist: 'NIST AI 600-1',
  mitre: 'MITRE ATLAS',
  iso: 'ISO 42001',
  euAi: 'EU AI Act',
  enisa: 'ENISA AI Security',
}

const FRAMEWORK_KEYS = Object.keys(FRAMEWORK_LABELS) as (keyof BAISSControl['mappedFrameworks'])[]

type NavigationDirection = 'baiss-to-source' | 'source-to-baiss'

export interface FrameworkNavigatorProps {
  className?: string
}

export function FrameworkNavigator({ className }: FrameworkNavigatorProps) {
  const [direction, setDirection] = useState<NavigationDirection>('baiss-to-source')
  const [selectedControl, setSelectedControl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSourceFramework, setSelectedSourceFramework] = useState<string>('owasp')

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // BAISS to source: filter BAISS controls by search
  const filteredBAISSControls = useMemo(() => {
    if (!searchQuery) return BAISS_CONTROLS
    const q = searchQuery.toLowerCase()
    return BAISS_CONTROLS.filter(
      (c) => c.id.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    )
  }, [searchQuery])

  // Source to BAISS: build reverse index of source control IDs to BAISS controls
  const reverseIndex = useMemo(() => {
    const index: Record<string, Record<string, BAISSControl[]>> = {}
    for (const fw of FRAMEWORK_KEYS) {
      index[fw] = {}
      for (const control of BAISS_CONTROLS) {
        const sourceIds = control.mappedFrameworks[fw]
        if (sourceIds) {
          for (const sourceId of sourceIds) {
            if (!index[fw][sourceId]) index[fw][sourceId] = []
            index[fw][sourceId].push(control)
          }
        }
      }
    }
    return index
  }, [])

  const sourceControlIds = useMemo(() => {
    const fwIndex = reverseIndex[selectedSourceFramework] ?? {}
    const ids = Object.keys(fwIndex).sort()
    if (!searchQuery) return ids
    const q = searchQuery.toLowerCase()
    return ids.filter((id) => id.toLowerCase().includes(q))
  }, [reverseIndex, selectedSourceFramework, searchQuery])

  // Get selected BAISS control data for detail view
  const selectedBAISS = useMemo(() => {
    if (!selectedControl) return null
    return BAISS_CONTROLS.find((c) => c.id === selectedControl) ?? null
  }, [selectedControl])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-[var(--bu-electric)]" aria-hidden="true" />
          Framework Navigator
        </h3>

        {/* Direction toggle */}
        <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] rounded-lg p-1" role="radiogroup" aria-label="Navigation direction">
          <button
            role="radio"
            aria-checked={direction === 'baiss-to-source'}
            onClick={() => { setDirection('baiss-to-source'); setSelectedControl(null) }}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px]',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              direction === 'baiss-to-source'
                ? 'bg-[var(--bg-secondary)] text-[var(--foreground)] shadow-sm'
                : 'text-muted-foreground hover:text-[var(--foreground)]'
            )}
          >
            BAISS → Source
          </button>
          <button
            role="radio"
            aria-checked={direction === 'source-to-baiss'}
            onClick={() => { setDirection('source-to-baiss'); setSelectedControl(null) }}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium min-h-[36px]',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              direction === 'source-to-baiss'
                ? 'bg-[var(--bg-secondary)] text-[var(--foreground)] shadow-sm'
                : 'text-muted-foreground hover:text-[var(--foreground)]'
            )}
          >
            Source → BAISS
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder={direction === 'baiss-to-source' ? 'Search BAISS controls...' : 'Search source control IDs...'}
          className="w-full pl-10 pr-3 py-2 rounded-lg bg-[var(--input)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] min-h-[44px]"
          aria-label="Search controls"
        />
      </div>

      {/* Source framework selector (source-to-baiss mode) */}
      {direction === 'source-to-baiss' && (
        <div className="flex items-center gap-1.5 flex-wrap" role="radiogroup" aria-label="Source framework">
          {FRAMEWORK_KEYS.map((fw) => (
            <button
              key={fw}
              role="radio"
              aria-checked={selectedSourceFramework === fw}
              onClick={() => { setSelectedSourceFramework(fw); setSelectedControl(null) }}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full min-h-[32px]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                selectedSourceFramework === fw
                  ? 'bg-[var(--bu-electric)] text-white'
                  : 'bg-[var(--bg-quaternary)] text-muted-foreground hover:bg-[var(--bg-tertiary)]'
              )}
            >
              {FRAMEWORK_LABELS[fw]}
            </button>
          ))}
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Control list */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {direction === 'baiss-to-source' ? 'BAISS Controls' : `${FRAMEWORK_LABELS[selectedSourceFramework]} Controls`}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto space-y-1 p-3">
            {direction === 'baiss-to-source' ? (
              filteredBAISSControls.map((control) => (
                <button
                  key={control.id}
                  onClick={() => setSelectedControl(control.id)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 rounded-md text-left text-xs min-h-[40px]',
                    'motion-safe:transition-colors',
                    selectedControl === control.id
                      ? 'bg-[var(--bu-electric-muted)] text-[var(--foreground)]'
                      : 'hover:bg-[var(--bg-tertiary)] text-muted-foreground'
                  )}
                  aria-label={`${control.id}: ${control.title}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-mono font-semibold text-[var(--bu-electric)] flex-shrink-0">{control.id}</span>
                    <span className="truncate">{control.title}</span>
                  </span>
                  <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </button>
              ))
            ) : (
              sourceControlIds.map((sourceId) => (
                <button
                  key={sourceId}
                  onClick={() => setSelectedControl(sourceId)}
                  className={cn(
                    'flex items-center justify-between w-full px-3 py-2 rounded-md text-left text-xs min-h-[40px]',
                    'motion-safe:transition-colors',
                    selectedControl === sourceId
                      ? 'bg-[var(--bu-electric-muted)] text-[var(--foreground)]'
                      : 'hover:bg-[var(--bg-tertiary)] text-muted-foreground'
                  )}
                  aria-label={`Source control ${sourceId}`}
                >
                  <span className="font-mono font-semibold">{sourceId}</span>
                  <ChevronRight className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Mapping details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {direction === 'baiss-to-source' ? 'Source Framework Mappings' : 'BAISS Mappings'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {!selectedControl ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowLeftRight className="w-8 h-8 text-[var(--text-tertiary)] mb-3" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Select a control to see its framework mappings
                </p>
              </div>
            ) : direction === 'baiss-to-source' && selectedBAISS ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{selectedBAISS.id}: {selectedBAISS.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedBAISS.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-[10px]">{selectedBAISS.assessmentType}</Badge>
                    {BAISS_CATEGORIES.find((c) => c.id === selectedBAISS.category) && (
                      <Badge variant="outline" className="text-[10px]">
                        {BAISS_CATEGORIES.find((c) => c.id === selectedBAISS.category)!.label}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {FRAMEWORK_KEYS.map((fw) => {
                    const ids = selectedBAISS.mappedFrameworks[fw]
                    if (!ids || ids.length === 0) return null
                    return (
                      <MappingRow
                        key={fw}
                        frameworkLabel={FRAMEWORK_LABELS[fw]}
                        controlIds={ids}
                      />
                    )
                  })}
                </div>
              </div>
            ) : direction === 'source-to-baiss' && selectedControl ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {FRAMEWORK_LABELS[selectedSourceFramework]}: {selectedControl}
                  </p>
                </div>
                <div className="space-y-2">
                  {(reverseIndex[selectedSourceFramework]?.[selectedControl] ?? []).map((baissControl) => (
                    <div key={baissControl.id} className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-[var(--bu-electric)]">{baissControl.id}</span>
                        <span className="text-xs font-medium text-[var(--foreground)]">{baissControl.title}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{baissControl.description}</p>
                      <Badge variant="outline" className="text-[10px] mt-1.5">{baissControl.assessmentType}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MappingRow({ frameworkLabel, controlIds }: { frameworkLabel: string; controlIds: string[] }) {
  return (
    <div className="p-2.5 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
        {frameworkLabel}
      </p>
      <div className="flex flex-wrap gap-1">
        {controlIds.map((id) => (
          <Badge key={id} variant="outline" className="text-[10px] font-mono">
            {id}
          </Badge>
        ))}
      </div>
    </div>
  )
}
