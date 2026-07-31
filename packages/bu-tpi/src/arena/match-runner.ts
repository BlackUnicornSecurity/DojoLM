// SPDX-License-Identifier: Apache-2.0
/**
 * S59: Arena Match Runner
 * Executes matches between agents with round-based progression.
 */

import { randomUUID } from 'crypto';
import type {
  MatchConfig,
  MatchResult,
  MatchEvent,
  MatchStatus,
  AgentSandbox,
  SharedEnvironment,
  ArenaConfig,
} from './types.js';
import { DEFAULT_ARENA_CONFIG } from './types.js';
import { createSandbox, destroySandbox, executeInSandbox } from './sandbox.js';
import { createEnvironment, sendMessage } from './environment.js';
import { createReferee, evaluateAction, scoreOutcome, type Referee } from './referee.js';

export interface Match {
  readonly id: string;
  readonly config: MatchConfig;
  readonly sandboxes: Map<string, AgentSandbox>;
  readonly environment: SharedEnvironment;
  readonly referee: Referee;
  readonly events: MatchEvent[];
  status: MatchStatus;
  currentRound: number;
}

/**
 * Create a new match with the given configuration.
 */
export function createMatch(
  config: MatchConfig,
  arenaConfig: ArenaConfig = DEFAULT_ARENA_CONFIG
): Match {
  if (config.agents.length > arenaConfig.maxAgents) {
    throw new Error(`Too many agents: ${config.agents.length} > ${arenaConfig.maxAgents}`);
  }

  const sandboxes = new Map<string, AgentSandbox>();
  for (const agent of config.agents) {
    sandboxes.set(agent.id, createSandbox(agent, arenaConfig));
  }

  return {
    id: config.id,
    config,
    sandboxes,
    environment: createEnvironment(config, arenaConfig),
    referee: createReferee(config.rules),
    events: [],
    status: 'pending',
    currentRound: 0,
  };
}

/**
 * Record an event in the match.
 */
export function recordEvent(
  match: Match,
  agent: string,
  action: string,
  target: string | null,
  result: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): MatchEvent {
  const event: MatchEvent = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    round: match.currentRound,
    agent,
    action,
    target,
    result,
    severity,
  };

  (match.events as MatchEvent[]).push(event);

  // Let referee evaluate
  evaluateAction(match.referee, event);

  return event;
}

/**
 * Execute a single round of the match.
 */
export async function executeRound(match: Match): Promise<void> {
  if (match.status !== 'running') return;

  match.currentRound++;

  for (const [agentId, sandbox] of match.sandboxes) {
    if (!sandbox.active) continue;

    // Each agent gets to take an action
    const result = await executeInSandbox(sandbox, () => {
      // Simulate agent action (returns action description)
      return `Agent ${agentId} action in round ${match.currentRound}`;
    });

    if (result.error) {
      recordEvent(
        match,
        agentId,
        'action-failed',
        null,
        result.error,
        'low'
      );
    } else if (result.result) {
      recordEvent(
        match,
        agentId,
        'action',
        null,
        String(result.result),
        'low'
      );
    }
  }
}

/**
 * Run a complete match.
 */
export async function runMatch(match: Match): Promise<MatchResult> {
  const startTime = Date.now();
  match.status = 'running';

  const maxRounds = Math.min(match.config.maxRounds, 100);

  for (let round = match.currentRound; round < maxRounds; round++) {
    if (match.status !== 'running') break;

    // Timeout check
    if (Date.now() - startTime > match.config.timeoutMs) {
      match.status = 'aborted';
      break;
    }

    await executeRound(match);

    // Check if any agent was eliminated
    const eliminatedAgents = match.referee.decisions
      .filter((d) => d.type === 'elimination')
      .map((d) => d.target);

    for (const agentId of eliminatedAgents) {
      const sandbox = match.sandboxes.get(agentId);
      if (sandbox?.active) {
        destroySandbox(sandbox);
      }
    }

    // Check if match is over (only one agent remaining)
    const activeAgents = Array.from(match.sandboxes.values()).filter(
      (s) => s.active
    );
    if (activeAgents.length <= 1) break;
  }

  if (match.status !== 'aborted') {
    match.status = 'completed';
  }
  const durationMs = Date.now() - startTime;

  // Score the match
  const agentIds = match.config.agents.map((a) => a.id);
  const scores = scoreOutcome(match.referee, match.events, agentIds);

  // Determine winner
  let winner: string | null = null;
  let highestScore = -Infinity;
  for (const [agentId, score] of scores) {
    if (score > highestScore) {
      highestScore = score;
      winner = agentId;
    }
  }

  // Clean up sandboxes
  for (const sandbox of match.sandboxes.values()) {
    destroySandbox(sandbox);
  }

  return {
    matchId: match.id,
    winner,
    scores,
    events: match.events,
    violations: match.referee.violations,
    decisions: match.referee.decisions,
    rounds: match.currentRound,
    durationMs,
    status: match.status,
  };
}

