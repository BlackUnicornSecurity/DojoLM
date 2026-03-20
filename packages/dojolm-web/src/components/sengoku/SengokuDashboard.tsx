/**
 * File: SengokuDashboard.tsx
 * Purpose: Sengoku — Continuous Red Teaming module dashboard
 * Story: HAKONE H17.7
 * Index:
 * - Campaign list with status indicators (line ~50)
 * - Campaign detail panel (line ~120)
 * - New campaign button (line ~160)
 */

'use client'

import { useState, useCallback } from 'react'
import {
  Swords, Plus, Play, Pause, Square, RefreshCw, FileText,
  AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, Timer,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { TemporalTab } from './TemporalTab'

type SengokuTab = 'campaigns' | 'temporal'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CampaignSummary {
  readonly id: string
  readonly name: string
  readonly target: string
  readonly schedule: string
  readonly status: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
  readonly lastRunAt: string | null
  readonly findingCount: number
  readonly regressionCount: number
}

// ---------------------------------------------------------------------------
// Demo Data
// ---------------------------------------------------------------------------

const DEMO_CAMPAIGNS: CampaignSummary[] = [
  { id: 'camp-1', name: 'Production API Scan', target: 'https://api.example.com/v1/chat', schedule: 'Daily', status: 'completed', lastRunAt: '2026-03-12T10:00:00Z', findingCount: 12, regressionCount: 2 },
  { id: 'camp-2', name: 'Staging Environment', target: 'https://staging.example.com/api', schedule: 'Weekly', status: 'running', lastRunAt: '2026-03-13T08:00:00Z', findingCount: 5, regressionCount: 0 },
  { id: 'camp-3', name: 'Local Model Test', target: 'http://localhost:11434/v1/chat', schedule: 'Hourly', status: 'idle', lastRunAt: null, findingCount: 0, regressionCount: 0 },
]

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  idle: { icon: Clock, color: 'text-muted-foreground', label: 'Idle' },
  running: { icon: Play, color: 'text-[var(--status-allow)]', label: 'Running' },
  completed: { icon: CheckCircle2, color: 'text-[var(--status-allow)]', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-[var(--status-block)]', label: 'Failed' },
  paused: { icon: Pause, color: 'text-[var(--severity-medium)]', label: 'Paused' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SengokuDashboard() {
  const [campaigns] = useState<CampaignSummary[]>(DEMO_CAMPAIGNS)
  const [selectedId, setSelectedId] = useState<string | null>(DEMO_CAMPAIGNS[0]?.id ?? null)
  const [activeTab, setActiveTab] = useState<SengokuTab>('campaigns')
  const selected = campaigns.find((c) => c.id === selectedId)

  const TEMPORAL_PLAN_COUNT = 20 // Demo plan count

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Sengoku"
        subtitle="Continuous Red Teaming"
        icon={Swords}
        actions={
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Campaign
          </Button>
        }
      />

      {/* Demo data notice */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--severity-medium)]/30 bg-[var(--severity-medium)]/5 px-3 py-2">
        <AlertTriangle className="w-4 h-4 text-[var(--severity-medium)] shrink-0" aria-hidden="true" />
        <p className="text-xs text-[var(--severity-medium)]">
          Showing demo data. Connect a real target to start continuous red teaming.
        </p>
      </div>

      {/* Combined Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Campaigns" value={String(campaigns.length)} />
        <StatCard label="Temporal Plans" value={String(TEMPORAL_PLAN_COUNT)} />
        <StatCard label="Active" value={String(campaigns.filter((c) => c.status === 'running').length)} />
        <StatCard label="Total Findings" value={String(campaigns.reduce((s, c) => s + c.findingCount, 0))} />
        <StatCard label="Regressions" value={String(campaigns.reduce((s, c) => s + c.regressionCount, 0))} accent />
      </div>

      {/* Tab System */}
      <Tabs value={activeTab} onValueChange={(v) => {
        if (v === 'campaigns' || v === 'temporal') setActiveTab(v)
      }} className="space-y-4">
        <TabsList className="flex w-full h-auto gap-1 bg-muted/50 p-1 rounded-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="campaigns" className="gap-2 min-h-[44px] flex-shrink-0 px-3">
            <Swords className="h-4 w-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="temporal" className="gap-2 min-h-[44px] flex-shrink-0 px-3">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">Temporal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
      {/* Campaign List */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No campaigns yet"
          description="Create your first continuous red teaming campaign to start automated security testing."
          action={{ label: 'Create Campaign', onClick: () => {} }}
        />
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => {
            const status = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.idle
            const StatusIcon = status.icon
            return (
              <button
                key={campaign.id}
                onClick={() => setSelectedId(campaign.id === selectedId ? null : campaign.id)}
                className={cn(
                  'w-full text-left rounded-lg border p-4 transition-colors',
                  'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
                  selectedId === campaign.id && 'border-[var(--dojo-primary)] bg-muted/30',
                )}
                aria-label={`Campaign: ${campaign.name}, Status: ${status.label}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon className={cn('w-5 h-5 shrink-0', status.color)} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{campaign.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {campaign.status === 'running' && (
                      <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--status-allow)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-allow)] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-12 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                            <span className="block h-full w-[45%] rounded-full bg-[var(--status-allow)]" />
                          </span>
                          45%
                        </span>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{campaign.schedule}</span>
                    {campaign.findingCount > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--status-block)]/10 text-[var(--status-block)]">
                        {campaign.findingCount} findings
                      </span>
                    )}
                    {campaign.regressionCount > 0 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--severity-medium)]/10 text-[var(--severity-medium)]">
                        {campaign.regressionCount} regressions
                      </span>
                    )}
                    <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', selectedId === campaign.id && 'rotate-90')} aria-hidden="true" />
                  </div>
                </div>
              </button>
            )
          })}
          {/* Ghost card for adding new campaign */}
          <button
            className="w-full text-left rounded-lg border border-dashed border-[var(--border)] p-4 transition-colors hover:bg-muted/30 hover:border-[var(--dojo-primary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
            aria-label="Create new campaign"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Plus className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-medium">Create new campaign</span>
            </div>
          </button>
        </div>
      )}

      {/* Campaign Summary */}
      <GlowCard glow="subtle" className="p-4">
        <h4 className="text-sm font-semibold mb-3">Campaign Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <Clock className="w-5 h-5 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Next Scheduled Run</p>
              <p className="font-medium">Production API — in 4h 12m</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <RefreshCw className="w-5 h-5 text-[var(--status-allow)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Last Completed</p>
              <p className="font-medium">Production API — {formatDate('2026-03-12T10:00:00Z')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
            <AlertTriangle className="w-5 h-5 text-[var(--severity-medium)] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Unresolved Regressions</p>
              <p className="font-medium">2 across all campaigns</p>
            </div>
          </div>
        </div>
      </GlowCard>

      {/* Detail Panel */}
      {selected && (
        <GlowCard glow="subtle" className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{selected.name}</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1">
                <Play className="w-3.5 h-3.5" aria-hidden="true" /> Run Now
              </Button>
              <Button variant="outline" size="sm" className="gap-1">
                <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Report
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><span className="text-muted-foreground">Target:</span> <span className="font-mono text-xs break-all">{selected.target}</span></div>
            <div><span className="text-muted-foreground">Schedule:</span> {selected.schedule}</div>
            <div><span className="text-muted-foreground">Last Run:</span> {selected.lastRunAt ? formatDate(selected.lastRunAt, true) : 'Never'}</div>
            <div><span className="text-muted-foreground">Findings:</span> {selected.findingCount}</div>
          </div>
        </GlowCard>
      )}
        </TabsContent>

        <TabsContent value="temporal" className="space-y-4">
          <TemporalTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--bg-tertiary)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-lg font-bold', accent && parseInt(value) > 0 && 'text-[var(--status-block)]')}>
        {value}
      </p>
    </div>
  )
}
