/**
 * S39: Compliance Coverage Dashboard
 * Displays framework coverage gauges, gap analysis, and evidence links.
 * WCAG AA compliant. Fetches from /api/compliance.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

// --- Types ---

interface ComplianceControl {
  id: string
  name: string
  status: 'covered' | 'partial' | 'gap'
  coverage: number
  evidenceType: 'module' | 'fixture' | 'documentation' | 'process'
  evidenceRef: string
  remediationStatus?: 'open' | 'in-progress' | 'closed'
}

interface ComplianceFramework {
  id: string
  name: string
  version: string
  overallCoverage: number
  controls: ComplianceControl[]
  lastAssessed: string
}

interface ComplianceSummary {
  totalFrameworks: number
  avgCoverage: number
  openGaps: number
  inProgressGaps: number
  closedGaps: number
}

interface ComplianceData {
  summary: ComplianceSummary
  frameworks: ComplianceFramework[]
  lastUpdated: string
}

// --- Coverage Gauge Component ---

function CoverageGauge({ value, label, size = 'md' }: { value: number; label: string; size?: 'sm' | 'md' | 'lg' }) {
  const radius = size === 'lg' ? 45 : size === 'md' ? 35 : 25
  const stroke = size === 'lg' ? 8 : size === 'md' ? 6 : 4
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference
  const svgSize = (radius + stroke) * 2

  const getColor = (v: number) => {
    if (v >= 90) return 'text-[var(--status-allow)]'
    if (v >= 75) return 'text-[var(--severity-medium)]'
    if (v >= 50) return 'text-[var(--severity-high)]'
    return 'text-[var(--status-block)]'
  }

  const getStrokeColor = (v: number) => {
    if (v >= 90) return 'var(--success)'
    if (v >= 75) return 'var(--warning)'
    if (v >= 50) return 'var(--severity-high)'
    return 'var(--danger)'
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} aria-hidden="true">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted-foreground/20"
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
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'} ${getColor(value)}`}>
            {value}%
          </span>
        </div>
      </div>
      <span className={`text-center font-medium ${size === 'lg' ? 'text-sm' : 'text-xs'} text-muted-foreground`} aria-label={label ? `${label}: ${value}% coverage` : `${value}% coverage`}>
        {label}
      </span>
    </div>
  )
}

// --- Status Badge Component ---

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    covered: 'bg-[var(--status-allow)]/10 text-[var(--status-allow)]',
    partial: 'bg-[var(--severity-medium)]/10 text-[var(--severity-medium)]',
    gap: 'bg-[var(--status-block)]/10 text-[var(--status-block)]',
    open: 'bg-[var(--status-block)]/10 text-[var(--status-block)]',
    'in-progress': 'bg-[var(--bu-electric)]/10 text-[var(--bu-electric)]',
    closed: 'bg-[var(--status-allow)]/10 text-[var(--status-allow)]',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {status}
    </span>
  )
}

// --- Gap List Component ---

function GapList({ frameworks }: { frameworks: ComplianceFramework[] }) {
  const gaps = frameworks.flatMap(f =>
    f.controls
      .filter(c => c.status !== 'covered')
      .map(c => ({ ...c, framework: f.name }))
  )

  if (gaps.length === 0) {
    return <p className="text-[var(--status-allow)] font-medium">No open gaps - full coverage achieved!</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-[var(--border)]" aria-label="Compliance gaps">
        <thead className="bg-[var(--bg-tertiary)]">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Framework</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Control</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Coverage</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Evidence</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Remediation</th>
          </tr>
        </thead>
        <tbody className="bg-[var(--bg-secondary)] divide-y divide-[var(--border)]">
          {gaps.map((gap) => (
            <tr key={`${gap.framework}-${gap.id}`}>
              <td className="px-4 py-2 text-sm text-foreground">{gap.framework}</td>
              <td className="px-4 py-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{gap.id}</span>
                <span className="ml-2 text-foreground">{gap.name}</span>
              </td>
              <td className="px-4 py-2"><StatusBadge status={gap.status} /></td>
              <td className="px-4 py-2 text-sm text-foreground">{gap.coverage}%</td>
              <td className="px-4 py-2 text-sm text-muted-foreground max-w-xs truncate">{gap.evidenceRef}</td>
              <td className="px-4 py-2">{gap.remediationStatus ? <StatusBadge status={gap.remediationStatus} /> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Main Dashboard ---

export default function ComplianceDashboard() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedFramework, setExpandedFramework] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/compliance')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch compliance data')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'An unknown error occurred'))
      .finally(() => setLoading(false))
  }, [])

  const toggleFramework = useCallback((id: string) => {
    setExpandedFramework(prev => prev === id ? null : id)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4" role="status" aria-label="Loading compliance data">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-[var(--dojo-primary)]" aria-hidden="true" />
        <span className="ml-3 text-muted-foreground">Loading compliance data...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-[var(--status-block)]/10 rounded-lg" role="alert">
        <p className="text-[var(--status-block)]">Error loading compliance data: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">Compliance Coverage Dashboard</h2>
          <span className="text-sm text-muted-foreground">Last updated: {data.lastUpdated}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="text-2xl font-bold text-foreground">{data.summary.avgCoverage}%</div>
            <div className="text-sm text-muted-foreground">Avg Coverage</div>
          </div>
          <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="text-2xl font-bold text-[var(--status-block)]">{data.summary.openGaps}</div>
            <div className="text-sm text-muted-foreground">Open Gaps</div>
          </div>
          <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="text-2xl font-bold text-[var(--bu-electric)]">{data.summary.inProgressGaps}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </div>
          <div className="text-center p-3 bg-[var(--bg-tertiary)] rounded-lg">
            <div className="text-2xl font-bold text-[var(--status-allow)]">{data.summary.closedGaps}</div>
            <div className="text-sm text-muted-foreground">Closed/Covered</div>
          </div>
        </div>

        {/* Framework Gauges */}
        <div className="flex flex-wrap justify-center gap-6">
          {data.frameworks.map(f => (
            <CoverageGauge key={f.id} value={f.overallCoverage} label={f.name} size="md" />
          ))}
        </div>
      </div>

      {/* Framework Details */}
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm">
        <h3 className="text-lg font-semibold text-foreground p-4 border-b border-[var(--border)]">
          Framework Details
        </h3>
        <div className="divide-y divide-[var(--border)]">
          {data.frameworks.map(f => (
            <div key={f.id}>
              <button
                onClick={() => toggleFramework(f.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-tertiary)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
                aria-expanded={expandedFramework === f.id}
                aria-controls={`framework-${f.id}`}
              >
                <div className="flex items-center gap-3">
                  <CoverageGauge value={f.overallCoverage} label={f.name} size="sm" />
                  <div className="text-left">
                    <div className="font-medium text-foreground">{f.name}</div>
                    <div className="text-xs text-muted-foreground">v{f.version} | {f.controls.length} controls | Assessed: {f.lastAssessed}</div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-muted-foreground motion-safe:transition-transform ${expandedFramework === f.id ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedFramework === f.id && (
                <div id={`framework-${f.id}`} className="px-4 pb-4">
                  <table className="min-w-full divide-y divide-[var(--border)]" aria-label={`${f.name} controls`}>
                    <thead className="bg-[var(--bg-tertiary)]">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Control</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Coverage</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {f.controls.map(c => (
                        <tr key={c.id}>
                          <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{c.id}</td>
                          <td className="px-3 py-2 text-sm text-foreground">{c.name}</td>
                          <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                          <td className="px-3 py-2 text-sm">{c.coverage}%</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">
                            <span className="font-mono">[{c.evidenceType}]</span> {c.evidenceRef}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="bg-[var(--bg-secondary)] rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold text-foreground mb-4">Gap Analysis</h3>
        <GapList frameworks={data.frameworks} />
      </div>
    </div>
  )
}
