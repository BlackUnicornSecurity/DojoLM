/**
 * S39: Compliance Coverage Dashboard
 * Displays framework coverage gauges, gap analysis, and evidence links.
 * WCAG AA compliant. Fetches from /api/compliance.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'

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
    if (v >= 90) return 'text-green-500'
    if (v >= 75) return 'text-yellow-500'
    if (v >= 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getStrokeColor = (v: number) => {
    if (v >= 90) return '#22c55e'
    if (v >= 75) return '#eab308'
    if (v >= 50) return '#f97316'
    return '#ef4444'
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
            className="text-gray-200 dark:text-gray-700"
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
      <span className={`text-center font-medium ${size === 'lg' ? 'text-sm' : 'text-xs'} text-gray-600 dark:text-gray-400`} aria-label={`${label}: ${value}% coverage`}>
        {label}
      </span>
    </div>
  )
}

// --- Status Badge Component ---

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    covered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    gap: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    open: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    closed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
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
    return <p className="text-green-600 dark:text-green-400 font-medium">No open gaps - full coverage achieved!</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label="Compliance gaps">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Framework</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Control</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Coverage</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Evidence</th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remediation</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {gaps.map((gap) => (
            <tr key={`${gap.framework}-${gap.id}`}>
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{gap.framework}</td>
              <td className="px-4 py-2 text-sm">
                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{gap.id}</span>
                <span className="ml-2 text-gray-900 dark:text-gray-100">{gap.name}</span>
              </td>
              <td className="px-4 py-2"><StatusBadge status={gap.status} /></td>
              <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{gap.coverage}%</td>
              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">{gap.evidenceRef}</td>
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
    fetch('/api/compliance')
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
      <div className="flex items-center justify-center p-12" role="status" aria-label="Loading compliance data">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-blue-600" aria-hidden="true" />
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading compliance data...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg" role="alert">
        <p className="text-red-700 dark:text-red-400">Error loading compliance data: {error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compliance Coverage Dashboard</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">Last updated: {data.lastUpdated}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.summary.avgCoverage}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Avg Coverage</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{data.summary.openGaps}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Open Gaps</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{data.summary.inProgressGaps}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">In Progress</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{data.summary.closedGaps}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Closed/Covered</div>
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
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 p-4 border-b border-gray-200 dark:border-gray-700">
          Framework Details
        </h3>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.frameworks.map(f => (
            <div key={f.id}>
              <button
                onClick={() => toggleFramework(f.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-expanded={expandedFramework === f.id}
                aria-controls={`framework-${f.id}`}
              >
                <div className="flex items-center gap-3">
                  <CoverageGauge value={f.overallCoverage} label="" size="sm" />
                  <div className="text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{f.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">v{f.version} | {f.controls.length} controls | Assessed: {f.lastAssessed}</div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expandedFramework === f.id ? 'rotate-180' : ''}`}
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
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" aria-label={`${f.name} controls`}>
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">ID</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Control</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Coverage</th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {f.controls.map(c => (
                        <tr key={c.id}>
                          <td className="px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">{c.id}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">{c.name}</td>
                          <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                          <td className="px-3 py-2 text-sm">{c.coverage}%</td>
                          <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
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
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Gap Analysis</h3>
        <GapList frameworks={data.frameworks} />
      </div>
    </div>
  )
}
