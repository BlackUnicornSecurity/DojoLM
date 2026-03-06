/**
 * File: McpConnectorStatus.tsx
 * Purpose: Persistent MCP connection status bar with health check and troubleshooting
 * Story: TPI-NODA-6.1 - Atemi Lab MCP Connector
 * Index:
 * - McpConnectorStatusProps interface (line 16)
 * - McpConnectorStatus component (line 27)
 * - TroubleshootingPanel component (line 120)
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
  const [showTroubleshooting, setShowTroubleshooting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
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
        setLatency(connected ? elapsed : 0)
        if (connected) setShowTroubleshooting(false)
      } else {
        setIsConnected(false)
        setLatency(0)
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
                <span className="h-2 w-2 rounded-full bg-[var(--danger)]" />
                <WifiOff className="h-3.5 w-3.5 text-[var(--danger)]" aria-hidden="true" />
                <span className="text-xs font-medium text-[var(--danger)]">Disconnected</span>
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

        {/* Last checked timestamp */}
        {lastChecked && (
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}

        {/* Troubleshooting panel */}
        {!isConnected && showTroubleshooting && (
          <TroubleshootingPanel />
        )}
      </CardContent>
    </Card>
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
