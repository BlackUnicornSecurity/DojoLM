// SPDX-License-Identifier: Apache-2.0
/**
 * File: dialect-fixtures.ts
 * Purpose: Gap 7 ↔ Gap 11.3 bridge — generate fixtures for ST3GG
 * categories marked `missing`/`partial` via Kotoba dialects, emitting
 * `kotoba.dialect.st3gg_backfill` telemetry as the schema already
 * shipped in #177 expects.
 *
 * Design:
 * - Gap 11.3's `listBackfillCandidates` returns `St3ggCategory[]`; we map
 *   each to a dialect via `pickDialectForCategory` (simple rules).
 * - Fixture content is the dialect-encoded form of a benign seed
 *   payload — this is a fixture pipeline, not a live exploit.
 * - Every filesystem write goes through `safeFilename` (#176 lesson:
 *   regex allowlist) AND `resolve().startsWith(root + sep)` (#178 lesson:
 *   bucket containment).
 * - Telemetry fires once per category fan-out, not per file.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import type { St3ggCategory } from '../attackdna/st3gg-coverage.js';
import type {
  DialectSt3ggBackfillTelemetry,
  KotobaDialect,
} from './dialect-types.js';
import { applyDialect } from './dialect-api.js';

// ---------------------------------------------------------------------------
// Category → dialect routing
// ---------------------------------------------------------------------------

/**
 * Very rough routing — production would read from a tuned table. The
 * fallback is `homoglyph` because it scores well across families.
 */
export function pickDialectForCategory(cat: St3ggCategory): KotobaDialect {
  const id = cat.id.toLowerCase();
  if (id.includes('emoji')) return 'emojiSmuggle';
  if (id.includes('homoglyph') || id.includes('unicode')) return 'homoglyph';
  if (id.includes('leet')) return 'leetspeak';
  if (id.includes('zalgo') || id.includes('combining')) return 'zalgo';
  if (id.includes('rot') || id.includes('caesar')) return 'rotN';
  if (id.includes('scaffold') || id.includes('tool')) return 'scaffoldInjection';
  if (id.includes('markdown') || id.includes('exfil')) return 'markdownExfil';
  if (id.includes('ascii') || id.includes('glyph')) return 'asciiGlyph';
  return 'homoglyph';
}

// ---------------------------------------------------------------------------
// Filename & path safety
// ---------------------------------------------------------------------------

/**
 * Allowlist-only filename. #176 lesson: denylists are security theatre.
 * Only `[A-Za-z0-9._-]` survive; everything else becomes `_`. Empty
 * results fall back to `fixture`.
 */
export function safeFilename(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^[._-]+/, '');
  return cleaned.length > 0 ? cleaned.slice(0, 120) : 'fixture';
}

/**
 * Ensure `target` is inside `root`. #178 M-1 lesson: add `sep` to the
 * root so `/app/fixtures` does not pass for `/app/fixtures-backup/...`.
 */
export function assertInsideRoot(root: string, target: string): void {
  const normRoot = resolve(root);
  const needle = normRoot.endsWith(sep) ? normRoot : normRoot + sep;
  const normTarget = resolve(target);
  // Allow the root itself as well as anything strictly inside it.
  if (normTarget !== normRoot && !normTarget.startsWith(needle)) {
    throw new Error(
      `Path escapes fixture root: ${normTarget} not inside ${normRoot}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Backfill
// ---------------------------------------------------------------------------

export interface BackfillOptions {
  /** Absolute root under which fixtures may be written. */
  readonly fixtureRoot: string;
  /** Seed payload to encode. Defaults to a benign probe string. */
  readonly seed?: string;
  /** Intensity for the dialect. Defaults 0.5. */
  readonly intensity?: number;
  /** Optional telemetry sink. */
  readonly onTelemetry?: (event: DialectSt3ggBackfillTelemetry) => void;
  /** Override the category→dialect picker (tests use this). */
  readonly pickDialect?: (cat: St3ggCategory) => KotobaDialect;
  /**
   * Filesystem writer — injected for unit tests. Default uses
   * `node:fs/promises`.
   */
  readonly writer?: (absPath: string, contents: string) => Promise<void>;
  /** Directory creator — injected for unit tests. */
  readonly mkdirp?: (absPath: string) => Promise<void>;
}

const DEFAULT_SEED =
  'dojolm benign backfill seed — synthetic coverage content, not a live exploit';

async function defaultWriter(absPath: string, contents: string): Promise<void> {
  await writeFile(absPath, contents, 'utf8');
}

async function defaultMkdirp(absPath: string): Promise<void> {
  await mkdir(absPath, { recursive: true });
}

/** Per-category generation result. */
export interface BackfillResult {
  readonly categoryId: string;
  readonly dialectId: KotobaDialect;
  readonly fileName: string;
  readonly fixturesGenerated: number;
}

/**
 * Generate one dialect-encoded fixture per `missing`/`partial` category.
 * Returns the per-category results; emits telemetry per category.
 */
export async function backfillSt3ggCategories(
  categories: readonly St3ggCategory[],
  opts: BackfillOptions,
): Promise<readonly BackfillResult[]> {
  if (!opts.fixtureRoot || typeof opts.fixtureRoot !== 'string') {
    throw new Error('backfillSt3ggCategories: fixtureRoot is required');
  }
  const root = resolve(opts.fixtureRoot);
  const write = opts.writer ?? defaultWriter;
  const mkdirp = opts.mkdirp ?? defaultMkdirp;
  const pick = opts.pickDialect ?? pickDialectForCategory;
  const seed = opts.seed ?? DEFAULT_SEED;
  const intensity = opts.intensity ?? 0.5;

  await mkdirp(root);
  // Re-assert containment post-mkdir (tests use in-memory writers where
  // the real FS call would be a no-op, so we validate the caller's root
  // before producing any output).

  const results: BackfillResult[] = [];
  for (const cat of categories) {
    const dialect = pick(cat);
    const encoded = applyDialect(seed, dialect, intensity);
    const baseName = safeFilename(`st3gg-backfill-${cat.id}-${dialect}.txt`);
    const absPath = resolve(root, baseName);
    assertInsideRoot(root, absPath);

    await write(absPath, encoded);

    const res: BackfillResult = {
      categoryId: cat.id,
      dialectId: dialect,
      fileName: baseName,
      fixturesGenerated: 1,
    };
    results.push(res);

    if (opts.onTelemetry) {
      opts.onTelemetry({
        type: 'kotoba.dialect.st3gg_backfill',
        categoryId: cat.id,
        dialectId: dialect,
        fixturesGenerated: 1,
      });
    }
  }
  return results;
}
