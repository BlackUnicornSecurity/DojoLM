// SPDX-License-Identifier: Apache-2.0
/**
 * H17.3: Sengoku Campaign Scheduler
 * State machine for campaign scheduling with concurrency limits.
 */

import type { Campaign, CampaignState } from './types.js';
import { MAX_CONCURRENT_CAMPAIGNS, VALID_FREQUENCIES } from './types.js';
import {
  syncLiberatorFeed,
  LIBERATOR_SOURCES,
  type AmaterasuTelemetryEvent,
  type IngestReport,
  type LiberatorSource,
} from '../attackdna/amaterasu-sync.js';
import {
  CancellationToken,
  killSwitchRegistry,
} from '../flags/kill-switch.js';

// ---------------------------------------------------------------------------
// Tracked Campaign Entry
// ---------------------------------------------------------------------------

interface TrackedCampaign {
  readonly campaignId: string;
  state: CampaignState;
  lastRunAt: string | null;
  nextRunAt: string | null;
}

// ---------------------------------------------------------------------------
// CampaignScheduler
// ---------------------------------------------------------------------------

export class CampaignScheduler {
  private readonly campaigns: Map<string, TrackedCampaign> = new Map();

  /** Schedule a campaign. Throws if at concurrent limit or invalid config. */
  schedule(campaign: Campaign): string {
    const active = this.getActiveCampaigns();
    if (active.length >= MAX_CONCURRENT_CAMPAIGNS) {
      throw new Error(
        `Cannot schedule: ${MAX_CONCURRENT_CAMPAIGNS} concurrent campaigns already running`,
      );
    }

    if (!VALID_FREQUENCIES.includes(campaign.schedule.frequency)) {
      throw new Error(`Invalid frequency: ${campaign.schedule.frequency}`);
    }

    const entry: TrackedCampaign = {
      campaignId: campaign.id,
      state: 'idle',
      lastRunAt: null,
      nextRunAt: this.getNextRunTime(campaign),
    };
    this.campaigns.set(campaign.id, entry);
    return campaign.id;
  }

  /** Cancel a scheduled campaign. */
  cancel(campaignId: string): void {
    const entry = this.campaigns.get(campaignId);
    if (!entry) throw new Error(`Campaign not found: ${campaignId}`);
    this.campaigns.delete(campaignId);
  }

  /** Transition campaign to running state. */
  start(campaignId: string): void {
    const entry = this.requireCampaign(campaignId);
    if (entry.state !== 'idle' && entry.state !== 'paused') {
      throw new Error(`Cannot start campaign in state: ${entry.state}`);
    }
    const running = [...this.campaigns.values()].filter(
      (c) => c.state === 'running',
    );
    if (running.length >= MAX_CONCURRENT_CAMPAIGNS) {
      throw new Error('Concurrent campaign limit reached');
    }
    entry.state = 'running';
  }

  /** Mark campaign as completed. */
  complete(campaignId: string): void {
    const entry = this.requireCampaign(campaignId);
    entry.state = 'completed';
    entry.lastRunAt = new Date().toISOString();
  }

  /** Mark campaign as failed. */
  fail(campaignId: string): void {
    const entry = this.requireCampaign(campaignId);
    entry.state = 'failed';
  }

  /** Pause a running campaign. */
  pause(campaignId: string): void {
    const entry = this.requireCampaign(campaignId);
    if (entry.state !== 'running') {
      throw new Error(`Cannot pause campaign in state: ${entry.state}`);
    }
    entry.state = 'paused';
  }

  /** Resume a paused campaign. */
  resume(campaignId: string): void {
    const entry = this.requireCampaign(campaignId);
    if (entry.state !== 'paused') {
      throw new Error(`Cannot resume campaign in state: ${entry.state}`);
    }
    entry.state = 'running';
  }

  /** Return all currently running campaigns (paused campaigns are NOT active). */
  getActiveCampaigns(): TrackedCampaign[] {
    return [...this.campaigns.values()].filter(
      (c) => c.state === 'running',
    );
  }

  /** Get the state of a specific campaign. */
  getState(campaignId: string): CampaignState {
    return this.requireCampaign(campaignId).state;
  }

  /** Get all tracked campaigns. */
  listAll(): TrackedCampaign[] {
    return [...this.campaigns.values()];
  }

  /** Calculate next run time based on schedule frequency. */
  getNextRunTime(campaign: Campaign): string {
    const now = Date.now();
    const freq = campaign.schedule.frequency;
    const intervals: Record<string, number> = {
      hourly: 3_600_000,
      daily: 86_400_000,
      weekly: 604_800_000,
    };
    const interval =
      freq === 'custom' && campaign.schedule.customIntervalMs
        ? campaign.schedule.customIntervalMs
        : (intervals[freq] ?? 86_400_000);
    return new Date(now + interval).toISOString();
  }

  /** Reset scheduler (for testing). */
  reset(): void {
    this.campaigns.clear();
  }

  private requireCampaign(id: string): TrackedCampaign {
    const entry = this.campaigns.get(id);
    if (!entry) throw new Error(`Campaign not found: ${id}`);
    return entry;
  }
}

// ---------------------------------------------------------------------------
// Amaterasu cron hook (Gap 2 — plan line 325, 330)
// ---------------------------------------------------------------------------

export interface AmaterasuCronOptions {
  readonly sources?: readonly LiberatorSource[];
  /** Per-source upstream commit SHA map (deploy pipeline resolves). */
  readonly upstreamCommits?: Readonly<Record<string, string | null>>;
  readonly baselineSize?: number | null;
  readonly onTelemetry?: (event: AmaterasuTelemetryEvent) => void;
  /** Override the registry used (for tests). */
  readonly registry?: typeof killSwitchRegistry;
}

/**
 * Run one pass of the Amaterasu community-feed ingest cron.
 *
 * Kill-switch integration (plan line 330 — "KILL_AMATERASU drains pending
 * batch"): a fresh `CancellationToken` is registered on every call. If
 * the signal fires during the run, `syncLiberatorFeed` aborts the current
 * source cooperatively AND this function exits its loop immediately —
 * no further sources get started.
 *
 * Returns the per-source ingest reports so the caller (cron runner) can
 * surface them in logs.
 */
export async function runAmaterasuCron(
  options: AmaterasuCronOptions = {},
): Promise<readonly IngestReport[]> {
  const registry = options.registry ?? killSwitchRegistry;
  const sources = options.sources ?? LIBERATOR_SOURCES;
  const token = new CancellationToken();
  const unregister = registry.registerToken('KILL_AMATERASU', token);

  const reports: IngestReport[] = [];
  try {
    for (const source of sources) {
      if (token.cancelled) break;
      const report = await syncLiberatorFeed(source, {
        cancellation: token,
        upstreamCommit: options.upstreamCommits?.[source] ?? null,
        baselineSize: options.baselineSize ?? null,
        onTelemetry: options.onTelemetry,
      });
      reports.push(report);
      if (report.status === 'aborted' || report.status === 'rate-limited') break;
    }
  } finally {
    unregister();
  }
  return reports;
}
