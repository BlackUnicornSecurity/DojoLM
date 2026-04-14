/**
 * File: ComplianceExport.tsx
 * Purpose: Export compliance reports in Markdown, JSON, or CSV format
 * Story: H9.5 — Compliance Export
 * Security: SEC-14 pure JS (no headless browser), SEC-G5 sanitize all payload content
 * Index:
 * - sanitizeForExport() — strips HTML/script injection vectors, truncates to 5000 chars
 * - ExportFormat type — 'markdown' | 'json' | 'csv'
 * - ComplianceExportProps interface
 * - ComplianceExport component — format selector + download button
 * - generateMarkdown() — executive summary, control matrix, gap list
 * - generateJSON() — structured report object
 * - generateCSV() — tabular control data
 * - handleExport() — blob download trigger
 */

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExportFormat = 'markdown' | 'json' | 'csv'

export interface ComplianceControl {
  id: string
  name: string
  status: 'covered' | 'partial' | 'gap'
  coverage: number
}

export interface ComplianceFrameworkExport {
  id: string
  name: string
  overallCoverage: number
  controls: ComplianceControl[]
}

export interface ComplianceExportProps {
  frameworkData: ComplianceFrameworkExport | null
}

// ---------------------------------------------------------------------------
// Security helpers (SEC-G5)
// ---------------------------------------------------------------------------

/** Sanitize content for safe export — strip HTML, limit length */
export function sanitizeForExport(text: string): string {
  if (!text) return ''
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&(?!lt;|gt;|amp;)/g, '&amp;')
    .slice(0, 5000)
}

/** Escape a CSV field — wrap in quotes if it contains comma, quote, or newline.
 *  Prepends tab to fields starting with formula characters to prevent CSV injection. */
function escapeCSVField(field: string): string {
  const sanitized = sanitizeForExport(field)
  // Defuse CSV formula injection: =, +, -, @, tab, CR at start of field
  const safe = /^[=+\-@\t\r]/.test(sanitized) ? `\t${sanitized}` : sanitized
  if (/[,"\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`
  }
  return safe
}

// ---------------------------------------------------------------------------
// Export generators
// ---------------------------------------------------------------------------

export function generateMarkdown(data: ComplianceFrameworkExport): string {
  const lines = [
    `# Compliance Report: ${sanitizeForExport(data.name)}`,
    '',
    `## Executive Summary`,
    '',
    `- **Framework:** ${sanitizeForExport(data.name)}`,
    `- **Generated:** ${new Date().toISOString()}`,
    `- **Overall Coverage:** ${data.overallCoverage}%`,
    `- **Total Controls:** ${data.controls.length}`,
    `- **Gaps:** ${data.controls.filter((c) => c.status === 'gap').length}`,
    '',
    `## Control Matrix`,
    '',
    `| Control ID | Name | Status | Coverage |`,
    `|-----------|------|--------|----------|`,
  ]

  for (const c of data.controls) {
    lines.push(
      `| ${sanitizeForExport(c.id)} | ${sanitizeForExport(c.name)} | ${sanitizeForExport(c.status)} | ${c.coverage}% |`,
    )
  }

  // Gap list
  const gaps = data.controls.filter((c) => c.status === 'gap')
  if (gaps.length > 0) {
    lines.push('', '## Gap List', '')
    for (const g of gaps) {
      lines.push(
        `- **${sanitizeForExport(g.id)}**: ${sanitizeForExport(g.name)} (${g.coverage}% coverage)`,
      )
    }
  }

  return lines.join('\n')
}

export function generateJSON(data: ComplianceFrameworkExport): string {
  return JSON.stringify(
    {
      report: {
        framework: sanitizeForExport(data.name),
        frameworkId: data.id,
        generated: new Date().toISOString(),
        overallCoverage: data.overallCoverage,
        totalControls: data.controls.length,
        gapCount: data.controls.filter((c) => c.status === 'gap').length,
        controls: data.controls.map((c) => ({
          id: c.id,
          name: sanitizeForExport(c.name),
          status: c.status,
          coverage: c.coverage,
        })),
        gaps: data.controls
          .filter((c) => c.status === 'gap')
          .map((c) => ({ id: c.id, name: sanitizeForExport(c.name) })),
      },
    },
    null,
    2,
  )
}

export function generateCSV(data: ComplianceFrameworkExport): string {
  const lines = ['Control ID,Name,Status,Coverage']
  for (const c of data.controls) {
    lines.push(
      `${escapeCSVField(c.id)},${escapeCSVField(c.name)},${escapeCSVField(c.status)},${c.coverage}`,
    )
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComplianceExport({ frameworkData }: ComplianceExportProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown')

  const handleExport = useCallback(() => {
    if (!frameworkData) return

    let content: string
    let mimeType: string
    let extension: string

    switch (format) {
      case 'markdown':
        content = generateMarkdown(frameworkData)
        mimeType = 'text/markdown'
        extension = 'md'
        break
      case 'json':
        content = generateJSON(frameworkData)
        mimeType = 'application/json'
        extension = 'json'
        break
      case 'csv':
        content = generateCSV(frameworkData)
        mimeType = 'text/csv'
        extension = 'csv'
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-${frameworkData.id}-${new Date().toISOString().slice(0, 10)}.${extension}`
    a.click()
    URL.revokeObjectURL(url)
  }, [format, frameworkData])

  if (!frameworkData) return null

  return (
    <div className="flex items-center gap-2" data-testid="compliance-export">
      <Select
        value={format}
        onValueChange={(v) => setFormat(v as ExportFormat)}
      >
        <SelectTrigger className="w-32" aria-label="Export format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="markdown">Markdown</SelectItem>
          <SelectItem value="json">JSON</SelectItem>
          <SelectItem value="csv">CSV</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-1.5"
        aria-label={`Export compliance report as ${format}`}
        data-testid="export-btn"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        Export
      </Button>
    </div>
  )
}
