/**
 * Tests for S59: Arena Match Runner
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('./sandbox.js', () => ({
  createSandbox: vi.fn((agent: any, _config: any) => ({
    id: `sandbox-${agent.id}`,
    agent,
    isolatedState: new Map(),
    allowedTools: agent.capabilities.slice(),
    executionTimeout: 30_000,
    actionCount: 0,
    messageCount: 0,
    active: true,
  })),
  destroySandbox: vi.fn((sandbox: any) => {
    sandbox.active = false;
  }),
  executeInSandbox: vi.fn(async (_sandbox: any, action: () => any) => {
    try {
      const result = await action();
      return { result, error: null, durationMs: 1 };
    } catch {
      return { result: null, error: 'error', durationMs: 1 };
    }
  }),
}));

vi.mock('./environment.js', () => ({
  createEnvironment: vi.fn((_config: any) => ({
    id: 'env-1',
    resources: new Map(),
    tools: [],
    state: new Map(),
    messages: [],
  })),
  sendMessage: vi.fn(),
}));

vi.mock('./referee.js', () => ({
  createReferee: vi.fn((_rules?: any) => ({
    rules: [],
    decisions: [],
    violations: [],
  })),
  evaluateAction: vi.fn(),
  scoreOutcome: vi.fn((_ref: any, _events: any, agents: string[]) => {
    const scores = new Map<string, number>();
    agents.forEach((id, i) => scores.set(id, 10 - i));
    return scores;
  }),
}));

import {
  createMatch,
  recordEvent,
  executeRound,
  runMatch,
  getMatchStatus,
  pauseMatch,
  resumeMatch,
} from './match-runner.js';
import type { MatchConfig, AgentConfig, ArenaConfig } from './types.js';
import { DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS } from './types.js';

function makeAgent(id: string, role: 'attacker' | 'defender' = 'attacker'): AgentConfig {
  return {
    id,
    name: `Agent ${id}`,
    role,
    capabilities: ['scan'],
    resourceLimits: DEFAULT_AGENT_LIMITS,
  };
}

function makeConfig(agentCount = 2): MatchConfig {
  const agents = Array.from({ length: agentCount }, (_, i) => makeAgent(`a${i + 1}`));
  return {
    id: 'match-1',
    agents,
    maxRounds: 10,
    timeoutMs: 60_000,
    rules: [],
  };
}

describe('Arena Match Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // MR-001
  it('MR-001: createMatch returns a Match with pending status', () => {
    const config = makeConfig();
    const match = createMatch(config);

    expect(match.id).toBe('match-1');
    expect(match.status).toBe('pending');
    expect(match.currentRound).toBe(0);
    expect(match.events).toHaveLength(0);
  });

  // MR-002
  it('MR-002: createMatch creates sandboxes for each agent', () => {
    const config = makeConfig(3);
    const match = createMatch(config);

    expect(match.sandboxes.size).toBe(3);
    expect(match.sandboxes.has('a1')).toBe(true);
    expect(match.sandboxes.has('a2')).toBe(true);
    expect(match.sandboxes.has('a3')).toBe(true);
  });

  // MR-003
  it('MR-003: createMatch throws when too many agents', () => {
    const config = makeConfig(2);
    const smallArena: ArenaConfig = { ...DEFAULT_ARENA_CONFIG, maxAgents: 1 };

    expect(() => createMatch(config, smallArena)).toThrow('Too many agents');
  });

  // MR-004
  it('MR-004: recordEvent adds event to match and returns it', () => {
    const match = createMatch(makeConfig());
    const event = recordEvent(match, 'a1', 'test-action', 'a2', 'success', 'medium');

    expect(event.agent).toBe('a1');
    expect(event.action).toBe('test-action');
    expect(event.target).toBe('a2');
    expect(event.result).toBe('success');
    expect(event.severity).toBe('medium');
    expect(match.events).toHaveLength(1);
  });

  // MR-005
  it('MR-005: recordEvent defaults severity to low', () => {
    const match = createMatch(makeConfig());
    const event = recordEvent(match, 'a1', 'action', null, 'ok');

    expect(event.severity).toBe('low');
  });

  // MR-006
  it('MR-006: executeRound does nothing when match is not running', async () => {
    const match = createMatch(makeConfig());
    expect(match.status).toBe('pending');

    await executeRound(match);
    expect(match.currentRound).toBe(0);
  });

  // MR-007
  it('MR-007: executeRound increments currentRound when running', async () => {
    const match = createMatch(makeConfig());
    match.status = 'running';

    await executeRound(match);
    expect(match.currentRound).toBe(1);
  });

  // MR-008
  it('MR-008: runMatch sets status to running then completed', async () => {
    const match = createMatch(makeConfig());
    const result = await runMatch(match);

    expect(result.status).toBe('completed');
    expect(result.matchId).toBe('match-1');
  });

  // MR-009
  it('MR-009: runMatch returns scores and a winner', async () => {
    const match = createMatch(makeConfig());
    const result = await runMatch(match);

    expect(result.scores).toBeInstanceOf(Map);
    expect(result.winner).toBeTruthy();
    expect(result.rounds).toBeGreaterThan(0);
  });

  // MR-010
  it('MR-010: getMatchStatus returns correct status object', () => {
    const match = createMatch(makeConfig());
    const status = getMatchStatus(match);

    expect(status.round).toBe(0);
    expect(status.status).toBe('pending');
    expect(status.activeAgents).toHaveLength(2);
    expect(status.eventCount).toBe(0);
    expect(status.violationCount).toBe(0);
  });

  // MR-011
  it('MR-011: pauseMatch sets status to paused when running', () => {
    const match = createMatch(makeConfig());
    match.status = 'running';

    pauseMatch(match);
    expect(match.status).toBe('paused');
  });

  // MR-012
  it('MR-012: pauseMatch does nothing when not running', () => {
    const match = createMatch(makeConfig());
    pauseMatch(match);
    expect(match.status).toBe('pending');
  });

  // MR-013
  it('MR-013: resumeMatch resumes a paused match', async () => {
    const match = createMatch(makeConfig());
    match.status = 'paused';

    const result = await resumeMatch(match);
    expect(result.status).toBe('completed');
  });

  // MR-014
  it('MR-014: runMatch caps maxRounds at 100', async () => {
    const config = makeConfig();
    (config as any).maxRounds = 200;
    const match = createMatch(config);
    const result = await runMatch(match);

    // Should not exceed 100 rounds
    expect(result.rounds).toBeLessThanOrEqual(100);
  });
});
