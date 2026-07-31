// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/kotoba — maps a Kotoba rubric issue into a Tatami proof
 * (OSS, Epic 11 / P2.2 COULD-tier).
 *
 * Kotoba is the prompt-RUBRIC surface (`/api/kotoba/score`): it scores a prompt
 * against a closed rubric and reports per-category QUALITY issues. This adapter
 * is a READ-ONLY mapper. A rubric issue is a deterministic, rule-based
 * prompt-quality finding — NOT an attack payload — so there is no
 * `attack_technique` preview; the scored prompt is excluded from the bounded
 * record, and the proof references the issue by id + rubric category + severity.
 *
 * Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import { looksLikeSecret } from '../types';
import type { TatamiProof, TatamiSourceAdapter, TatamiTraceEvent } from '../types';

/**
 * The bounded subset of a Kotoba `RubricIssue` the adapter reads. Re-declared
 * locally to keep the adapter pure and to EXCLUDE the scored prompt + any
 * free-text message. All fields optional: a malformed record degrades, never
 * throws (Epic-1 conformance).
 */
export interface KotobaIssueRecord {
  readonly id?: string;
  /** Rubric category (e.g. `pii-handling`); `unknown` when absent. */
  readonly category?: string;
  /** Issue severity (high/medium/low — Kotoba has no `critical`, case-insensitive). */
  readonly severity?: string;
  /** RFC-3339 UTC timestamp. */
  readonly ts?: string;
}

const MAX_KOTOBA_ID_LEN = 128;
const MAX_KOTOBA_CATEGORY_LEN = 64;
const KOTOBA_SEVERITY_LEVELS: ReadonlySet<string> = new Set(['high', 'medium', 'low']);

/**
 * Replay-safety for a Kotoba issue proof — a CONSTANT. The scored prompt is not
 * captured → `not_replayable` / `missing_prompt_snapshot`. Rubric scoring is
 * deterministic, so no `live_side_effect_risk` is claimed.
 */
const KOTOBA_REPLAY_SAFETY = classifyReplaySafety({ hasPromptSnapshot: false, maturity: 'live' });

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
  return KOTOBA_SEVERITY_LEVELS.has(lower) ? lower : undefined;
}

export const kotobaAdapter: TatamiSourceAdapter<KotobaIssueRecord> = {
  module: 'kotoba',

  toProof(record: KotobaIssueRecord): Partial<TatamiProof> {
    const id = safeIdentifier(record.id, MAX_KOTOBA_ID_LEN);
    // Secret-guarded, not merely bounded: `category` flows into the customer-safe
    // summary/title and the trace `details` ("never raw payloads").
    const category = safeIdentifier(record.category, MAX_KOTOBA_CATEGORY_LEN) ?? 'unknown';
    const severity = normalizeSeverity(record.severity);

    return {
      source: {
        module: 'kotoba',
        route: '/api/kotoba/score',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Kotoba rubric issue ${id}` : `Kotoba rubric issue — ${category}`,
      summary: `Kotoba ${category} rubric issue${severity ? `, severity ${severity}` : ''}. Prompt-quality finding — scored prompt withheld.`,
      ...(severity ? { severity } : {}),
      // Prompt-quality finding — no operative payload to preview.
      previews: [],
      maturity: 'live',
      trustState: 'draft',
      trustTier: 'local',
      // Rubric-rule scoring is deterministic.
      reproducibility: 'deterministic',
      replaySafety: KOTOBA_REPLAY_SAFETY.safety,
      replaySafetyReasons: KOTOBA_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      capturedBy: 'unknown',
      createdAt: safeIdentifier(record.ts, MAX_KOTOBA_ID_LEN) ?? '',
    };
  },

  toTrace(record: KotobaIssueRecord): readonly TatamiTraceEvent[] {
    const id = safeIdentifier(record.id, MAX_KOTOBA_ID_LEN) ?? 'unknown';
    const category = safeIdentifier(record.category, MAX_KOTOBA_CATEGORY_LEN) ?? 'unknown';
    const severity = normalizeSeverity(record.severity) ?? 'low';
    return [
      {
        id: `${id}:evaluator.verdict`,
        ts: safeIdentifier(record.ts, MAX_KOTOBA_ID_LEN) ?? '',
        type: 'evaluator.verdict',
        level: severity === 'high' ? 'warn' : 'info',
        source: 'kotoba',
        message: `Kotoba rubric issue: ${id} (${category}/${severity})`,
        details: { category, severity },
      },
    ];
  },
};
