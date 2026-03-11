/**
 * Tests for S59: Arena Shared Environment
 */

import { describe, it, expect } from 'vitest';
import {
  createEnvironment,
  addResource,
  getResource,
  removeResource,
  sendMessage,
  getMessages,
  setState,
  getState,
  resetEnvironment,
  getEnvironmentStats,
} from './environment.js';
import type { MatchConfig, SharedEnvironment, ArenaConfig } from './types.js';
import { DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS } from './types.js';

function makeMatchConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    id: overrides.id ?? 'match-1',
    agents: overrides.agents ?? [
      {
        id: 'agent-1',
        name: 'Attacker',
        role: 'attacker',
        capabilities: ['scan', 'inject'],
        resourceLimits: DEFAULT_AGENT_LIMITS,
      },
      {
        id: 'agent-2',
        name: 'Defender',
        role: 'defender',
        capabilities: ['scan', 'block'],
        resourceLimits: DEFAULT_AGENT_LIMITS,
      },
    ],
    maxRounds: overrides.maxRounds ?? 10,
    timeoutMs: overrides.timeoutMs ?? 30000,
    rules: overrides.rules ?? [],
  };
}

describe('Arena Shared Environment', () => {
  // AE-001
  it('AE-001: createEnvironment returns a valid environment', () => {
    const env = createEnvironment(makeMatchConfig());
    expect(env.id).toBeTruthy();
    expect(env.resources).toBeInstanceOf(Map);
    expect(env.state).toBeInstanceOf(Map);
    expect(env.messages).toEqual([]);
  });

  // AE-002
  it('AE-002: createEnvironment deduplicates tools from agents', () => {
    const env = createEnvironment(makeMatchConfig());
    // 'scan' is shared, 'inject' and 'block' are unique = 3 tools
    expect(env.tools).toContain('scan');
    expect(env.tools).toContain('inject');
    expect(env.tools).toContain('block');
    expect(env.tools.length).toBe(3);
  });

  // AE-003
  it('AE-003: addResource and getResource work correctly', () => {
    const env = createEnvironment(makeMatchConfig());
    addResource(env, 'data', { value: 42 });
    expect(getResource(env, 'data')).toEqual({ value: 42 });
  });

  // AE-004
  it('AE-004: getResource returns undefined for missing key', () => {
    const env = createEnvironment(makeMatchConfig());
    expect(getResource(env, 'nonexistent')).toBeUndefined();
  });

  // AE-005
  it('AE-005: removeResource removes and returns true', () => {
    const env = createEnvironment(makeMatchConfig());
    addResource(env, 'key', 'value');
    expect(removeResource(env, 'key')).toBe(true);
    expect(getResource(env, 'key')).toBeUndefined();
  });

  // AE-006
  it('AE-006: removeResource returns false for missing key', () => {
    const env = createEnvironment(makeMatchConfig());
    expect(removeResource(env, 'nonexistent')).toBe(false);
  });

  // AE-007
  it('AE-007: sendMessage creates and stores a message', () => {
    const env = createEnvironment(makeMatchConfig());
    const msg = sendMessage(env, 'agent-1', 'agent-2', 'hello', 'attack', 1);
    expect(msg).not.toBeNull();
    expect(msg!.from).toBe('agent-1');
    expect(msg!.to).toBe('agent-2');
    expect(msg!.content).toBe('hello');
    expect(msg!.type).toBe('attack');
    expect(msg!.round).toBe(1);
    expect(env.messages).toHaveLength(1);
  });

  // AE-008
  it('AE-008: sendMessage rejects oversized messages', () => {
    const env = createEnvironment(makeMatchConfig());
    const bigContent = 'x'.repeat(DEFAULT_ARENA_CONFIG.maxMessageSize + 1);
    const msg = sendMessage(env, 'agent-1', 'agent-2', bigContent, 'attack', 1);
    expect(msg).toBeNull();
  });

  // AE-009
  it('AE-009: sendMessage enforces per-round message limit', () => {
    const config: ArenaConfig = { ...DEFAULT_ARENA_CONFIG, maxMessagesPerRound: 2 };
    const env = createEnvironment(makeMatchConfig(), config);
    sendMessage(env, 'a', 'b', 'msg1', 'attack', 1, config);
    sendMessage(env, 'a', 'b', 'msg2', 'attack', 1, config);
    const msg3 = sendMessage(env, 'a', 'b', 'msg3', 'attack', 1, config);
    expect(msg3).toBeNull();
    expect(env.messages).toHaveLength(2);
  });

  // AE-010
  it('AE-010: getMessages returns all messages without filter', () => {
    const env = createEnvironment(makeMatchConfig());
    sendMessage(env, 'a', 'b', 'msg1', 'attack', 1);
    sendMessage(env, 'b', 'a', 'msg2', 'defense', 1);
    expect(getMessages(env)).toHaveLength(2);
  });

  // AE-011
  it('AE-011: getMessages filters by agent (from, to, or broadcast)', () => {
    const env = createEnvironment(makeMatchConfig());
    sendMessage(env, 'a', 'b', 'msg1', 'attack', 1);
    sendMessage(env, 'c', 'd', 'msg2', 'attack', 1);
    sendMessage(env, 'c', 'broadcast', 'msg3', 'communication', 1);
    const agentAMsgs = getMessages(env, { agent: 'a' });
    // agent 'a' sees msg1 (from: a) + msg3 (broadcast) = 2
    expect(agentAMsgs).toHaveLength(2);
    // agent 'b' sees msg1 (to: b) + msg3 (broadcast) = 2
    const agentBMsgs = getMessages(env, { agent: 'b' });
    expect(agentBMsgs).toHaveLength(2);
    // agent 'd' sees msg2 (to: d) + msg3 (broadcast) = 2
    const agentDMsgs = getMessages(env, { agent: 'd' });
    expect(agentDMsgs).toHaveLength(2);
  });

  // AE-012
  it('AE-012: getMessages filters by type', () => {
    const env = createEnvironment(makeMatchConfig());
    sendMessage(env, 'a', 'b', 'msg1', 'attack', 1);
    sendMessage(env, 'b', 'a', 'msg2', 'defense', 1);
    const attacks = getMessages(env, { type: 'attack' });
    expect(attacks).toHaveLength(1);
    expect(attacks[0].type).toBe('attack');
  });

  // AE-013
  it('AE-013: getMessages filters by round', () => {
    const env = createEnvironment(makeMatchConfig());
    sendMessage(env, 'a', 'b', 'r1', 'attack', 1);
    sendMessage(env, 'a', 'b', 'r2', 'attack', 2);
    const round1 = getMessages(env, { round: 1 });
    expect(round1).toHaveLength(1);
  });

  // AE-014
  it('AE-014: setState and getState work correctly', () => {
    const env = createEnvironment(makeMatchConfig());
    setState(env, 'score', 100);
    expect(getState(env, 'score')).toBe(100);
  });

  // AE-015
  it('AE-015: resetEnvironment clears all data', () => {
    const env = createEnvironment(makeMatchConfig());
    addResource(env, 'r', 'val');
    setState(env, 's', 'val');
    sendMessage(env, 'a', 'b', 'msg', 'attack', 1);
    resetEnvironment(env);
    expect(env.resources.size).toBe(0);
    expect(env.state.size).toBe(0);
    expect(env.messages).toHaveLength(0);
  });

  // AE-016
  it('AE-016: getEnvironmentStats returns correct counts', () => {
    const env = createEnvironment(makeMatchConfig());
    addResource(env, 'r1', 1);
    addResource(env, 'r2', 2);
    setState(env, 's1', 'v');
    sendMessage(env, 'a', 'b', 'msg', 'attack', 1);
    const stats = getEnvironmentStats(env);
    expect(stats.resourceCount).toBe(2);
    expect(stats.messageCount).toBe(1);
    expect(stats.stateKeys).toBe(1);
    expect(stats.toolCount).toBe(3); // scan, inject, block
  });
});
