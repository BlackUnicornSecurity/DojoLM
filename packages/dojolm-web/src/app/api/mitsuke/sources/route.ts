/**
 * File: route.ts
 * Purpose: GET/POST /api/mitsuke/sources — manage threat intelligence sources
 * Story: Train 3 PR-4e.2 — Mitsuke real backend wiring
 *
 * Persists user-configured threat feed sources (RSS, API, webhook) to
 * server-side storage. Replaces the browser-only localStorage approach
 * in MitsukeSourceConfig so sources survive across devices/sessions.
 */

import { NextResponse } from 'next/server'
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

export async function GET(): Promise<NextResponse> {
  try {
    const sources = await loadSources()
    return NextResponse.json({ sources })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to load sources', detail: message },
      { status: 500 },
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json() as Partial<ThreatSource>

    if (!body.name || !body.url || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: name, url, type' },
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

    const sources = await loadSources()

    if (sources.length >= 20) {
      return NextResponse.json(
        { error: 'Maximum 20 sources allowed' },
        { status: 400 },
      )
    }

    const newSource: ThreatSource = {
      id: crypto.randomUUID(),
      name: String(body.name).slice(0, 100),
      url: String(body.url).slice(0, 2048),
      type: body.type as 'rss' | 'api' | 'webhook',
      enabled: body.enabled !== false,
      refreshIntervalMinutes: Math.max(5, Math.min(1440, Number(body.refreshIntervalMinutes) || 60)),
      lastFetched: null,
      createdAt: new Date().toISOString(),
    }

    const updatedSources = [...sources, newSource]
    await saveSources(updatedSources)

    return NextResponse.json({ source: newSource }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to create source', detail: message },
      { status: 500 },
    )
  }
}
