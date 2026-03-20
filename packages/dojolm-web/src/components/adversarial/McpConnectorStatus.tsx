/**
 * File: McpConnectorStatus.tsx
 * Purpose: Persistent MCP connection status bar with health check, server controls, and troubleshooting
 * Story: TPI-NODA-6.1 - Atemi Lab MCP Connector, H13.1 - MCP Server Controls
 * Index:
 * - McpConnectorStatusProps interface (line 18)
 * - McpConnectorStatus component (line 29)
 * - ConsentDialog component (line ~145)
 * - ServerControls component (line ~185)
 * - TroubleshootingPanel component (line ~240)
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import {
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Clock,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

export interface McpConnectorStatusProps {
  /** Override the connected state (for testing/demo) */
  connected?: boolean
  /** Model name to display */
  modelName?: string
  /** Latency in ms */
  latency?: number
  className?: string
}

export function McpConnectorStatus({
  connected: connectedProp,
  modelName = 'No model configured',
  latency: latencyProp,
  className,
}: McpConnectorStatusProps) {
  const [isConnected, setIsConnected] = useState(connectedProp ?? false)
  const [latency, setLatency] = useState(latencyProp ?? 0)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [showConsent, setShowConsent] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  // Track mount state (StrictMode-safe: re-set on re-mount)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const checkHealth = useCallback(async () => {
    setIsChecking(true)
    try {
      const start = Date.now()
      const response = await fetchWithAuth('/api/mcp/status', {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      const elapsed = Date.now() - start

      if (!mountedRef.current) return

      if (response.ok) {
        const data = await response.json()
        const connected = data?.connected === true
        setIsConnected(connected)
        setLatency(connected ? (data?.latency ?? elapsed) : 0)
        setStatusMessage(data?.message ?? null)
        if (connected) setShowTroubleshooting(false)
      } else {
        setIsConnected(false)
        setLatency(0)
        setStatusMessage(null)
      }
    } catch {
      if (!mountedRef.current) return
      // If the API doesn't exist yet, use prop values
      if (connectedProp !== undefined) {
        setIsConnected(connectedProp)
        setLatency(latencyProp ?? 0)
      } else {
        setIsConnected(false)
        setLatency(0)
      }
    } finally {
      if (!mountedRef.current) return
      setIsChecking(false)
      setLastChecked(new Date())
    }
  }, [connectedProp, latencyProp])

  // Initial check + auto-refresh every 10 seconds
  useEffect(() => {
    checkHealth()
    intervalRef.current = setInterval(checkHealth, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkHealth])

  const toggleTroubleshooting = useCallback(() => {
    setShowTroubleshooting((prev) => !prev)
  }, [])

  const handleStartRequest = useCallback(() => {
    setShowConsent(true)
  }, [])

  const handleStartConfirm = useCallback(async () => {
    setShowConsent(false)
    setIsStarting(true)
    setStatusMessage('Starting MCP server...')
    try {
      const response = await fetchWithAuth('/api/mcp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      if (response.ok) {
        const data = await response.json()
        if (mountedRef.current) {
          setStatusMessage(data?.message ?? null)
          setIsConnected(data?.connected === true)
        }
        // Follow up with a health check after a brief delay
        setTimeout(() => { if (mountedRef.current) checkHealth() }, 2000)
      } else {
        if (mountedRef.current) setStatusMessage('Failed to start MCP server')
      }
    } catch {
      if (mountedRef.current) setStatusMessage('Network error starting MCP server')
    } finally {
      if (mountedRef.current) setIsStarting(false)
    }
  }, [checkHealth])

  const handleStartCancel = useCallback(() => {
    setShowConsent(false)
  }, [])

  const handleStop = useCallback(async () => {
    setIsStopping(true)
    try {
      const response = await fetchWithAuth('/api/mcp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      if (response.ok) {
        if (mountedRef.current) {
          setIsConnected(false)
          setLatency(0)
        }
      }
    } finally {
      if (mountedRef.current) setIsStopping(false)
    }
  }, [])

  const handleRestart = useCallback(async () => {
    setIsStopping(true)
    try {
      await fetchWithAuth('/api/mcp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      })
      // Small delay between stop and start
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (!mountedRef.current) return
      setIsStopping(false)
      setIsStarting(true)
      const response = await fetchWithAuth('/api/mcp/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: true }),
      })
      if (response.ok) {
        await checkHealth()
      }
    } finally {
      if (mountedRef.current) {
        setIsStopping(false)
        setIsStarting(false)
      }
    }
  }, [checkHealth])

  return (
    <Card className={cn(
      'border',
      isConnected
        ? 'border-[var(--success)]/20 bg-[var(--success)]/5'
        : 'border-[var(--danger)]/20 bg-[var(--danger)]/5',
      className
    )}>
      <CardContent className="p-3">
        {/* Status bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            MCP
          </span>
          <span className="text-xs text-[var(--foreground)] font-medium">
            {modelName}
          </span>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
                </span>
                <Wifi className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--success)]">Connected</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                <WifiOff className="h-3.5 w-3.5 text-[var(--warning)]" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--warning)]">Not connected</span>
              </>
            )}
          </div>
          {isConnected && latency > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Latency: {latency}ms</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className={cn(
                'p-1.5 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)]',
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                isChecking && 'opacity-50'
              )}
              aria-label="Refresh connection status"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isChecking && 'motion-safe:animate-spin')} aria-hidden="true" />
            </button>
            {!isConnected && (
              <button
                onClick={toggleTroubleshooting}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-expanded={showTroubleshooting}
                aria-controls="mcp-troubleshooting"
                aria-label="Toggle troubleshooting panel"
              >
                {showTroubleshooting ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Status message + last checked */}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {statusMessage && !isConnected && (
            <p className="text-xs text-[var(--severity-medium)]">
              {statusMessage}
            </p>
          )}
          {lastChecked && (
            <p className="text-xs text-[var(--text-tertiary)]">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Consent dialog */}
        {showConsent && (
          <ConsentDialog
            onConfirm={handleStartConfirm}
            onCancel={handleStartCancel}
          />
        )}

        {/* Server Controls */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)]">
          {!isConnected ? (
            <button
              onClick={handleStartRequest}
              disabled={isStarting}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20',
                'hover:bg-[var(--success)]/20 min-h-[44px]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'motion-safe:transition-colors',
              )}
              aria-label="Start MCP server"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {isStarting ? 'Starting...' : 'Start Server'}
            </button>
          ) : (
            <>
              <button
                onClick={handleStop}
                disabled={isStopping || isStarting}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20',
                  'hover:bg-[var(--danger)]/20 min-h-[44px]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'motion-safe:transition-colors',
                )}
                aria-label="Stop MCP server"
              >
                <Square className="h-3.5 w-3.5" aria-hidden="true" />
                {isStopping ? 'Stopping...' : 'Stop'}
              </button>
              <button
                onClick={handleRestart}
                disabled={isStopping || isStarting}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                  'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
                  'hover:bg-[var(--warning)]/20 min-h-[44px]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'motion-safe:transition-colors',
                )}
                aria-label="Restart MCP server"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', (isStopping || isStarting) && 'motion-safe:animate-spin')} aria-hidden="true" />
                {isStopping || isStarting ? 'Restarting...' : 'Restart'}
              </button>
            </>
          )}
        </div>

        {/* Troubleshooting panel */}
        {!isConnected && showTroubleshooting && (
          <TroubleshootingPanel />
        )}
      </CardContent>
    </Card>
  )
}

function ConsentDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="mt-2 p-3 rounded-lg bg-[var(--warning)]/5 border border-[var(--warning)]/20"
      role="group"
      aria-label="Confirm MCP server start"
    >
      <p className="text-xs text-[var(--foreground)] mb-2">
        This will start the MCP test server. Continue?
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={onConfirm}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
            'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20',
            'hover:bg-[var(--success)]/20',
            'motion-safe:transition-colors',
          )}
          aria-label="Confirm start MCP server"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium min-h-[44px]',
            'bg-[var(--bg-tertiary)] text-muted-foreground border border-[var(--border)]',
            'hover:bg-[var(--bg-quaternary)]',
            'motion-safe:transition-colors',
          )}
          aria-label="Cancel start MCP server"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function TroubleshootingPanel() {
  const steps = [
    'Verify the MCP server is running and accessible',
    'Check the API endpoint URL in the config panel',
    'Ensure the target model API key is valid',
    'Check network connectivity and firewall rules',
    'Review server logs for authentication errors',
  ]

  return (
    <div
      id="mcp-troubleshooting"
      className="mt-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)]"
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
        <h4 className="text-sm font-semibold text-[var(--foreground)]">Troubleshooting</h4>
      </div>
      <ol className="space-y-1.5 list-decimal list-inside" aria-label="Troubleshooting steps">
        {steps.map((step, idx) => (
          <li key={idx} className="text-xs text-muted-foreground leading-relaxed">
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}
