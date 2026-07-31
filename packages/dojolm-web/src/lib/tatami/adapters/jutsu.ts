// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/adapters/jutsu — maps a Jutsu model-registry entry into a Tatami proof
 * (OSS, Epic 11 / P2.2).
 *
 * Jutsu is the model REGISTRY / resilience surface — its native record is a
 * model identity (`provider` / `model` / `id`) plus an operator-attested
 * `safetyRisk` class. This adapter is a READ-ONLY mapper: a registry entry
 * becomes a proof of MODEL IDENTITY, never a measurement.
 *
 * Two honesty properties hold BY CONSTRUCTION:
 *   1. No overclaim. `safetyRisk` is OPERATOR-ATTESTED, not a measured signal
 *      (the registry's own code flags self-attested risk as "looks like
 *      measurement but isn't"). So the proof is maturity `stub`, trust floored
 *      draft/local, `not_replayable`, carries NO `severity`, and the summary
 *      states the risk class is operator-attested. The real AIVSS measurement
 *      field is deliberately NOT read here.
 *   2. No secret leak. The model/provider identifiers are length-bounded and
 *      run through {@link looksLikeSecret}; a value shaped like a bearer/key is
 *      dropped rather than echoed into `modelRef`/`providerRef` or the summary.
 *
 * The clean model identity is recorded in the P1.9 provenance fields
 * (`modelRef` / `providerRef`) — this is the model-bearing adapter those fields
 * were designed for. Pure + deterministic: no I/O, no clock, no secrets.
 */

import { classifyReplaySafety } from '../replay-safety';
import {
  MAX_TATAMI_MODEL_REF_LEN,
  MAX_TATAMI_PROVIDER_REF_LEN,
  looksLikeSecret,
} from '../types';
import type { TatamiProof, TatamiSourceAdapter, TatamiTraceEvent } from '../types';

/**
 * The bounded subset of a Jutsu `SafeModelConfig` the adapter reads. Re-declared
 * locally (like the sister per-module `aivss-mapping` files) to keep the adapter
 * pure and to EXCLUDE the free-text `name` and the `aivss` measurement object
 * from the readable surface. All fields optional: a malformed record degrades,
 * never throws (Epic-1 conformance).
 */
export interface JutsuModelRecord {
  readonly id?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly enabled?: boolean;
  /** Operator-attested resilience class (CRITICAL/HIGH/MEDIUM/LOW/SAFE, case-insensitive). */
  readonly safetyRisk?: string;
}

const MAX_JUTSU_ID_LEN = 200;

/** Closed attested-risk enum (UPPERCASE) — an unrecognised value is dropped, not echoed. */
const JUTSU_RISK_LEVELS: ReadonlySet<string> = new Set([
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'SAFE',
]);

/**
 * Replay-safety for a Jutsu model-registry proof — a CONSTANT. A registry entry
 * is a declared identity (maturity `stub`) with no captured input to replay → it
 * is `not_replayable` (`stub_or_fixture_only` + `missing_prompt_snapshot`).
 */
const JUTSU_REPLAY_SAFETY = classifyReplaySafety({ hasPromptSnapshot: false, maturity: 'stub' });

/** Non-empty + length-bounded; `undefined` when absent/blank. */
function boundedNonEmpty(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/** A bounded identifier that is NOT shaped like a secret/bearer; else `undefined`. */
function safeIdentifier(value: unknown, max: number): string | undefined {
  const bounded = boundedNonEmpty(value, max);
  return bounded && !looksLikeSecret(bounded) ? bounded : undefined;
}

/** Uppercase + closed-enum validate an attested risk; `undefined` when unrecognised. */
function normalizeRisk(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const upper = value.toUpperCase();
  return JUTSU_RISK_LEVELS.has(upper) ? upper : undefined;
}

function enabledNote(enabled: boolean | undefined): string {
  if (enabled === false) return ' (disabled)';
  if (enabled === true) return ' (enabled)';
  return '';
}

export const jutsuAdapter: TatamiSourceAdapter<JutsuModelRecord> = {
  module: 'jutsu',

  toProof(record: JutsuModelRecord): Partial<TatamiProof> {
    // `id` is secret-guarded like provider/model: it reaches `title` and
    // `source.evidenceId`, which `isTatamiProof` does NOT backstop.
    const id = safeIdentifier(record.id, MAX_JUTSU_ID_LEN);
    const provider = safeIdentifier(record.provider, MAX_TATAMI_PROVIDER_REF_LEN);
    const model = safeIdentifier(record.model, MAX_TATAMI_MODEL_REF_LEN);
    const risk = normalizeRisk(record.safetyRisk);
    const identity = `${provider ?? 'unknown provider'} / ${model ?? 'unknown model'}`;
    const riskNote = risk ? `; operator-attested resilience class ${risk}` : '';

    return {
      source: {
        module: 'jutsu',
        route: '/admin/jutsu',
        ...(id ? { evidenceId: id } : {}),
      },
      title: id ? `Jutsu model ${id}` : model ? `Jutsu model — ${model}` : 'Jutsu model',
      summary: `Jutsu registry entry: ${identity}${enabledNote(record.enabled)}${riskNote}. Model identity only — not a measurement.`,
      // No payload to redact — a registry entry is clean model identity.
      previews: [],
      // A declared registry entry is not a captured measurement.
      maturity: 'stub',
      // Floored: the adapter anchors nothing. The receipt layer adds the B7 chain.
      trustState: 'draft',
      trustTier: 'local',
      // The config record reproduces identically when re-read.
      reproducibility: 'deterministic',
      // Honest replay state (see JUTSU_REPLAY_SAFETY).
      replaySafety: JUTSU_REPLAY_SAFETY.safety,
      replaySafetyReasons: JUTSU_REPLAY_SAFETY.reasons,
      retentionClass: 'standard',
      legalHold: false,
      // Registry entries carry no operator attribution in the safe shape.
      capturedBy: 'unknown',
      // The safe registry shape carries no creation timestamp.
      createdAt: '',
      // P1.9 provenance — opaque, secret-guarded model identity. `severity` is
      // intentionally absent: the attested risk class is not a finding severity.
      ...(model ? { modelRef: model } : {}),
      ...(provider ? { providerRef: provider } : {}),
    };
  },

  toTrace(record: JutsuModelRecord): readonly TatamiTraceEvent[] {
    const id = safeIdentifier(record.id, MAX_JUTSU_ID_LEN) ?? 'unknown';
    const provider = safeIdentifier(record.provider, MAX_TATAMI_PROVIDER_REF_LEN) ?? 'unknown';
    const model = safeIdentifier(record.model, MAX_TATAMI_MODEL_REF_LEN) ?? 'unknown';
    const risk = normalizeRisk(record.safetyRisk);
    const isHigh = risk === 'CRITICAL' || risk === 'HIGH';
    return [
      {
        id: `${id}:evidence.written`,
        ts: '',
        type: 'evidence.written',
        level: isHigh ? 'warn' : 'info',
        source: 'jutsu',
        message: `Jutsu model registry entry: ${provider}/${model}${risk ? ` (attested ${risk})` : ''}`,
        details: {
          provider,
          model,
          enabled: record.enabled === true,
          ...(risk ? { safetyRisk: risk } : {}),
        },
      },
    ];
  },
};
