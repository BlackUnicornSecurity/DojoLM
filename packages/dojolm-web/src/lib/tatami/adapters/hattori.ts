// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/hattori — maps a Hattori hardening weakness into a Tatami proof
 * (OSS, Epic 11 / P2.2 COULD-tier).
 *
 * Hattori is the prompt-HARDENING surface (`/api/guard/hardening`): it analyses a
 * prompt and reports DEFENSIVE weaknesses (gaps in the prompt's own hardening).
 * This adapter is a READ-ONLY mapper. A weakness is a deterministic, rule-based
 * analysis finding — NOT an attack payload — so there is no `attack_technique`
 * preview; the analysed prompt is excluded from the bounded record entirely, and
 * the proof references the weakness by id + severity only.
 *
 * Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import { looksLikeSecret } from '../types';
import type { TatamiProof, TatamiSourceAdapter, TatamiTraceEvent } from '../types';

/**
 * The bounded subset of a Hattori `HardeningWeakness` the adapter reads.
 * Re-declared locally (like the sister per-module `aivss-mapping` files) to keep
 * the adapter pure and to EXCLUDE the analysed prompt + any free-text message
 * from the readable surface. All fields optional: a malformed record degrades,
 * never throws (Epic-1 conformance).
 */
export interface HattoriWeaknessRecord {
  readonly id?: string;
  /** Weakness severity band (critical/high/medium/low, case-insensitive). */
  readonly severity?: string;
  /** RFC-3339 UTC timestamp. */
  readonly ts?: string;
}

const MAX_HATTORI_ID_LEN = 128;
const HATTORI_SEVERITY_LEVELS: ReadonlySet<string> = new Set(['critical', 'high', 'medium', 'low']);

/**
 * Replay-safety for a Hattori weakness proof — a CONSTANT. The analysed prompt
 * is not captured (no snapshot) → `not_replayable` / `missing_prompt_snapshot`.
 * Re-running the analysis is deterministic and has no live side effect, so no
 * `live_side_effect_risk` is claimed.
 */
const HATTORI_REPLAY_SAFETY = classifyReplaySafety({ hasPromptSnapshot: false, maturity: 'live' });

function boundedNonEmpty(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function safeIdentifier(value: unknown, max: number): string | undefined {
  const bounded = boundedNonEmpty(value, max);
  return bounded && !looksLikeSecret(bounded) ? bounded : undefined;
}

function normalizeSeverity(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > 32) return undefined;
  const lower = value.toLowerCase();
  return HATTORI_SEVERITY_LEVELS.has(lower) ? lower : undefined;
}

export const hattoriAdapter: TatamiSourceAdapter<HattoriWeaknessRecord> = {
  module: 'hattori',

  toProof(record: HattoriWeaknessRecord): Partial<TatamiProof> {
    const id = safeIdentifier(record.id, MAX_HATTORI_ID_LEN);
    const severity = normalizeSeverity(record.severity);

    return {
      source: {
        module: 'hattori',
        route: '/api/guard/hardening',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Hattori weakness ${id}` : 'Hattori hardening weakness',
      summary: `Hattori prompt-hardening weakness${severity ? `, severity ${severity}` : ''}. Defensive finding — analysed prompt withheld.`,
      ...(severity ? { severity } : {}),
      // Defensive analysis finding — no operative payload to preview.
      previews: [],
      maturity: 'live',
      trustState: 'draft',
      trustTier: 'local',
      // Rule-based hardening analysis is deterministic.
      reproducibility: 'deterministic',
      replaySafety: HATTORI_REPLAY_SAFETY.safety,
      replaySafetyReasons: HATTORI_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      capturedBy: 'unknown',
      createdAt: safeIdentifier(record.ts, MAX_HATTORI_ID_LEN) ?? '',
    };
  },

  toTrace(record: HattoriWeaknessRecord): readonly TatamiTraceEvent[] {
    const id = safeIdentifier(record.id, MAX_HATTORI_ID_LEN) ?? 'unknown';
    const severity = normalizeSeverity(record.severity) ?? 'low';
    const isHigh = severity === 'critical' || severity === 'high';
    return [
      {
        id: `${id}:guard.checked`,
        ts: safeIdentifier(record.ts, MAX_HATTORI_ID_LEN) ?? '',
        type: 'guard.checked',
        level: isHigh ? 'warn' : 'info',
        source: 'hattori',
        message: `Hattori hardening weakness: ${id} (severity ${severity})`,
        details: { severity },
      },
    ];
  },
};
