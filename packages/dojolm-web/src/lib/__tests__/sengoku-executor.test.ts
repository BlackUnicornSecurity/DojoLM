/**
 * File: sengoku-executor.test.ts
 * Purpose: Unit tests for the Sengoku Campaign Skill Executor
 * Coverage: EXE-001 to EXE-015
 * Source: src/lib/sengoku-executor.ts
 *
 * Index:
 * - Linear campaign execution (line 100)
 * - Conditional branching — onPass (line 150)
 * - Conditional branching — onFail (line 200)
 * - Conditional branching — onCriticalFinding (line 250)
 * - Timeout / abort handling (line 310)
 * - Incremental persistence (line 370)
 * - Webhook firing on critical finding (line 430)
 * - Webhook SSRF guard (line 500)
 * - Cycle / visited guard (line 560)
 * - Error recovery per skill (line 610)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Campaign } from '../sengoku-types';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that load the module under test
// ---------------------------------------------------------------------------

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      rename: vi.fn(),
      readFile: vi.fn(() => Promise.resolve('{}')),
      readdir: vi.fn(() => Promise.resolve([])),
    },
  },
  promises: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    readFile: vi.fn(() => Promise.resolve('{}')),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

const mockScan = vi.fn();
const mockValidateSengokuWebhookUrl = vi.fn();

vi.mock('@dojolm/scanner', () => ({
  scan: (...args: unknown[]) => mockScan(...args),
}));

vi.mock('../sengoku-webhook', () => ({
  validateSengokuWebhookUrl: (...args: unknown[]) => mockValidateSengokuWebhookUrl(...args),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { executeCampaignRun } from '../sengoku-executor';
import fs from 'node:fs';

const fsMock = vi.mocked(fs.promises);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    targetUrl: 'https://api.example.com/v1/chat',
    authConfig: { type: 'bearer', token: 'test-token' },
    selectedSkillIds: ['pi-basic-injection'],
    schedule: null,
    webhookUrl: null,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    graph: {
      nodes: [
        { skillId: 'pi-basic-injection', order: 1, onPass: null, onFail: null, onCriticalFinding: [] },
      ],
      entryNodeId: 'pi-basic-injection',
      description: 'Test graph',
    },
    ...overrides,
  };
}

function noFindings() {
  return { findings: [], verdict: 'ALLOW' };
}

function withFindings(severity: 'high' | 'critical' = 'high') {
  return {
    findings: [{ id: 'f1', severity, description: `${severity} finding`, type: 'test' }],
    verdict: 'BLOCK',
  };
}

// ---------------------------------------------------------------------------
// EXE-001 to EXE-003: Linear campaign — no branching
// ---------------------------------------------------------------------------

describe('Linear campaign execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScan.mockReturnValue(noFindings());
  });

  it('EXE-001: executes a single-skill campaign and persists a completed run', async () => {
    const campaign = makeCampaign();
    await executeCampaignRun(campaign, 'run-1');

    // mkdir + two writeFile calls (incremental + final) + two rename calls
    expect(fsMock.mkdir).toHaveBeenCalled();
    expect(fsMock.writeFile).toHaveBeenCalled();
    expect(fsMock.rename).toHaveBeenCalled();

    // The final persist uses the run JSON — confirm status is completed
    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    expect(lastWriteArgs).toBeDefined();
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    expect(persisted.status).toBe('completed');
    expect(persisted.id).toBe('run-1');
    expect(persisted.campaignId).toBe('camp-1');
  });

  it('EXE-002: executes all skills in graph order for a multi-skill campaign', async () => {
    const campaign = makeCampaign({
      selectedSkillIds: ['skill-a', 'skill-b', 'skill-c'],
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: null, onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-b', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-c', order: 3, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Three-skill linear graph',
      },
    });

    await executeCampaignRun(campaign, 'run-2');

    // scan called once per skill
    expect(mockScan).toHaveBeenCalledTimes(3);

    // Final state has three skill results
    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    expect(persisted.skillResults).toHaveLength(3);
    expect(persisted.skillResults.map((r: { skillId: string }) => r.skillId)).toEqual([
      'skill-a',
      'skill-b',
      'skill-c',
    ]);
  });

  it('EXE-003: falls back to selectedSkillIds when campaign has no graph', async () => {
    const campaign: Campaign = {
      id: 'camp-no-graph',
      name: 'No Graph Campaign',
      targetUrl: 'https://api.example.com/v1/chat',
      authConfig: {},
      selectedSkillIds: ['skill-x', 'skill-y'],
      schedule: null,
      webhookUrl: null,
      status: 'active',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      // no graph field
    };

    await executeCampaignRun(campaign, 'run-3');

    expect(mockScan).toHaveBeenCalledTimes(2);
    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    expect(persisted.skillResults).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// EXE-004 to EXE-006: Conditional branching
// ---------------------------------------------------------------------------

describe('Conditional branching — onPass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-004: routes to onPass node when skill has no findings', async () => {
    mockScan.mockReturnValue(noFindings());

    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: 'skill-pass', onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-pass', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Pass branch graph',
      },
    });

    await executeCampaignRun(campaign, 'run-pass');

    // skill-a passes → skill-pass should also execute
    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const executedIds = persisted.skillResults.map((r: { skillId: string }) => r.skillId);
    expect(executedIds).toContain('skill-pass');
  });
});

describe('Conditional branching — onFail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-005: routes to onFail node when skill has non-critical findings', async () => {
    mockScan
      .mockReturnValueOnce(withFindings('high'))   // skill-a fails
      .mockReturnValue(noFindings());              // skill-fail passes

    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: null, onFail: 'skill-fail', onCriticalFinding: [] },
          { skillId: 'skill-fail', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Fail branch graph',
      },
    });

    await executeCampaignRun(campaign, 'run-fail');

    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const executedIds = persisted.skillResults.map((r: { skillId: string }) => r.skillId);
    expect(executedIds).toContain('skill-fail');
  });

  it('EXE-006: does NOT route to onPass when findings exist', async () => {
    mockScan.mockReturnValue(withFindings('high'));

    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: 'skill-pass', onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'No pass branch',
      },
    });

    await executeCampaignRun(campaign, 'run-no-pass');

    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const executedIds = persisted.skillResults.map((r: { skillId: string }) => r.skillId);
    expect(executedIds).not.toContain('skill-pass');
  });
});

describe('Conditional branching — onCriticalFinding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-007: inserts onCriticalFinding branch skills when critical finding detected', async () => {
    mockScan
      .mockReturnValueOnce(withFindings('critical'))   // triggers critical branch
      .mockReturnValue(noFindings());

    const campaign = makeCampaign({
      graph: {
        nodes: [
          {
            skillId: 'skill-a',
            order: 1,
            onPass: null,
            onFail: null,
            onCriticalFinding: ['skill-critical-followup'],
          },
          {
            skillId: 'skill-critical-followup',
            order: 2,
            onPass: null,
            onFail: null,
            onCriticalFinding: [],
          },
        ],
        entryNodeId: 'skill-a',
        description: 'Critical branch graph',
      },
    });

    await executeCampaignRun(campaign, 'run-critical');

    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const executedIds = persisted.skillResults.map((r: { skillId: string }) => r.skillId);
    expect(executedIds).toContain('skill-critical-followup');
  });
});

// ---------------------------------------------------------------------------
// EXE-008: Timeout / abort handling
// ---------------------------------------------------------------------------

describe('Timeout handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-008: campaign run status is cancelled when AbortController fires', async () => {
    // We cannot directly control the 30-minute timeout, but we can test the
    // aborted-signal path by simulating a campaign whose scan causes the abort
    // flag to already be set.  We do this by mocking AbortController.
    const originalAbortController = globalThis.AbortController;

    class MockAbortController {
      signal = { aborted: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      abort = vi.fn();
    }

    vi.stubGlobal('AbortController', MockAbortController);

    try {
      const campaign = makeCampaign();
      mockScan.mockReturnValue(noFindings());

      await executeCampaignRun(campaign, 'run-timeout');

      // Run should be persisted as cancelled (all skills skipped due to aborted signal)
      const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
      const persisted = JSON.parse(lastWriteArgs![1] as string);
      expect(persisted.status).toBe('cancelled');
    } finally {
      vi.stubGlobal('AbortController', originalAbortController);
    }
  });
});

// ---------------------------------------------------------------------------
// EXE-009 to EXE-010: Incremental persistence
// ---------------------------------------------------------------------------

describe('Incremental persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScan.mockReturnValue(noFindings());
  });

  it('EXE-009: writes a partial run record after each skill executes', async () => {
    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: null, onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-b', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Two-skill graph',
      },
    });

    await executeCampaignRun(campaign, 'run-incr');

    // Two skills + one final persist = 3 writeFile calls total
    // (each skill writes once, plus the final completion write)
    expect(fsMock.writeFile.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('EXE-010: intermediate persists have status running, final has completed', async () => {
    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: null, onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-b', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Two-skill graph',
      },
    });

    await executeCampaignRun(campaign, 'run-status-check');

    const allWrites = fsMock.writeFile.mock.calls;
    expect(allWrites.length).toBeGreaterThanOrEqual(3);

    // All intermediate writes should be 'running'
    for (const call of allWrites.slice(0, -1)) {
      const data = JSON.parse(call[1] as string);
      expect(data.status).toBe('running');
    }

    // Final write should be 'completed'
    const finalData = JSON.parse(allWrites.at(-1)![1] as string);
    expect(finalData.status).toBe('completed');
    expect(finalData.endedAt).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EXE-011 to EXE-013: Webhook firing
// ---------------------------------------------------------------------------

describe('Webhook firing on critical finding', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateSengokuWebhookUrl.mockImplementation(async (url: string) => ({
      valid: true,
      normalizedUrl: url,
    }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('EXE-011: fires webhook with critical_finding event when critical finding is detected', async () => {
    mockScan.mockReturnValue(withFindings('critical'));

    const campaign = makeCampaign({
      webhookUrl: 'https://hooks.example.com/notify',
    });

    await executeCampaignRun(campaign, 'run-webhook');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/notify',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );

    const callArgs = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.event).toBe('critical_finding');
    expect(body.campaignId).toBe('camp-1');
    expect(body.runId).toBe('run-webhook');
  });

  it('EXE-012: does not fire webhook when no critical findings are present', async () => {
    mockScan.mockReturnValue(withFindings('high'));

    const campaign = makeCampaign({
      webhookUrl: 'https://hooks.example.com/notify',
    });

    await executeCampaignRun(campaign, 'run-no-webhook');

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('EXE-013: does not fire webhook when webhookUrl is null', async () => {
    mockScan.mockReturnValue(withFindings('critical'));

    const campaign = makeCampaign({ webhookUrl: null });
    await executeCampaignRun(campaign, 'run-no-url');

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EXE-014: SSRF guard — private/localhost webhook URLs are blocked
// ---------------------------------------------------------------------------

describe('Webhook SSRF guard', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateSengokuWebhookUrl.mockImplementation(async (url: string) => ({
      valid: !(
        url.includes('localhost') ||
        url.includes('127.0.0.1') ||
        url.includes('192.168.1.100') ||
        url.startsWith('http://')
      ),
      normalizedUrl: url,
    }));
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });
    mockScan.mockReturnValue(withFindings('critical'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('EXE-014: does not fire webhook to localhost', async () => {
    const campaign = makeCampaign({ webhookUrl: 'https://localhost/notify' });
    await executeCampaignRun(campaign, 'run-ssrf-local');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('EXE-014b: does not fire webhook to 127.0.0.1', async () => {
    const campaign = makeCampaign({ webhookUrl: 'https://127.0.0.1/notify' });
    await executeCampaignRun(campaign, 'run-ssrf-loopback');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('EXE-014c: does not fire webhook to private RFC-1918 addresses', async () => {
    const campaign = makeCampaign({ webhookUrl: 'https://192.168.1.100/notify' });
    await executeCampaignRun(campaign, 'run-ssrf-private');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('EXE-014d: does not fire webhook when protocol is http (non-https)', async () => {
    const campaign = makeCampaign({ webhookUrl: 'http://hooks.example.com/notify' });
    await executeCampaignRun(campaign, 'run-ssrf-http');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EXE-015: Cycle guard — visited set prevents re-executing a skill
// ---------------------------------------------------------------------------

describe('Cycle prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockScan.mockReturnValue(noFindings());
  });

  it('EXE-015: does not re-execute a skill already in the visited set', async () => {
    // Graph: skill-a → onPass: skill-b, skill-b → onPass: skill-a (potential cycle)
    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-a', order: 1, onPass: 'skill-b', onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-b', order: 2, onPass: 'skill-a', onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-a',
        description: 'Cyclic graph',
      },
    });

    await executeCampaignRun(campaign, 'run-cycle');

    // Each skill should only appear once in results
    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const skillIds = persisted.skillResults.map((r: { skillId: string }) => r.skillId);
    const uniqueIds = new Set(skillIds);
    expect(skillIds.length).toBe(uniqueIds.size);
  });
});

// ---------------------------------------------------------------------------
// EXE-016: Error recovery — skill scan throws, run continues
// ---------------------------------------------------------------------------

describe('Per-skill error recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-016: records error status for a failing skill but completes the run', async () => {
    mockScan
      .mockImplementationOnce(() => { throw new Error('scan exploded'); })
      .mockReturnValue(noFindings());

    const campaign = makeCampaign({
      graph: {
        nodes: [
          { skillId: 'skill-explode', order: 1, onPass: null, onFail: null, onCriticalFinding: [] },
          { skillId: 'skill-ok', order: 2, onPass: null, onFail: null, onCriticalFinding: [] },
        ],
        entryNodeId: 'skill-explode',
        description: 'Error recovery graph',
      },
    });

    await executeCampaignRun(campaign, 'run-error');

    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);

    // Overall run should still complete
    expect(persisted.status).toBe('completed');

    const errorResult = persisted.skillResults.find(
      (r: { skillId: string }) => r.skillId === 'skill-explode',
    );
    expect(errorResult).toBeDefined();
    expect(errorResult.status).toBe('error');

    const okResult = persisted.skillResults.find(
      (r: { skillId: string }) => r.skillId === 'skill-ok',
    );
    expect(okResult).toBeDefined();
    expect(okResult.status).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// EXE-017: Findings summary accuracy
// ---------------------------------------------------------------------------

describe('Findings summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('EXE-017: correctly aggregates severity counts in findingsSummary', async () => {
    mockScan.mockReturnValue({
      findings: [
        { id: 'f1', severity: 'critical', description: 'c1', type: 'test' },
        { id: 'f2', severity: 'high', description: 'h1', type: 'test' },
        { id: 'f3', severity: 'medium', description: 'm1', type: 'test' },
        { id: 'f4', severity: 'low', description: 'l1', type: 'test' },
        { id: 'f5', severity: 'info', description: 'i1', type: 'test' },
      ],
      verdict: 'BLOCK',
    });

    const campaign = makeCampaign();
    await executeCampaignRun(campaign, 'run-summary');

    const lastWriteArgs = fsMock.writeFile.mock.calls.at(-1);
    const persisted = JSON.parse(lastWriteArgs![1] as string);
    const summary = persisted.findingsSummary;

    expect(summary.total).toBe(5);
    expect(summary.critical).toBe(1);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
    expect(summary.info).toBe(1);
  });
});
