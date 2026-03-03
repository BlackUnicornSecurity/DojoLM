/**
 * File: GapMatrix.tsx
 * Purpose: Framework x control gap matrix showing coverage status per control
 * Story: S74
 * Index:
 * - GapControl interface (line 16)
 * - GapMatrixData interface (line 26)
 * - GapMatrixProps interface (line 34)
 * - StatusCell component (line 39)
 * - GapMatrix component (line 72)
 */

'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Minus } from 'lucide-react'

// --- Types ---

interface GapControl {
  id: string
  name: string
  status: 'covered' | 'gap' | 'partial'
  coverage: number
  relatedModules: string[]
  evidenceType?: string
  evidenceRef?: string
}

interface GapMatrixData {
  frameworkId: string
  frameworkName: string
  version: string
  controls: GapControl[]
  overallCoverage: number
}

// --- Props ---

export interface GapMatrixProps {
  framework: string
  className?: string
}

// --- Status Cell Component ---

function StatusCell({ status }: { status: 'covered' | 'gap' | 'partial' }) {
  const config = {
    covered: {
      icon: CheckCircle,
      label: 'Covered',
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    gap: {
      icon: XCircle,
      label: 'Gap',
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
    partial: {
      icon: AlertTriangle,
      label: 'Partial',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
  }

  const c = config[status]
  const Icon = c.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
        c.bg,
        c.text,
        c.border
      )}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {c.label}
    </span>
  )
}

// --- Main GapMatrix Component ---

