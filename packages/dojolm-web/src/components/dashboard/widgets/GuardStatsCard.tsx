'use client'

/**
 * File: GuardStatsCard.tsx
 * Purpose: Guard stats with mini donut and metric cards
 * Story: TPI-NODA-1.5.3
 */

import { useGuardStats } from '@/lib/contexts/GuardContext'
import { DojoDonutChart } from '@/components/charts'
import { MetricCard } from '@/components/ui/MetricCard'
import { WidgetCard } from '../WidgetCard'
import { ShieldCheck, Ban, BarChart3 } from 'lucide-react'

export function GuardStatsCard() {
  const { stats } = useGuardStats()

  const blocked = stats?.byAction?.block ?? 0
  const allowed = stats?.byAction?.allow ?? 0
  const logged = stats?.byAction?.log ?? 0
  const total = stats?.totalEvents ?? 0
  const blockRate = stats?.blockRate ?? 0

  const donutData = [
    { name: 'Blocked', value: blocked },
    { name: 'Allowed', value: allowed },
    { name: 'Logged', value: logged },
  ].filter(d => d.value > 0)

  return (
    <WidgetCard title="Guard Stats">
      <div className="space-y-3">
        {total > 0 ? (
          <DojoDonutChart
            title=""
            data={donutData}
            centerLabel="Block Rate"
            centerValue={`${Math.round(blockRate)}%`}
            className="border-0 shadow-none p-0"
            height={150}
          />
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">
            No guard events yet
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <MetricCard
            label="Total"
            value={total}
            icon={BarChart3}
            accent="primary"
          />
          <MetricCard
            label="Blocked"
            value={blocked}
            icon={Ban}
            accent="danger"
          />
          <MetricCard
            label="Allowed"
            value={allowed}
            icon={ShieldCheck}
            accent="success"
          />
        </div>
      </div>
    </WidgetCard>
  )
}
