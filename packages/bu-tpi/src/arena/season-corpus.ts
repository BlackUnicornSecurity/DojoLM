// SPDX-License-Identifier: Apache-2.0
/**
 * File: season-corpus.ts
 * Purpose: Gap 11.5 — immutable corpus snapshot for arena seasons.
 * Story: Industry-tools parity plan §11.5 (lines 756–777)
 *
 * A `SeasonCorpus` is a frozen reference to the exact jailbreaks (Gap 11.1
 * per-model buckets) + dialects (Gap 7) that are valid for one season.
 * Once a season moves to `active`, its corpus is fixed — the canonical
 * `contentHash` is computed at snapshot time and callers can re-verify
 * the hash at close/archive time to detect tampering.
 *
 * This module is intentionally free of I/O. Callers (e.g. `createSeason`)
 * pass already-loaded references — keeping the module deterministic and
 * unit-testable without filesystem fixtures.
 *
 * Security (post-#176 lesson):
 * - `jailbreakRef.contentHash` must be a non-empty sha256-shaped hex string.
 * - `dialectId` must match the kotoba id grammar ([a-z0-9][a-z0-9._-]*).
 * - Duplicate refs are rejected — seasons must expose a canonical corpus.
 */

import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One jailbreak-corpus row inside a season snapshot. Mirrors the minimum
 * identifying fields from `JailbreakEntry` so the snapshot remains valid
 * even if the on-disk manifest gets mutated or re-ingested later.
 */
export interface JailbreakCorpusRef {
  readonly filename: string;
  readonly targetModel: string;
  readonly contentHash: string;
}

/**
 * One dialect-id reference inside a season snapshot. Dialect generators
 * are deterministic for a fixed ruleset, so an id is sufficient.
 */
export interface DialectCorpusRef {
  readonly dialectId: string;
}

export interface SeasonCorpus {
  readonly jailbreaks: readonly JailbreakCorpusRef[];
  readonly dialects: readonly DialectCorpusRef[];
  /**
   * Canonical sha256 over the corpus contents. Callers compare this at
   * season close/archive to verify nothing mutated the snapshot in flight.
   */
  readonly contentHash: string;
}

export interface SeasonCorpusInput {
  readonly jailbreaks: readonly JailbreakCorpusRef[];
  readonly dialects: readonly DialectCorpusRef[];
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const DIALECT_ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;

// Reject anything that could smuggle control chars into audit logs.
// Consistent with scanner-profile.ts post-#176 filename guards.
function isSafeFilename(filename: string): boolean {
  if (typeof filename !== 'string') return false;
  if (filename.length === 0 || filename.length > 256) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;
  if (filename === '.' || filename === '..') return false;
  if (filename.startsWith('.')) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(filename)) return false;
  return true;
}

function isSafeTargetModel(modelId: string): boolean {
  if (typeof modelId !== 'string') return false;
  if (modelId.length === 0 || modelId.length > 64) return false;
  return /^[a-z0-9][a-z0-9._-]*$/i.test(modelId);
}

function isSafeDialectId(dialectId: string): boolean {
  if (typeof dialectId !== 'string') return false;
  if (dialectId.length === 0 || dialectId.length > 64) return false;
  return DIALECT_ID_RE.test(dialectId);
}

function validateJailbreak(ref: JailbreakCorpusRef, index: number): void {
  if (!ref || typeof ref !== 'object') {
    throw new Error(`jailbreaks[${index}]: must be an object`);
  }
  if (!isSafeFilename(ref.filename)) {
    throw new Error(`jailbreaks[${index}]: unsafe or empty filename`);
  }
  if (!isSafeTargetModel(ref.targetModel)) {
    throw new Error(`jailbreaks[${index}]: invalid targetModel`);
  }
  if (!SHA256_HEX_RE.test(ref.contentHash)) {
    throw new Error(`jailbreaks[${index}]: contentHash must be sha256 hex`);
  }
}

