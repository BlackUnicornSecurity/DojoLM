// SPDX-License-Identifier: Apache-2.0
/**
 * File: dialect-types.ts
 * Purpose: Gap 7 — encoded-payload dialect type definitions.
 * Story: Industry-tools parity plan §Gap 7 (lines 468–490).
 *
 * These types are a SEPARATE surface from the H19 prompt-optimizer
 * (scorer/generator/rules already shipped in this module). Gap 7
 * introduces an independent dialect library for evasion testing.
 *
 * Invariants:
 * - `KotobaDialect` values are frozen strings; adding one means adding
 *   a generator in `dialects/` and exporting via `dialects/index.ts`.
 * - `intensity` is normalised to [0, 1]; generators clamp defensively.
 * - Ranking output is deterministic when the judge is deterministic.
 */

/** All eight dialects shipped in Gap 7 (spec §Gap 7). */
export const KOTOBA_DIALECTS = [
  'asciiGlyph',
  'emojiSmuggle',
  'homoglyph',
  'leetspeak',
  'zalgo',
  'rotN',
  'scaffoldInjection',
  'markdownExfil',
] as const;

export type KotobaDialect = (typeof KOTOBA_DIALECTS)[number];

/**
 * Intensity is a unit interval. 0 means "no transformation" (identity),
 * 1 means "maximum obfuscation". Each dialect maps this to its own
 * parameter (e.g. rotN maps to rotation 1–25, zalgo to diacritic density).
 */
export type DialectIntensity = number;

/**
 * Target signature used by `rankDialects` to score dialect suitability.
 * This is a typed, narrow surface — we don't want callers passing whole
 * vendor configs in.
 */
export interface TargetSignature {
  /** Model family (`claude`, `gpt`, `gemini`, etc.). Case-insensitive. */
  readonly modelFamily: string;
  /** Optional model id (`claude-opus-4-7`). */
  readonly modelId?: string;
  /** Known refusal style — shapes how dialects should be ordered. */
  readonly refusalProfile?: 'hard' | 'soft' | 'partial' | 'unknown';
  /** Observed Shingan-regex strictness, 0..1. Higher = needs stronger evasion. */
  readonly shinganStrictness?: number;
}

/**
 * A single dialect's signature generator contract. Fixed-shape: caller
 * never touches filesystem, network, or time.
 */
export interface DialectGenerator {
  readonly id: KotobaDialect;
  readonly label: string;
  /** Apply the dialect at a given intensity. Pure function. */
  readonly apply: (payload: string, intensity: DialectIntensity) => string;
  /**
   * Best-effort roundtrip decode. Some dialects (zalgo, homoglyph) are
   * lossy for punctuation/diacritics already present in the input — the
   * contract is that ASCII-letter semantics round-trip, not bytes.
   * Returns `null` when the dialect is not decodable at all.
   */
  readonly roundtrip: ((encoded: string) => string) | null;
}

/** Single rank entry returned by `rankDialects`. */
export interface DialectRanking {
  readonly dialect: KotobaDialect;
  readonly score: number; // 0..1 — higher = better predicted evasion
  readonly reason: string;
  readonly intensity: DialectIntensity;
}

/**
 * Judge interface — injected by the caller. The default deterministic
 * fallback is used when no judge is provided (see `dialect-scorer.ts`).
 * Gap 1 attacker-tier integration lives at the call site, not here —
 * Gap 7 stays tier-agnostic to avoid a runtime dependency on the LLM
 * stack during unit tests.
 */
export interface DialectJudge {
  readonly score: (
    payload: string,
    target: TargetSignature,
    dialect: KotobaDialect,
  ) => Promise<number>;
}

/** Telemetry payload for `kotoba.dialect.applied`. */
export interface DialectAppliedTelemetry {
  readonly type: 'kotoba.dialect.applied';
  readonly dialectId: KotobaDialect;
  readonly intensity: DialectIntensity;
  /**
   * Length of the pre-dialect input in JavaScript **UTF-16 code units**
   * (what `String.prototype.length` reports). Post-#181 L-1: documented
   * explicitly because this is NOT bytes and NOT Unicode code points.
   * For ASCII-only payloads the three are equivalent.
   */
  readonly inputLength: number;
  /**
   * Length of the post-dialect output in JavaScript **UTF-16 code units**
   * (see note on `inputLength`).
   */
  readonly outputLength: number;
}

/** Telemetry payload for `kotoba.dialect.ranked` (richer than events.ts — we summarise top-K at site). */
export interface DialectRankedTelemetry {
  readonly type: 'kotoba.dialect.ranked';
  readonly dialectId: KotobaDialect;
  readonly score: number;
  readonly targetModel: string;
}

/** Telemetry payload for `kotoba.dialect.st3gg_backfill` (Gap 11.3 bridge). */
export interface DialectSt3ggBackfillTelemetry {
  readonly type: 'kotoba.dialect.st3gg_backfill';
  readonly categoryId: string;
  readonly dialectId: KotobaDialect;
  readonly fixturesGenerated: number;
}

/** Hard cap for dialect inputs — matches H19 prompt-optimizer. */
export const MAX_DIALECT_INPUT_LENGTH = 50_000;

/**
 * Clamp an intensity to [0, 1]. Non-finite → 0 (safe default — identity
 * transform). Rationale: a garbled intensity should not silently amplify.
 */
export function clampIntensity(x: number): DialectIntensity {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}
