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

// SME HIGH-14: MCP server must only bind to loopback addresses
const ALLOWED_MCP_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])
const MCP_HOST = process.env.MCP_HOST ?? '127.0.0.1'
if (!ALLOWED_MCP_HOSTS.has(MCP_HOST)) {
  throw new Error(`MCP_HOST must be a loopback address, got: ${MCP_HOST}`)
}
const MCP_PORT = parseInt(process.env.MCP_PORT ?? '18000', 10)
const MCP_BASE = `http://${MCP_HOST}:${MCP_PORT}`
const PROBE_TIMEOUT_MS = 3000

// Valid attack modes for the adversarial MCP server
const VALID_MODES = new Set(['basic', 'passive', 'prompt-injection', 'tool-poisoning', 'exfiltration', 'confused-deputy', 'advanced', 'aggressive'])

// Module-level state: tracks whether the user has toggled "enabled" via POST.
// In production this would be persisted to disk/DB; in-memory is acceptable for
// a single-instance dev deployment (lessons learned: module-level let resets on restart).
let mcpEnabled = false
let mcpStartPromise: Promise<boolean> | null = null
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

  // Validate mode at the API boundary before forwarding
  if (mode !== undefined && (typeof mode !== 'string' || !VALID_MODES.has(mode))) {
    return NextResponse.json({ error: 'Invalid mode value' }, { status: 400 })
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
          message: 'MCP server process could not be spawned. Start it manually: npx tsx packages/dojolm-mcp/src/main.ts',
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

function startMcpServer(): Promise<boolean> {
  // Shared promise: concurrent callers await the same spawn result
  if (mcpStartPromise) return mcpStartPromise
  mcpStartPromise = doStartMcpServer().finally(() => {
    mcpStartPromise = null
  })
  return mcpStartPromise
}

async function doStartMcpServer(): Promise<boolean> {
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

    // Locate the MCP server entry point relative to the monorepo root.
    // In production (Docker), use compiled JS; in dev, fall back to tsx.
    const distEntry = resolve(process.cwd(), 'packages/dojolm-mcp/dist/main.js')
    const srcEntry = resolve(process.cwd(), 'packages/dojolm-mcp/src/main.ts')

    const { existsSync } = await import('node:fs')
    const useCompiled = existsSync(distEntry)

    if (!useCompiled) {
      console.warn('[mcp] dist/main.js not found, falling back to tsx + src/main.ts')
    }

    const cmd = useCompiled ? 'node' : 'npx'
    const args = useCompiled ? [distEntry] : ['tsx', srcEntry]

    // Consent: web UI click is the consent gate; respect env override if set
    mcpChildProcess = spawn(cmd, args, {
      env: {
        ...process.env,
        MCP_PORT: String(MCP_PORT),
        MCP_HOST: MCP_HOST,
        MCP_CONSENT: process.env.MCP_CONSENT ?? 'true',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: false,
    })

    if (mcpChildProcess.stderr) {
      mcpChildProcess.stderr.on('data', (d: Buffer) => {
        console.error('[mcp]', d.toString().trimEnd())
      })
    } else {
      console.warn('[mcp] stderr pipe not available — child process output will be lost')
    }

    mcpChildProcess.on('exit', (code, signal) => {
      console.error(`[mcp] process exited code=${code} signal=${signal}`)
      mcpChildProcess = null
    })

    return true
  } catch {
    return false
  }
}

async function stopMcpServer(): Promise<void> {
  // Capture ref locally to avoid state changes from the exit listener during async ops
  const child = mcpChildProcess
  if (!child || child.killed) return

  child.kill('SIGTERM')
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGKILL')
      }
      resolve()
    }, 2000)
    child.on('exit', () => {
      clearTimeout(timeout)
      resolve()
    })
  })
  mcpChildProcess = null
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
