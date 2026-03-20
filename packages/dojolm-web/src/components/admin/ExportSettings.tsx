'use client'

/**
 * File: ExportSettings.tsx
 * Purpose: Export format preferences and branding settings for reports
 * Story: TPI-NODA-002-03
 * Index:
 * - ExportFormat type (line 14)
 * - ExportSettings component (line 22)
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FileOutput, Check } from 'lucide-react'

type ExportFormat = 'pdf' | 'json' | 'csv' | 'sarif'

const EXPORT_FORMATS: { id: ExportFormat; label: string; description: string }[] = [
  { id: 'pdf', label: 'PDF', description: 'Executive reports with branding' },
  { id: 'json', label: 'JSON', description: 'Machine-readable data export' },
  { id: 'csv', label: 'CSV', description: 'Spreadsheet-compatible format' },
  { id: 'sarif', label: 'SARIF', description: 'Static analysis results interchange' },
]

export function ExportSettings() {
  const [selectedFormats, setSelectedFormats] = useState<Set<ExportFormat>>(new Set(['json', 'pdf']))
  const [companyName, setCompanyName] = useState('')
  const [retentionDays, setRetentionDays] = useState(90)

  const toggleFormat = (format: ExportFormat) => {
    setSelectedFormats(prev => {
      const next = new Set(prev)
      if (next.has(format)) {
        next.delete(format)
      } else {
        next.add(format)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Export Formats */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-4">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileOutput className="w-5 h-5" aria-hidden="true" />
          Export Formats
        </h3>
        <p className="text-sm text-muted-foreground">
          Select default export formats for scan results and reports.
        </p>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {EXPORT_FORMATS.map(format => (
            <button
              key={format.id}
              type="button"
              onClick={() => toggleFormat(format.id)}
              aria-pressed={selectedFormats.has(format.id)}
              className={cn(
                'rounded-lg border p-4 text-left motion-safe:transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selectedFormats.has(format.id)
                  ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--border-hover)]'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{format.label}</span>
                {selectedFormats.has(format.id) && (
                  <Check className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{format.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Branding */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Report Branding</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="admin-company-name" className="block text-xs font-medium text-muted-foreground mb-1">Company Name</label>
            <input
              id="admin-company-name"
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Your Organization"
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]"
            />
          </div>
          <div>
            <label htmlFor="admin-retention" className="block text-xs font-medium text-muted-foreground mb-1">Data Retention (days)</label>
            <input
              id="admin-retention"
              type="number"
              min={7}
              max={365}
              value={retentionDays}
              onChange={e => {
                const parsed = Number(e.target.value)
                setRetentionDays(Math.min(365, Math.max(7, isNaN(parsed) ? 7 : parsed)))
              }}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
