/**
 * File: SengokuDashboard.tsx
 * Purpose: Sengoku — Continuous Red Teaming module dashboard
 * Story: HAKONE H17.7, DAITENGUYAMA D4.4
 * Index:
 * - API fetch + polling (line ~40)
 * - Campaign list with status indicators (line ~110)
 * - Campaign detail panel with Run Now (line ~200)
 * - New campaign dialog integration (line ~85)
 * - Run progress indicator (line ~170)
 */

'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Swords, Plus, Play, Pause, RefreshCw, FileText,
  AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, Timer, Loader2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { GlowCard } from '@/components/ui/GlowCard'
import { Button } from '@/components/ui/button'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { cn, formatDate } from '@/lib/utils'
import { TemporalTab } from './TemporalTab'
import { SengokuCampaignBuilder } from './SengokuCampaignBuilder'
import { CampaignGraphBuilder } from './CampaignGraphBuilder'
import { OrchestratorBuilder, type OrchestratorLaunchResult } from './OrchestratorBuilder'
import { OrchestratorVisualization, type OrchestratorState, type OrchestratorTurn } from './OrchestratorVisualization'
import { getToolByName } from '@/lib/sensei/tool-definitions'
import type { Campaign, CampaignStatus, GraphSkillNode } from '@/lib/sengoku-types'

type SengokuTab = 'campaigns' | 'temporal' | 'workbench'

interface DashboardModel {
  readonly id: string
  readonly name: string
}

const SENSEI_TOOL_NAMES = ['run_orchestrator', 'sensei_plan', 'list_campaigns', 'create_campaign'] as const

function isDefined<T>(value: T | null | undefined): value is T {
  return value != null
}

/** UI display shape — extends Campaign with computed display fields */
interface CampaignDisplay {
  readonly id: string
  readonly name: string
  readonly target: string
  readonly schedule: string
  readonly status: CampaignStatus
  readonly lastRunAt: string | null
  readonly findingCount: number
  readonly regressionCount: number
}

/** Map API Campaign to display shape */
function toDisplay(c: Campaign): CampaignDisplay {
  return {
    id: c.id,
    name: c.name,
    target: c.targetUrl,
    schedule: c.schedule ?? 'Manual',
    status: c.status,
    lastRunAt: c.updatedAt !== c.createdAt ? c.updatedAt : null,
    findingCount: 0,
    regressionCount: 0,
  }
}

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<CampaignStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  draft: { icon: Clock, color: 'text-muted-foreground', label: 'Draft' },
  active: { icon: Play, color: 'text-[var(--status-allow)]', label: 'Active' },
  completed: { icon: CheckCircle2, color: 'text-[var(--status-allow)]', label: 'Completed' },
  paused: { icon: Pause, color: 'text-[var(--severity-medium)]', label: 'Paused' },
  archived: { icon: XCircle, color: 'text-muted-foreground', label: 'Archived' },
}

// ---------------------------------------------------------------------------
// Run progress type (from polling)
// ---------------------------------------------------------------------------

