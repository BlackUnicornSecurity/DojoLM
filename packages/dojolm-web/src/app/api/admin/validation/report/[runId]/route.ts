/**
 * File: route.ts
 * Purpose: Admin validation report API — GET full report for a completed run
 * Story: K6.6 (Admin Results Viewer)
 * Index:
 * - Constants (line 13)
 * - GET handler (line 27)
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { withAuth } from '@/lib/auth/route-guard'
import { getDataPath } from '@/lib/runtime-paths'

const DATA_DIR = getDataPath('validation')

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Maximum report file size: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/** Allowed format values for query param */
const ALLOWED_FORMATS = new Set(['json', 'summary'])

export const GET = withAuth(async (
  request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>> }
) => {
  try {
    const resolvedParams = context.params ? await Promise.resolve(context.params) : undefined;
    const runId = resolvedParams?.runId

    // Validate runId is present and is a valid UUID (prevent path traversal)
    if (!runId || !UUID_REGEX.test(runId)) {
      return NextResponse.json(
        { error: 'Invalid run ID format' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Validate format query param
    const url = new URL(request.url)
    const format = url.searchParams.get('format') ?? 'json'
    if (!ALLOWED_FORMATS.has(format)) {
      return NextResponse.json(
        { error: 'format must be "json" or "summary"' },
        { status: 400, headers: SECURITY_HEADERS }
      )
    }

    // Read report file
    const reportPath = join(DATA_DIR, 'runs', runId, 'report.json')
    let raw: string
    try {
      raw = await readFile(reportPath, 'utf8')
      if (raw.length > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Report file exceeds maximum allowed size' },
          { status: 500, headers: SECURITY_HEADERS }
        )
      }
    } catch {
      // Fall back to progress file for basic info
      const progressPath = join(DATA_DIR, 'runs', runId, 'progress.json')
      try {
        const progressRaw = await readFile(progressPath, 'utf8')
        const progress = JSON.parse(progressRaw)
        if (!progress || typeof progress !== 'object') {
          return NextResponse.json(
            { error: 'Validation run not found' },
            { status: 404, headers: SECURITY_HEADERS }
          )
        }

        // Return progress-based summary when no full report exists
        return NextResponse.json(
          {
            run_id: runId,
            status: progress.status ?? 'unknown',
            started_at: progress.startedAt ?? null,
            completed_at: progress.completedAt ?? null,
            modules: [],
            overall_verdict: progress.status === 'completed' ? (progress.nonConformities === 0 ? 'PASS' : 'FAIL') : null,
            non_conformity_count: progress.nonConformities ?? 0,
            report_available: false,
          },
          { headers: SECURITY_HEADERS }
        )
      } catch {
        return NextResponse.json(
          { error: 'Validation run not found' },
          { status: 404, headers: SECURITY_HEADERS }
        )
      }
    }

    const report = JSON.parse(raw)

    // Validate parsed shape
    if (!report || typeof report !== 'object') {
      return NextResponse.json(
        { error: 'Corrupted report data' },
        { status: 500, headers: SECURITY_HEADERS }
      )
    }

    // Summary mode: metrics only, no sample-level data
    if (format === 'summary') {
      const modules = Array.isArray(report.modules)
        ? report.modules.map((m: Record<string, unknown>) => ({
            module_id: m.module_id,
            tier: m.tier,
            verdict: typeof m.decision === 'object' && m.decision !== null
              ? (m.decision as Record<string, unknown>).verdict
              : null,
            metrics: m.metrics,
            matrix: m.matrix,
          }))
        : []

      return NextResponse.json(
        {
          run_id: report.run_id ?? runId,
          report_id: report.report_id ?? null,
          generated_at: report.generated_at ?? null,
          overall_verdict: report.overall_verdict ?? null,
          non_conformity_count: report.non_conformity_count ?? 0,
          corpus_version: report.corpus_version ?? null,
          tool_version: report.tool_version ?? null,
          modules,
          report_available: true,
        },
        { headers: SECURITY_HEADERS }
      )
    }

    // Full mode: return complete report
    return NextResponse.json(
      { ...report, report_available: true },
      { headers: SECURITY_HEADERS }
    )
  } catch (error) {
    console.error('Validation report GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: SECURITY_HEADERS }
    )
  }
}, { role: 'admin', skipCsrf: true })
