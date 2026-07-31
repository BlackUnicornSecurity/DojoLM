// SPDX-License-Identifier: Apache-2.0
/**
 * File: model-router.ts
 * Purpose: Gap 11.1 — per-model routing for L1B3RT4S community jailbreak corpus.
 * Story: Industry-tools parity plan §11.1 (lines 641–659)
 *
 * Responsibilities:
 * - Classify a parsed `CommunityPayload` by its target model using filename /
 *   heading / label / content heuristics.
 * - Produce a stable `TargetModelId` (one of the Gap 11.1 buckets; fallback
 *   to `'unknown'` when no heuristic fires).
 * - Provide `listJailbreaks(model)` which streams manifest entries filtered
 *   to a single bucket for downstream scanner/arena routing.
 * - Produce a content hash that is stable across buckets so dedupe across
 *   models works (see `manifest integrity` test).
 *
 * Non-goals (handled elsewhere):
 * - Fetching / parsing upstream feeds (liberator-feed.ts + amaterasu-sync.ts).
 * - Persistence / writing to disk (ingestion run; separate PR).
 * - Telemetry emission (liberator-feed.ts wires the optional emitter).
 */

import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import type { CommunityPayload } from './liberator-feed.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Canonical target-model bucket. Kept deliberately coarse — one directory
 * per commercial model family. Fine-grained variants (e.g. `claude-3-opus`
 * vs `claude-3-sonnet`) live inside the bucket as filenames/metadata.
 */
export type TargetModelId =
  | 'chatgpt'
  | 'claude'
  | 'gemini'
  | 'llama'
  | 'grok'
  | 'mistral'
  | 'qwen'
  | 'deepseek'
  | 'unknown';

export const TARGET_MODEL_IDS: readonly TargetModelId[] = [
  'chatgpt',
  'claude',
  'gemini',
  'llama',
  'grok',
  'mistral',
  'qwen',
  'deepseek',
  'unknown',
] as const;

/**
 * Minimal shape the router expects from an L1B3RT4S-parsed entry. We only
 * accept fields we actually read, so the type is narrower than
 * `CommunityPayload` and callers can pass synthetic entries in tests.
 */
export interface LiberatorEntry {
  readonly id: string;
  readonly content: string;
  readonly labels?: readonly string[];
  readonly title?: string;
  readonly filename?: string;
}

/** A jailbreak entry as persisted in `MANIFEST.json`. */
export interface JailbreakEntry {
  readonly filename: string;
  readonly targetModel: TargetModelId;
  readonly sourceCommit: string | null;
  readonly ingestedAt: string;
  readonly contentHash: string;
}

export interface ManifestSource {
  /** Root of `fixtures/jailbreaks/` — defaults to the shipped one. */
  readonly root?: string;
  /** In-memory override (tests). When set, `root` is ignored. */
  readonly entries?: readonly JailbreakEntry[];
}

// ---------------------------------------------------------------------------
// Heuristic table
// ---------------------------------------------------------------------------

/**
 * Order matters: the first match wins. More specific vendor markers come
 * first so that e.g. `chatgpt-o1` is routed to `chatgpt` before the
 * generic `openai`/`gpt` alias fires.
 */
interface Heuristic {
  readonly model: TargetModelId;
  readonly patterns: readonly RegExp[];
}

