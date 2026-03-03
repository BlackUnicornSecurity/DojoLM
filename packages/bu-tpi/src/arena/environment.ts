/**
 * S59: Arena Shared Environment
 * Manages shared resources, tools, state, and inter-agent communication.
 * All state is in-memory (no real filesystem or network).
 */

import { randomUUID } from 'crypto';
import type {
  SharedEnvironment,
  MatchConfig,
  AgentMessage,
  MessageType,
  ArenaConfig,
} from './types.js';
import { DEFAULT_ARENA_CONFIG, MAX_INPUT_LENGTH } from './types.js';

/**
 * Create a shared environment for a match.
 */
export function createEnvironment(
  config: MatchConfig,
  arenaConfig: ArenaConfig = DEFAULT_ARENA_CONFIG
): SharedEnvironment {
  return {
    id: randomUUID(),
    resources: new Map(),
    tools: config.agents.flatMap((a) => a.capabilities).filter(
      (v, i, arr) => arr.indexOf(v) === i
    ),
    state: new Map(),
    messages: [],
  };
}

/**
 * Add a resource to the shared environment.
 */
export function addResource(
  env: SharedEnvironment,
  key: string,
  value: unknown
): void {
  env.resources.set(key, value);
}

/**
 * Get a resource from the shared environment.
 */
export function getResource(
  env: SharedEnvironment,
  key: string
): unknown | undefined {
  return env.resources.get(key);
}

/**
 * Remove a resource from the shared environment.
 */
export function removeResource(env: SharedEnvironment, key: string): boolean {
  return env.resources.delete(key);
}

/**
 * Send a message between agents via the shared environment.
 * Messages are validated for size limits.
 */
export function sendMessage(
  env: SharedEnvironment,
  from: string,
  to: string | 'broadcast',
  content: string,
  type: MessageType,
  round: number,
  config: ArenaConfig = DEFAULT_ARENA_CONFIG
): AgentMessage | null {
  // Validate message size
  if (content.length > config.maxMessageSize) {
    return null;
  }
  if (content.length > MAX_INPUT_LENGTH) {
    return null;
  }

  // Check per-round message limit
  const roundMessages = env.messages.filter((m) => m.round === round);
  if (roundMessages.length >= config.maxMessagesPerRound) {
    return null;
  }

  const message: AgentMessage = {
    id: randomUUID(),
    from,
    to,
    content,
    type,
    timestamp: new Date().toISOString(),
    round,
  };

  (env.messages as AgentMessage[]).push(message);
  return message;
}

/**
 * Get messages with optional filtering.
 */
export function getMessages(
  env: SharedEnvironment,
  filter?: {
    agent?: string;
    type?: MessageType;
    round?: number;
  }
): AgentMessage[] {
  let messages = [...env.messages];

  if (filter?.agent) {
    messages = messages.filter(
      (m) => m.from === filter.agent || m.to === filter.agent || m.to === 'broadcast'
    );
  }
  if (filter?.type) {
    messages = messages.filter((m) => m.type === filter.type);
  }
  if (filter?.round !== undefined) {
    messages = messages.filter((m) => m.round === filter.round);
  }

  return messages;
}

/**
 * Set shared environment state.
 */
export function setState(env: SharedEnvironment, key: string, value: unknown): void {
  env.state.set(key, value);
}

/**
 * Get shared environment state.
 */
export function getState(env: SharedEnvironment, key: string): unknown | undefined {
  return env.state.get(key);
}

/**
 * Reset the environment to initial state.
 */
export function resetEnvironment(env: SharedEnvironment): void {
  env.resources.clear();
  env.state.clear();
  (env.messages as AgentMessage[]).length = 0;
}

/**
 * Get environment statistics.
 */
export function getEnvironmentStats(env: SharedEnvironment): {
  resourceCount: number;
  messageCount: number;
  stateKeys: number;
  toolCount: number;
} {
  return {
    resourceCount: env.resources.size,
    messageCount: env.messages.length,
    stateKeys: env.state.size,
    toolCount: env.tools.length,
  };
}
