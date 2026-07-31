// SPDX-License-Identifier: Apache-2.0
/**
 * File: st3gg-coverage.ts
 * Purpose: Gap 11.3 — ST3GG category coverage audit + diff tool.
 * Story: Industry-tools parity plan §11.3 (extends Gap 7 dialect library).
 *
 * Responsibilities:
 * - Load the canonical ST3GG category list from
 *   `packages/bu-tpi/fixtures/encoded/ST3GG-COVERAGE.json`.
 * - Walk the fixture roots (`fixtures/encoded/`, `fixtures/audio-attacks/`,
 *   `fixtures/images/`) and diff each category's declared glob against the
 *   filesystem.
 * - Produce a `CoverageReport` that is deterministic given identical inputs
 *   (sorted keys, no timestamp fields) so CI can gate on it.
 *
 * Non-goals (handled elsewhere):
 * - Generating dialects (Gap 7 `kotoba/dialects/` — not yet shipped).
 * - Writing telemetry to the bus (optional emitter hook is injected).
 * - Authoring new fixtures (that's a manual gap-fill step).
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type St3ggLayer =
  | 'text'
  | 'encoding'
  | 'markup'
  | 'audio'
  | 'image'
  | 'tokenizer'
  | 'structural';

export type CoverageStatus = 'present' | 'partial' | 'missing';

/** One row of the canonical `ST3GG-COVERAGE.json` input file. */
export interface St3ggCategory {
  readonly id: string;
  readonly layer: St3ggLayer;
  readonly status: CoverageStatus;
  /** Shell-style glob relative to `fixtures/encoded/`. `..` allowed for cross-root refs. */
  readonly fixtureGlob: string;
  readonly notes?: string;
}

export interface St3ggCoverageFile {
  readonly version: number;
  readonly generatedBy: string;
  readonly source: string;
  readonly note?: string;
  readonly categories: readonly St3ggCategory[];
}

/** One row of the reproducible audit output. */
export interface CoverageFinding {
  readonly categoryId: string;
  readonly layer: St3ggLayer;
  readonly declaredStatus: CoverageStatus;
  readonly observedStatus: CoverageStatus;
  readonly matchedFiles: number;
  readonly mismatch: boolean;
}

export interface CoverageReport {
  readonly version: number;
  readonly categoryCount: number;
  readonly presentCount: number;
  readonly partialCount: number;
  readonly missingCount: number;
  readonly mismatchCount: number;
  readonly findings: readonly CoverageFinding[];
}

export type St3ggCoverageTelemetry = {
  readonly type: 'industry_tools.st3gg.coverage_audit';
  readonly categoryCount: number;
  readonly mismatchCount: number;
  readonly missingCount: number;
  readonly partialCount: number;
};

export interface AuditOptions {
  /**
   * Path to `ST3GG-COVERAGE.json`. Defaults to the shipped file under
   * `packages/bu-tpi/fixtures/encoded/`.
   */
  readonly coverageFile?: string;
  /** Filesystem root for the encoded fixture directory. */
  readonly encodedRoot?: string;
  /** Optional telemetry emitter (Gap 8 bus is injected externally). */
  readonly onTelemetry?: (event: St3ggCoverageTelemetry) => void;
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

/** Default shipped `ST3GG-COVERAGE.json` location. */
export function defaultCoverageFile(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', 'fixtures', 'encoded', 'ST3GG-COVERAGE.json');
}

/** Default shipped encoded-fixture root. */
export function defaultEncodedRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', 'fixtures', 'encoded');
}

// ---------------------------------------------------------------------------
// Coverage-file loader
// ---------------------------------------------------------------------------

/**
 * Load and validate `ST3GG-COVERAGE.json`. Throws on malformed file — a
 * corrupt coverage file is a deploy error we want CI to surface.
 */
export async function loadCoverageFile(path: string = defaultCoverageFile()): Promise<St3ggCoverageFile> {
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  return validateCoverageFile(parsed);
}

