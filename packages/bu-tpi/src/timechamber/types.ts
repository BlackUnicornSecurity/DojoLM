/**
 * H18.1: Time Chamber — Temporal Attack Types
 * Type definitions for multi-turn temporal attack simulation.
 */

// --- Temporal Attack Types ---

export const TEMPORAL_ATTACK_TYPES = [
  'accumulation',
  'delayed_activation',
  'session_persistence',
  'context_overflow',
  'persona_drift',
] as const;

export type TemporalAttackType = (typeof TEMPORAL_ATTACK_TYPES)[number];

// --- Constants ---

export const MAX_TURNS = 50;
export const DEFAULT_TURNS = 10;
export const DEFAULT_RATE_LIMIT = 1;
export const MAX_CONTENT_LENGTH = 10_000;
export const SPENDING_CAP_DEFAULT = 5.0;

// --- Turn & Plan ---

export interface Turn {
  readonly index: number;
  readonly role: 'attacker' | 'system';
  readonly content: string;
  readonly purpose: string;
}

export interface ConversationPlan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: TemporalAttackType;
  readonly turns: Turn[];
  readonly maxTurns: number;
  readonly expectedActivationTurn: number | null;
  readonly estimatedCost: number;
}

// --- Execution Results ---

export interface ExecutedTurn {
  readonly index: number;
  readonly role: 'attacker' | 'system';
  readonly sentContent: string;
  readonly receivedContent: string;
  readonly scanResult: { readonly verdict: string; readonly findings: string[] } | null;
  readonly isActivation: boolean;
}

export interface TimeChamberResult {
  readonly planId: string;
  readonly modelId: string;
  readonly turns: ExecutedTurn[];
  readonly activationDetected: boolean;
  readonly activationTurn: number | null;
  readonly totalTurns: number;
  readonly elapsed: number;
  readonly findings: string[];
}

// --- Simulator Configuration ---

export interface SimulatorConfig {
  readonly rateLimit: number;
  readonly maxTurns: number;
  readonly timeoutMs: number;
  readonly spendingCapUsd: number;
}

export const DEFAULT_SIMULATOR_CONFIG: SimulatorConfig = {
  rateLimit: DEFAULT_RATE_LIMIT,
  maxTurns: DEFAULT_TURNS,
  timeoutMs: 30_000,
  spendingCapUsd: SPENDING_CAP_DEFAULT,
};
