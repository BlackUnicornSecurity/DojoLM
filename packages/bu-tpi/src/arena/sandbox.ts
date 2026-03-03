/**
 * S59: Arena Agent Sandbox
 * Provides isolated execution environments for competing agents.
 * No real filesystem, no network, timeout enforcement.
 */

import { randomUUID } from 'crypto';
import type { AgentConfig, AgentSandbox, ArenaConfig } from './types.js';
import { DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS } from './types.js';

/**
 * Create an isolated sandbox for an agent.
 */
export function createSandbox(
  agent: AgentConfig,
  config: ArenaConfig = DEFAULT_ARENA_CONFIG
): AgentSandbox {
  return {
    id: randomUUID(),
    agent,
    isolatedState: new Map(),
    allowedTools: agent.capabilities.slice(),
    executionTimeout: Math.min(
      agent.resourceLimits.executionTimeoutMs,
      config.executionTimeoutMs
    ),
    actionCount: 0,
    messageCount: 0,
    active: true,
  };
}

/**
 * Execute an action within a sandboxed environment with timeout enforcement.
 */
export async function executeInSandbox<T>(
  sandbox: AgentSandbox,
  action: () => T | Promise<T>
): Promise<{ result: T | null; error: string | null; durationMs: number }> {
  if (!sandbox.active) {
    return { result: null, error: 'Sandbox is inactive', durationMs: 0 };
  }

  if (sandbox.actionCount >= sandbox.agent.resourceLimits.maxActions) {
    return { result: null, error: 'Action limit exceeded', durationMs: 0 };
  }

  const startTime = Date.now();

  try {
    const result = await Promise.race([
      Promise.resolve(action()),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Execution timeout')),
          sandbox.executionTimeout
        )
      ),
    ]);

    // Mutate sandbox action count (cast to mutable)
    (sandbox as { actionCount: number }).actionCount++;

    return { result, error: null, durationMs: Date.now() - startTime };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { result: null, error: message, durationMs: Date.now() - startTime };
  }
}

/**
 * Get the agent's private isolated state.
 */
export function getIsolatedState(sandbox: AgentSandbox): Map<string, unknown> {
  return new Map(sandbox.isolatedState);
}

/**
 * Set a value in the agent's isolated state.
 */
export function setIsolatedState(
  sandbox: AgentSandbox,
  key: string,
  value: unknown
): void {
  sandbox.isolatedState.set(key, value);
}

/**
 * Deactivate and clean up a sandbox.
 */
export function destroySandbox(sandbox: AgentSandbox): void {
  (sandbox as { active: boolean }).active = false;
  sandbox.isolatedState.clear();
}

/**
 * Check if a sandbox is within resource limits.
 */
export function isWithinLimits(sandbox: AgentSandbox): {
  withinLimits: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (sandbox.actionCount >= sandbox.agent.resourceLimits.maxActions) {
    violations.push('Action limit exceeded');
  }
  if (sandbox.messageCount >= sandbox.agent.resourceLimits.maxMessages) {
    violations.push('Message limit exceeded');
  }

  return { withinLimits: violations.length === 0, violations };
}
