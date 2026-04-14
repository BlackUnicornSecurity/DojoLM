'use client'

/**
 * File: SengokuWidget.tsx
 * Purpose: Sengoku campaign summary — campaign count, active status
 * Story: H17.9; Story 2.1.3 — wired to /api/sengoku/campaigns (no mock data)
 */

import { useState, useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { WidgetCard } from '../WidgetCard'
import { cn } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { Campaign } from '@/lib/sengoku-types'

export function SengokuWidget() {
  const { setActiveTab } = useNavigation()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetchWithAuth('/api/sengoku/campaigns')
        if (cancelled) return
        if (!res.ok) { if (!cancelled) setError(true); return }
        const data = await res.json()
        if (!cancelled && Array.isArray(data.campaigns)) {
          setCampaigns(data.campaigns)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const total = campaigns.length
  const running = campaigns.filter(c => c.status === 'active').length
  const draft = campaigns.filter(c => c.status === 'draft').length

  return (
    <WidgetCard
      title="Sengoku Campaigns"
      actions={
        <button
          onClick={() => setActiveTab('sengoku')}
          className="text-xs text-[var(--dojo-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)] min-h-[44px] inline-flex items-center"
          aria-label="Open Sengoku Campaigns"
        >
          Open
        </button>
      }
    >
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading campaigns">
          <div className="h-8 bg-muted/50 rounded motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-4 bg-muted/50 rounded motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">Could not load data</p>
          <p className="text-xs text-muted-foreground/60">Check your connection and try again</p>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 gap-1 text-center">
          <p className="text-xs text-muted-foreground">No campaigns yet</p>
          <p className="text-xs text-muted-foreground/60">Create a campaign in Sengoku to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums">{total}</span>
            <span className="text-xs text-muted-foreground">campaigns</span>
            {running > 0 && (
              <span className={cn(
                'ml-auto px-1.5 py-0.5 text-xs font-medium rounded',
                'bg-[var(--status-allow-bg)] text-[var(--status-allow)]'
              )}>
                {running} ACTIVE
              </span>
            )}
          </div>
          {draft > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Draft</span>
              <span className="font-medium tabular-nums">{draft}</span>
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
