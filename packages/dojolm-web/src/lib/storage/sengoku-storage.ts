/**
 * File: sengoku-storage.ts
 * Purpose: In-memory storage for Sengoku campaigns and runs
 * Story: DAITENGUYAMA D4.4
 * Index:
 * - UIRunStatus type (line 15)
 * - UIRun interface (line 17)
 * - Campaign CRUD (line 35)
 * - Run CRUD (line 80)
 * - Seed data (line 140)
 */

import type {
  CampaignSummary,
  CampaignCreatePayload,
  CampaignStatus,
} from '@/lib/sengoku-types'

// ---------------------------------------------------------------------------
// UI-level run type (lightweight polling shape, separate from domain CampaignRun)
// ---------------------------------------------------------------------------

export type UIRunStatus = 'queued' | 'running' | 'completed' | 'failed'

export interface UIRun {
  readonly id: string
  readonly campaignId: string
  readonly status: UIRunStatus
  readonly progress: number
  readonly startedAt: string
  readonly completedAt: string | null
  readonly findingsCount: number
  readonly currentSkill: string | null
}

// ---------------------------------------------------------------------------
// In-memory stores
// ---------------------------------------------------------------------------

const campaigns = new Map<string, CampaignSummary>()
const uiRuns = new Map<string, UIRun>()

// ---------------------------------------------------------------------------
// Campaign operations
// ---------------------------------------------------------------------------

export function listCampaigns(): readonly CampaignSummary[] {
  return [...campaigns.values()].sort(
    (a, b) => (b.lastRunAt ?? '').localeCompare(a.lastRunAt ?? ''),
  )
}

export function getCampaign(id: string): CampaignSummary | undefined {
  return campaigns.get(id)
}

export function createCampaign(
  id: string,
  payload: CampaignCreatePayload,
): CampaignSummary {
  const campaign: CampaignSummary = {
    id,
    name: payload.name,
    target: payload.targetUrl,
    schedule: payload.schedule,
    status: 'draft',
    lastRunAt: null,
    findingCount: 0,
    regressionCount: 0,
    categories: [...payload.categories],
    skillGraph: payload.skillGraph ? [...payload.skillGraph] : [],
  }
  campaigns.set(id, campaign)
  return campaign
}

export function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
): CampaignSummary | undefined {
  const existing = campaigns.get(id)
  if (!existing) return undefined
  const updated: CampaignSummary = { ...existing, status }
  campaigns.set(id, updated)
  return updated
}

// ---------------------------------------------------------------------------
// Run operations
// ---------------------------------------------------------------------------

export function createRun(
  runId: string,
  campaignId: string,
): UIRun {
  const run: UIRun = {
    id: runId,
    campaignId,
    status: 'queued',
    progress: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    findingsCount: 0,
    currentSkill: null,
  }
  uiRuns.set(runId, run)
  return run
}

export function getRun(runId: string): UIRun | undefined {
  return uiRuns.get(runId)
}

export function advanceRun(runId: string): UIRun | undefined {
  const run = uiRuns.get(runId)
  if (!run) return undefined

  // Simulate progress advancement
  const newProgress = Math.min(run.progress + 15 + Math.floor(Math.random() * 10), 100)
  const isComplete = newProgress >= 100
  const newStatus: UIRunStatus = isComplete ? 'completed' : 'running'
  const newFindings = isComplete
    ? run.findingsCount + Math.floor(Math.random() * 3)
    : run.findingsCount + (Math.random() > 0.7 ? 1 : 0)

  const updated: UIRun = {
    ...run,
    status: newStatus,
    progress: newProgress,
    completedAt: isComplete ? new Date().toISOString() : null,
    findingsCount: newFindings,
    currentSkill: isComplete ? null : `skill-step-${Math.ceil(newProgress / 20)}`,
  }
  uiRuns.set(runId, updated)

  // Update campaign if completed
  if (isComplete) {
    const campaign = campaigns.get(run.campaignId)
    if (campaign) {
      campaigns.set(run.campaignId, {
        ...campaign,
        status: 'completed',
        lastRunAt: updated.completedAt,
        findingCount: campaign.findingCount + newFindings,
      })
    }
  }

  return updated
}

// ---------------------------------------------------------------------------
// Seed demo data
// ---------------------------------------------------------------------------

function seedIfEmpty(): void {
  if (campaigns.size > 0) return
  campaigns.set('camp-1', {
    id: 'camp-1',
    name: 'Production API Scan',
    target: 'https://api.example.com/v1/chat',
    schedule: 'Daily',
    status: 'completed',
    lastRunAt: '2026-03-12T10:00:00Z',
    findingCount: 12,
    regressionCount: 2,
    categories: ['prompt-injection', 'jailbreak'],
    skillGraph: [],
  })
  campaigns.set('camp-2', {
    id: 'camp-2',
    name: 'Staging Environment',
    target: 'https://staging.example.com/api',
    schedule: 'Weekly',
    status: 'active',
    lastRunAt: '2026-03-13T08:00:00Z',
    findingCount: 5,
    regressionCount: 0,
    categories: ['encoding', 'social-engineering'],
    skillGraph: [],
  })
  campaigns.set('camp-3', {
    id: 'camp-3',
    name: 'Local Model Test',
    target: 'http://localhost:11434/v1/chat',
    schedule: 'Hourly',
    status: 'draft',
    lastRunAt: null,
    findingCount: 0,
    regressionCount: 0,
    categories: ['prompt-injection'],
    skillGraph: [],
  })
}

seedIfEmpty()
