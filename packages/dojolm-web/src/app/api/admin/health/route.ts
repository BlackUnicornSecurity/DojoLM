/**
 * File: route.ts
 * Purpose: Health check API endpoint for Admin system health dashboard
 * Story: TPI-NODA-002-04
 * Index:
 * - GET handler (line 13)
 * - Scanner health check (line 19)
 * - Guard status check (line 34)
 * - Storage status check (line 47)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoHealthGet } from '@/lib/demo/mock-api-handlers'
import { readFileSync } from 'fs'
import { readFile } from 'node:fs/promises'
import { join } from 'path'
import { checkApiAuth } from '@/lib/api-auth'
import { getDataPath } from '@/lib/runtime-paths'

const ALLOWED_MCP_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])
const MCP_HOST = ALLOWED_MCP_HOSTS.has(process.env.MCP_HOST ?? '127.0.0.1')
  ? (process.env.MCP_HOST ?? '127.0.0.1')
  : '127.0.0.1'
const MCP_PORT = Number.parseInt(process.env.MCP_PORT ?? '18000', 10)
const MCP_PROBE_TIMEOUT_MS = 1500

interface McpHealth {
  readonly expected: boolean
  readonly reachable: boolean
  readonly latencyMs?: number
}

async function probeMcpHealth(): Promise<McpHealth> {
  // Was MCP ever turned on? Read persisted state written by /api/mcp/status.
  let expected = false
  try {
    const raw = await readFile(getDataPath('mcp-state.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { enabled?: unknown }
    expected = parsed.enabled === true
  } catch {
    // No state file — MCP was never enabled, treat as not expected.
  }

  if (!expected) {
    return { expected: false, reachable: false }
  }

  try {
    const start = Date.now()
    const res = await fetch(`http://${MCP_HOST}:${MCP_PORT}/health`, {
      signal: AbortSignal.timeout(MCP_PROBE_TIMEOUT_MS),
    })
    return { expected: true, reachable: res.ok, latencyMs: Date.now() - start }
  } catch {
    return { expected: true, reachable: false }
  }
}

// Read version at module load — safe for server-side API route
let appVersion = '0.1.0';
try {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  appVersion = pkg.version || appVersion;
} catch { /* fallback to default */ }

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoHealthGet()
  // ADM-SEC-01: Two-tier response — minimal for unauthenticated, full for authenticated.
  // Check for actual session cookie, not just checkApiAuth (which passes public routes).
  const sessionCookie = request.cookies.get('tpi_session')?.value;
  const isAuthenticated = !!sessionCookie && checkApiAuth(request) === null;

  try {
    const startTime = Date.now()

    // Unauthenticated callers get minimal health status plus MCP liveness
    // so Docker healthchecks can see — in a single unauthenticated call —
    // whether the web container AND the subprocess MCP server are running.
    // We keep the HTTP status at 200 (web is healthy) but include a
    // `status: 'degraded'` field when MCP was enabled and is unreachable,
    // so ops tooling can decide whether to page without triggering a
    // restart loop on a transient MCP hiccup.
    if (!isAuthenticated) {
      const mcp = await probeMcpHealth()
      const status = mcp.expected && !mcp.reachable ? 'degraded' : 'ok'
      return NextResponse.json(
        { status, timestamp: Date.now(), mcp },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-store',
          },
        }
      )
    }

    // Authenticated callers get full details

    // Scanner health check — direct import, no HTTP self-call
    let scannerReachable = false
    let scannerResponseTime: number | undefined
    try {
      const { scan } = await import('@dojolm/scanner')
      const scanStart = Date.now()
      scan('health-check-probe', {})
      scannerResponseTime = Date.now() - scanStart
      scannerReachable = true
    } catch {
      scannerReachable = false
    }

    // Guard status — read from guard storage if available
    let guardEnabled = false
    let guardMode = 'shinobi'
    let guardEventCount = 0
    try {
      const { getGuardConfig, getGuardStats } = await import('@/lib/storage/guard-storage')
      const config = await getGuardConfig()
      guardEnabled = config?.enabled ?? false
      guardMode = config?.mode ?? 'shinobi'
      const stats = await getGuardStats()
      guardEventCount = stats?.totalEvents ?? 0
    } catch {
      // Guard storage may not be initialized — use defaults
    }

    // Storage status
    let storageType = 'json'
    let modelsCount = 0
    try {
      storageType = process.env.TPI_STORAGE_BACKEND === 'db' ? 'database' : 'json'
      const { getStorage } = await import('@/lib/storage/storage-interface')
      const storage = await getStorage()
      const models = await storage.getModelConfigs()
      modelsCount = models.length
    } catch {
      // Storage may fail — return defaults
    }

    const mcp = await probeMcpHealth()

    return NextResponse.json(
      {
        status: mcp.expected && !mcp.reachable ? 'degraded' : 'ok',
        scanner: {
          reachable: scannerReachable,
          responseTimeMs: scannerResponseTime,
          lastScanTime: null,
        },
        guard: {
          enabled: guardEnabled,
          mode: guardMode,
          eventCount: guardEventCount,
        },
        mcp,
        storage: {
          type: storageType,
          modelsCount,
        },
        app: {
          version: appVersion,
          // R3-010: Removed nodeVersion — aids attacker fingerprinting
          responseTimeMs: Date.now() - startTime,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        },
      }
    )
  } catch (error) {
    console.error('Health check API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
