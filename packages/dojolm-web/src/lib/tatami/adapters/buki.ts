// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/buki — maps a Buki SAGE seed into a Tatami proof (OSS, Epic 11 / P2.2).
 *
 * Buki is the SAGE adversarial mutation/seed engine. Its native record is a
 * {@link BukiSeedRecord} — a catalogued attack pattern. This adapter is a
 * READ-ONLY proof mapper (no mutation fork; the proof→live-mutation surface is
 * EE, gated on B8): it never runs a seed and never persists anything.
 *
 * TWO evidence-safety properties hold BY CONSTRUCTION:
 *   1. No free-text / payload reaches a proof. {@link BukiSeedRecord} is the
 *      bounded view of `lib/sage` `SeedRecord` and deliberately OMITS the
 *      `content` payload AND the free-text `name`/`description` — the adapter
 *      reads only the catalogue id, the closed-enum category/criticity, and the
 *      timestamp. Every readable string is id-shaped or enum-validated and
 *      length-bounded; previews record the `attack_technique` redaction class
 *      and reference the seed by catalogue id only.
 *   2. No overclaim. A bundled seed is a `fixture` (not a live observation), so
 *      trust is floored at draft/local and the replay-safety classifier marks it
 *      `not_replayable`. The seed's catalogue stats (fitness/successRate/…) are
 *      demo data and are NEVER surfaced as measured evidence.
 *
 * Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import type {
  TatamiProof,
  TatamiRedactedPreview,
  TatamiSourceAdapter,
  TatamiTraceEvent,
} from '../types';

/**
 * The bounded subset of a SAGE `SeedRecord` (`lib/sage/fixtures`) the Buki
 * adapter reads. Re-declared locally — like the sister per-module `aivss-mapping`
 * files — to keep the adapter pure and, critically, to EXCLUDE the operative
 * `content` payload AND the free-text `name`/`description` from the readable
 * surface. All fields optional: a malformed record degrades, never throws
 * (Epic-1 conformance).
 */
export interface BukiSeedRecord {
  /** Catalogue id (e.g. `SEED-002`). */
  readonly id?: string;
  /** SAGE seed category (e.g. `injection` / `jailbreak`); `unknown` when absent. */
  readonly category?: string;
  /** SAGE criticity (CRITICAL/HIGH/MEDIUM/LOW/INFO, case-insensitive). */
  readonly criticity?: string;
  /** RFC-3339 UTC creation instant. */
  readonly createdAt?: string;
}

// Field bounds — keep a hostile/corrupt record from blowing up the proof row
// before the store's MAX_ROW_BYTES even sees it.
const MAX_BUKI_ID_LEN = 64;
const MAX_BUKI_CATEGORY_LEN = 64;
const MAX_BUKI_TIMESTAMP_LEN = 64;

/** Closed criticity enum (UPPERCASE) — an unrecognised value is dropped, not echoed. */
const BUKI_CRITICITY_LEVELS: ReadonlySet<string> = new Set([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
]);

/**
 * Replay-safety for a Buki seed proof — a CONSTANT. The operative payload is not
 * captured (no prompt snapshot), the seed is a bundled `fixture`, AND replaying
 * it would re-run the attack against a live target (a real side effect, EE-gated)
 * — three independent blockers → `not_replayable`. `attack_technique` does not
 * redact-cap the verdict. None depend on the record, so it is hoisted.
 */
const BUKI_SEED_REPLAY_SAFETY = classifyReplaySafety({
  hasPromptSnapshot: false,
  maturity: 'fixture',
  liveSideEffectRisk: true,
  redactionClasses: ['attack_technique'],
});

/** Non-empty + length-bounded; `undefined` when absent/blank. */
function boundedNonEmpty(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/** Uppercase + closed-enum validate a criticity; `undefined` when unrecognised. */
function normalizeCriticity(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const upper = value.toUpperCase();
  return BUKI_CRITICITY_LEVELS.has(upper) ? upper : undefined;
}

/** A single customer-safe preview: catalogue reference only, payload withheld. */
function buildPreview(ref: string, category: string, criticity?: string): TatamiRedactedPreview {
  const crit = criticity ? `/${criticity}` : '';
  return {
    tier: 'customer_safe',
    text: `seed ${ref} · ${category}${crit}`,
    applied: ['attack_technique'],
  };
}

export const bukiAdapter: TatamiSourceAdapter<BukiSeedRecord> = {
  module: 'buki',

  toProof(record: BukiSeedRecord): Partial<TatamiProof> {
    const id = boundedNonEmpty(record.id, MAX_BUKI_ID_LEN);
    const category = boundedNonEmpty(record.category, MAX_BUKI_CATEGORY_LEN) ?? 'unknown';
    const criticity = normalizeCriticity(record.criticity);
    const ref = id ?? 'unknown';

    return {
      source: {
        module: 'buki',
        route: '/api/buki/sage/seeds',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Buki seed ${id}` : `Buki seed — ${category}`,
      summary: `Buki SAGE ${category} seed${criticity ? `, criticity ${criticity}` : ''}. Operative payload withheld (attack_technique).`,
      ...(criticity ? { severity: criticity } : {}),
      previews: [buildPreview(ref, category, criticity)],
      // A catalogued seed is a bundled adversarial artifact, not a live finding.
      maturity: 'fixture',
      // Floored: the adapter anchors nothing. The receipt layer adds the B7 chain.
      trustState: 'draft',
      trustTier: 'local',
      // The catalogue record itself reproduces identically; the operative payload
      // is not captured, and re-running the attack is blocked (not_replayable).
      reproducibility: 'deterministic',
      // Honest replay state (see BUKI_SEED_REPLAY_SAFETY).
      replaySafety: BUKI_SEED_REPLAY_SAFETY.safety,
      replaySafetyReasons: BUKI_SEED_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      // Seeds carry no operator attribution.
      capturedBy: 'unknown',
      createdAt: boundedNonEmpty(record.createdAt, MAX_BUKI_TIMESTAMP_LEN) ?? '',
    };
  },

  toTrace(record: BukiSeedRecord): readonly TatamiTraceEvent[] {
    const id = boundedNonEmpty(record.id, MAX_BUKI_ID_LEN) ?? 'unknown';
    const category = boundedNonEmpty(record.category, MAX_BUKI_CATEGORY_LEN) ?? 'unknown';
    const criticity = normalizeCriticity(record.criticity) ?? 'INFO';
    const isHigh = criticity === 'CRITICAL' || criticity === 'HIGH';
    return [
      {
        id: `${id}:evidence.written`,
        ts: boundedNonEmpty(record.createdAt, MAX_BUKI_TIMESTAMP_LEN) ?? '',
        type: 'evidence.written',
        level: isHigh ? 'warn' : 'info',
        source: 'buki',
        message: `Buki SAGE seed catalogued: ${id} (${category}/${criticity})`,
        details: { category, criticity },
      },
    ];
  },
};
