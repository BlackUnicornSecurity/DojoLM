// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/mitsuke/indicators — query threat indicator records
 * Story: WAVE2-INDICATORS / ADR-0013
 *
 * Reads indicator records from `<TPI_DATA_DIR>/mitsuke/indicators/*.json`
 * and returns a paginated list. The `entries` endpoint references
 * indicators by string id via its `indicators: string[]` field, so this
 * endpoint is the canonical lookup for the metadata (type, value,
 * confidence, context) those references resolve to.
 *
 * PUBLIC ENDPOINT: threat-indicator read is world-readable by design
 * (matches the policy set in ADR-0011 for the sibling `entries` route).
 * RATE-LIMIT: read-tier via `createApiHandler({ public: true,
 * rateLimit: 'read' })` — per-IP token bucket throttles runaway readers.
 *
 * Input hardening mirrors `entries/route.ts`:
 * - `type`, `severity` are validated against closed enums.
 * - `source` is length-capped and regex-scrubbed to prevent filter
 *   amplification with pathological input.
 * - `limit` is capped at 200; `offset` floored at 0.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_MITSUKE_INDICATORS,
  type MitsukeIndicatorRecord,
} from '@/lib/mitsuke/fixtures'

interface ThreatIndicator {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'pattern' | 'ttp'
  value: string
  confidence: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  context: string
  createdAt: string
}

const INDICATORS_DIR = getDataPath('mitsuke', 'indicators')

const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
const VALID_TYPES = new Set(['ip', 'domain', 'hash', 'url', 'email', 'pattern', 'ttp'])

// Wave 8.5 / ADR-0077 — fresh-deploy fallback mirrors ADR-0072's DNA
// pattern. When the on-disk store is empty or absent we serve the
// bundled BU-branded corpus so operators see real data immediately.
function bundledFallback(): ThreatIndicator[] {
  return DEFAULT_MITSUKE_INDICATORS.map((i: MitsukeIndicatorRecord) => ({
    id: i.id,
    type: i.type,
    value: i.value,
    confidence: i.confidence,
    severity: i.severity,
    source: i.source,
    firstSeen: i.firstSeen,
    lastSeen: i.lastSeen,
    tags: [...i.tags],
    context: i.context,
    createdAt: i.createdAt,
  }))
}
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
      const typeRaw = searchParams.get('type')?.toLowerCase() ?? null
      const type = typeRaw && VALID_TYPES.has(typeRaw) ? typeRaw : null
      const source = safeFilter(searchParams.get('source'))
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      let indicators: ThreatIndicator[] = []
      let responseSource: 'disk' | 'bundled' = 'disk'

      if (existsSync(INDICATORS_DIR)) {
        const files = await readdir(INDICATORS_DIR)
        const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse()

        for (const file of jsonFiles) {
          try {
            const raw = await readFile(path.join(INDICATORS_DIR, file), 'utf-8')
            const indicator = JSON.parse(raw) as ThreatIndicator
            indicators.push(indicator)
          } catch {
            // Skip malformed files
          }
        }
      }

      // Wave 8.5 / ADR-0077 — fall back to the bundled corpus only
      // when the on-disk store has zero records. Operator curation
      // always wins once any record is persisted. The `source` flag
      // in the response lets callers distinguish bundled vs. curated
      // data (mirrors the ADR-0072 DNA pattern).
      if (indicators.length === 0) {
        indicators = bundledFallback()
        responseSource = 'bundled'
      }

      if (severity) {
        indicators = indicators.filter(i => i.severity === severity)
      }
      if (type) {
        indicators = indicators.filter(i => i.type === type)
      }
      if (source) {
        indicators = indicators.filter(i => i.source === source)
      }

      const total = indicators.length
      const paginated = indicators.slice(offset, offset + limit)

      return NextResponse.json({
        indicators: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
        source: responseSource,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[mitsuke/indicators] storage error:', detail)
      return NextResponse.json(
        { error: 'Failed to fetch threat indicators' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
