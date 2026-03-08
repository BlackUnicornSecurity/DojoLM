/**
 * File: GapMatrix.tsx
 * Purpose: Cross-framework gap matrix showing BAISS controls vs framework mappings
 * Story: S74, BUSHIDO-BOOK-4.4
 * Index:
 * - FRAMEWORK_COLUMNS constant
 * - TIER_GROUPS, IMPLEMENTED_KEYS constants
 * - GapMatrixProps interface
 * - StatusDot component
 * - GapMatrix component
 */

'use client'

import { Fragment, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Filter, Eye, EyeOff } from 'lucide-react'
import {
  BAISS_CONTROLS,
  BAISS_CATEGORIES,
  type BAISSControl,
} from '@/lib/data/baiss-framework'

/** Framework columns for the matrix — mirrors BAISS mappedFrameworks keys */
const FRAMEWORK_COLUMNS: { key: string; label: string; shortLabel: string; tier: string }[] = [
  // Implemented
  { key: 'owasp', label: 'OWASP LLM Top 10', shortLabel: 'OWASP', tier: 'implemented' },
  { key: 'nist', label: 'NIST AI 600-1', shortLabel: 'NIST', tier: 'implemented' },
  { key: 'mitre', label: 'MITRE ATLAS', shortLabel: 'MITRE', tier: 'implemented' },
  { key: 'iso', label: 'ISO 42001', shortLabel: 'ISO', tier: 'implemented' },
  { key: 'euAi', label: 'EU AI Act', shortLabel: 'EU AI', tier: 'implemented' },
  { key: 'enisa', label: 'ENISA AI Security', shortLabel: 'ENISA', tier: 'implemented' },
  // HIGH-priority
  { key: 'nist218a', label: 'NIST 800-218A', shortLabel: '218A', tier: 'high' },
  { key: 'iso23894', label: 'ISO 23894', shortLabel: '23894', tier: 'high' },
  { key: 'iso24027', label: 'ISO 24027', shortLabel: '24027', tier: 'high' },
  { key: 'iso24028', label: 'ISO 24028', shortLabel: '24028', tier: 'high' },
  { key: 'saif', label: 'Google SAIF', shortLabel: 'SAIF', tier: 'high' },
  { key: 'cisaNcsc', label: 'CISA/NCSC', shortLabel: 'CISA', tier: 'high' },
  // MEDIUM-priority
  { key: 'slsa', label: 'SLSA v1.0', shortLabel: 'SLSA', tier: 'medium' },
  { key: 'mlBom', label: 'ML-BOM', shortLabel: 'BOM', tier: 'medium' },
  { key: 'openssf', label: 'OpenSSF', shortLabel: 'SSF', tier: 'medium' },
  { key: 'nistCsf2', label: 'NIST CSF 2.0', shortLabel: 'CSF2', tier: 'medium' },
  { key: 'ukDsit', label: 'UK DSIT', shortLabel: 'DSIT', tier: 'medium' },
  { key: 'ieeeP7000', label: 'IEEE P7000', shortLabel: 'IEEE', tier: 'medium' },
  { key: 'nistAi1004', label: 'NIST AI 100-4', shortLabel: '1004', tier: 'medium' },
  { key: 'euAiGpai', label: 'EU AI GPAI', shortLabel: 'GPAI', tier: 'medium' },
  // Regional
  { key: 'sgMgaf', label: 'SG MGAF', shortLabel: 'SG', tier: 'regional' },
  { key: 'caAia', label: 'CA AIA', shortLabel: 'CA', tier: 'regional' },
  { key: 'auAie', label: 'AU AIE', shortLabel: 'AU', tier: 'regional' },
  // Referenced
  { key: 'iso27001', label: 'ISO 27001 AI', shortLabel: '27001', tier: 'referenced' },
  { key: 'owaspAsvs', label: 'OWASP ASVS', shortLabel: 'ASVS', tier: 'referenced' },
  { key: 'owaspApi', label: 'OWASP API', shortLabel: 'API', tier: 'referenced' },
  { key: 'nist80053', label: 'NIST 800-53', shortLabel: '53', tier: 'referenced' },
  { key: 'gdpr', label: 'GDPR AI', shortLabel: 'GDPR', tier: 'referenced' },
]

