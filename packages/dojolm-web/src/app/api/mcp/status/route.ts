/**
 * File: route.ts
 * Purpose: MCP connection status and server lifecycle endpoint
 * Story: TPI-NODA-6.1, H13.1
 * Methods: GET (health check against MCP server), POST (start/stop/configure)
 *
 * The MCP server (dojolm-mcp) runs on localhost:18000 by default.
 * GET probes that endpoint to report real connectivity.
 * POST with { enabled: true } spawns the server; { enabled: false } stops it.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'

const MCP_HOST = process.env.MCP_HOST ?? '127.0.0.1'
const MCP_PORT = parseInt(process.env.MCP_PORT ?? '18000', 10)
const MCP_BASE = `http://${MCP_HOST}:${MCP_PORT}`
const PROBE_TIMEOUT_MS = 3000

// Module-level state: tracks whether the user has toggled "enabled" via POST.
// In production this would be persisted to disk/DB; in-memory is acceptable for
// a single-instance dev deployment (lessons learned: module-level let resets on restart).
let mcpEnabled = false
let mcpChildProcess: ReturnType<typeof import('node:child_process').spawn> | null = null

/**
 * GET /api/mcp/status — probe the real MCP server on localhost:18000/health
 */
export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request)
  if (authResult) return authResult

  // Attempt to reach the running MCP server
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const start = Date.now()
    const res = await fetch(`${MCP_BASE}/health`, { signal: controller.signal })
    clearTimeout(timeout)
    const latency = Date.now() - start

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({
        connected: true,
        enabled: mcpEnabled,
        latency,
        server: {
          running: data.running ?? true,
          mode: data.mode ?? 'basic',
          uptime: data.uptime ?? 0,
          activeScenarios: data.activeScenarios ?? [],
        },
      })
    }

    return NextResponse.json({
      connected: false,
      enabled: mcpEnabled,
      message: `MCP server responded with ${res.status}`,
    })
  } catch {
    // Server unreachable
    return NextResponse.json({
      connected: false,
      enabled: mcpEnabled,
      message: mcpEnabled
        ? 'MCP server enabled but unreachable. It may still be starting.'
        : 'MCP server is not running. Click Start Server to launch it.',
    })
  }
}

/**
 * POST /api/mcp/status — start / stop / configure the MCP server
 *
 * Body: { enabled?: boolean, serverUrl?: string, apiKey?: string, mode?: string }
 */
export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request)
  if (authResult) return authResult

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const { enabled, mode } = body

  if (enabled !== undefined && typeof enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }

  // Handle mode switching on running server
  if (mode !== undefined && typeof mode === 'string') {
    try {
      const res = await fetch(`${MCP_BASE}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: `Mode switch failed: ${res.status}` },
          { status: 502 }
        )
      }
    } catch {
      return NextResponse.json(
        { error: 'Cannot switch mode — MCP server unreachable' },
        { status: 502 }
      )
    }
  }

  // Handle enable/disable
  if (enabled !== undefined) {
    mcpEnabled = enabled

    if (enabled) {
      // Attempt to start MCP server as child process
      const started = await startMcpServer()
      if (!started) {
        return NextResponse.json({
          connected: false,
          enabled: true,
          message: 'MCP server process could not be spawned. Start it manually: npx tsx packages/dojolm-mcp/src/index.ts',
        })
      }

      // Wait briefly for the server to become reachable
      const reachable = await waitForServer(5000)
      return NextResponse.json({
        connected: reachable,
        enabled: true,
        message: reachable
          ? 'MCP server started successfully'
          : 'MCP server started but not yet reachable. It may need a few more seconds.',
      })
    } else {
      // Stop the MCP server
      await stopMcpServer()
      return NextResponse.json({
        connected: false,
        enabled: false,
        message: 'MCP server stopped',
      })
    }
  }

  return NextResponse.json({
    connected: false,
    enabled: mcpEnabled,
    message: 'No action taken. Provide "enabled" field.',
  })
}

// ---------------------------------------------------------------------------
// Server lifecycle helpers
// ---------------------------------------------------------------------------

async function startMcpServer(): Promise<boolean> {
  // If already running, just return true
  if (mcpChildProcess && !mcpChildProcess.killed) {
    return true
  }

  // Check if server is already running externally
  const alreadyUp = await probeHealth()
  if (alreadyUp) return true

  try {
    // Dynamic import to avoid bundling issues in edge runtime
    const { spawn } = await import('node:child_process')
    const { resolve } = await import('node:path')

    // Locate the MCP server entry point relative to the monorepo root
    const mcpEntry = resolve(process.cwd(), 'packages/dojolm-mcp/src/index.ts')

    mcpChildProcess = spawn('npx', ['tsx', mcpEntry], {
      env: {
        ...process.env,
        MCP_PORT: String(MCP_PORT),
        MCP_HOST: MCP_HOST,
        MCP_CONSENT: 'true', // Auto-consent in web-managed mode
      },
      stdio: 'ignore',
      detached: false,
    })

    mcpChildProcess.on('exit', () => {
      mcpChildProcess = null
    })

    return true
  } catch {
    return false
  }
}

async function stopMcpServer(): Promise<void> {
  if (mcpChildProcess && !mcpChildProcess.killed) {
    mcpChildProcess.kill('SIGTERM')
    // Wait up to 2s for graceful exit
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (mcpChildProcess && !mcpChildProcess.killed) {
          mcpChildProcess.kill('SIGKILL')
        }
        resolve()
      }, 2000)
      if (mcpChildProcess) {
        mcpChildProcess.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })
      } else {
        clearTimeout(timeout)
        resolve()
      }
    })
    mcpChildProcess = null
  }
}

async function probeHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${MCP_BASE}/health`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}

async function waitForServer(maxMs: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await probeHealth()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}
