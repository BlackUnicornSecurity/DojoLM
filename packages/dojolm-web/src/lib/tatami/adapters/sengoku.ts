// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/sengoku — maps a Sengoku temporal-attack run into a Tatami
 * proof (OSS, Epic 11 / P2.2 COULD-tier).
 *
 * Sengoku is the TEMPORAL (multi-turn) attack surface
 * (`/api/sengoku/temporal/runs`): an attack run plays a staged sequence
 * (accumulation / delayed-activation / session-persistence / context-overflow /
 * persona-drift) and ends in a verdict (safe / flagged / compromised /
 * inconclusive). This adapter is a READ-ONLY mapper.
 *
 * Honesty / safety by construction:
 *   1. No payload. The bounded record excludes the staged turn sequence (the
 *      operative attack); the proof records the `attack_technique` class and
 *      references the run by id + attack type only.
 *   2. Honest claims. The Sengoku VERDICT maps to the proof `verdict` (it is a
 *      run outcome, not a severity band). A multi-turn LLM attack is one
 *      stochastic observation → `stochastic-single`, and re-running it launches
 *      a live attack → `not_replayable`.
 *
 * Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import { looksLikeSecret } from '../types';
import type {
  TatamiProof,
  TatamiRedactedPreview,
  TatamiSourceAdapter,
  TatamiTraceEvent,
} from '../types';

/**
 * The bounded subset of a Sengoku `RunRecordLite` the adapter reads. Re-declared
 * locally to keep the adapter pure and to EXCLUDE the staged turn sequence. All
 * fields optional: a malformed record degrades, never throws (Epic-1 conformance).
 */
export interface SengokuRunRecord {
  readonly id?: string;
  /** Temporal attack type (accumulation / delayed-activation / …). */
  readonly attackType?: string;
  /** Run verdict (safe / flagged / compromised / inconclusive, case-insensitive). */
  readonly verdict?: string;
  /** RFC-3339 UTC timestamp. */
  readonly ts?: string;
}

const MAX_SENGOKU_ID_LEN = 128;
const SENGOKU_ATTACK_TYPES: ReadonlySet<string> = new Set([
  'accumulation',
  'delayed-activation',
  'session-persistence',
  'context-overflow',
  'persona-drift',
]);
const SENGOKU_VERDICTS: ReadonlySet<string> = new Set([
  'safe',
  'flagged',
  'compromised',
  'inconclusive',
]);

/**
 * Replay-safety for a Sengoku run proof — a CONSTANT. The staged sequence is not
 * captured (no snapshot) and replaying re-runs the multi-turn attack against a
 * live target (a real side effect, EE-gated) → `not_replayable`.
 */
const SENGOKU_REPLAY_SAFETY = classifyReplaySafety({
  hasPromptSnapshot: false,
  maturity: 'live',
  liveSideEffectRisk: true,
});

function boundedNonEmpty(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function safeIdentifier(value: unknown, max: number): string | undefined {
  const bounded = boundedNonEmpty(value, max);
  return bounded && !looksLikeSecret(bounded) ? bounded : undefined;
}

/** Lowercase + closed-enum validate against `set`; `undefined` when unrecognised. */
function normalizeEnum(value: unknown, set: ReadonlySet<string>): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 64) return undefined;
  const lower = value.toLowerCase();
  return set.has(lower) ? lower : undefined;
}

function buildPreview(ref: string, attackType: string, verdict?: string): TatamiRedactedPreview {
  const v = verdict ? `/${verdict}` : '';
  return {
    tier: 'customer_safe',
    text: `run ${ref} · ${attackType}${v}`,
    applied: ['attack_technique'],
  };
}

export const sengokuAdapter: TatamiSourceAdapter<SengokuRunRecord> = {
  module: 'sengoku',

  toProof(record: SengokuRunRecord): Partial<TatamiProof> {
    const id = safeIdentifier(record.id, MAX_SENGOKU_ID_LEN);
    const attackType = normalizeEnum(record.attackType, SENGOKU_ATTACK_TYPES) ?? 'temporal';
    const verdict = normalizeEnum(record.verdict, SENGOKU_VERDICTS);
    const ref = id ?? 'unknown';

    return {
      source: {
        module: 'sengoku',
        route: '/api/sengoku/temporal/runs',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Sengoku temporal run ${id}` : `Sengoku temporal run — ${attackType}`,
      summary: `Sengoku ${attackType} attack run${verdict ? `, verdict ${verdict}` : ''}. Operative sequence withheld (attack_technique).`,
      // The verdict is a run OUTCOME, not a severity band — map it to `verdict`.
      ...(verdict ? { verdict } : {}),
      previews: [buildPreview(ref, attackType, verdict)],
      maturity: 'live',
      trustState: 'draft',
      trustTier: 'local',
      // A multi-turn LLM attack is one stochastic observation, not characterized.
      reproducibility: 'stochastic-single',
      replaySafety: SENGOKU_REPLAY_SAFETY.safety,
      replaySafetyReasons: SENGOKU_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      capturedBy: 'unknown',
      createdAt: safeIdentifier(record.ts, MAX_SENGOKU_ID_LEN) ?? '',
    };
  },

  toTrace(record: SengokuRunRecord): readonly TatamiTraceEvent[] {
    const id = safeIdentifier(record.id, MAX_SENGOKU_ID_LEN) ?? 'unknown';
    const attackType = normalizeEnum(record.attackType, SENGOKU_ATTACK_TYPES) ?? 'temporal';
    const verdict = normalizeEnum(record.verdict, SENGOKU_VERDICTS);
    const isHigh = verdict === 'compromised' || verdict === 'flagged';
    return [
      {
        id: `${id}:evaluator.verdict`,
        ts: safeIdentifier(record.ts, MAX_SENGOKU_ID_LEN) ?? '',
        type: 'evaluator.verdict',
        level: isHigh ? 'warn' : 'info',
        source: 'sengoku',
        message: `Sengoku temporal run ${id}: ${attackType}${verdict ? ` → ${verdict}` : ''}`,
        details: { attackType, ...(verdict ? { verdict } : {}) },
      },
    ];
  },
};
