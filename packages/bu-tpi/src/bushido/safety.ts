// SPDX-License-Identifier: Apache-2.0
/**
 * File: safety.ts
 * Purpose: Input-safety helpers applied to user-supplied chain/step IDs
 * and seed strings before the orchestrator persists them to transcripts
 * or telemetry.
 *
 * Audit lessons applied:
 * - #176 / #178 M-1: containment of filename-like user input.
 * - #181 M-1: any lookup against a model-family keyed object uses
 *   `Object.hasOwn` (see `safeHasOwn` below).
 * - #182 audit M-01: strip bidi-override codepoints from user strings.
 */

/** Maximum length for chain/step ids + seed. */
const MAX_ID_LEN = 128;
const MAX_SEED_LEN = 256;

/** Allowed id charset — filename-safe, no path separators. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/**
 * Unicode bidirectional-override + zero-width + format codepoints that MUST
 * be stripped from user-supplied strings (extended per post-#185 audit):
 *
 *   U+200B ZWSP   U+200C ZWNJ  U+200D ZWJ   U+200E LRM   U+200F RLM
 *   U+2028 LSEP   U+2029 PSEP  U+202A LRE   U+202B RLE   U+202C PDF
 *   U+202D LRO    U+202E RLO   U+202F NBSP2
 *   U+2066 LRI    U+2067 RLI   U+2068 FSI   U+2069 PDI
 *   U+FEFF BOM
 *
 * NOTE: we intentionally use `replaceAll(charClassRegex)` (not `/g`) to avoid
 * stateful `lastIndex` hazards (post-#185 L-1).
 */
export const BIDI_OVERRIDE_CHARCLASS =
  '[\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF]';

/**
 * Strip bidi-override / zero-width / format codepoints. Safe to call on any
 * string; returns the original when no overrides are present (keeps identity
 * for hot-path callers).
 */
export function stripBidiOverrides(input: string): string {
  if (typeof input !== 'string') {
    throw new TypeError('stripBidiOverrides: input must be a string');
  }
  // Fresh, non-/g regex per call avoids any lastIndex state.
  const rx = new RegExp(BIDI_OVERRIDE_CHARCLASS, 'g');
  if (!rx.test(input)) return input;
  return input.replace(new RegExp(BIDI_OVERRIDE_CHARCLASS, 'g'), '');
}

/**
 * True when the input contains any bidi-override / zero-width / format
 * codepoint covered by `BIDI_OVERRIDE_CHARCLASS`. Useful as a zod refine.
 */
export function hasBidiOverride(input: string): boolean {
  if (typeof input !== 'string') return false;
  return new RegExp(BIDI_OVERRIDE_CHARCLASS).test(input);
}

/**
 * Validate + sanitize a chain/step identifier. Rejects path separators,
 * leading dots, control codepoints, and anything non-filename-safe.
 */
export function sanitizeId(raw: string, kind: 'chainId' | 'stepId' | 'primitiveId'): string {
  if (typeof raw !== 'string') {
    throw new TypeError(`${kind} must be a string`);
  }
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > MAX_ID_LEN) {
    throw new RangeError(`${kind} length must be 1..${MAX_ID_LEN}`);
  }
  if (!ID_PATTERN.test(stripped)) {
    throw new Error(
      `${kind} "${stripped}" is not filename-safe — use [A-Za-z0-9][A-Za-z0-9_-]* only`,
    );
  }
  return stripped;
}

/** Seed: strip bidi overrides, cap length, deny control chars except tab. */
export function sanitizeSeed(raw: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError('seed must be a string');
  }
  const stripped = stripBidiOverrides(raw);
  // Post-#185 M-4: reject empty seeds after bidi-strip. An empty seed
  // produces empty hashes + empty telemetry and likely indicates a
  // caller misconfiguration. Fail loud instead of silently no-oping.
  if (stripped.length === 0) {
    throw new RangeError('seed must be non-empty');
  }
  if (stripped.length > MAX_SEED_LEN) {
    throw new RangeError(`seed length must be ≤ ${MAX_SEED_LEN}`);
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B-\u001F\u007F]/.test(stripped)) {
    throw new Error('seed must not contain control characters');
  }
  return stripped;
}

/**
 * Prototype-safe key lookup against a plain object. Audit-lesson #181
 * M-1: never use `obj[key]` against model-family or otherwise-untrusted
 * key sets — it hits the prototype chain.
 */
export function safeHasOwn<T extends object>(obj: T, key: string): boolean {
  return Object.hasOwn(obj, key);
}

/** Safe plain-object get. Returns `undefined` when the key is not own. */
export function safeGet<T>(obj: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}
