'use client'

/**
 * File: KillCount.tsx
 * Purpose: Session scoreboard — threats blocked, fixtures scanned, tests run — with trophy milestones
 * Story: TPI-NODA-1.5.5
 *
 * FINDING-003 fix: fetch initial counts from server APIs on mount,
 * then merge with client-side activity events for real-time updates.
 */

import { useState, useEffect, useMemo } from 'react'
import { useActivityState } from '@/lib/contexts/ActivityContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Trophy, ShieldAlert, FlaskConical, Zap } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

function getTrophy(count: number): { icon: string; color: string } | null {
  if (count >= 100) return { icon: '🏆', color: 'text-[var(--severity-medium)]' }
  if (count >= 50) return { icon: '🥈', color: 'text-muted-foreground' }
  if (count >= 10) return { icon: '🥉', color: 'text-[var(--severity-high)]' }
  return null
}

interface CounterProps {
  label: string
  value: number
  icon: typeof Trophy
  accent: string
}

function Counter({ label, value, icon: Icon, accent }: CounterProps) {
  const trophy = getTrophy(value)
  return (
    <div className="text-center space-y-1">
      <div className="flex items-center justify-center gap-1">
        <Icon className="w-4 h-4" style={{ color: accent }} aria-hidden="true" />
        {trophy && <span className={cn('text-sm', trophy.color)} aria-label={`${label} milestone`}>{trophy.icon}</span>}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}

interface ServerCounts {
  threats: number
  scanned: number
  tests: number
}

export function KillCount() {
  const { events } = useActivityState()
  const [serverCounts, setServerCounts] = useState<ServerCounts>({ threats: 0, scanned: 0, tests: 0 })

  // Fetch initial counts from server on mount
  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      try {
        const res = await fetchWithAuth('/api/llm/guard/stats')
        if (!cancelled && res.ok) {
          const json = await res.json()
          const stats = json.data ?? json
          setServerCounts({
            threats: stats.byAction?.block ?? stats.blocked ?? 0,
            scanned: stats.totalEvents ?? stats.total ?? 0,
            tests: stats.tests ?? 0,
          })
        }
      } catch {
        // Silently fail — widget shows session-only data
      }
    }
    loadCounts()
    return () => { cancelled = true }
  }, [])

  // Merge server baseline with client-side session events
  const counts = useMemo(() => {
    let sessionThreats = 0
    let sessionScans = 0
    let sessionTests = 0
    for (const event of events) {
      if (event.type === 'threat_detected') sessionThreats++
      if (event.type === 'scan_complete') sessionScans++
      if (event.type === 'test_passed' || event.type === 'test_failed') sessionTests++
    }
    return {
      threats: serverCounts.threats + sessionThreats,
      scans: serverCounts.scanned + sessionScans,
      tests: serverCounts.tests + sessionTests,
    }
  }, [events, serverCounts])

  return (
    <WidgetCard title="Kill Count">
      <div className="grid grid-cols-3 gap-3 py-1">
        <Counter label="Threats" value={counts.threats} icon={ShieldAlert} accent="var(--danger)" />
        <Counter label="Scanned" value={counts.scans} icon={FlaskConical} accent="var(--warning)" />
        <Counter label="Tests" value={counts.tests} icon={Zap} accent="var(--success)" />
      </div>
    </WidgetCard>
  )
}
