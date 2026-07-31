// SPDX-License-Identifier: Apache-2.0
/**
 * File: dialect-api.ts
 * Purpose: Gap 7 public API — `applyDialect` + `rankDialects`.
 * Story: Industry-tools parity plan §Gap 7 (lines 468–490).
 *
 * This module is the single entry point for Gap 7 callers (Gap 11.1
 * haiku heuristic, Gap 11.3 backfill, arena probe runners). It:
 *   1. Clamps intensity and enforces input-length cap.
 *   2. Dispatches to the correct dialect in `dialects/`.
 *   3. Emits `kotoba.dialect.applied` when a telemetry hook is supplied.
 *   4. Ranks dialects via an injectable judge (Gap 1 attacker tier at
 *      the call site; a deterministic fallback keeps unit tests hermetic).
 */

import type {
  DialectAppliedTelemetry,
  DialectIntensity,
  DialectJudge,
  DialectRankedTelemetry,
  DialectRanking,
  KotobaDialect,
  TargetSignature,
} from './dialect-types.js';
import { KOTOBA_DIALECTS, MAX_DIALECT_INPUT_LENGTH, clampIntensity } from './dialect-types.js';
import { DIALECT_REGISTRY, getDialect, isKotobaDialect } from './dialects/index.js';
import { deterministicJudge } from './dialect-scorer.js';

// ---------------------------------------------------------------------------
// applyDialect
// ---------------------------------------------------------------------------

export interface ApplyDialectOptions {
  readonly onTelemetry?: (event: DialectAppliedTelemetry) => void;
}

/**
 * Apply a single dialect at a given intensity. Pure (modulo telemetry).
 * Throws for unknown dialects (callers should guard with `isKotobaDialect`).
 * Silently truncates inputs above `MAX_DIALECT_INPUT_LENGTH` to avoid
 * amplifying a malicious-size payload.
 */
export function applyDialect(
  payload: string,
  dialect: KotobaDialect,
  intensity: DialectIntensity,
  opts: ApplyDialectOptions = {},
): string {
  if (typeof payload !== 'string') {
    throw new TypeError('applyDialect: payload must be a string');
  }
  if (!isKotobaDialect(dialect as string)) {
    throw new Error(`applyDialect: unknown dialect "${String(dialect)}"`);
  }
  const safe =
    payload.length > MAX_DIALECT_INPUT_LENGTH
      ? payload.slice(0, MAX_DIALECT_INPUT_LENGTH)
      : payload;

  const gen = getDialect(dialect);
  const t = clampIntensity(intensity);
  const out = gen.apply(safe, t);

  if (opts.onTelemetry) {
    opts.onTelemetry({
      type: 'kotoba.dialect.applied',
      dialectId: dialect,
      intensity: t,
      inputLength: safe.length,
      outputLength: out.length,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// rankDialects
// ---------------------------------------------------------------------------

export interface RankDialectsOptions {
  /**
   * Injected judge. When absent, the deterministic fallback in
   * `dialect-scorer.ts` is used — Gap 1 attacker-tier integration is the
   * *call site's* responsibility (it owns the budget ledger).
   */
  readonly judge?: DialectJudge;
  /** Intensity to evaluate each dialect at. Default 0.5. */
  readonly intensity?: DialectIntensity;
  /** Telemetry sink (optional). */
  readonly onTelemetry?: (event: DialectRankedTelemetry) => void;
  /** Optional subset — defaults to all shipped dialects. */
  readonly candidates?: readonly KotobaDialect[];
}

/**
 * Rank every dialect by predicted evasion score against a target.
 * Returns sorted descending by score; ties broken by stable dialect
 * enumeration order (KOTOBA_DIALECTS).
 */
export async function rankDialects(
  payload: string,
  target: TargetSignature,
  opts: RankDialectsOptions = {},
): Promise<readonly DialectRanking[]> {
  if (typeof payload !== 'string') {
    throw new TypeError('rankDialects: payload must be a string');
  }
  const judge = opts.judge ?? deterministicJudge;
  const intensity = clampIntensity(opts.intensity ?? 0.5);
  const candidates = opts.candidates ?? KOTOBA_DIALECTS;

  // Score every candidate in parallel. Judge must be side-effect-free.
  const scored = await Promise.all(
    candidates.map(async (dialect): Promise<DialectRanking> => {
      const score = await judge.score(payload, target, dialect);
      const bounded = Number.isFinite(score) ? Math.min(1, Math.max(0, score)) : 0;
      return {
        dialect,
        score: bounded,
        reason: judgeReasonFor(dialect, target),
        intensity,
      };
    }),
  );

  // Stable sort: primary by score desc, tiebreak by enum order.
  const orderIndex = new Map<KotobaDialect, number>(
    KOTOBA_DIALECTS.map((d, i) => [d, i]),
  );
  const ranked = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (orderIndex.get(a.dialect)! - orderIndex.get(b.dialect)!);
  });

  if (opts.onTelemetry) {
    for (const r of ranked) {
      opts.onTelemetry({
        type: 'kotoba.dialect.ranked',
        dialectId: r.dialect,
        score: r.score,
        targetModel: target.modelId ?? target.modelFamily,
      });
    }
  }

  return ranked;
}

/** Short, deterministic explanation used in rankings. */
function judgeReasonFor(dialect: KotobaDialect, target: TargetSignature): string {
  const fam = target.modelFamily.toLowerCase();
  return `${dialect} evaluated against ${fam}${target.modelId ? `/${target.modelId}` : ''}`;
}

// ---------------------------------------------------------------------------
// Utility: list all dialects (useful for Gap 11.3 backfill fan-out)
// ---------------------------------------------------------------------------

export function listDialects(): readonly KotobaDialect[] {
  return KOTOBA_DIALECTS;
}

export { DIALECT_REGISTRY };
