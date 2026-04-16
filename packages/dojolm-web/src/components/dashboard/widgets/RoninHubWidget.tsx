/**
 * File: RoninHubWidget.tsx
 * Purpose: Ronin Hub dashboard widget — active submissions, subscribed programs, CVE alerts
 * Story: NODA-3 Story 10.6
 * Index:
 * - RoninHubWidget component (line 14)
 */

'use client'

import { useState, useEffect } from 'react'
import { WidgetCard } from '../WidgetCard'
import { Badge } from '@/components/ui/badge'
import { useNavigation } from '@/lib/NavigationContext'
import { Bug, Send, Star, AlertTriangle, DollarSign, ExternalLink } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { roninSubmissionsRawStore, roninSubscriptionsStore } from '@/lib/stores'

interface WidgetData {
  submissions: number
  subscribed: number
  latestCve: { id: string; severity: string; summary: string } | null
  totalRewards: number
}

function loadLocalData(): WidgetData {
  const data: WidgetData = { submissions: 0, subscribed: 0, latestCve: null, totalRewards: 0 }
  const subs = roninSubmissionsRawStore.get()
  data.submissions = subs.length
  data.totalRewards = subs.reduce<number>((sum, s) => {
    const payout = typeof (s as Record<string, unknown>).payout === 'number' ? (s as { payout: number }).payout : 0
    return sum + payout
  }, 0)
  data.subscribed = roninSubscriptionsStore.get().length
  return data
}

export function RoninHubWidget() {
  const { setActiveTab } = useNavigation()
  const [data, setData] = useState<WidgetData>({ submissions: 0, subscribed: 0, latestCve: null, totalRewards: 0 })

  useEffect(() => {
    let cancelled = false
    const localData = loadLocalData()
    setData(localData)

    // Fetch latest CVE
    async function fetchCve() {
      try {
        const res = await fetchWithAuth('/api/ronin/cves?limit=1')
        if (!res.ok || cancelled) return
        const json = await res.json()
        if (!cancelled && Array.isArray(json.cves) && json.cves.length > 0) {
          setData(prev => ({
            ...prev,
            latestCve: {
              id: /^CVE-\d{4}-\d+$/.test(String(json.cves[0].id ?? '')) ? String(json.cves[0].id) : 'Unknown',
              severity: ['critical','high','medium','low'].includes(String(json.cves[0].severity ?? '').toLowerCase()) ? String(json.cves[0].severity) : 'Unknown',
              summary: String(json.cves[0].summary ?? '').slice(0, 300),
            },
          }))
        }
      } catch {
        // Ignore — widget remains useful without CVE data
      }
    }
    fetchCve()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard
      title="Ronin Hub"
      actions={
        <button
          onClick={() => setActiveTab('ronin-hub')}
          className="text-xs text-[var(--dojo-primary)] hover:underline flex items-center gap-1 min-h-[44px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
          aria-label="Open Ronin Hub"
        >
          Open
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-3">
        {/* Metrics Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
            <Send className="h-3.5 w-3.5 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Submissions</p>
              <p className="text-sm font-bold">{data.submissions}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
            <Star className="h-3.5 w-3.5 text-[var(--warning)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Subscribed</p>
              <p className="text-sm font-bold">{data.subscribed}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-tertiary)]">
            <DollarSign className="h-3.5 w-3.5 text-[var(--success)] shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Rewards</p>
              <p className="text-sm font-bold text-[var(--success)]">${data.totalRewards.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Latest CVE Alert */}
        {data.latestCve && (
          <div className="p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-[var(--severity-high)]" aria-hidden="true" />
              <span className="text-[10px] font-mono font-bold">{data.latestCve.id}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto">
                {data.latestCve.severity}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground line-clamp-2">{data.latestCve.summary}</p>
          </div>
        )}
      </div>
    </WidgetCard>
  )
}
