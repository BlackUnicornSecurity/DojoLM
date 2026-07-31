// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/mitsuke/entries — query threat feed entries from storage
 * Story: Train 3 PR-4e.2 — Mitsuke real backend wiring
 *
 * Queries the threat_feed_entries table (or falls back to demo data)
 * and returns results to the MitsukeLibrary and ThreatFeedStream components.
 *
 * PUBLIC ENDPOINT: threat feed read is world-readable by design.
 * RATE-LIMIT: read-tier via `createApiHandler({ public: true,
 * rateLimit: 'read' })` — per-IP token bucket throttles runaway readers.
 * Wave 1 post-audit (2026-04-18) also validates `severity` against
 * the known enum and caps `source` length to prevent filter-scan
 * amplification.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { isDemoMode } from '@/lib/demo'
import { demoMitsukeEntries } from '@/lib/demo/mock-api-handlers'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface ThreatEntry {
  id: string
  source: string
  threatType: string
  title: string
  description: string
  indicators: string[]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  confidence: number
  firstSeen: string
  lastSeen: string
  createdAt: string
}

const ENTRIES_DIR = getDataPath('mitsuke', 'entries')

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
const MAX_FILTER_LEN = 64
const MAX_LIMIT = 200
const SAFE_FILTER = /^[A-Za-z0-9_ .\-&]+$/

function safeFilter(value: string | null): string | null {
  if (value === null) return null
  const trimmed = value.slice(0, MAX_FILTER_LEN)
  return SAFE_FILTER.test(trimmed) ? trimmed : null
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const severityRaw = searchParams.get('severity')?.toUpperCase() ?? null
      const severity = severityRaw && VALID_SEVERITIES.has(severityRaw) ? severityRaw : null
      const source = safeFilter(searchParams.get('source'))
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      // E3.S5 (F-7-007 P0): `?page=N` alias for offset. Page is 1-indexed
      // and overrides `?offset=` when provided (matches the `?page=&limit=`
      // operator-facing convention introduced for the rest of the list
      // surfaces in this story).
      const rawPage = Number(searchParams.get('page'))
      const explicitOffset = Number(searchParams.get('offset'))
      const offset =
        Number.isFinite(rawPage) && rawPage >= 1
          ? (rawPage - 1) * limit
          : (Number.isFinite(explicitOffset) && explicitOffset >= 0 ? explicitOffset : 0)

      let entries: ThreatEntry[] = []

      if (isDemoMode()) {
        // D-06 — the demo seed reaches this surface through the same
        // filter + pagination flow as curated on-disk records.
        entries = demoMitsukeEntries()
      } else if (existsSync(ENTRIES_DIR)) {
        const files = await readdir(ENTRIES_DIR)
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse()

        for (const file of jsonFiles) {
          try {
            const raw = await readFile(path.join(ENTRIES_DIR, file), 'utf-8')
            const entry = JSON.parse(raw) as ThreatEntry
            entries.push(entry)
          } catch {
            // Skip malformed files
          }
        }
      }

      if (severity) {
        entries = entries.filter(e => e.severity === severity)
      }
      if (source) {
        entries = entries.filter(e => e.source === source)
      }

      const total = entries.length
      const paginated = entries.slice(offset, offset + limit)

      const page = Math.floor(offset / Math.max(1, limit)) + 1

      return NextResponse.json({
        entries: paginated,
        total,
        limit,
        offset,
        page,
        hasMore: offset + limit < total,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[mitsuke/entries] storage error:', detail)
      return NextResponse.json(
        { error: 'Failed to fetch threat entries' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