const TIER_GROUPS = [
  { id: 'implemented', label: 'Implemented' },
  { id: 'high', label: 'High Priority' },
  { id: 'medium', label: 'Medium Priority' },
  { id: 'regional', label: 'Regional' },
  { id: 'referenced', label: 'Referenced' },
]

const IMPLEMENTED_KEYS = new Set(
  FRAMEWORK_COLUMNS.filter((c) => c.tier === 'implemented').map((c) => c.key)
)

// --- Props ---

export interface GapMatrixProps {
  framework?: string
  className?: string
}

// --- Status Dot Component ---

function StatusDot({ mapped, controlIds }: { mapped: boolean; controlIds?: string[] }) {
  if (!mapped) {
    return (
      <span className="flex items-center justify-center" aria-label="No mapping">
        <XCircle className="w-3.5 h-3.5 text-[var(--text-tertiary)]" aria-hidden="true" />
      </span>
    )
  }
  return (
    <span
      className="flex items-center justify-center"
      title={controlIds?.join(', ')}
      aria-label={`Mapped: ${controlIds?.join(', ') ?? 'yes'}`}
    >
      <CheckCircle className="w-3.5 h-3.5 text-[var(--success)]" aria-hidden="true" />
    </span>
  )
}

// --- Main GapMatrix Component ---