const VALID_LAYERS: readonly St3ggLayer[] = [
  'text', 'encoding', 'markup', 'audio', 'image', 'tokenizer', 'structural',
];
const VALID_STATUSES: readonly CoverageStatus[] = ['present', 'partial', 'missing'];

export function validateCoverageFile(value: unknown): St3ggCoverageFile {
  if (!value || typeof value !== 'object') {
    throw new Error('ST3GG-COVERAGE: not an object');
  }
  const v = value as Record<string, unknown>;
  if (typeof v.version !== 'number') throw new Error('ST3GG-COVERAGE: missing version');
  if (typeof v.generatedBy !== 'string') throw new Error('ST3GG-COVERAGE: missing generatedBy');
  if (typeof v.source !== 'string') throw new Error('ST3GG-COVERAGE: missing source');
  if (!Array.isArray(v.categories)) throw new Error('ST3GG-COVERAGE: categories must be array');

  const seen = new Set<string>();
  const cats: St3ggCategory[] = [];
  for (const [i, raw] of v.categories.entries()) {
    const c = validateCategory(raw, i);
    if (seen.has(c.id)) throw new Error(`ST3GG-COVERAGE: duplicate category id "${c.id}"`);
    seen.add(c.id);
    cats.push(c);
  }

  return {
    version: v.version,
    generatedBy: v.generatedBy,
    source: v.source,
    note: typeof v.note === 'string' ? v.note : undefined,
    categories: cats,
  };
}

function validateCategory(raw: unknown, index: number): St3ggCategory {
  if (!raw || typeof raw !== 'object') {
    throw new Error(`ST3GG-COVERAGE.categories[${index}]: not an object`);
  }
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : null;
  const layer = typeof r.layer === 'string' ? r.layer : null;
  const status = typeof r.status === 'string' ? r.status : null;
  const fixtureGlob = typeof r.fixtureGlob === 'string' ? r.fixtureGlob : null;

  if (!id) throw new Error(`ST3GG-COVERAGE.categories[${index}]: missing id`);
  // Post-#177 L-1: reject whitespace-only ids — they bypass the
  // "non-empty" check but produce useless audit rows + would defeat the
  // duplicate-id `seen` set because the trimmed key is empty.
  if (id.trim().length === 0) {
    throw new Error(`ST3GG-COVERAGE.categories[${index}]: id must be non-whitespace`);
  }
  if (!layer || !(VALID_LAYERS as readonly string[]).includes(layer)) {
    throw new Error(`ST3GG-COVERAGE.categories[${index}]: invalid layer "${String(layer)}"`);
  }
  if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
    throw new Error(`ST3GG-COVERAGE.categories[${index}]: invalid status "${String(status)}"`);
  }
  if (!fixtureGlob) throw new Error(`ST3GG-COVERAGE.categories[${index}]: missing fixtureGlob`);

  return {
    id,
    layer: layer as St3ggLayer,
    status: status as CoverageStatus,
    fixtureGlob,
    notes: typeof r.notes === 'string' ? r.notes : undefined,
  };
}

// ---------------------------------------------------------------------------
// Glob -> observed status
// ---------------------------------------------------------------------------

/**
 * Compile a shell-style glob (subset) into a RegExp.
 * Supports: `*`, `?`, character classes `[abc]`, brace groups `{a,b,c}`.
 * Path separators are normalised to forward-slash; `..` parent refs stay
 * literal and are resolved before matching.
 */
export function globToRegex(glob: string): RegExp {
  let src = '^';
  let braceDepth = 0;
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i];
    switch (ch) {
      case '*': src += '[^/]*'; break;
      case '?': src += '[^/]'; break;
      case '.':
      case '+':
      case '(':
      case ')':
      case '^':
      case '$':
      case '|':
      case '\\':
        src += '\\' + ch;
        break;
      case '{': braceDepth++; src += '(?:'; break;
      case '}': if (braceDepth > 0) { braceDepth--; src += ')'; } else src += '\\}'; break;
      case ',': src += braceDepth > 0 ? '|' : ','; break;
      case '[': {
        // Character class — accept until matching `]` literally.
        const end = glob.indexOf(']', i + 1);
        if (end === -1) { src += '\\['; break; }
        src += '[' + glob.slice(i + 1, end) + ']';
        i = end;
        break;
      }
      default: src += ch;
    }
  }
  src += '$';
  return new RegExp(src);
}