/**
 * Get current match status.
 */
export function getMatchStatus(match: Match): {
  round: number;
  status: MatchStatus;
  activeAgents: string[];
  eventCount: number;
  violationCount: number;
} {
  return {
    round: match.currentRound,
    status: match.status,
    activeAgents: Array.from(match.sandboxes.entries())
      .filter(([, s]) => s.active)
      .map(([id]) => id),
    eventCount: match.events.length,
    violationCount: match.referee.violations.length,
  };
}

/**
 * Accept a `ChainTarget` probe outcome as a match input (Gap 10 spec
 * line 608 — chain-target outputs feed the arena).
 *
 * Additive-only: existing `runMatch` / `executeRound` surfaces are
 * unchanged. Callers may optionally record a `ChainTarget`-originated
 * probe outcome as a match event without disturbing in-flight rounds.
 *
 * The contract is intentionally narrow — we accept only R-T1-safe
 * fields (refusal class, elapsed ms, credits, hashes). Raw payload
 * content must NOT be passed in.
 */
export interface ChainTargetProbeInput {
  /** Stable target id from the `ChainTarget` — treated as the match target. */
  readonly targetId: string;
  /** Agent id in the match that initiated this probe. */
  readonly agentId: string;
  /**
   * Refusal class buckets: 'compliance' = attack succeeded (severity high),
   * 'soft-refusal' = partial (medium), 'hard-refusal' = clean refuse (low),
   * 'off-topic' = miss (low), 'error' = probe failed (low).
   */
  readonly refusalClass:
    | 'compliance'
    | 'soft-refusal'
    | 'hard-refusal'
    | 'off-topic'
    | 'error';
  /** Evidence hash (sha256:...) — R-T1-safe. Optional. */
  readonly evidenceHash?: string;
  /** Credits the chain/probe consumed. Recorded for audit, not deducted. */
  readonly creditsConsumed?: number;
  /** Wall-clock ms. Captured in event.result for audit. */
  readonly elapsedMs?: number;
}

function refusalSeverity(
  cls: ChainTargetProbeInput['refusalClass'],
): 'low' | 'medium' | 'high' | 'critical' {
  if (cls === 'compliance') return 'high';
  if (cls === 'soft-refusal') return 'medium';
  return 'low';
}

export function acceptChainTarget(
  match: Match,
  input: ChainTargetProbeInput,
): MatchEvent {
  if (!match) {
    throw new Error('acceptChainTarget: match required');
  }
  if (typeof input.targetId !== 'string' || input.targetId.length === 0) {
    throw new Error('acceptChainTarget: targetId must be non-empty string');
  }
  if (typeof input.agentId !== 'string' || input.agentId.length === 0) {
    throw new Error('acceptChainTarget: agentId must be non-empty string');
  }
  // R-T1: we do NOT accept raw response text here. Only hashes + class.
  const parts: string[] = [`chain-target:${input.refusalClass}`];
  if (input.evidenceHash) parts.push(`hash=${input.evidenceHash}`);
  if (typeof input.elapsedMs === 'number' && Number.isFinite(input.elapsedMs)) {
    parts.push(`elapsedMs=${Math.max(0, Math.floor(input.elapsedMs))}`);
  }
  if (
    typeof input.creditsConsumed === 'number' &&
    Number.isFinite(input.creditsConsumed)
  ) {
    parts.push(`credits=${Math.max(0, Math.floor(input.creditsConsumed))}`);
  }
  return recordEvent(
    match,
    input.agentId,
    'chain-target-probe',
    input.targetId,
    parts.join(' '),
    refusalSeverity(input.refusalClass),
  );
}

/**
 * Pause a running match.
 */
export function pauseMatch(match: Match): void {
  if (match.status === 'running') {
    match.status = 'paused';
  }
}

/**
 * Resume a paused match.
 */
export async function resumeMatch(match: Match): Promise<MatchResult> {
  if (match.status === 'paused') {
    match.status = 'running';
  }
  return runMatch(match);
}
