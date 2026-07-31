// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/arena — maps an Arena match result into a Tatami proof (OSS, Epic 11 / P2.2).
 *
 * Arena is the red-team battle surface — warriors (agents/models) fight in
 * matches refereed by the runner. The native record is a {@link ArenaMatchRecord}
 * — a bounded summary of a completed match (winner / rounds / violations + a
 * referee-OBSERVED severity band). This adapter is a READ-ONLY mapper.
 *
 * Honesty / safety properties held BY CONSTRUCTION:
 *   1. No payload reaches a proof. The bounded record excludes the match
 *      `events[]` / `action` strings (where the operative attack prompts live);
 *      the adapter reads only outcome scalars + the warrior id, which is
 *      length-bounded AND `looksLikeSecret`-guarded (a warrior id may be a model
 *      id) before it reaches any proof/trace field.
 *   2. Honest, not over- or under-claimed. The severity is a REFEREE-OBSERVED
 *      band (an observed verdict, not self-attestation), so it maps to the proof
 *      `severity`. A match is one stochastic LLM battle → `stochastic-single`
 *      reproducibility, and re-running it launches a live attack → `not_replayable`.
 *
 * Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import { looksLikeSecret } from '../types';
import type { TatamiProof, TatamiSourceAdapter, TatamiTraceEvent } from '../types';

/**
 * The bounded subset of an Arena match the adapter reads. Re-declared locally
 * (like the sister per-module `aivss-mapping` files) to keep the adapter pure
 * and to EXCLUDE the match `events[]` / `action` payload strings from the
 * readable surface. All fields optional: a malformed record degrades, never
 * throws (Epic-1 conformance).
 */
export interface ArenaMatchRecord {
  readonly id?: string;
  /** Winner warrior id, or `null`/absent for a draw / no result. */
  readonly winner?: string | null;
  readonly rounds?: number;
  readonly violationCount?: number;
  /** Referee-observed severity band (critical/high/medium/low, case-insensitive). */
  readonly severity?: string;
  /** RFC-3339 UTC match timestamp. */
  readonly ts?: string;
}

const MAX_ARENA_ID_LEN = 128;
/** Warrior id bound — its own constant (a warrior id is neither a model nor a provider ref). */
const MAX_ARENA_WARRIOR_LEN = 128;
/** A severity band is a short word; reject anything implausibly long before normalising. */
const MAX_ARENA_SEVERITY_LEN = 32;

/** Closed Arena severity enum (lowercase) — an unrecognised value is dropped. */
const ARENA_SEVERITY_LEVELS: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low']);

/**
 * Replay-safety for an Arena match proof — a CONSTANT. The match prompts are not
 * captured in the summary (no snapshot) and replaying the battle re-runs the
 * attack against live fighters (a real side effect, EE-gated) → `not_replayable`.
 */
const ARENA_REPLAY_SAFETY = classifyReplaySafety({
  hasPromptSnapshot: false,
  maturity: 'live',
  liveSideEffectRisk: true,
});

function boundedNonEmpty(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/** A bounded id that is NOT shaped like a secret/bearer; else `undefined`. */
function safeIdentifier(value: unknown, max: number): string | undefined {
  const bounded = boundedNonEmpty(value, max);
  return bounded && !looksLikeSecret(bounded) ? bounded : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeSeverity(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ARENA_SEVERITY_LEN) {
    return undefined;
  }
  const lower = value.toLowerCase();
  return ARENA_SEVERITY_LEVELS.has(lower) ? lower : undefined;
}

export const arenaAdapter: TatamiSourceAdapter<ArenaMatchRecord> = {
  module: 'arena',

  toProof(record: ArenaMatchRecord): Partial<TatamiProof> {
    const id = safeIdentifier(record.id, MAX_ARENA_ID_LEN);
    const winner = safeIdentifier(record.winner, MAX_ARENA_WARRIOR_LEN);
    const rounds = finiteNumber(record.rounds);
    const violations = finiteNumber(record.violationCount);
    const severity = normalizeSeverity(record.severity);

    const winnerNote = winner ? `: winner ${winner}` : ' (no winner)';
    const roundsNote = rounds !== undefined ? `, ${rounds} round(s)` : '';
    const violationsNote = violations !== undefined ? `, ${violations} rule violation(s)` : '';

    return {
      source: {
        module: 'arena',
        route: '/api/arena/matches',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Arena match ${id}` : 'Arena match',
      summary: `Arena match${winnerNote}${roundsNote}${violationsNote}. Combat outcome summary — payload withheld.`,
      // Referee-observed band — an observed verdict, not self-attestation.
      ...(severity ? { severity } : {}),
      // No payload in the summary — the match events are not read.
      previews: [],
      // A completed match is a real combat observation.
      maturity: 'live',
      // Floored: the adapter anchors nothing. The receipt layer adds the B7 chain.
      trustState: 'draft',
      trustTier: 'local',
      // A single LLM battle is one stochastic observation, not characterized.
      reproducibility: 'stochastic-single',
      // Honest replay state (see ARENA_REPLAY_SAFETY).
      replaySafety: ARENA_REPLAY_SAFETY.safety,
      replaySafetyReasons: ARENA_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      capturedBy: 'unknown',
      // Secret-guarded like the identifiers: a mis-populated `ts` can't echo a token.
      createdAt: safeIdentifier(record.ts, MAX_ARENA_ID_LEN) ?? '',
    };
  },

  toTrace(record: ArenaMatchRecord): readonly TatamiTraceEvent[] {
    const id = safeIdentifier(record.id, MAX_ARENA_ID_LEN) ?? 'unknown';
    const winner = safeIdentifier(record.winner, MAX_ARENA_WARRIOR_LEN);
    const rounds = finiteNumber(record.rounds);
    const violations = finiteNumber(record.violationCount);
    const severity = normalizeSeverity(record.severity);
    const isHigh = severity === 'critical' || severity === 'high';
    return [
      {
        id: `${id}:evaluator.verdict`,
        ts: safeIdentifier(record.ts, MAX_ARENA_ID_LEN) ?? '',
        type: 'evaluator.verdict',
        level: isHigh ? 'warn' : 'info',
        source: 'arena',
        message: `Arena match ${id}: ${winner ? `winner ${winner}` : 'no winner'}${rounds !== undefined ? `, ${rounds} round(s)` : ''}`,
        details: {
          ...(winner ? { winner } : {}),
          ...(rounds !== undefined ? { rounds } : {}),
          ...(violations !== undefined ? { violations } : {}),
          ...(severity ? { severity } : {}),
        },
      },
    ];
  },
};