export function GapMatrix({ className }: GapMatrixProps) {
  const [showAll, setShowAll] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(IMPLEMENTED_KEYS))
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  /** Toggle a framework column's visibility */
  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  /** Toggle all columns on/off */
  const handleShowAll = useCallback(() => {
    setShowAll((prev) => {
      const next = !prev
      if (next) {
        setVisibleColumns(new Set(FRAMEWORK_COLUMNS.map((c) => c.key)))
      } else {
        setVisibleColumns(new Set(IMPLEMENTED_KEYS))
      }
      return next
    })
  }, [])

  /** Active columns based on visibility */
  const activeColumns = useMemo(
    () => FRAMEWORK_COLUMNS.filter((c) => visibleColumns.has(c.key)),
    [visibleColumns]
  )

  /** Group BAISS controls by category for display */
  const controlsByCategory = useMemo(() => {
    const groups: { category: (typeof BAISS_CATEGORIES)[number]; controls: BAISSControl[] }[] = []
    for (const cat of BAISS_CATEGORIES) {
      const controls = BAISS_CONTROLS.filter((c) => c.category === cat.id)
      if (controls.length > 0) {
        groups.push({ category: cat, controls })
      }
    }
    return groups
  }, [])

  /** Coverage stats per visible column */
  const columnStats = useMemo(() => {
    const stats: Record<string, { mapped: number; total: number }> = {}
    for (const col of activeColumns) {
      let mapped = 0
      for (const control of BAISS_CONTROLS) {
        const ids = control.mappedFrameworks[col.key as keyof BAISSControl['mappedFrameworks']]
        if (ids && ids.length > 0) mapped++
      }
      stats[col.key] = { mapped, total: BAISS_CONTROLS.length }
    }
    return stats
  }, [activeColumns])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            BAISS Cross-Framework Gap Matrix
          </h3>
          <p className="text-xs text-muted-foreground">
            {BAISS_CONTROLS.length} controls × {activeColumns.length} frameworks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Show All toggle */}
          <button
            onClick={handleShowAll}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg min-h-[36px]',
              'motion-safe:transition-colors border',
              showAll
                ? 'border-[var(--bu-electric)] text-[var(--bu-electric)] bg-[var(--bu-electric)]/10'
                : 'border-[var(--border)] text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]'
            )}
            aria-pressed={showAll}
          >
            {showAll ? <EyeOff className="h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="h-3.5 w-3.5" aria-hidden="true" />}
            {showAll ? 'Show Implemented' : 'Show All'}
          </button>

          {/* Column picker toggle */}
          <button
            onClick={() => setShowColumnPicker((p) => !p)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg min-h-[36px]',
              'border border-[var(--border)] text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
              'motion-safe:transition-colors'
            )}
            aria-expanded={showColumnPicker}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Columns
          </button>
        </div>
      </div>

      {/* Column picker dropdown */}
      {showColumnPicker && (
        <div className="border border-[var(--border)] rounded-lg p-3 bg-[var(--bg-secondary)] space-y-3">
          {TIER_GROUPS.map((tier) => {
            const tierCols = FRAMEWORK_COLUMNS.filter((c) => c.tier === tier.id)
            return (
              <div key={tier.id}>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {tier.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {tierCols.map((col) => (
                    <label key={col.key} className="flex items-center gap-1.5 text-xs cursor-pointer min-h-[32px]">
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(col.key)}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-[var(--border)]"
                      />
                      <span className={cn(
                        visibleColumns.has(col.key) ? 'text-[var(--foreground)]' : 'text-muted-foreground'
                      )}>
                        {col.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Matrix table with horizontal scroll and sticky first column */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table
          className="text-sm border-collapse"
          aria-label="BAISS cross-framework gap matrix"
          style={{ minWidth: `${200 + activeColumns.length * 60}px` }}
        >
          <thead>
            <tr className="bg-[var(--bg-quaternary)] border-b border-[var(--border)]">
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase sticky left-0 bg-[var(--bg-quaternary)] z-10 min-w-[200px] border-r border-[var(--border)]"
              >
                BAISS Control
              </th>
              {activeColumns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-2 py-2 text-center text-[10px] font-medium text-muted-foreground uppercase min-w-[56px]"
                  title={col.label}
                >
                  {col.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {controlsByCategory.map(({ category, controls }) => (
              <Fragment key={category.id}>
                {/* Category header row */}
                <tr className="bg-[var(--bg-tertiary)]">
                  <td
                    colSpan={activeColumns.length + 1}
                    className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-[var(--bg-tertiary)]"
                  >
                    {category.label}
                  </td>
                </tr>
                {controls.map((control) => (
                  <tr
                    key={control.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-secondary)] motion-safe:transition-colors"
                  >
                    <td
                      className="px-3 py-1.5 sticky left-0 bg-[var(--bg-primary)] z-10 border-r border-[var(--border)]"
                      title={control.description}
                    >
                      <div className="flex items-center gap-1.5 min-w-[180px]">
                        <span className="font-mono text-[10px] font-semibold text-[var(--bu-electric)] flex-shrink-0">
                          {control.id}
                        </span>
                        <span className="text-xs text-[var(--foreground)] truncate">
                          {control.title}
                        </span>
                      </div>
                    </td>
                    {activeColumns.map((col) => {
                      const ids = control.mappedFrameworks[col.key as keyof BAISSControl['mappedFrameworks']]
                      const hasMappings = !!ids && ids.length > 0
                      return (
                        <td key={col.key} className="px-2 py-1.5 text-center">
                          <StatusDot mapped={hasMappings} controlIds={ids} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}

            {/* Summary row: mapping count per framework */}
            <tr className="bg-[var(--bg-quaternary)] font-medium border-t-2 border-[var(--border)]">
              <td className="px-3 py-2 text-xs text-[var(--foreground)] sticky left-0 bg-[var(--bg-quaternary)] z-10 border-r border-[var(--border)]">
                Coverage ({BAISS_CONTROLS.length} controls)
              </td>
              {activeColumns.map((col) => {
                const stats = columnStats[col.key]
                const pct = stats ? Math.round((stats.mapped / stats.total) * 100) : 0
                return (
                  <td key={col.key} className="px-2 py-2 text-center">
                    <span
                      className={cn(
                        'text-[10px] font-bold',
                        pct >= 80 ? 'text-[var(--success)]' : pct >= 40 ? 'text-[var(--warning)]' : 'text-[var(--danger)]'
                      )}
                    >
                      {pct}%
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
