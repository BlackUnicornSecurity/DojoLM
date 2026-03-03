/**
 * S59: Battle Arena Types
 * Multi-agent battle arena sandbox type definitions.
 * All agents execute in isolated sandboxes with no real filesystem or network access.
 */

export type AgentRole = 'attacker' | 'defender' | 'observer';
export type MessageType = 'attack' | 'defense' | 'communication' | 'observation';
export type DecisionType = 'violation' | 'score' | 'elimination' | 'warning';
export type MatchStatus = 'pending' | 'running' | 'paused' | 'completed' | 'aborted';

export interface AgentConfig {
  readonly id: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly capabilities: string[];
  readonly resourceLimits: AgentResourceLimits;
}

export interface AgentResourceLimits {
  readonly maxMemoryBytes: number;
  readonly executionTimeoutMs: number;
  readonly maxMessages: number;
  readonly maxActions: number;
}

export interface AgentSandbox {
  readonly id: string;
  readonly agent: AgentConfig;
  readonly isolatedState: Map<string, unknown>;
  readonly allowedTools: string[];
  readonly executionTimeout: number;
  readonly actionCount: number;
  readonly messageCount: number;
  readonly active: boolean;
}

export interface AgentMessage {
  readonly id: string;
  readonly from: string;
  readonly to: string | 'broadcast';
  readonly content: string;
  readonly type: MessageType;
  readonly timestamp: string;
  readonly round: number;
}

export interface SharedEnvironment {
  readonly id: string;
  readonly resources: Map<string, unknown>;
  readonly tools: string[];
  readonly state: Map<string, unknown>;
  readonly messages: AgentMessage[];
}

export interface MatchConfig {
  readonly id: string;
  readonly agents: AgentConfig[];
  readonly maxRounds: number;
  readonly timeoutMs: number;
  readonly rules: ArenaRule[];
}

export interface MatchEvent {
  readonly id: string;
  readonly timestamp: string;
  readonly round: number;
  readonly agent: string;
  readonly action: string;
  readonly target: string | null;
  readonly result: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RuleViolation {
  readonly id: string;
  readonly agent: string;
  readonly rule: string;
  readonly description: string;
  readonly severity: 'warning' | 'minor' | 'major' | 'critical';
  readonly timestamp: string;
  readonly round: number;
}

export interface RefereeDecision {
  readonly type: DecisionType;
  readonly target: string;
  readonly reason: string;
  readonly timestamp: string;
  readonly round: number;
}

export interface ArenaRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly check: (event: MatchEvent) => RuleViolation | null;
}

export interface MatchResult {
  readonly matchId: string;
  readonly winner: string | null;
  readonly scores: Map<string, number>;
  readonly events: MatchEvent[];
  readonly violations: RuleViolation[];
  readonly decisions: RefereeDecision[];
  readonly rounds: number;
  readonly durationMs: number;
  readonly status: MatchStatus;
}

export interface ArenaConfig {
  readonly maxAgents: number;
  readonly maxRoundsPerMatch: number;
  readonly executionTimeoutMs: number;
  readonly memoryLimitBytes: number;
  readonly networkAccess: false;
  readonly maxMessageSize: number;
  readonly maxMessagesPerRound: number;
}

export const DEFAULT_ARENA_CONFIG: ArenaConfig = {
  maxAgents: 10,
  maxRoundsPerMatch: 100,
  executionTimeoutMs: 30_000,
  memoryLimitBytes: 256 * 1024 * 1024,
  networkAccess: false,
  maxMessageSize: 10_000,
  maxMessagesPerRound: 50,
};

export const DEFAULT_AGENT_LIMITS: AgentResourceLimits = {
  maxMemoryBytes: 256 * 1024 * 1024,
  executionTimeoutMs: 30_000,
  maxMessages: 1000,
  maxActions: 500,
};

export const MAX_INPUT_LENGTH = 500_000;
