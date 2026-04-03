import { describe, it, expect, beforeEach } from 'vitest';
import { CampaignScheduler } from './scheduler.js';
import type { Campaign } from './types.js';

function makeCampaign(id: string = 'camp-1'): Campaign {
  return {
    id,
    name: 'Test Campaign',
    targetUrl: 'https://example.com/api',
    targetAuth: { type: 'bearer', credentials: { token: 'xxx' } },
    attackCategories: ['INJECTION'],
    schedule: { frequency: 'daily', customIntervalMs: null, maxRuns: null },
    maxConcurrentRequests: 5,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

describe('CampaignScheduler', () => {
  let scheduler: CampaignScheduler;

  beforeEach(() => {
    scheduler = new CampaignScheduler();
  });

  it('schedules a campaign and retrieves its state', () => {
    scheduler.schedule(makeCampaign());
    expect(scheduler.getState('camp-1')).toBe('idle');
  });

  it('transitions through start -> complete lifecycle', () => {
    scheduler.schedule(makeCampaign());
    scheduler.start('camp-1');
    expect(scheduler.getState('camp-1')).toBe('running');
    scheduler.complete('camp-1');
    expect(scheduler.getState('camp-1')).toBe('completed');
  });

  it('supports pause and resume', () => {
    scheduler.schedule(makeCampaign());
    scheduler.start('camp-1');
    scheduler.pause('camp-1');
    expect(scheduler.getState('camp-1')).toBe('paused');
    scheduler.resume('camp-1');
    expect(scheduler.getState('camp-1')).toBe('running');
  });

  it('throws when exceeding concurrent campaign limit', () => {
    scheduler.schedule(makeCampaign('c1'));
    scheduler.schedule(makeCampaign('c2'));
    scheduler.schedule(makeCampaign('c3'));
    scheduler.start('c1');
    scheduler.start('c2');
    scheduler.start('c3');
    // 3 running, schedule checks active count and rejects
    expect(() => scheduler.schedule(makeCampaign('c4'))).toThrow(/concurrent/i);
  });

  it('throws for invalid frequency', () => {
    const bad = makeCampaign();
    (bad as { schedule: { frequency: string } }).schedule = {
      frequency: 'invalid' as never,
      customIntervalMs: null,
      maxRuns: null,
    };
    expect(() => scheduler.schedule(bad)).toThrow(/Invalid frequency/);
  });

  it('cancels a campaign', () => {
    scheduler.schedule(makeCampaign());
    scheduler.cancel('camp-1');
    expect(() => scheduler.getState('camp-1')).toThrow(/not found/i);
  });
});
