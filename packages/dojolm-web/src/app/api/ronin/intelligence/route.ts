// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/ronin/intelligence — aggregated CVE + AI Incident feed
 * Story: WAVE2-RONIN / ADR-0015
 *
 * Aggregates intelligence entries from a filesystem store at
 * `<TPI_DATA_DIR>/ronin/intelligence/*.json` and falls back to the
 * bundled `DEFAULT_INTELLIGENCE_CORPUS` when empty. Poll-and-cache for
 * live feeds (NVD, AI Incident DB, user-configured RSS) is tracked as
 * a Wave 3 follow-up — this endpoint is the read face that stays
 * stable as the ingestion pipeline evolves.
 *
 * PUBLIC ENDPOINT: intelligence read is world-readable by design —
 * same policy as mitsuke entries/indicators.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_INTELLIGENCE_CORPUS,
  type IntelligenceEntryRecord,
  type IntelligenceEntryType,
} from '@/lib/ronin/fixtures'

const INTEL_DIR = getDataPath('ronin', 'intelligence')

const VALID_TYPES = new Set<IntelligenceEntryType>(['cve', 'ai-incident', 'kev', 'epss', 'atlas'])
const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
const MAX_LIMIT = 200

function isValidType(value: unknown): value is IntelligenceEntryType {
  return typeof value === 'string' && (VALID_TYPES as Set<string>).has(value)
}

async function loadStored(): Promise<IntelligenceEntryRecord[]> {
  if (!existsSync(INTEL_DIR)) return []
  const files = await readdir(INTEL_DIR)
  const records: IntelligenceEntryRecord[] = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = await readFile(path.join(INTEL_DIR, file), 'utf-8')
      records.push(JSON.parse(raw) as IntelligenceEntryRecord)
    } catch {
      // skip malformed
    }
  }
  return records
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const typeRaw = searchParams.get('type')
      const type = isValidType(typeRaw) ? typeRaw : null
      const severityRaw = searchParams.get('severity')?.toUpperCase() ?? null
      const severity = severityRaw && VALID_SEVERITIES.has(severityRaw) ? severityRaw : null
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      let entries = await loadStored()
      if (entries.length === 0) {
        entries = DEFAULT_INTELLIGENCE_CORPUS
      }
      if (type) entries = entries.filter((e) => e.type === type)
      if (severity) entries = entries.filter((e) => e.severity === severity)

      entries = [...entries].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

      const total = entries.length
      const paginated = entries.slice(offset, offset + limit)

      return NextResponse.json({
        entries: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[ronin/intelligence] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load intelligence entries' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
