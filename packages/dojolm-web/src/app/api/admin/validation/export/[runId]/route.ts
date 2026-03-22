/**
 * File: route.ts
 * Purpose: Admin validation export API — GET downloadable report in various formats
 * Story: K6.7 (Validation Report Export)
 * Index:
 * - Constants & helpers (line 13)
 * - GET handler (line 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { withAuth } from '@/lib/auth/route-guard'

const DATA_DIR = join(process.cwd(), 'data', 'validation')

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Allowed export formats */
const ALLOWED_FORMATS = new Set(['json', 'csv', 'markdown'])

/** Rate limiting: track export timestamps per session */
const exportTimestamps: number[] = []
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5

/** Sanitize filename to prevent Content-Disposition header injection */
function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]/g, '_')
}

/** Format date for filename */
function formatDateForFilename(isoDate: string | undefined): string {
  if (!isoDate) return 'unknown'
  try {
    const d = new Date(isoDate)
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return 'unknown'
  }
}

/** Build CSV from report data — one row per module */
function buildCSV(report: Record<string, unknown>): string {
  const header = 'module_id,tier,verdict,tp,tn,fp,fn,accuracy,precision,recall,f1,mcc,specificity,fpr,fnr'
  const modules = Array.isArray(report.modules) ? report.modules : []

  const rows = modules.map((m: Record<string, unknown>) => {
    const matrix = (m.matrix ?? {}) as Record<string, unknown>
    const metrics = (m.metrics ?? {}) as Record<string, unknown>
    const decision = (m.decision ?? {}) as Record<string, unknown>

    return [
      csvField(String(m.module_id ?? '')),
      csvField(String(m.tier ?? '')),
      csvField(String(decision.verdict ?? '')),
      csvField(String(matrix.tp ?? 0)),
      csvField(String(matrix.tn ?? 0)),
      csvField(String(matrix.fp ?? 0)),
      csvField(String(matrix.fn ?? 0)),
      csvField(formatPct(metrics.accuracy)),
      csvField(formatPct(metrics.precision)),
      csvField(formatPct(metrics.recall)),
      csvField(formatPct(metrics.f1)),
      csvField(formatMetric(metrics.mcc)),
      csvField(formatPct(metrics.specificity)),
      csvField(formatPct(metrics.fpr)),
      csvField(formatPct(metrics.fnr)),
    ].join(',')
  })

  return [header, ...rows].join('\n')
}

/** Escape CSV field per OWASP CSV injection prevention */
function csvField(val: string): string {
  const dangerous = /^[=+\-@\t\r]/
  let escaped = val
  if (dangerous.test(escaped)) {
    escaped = `'${escaped}`
  }
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    escaped = `"${escaped.replace(/"/g, '""')}"`
  }
  return escaped
}

function formatPct(val: unknown): string {
  if (typeof val !== 'number') return '0.00%'
  return `${(val * 100).toFixed(2)}%`
}

function formatMetric(val: unknown): string {
  if (typeof val !== 'number') return '0.0000'
  return val.toFixed(4)
}