export function GapMatrix({ framework, className }: GapMatrixProps) {
  const [data, setData] = useState<GapMatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch('/api/compliance')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch compliance data')
        return res.json()
      })
      .then((apiData) => {
        if (cancelled) return

        // Find the matching framework from the API response
        const frameworks = apiData.frameworks ?? []
        const fw = frameworks.find(
          (f: Record<string, unknown>) =>
            f.id === framework || String(f.name ?? '').toLowerCase().includes(framework.toLowerCase())
        ) ?? frameworks[0]

        if (!fw) {
          setData(null)
          return
        }

        const controls: GapControl[] = (fw.controls ?? []).map(
          (c: Record<string, unknown>) => ({
            id: String(c.id ?? ''),
            name: String(c.name ?? ''),
            status: (['covered', 'gap', 'partial'].includes(String(c.status ?? ''))
              ? String(c.status)
              : 'gap') as 'covered' | 'gap' | 'partial',
            coverage: Number(c.coverage ?? 0),
            relatedModules: Array.isArray(c.relatedModules)
              ? c.relatedModules.map(String)
              : c.evidenceRef
                ? [String(c.evidenceRef)]
                : [],
            evidenceType: c.evidenceType ? String(c.evidenceType) : undefined,
            evidenceRef: c.evidenceRef ? String(c.evidenceRef) : undefined,
          })
        )

        const overallCoverage =
          controls.length > 0
            ? Math.round(
                controls.reduce((sum: number, c: GapControl) => sum + c.coverage, 0) /
                  controls.length
              )
            : 0

        setData({
          frameworkId: String(fw.id ?? framework),
          frameworkName: String(fw.name ?? framework),
          version: String(fw.version ?? '1.0'),
          controls,
          overallCoverage,
        })
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [framework])

  // --- Loading ---
  if (loading) {
    return (
      <div
        className={cn('flex items-center justify-center p-8', className)}
        role="status"
        aria-label="Loading gap matrix"
      >
        <div
          className="animate-spin motion-reduce:animate-none rounded-full h-6 w-6 border-b-2 border-[var(--dojo-primary)]"
          aria-hidden="true"
        />
        <span className="ml-3 text-sm text-[var(--muted-foreground)]">
          Loading gap matrix...
        </span>
      </div>
    )
  }

  // --- Error ---
  if (error) {
    return (
      <div className={cn('p-4 rounded-lg bg-red-50 dark:bg-red-900/20', className)} role="alert">
        <p className="text-sm text-red-700 dark:text-red-400">
          Error loading gap matrix: {error}
        </p>
      </div>
    )
  }

  // --- No data ---
  if (!data || data.controls.length === 0) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <Minus className="w-8 h-8 mx-auto mb-2 text-[var(--muted-foreground)]" aria-hidden="true" />
        <p className="text-sm text-[var(--muted-foreground)]">
          No control data available for this framework.
        </p>
      </div>
    )
  }

  const coveredCount = data.controls.filter((c) => c.status === 'covered').length
  const gapCount = data.controls.filter((c) => c.status === 'gap').length
  const partialCount = data.controls.filter((c) => c.status === 'partial').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {data.frameworkName}
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            v{data.version} - {data.controls.length} controls
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm bg-green-500"
              aria-hidden="true"
            />
            Covered: {coveredCount}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm bg-yellow-500"
              aria-hidden="true"
            />
            Partial: {partialCount}
          </span>
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm bg-red-500"
              aria-hidden="true"
            />
            Gap: {gapCount}
          </span>
        </div>
      </div>

      {/* Controls Table */}
      <div className="overflow-x-auto rounded-md border border-[var(--border)]">
        <table
          className="min-w-full text-sm"
          aria-label={`${data.frameworkName} gap matrix`}
        >
          <thead>
            <tr className="bg-[var(--bg-quaternary)] border-b border-[var(--border)]">
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase w-28"
              >
                Control ID
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase"
              >
                Control Name
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-center text-xs font-medium text-[var(--muted-foreground)] uppercase w-28"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase w-24"
              >
                Coverage
              </th>
              <th
                scope="col"
                className="px-3 py-2 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase"
              >
                Related Modules
              </th>
            </tr>
          </thead>
          <tbody>
            {data.controls.map((control) => (
              <tr
                key={control.id}
                className={cn(
                  'border-b border-[var(--border)] last:border-0',
                  control.status === 'gap' && 'bg-red-50/50 dark:bg-red-900/10',
                  control.status === 'partial' && 'bg-yellow-50/50 dark:bg-yellow-900/10'
                )}
              >
                <td className="px-3 py-2 font-mono text-xs text-[var(--muted-foreground)]">
                  {control.id}
                </td>
                <td className="px-3 py-2 text-[var(--foreground)]">
                  {control.name}
                </td>
                <td className="px-3 py-2 text-center">
                  <StatusCell status={control.status} />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div
                      className="w-16 h-1.5 rounded-full bg-[var(--border)] overflow-hidden"
                      aria-hidden="true"
                    >
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          control.coverage >= 90
                            ? 'bg-green-500'
                            : control.coverage >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        )}
                        style={{ width: `${Math.min(100, Math.max(0, control.coverage))}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-[var(--foreground)] w-10 text-right">
                      {control.coverage}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-[var(--muted-foreground)] max-w-xs">
                  {control.relatedModules.length > 0 ? (
                    <span className="flex flex-wrap gap-1">
                      {control.relatedModules.map((mod, idx) => (
                        <span
                          key={`${control.id}-mod-${idx}`}
                          className="inline-block px-1.5 py-0.5 rounded bg-[var(--bg-quaternary)] font-mono text-[10px]"
                        >
                          {mod}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[var(--muted-foreground)] italic">None</span>
                  )}
                </td>
              </tr>
            ))}

            {/* Summary Row */}
            <tr className="bg-[var(--bg-quaternary)] font-medium border-t-2 border-[var(--border)]">
              <td className="px-3 py-2 text-xs text-[var(--foreground)]" colSpan={2}>
                Overall Coverage
              </td>
              <td className="px-3 py-2 text-center">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                    data.overallCoverage >= 90
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : data.overallCoverage >= 75
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {data.overallCoverage >= 90 ? 'Good' : data.overallCoverage >= 75 ? 'Fair' : 'Low'}
                </span>
              </td>
              <td className="px-3 py-2 text-right">
                <span className="font-mono text-sm font-bold text-[var(--foreground)]">
                  {data.overallCoverage}%
                </span>
              </td>
              <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
                {coveredCount}/{data.controls.length} controls covered
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