interface RunProgress {
  readonly runId: string
  readonly campaignId: string
  readonly status: 'queued' | 'running' | 'completed' | 'failed'
  readonly progress: number
  readonly currentSkill: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SengokuDashboard() {
  const [campaigns, setCampaigns] = useState<readonly CampaignDisplay[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SengokuTab>('campaigns')
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null)
  const [runLoading, setRunLoading] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<readonly DashboardModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [graphNodes, setGraphNodes] = useState<readonly GraphSkillNode[]>([])
  const [latestLaunch, setLatestLaunch] = useState<OrchestratorLaunchResult | null>(null)
  const [orchestratorState, setOrchestratorState] = useState<OrchestratorState | null>(null)
  const [orchestratorTurns, setOrchestratorTurns] = useState<readonly OrchestratorTurn[]>([])
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selected = campaigns.find((c) => c.id === selectedId)
  const senseiTools = useMemo(
    () => SENSEI_TOOL_NAMES.map((name) => getToolByName(name)).filter(isDefined),
    [],
  )

  // -----------------------------------------------------------------------
  // Fetch campaigns
  // -----------------------------------------------------------------------

  const fetchCampaigns = useCallback(async () => {
    try {
      if (!(await canAccessProtectedApi())) {
        setAuthRequired(true)
        setCampaigns([])
        setSelectedId(null)
        return
      }

      setAuthRequired(false)
      const res = await fetchWithAuth('/api/sengoku/campaigns')
      if (!res.ok) {
        if (res.status === 401) {
          setAuthRequired(true)
          setCampaigns([])
          setSelectedId(null)
        }
        return
      }
      const data = await res.json()
      const raw: readonly Campaign[] = data.campaigns ?? []
      const list = raw.map(toDisplay)
      setCampaigns(list)
      // Auto-select first if nothing selected
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id)
      }
    } catch {
      // Silently fail — user sees empty state
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    let cancelled = false

    if (activeTab !== 'workbench' || availableModels.length > 0) {
      return () => {
        cancelled = true
      }
    }

    setModelsLoading(true)
    fetchWithAuth('/api/llm/models?enabled=true')
      .then((res) => res.json())
      .then((data: DashboardModel[] | { models?: DashboardModel[] }) => {
        if (cancelled) return
        const models = Array.isArray(data) ? data : (data.models ?? [])
        setAvailableModels(models.map((model) => ({ id: model.id, name: model.name })))
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableModels([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModelsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeTab, availableModels.length])

  // -----------------------------------------------------------------------
  // Run Now handler
  // -----------------------------------------------------------------------

  const handleRunNow = useCallback(async (campaignId: string) => {
    setRunLoading(campaignId)
    try {
      const res = await fetchWithAuth(`/api/sengoku/campaigns/${encodeURIComponent(campaignId)}/run`, {
        method: 'POST',
      })
      if (!res.ok) return
      const data = await res.json()
      const runId = data.runId as string

      // Start polling
      setRunProgress({ runId, campaignId, status: 'queued', progress: 0, currentSkill: null })

      // Clear any existing poll
      if (pollRef.current) clearInterval(pollRef.current)

      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetchWithAuth(`/api/sengoku/runs/${encodeURIComponent(runId)}`)
          if (!pollRes.ok) return
          const pollData = await pollRes.json()
          const run = pollData.run as {
            id: string
            campaignId: string
            status: 'queued' | 'running' | 'completed' | 'failed'
            progress: number
            currentSkill: string | null
          }

          setRunProgress({
            runId: run.id,
            campaignId: run.campaignId,
            status: run.status,
            progress: run.progress,
            currentSkill: run.currentSkill,
          })

          // Stop polling when complete or failed
          if (run.status === 'completed' || run.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current)
            pollRef.current = null
            // Refresh campaign list to pick up updated counts
            await fetchCampaigns()
          }
        } catch {
          // polling error — will retry on next interval
        }
      }, 3000)
    } catch {
      // run trigger error
    } finally {
      setRunLoading(null)
    }
  }, [fetchCampaigns])

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // -----------------------------------------------------------------------
  // Campaign created callback
  // -----------------------------------------------------------------------

  const handleCampaignCreated = useCallback(() => {
    setShowBuilder(false)
    fetchCampaigns()
  }, [fetchCampaigns])

  const handleOrchestratorLaunch = useCallback((launch: OrchestratorLaunchResult) => {
    const shouldBranch = launch.type === 'tap' || launch.type === 'mad-max' || launch.type === 'sensei-adaptive'
    const branchCount = shouldBranch
      ? Math.max(launch.config.maxBranches ?? graphNodes.length, 1)
      : 1

    setLatestLaunch(launch)
    setSelectedTurnIndex(null)
    setOrchestratorTurns([])
    setOrchestratorState({
      configType: launch.type,
      status: 'running',
      currentTurn: 0,
      totalTurns: launch.config.maxTurns ?? 20,
      branches: Array.from({ length: branchCount }, (_value, index) => ({
        id: graphNodes[index]?.skillId ?? (index === 0 ? 'main' : `branch-${index + 1}`),
        parentId: index === 0 ? null : 'main',
        depth: index === 0 ? 0 : 1,
        turns: [],
        currentScore: 0,
        pruned: false,
        prunedReason: null,
      })),
      bestScore: 0,
      bestTurnIndex: null,
      totalTokensUsed: 0,
      totalCostUsd: 0,
      startedAt: new Date().toISOString(),
    })
  }, [graphNodes])

