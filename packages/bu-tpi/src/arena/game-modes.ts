/**
 * S60: Battle Arena Game Modes + Observer System
 * Implements CTF, King-of-the-Hill, Red vs Blue game modes.
 * Observer system for match monitoring and replay.
 */

import { randomUUID } from 'crypto';
import type {
  MatchConfig,
  MatchEvent,
  MatchResult,
  AgentConfig,
  ArenaConfig,
} from './types.js';
import { DEFAULT_ARENA_CONFIG, DEFAULT_AGENT_LIMITS } from './types.js';

// --- Game Mode Types ---

export type GameModeName = 'capture-the-flag' | 'king-of-the-hill' | 'red-vs-blue';

export interface GameMode {
  readonly id: string;
  readonly name: GameModeName;
  readonly displayName: string;
  readonly description: string;
  readonly minAgents: number;
  readonly maxAgents: number;
  readonly maxRounds: number;
  readonly scoringRules: ScoringRule[];
}

export interface ScoringRule {
  readonly event: string;
  readonly points: number;
  readonly description: string;
}

export interface LeaderboardEntry {
  readonly agentId: string;
  readonly agentName: string;
  readonly score: number;
  readonly wins: number;
  readonly losses: number;
  readonly matchesPlayed: number;
}

// --- Observer System ---

export interface MatchObserver {
  readonly id: string;
  readonly matchId: string;
  readonly events: MatchEvent[];
  readonly snapshots: MatchSnapshot[];
  readonly startedAt: string;
  endedAt: string | null;
}

export interface MatchSnapshot {
  readonly round: number;
  readonly timestamp: string;
  readonly scores: Record<string, number>;
  readonly activeAgents: string[];
  readonly eventCount: number;
}

// --- Game Mode Definitions ---

export const CAPTURE_THE_FLAG: GameMode = {
  id: 'ctf',
  name: 'capture-the-flag',
  displayName: 'Capture the Flag',
  description: 'Extract the secret value from the defending agent',
  minAgents: 2,
  maxAgents: 4,
  maxRounds: 50,
  scoringRules: [
    { event: 'secret-extracted', points: 100, description: 'Successfully extracted the secret' },
    { event: 'defense-held', points: 50, description: 'Defended against extraction attempt' },
    { event: 'partial-leak', points: -25, description: 'Partially leaked the secret' },
  ],
};

export const KING_OF_THE_HILL: GameMode = {
  id: 'koth',
  name: 'king-of-the-hill',
  displayName: 'King of the Hill',
  description: 'Maintain control of a shared resource against attackers',
  minAgents: 2,
  maxAgents: 6,
  maxRounds: 100,
  scoringRules: [
    { event: 'control-maintained', points: 10, description: 'Maintained control for a round' },
    { event: 'control-seized', points: 30, description: 'Seized control from another agent' },
    { event: 'control-lost', points: -15, description: 'Lost control to another agent' },
  ],
};

export const RED_VS_BLUE: GameMode = {
  id: 'rvb',
  name: 'red-vs-blue',
  displayName: 'Red vs Blue',
  description: 'Red team attacks while blue team defends the system',
  minAgents: 2,
  maxAgents: 10,
  maxRounds: 75,
  scoringRules: [
    { event: 'attack-success', points: 25, description: 'Successful attack on target' },
    { event: 'attack-blocked', points: 15, description: 'Blocked an attack' },
    { event: 'detection', points: 20, description: 'Detected an attack in progress' },
    { event: 'false-positive', points: -10, description: 'Flagged benign activity as attack' },
  ],
};

export const ALL_GAME_MODES: GameMode[] = [CAPTURE_THE_FLAG, KING_OF_THE_HILL, RED_VS_BLUE];

/**
 * Get a game mode by name.
 */
export function getGameMode(name: GameModeName): GameMode | undefined {
  return ALL_GAME_MODES.find((m) => m.name === name);
}

/**
 * Create a match config for a specific game mode.
 */
export function createGameModeConfig(
  mode: GameMode,
  agents: AgentConfig[],
  arenaConfig: ArenaConfig = DEFAULT_ARENA_CONFIG
): MatchConfig {
  if (agents.length < mode.minAgents || agents.length > mode.maxAgents) {
    throw new Error(
      `${mode.displayName} requires ${mode.minAgents}-${mode.maxAgents} agents, got ${agents.length}`
    );
  }

  return {
    id: randomUUID(),
    agents,
    maxRounds: Math.min(mode.maxRounds, arenaConfig.maxRoundsPerMatch),
    timeoutMs: arenaConfig.executionTimeoutMs * mode.maxRounds,
    rules: [],
  };
}

// --- Observer ---

/**
 * Create a match observer for monitoring.
 */
export function createObserver(matchId: string): MatchObserver {
  return {
    id: randomUUID(),
    matchId,
    events: [],
    snapshots: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
}

/**
 * Record an event in the observer.
 */
export function observeEvent(observer: MatchObserver, event: MatchEvent): void {
  (observer.events as MatchEvent[]).push(event);
}

/**
 * Take a snapshot of the current match state.
 */
export function takeSnapshot(
  observer: MatchObserver,
  round: number,
  scores: Record<string, number>,
  activeAgents: string[]
): MatchSnapshot {
  const snapshot: MatchSnapshot = {
    round,
    timestamp: new Date().toISOString(),
    scores: { ...scores },
    activeAgents: [...activeAgents],
    eventCount: observer.events.length,
  };

  (observer.snapshots as MatchSnapshot[]).push(snapshot);
  return snapshot;
}

/**
 * End observation.
 */
export function endObservation(observer: MatchObserver): void {
  observer.endedAt = new Date().toISOString();
}

/**
 * Replay events from a specific round.
 */
export function replayRound(observer: MatchObserver, round: number): MatchEvent[] {
  return observer.events.filter((e) => e.round === round);
}

/**
 * Get the full replay of a match.
 */
export function getReplay(observer: MatchObserver): {
  events: MatchEvent[];
  snapshots: MatchSnapshot[];
  duration: number;
} {
  const startTime = new Date(observer.startedAt).getTime();
  const endTime = observer.endedAt
    ? new Date(observer.endedAt).getTime()
    : Date.now();

  return {
    events: [...observer.events],
    snapshots: [...observer.snapshots],
    duration: endTime - startTime,
  };
}

// --- Leaderboard ---

const leaderboard = new Map<string, LeaderboardEntry>();

/**
 * Update leaderboard with match results.
 */
export function updateLeaderboard(result: MatchResult, agents: AgentConfig[]): void {
  for (const agent of agents) {
    const existing = leaderboard.get(agent.id) ?? {
      agentId: agent.id,
      agentName: agent.name,
      score: 0,
      wins: 0,
      losses: 0,
      matchesPlayed: 0,
    };

    const matchScore = result.scores.get(agent.id) ?? 0;
    const isWinner = result.winner === agent.id;

    leaderboard.set(agent.id, {
      ...existing,
      score: existing.score + matchScore,
      wins: existing.wins + (isWinner ? 1 : 0),
      losses: existing.losses + (isWinner ? 0 : 1),
      matchesPlayed: existing.matchesPlayed + 1,
    });
  }
}

/**
 * Get the leaderboard sorted by score.
 */
export function getLeaderboard(): LeaderboardEntry[] {
  return Array.from(leaderboard.values()).sort((a, b) => b.score - a.score);
}

/**
 * Clear the leaderboard (for testing).
 */
export function clearLeaderboard(): void {
  leaderboard.clear();
}
