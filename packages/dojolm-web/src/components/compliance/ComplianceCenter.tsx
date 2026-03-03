/**
 * File: ComplianceCenter.tsx
 * Purpose: Main compliance center page with framework selector, overall score, gap summary, and sub-views
 * Story: S74
 * Index:
 * - FRAMEWORKS constant (line 16)
 * - ComplianceFrameworkData interface (line 29)
 * - ComplianceCenterData interface (line 40)
 * - SubView type (line 48)
 * - ScoreMeter component (line 50)
 * - FrameworkGapSummary component (line 97)
 * - ComplianceCenter component (line 127)
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  FileText,
  ClipboardList,
  BarChart3,
} from 'lucide-react'
import { GapMatrix } from './GapMatrix'
import { AuditTrail } from './AuditTrail'

// --- Constants ---

const FRAMEWORKS = [
  { id: 'owasp-llm-top10', label: 'OWASP LLM Top 10', shortLabel: 'OWASP' },
  { id: 'nist-ai-600-1', label: 'NIST AI 600-1', shortLabel: 'NIST' },
  { id: 'mitre-atlas', label: 'MITRE ATLAS', shortLabel: 'ATLAS' },
  { id: 'iso-42001', label: 'ISO 42001', shortLabel: 'ISO' },
  { id: 'eu-ai-act', label: 'EU AI Act', shortLabel: 'EU AI' },
  { id: 'enisa', label: 'ENISA', shortLabel: 'ENISA' },
] as const

type FrameworkId = (typeof FRAMEWORKS)[number]['id']

// --- Types ---

interface ComplianceFrameworkData {
  id: string
  name: string
  overallCoverage: number
  totalControls: number
  coveredControls: number
  gapControls: number
  partialControls: number
  lastAssessed: string
}

interface ComplianceCenterData {
  overallScore: number
  frameworks: ComplianceFrameworkData[]
  lastUpdated: string
}

type SubView = 'overview' | 'gap-matrix' | 'audit-trail'

// --- Score Meter Component ---

function ScoreMeter({ value, className }: { value: number; className?: string }) {
  const radius = 54
  const stroke = 10
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const svgSize = (radius + stroke) * 2

  const getStrokeColor = (v: number): string => {
    if (v >= 90) return 'var(--success, #22c55e)'
    if (v >= 75) return 'var(--warning, #eab308)'
    if (v >= 50) return 'var(--dojo-primary, #f97316)'
    return 'var(--danger, #ef4444)'
  }

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg
          width={svgSize}
          height={svgSize}
          aria-hidden="true"
          className="motion-reduce:animate-none"
        >
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={getStrokeColor(value)}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${radius + stroke} ${radius + stroke})`}
            className="motion-reduce:transition-none transition-[stroke-dashoffset] duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-[var(--foreground)]">
            {value}%
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            Overall Score
          </span>
        </div>
      </div>
    </div>
  )
}

// --- Framework Gap Summary ---

function FrameworkGapSummary({
  framework,
  isSelected,
  onSelect,
}: {
  framework: ComplianceFrameworkData
  isSelected: boolean
  onSelect: () => void
}) {
  const gapCount = framework.gapControls + framework.partialControls

  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-center justify-between w-full px-3 py-2 rounded-md text-left',
        'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
        isSelected
          ? 'bg-[var(--bg-quaternary)] border border-[var(--dojo-primary)]'
          : 'hover:bg-[var(--bg-secondary)] border border-transparent'
      )}
      aria-pressed={isSelected}
      aria-label={`${framework.name}: ${framework.overallCoverage}% coverage, ${gapCount} gaps`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Shield className="w-4 h-4 flex-shrink-0 text-[var(--muted-foreground)]" aria-hidden="true" />
        <span className="text-sm font-medium text-[var(--foreground)] truncate">
          {framework.name}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="text-xs font-mono text-[var(--muted-foreground)]">
          {framework.overallCoverage}%
        </span>
        {gapCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--danger)]">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
            {gapCount}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]">
            <CheckCircle className="w-3 h-3" aria-hidden="true" />
            0
          </span>
        )}
      </div>
    </button>
  )
}

// --- Main Compliance Center ---

export default function ComplianceCenter() {
  const [data, setData] = useState<ComplianceCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFramework, setSelectedFramework] = useState<FrameworkId>('owasp-llm-top10')
  const [subView, setSubView] = useState<SubView>('overview')

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
        // Normalize API response to our shape
        const frameworks: ComplianceFrameworkData[] = (apiData.frameworks ?? []).map(
          (f: Record<string, unknown>) => ({
            id: String(f.id ?? ''),
            name: String(f.name ?? ''),
            overallCoverage: Number(f.overallCoverage ?? 0),
            totalControls: Array.isArray(f.controls) ? f.controls.length : Number(f.totalControls ?? 0),
            coveredControls: Array.isArray(f.controls)
              ? f.controls.filter((c: Record<string, unknown>) => c.status === 'covered').length
              : Number(f.coveredControls ?? 0),
            gapControls: Array.isArray(f.controls)
              ? f.controls.filter((c: Record<string, unknown>) => c.status === 'gap').length
              : Number(f.gapControls ?? 0),
            partialControls: Array.isArray(f.controls)
              ? f.controls.filter((c: Record<string, unknown>) => c.status === 'partial').length
              : Number(f.partialControls ?? 0),
            lastAssessed: String(f.lastAssessed ?? ''),
          })
        )
        const overallScore =
          apiData.summary?.avgCoverage ??
          (frameworks.length > 0
            ? Math.round(frameworks.reduce((sum: number, f: ComplianceFrameworkData) => sum + f.overallCoverage, 0) / frameworks.length)
            : 0)

        setData({
          overallScore,
          frameworks,
          lastUpdated: String(apiData.lastUpdated ?? new Date().toISOString()),
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
  }, [])

  const handleFrameworkSelect = useCallback((id: FrameworkId) => {
    setSelectedFramework(id)
  }, [])

  const handleSubViewChange = useCallback((view: SubView) => {
    setSubView(view)
  }, [])

  // --- Loading state ---
  if (loading) {
    return (
      <div
        className="flex items-center justify-center p-12"
        role="status"
        aria-label="Loading compliance center"
      >
        <div
          className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-[var(--dojo-primary)]"
          aria-hidden="true"
        />
        <span className="ml-3 text-[var(--muted-foreground)]">
          Loading compliance data...
        </span>
      </div>
    )
  }

  // --- Error state ---
  if (error || !data) {
    return (
      <div className="p-6 rounded-lg bg-red-50 dark:bg-red-900/20" role="alert">
        <p className="text-red-700 dark:text-red-400">
          Error loading compliance data: {error}
        </p>
      </div>
    )
  }

  const selectedFw = data.frameworks.find((f) => f.id === selectedFramework) ?? data.frameworks[0]
  const totalGaps = data.frameworks.reduce((sum, f) => sum + f.gapControls + f.partialControls, 0)

  const subTabs: { id: SubView; label: string; icon: typeof BarChart3 }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'gap-matrix', label: 'Gap Matrix', icon: ClipboardList },
    { id: 'audit-trail', label: 'Audit Trail', icon: FileText },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">
          Compliance Center
        </h1>
        <span className="text-sm text-[var(--muted-foreground)]">
          Last updated: {data.lastUpdated}
        </span>
      </div>

      {/* Top Section: Score + Framework Selector + Gap Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Meter */}
        <div className="lg:col-span-3 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-6 flex flex-col items-center justify-center">
          <ScoreMeter value={data.overallScore} />
          <div className="mt-4 text-center">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {data.frameworks.length} Frameworks
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {totalGaps} total gaps
            </p>
          </div>
        </div>

        {/* Framework Selector Tabs */}
        <div className="lg:col-span-9 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
            Framework Coverage
          </h2>

          {/* Tab buttons - horizontal on desktop, vertical list on mobile */}
          <div
            className="flex flex-wrap gap-1 mb-4 border-b border-[var(--border)] pb-3"
            role="tablist"
            aria-label="Compliance framework selector"
          >
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                role="tab"
                aria-selected={selectedFramework === fw.id}
                aria-controls={`framework-panel-${fw.id}`}
                onClick={() => handleFrameworkSelect(fw.id)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)]',
                  selectedFramework === fw.id
                    ? 'bg-[var(--dojo-primary)] text-white font-medium'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]'
                )}
              >
                <span className="hidden sm:inline">{fw.label}</span>
                <span className="sm:hidden">{fw.shortLabel}</span>
              </button>
            ))}
          </div>

          {/* Per-framework gap list */}
          <div
            id={`framework-panel-${selectedFramework}`}
            role="tabpanel"
            aria-label={`${selectedFw?.name ?? selectedFramework} details`}
          >
            {data.frameworks.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
                No framework data available.
              </p>
            ) : (
              <div className="space-y-1.5">
                {data.frameworks.map((fw) => (
                  <FrameworkGapSummary
                    key={fw.id}
                    framework={fw}
                    isSelected={fw.id === selectedFramework}
                    onSelect={() => handleFrameworkSelect(fw.id as FrameworkId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-View Navigation */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div
          className="flex border-b border-[var(--border)]"
          role="tablist"
          aria-label="Compliance sub-view navigation"
        >
          {subTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={subView === tab.id}
                aria-controls={`subview-panel-${tab.id}`}
                onClick={() => handleSubViewChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--dojo-primary)]',
                  'border-b-2 -mb-px',
                  subView === tab.id
                    ? 'border-[var(--dojo-primary)] text-[var(--dojo-primary)]'
                    : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
                )}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Sub-view content */}
        <div className="p-4">
          {subView === 'overview' && (
            <div
              id="subview-panel-overview"
              role="tabpanel"
              aria-label="Overview"
            >
              <OverviewPanel framework={selectedFw} allFrameworks={data.frameworks} />
            </div>
          )}
          {subView === 'gap-matrix' && (
            <div
              id="subview-panel-gap-matrix"
              role="tabpanel"
              aria-label="Gap Matrix"
            >
              <GapMatrix framework={selectedFramework} />
            </div>
          )}
          {subView === 'audit-trail' && (
            <div
              id="subview-panel-audit-trail"
              role="tabpanel"
              aria-label="Audit Trail"
            >
              <AuditTrail />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// --- Overview Panel ---

function OverviewPanel({
  framework,
  allFrameworks,
}: {
  framework: ComplianceFrameworkData | undefined
  allFrameworks: ComplianceFrameworkData[]
}) {
  if (!framework) {
    return (
      <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
        Select a framework to view details.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selected framework detail */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-3">
          {framework.name}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--foreground)]">
              {framework.overallCoverage}%
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Coverage</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--success)]">
              {framework.coveredControls}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Covered</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--warning)]">
              {framework.partialControls}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Partial</p>
          </div>
          <div className="rounded-md bg-[var(--bg-quaternary)] p-3 text-center">
            <p className="text-2xl font-bold text-[var(--danger)]">
              {framework.gapControls}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">Gaps</p>
          </div>
        </div>
        {framework.lastAssessed && (
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Last assessed: {framework.lastAssessed}
          </p>
        )}
      </div>

      {/* All frameworks summary table */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">
          All Frameworks Summary
        </h3>
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            aria-label="All frameworks compliance summary"
          >
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase"
                >
                  Framework
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase"
                >
                  Coverage
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase"
                >
                  Controls
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase"
                >
                  Gaps
                </th>
                <th
                  scope="col"
                  className="px-3 py-2 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase"
                >
                  Partial
                </th>
              </tr>
            </thead>
            <tbody>
              {allFrameworks.map((fw) => (
                <tr
                  key={fw.id}
                  className={cn(
                    'border-b border-[var(--border)] last:border-0',
                    fw.id === framework.id && 'bg-[var(--bg-quaternary)]'
                  )}
                >
                  <td className="px-3 py-2 font-medium text-[var(--foreground)]">
                    {fw.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[var(--foreground)]">
                    {fw.overallCoverage}%
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--muted-foreground)]">
                    {fw.totalControls}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        'font-medium',
                        fw.gapControls > 0
                          ? 'text-[var(--danger)]'
                          : 'text-[var(--success)]'
                      )}
                    >
                      {fw.gapControls}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={cn(
                        'font-medium',
                        fw.partialControls > 0
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--success)]'
                      )}
                    >
                      {fw.partialControls}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export { ComplianceCenter }
