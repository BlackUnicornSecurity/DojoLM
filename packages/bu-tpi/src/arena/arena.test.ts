/**
 * S59-S60: Battle Arena Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSandbox,
  executeInSandbox,
  destroySandbox,
  isWithinLimits,
  createEnvironment,
  addResource,
  getResource,
  sendMessage,
  getMessages,
  resetEnvironment,
  createReferee,
  evaluateAction,
  scoreOutcome,
  DEFAULT_RULES,
  createMatch,
  runMatch,
  getMatchStatus,
  // Game Modes
  ALL_GAME_MODES,
  getGameMode,
  createGameModeConfig,
  createObserver,
  observeEvent,
  takeSnapshot,
  getReplay,
  clearLeaderboard,
  DEFAULT_ARENA_CONFIG,
  DEFAULT_AGENT_LIMITS,
} from './index.js';
import type { AgentConfig, MatchEvent } from './types.js';

const agent1: AgentConfig = {
  id: 'agent-1', name: 'Attacker', role: 'attacker',
  capabilities: ['scan', 'probe'], resourceLimits: DEFAULT_AGENT_LIMITS,
};
const agent2: AgentConfig = {
  id: 'agent-2', name: 'Defender', role: 'defender',
  capabilities: ['defend', 'monitor'], resourceLimits: DEFAULT_AGENT_LIMITS,
};

describe('Agent Sandbox', () => {
  it('should create an isolated sandbox', () => {
    const sandbox = createSandbox(agent1);
    expect(sandbox.active).toBe(true);
    expect(sandbox.actionCount).toBe(0);
    expect(sandbox.agent.id).toBe('agent-1');
  });

  it('should execute actions within sandbox', async () => {
    const sandbox = createSandbox(agent1);
    const result = await executeInSandbox(sandbox, () => 'hello');
    expect(result.result).toBe('hello');
    expect(result.error).toBeNull();
    expect(sandbox.actionCount).toBe(1);
  });

  it('should reject execution in inactive sandbox', async () => {
    const sandbox = createSandbox(agent1);
    destroySandbox(sandbox);
    const result = await executeInSandbox(sandbox, () => 'hello');
    expect(result.error).toBe('Sandbox is inactive');
  });

  it('should check resource limits', () => {
    const sandbox = createSandbox(agent1);
    const check = isWithinLimits(sandbox);
    expect(check.withinLimits).toBe(true);
  });
});

describe('Shared Environment', () => {
  it('should create environment from match config', () => {
    const config = { id: 'match-1', agents: [agent1, agent2], maxRounds: 10, timeoutMs: 30000, rules: [] };
    const env = createEnvironment(config);
    expect(env.tools.length).toBeGreaterThan(0);
  });

  it('should manage resources', () => {
    const config = { id: 'match-1', agents: [agent1], maxRounds: 10, timeoutMs: 30000, rules: [] };
    const env = createEnvironment(config);
    addResource(env, 'secret', 'hidden-value');
    expect(getResource(env, 'secret')).toBe('hidden-value');
  });

  it('should handle messages', () => {
    const config = { id: 'match-1', agents: [agent1, agent2], maxRounds: 10, timeoutMs: 30000, rules: [] };
    const env = createEnvironment(config);
    const msg = sendMessage(env, 'agent-1', 'agent-2', 'Hello', 'communication', 1);
    expect(msg).not.toBeNull();

    const messages = getMessages(env, { agent: 'agent-1' });
    expect(messages.length).toBe(1);
  });

  it('should reset environment', () => {
    const config = { id: 'match-1', agents: [agent1], maxRounds: 10, timeoutMs: 30000, rules: [] };
    const env = createEnvironment(config);
    addResource(env, 'key', 'value');
    resetEnvironment(env);
    expect(getResource(env, 'key')).toBeUndefined();
  });
});

describe('Referee', () => {
  it('should detect filesystem access violation', () => {
    const referee = createReferee();
    const event: MatchEvent = {
      id: 'e1', timestamp: new Date().toISOString(), round: 1,
      agent: 'agent-1', action: 'readFile("/etc/passwd")', target: null,
      result: 'file content', severity: 'high',
    };
    const decision = evaluateAction(referee, event);
    expect(decision?.type).toBe('elimination');
  });

  it('should allow safe actions', () => {
    const referee = createReferee();
    const event: MatchEvent = {
      id: 'e2', timestamp: new Date().toISOString(), round: 1,
      agent: 'agent-1', action: 'analyze text', target: null,
      result: 'analysis complete', severity: 'low',
    };
    const decision = evaluateAction(referee, event);
    expect(decision).toBeNull();
  });

  it('should score outcomes', () => {
    const referee = createReferee();
    const events: MatchEvent[] = [
      { id: 'e1', timestamp: new Date().toISOString(), round: 1, agent: 'agent-1', action: 'probe', target: null, result: 'ok', severity: 'low' },
      { id: 'e2', timestamp: new Date().toISOString(), round: 1, agent: 'agent-2', action: 'defend', target: null, result: 'ok', severity: 'high' },
    ];
    const scores = scoreOutcome(referee, events, ['agent-1', 'agent-2']);
    expect(scores.get('agent-1')).toBeDefined();
    expect(scores.get('agent-2')).toBeDefined();
  });
});

describe('Match Runner', () => {
  it('should create and run a match', async () => {
    const config = { id: 'match-1', agents: [agent1, agent2], maxRounds: 3, timeoutMs: 30000, rules: DEFAULT_RULES };
    const match = createMatch(config);
    const result = await runMatch(match);
    expect(result.status).toBe('completed');
    expect(result.rounds).toBeGreaterThan(0);
  });

  it('should provide match status', () => {
    const config = { id: 'match-2', agents: [agent1, agent2], maxRounds: 5, timeoutMs: 30000, rules: [] };
    const match = createMatch(config);
    const status = getMatchStatus(match);
    expect(status.status).toBe('pending');
    expect(status.activeAgents.length).toBe(2);
  });
});

describe('Game Modes', () => {
  it('should have 3 game modes', () => {
    expect(ALL_GAME_MODES.length).toBe(3);
  });

  it('should get game mode by name', () => {
    const ctf = getGameMode('capture-the-flag');
    expect(ctf?.displayName).toBe('Capture the Flag');
  });

  it('should create game mode config', () => {
    const ctf = getGameMode('capture-the-flag')!;
    const config = createGameModeConfig(ctf, [agent1, agent2]);
    expect(config.maxRounds).toBeLessThanOrEqual(ctf.maxRounds);
  });

  it('should reject wrong agent count', () => {
    const ctf = getGameMode('capture-the-flag')!;
    expect(() => createGameModeConfig(ctf, [agent1])).toThrow();
  });
});

describe('Observer System', () => {
  beforeEach(() => {
    clearLeaderboard();
  });

  it('should create and use observer', () => {
    const observer = createObserver('match-1');
    const event: MatchEvent = {
      id: 'e1', timestamp: new Date().toISOString(), round: 1,
      agent: 'agent-1', action: 'probe', target: null,
      result: 'success', severity: 'low',
    };
    observeEvent(observer, event);
    expect(observer.events.length).toBe(1);
  });

  it('should take snapshots', () => {
    const observer = createObserver('match-1');
    takeSnapshot(observer, 1, { 'agent-1': 10 }, ['agent-1']);
    expect(observer.snapshots.length).toBe(1);
    expect(observer.snapshots[0].round).toBe(1);
  });

  it('should provide replay', () => {
    const observer = createObserver('match-1');
    const event: MatchEvent = {
      id: 'e1', timestamp: new Date().toISOString(), round: 1,
      agent: 'agent-1', action: 'attack', target: null,
      result: 'hit', severity: 'medium',
    };
    observeEvent(observer, event);
    const replay = getReplay(observer);
    expect(replay.events.length).toBe(1);
  });
});
