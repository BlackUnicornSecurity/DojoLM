'use client'

/**
 * File: SystemHealth.tsx
 * Purpose: System health dashboard showing scanner, guard, storage, and MCP status
 * Story: TPI-NODA-002-04
 * Index:
 * - HealthData type (line 16)
 * - SystemHealth component (line 32)
 * - StatusCard sub-component (line 112)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Activity, Server, Shield, Database, Wifi, RefreshCw, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface HealthData {
  scanner: { reachable: boolean; responseTimeMs?: number; lastScanTime?: string }
  guard: { enabled: boolean; mode: string; eventCount: number }
  storage: { type: string; modelsCount: number }
  app: { version: string; nodeVersion?: string }
}

type HealthStatus = 'loading' | 'healthy' | 'degraded' | 'error'

const AUTO_REFRESH_INTERVAL = 30_000

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [status, setStatus] = useState<HealthStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/health')
      if (!res.ok) throw new Error('Health check failed')
      const data: HealthData = await res.json()
      setHealth(data)
      setError(null)
      setLastRefresh(new Date().toISOString())

      if (!data.scanner.reachable || !data.guard.enabled) {
        setStatus('degraded')
      } else {
        setStatus('healthy')
      }
    } catch {
      setStatus('error')
      setError('Unable to reach health endpoint.')

      setHealth({
        scanner: { reachable: false },
        guard: { enabled: false, mode: 'unknown', eventCount: 0 },
        storage: { type: 'unknown', modelsCount: 0 },
        app: { version: '1.0.0' },
      })
      setLastRefresh(new Date().toISOString())
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    intervalRef.current = setInterval(fetchHealth, AUTO_REFRESH_INTERVAL)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchHealth])

  const overallIcon = status === 'healthy' ? CheckCircle : status === 'degraded' ? AlertTriangle : XCircle
  const overallColor = status === 'healthy' ? 'text-green-400' : status === 'degraded' ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" aria-hidden="true" />
            System Health
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time monitoring of platform components. Auto-refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status !== 'loading' && (
            <div className="flex items-center gap-2">
              {(() => {
                const Icon = overallIcon
                return <Icon className={cn('w-4 h-4', overallColor)} aria-hidden="true" />
              })()}
              <span className={cn('text-sm font-medium', overallColor)}>
                {status === 'healthy' ? 'All Systems OK' : status === 'degraded' ? 'Degraded' : 'Error'}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={fetchHealth}
            disabled={status === 'loading'}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors disabled:opacity-50"
            aria-label="Refresh health status"
          >
            {status === 'loading' ? (
              <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error} Showing fallback data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Scanner Status */}
        <StatusCard
          title="Haiku Scanner"
          icon={Server}
          status={health?.scanner.reachable ? 'online' : 'offline'}
          items={[
            { label: 'Status', value: health?.scanner.reachable ? 'Reachable' : 'Unreachable' },
            { label: 'Response Time', value: health?.scanner.responseTimeMs ? `${health.scanner.responseTimeMs}ms` : 'N/A' },
            { label: 'Last Scan', value: health?.scanner.lastScanTime ?? 'Never' },
          ]}
        />

        {/* Guard Status */}
        <StatusCard
          title="Hattori Guard"
          icon={Shield}
          status={health?.guard.enabled ? 'online' : 'offline'}
          items={[
            { label: 'Status', value: health?.guard.enabled ? 'Enabled' : 'Disabled' },
            { label: 'Mode', value: health?.guard.mode ?? 'N/A' },
            { label: 'Events', value: String(health?.guard.eventCount ?? 0) },
          ]}
        />

        {/* Storage Status */}
        <StatusCard
          title="Storage"
          icon={Database}
          status={status === 'error' ? 'offline' : 'online'}
          items={[
            { label: 'Backend', value: health?.storage.type ?? 'Unknown' },
            { label: 'Models', value: String(health?.storage.modelsCount ?? 0) },
          ]}
        />

        {/* Application Info */}
        <StatusCard
          title="Application"
          icon={Wifi}
          status={status === 'error' ? 'offline' : 'online'}
          items={[
            { label: 'Version', value: health?.app.version ?? '1.0.0' },
            { label: 'Node', value: health?.app.nodeVersion ?? 'N/A' },
            { label: 'Last Check', value: lastRefresh ? new Date(lastRefresh).toLocaleTimeString('en-US') : 'Never' },
          ]}
        />
      </div>
    </div>
  )
}

function StatusCard({
  title,
  icon: Icon,
  status,
  items,
}: {
  title: string
  icon: typeof Activity
  status: 'online' | 'offline'
  items: { label: string; value: string }[]
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        <span
          className={cn('w-2 h-2 rounded-full', status === 'online' ? 'bg-green-500' : 'bg-red-500')}
          role="status"
          aria-label={`${title}: ${status}`}
        />
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="text-foreground font-medium">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