  const TEMPORAL_PLAN_COUNT = 20

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Sengoku"
        subtitle="Continuous Red Teaming"
        icon={Swords}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowBuilder(true)}
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            New Campaign
          </Button>
        }
      />

      {/* Campaign Builder Dialog */}
      {showBuilder && (
        <SengokuCampaignBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={handleCampaignCreated}
        />
      )}

      {/* Run Progress Banner */}
      {runProgress && runProgress.status !== 'completed' && runProgress.status !== 'failed' && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--bu-electric)]/30 bg-[var(--bu-electric)]/5 px-4 py-3">
          <Loader2 className="w-4 h-4 text-[var(--bu-electric)] animate-spin motion-reduce:animate-none shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              Run in progress {runProgress.currentSkill ? `— ${runProgress.currentSkill}` : ''}
            </p>
            <div className="mt-1 w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--bu-electric)] transition-all duration-500"
                style={{ width: `${runProgress.progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-mono text-[var(--bu-electric)] shrink-0">{runProgress.progress}%</span>
        </div>
      )}

      {/* Combined Stats Row */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Campaigns" value={String(campaigns.length)} />
          <StatCard label="Temporal Plans" value={String(TEMPORAL_PLAN_COUNT)} />
          <StatCard label="Active" value={String(campaigns.filter((c) => c.status === 'active').length)} />
          <StatCard label="Total Findings" value={String(campaigns.reduce((s, c) => s + c.findingCount, 0))} />
          <StatCard label="Regressions" value={String(campaigns.reduce((s, c) => s + c.regressionCount, 0))} accent />
        </div>
      )}

      {/* Tab System */}
      <Tabs value={activeTab} onValueChange={(v) => {
        if (v === 'campaigns' || v === 'temporal' || v === 'workbench') setActiveTab(v)
      }} className="space-y-4">
        <TabsList className="flex w-full h-auto gap-1 bg-muted/50 p-1 rounded-full overflow-x-auto scrollbar-hide">
          <TabsTrigger value="campaigns" className="gap-2 min-h-[44px] flex-shrink-0 px-3">
            <Swords className="h-4 w-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="workbench" className="gap-2 min-h-[44px] flex-shrink-0 px-3">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline">Workbench</span>
          </TabsTrigger>
          <TabsTrigger value="temporal" className="gap-2 min-h-[44px] flex-shrink-0 px-3">
            <Timer className="h-4 w-4" />
            <span className="hidden sm:inline">Temporal</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
              <span className="ml-2 text-sm text-muted-foreground">Loading campaigns...</span>
            </div>
          )}

      {/* Campaign List */}
          {!loading && authRequired ? (
            <EmptyState
              icon={Swords}
              title="Authentication required"
              description="Sign in or provide a valid API key to load Sengoku campaigns."
            />
          ) : !loading && campaigns.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="No campaigns yet"
              description="Create your first continuous red teaming campaign to start automated security testing."
              action={{ label: 'Create Campaign', onClick: () => setShowBuilder(true) }}
            />
          ) : !loading && (
            <div className="space-y-2">
              {campaigns.map((campaign) => {
                const status = STATUS_CONFIG[campaign.status] ?? STATUS_CONFIG.draft
                const StatusIcon = status.icon
                const isActiveRun = runProgress?.campaignId === campaign.id
                  && runProgress.status !== 'completed'
                  && runProgress.status !== 'failed'
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
                        {isActiveRun && (
                          <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--status-allow)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-allow)] animate-pulse motion-reduce:animate-none" aria-hidden="true" />
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-12 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                                <span
                                  className="block h-full rounded-full bg-[var(--status-allow)] transition-all duration-500"
                                  style={{ width: `${runProgress?.progress ?? 0}%` }}
                                />
                              </span>
                              {runProgress?.progress ?? 0}%
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
                onClick={() => setShowBuilder(true)}
              >
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Plus className="w-5 h-5" aria-hidden="true" />
                  <span className="text-sm font-medium">Create new campaign</span>
                </div>
              </button>
            </div>
          )}

          {/* Campaign Summary */}
          {!loading && campaigns.length > 0 && (
            <GlowCard glow="subtle" className="p-4">
              <h4 className="text-sm font-semibold mb-3">Campaign Overview</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <Clock className="w-5 h-5 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Scheduled Run</p>
                    <p className="font-medium">
                      {campaigns.find((c) => c.status === 'active')?.name ?? campaigns[0]?.name ?? 'None'} — in 4h 12m
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <RefreshCw className="w-5 h-5 text-[var(--status-allow)] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Completed</p>
                    <p className="font-medium">
                      {(() => {
                        const last = campaigns.find((c) => c.lastRunAt)
                        return last ? `${last.name} — ${formatDate(last.lastRunAt!)}` : 'No runs yet'
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-tertiary)]">
                  <AlertTriangle className="w-5 h-5 text-[var(--severity-medium)] shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Unresolved Regressions</p>
                    <p className="font-medium">{campaigns.reduce((s, c) => s + c.regressionCount, 0)} across all campaigns</p>
                  </div>
                </div>
              </div>
            </GlowCard>
          )}

          {/* Detail Panel */}
          {selected && (
            <GlowCard glow="subtle" className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{selected.name}</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    disabled={selected?.status === 'active' || runLoading === selected?.id}
                    onClick={() => handleRunNow(selected.id)}
                  >
                    {runLoading === selected.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    Run Now
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

        <TabsContent value="workbench" className="space-y-4">
          <GlowCard glow="subtle" className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Orchestrator Workbench</h3>
                <p className="text-sm text-muted-foreground">
                  Launch multi-model attack runs, shape campaign flows visually, and keep Sengoku&apos;s advanced Sensei tools within reach.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium">
                  {availableModels.length} models ready
                </span>
                <span className="rounded-full bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium">
                  {graphNodes.length} graph nodes
                </span>
                {latestLaunch && (
                  <span className="rounded-full bg-[var(--bu-electric)]/10 px-3 py-1 text-xs font-medium text-[var(--bu-electric)]">
                    Latest launch: {latestLaunch.type}
                  </span>
                )}
              </div>
            </div>
          </GlowCard>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="space-y-4">
              <GlowCard glow="subtle" className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold">Launch Orchestrator</h4>
                    <p className="text-xs text-muted-foreground">
                      Use PAIR, Crescendo, TAP, MAD-MAX, or Sensei Adaptive directly from Sengoku.
                    </p>
                  </div>
                  {modelsLoading && (
                    <span className="text-xs text-muted-foreground">Loading models...</span>
                  )}
                </div>

                {availableModels.length === 0 && !modelsLoading && (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    Enable at least one dashboard model in the LLM module to activate orchestrated launches.
                  </div>
                )}

                <OrchestratorBuilder
                  availableModels={availableModels}
                  onLaunch={handleOrchestratorLaunch}
                  isRunning={orchestratorState?.status === 'running'}
                />
              </GlowCard>

              <CampaignGraphBuilder initialNodes={graphNodes} onChange={setGraphNodes} />
            </div>

            <div className="space-y-4">
              <GlowCard glow="subtle" className="p-4">
                <h4 className="text-sm font-semibold">Sensei Advanced Tools</h4>
                <p className="mt-1 text-xs text-muted-foreground">
                  These assistant tools are now aligned with Sengoku&apos;s visible workbench.
                </p>
                <div className="mt-3 space-y-2">
                  {senseiTools.map((tool) => (
                    <div key={tool.name} className="rounded-lg border bg-[var(--bg-tertiary)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <code className="text-xs font-semibold">{tool.name}</code>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{tool.method}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                    </div>
                  ))}
                </div>
              </GlowCard>

              {latestLaunch && (
                <GlowCard glow="subtle" className="p-4">
                  <h4 className="text-sm font-semibold">Latest Launch</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{latestLaunch.message}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Run ID:</span> <span className="font-mono text-xs break-all">{latestLaunch.runId}</span></div>
                    <div><span className="text-muted-foreground">Type:</span> {latestLaunch.type}</div>
                    <div><span className="text-muted-foreground">Attacker:</span> <span className="font-mono text-xs">{latestLaunch.config.attackerModelId}</span></div>
                    <div><span className="text-muted-foreground">Judge:</span> <span className="font-mono text-xs">{latestLaunch.config.judgeModelId}</span></div>
                  </div>
                </GlowCard>
              )}

              <OrchestratorVisualization
                state={orchestratorState}
                allTurns={orchestratorTurns}
                selectedTurnIndex={selectedTurnIndex}
                onSelectTurn={setSelectedTurnIndex}
              />
            </div>
          </div>
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
