/**
 * File: route.ts
 * Purpose: POST /api/compliance/evidence — Accept evidence from cross-module actions
 * Story: H1.6
 * Index:
 * - POST handler (line 12)
 * - GET handler (line 77)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { getDataPath } from '@/lib/runtime-paths'
import { auditLog } from '@/lib/audit-logger'

const EVIDENCE_DIR = getDataPath('compliance-evidence')
const MAX_TITLE_LENGTH = 500
const MAX_DESCRIPTION_LENGTH = 5000
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const
const VALID_SOURCE_MODULES = ['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'] as const
const ID_PATTERN = /^[\w-]{1,64}$/

export async function POST(request: NextRequest) {
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { sourceModule, severity, title, description, evidence, owaspMapping, metadata } = body

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    if (!sourceModule || !VALID_SOURCE_MODULES.includes(sourceModule)) {
      return NextResponse.json({ error: 'Invalid sourceModule' }, { status: 400 })
    }
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
    }

    // Sanitize
    const sanitizedTitle = String(title).slice(0, MAX_TITLE_LENGTH)
    const sanitizedDescription = description ? String(description).slice(0, MAX_DESCRIPTION_LENGTH) : ''

    const evidenceEntry = {
      id: crypto.randomUUID(),
      sourceModule,
      severity,
      title: sanitizedTitle,
      description: sanitizedDescription,
      evidence: evidence ? String(evidence).slice(0, 2000) : undefined,
      owaspMapping: owaspMapping && ID_PATTERN.test(String(owaspMapping)) ? String(owaspMapping) : undefined,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      createdAt: new Date().toISOString(),
    }

    // Ensure directory exists
    await fs.mkdir(EVIDENCE_DIR, { recursive: true })

    // Atomic write
    const filePath = join(EVIDENCE_DIR, `${evidenceEntry.id}.json`)
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`
    await fs.writeFile(tmpPath, JSON.stringify(evidenceEntry, null, 2), 'utf-8')
    await fs.rename(tmpPath, filePath)

    void auditLog.complianceCheck({
      endpoint: '/api/compliance/evidence',
      user: 'system',
      action: 'check',
      framework: sourceModule,
      result: severity === 'critical' || severity === 'high' ? 'fail' : 'info',
    })

    return NextResponse.json({ id: evidenceEntry.id, status: 'accepted' }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    await fs.mkdir(EVIDENCE_DIR, { recursive: true })
    const files = await fs.readdir(EVIDENCE_DIR)
    const jsonFiles = files.filter(f => f.endsWith('.json'))

    const entries = (await Promise.all(
      jsonFiles.slice(0, 500).map(async (file) => {
        try {
          const content = await fs.readFile(join(EVIDENCE_DIR, file), 'utf-8')
          const parsed = JSON.parse(content)
          // Validate shape — only return known fields
          if (!parsed || typeof parsed !== 'object' || !parsed.id) return null
          return {
            id: String(parsed.id),
            sourceModule: String(parsed.sourceModule ?? ''),
            severity: String(parsed.severity ?? 'info'),
            title: String(parsed.title ?? ''),
            description: String(parsed.description ?? ''),
            evidence: parsed.evidence ? String(parsed.evidence) : undefined,
            owaspMapping: parsed.owaspMapping ? String(parsed.owaspMapping) : undefined,
            createdAt: String(parsed.createdAt ?? ''),
          }
        } catch {
          return null // Skip malformed files
        }
      })
    )).filter((e): e is NonNullable<typeof e> => e !== null)

    // Sort by createdAt descending
    entries.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

    return NextResponse.json({ entries, total: entries.length })
  } catch {
    return NextResponse.json({ entries: [], total: 0 })
  }
}
