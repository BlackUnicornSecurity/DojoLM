/**
 * Tests for S59: Arena Agent Sandbox
 */

import { describe, it, expect } from 'vitest';
import {
  createSandbox,
  executeInSandbox,
  getIsolatedState,
  setIsolatedState,
  destroySandbox,
  isWithinLimits,
} from './sandbox.js';
import type { AgentConfig, ArenaConfig } from './types.js';
import { DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS } from './types.js';

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    id: overrides.id ?? 'agent-1',
    name: overrides.name ?? 'Test Agent',
    role: overrides.role ?? 'attacker',
    capabilities: overrides.capabilities ?? ['scan', 'inject'],
    resourceLimits: overrides.resourceLimits ?? DEFAULT_AGENT_LIMITS,
  };
}

describe('Arena Agent Sandbox', () => {
  // SB-001
  it('SB-001: createSandbox returns a valid active sandbox', () => {
    const sandbox = createSandbox(makeAgent());
    expect(sandbox.id).toBeTruthy();
    expect(sandbox.active).toBe(true);
    expect(sandbox.actionCount).toBe(0);
    expect(sandbox.messageCount).toBe(0);
  });

  // SB-002
  it('SB-002: createSandbox copies agent capabilities to allowedTools', () => {
    const agent = makeAgent({ capabilities: ['scan', 'inject', 'exploit'] });
    const sandbox = createSandbox(agent);
    expect(sandbox.allowedTools).toEqual(['scan', 'inject', 'exploit']);
  });

  // SB-003
  it('SB-003: createSandbox uses minimum of agent and arena timeout', () => {
    const agent = makeAgent({
      resourceLimits: { ...DEFAULT_AGENT_LIMITS, executionTimeoutMs: 5000 },
    });
    const config: ArenaConfig = { ...DEFAULT_ARENA_CONFIG, executionTimeoutMs: 10000 };
    const sandbox = createSandbox(agent, config);
    expect(sandbox.executionTimeout).toBe(5000);

    const agent2 = makeAgent({
      resourceLimits: { ...DEFAULT_AGENT_LIMITS, executionTimeoutMs: 50000 },
    });
    const sandbox2 = createSandbox(agent2, config);
    expect(sandbox2.executionTimeout).toBe(10000);
  });

  // SB-004
  it('SB-004: executeInSandbox runs synchronous action successfully', async () => {
    const sandbox = createSandbox(makeAgent());
    const result = await executeInSandbox(sandbox, () => 42);
    expect(result.result).toBe(42);
    expect(result.error).toBeNull();
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  // SB-005
  it('SB-005: executeInSandbox runs async action successfully', async () => {
    const sandbox = createSandbox(makeAgent());
    const result = await executeInSandbox(sandbox, async () => 'async-result');
    expect(result.result).toBe('async-result');
    expect(result.error).toBeNull();
  });

  // SB-006
  it('SB-006: executeInSandbox increments actionCount', async () => {
    const sandbox = createSandbox(makeAgent());
    await executeInSandbox(sandbox, () => 1);
    await executeInSandbox(sandbox, () => 2);
    expect(sandbox.actionCount).toBe(2);
  });

  // SB-007
  it('SB-007: executeInSandbox rejects when sandbox is inactive', async () => {
    const sandbox = createSandbox(makeAgent());
    destroySandbox(sandbox);
    const result = await executeInSandbox(sandbox, () => 42);
    expect(result.result).toBeNull();
    expect(result.error).toBe('Sandbox is inactive');
  });

  // SB-008
  it('SB-008: executeInSandbox rejects when action limit exceeded', async () => {
    const agent = makeAgent({
      resourceLimits: { ...DEFAULT_AGENT_LIMITS, maxActions: 1 },
    });
    const sandbox = createSandbox(agent);
    await executeInSandbox(sandbox, () => 1);
    const result = await executeInSandbox(sandbox, () => 2);
    expect(result.result).toBeNull();
    expect(result.error).toBe('Action limit exceeded');
  });

  // SB-009
  it('SB-009: executeInSandbox catches thrown errors', async () => {
    const sandbox = createSandbox(makeAgent());
    const result = await executeInSandbox(sandbox, () => {
      throw new Error('test error');
    });
    expect(result.result).toBeNull();
    expect(result.error).toBe('test error');
  });

  // SB-010
  it('SB-010: executeInSandbox handles non-Error throws', async () => {
    const sandbox = createSandbox(makeAgent());
    const result = await executeInSandbox(sandbox, () => {
      throw 'string error';
    });
    expect(result.result).toBeNull();
    expect(result.error).toBe('Unknown error');
  });

  // SB-011
  it('SB-011: getIsolatedState returns a copy of the state', () => {
    const sandbox = createSandbox(makeAgent());
    setIsolatedState(sandbox, 'key', 'value');
    const state = getIsolatedState(sandbox);
    expect(state.get('key')).toBe('value');
    // It's a copy, modifying it should not affect sandbox
    state.set('new', 'val');
    expect(sandbox.isolatedState.has('new')).toBe(false);
  });

  // SB-012
  it('SB-012: setIsolatedState stores values in sandbox', () => {
    const sandbox = createSandbox(makeAgent());
    setIsolatedState(sandbox, 'foo', 123);
    setIsolatedState(sandbox, 'bar', { nested: true });
    expect(sandbox.isolatedState.get('foo')).toBe(123);
    expect(sandbox.isolatedState.get('bar')).toEqual({ nested: true });
  });

  // SB-013
  it('SB-013: destroySandbox deactivates and clears state', () => {
    const sandbox = createSandbox(makeAgent());
    setIsolatedState(sandbox, 'key', 'val');
    destroySandbox(sandbox);
    expect(sandbox.active).toBe(false);
    expect(sandbox.isolatedState.size).toBe(0);
  });

  // SB-014
  it('SB-014: isWithinLimits returns true when under limits', () => {
    const sandbox = createSandbox(makeAgent());
    const check = isWithinLimits(sandbox);
    expect(check.withinLimits).toBe(true);
    expect(check.violations).toHaveLength(0);
  });

  // SB-015
  it('SB-015: isWithinLimits reports action limit violation', async () => {
    const agent = makeAgent({
      resourceLimits: { ...DEFAULT_AGENT_LIMITS, maxActions: 1 },
    });
    const sandbox = createSandbox(agent);
    await executeInSandbox(sandbox, () => 1);
    const check = isWithinLimits(sandbox);
    expect(check.withinLimits).toBe(false);
    expect(check.violations).toContain('Action limit exceeded');
  });

  // SB-016
  it('SB-016: isWithinLimits reports message limit violation', () => {
    const agent = makeAgent({
      resourceLimits: { ...DEFAULT_AGENT_LIMITS, maxMessages: 0 },
    });
    const sandbox = createSandbox(agent);
    const check = isWithinLimits(sandbox);
    expect(check.withinLimits).toBe(false);
    expect(check.violations).toContain('Message limit exceeded');
  });
});