/** Build Markdown report */
function buildMarkdown(report: Record<string, unknown>): string {
  const lines: string[] = []
  lines.push('# DojoLM Validation Testing Report')
  lines.push('')
  lines.push(`**Run ID:** ${escapeMd(String(report.run_id ?? ''))}`)
  lines.push(`**Report ID:** ${escapeMd(String(report.report_id ?? ''))}`)
  lines.push(`**Generated:** ${escapeMd(String(report.generated_at ?? ''))}`)
  lines.push(`**Overall Verdict:** ${report.overall_verdict === 'PASS' ? 'PASS' : 'FAIL'}`)
  lines.push(`**Non-Conformities:** ${report.non_conformity_count ?? 0}`)
  lines.push(`**Corpus Version:** ${escapeMd(String(report.corpus_version ?? ''))}`)
  lines.push(`**Tool Version:** ${escapeMd(String(report.tool_version ?? ''))}`)
  lines.push('')

  // Environment
  const env = (report.environment ?? {}) as Record<string, unknown>
  if (Object.keys(env).length > 0) {
    lines.push('## Environment')
    lines.push('')
    lines.push('| Field | Value |')
    lines.push('|-------|-------|')
    lines.push(`| OS | ${escapeMd(String(env.os_platform ?? ''))} ${escapeMd(String(env.os_release ?? ''))} ${escapeMd(String(env.os_arch ?? ''))} |`)
    lines.push(`| Node.js | ${escapeMd(String(env.node_version ?? ''))} |`)
    lines.push(`| Git Hash | ${escapeMd(String(env.git_hash ?? ''))} |`)
    lines.push('')
  }

  // Per-module results
  const modules = Array.isArray(report.modules) ? report.modules : []
  if (modules.length > 0) {
    lines.push('## Module Results')
    lines.push('')
    for (const m of modules) {
      const mod = m as Record<string, unknown>
      const matrix = (mod.matrix ?? {}) as Record<string, unknown>
      const metrics = (mod.metrics ?? {}) as Record<string, unknown>
      const decision = (mod.decision ?? {}) as Record<string, unknown>

      const verdict = String(decision.verdict ?? 'N/A')
      lines.push(`### ${escapeMd(String(mod.module_id ?? ''))} (Tier ${mod.tier ?? '?'}) - ${verdict}`)
      lines.push('')

      // Confusion matrix
      lines.push('**Confusion Matrix:**')
      lines.push('')
      lines.push('| | Predicted Malicious | Predicted Clean |')
      lines.push('|---|---|---|')
      lines.push(`| Actual Malicious | TP: ${matrix.tp ?? 0} | FN: ${matrix.fn ?? 0} |`)
      lines.push(`| Actual Clean | FP: ${matrix.fp ?? 0} | TN: ${matrix.tn ?? 0} |`)
      lines.push('')

      // Metrics table
      lines.push('**Metrics:**')
      lines.push('')
      lines.push('| Metric | Value |')
      lines.push('|--------|-------|')
      lines.push(`| Accuracy | ${formatPct(metrics.accuracy)} |`)
      lines.push(`| Precision | ${formatPct(metrics.precision)} |`)
      lines.push(`| Recall | ${formatPct(metrics.recall)} |`)
      lines.push(`| F1 | ${formatPct(metrics.f1)} |`)
      lines.push(`| MCC | ${formatMetric(metrics.mcc)} |`)
      lines.push(`| Specificity | ${formatPct(metrics.specificity)} |`)
      lines.push(`| FPR | ${formatPct(metrics.fpr)} |`)
      lines.push(`| FNR | ${formatPct(metrics.fnr)} |`)
      lines.push('')

      // Non-conformities
      const ncs = Array.isArray(decision.non_conformities) ? decision.non_conformities : []
      if (ncs.length > 0) {
        lines.push(`**Non-Conformities (${ncs.length}):**`)
        lines.push('')
        lines.push('| Sample ID | Type | Expected | Actual |')
        lines.push('|-----------|------|----------|--------|')
        for (const nc of ncs) {
          const ncr = nc as Record<string, unknown>
          lines.push(`| ${escapeMd(String(ncr.sample_id ?? ''))} | ${escapeMd(String(ncr.type ?? ''))} | ${escapeMd(String(ncr.expected ?? ''))} | ${escapeMd(String(ncr.actual ?? ''))} |`)
        }
        lines.push('')
      }
    }
  }

  // Signature
  if (report.signature) {
    lines.push('## Digital Signature')
    lines.push('')
    lines.push(`\`${String(report.signature).slice(0, 64)}...\``)
    lines.push('')
  }

  return lines.join('\n')
}

/** Escape Markdown table cell content */
function escapeMd(val: string): string {
  return val.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export const GET = withAuth(async (
  request: NextRequest,
  context: { params?: Record<string, string> }
) => {
  try {
    const runId = context.params?.runId

    // Validate runId
    if (!runId || !UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID format' },
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    // Validate format
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'json'
    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json(
        { error: 'format must be "json", "csv", or "markdown"' },
        { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    // Rate limiting: max 5 exports per minute
    const now = Date.now()
    const recentExports = exportTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS)
    // Replace the array content immutably
    exportTimestamps.length = 0
    for (const t of recentExports) {
      exportTimestamps.push(t)
    }

    if (recentExports.length >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: 'Export rate limit exceeded. Maximum 5 exports per minute.' },
        { status: 429, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    exportTimestamps.push(now)

    // Read report file
    const reportPath = join(DATA_DIR, 'runs', runId, 'report.json')
    let raw: string
    try {
      raw = await readFile(reportPath, 'utf8')
    } catch {
      return NextResponse.json(
        { error: 'Report not found for this run' },
        { status: 404, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    // Guard against oversized files before parsing
    if (raw.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Report file exceeds maximum allowed size' },
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    const report = JSON.parse(raw)
    if (!report || typeof report !== 'object') {
      return NextResponse.json(
        { error: 'Corrupted report data' },
        { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
      )
    }

    const dateStr = formatDateForFilename(report.generated_at)

    if (format === 'json') {
      const filename = sanitizeFilename(`katana-report-${runId}-${dateStr}.json`)
      return new NextResponse(JSON.stringify(report, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    if (format === 'csv') {
      const csv = buildCSV(report)
      const filename = sanitizeFilename(`katana-report-${runId}-${dateStr}.csv`)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    if (format === 'markdown') {
      const md = buildMarkdown(report)
      const filename = sanitizeFilename(`katana-report-${runId}-${dateStr}.md`)
      return new NextResponse(md, {
        status: 200,
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      })
    }

    // Should never reach here due to format validation above
    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Validation export GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } }
    )
  }
}, { role: 'admin', skipCsrf: true })
