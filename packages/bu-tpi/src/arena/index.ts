// SPDX-License-Identifier: Apache-2.0
/**
 * S59: Battle Arena - Multi-Agent Combat Simulator
 * Barrel export for all Arena modules.
 */

// Types
export type {
  AgentRole,
  MessageType,
  DecisionType,
  MatchStatus,
  AgentConfig,
  AgentResourceLimits,
  AgentSandbox,
  AgentMessage,
  SharedEnvironment,
  MatchConfig,
  MatchEvent,
  RuleViolation,
  RefereeDecision,
  ArenaRule,
  MatchResult,
  ArenaConfig,
} from './types.js';

export {
  DEFAULT_ARENA_CONFIG,
  DEFAULT_AGENT_LIMITS,
} from './types.js';

// Sandbox
export {
  createSandbox,
  executeInSandbox,
  getIsolatedState,
  setIsolatedState,
  destroySandbox,
  isWithinLimits,
} from './sandbox.js';

// Environment
export {
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

// Referee
export type { Referee } from './referee.js';
export {
  DEFAULT_RULES,
  createReferee,
  evaluateAction,
  checkViolation,
  scoreOutcome,
} from './referee.js';

// Match Runner
export type { Match, ChainTargetProbeInput } from './match-runner.js';
export {
  createMatch,
  recordEvent,
  executeRound,
  runMatch,
  getMatchStatus,
  pauseMatch,
  resumeMatch,
  acceptChainTarget,
} from './match-runner.js';

// Game Modes (S60)
export type {
  GameModeName,
  GameMode,
  ScoringRule,
  LeaderboardEntry,
  MatchObserver,
  MatchSnapshot,
} from './game-modes.js';

export {
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

// Gap 11.5 — Arena seasons (time-boxed + frozen corpus)
export type {
  JailbreakCorpusRef,
  DialectCorpusRef,
  SeasonCorpus,
  SeasonCorpusInput,
} from './season-corpus.js';
export {
  createSeasonCorpus,
  hashCorpus,
  verifyCorpus,
} from './season-corpus.js';

export type {
  Season,
  SeasonConfig,
  SeasonStatus,
  SeasonAuditEntry,
  SeasonOptions,
  SeasonTelemetryEvent,
  ScoreWrite,
  LeaderboardEntry as SeasonLeaderboardEntry,
} from './season.js';
export {
  createSeason,
  activateSeason,
  closeSeason,
  archiveSeason,
  getSeason,
  getActiveSeason,
  listSeasons,
  writeScore,
  getSeasonLeaderboard,
  getSeasonAuditLog,
} from './season.js';