function validateDialect(ref: DialectCorpusRef, index: number): void {
  if (!ref || typeof ref !== 'object') {
    throw new Error(`dialects[${index}]: must be an object`);
  }
  if (!isSafeDialectId(ref.dialectId)) {
    throw new Error(`dialects[${index}]: invalid dialectId`);
  }
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/**
 * Canonicalise a corpus so two inputs with the same membership but
 * different ordering produce the same hash. Sort jailbreaks by
 * `${targetModel}/${filename}` and dialects by `dialectId`.
 */
function canonicalise(input: SeasonCorpusInput): {
  readonly jailbreaks: readonly JailbreakCorpusRef[];
  readonly dialects: readonly DialectCorpusRef[];
} {
  const jailbreaks = [...input.jailbreaks]
    .map((r) => ({ filename: r.filename, targetModel: r.targetModel, contentHash: r.contentHash }))
    .sort((a, b) => {
      const ka = `${a.targetModel}/${a.filename}`;
      const kb = `${b.targetModel}/${b.filename}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  const dialects = [...input.dialects]
    .map((r) => ({ dialectId: r.dialectId }))
    .sort((a, b) => (a.dialectId < b.dialectId ? -1 : a.dialectId > b.dialectId ? 1 : 0));
  return { jailbreaks, dialects };
}

function assertUnique(input: SeasonCorpusInput): void {
  const jbKeys = new Set<string>();
  for (let i = 0; i < input.jailbreaks.length; i++) {
    const r = input.jailbreaks[i];
    const key = `${r.targetModel}/${r.filename}`;
    if (jbKeys.has(key)) {
      throw new Error(`jailbreaks[${i}]: duplicate entry "${key}"`);
    }
    jbKeys.add(key);
  }
  const dKeys = new Set<string>();
  for (let i = 0; i < input.dialects.length; i++) {
    const r = input.dialects[i];
    if (dKeys.has(r.dialectId)) {
      throw new Error(`dialects[${i}]: duplicate dialectId "${r.dialectId}"`);
    }
    dKeys.add(r.dialectId);
  }
}

/**
 * Build an immutable `SeasonCorpus` snapshot from already-resolved
 * jailbreak + dialect references. Throws on invalid, duplicate, or
 * unsafe input — fail fast, before the season is persisted.
 */
export function createSeasonCorpus(input: SeasonCorpusInput): SeasonCorpus {
  if (!input || typeof input !== 'object') {
    throw new Error('createSeasonCorpus: input must be an object');
  }
  if (!Array.isArray(input.jailbreaks)) {
    throw new Error('createSeasonCorpus: jailbreaks must be an array');
  }
  if (!Array.isArray(input.dialects)) {
    throw new Error('createSeasonCorpus: dialects must be an array');
  }
  input.jailbreaks.forEach(validateJailbreak);
  input.dialects.forEach(validateDialect);
  assertUnique(input);

  const canon = canonicalise(input);
  const contentHash = hashCorpus(canon);

  return Object.freeze({
    jailbreaks: Object.freeze(canon.jailbreaks.map((r) => Object.freeze({ ...r }))),
    dialects: Object.freeze(canon.dialects.map((r) => Object.freeze({ ...r }))),
    contentHash,
  });
}

/**
 * Recompute the canonical hash for a `SeasonCorpus`. Callers use this to
 * verify immutability at season-close/archive boundaries.
 */
export function hashCorpus(input: SeasonCorpusInput): string {
  const canon = canonicalise(input);
  const h = createHash('sha256');
  h.update('jailbreaks:');
  for (const r of canon.jailbreaks) {
    h.update(`${r.targetModel}|${r.filename}|${r.contentHash.toLowerCase()};`);
  }
  h.update('dialects:');
  for (const r of canon.dialects) {
    h.update(`${r.dialectId};`);
  }
  return h.digest('hex');
}

/**
 * Verify a corpus snapshot still matches the hash it was built with.
 * Returns true on match.
 */
export function verifyCorpus(corpus: SeasonCorpus): boolean {
  return hashCorpus(corpus) === corpus.contentHash;
}
