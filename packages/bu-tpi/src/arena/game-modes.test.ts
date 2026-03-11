/**
 * Tests for S60: Battle Arena Game Modes + Observer System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CAPTURE_THE_FLAG,
  KING_OF_THE_HILL,
  RED_VS_BLUE,
  ALL_GAME_MODES,
  getGameMode,
  createGameModeConfig,
  createObserver,
  observeEvent,
  takeSnapshot,
  endObservation,
  replayRound,
  getReplay,
  updateLeaderboard,
  getLeaderboard,
  clearLeaderboard,
} from './game-modes.js';
import type { AgentConfig, MatchEvent, MatchResult } from './types.js';
import { DEFAULT_AGENT_LIMITS } from './types.js';

function makeAgent(id: string): AgentConfig {
  return {
    id,
    name: `Agent ${id}`,
    role: 'attacker',
    capabilities: ['scan'],
    resourceLimits: DEFAULT_AGENT_LIMITS,
  };
}

function makeEvent(round: number, agent = 'a1'): MatchEvent {
  return {
    id: `evt-${round}-${agent}`,
    timestamp: new Date().toISOString(),
    round,
    agent,
    action: 'test',
    target: null,
    result: 'ok',
    severity: 'low',
  };
}

describe('Arena Game Modes', () => {
  beforeEach(() => {
    clearLeaderboard();
  });

  // GM-001
  it('GM-001: ALL_GAME_MODES contains exactly 3 modes', () => {
    expect(ALL_GAME_MODES).toHaveLength(3);
    expect(ALL_GAME_MODES).toContain(CAPTURE_THE_FLAG);
    expect(ALL_GAME_MODES).toContain(KING_OF_THE_HILL);
    expect(ALL_GAME_MODES).toContain(RED_VS_BLUE);
  });

  // GM-002
  it('GM-002: getGameMode returns the correct mode by name', () => {
    expect(getGameMode('capture-the-flag')).toBe(CAPTURE_THE_FLAG);
    expect(getGameMode('king-of-the-hill')).toBe(KING_OF_THE_HILL);
    expect(getGameMode('red-vs-blue')).toBe(RED_VS_BLUE);
  });

  // GM-003
  it('GM-003: getGameMode returns undefined for unknown mode', () => {
    expect(getGameMode('unknown' as any)).toBeUndefined();
  });

  // GM-004
  it('GM-004: createGameModeConfig creates valid config for CTF', () => {
    const agents = [makeAgent('a1'), makeAgent('a2')];
    const config = createGameModeConfig(CAPTURE_THE_FLAG, agents);

    expect(config.agents).toHaveLength(2);
    expect(config.maxRounds).toBeLessThanOrEqual(CAPTURE_THE_FLAG.maxRounds);
    expect(config.id).toBeTruthy();
  });

  // GM-005
  it('GM-005: createGameModeConfig throws for too few agents', () => {
    const agents = [makeAgent('a1')];
    expect(() => createGameModeConfig(CAPTURE_THE_FLAG, agents)).toThrow(
      /requires 2-4 agents/
    );
  });

  // GM-006
  it('GM-006: createGameModeConfig throws for too many agents', () => {
    const agents = Array.from({ length: 5 }, (_, i) => makeAgent(`a${i}`));
    expect(() => createGameModeConfig(CAPTURE_THE_FLAG, agents)).toThrow(
      /requires 2-4 agents/
    );
  });

  // GM-007
  it('GM-007: createObserver initializes empty observer', () => {
    const obs = createObserver('match-1');
    expect(obs.matchId).toBe('match-1');
    expect(obs.events).toHaveLength(0);
    expect(obs.snapshots).toHaveLength(0);
    expect(obs.endedAt).toBeNull();
    expect(obs.startedAt).toBeTruthy();
  });

  // GM-008
  it('GM-008: observeEvent records events in the observer', () => {
    const obs = createObserver('match-1');
    const event = makeEvent(1);
    observeEvent(obs, event);

    expect(obs.events).toHaveLength(1);
    expect(obs.events[0]).toBe(event);
  });

  // GM-009
  it('GM-009: takeSnapshot captures current state', () => {
    const obs = createObserver('match-1');
    observeEvent(obs, makeEvent(1));
    observeEvent(obs, makeEvent(1, 'a2'));

    const snapshot = takeSnapshot(obs, 1, { a1: 10, a2: 5 }, ['a1', 'a2']);

    expect(snapshot.round).toBe(1);
    expect(snapshot.scores.a1).toBe(10);
    expect(snapshot.activeAgents).toEqual(['a1', 'a2']);
    expect(snapshot.eventCount).toBe(2);
    expect(obs.snapshots).toHaveLength(1);
  });

  // GM-010
  it('GM-010: endObservation sets endedAt timestamp', () => {
    const obs = createObserver('match-1');
    expect(obs.endedAt).toBeNull();

    endObservation(obs);
    expect(obs.endedAt).toBeTruthy();
  });

  // GM-011
  it('GM-011: replayRound filters events by round', () => {
    const obs = createObserver('match-1');
    observeEvent(obs, makeEvent(1, 'a1'));
    observeEvent(obs, makeEvent(2, 'a1'));
    observeEvent(obs, makeEvent(1, 'a2'));
    observeEvent(obs, makeEvent(3, 'a1'));

    const r1Events = replayRound(obs, 1);
    expect(r1Events).toHaveLength(2);
    expect(r1Events.every((e) => e.round === 1)).toBe(true);
  });

  // GM-012
  it('GM-012: getReplay returns all events, snapshots, and duration', () => {
    const obs = createObserver('match-1');
    observeEvent(obs, makeEvent(1));
    takeSnapshot(obs, 1, { a1: 5 }, ['a1']);
    endObservation(obs);

    const replay = getReplay(obs);
    expect(replay.events).toHaveLength(1);
    expect(replay.snapshots).toHaveLength(1);
    expect(replay.duration).toBeGreaterThanOrEqual(0);
  });

  // GM-013
  it('GM-013: updateLeaderboard tracks wins and losses', () => {
    const agents = [makeAgent('a1'), makeAgent('a2')];
    const result: MatchResult = {
      matchId: 'match-1',
      winner: 'a1',
      scores: new Map([['a1', 20], ['a2', 10]]),
      events: [],
      violations: [],
      decisions: [],
      rounds: 5,
      durationMs: 1000,
      status: 'completed',
    };

    updateLeaderboard(result, agents);
    const lb = getLeaderboard();

    expect(lb).toHaveLength(2);
    const a1Entry = lb.find((e) => e.agentId === 'a1');
    expect(a1Entry!.wins).toBe(1);
    expect(a1Entry!.losses).toBe(0);
    expect(a1Entry!.score).toBe(20);
  });

  // GM-014
  it('GM-014: getLeaderboard returns entries sorted by score descending', () => {
    const agents = [makeAgent('a1'), makeAgent('a2')];
    const result: MatchResult = {
      matchId: 'm1',
      winner: 'a2',
      scores: new Map([['a1', 5], ['a2', 30]]),
      events: [],
      violations: [],
      decisions: [],
      rounds: 3,
      durationMs: 500,
      status: 'completed',
    };

    updateLeaderboard(result, agents);
    const lb = getLeaderboard();
    expect(lb[0].agentId).toBe('a2');
    expect(lb[1].agentId).toBe('a1');
  });

  // GM-015
  it('GM-015: clearLeaderboard resets the leaderboard', () => {
    const agents = [makeAgent('a1')];
    const result: MatchResult = {
      matchId: 'm1',
      winner: 'a1',
      scores: new Map([['a1', 10]]),
      events: [],
      violations: [],
      decisions: [],
      rounds: 1,
      durationMs: 100,
      status: 'completed',
    };
    updateLeaderboard(result, agents);
    expect(getLeaderboard()).toHaveLength(1);

    clearLeaderboard();
    expect(getLeaderboard()).toHaveLength(0);
  });
});