interface RootFiles {
  readonly relRoot: string;
  readonly files: readonly string[];
}

/**
 * Walk the fixture roots we care about (encoded, ../audio-attacks,
 * ../images) and return a flat list of relative paths under each root.
 * Relative paths are expressed from the encoded root so they line up with
 * how `fixtureGlob` is written in the coverage file (`..` for sibling dirs).
 */
async function walkFixtureRoots(encodedRoot: string): Promise<readonly RootFiles[]> {
  const out: RootFiles[] = [];

  for (const rel of ['.', '../audio-attacks', '../images'] as const) {
    const abs = join(encodedRoot, rel);
    let entries: string[];
    try {
      entries = await readdir(abs);
    } catch {
      // Root missing — treat as empty; audit will flag downstream if a
      // category's glob points into it and finds nothing.
      entries = [];
    }
    out.push({
      relRoot: rel,
      files: entries
        .filter((f) => f !== '.gitkeep' && f !== 'ST3GG-COVERAGE.json')
        .map((f) => (rel === '.' ? f : `${rel}/${f}`)),
    });
  }

  return out;
}

/** Count how many known-fixture files match `fixtureGlob`. */
export function countGlobMatches(glob: string, files: readonly string[]): number {
  const rx = globToRegex(glob);
  let n = 0;
  for (const f of files) if (rx.test(f)) n++;
  return n;
}

/**
 * Derive the observed status from match count. A single match is flagged
 * `partial` so the auditor can nudge teams toward breadth; 2+ becomes
 * `present`.
 */
export function observedStatusFor(matchCount: number): CoverageStatus {
  if (matchCount === 0) return 'missing';
  if (matchCount === 1) return 'partial';
  return 'present';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk the coverage file + fixture roots and build a reproducible report.
 * Deterministic: findings are sorted by categoryId, no timestamps, no
 * filesystem-order dependence.
 */
export async function auditSt3ggCoverage(opts: AuditOptions = {}): Promise<CoverageReport> {
  const coverage = await loadCoverageFile(opts.coverageFile);
  const encodedRoot = opts.encodedRoot ?? defaultEncodedRoot();
  const roots = await walkFixtureRoots(encodedRoot);
  const flat = roots.flatMap((r) => r.files).sort();

  const findings = coverage.categories
    .map((cat): CoverageFinding => {
      const matches = countGlobMatches(cat.fixtureGlob, flat);
      const observed = observedStatusFor(matches);
      return {
        categoryId: cat.id,
        layer: cat.layer,
        declaredStatus: cat.status,
        observedStatus: observed,
        matchedFiles: matches,
        mismatch: observed !== cat.status,
      };
    })
    .sort((a, b) => (a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0));

  const report: CoverageReport = {
    version: coverage.version,
    categoryCount: findings.length,
    presentCount: findings.filter((f) => f.observedStatus === 'present').length,
    partialCount: findings.filter((f) => f.observedStatus === 'partial').length,
    missingCount: findings.filter((f) => f.observedStatus === 'missing').length,
    mismatchCount: findings.filter((f) => f.mismatch).length,
    findings,
  };

  if (opts.onTelemetry) {
    opts.onTelemetry({
      type: 'industry_tools.st3gg.coverage_audit',
      categoryCount: report.categoryCount,
      mismatchCount: report.mismatchCount,
      missingCount: report.missingCount,
      partialCount: report.partialCount,
    });
  }

  return report;
}

/**
 * Return the subset of categories flagged `missing` or `partial` — the
 * backfill queue. Callers (Gap 7 dialect generator, docs tooling) use this
 * to prioritise follow-up work without re-implementing status logic.
 */
export function listBackfillCandidates(
  coverage: St3ggCoverageFile,
): readonly St3ggCategory[] {
  return coverage.categories.filter((c) => c.status !== 'present');
}
