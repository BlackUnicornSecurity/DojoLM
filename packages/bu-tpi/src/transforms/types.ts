/**
 * NINJUTSU Phase 5.3: Buff/Transform System Types
 * Composable transforms that modify attack probes before sending.
 */

export const BUFF_TYPES = [
  'encoding',
  'language',
  'structural',
  'persona',
] as const;

export type BuffType = (typeof BUFF_TYPES)[number];

/** A single transform applied to attack text */
export interface Buff {
  readonly id: string;
  readonly name: string;
  readonly type: BuffType;
  readonly description: string;
  readonly apply: (input: string) => string;
}

/** A chain of buffs applied in sequence */
export interface BuffChain {
  readonly id: string;
  readonly name: string;
  readonly buffs: readonly Buff[];
}

/** Result of applying a buff or chain */
export interface BuffResult {
  readonly original: string;
  readonly transformed: string;
  readonly buffsApplied: readonly string[];
  readonly changeCount: number;
}
