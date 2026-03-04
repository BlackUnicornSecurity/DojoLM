'use client'

/**
 * File: KillCount.tsx
 * Purpose: Session scoreboard — threats blocked, fixtures scanned, tests run — with trophy milestones
 * Story: TPI-NODA-1.5.5
 */

import { useMemo } from 'react'
import { useActivityState } from '@/lib/contexts/ActivityContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { Trophy, ShieldAlert, FlaskConical, Zap } from 'lucide-react'

function getTrophy(count: number): { icon: string; color: string } | null {
  if (count >= 100) return { icon: '🏆', color: 'text-yellow-400' }
  if (count >= 50) return { icon: '🥈', color: 'text-gray-300' }
  if (count >= 10) return { icon: '🥉', color: 'text-amber-600' }
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
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  )
}

export function KillCount() {
  const { events } = useActivityState()

  const counts = useMemo(() => {
    let threats = 0
    let scans = 0
    let tests = 0
    for (const event of events) {
      if (event.type === 'threat_detected') threats++
      if (event.type === 'scan_complete') scans++
      if (event.type === 'test_passed' || event.type === 'test_failed') tests++
    }
    return { threats, scans, tests }
  }, [events])

  return (
    <WidgetCard title="Kill Count">
      <div className="grid grid-cols-3 gap-4 py-2">
        <Counter label="Threats" value={counts.threats} icon={ShieldAlert} accent="var(--danger)" />
        <Counter label="Scanned" value={counts.scans} icon={FlaskConical} accent="var(--warning)" />
        <Counter label="Tests" value={counts.tests} icon={Zap} accent="var(--success)" />
      </div>
    </WidgetCard>
  )
}
