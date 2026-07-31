// SPDX-License-Identifier: Apache-2.0
/**
 * Shared types for Temporal attack simulation components
 * Story: DAITENGUYAMA M2
 */

export interface Turn {
  readonly role: 'user' | 'assistant'
  readonly content: string
  readonly turnNumber: number
}

export type AttackType =
  | 'accumulation'
  | 'delayed-activation'
  | 'session-persistence'
  | 'context-overflow'
  | 'persona-drift'
  // ADR-0058 / WAVE7-S-NEW-ATTACKTYPES additions.
  | 'tool-poisoning'
  | 'context-smuggling'
  | 'memory-poisoning'

export interface AttackPlan {
  readonly id: string
  readonly name: string
  readonly attackType: AttackType
  readonly turns: Turn[]
  readonly description: string
}