const HEURISTICS: readonly Heuristic[] = [
  {
    model: 'claude',
    // Post-#176 M-2: `\bhaiku\b` is too broad (poetry form). Scope to
    // `claude[-\s]?haiku` so only Claude-family Haiku hits this bucket.
    patterns: [
      /\bclaude\b/i,
      /\banthropic\b/i,
      /\bsonnet\b/i,
      /\bopus\b/i,
      /\bclaude[-\s]?haiku\b/i,
    ],
  },
  {
    model: 'chatgpt',
    // Post-#176 L-2: `\bo1\b` is too broad (collides with any "o1" token).
    // Scope to `(^|\s)o1(-\w+)?(\s|$)` so it only matches a standalone
    // OpenAI-style "o1" / "o1-mini" model tag.
    patterns: [
      /\bchatgpt\b/i,
      /\bopenai\b/i,
      /\bgpt-?[3-9o]/i,
      /\bgpt-?4/i,
      /(^|\s)o1(-\w+)?(\s|$)/i,
      /\bgpt\b/i,
    ],
  },
  {
    model: 'gemini',
    patterns: [/\bgemini\b/i, /\bbard\b/i, /\bpalm\b/i, /\bgoogle-?deepmind\b/i],
  },
  {
    model: 'llama',
    patterns: [/\bllama\d*\b/i, /\bmeta-?ai\b/i, /\bcodellama\b/i],
  },
  {
    model: 'grok',
    patterns: [/\bgrok\b/i, /\bx\.?ai\b/i, /\bxai\b/i],
  },
  {
    model: 'mistral',
    patterns: [/\bmistral\b/i, /\bmixtral\b/i, /\bcodestral\b/i],
  },
  {
    model: 'qwen',
    patterns: [/\bqwen\b/i, /\balibaba\b/i, /\btongyi\b/i],
  },
  {
    model: 'deepseek',
    patterns: [/\bdeepseek\b/i],
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a parsed L1B3RT4S entry into one of the Gap 11.1 buckets.
 *
 * Lookup precedence — strongest signal first:
 *   1. `filename` (e.g. `CLAUDE.md`, `chatgpt-dan.md`)
 *   2. `labels` (L1B3RT4S front-matter `model:` value or H1 heading)
 *   3. `title`
 *   4. `content` (first ~4KB scanned; avoids pathological cost on huge blobs)
 *
 * Returns `'unknown'` when no heuristic fires. Callers should emit
 * `industry_tools.l1b3rt4s.unknown_model` telemetry for those so ops can
 * refine the heuristic table.
 */
export function routeByModel(entry: LiberatorEntry): TargetModelId {
  const haystacks: string[] = [];
  if (entry.filename) haystacks.push(entry.filename);
  if (entry.labels && entry.labels.length > 0) haystacks.push(entry.labels.join(' '));
  if (entry.title) haystacks.push(entry.title);
  if (entry.content) haystacks.push(entry.content.slice(0, 4096));

  for (const hay of haystacks) {
    const hit = matchHeuristic(hay);
    if (hit !== null) return hit;
  }
  return 'unknown';
}

function matchHeuristic(text: string): TargetModelId | null {
  for (const h of HEURISTICS) {
    for (const p of h.patterns) {
      if (p.test(text)) return h.model;
    }
  }
  return null;
}

/**
 * Normalise an upstream filename for storage inside a model bucket.
 * - Strip directory components.
 * - Lowercase.
 * - Replace any character outside `[a-z0-9._-]` with `-`.
 * - Collapse repeated `-`.
 * - Enforce a reasonable max length (120) so pathological inputs can't
 *   blow up `path.join`.
 */
export function normalizeFilename(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? raw;
  const lower = base.toLowerCase();
  const cleaned = lower.replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  // Post-#176 M-1: strip leading dots so a dotfile-style upstream (e.g.
  // `.gitkeep`, `..weird`) cannot land in a bucket as a hidden file and
  // bypass manifest-filename safety guards in scanner-profile.
  const dedotted = cleaned.replace(/^\.+/, '');
  if (dedotted.length === 0) return 'payload';
  return dedotted.length > 120 ? dedotted.slice(0, 120) : dedotted;
}

/**
 * Stable SHA-256 hex digest of the payload content. Bucket-independent so
 * we can detect duplicates that landed under different model dirs (e.g. a
 * payload tagged both "claude" and "chatgpt" in the upstream).
 */
export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Resolve the default shipped manifest location (`fixtures/jailbreaks/`
 * relative to this source file, independent of cwd / package layout).
 */
export function defaultJailbreakRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', 'fixtures', 'jailbreaks');
}

/**
 * Stream manifest entries for a single model bucket. `AsyncIterable` so
 * future on-disk paginated sources can slot in without changing callers.
 */
export async function* listJailbreaks(
  model: TargetModelId,
  source: ManifestSource = {},
): AsyncIterable<JailbreakEntry> {
  const entries = source.entries ?? (await loadManifest(source.root ?? defaultJailbreakRoot()));
  for (const entry of entries) {
    if (entry.targetModel === model) yield entry;
  }
}

/**
 * Read and validate `MANIFEST.json`. Throws on malformed manifest (fail
 * fast — a corrupt manifest is a deploy error we want ops to see).
 */
export async function loadManifest(root: string): Promise<readonly JailbreakEntry[]> {
  const raw = await readFile(join(root, 'MANIFEST.json'), 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('MANIFEST.json: expected top-level array');
  }
  return parsed.map((row, i) => validateManifestRow(row, i));
}

/**
 * Reject a filename from MANIFEST.json that could escape the bucket directory.
 * We allow only a single path component with no separators, no leading dots, and
 * no `..` traversal sequences — the same rules the ingest writer enforces via
 * `normalizeFilename`.  Callers that receive `JailbreakEntry` values from
 * `loadManifest` / `listJailbreaks` can then safely compute
 * `path.join(bucketDir, entry.filename)` without an additional guard.
 */
/**
 * Reject a manifest filename that could escape the bucket directory, or
 * land as a dotfile. Exported (post-#178 L-1) so scanner-profile can
 * share a single implementation.
 */
export function isSafeManifestFilename(filename: string): boolean {
  if (typeof filename !== 'string') return false;
  if (filename.length === 0 || filename.length > 120) return false;
  if (filename.includes('/') || filename.includes('\\')) return false;
  if (filename === '.' || filename === '..') return false;
  if (filename.startsWith('.')) return false;
  return /^[a-z0-9._-]+$/.test(filename);
}

function validateManifestRow(row: unknown, index: number): JailbreakEntry {
  if (!row || typeof row !== 'object') {
    throw new Error(`MANIFEST.json[${index}]: not an object`);
  }
  const r = row as Record<string, unknown>;
  const filename = typeof r.filename === 'string' ? r.filename : null;
  const targetModel = typeof r.targetModel === 'string' ? r.targetModel : null;
  const ingestedAt = typeof r.ingestedAt === 'string' ? r.ingestedAt : null;
  const contentHashValue = typeof r.contentHash === 'string' ? r.contentHash : null;
  const sourceCommit =
    typeof r.sourceCommit === 'string' ? r.sourceCommit : r.sourceCommit === null ? null : null;

  if (!filename) throw new Error(`MANIFEST.json[${index}]: missing filename`);
  if (!isSafeManifestFilename(filename)) {
    throw new Error(`MANIFEST.json[${index}]: unsafe filename "${filename}" (path traversal or dot-file)`);
  }
  if (!targetModel || !(TARGET_MODEL_IDS as readonly string[]).includes(targetModel)) {
    throw new Error(`MANIFEST.json[${index}]: invalid targetModel "${String(targetModel)}"`);
  }
  if (!ingestedAt) throw new Error(`MANIFEST.json[${index}]: missing ingestedAt`);
  if (!contentHashValue) throw new Error(`MANIFEST.json[${index}]: missing contentHash`);

  return {
    filename,
    targetModel: targetModel as TargetModelId,
    sourceCommit,
    ingestedAt,
    contentHash: contentHashValue,
  };
}

/**
 * Verify that every file in each model bucket has a matching manifest row
 * and vice-versa. Returns a list of discrepancies — empty on success.
 *
 * Used by the manifest-integrity test and (future) a CI guard.
 */
export async function auditManifest(root: string = defaultJailbreakRoot()): Promise<readonly string[]> {
  const manifest = await loadManifest(root);
  const issues: string[] = [];

  const manifestKey = (e: JailbreakEntry): string => `${e.targetModel}/${e.filename}`;
  const seen = new Map<string, JailbreakEntry>();
  for (const entry of manifest) {
    const key = manifestKey(entry);
    if (seen.has(key)) {
      issues.push(`duplicate manifest row: ${key}`);
    } else {
      seen.set(key, entry);
    }
  }

  for (const model of TARGET_MODEL_IDS) {
    const dir = join(root, model);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue; // Missing bucket dir is ok; it may simply be empty pre-ingest.
    }
    for (const f of files) {
      if (f === '.gitkeep' || f === 'MANIFEST.json') continue;
      if (!seen.has(`${model}/${f}`)) {
        issues.push(`orphan file (not in manifest): ${model}/${f}`);
      }
    }
  }

  return issues;
}

/**
 * Convert a `CommunityPayload` (from liberator-feed) into the narrower
 * shape `routeByModel` consumes. Centralised so new feed formats can be
 * added without diverging adapters.
 */
export function payloadToEntry(
  payload: CommunityPayload,
  opts?: { readonly filename?: string },
): LiberatorEntry {
  return {
    id: payload.id,
    content: payload.content,
    labels: payload.labels,
    title: payload.title,
    filename: opts?.filename,
  };
}
