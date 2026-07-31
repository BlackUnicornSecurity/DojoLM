// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET/POST /api/mitsuke/sources — manage threat intelligence sources
 * Story: Train 3 PR-4e.2 — Mitsuke real backend wiring
 *
 * Persists user-configured threat feed sources (RSS, API, webhook) to
 * server-side storage. Replaces the browser-only localStorage approach
 * in MitsukeSourceConfig so sources survive across devices/sessions.
 *
 * PUBLIC ENDPOINT (GET only): source registry read is world-readable
 * by design. POST requires an authenticated session — writes mutate
 * the SSRF allow-list that powers downstream feed polling, so writes
 * are gated to real operators. Wave 1 post-audit hardening
 * (2026-04-18) — see ADR-0011 (mitsuke live wiring).
 *
 * RATE-LIMIT: read-tier for GET (per-IP shared pool); write-tier for
 * POST (per-session). The 20-source cap is a DoS floor, not an
 * auth boundary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { isDemoMode } from '@/lib/demo'
import { demoMitsukeSources } from '@/lib/demo/mock-api-handlers'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

interface ThreatSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'webhook'
  enabled: boolean
  refreshIntervalMinutes: number
  lastFetched: string | null
  createdAt: string
}

const SOURCES_FILE = path.join(getDataPath('mitsuke'), 'sources.json')

async function loadSources(): Promise<ThreatSource[]> {
  if (!existsSync(SOURCES_FILE)) return []
  try {
    const raw = await readFile(SOURCES_FILE, 'utf-8')
    return JSON.parse(raw) as ThreatSource[]
  } catch {
    return []
  }
}

async function saveSources(sources: ThreatSource[]): Promise<void> {
  const dir = path.dirname(SOURCES_FILE)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
  await writeFile(SOURCES_FILE, JSON.stringify(sources, null, 2), 'utf-8')
}

export const GET = createApiHandler(
  async () => {
    try {
      // D-06 — demo seed serves the sources list on demo instances.
      if (isDemoMode()) {
        return NextResponse.json({ sources: demoMitsukeSources() })
      }
      const sources = await loadSources()
      return NextResponse.json({ sources })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[mitsuke/sources] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load sources' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)

const VALID_SOURCE_TYPES = new Set(['rss', 'api', 'webhook'] as const)
type ValidSourceType = 'rss' | 'api' | 'webhook'

function isValidSourceType(value: unknown): value is ValidSourceType {
  return typeof value === 'string' && (VALID_SOURCE_TYPES as Set<string>).has(value)
}

export const POST = createApiHandler(
  async (request: NextRequest) => {
    try {
      const body = await request.json() as Partial<ThreatSource>

      if (!body.name || !body.url || !body.type) {
        return NextResponse.json(
          { error: 'Missing required fields: name, url, type' },
          { status: 400 },
        )
      }

      if (!isValidSourceType(body.type)) {
        return NextResponse.json(
          { error: 'type must be rss, api, or webhook' },
          { status: 400 },
        )
      }

      // Basic URL validation (SSRF checks in MitsukeSourceConfig on client side)
      try {
        const parsed = new URL(body.url)
        if (parsed.protocol !== 'https:') {
          return NextResponse.json(
            { error: 'Only HTTPS URLs are allowed' },
            { status: 400 },
          )
        }
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 },
        )
      }

      const newSource: ThreatSource = {
        id: crypto.randomUUID(),
        name: String(body.name).slice(0, 100),
        url: String(body.url).slice(0, 2048),
        type: body.type,
        enabled: body.enabled !== false,
        refreshIntervalMinutes: Math.max(5, Math.min(1440, Number(body.refreshIntervalMinutes) || 60)),
        lastFetched: null,
        createdAt: new Date().toISOString(),
      }

      // D-06 consistency — demo GET serves the static seed, so a demo
      // write must not persist (it could never be read back). Validation
      // above still applies so demo and real POSTs 400 identically.
      if (isDemoMode()) {
        return NextResponse.json({ source: newSource }, { status: 201 })
      }

      const sources = await loadSources()

      if (sources.length >= 20) {
        return NextResponse.json(
          { error: 'Maximum 20 sources allowed' },
          { status: 400 },
        )
      }

      const updatedSources = [...sources, newSource]
      await saveSources(updatedSources)

      return NextResponse.json({ source: newSource }, { status: 201 })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[mitsuke/sources] create error:', detail)
      return NextResponse.json(
        { error: 'Failed to create source' },
        { status: 500 },
      )
    }
  },
  { rateLimit: 'write' },
)
