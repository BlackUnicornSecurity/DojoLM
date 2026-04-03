/**
 * File: sengoku-storage.test.ts
 * Purpose: Tests for in-memory Sengoku campaign/run storage
 * Source: src/lib/storage/sengoku-storage.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// The module uses in-memory Maps that persist across imports.
// We resetModules before each test to get a fresh store with seed data.
let listCampaigns: typeof import('../storage/sengoku-storage').listCampaigns;
let getCampaign: typeof import('../storage/sengoku-storage').getCampaign;
let createCampaign: typeof import('../storage/sengoku-storage').createCampaign;
let updateCampaignStatus: typeof import('../storage/sengoku-storage').updateCampaignStatus;
let createRun: typeof import('../storage/sengoku-storage').createRun;
let getRun: typeof import('../storage/sengoku-storage').getRun;
let advanceRun: typeof import('../storage/sengoku-storage').advanceRun;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../storage/sengoku-storage');
  listCampaigns = mod.listCampaigns;
  getCampaign = mod.getCampaign;
  createCampaign = mod.createCampaign;
  updateCampaignStatus = mod.updateCampaignStatus;
  createRun = mod.createRun;
  getRun = mod.getRun;
  advanceRun = mod.advanceRun;
});

describe('sengoku-storage', () => {
  // -----------------------------------------------------------------------
  // Seed data (module seeds 3 campaigns on first load)
  // -----------------------------------------------------------------------

  describe('seed data', () => {
    it('seeds 3 demo campaigns on first load', () => {
      const campaigns = listCampaigns();
      expect(campaigns.length).toBe(3);
    });

    it('seed campaigns have expected IDs', () => {
      expect(getCampaign('camp-1')).toBeDefined();
      expect(getCampaign('camp-2')).toBeDefined();
      expect(getCampaign('camp-3')).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // listCampaigns
  // -----------------------------------------------------------------------

  describe('listCampaigns', () => {
    it('returns an array', () => {
      const campaigns = listCampaigns();
      expect(Array.isArray(campaigns)).toBe(true);
    });

    it('returns campaigns sorted by lastRunAt descending', () => {
      const campaigns = listCampaigns();
      // camp-2 has latest lastRunAt (2026-03-13), camp-1 is 2026-03-12, camp-3 is null
      expect(campaigns[0].id).toBe('camp-2');
      expect(campaigns[1].id).toBe('camp-1');
      expect(campaigns[2].id).toBe('camp-3');
    });
  });

  // -----------------------------------------------------------------------
  // createCampaign
  // -----------------------------------------------------------------------

  describe('createCampaign', () => {
    it('creates a campaign with the given id and payload', () => {
      const campaign = createCampaign('test-new', {
        name: 'New Campaign',
        targetUrl: 'https://example.com/api',
        schedule: 'Daily',
        categories: ['prompt-injection', 'jailbreak'],
      });
      expect(campaign.id).toBe('test-new');
      expect(campaign.name).toBe('New Campaign');
      expect(campaign.target).toBe('https://example.com/api');
      expect(campaign.schedule).toBe('Daily');
      expect(campaign.status).toBe('draft');
      expect(campaign.findingCount).toBe(0);
      expect(campaign.regressionCount).toBe(0);
      expect(campaign.categories).toEqual(['prompt-injection', 'jailbreak']);
    });

    it('defaults skillGraph to empty array when not provided', () => {
      const campaign = createCampaign('test-no-graph', {
        name: 'No Graph',
        targetUrl: 'https://example.com',
        schedule: null,
        categories: [],
      });
      expect(campaign.skillGraph).toEqual([]);
    });

    it('preserves skillGraph when provided', () => {
      const campaign = createCampaign('test-graph', {
        name: 'With Graph',
        targetUrl: 'https://example.com',
        schedule: null,
        categories: [],
        skillGraph: ['skill-a', 'skill-b'],
      });
      expect(campaign.skillGraph).toEqual(['skill-a', 'skill-b']);
    });

    it('is retrievable after creation', () => {
      createCampaign('test-retrieve', {
        name: 'Retrievable',
        targetUrl: 'https://example.com',
        schedule: null,
        categories: [],
      });
      const result = getCampaign('test-retrieve');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Retrievable');
    });

    it('appears in listCampaigns after creation', () => {
      createCampaign('test-listed', {
        name: 'Listed',
        targetUrl: 'https://example.com',
        schedule: null,
        categories: [],
      });
      const all = listCampaigns();
      const found = all.find((c) => c.id === 'test-listed');
      expect(found).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // getCampaign
  // -----------------------------------------------------------------------

  describe('getCampaign', () => {
    it('returns undefined for unknown id', () => {
      expect(getCampaign('nonexistent-xyz')).toBeUndefined();
    });

    it('returns the correct campaign by id', () => {
      const camp = getCampaign('camp-1');
      expect(camp).toBeDefined();
      expect(camp!.name).toBe('Production API Scan');
    });
  });

  // -----------------------------------------------------------------------
  // updateCampaignStatus
  // -----------------------------------------------------------------------

  describe('updateCampaignStatus', () => {
    it('updates the status of an existing campaign', () => {
      const updated = updateCampaignStatus('camp-3', 'active');
      expect(updated).toBeDefined();
      expect(updated!.status).toBe('active');
    });

    it('returns the full campaign with other fields preserved', () => {
      const updated = updateCampaignStatus('camp-1', 'paused');
      expect(updated!.name).toBe('Production API Scan');
      expect(updated!.status).toBe('paused');
    });

    it('returns undefined for unknown campaign', () => {
      expect(updateCampaignStatus('nonexistent', 'running' as never)).toBeUndefined();
    });

    it('persists the status change', () => {
      updateCampaignStatus('camp-2', 'archived');
      const camp = getCampaign('camp-2');
      expect(camp!.status).toBe('archived');
    });
  });

  // -----------------------------------------------------------------------
  // createRun
  // -----------------------------------------------------------------------

  describe('createRun', () => {
    it('creates a run with correct initial state', () => {
      const run = createRun('run-1', 'camp-1');
      expect(run.id).toBe('run-1');
      expect(run.campaignId).toBe('camp-1');
      expect(run.status).toBe('queued');
      expect(run.progress).toBe(0);
      expect(run.completedAt).toBeNull();
      expect(run.findingsCount).toBe(0);
      expect(run.currentSkill).toBeNull();
    });

    it('sets a valid ISO timestamp for startedAt', () => {
      const run = createRun('run-ts', 'camp-1');
      expect(() => new Date(run.startedAt)).not.toThrow();
      expect(new Date(run.startedAt).toISOString()).toBe(run.startedAt);
    });
  });

  // -----------------------------------------------------------------------
  // getRun
  // -----------------------------------------------------------------------

  describe('getRun', () => {
    it('returns undefined for unknown run', () => {
      expect(getRun('nonexistent-run')).toBeUndefined();
    });

    it('returns the run after creation', () => {
      createRun('run-get', 'camp-1');
      const run = getRun('run-get');
      expect(run).toBeDefined();
      expect(run!.id).toBe('run-get');
    });
  });

  // -----------------------------------------------------------------------
  // advanceRun
  // -----------------------------------------------------------------------

  describe('advanceRun', () => {
    it('returns undefined for unknown run', () => {
      expect(advanceRun('nonexistent-run')).toBeUndefined();
    });

    it('advances progress from 0', () => {
      createRun('run-advance', 'camp-1');
      const advanced = advanceRun('run-advance');
      expect(advanced).toBeDefined();
      expect(advanced!.progress).toBeGreaterThan(0);
      expect(advanced!.status).toBe('running');
    });

    it('sets currentSkill when running', () => {
      createRun('run-skill', 'camp-1');
      const advanced = advanceRun('run-skill');
      if (advanced!.status === 'running') {
        expect(advanced!.currentSkill).toBeTruthy();
        expect(advanced!.currentSkill).toMatch(/^skill-step-/);
      }
    });

    it('eventually reaches completed status', () => {
      createRun('run-complete', 'camp-1');
      let run = getRun('run-complete')!;
      let iterations = 0;
      while (run.status !== 'completed' && iterations < 50) {
        const result = advanceRun('run-complete');
        if (result) run = result;
        iterations++;
      }
      expect(run.status).toBe('completed');
      expect(run.progress).toBe(100);
      expect(run.completedAt).not.toBeNull();
      expect(run.currentSkill).toBeNull();
    });

    it('updates campaign status and findingCount when run completes', () => {
      createRun('run-camp-update', 'camp-1');
      const originalFindingCount = getCampaign('camp-1')!.findingCount;

      let run = getRun('run-camp-update')!;
      let iterations = 0;
      while (run.status !== 'completed' && iterations < 50) {
        const result = advanceRun('run-camp-update');
        if (result) run = result;
        iterations++;
      }

      const campaign = getCampaign('camp-1')!;
      expect(campaign.status).toBe('completed');
      expect(campaign.findingCount).toBeGreaterThanOrEqual(originalFindingCount);
      expect(campaign.lastRunAt).toBe(run.completedAt);
    });

    it('progress never exceeds 100', () => {
      createRun('run-cap', 'camp-1');
      for (let i = 0; i < 50; i++) {
        advanceRun('run-cap');
      }
      const run = getRun('run-cap')!;
      expect(run.progress).toBeLessThanOrEqual(100);
    });
  });
});
