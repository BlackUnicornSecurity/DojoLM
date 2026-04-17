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
import { isDemoMode } from '@/lib/demo'
import { demoMcpStatusGet } from '@/lib/demo/mock-api-handlers'
import { checkApiAuth } from '@/lib/api-auth'
import { auditLog } from '@/lib/audit-logger'
import { getDataPath } from '@/lib/runtime-paths'

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
// Persisted to `data/mcp-state.json` so the flag survives a container restart —
// before this, a web-container reboot would silently flip MCP back to disabled
// and leave Guard defenses offline until someone clicked Start Server again.
let mcpEnabled = false
let mcpStartPromise: Promise<StartResult> | null = null
let mcpChildProcess: ReturnType<typeof import('node:child_process').spawn> | null = null
/** Last startup error surfaced to the UI so the user can see WHY MCP failed. */
let mcpLastError: string | null = null
/** One-shot load guard so we don't hit the filesystem on every GET. */
let mcpStateHydrated = false

interface StartResult {
  readonly ok: boolean
  readonly error?: string
}

const MCP_STATE_FILE = getDataPath('mcp-state.json')

async function hydrateMcpState(): Promise<void> {
  if (mcpStateHydrated) return
  mcpStateHydrated = true
  try {
    const { readFile } = await import('node:fs/promises')
    const raw = await readFile(MCP_STATE_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as { enabled?: unknown }
    if (typeof parsed.enabled === 'boolean') mcpEnabled = parsed.enabled
  } catch {
    // No state file yet — stay at default `false`.
  }
}

async function persistMcpState(): Promise<void> {
  try {
    const { writeFile, mkdir } = await import('node:fs/promises')
    const { dirname } = await import('node:path')
    await mkdir(dirname(MCP_STATE_FILE), { recursive: true })
    await writeFile(MCP_STATE_FILE, JSON.stringify({ enabled: mcpEnabled }), 'utf-8')
  } catch (err) {
    // Persistence failure is non-fatal — the process still works in-memory.
    console.error('[mcp] failed to persist state:', err)
  }
}

/**
 * GET /api/mcp/status — probe the real MCP server on localhost:18000/health
 */
export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoMcpStatusGet()

  const authResult = checkApiAuth(request)
  if (authResult) return authResult

  await hydrateMcpState()

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
      lastError: mcpLastError,
    })
  } catch {
    // Server unreachable
    return NextResponse.json({
      connected: false,
      enabled: mcpEnabled,
      message: mcpEnabled
        ? 'MCP server enabled but unreachable. It may still be starting.'
        : 'MCP server is not running. Click Start Server to launch it.',
      lastError: mcpLastError,
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

  await hydrateMcpState()

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
      void auditLog.mcpLifecycle({ user: 'admin', action: 'mode_change', detail: mode })
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
    void persistMcpState()

    if (enabled) {
      mcpLastError = null
      // Attempt to start MCP server as child process
      const started = await startMcpServer()
      if (!started.ok) {
        mcpLastError = started.error ?? 'unknown spawn failure'
        mcpEnabled = false
        return NextResponse.json({
          connected: false,
          enabled: false,
          message: 'MCP server process could not be spawned.',
          lastError: mcpLastError,
        }, { status: 500 })
      }

      // Wait briefly for the server to become reachable
      const reachable = await waitForServer(5000)
      void auditLog.mcpLifecycle({ user: 'admin', action: 'start', detail: reachable ? 'reachable' : 'pending' })
      return NextResponse.json({
        connected: reachable,
        enabled: true,
        message: reachable
          ? 'MCP server started successfully'
          : 'MCP server started but not yet reachable. It may need a few more seconds.',
        lastError: reachable ? null : mcpLastError,
      })
    } else {
      // Stop the MCP server
      await stopMcpServer()
      mcpLastError = null
      void auditLog.mcpLifecycle({ user: 'admin', action: 'stop' })
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

function startMcpServer(): Promise<StartResult> {
  // Shared promise: concurrent callers await the same spawn result
  if (mcpStartPromise) return mcpStartPromise
  mcpStartPromise = doStartMcpServer().finally(() => {
    mcpStartPromise = null
  })
  return mcpStartPromise
}

/**
 * Resolve the MCP entry file by trying several candidate roots.
 * Works from monorepo root, from packages/dojolm-web (dev npm run dev),
 * and from the Docker standalone runtime where the bundle is at /app.
 */
async function resolveMcpEntries(): Promise<{ distEntry: string | null; srcEntry: string | null }> {
  const { resolve } = await import('node:path')
  const { existsSync } = await import('node:fs')

  const candidates = [
    process.cwd(),                              // monorepo root (most common)
    resolve(process.cwd(), '..', '..'),         // running from packages/dojolm-web
    resolve(process.cwd(), '..'),               // running from packages/*
    '/app',                                     // Docker standalone
  ]

  let distEntry: string | null = null
  let srcEntry: string | null = null
  for (const root of candidates) {
    const distCandidate = resolve(root, 'packages/dojolm-mcp/dist/main.js')
    const srcCandidate = resolve(root, 'packages/dojolm-mcp/src/main.ts')
    if (!distEntry && existsSync(distCandidate)) distEntry = distCandidate
    if (!srcEntry && existsSync(srcCandidate)) srcEntry = srcCandidate
    if (distEntry && srcEntry) break
  }
  return { distEntry, srcEntry }
}

async function doStartMcpServer(): Promise<StartResult> {
  // If already running, just return ok
  if (mcpChildProcess && !mcpChildProcess.killed) {
    return { ok: true }
  }

  // Check if server is already running externally
  const alreadyUp = await probeHealth()
  if (alreadyUp) return { ok: true }

  try {
    const { spawn } = await import('node:child_process')
    const { distEntry, srcEntry } = await resolveMcpEntries()

    if (!distEntry && !srcEntry) {
      const msg = `MCP entry not found under any candidate root (cwd=${process.cwd()}). Run "npx tsc -b packages/dojolm-mcp" or ensure the Docker image was rebuilt.`
      console.error('[mcp]', msg)
      return { ok: false, error: msg }
    }

    const useCompiled = !!distEntry
    if (!useCompiled) {
      console.warn('[mcp] dist/main.js not found, falling back to tsx + src/main.ts')
    }

    const cmd = useCompiled ? 'node' : 'npx'
    const args = useCompiled ? [distEntry as string] : ['tsx', srcEntry as string]

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
        const line = d.toString().trimEnd()
        console.error('[mcp]', line)
        // Surface the latest stderr line so the UI can report root cause
        mcpLastError = line.slice(-500)
      })
    } else {
      console.warn('[mcp] stderr pipe not available — child process output will be lost')
    }

    mcpChildProcess.on('error', (err: Error) => {
      console.error('[mcp] spawn error:', err.message)
      mcpLastError = `spawn error: ${err.message}`
      mcpChildProcess = null
    })

    mcpChildProcess.on('exit', (code, signal) => {
      console.error(`[mcp] process exited code=${code} signal=${signal}`)
      if (code !== 0 && !mcpLastError) {
        mcpLastError = `process exited with code=${code} signal=${signal}`
      }
      mcpChildProcess = null
    })

    return { ok: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[mcp] doStartMcpServer failed:', msg)
    return { ok: false, error: msg }
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
