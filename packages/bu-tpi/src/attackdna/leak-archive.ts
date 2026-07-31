// SPDX-License-Identifier: Apache-2.0
/**
 * File: leak-archive.ts
 * Purpose: Gap 11.2 — CL4R1T4S system-prompt leak archive parser + ingest.
 * Story: Industry-tools parity plan section 11.2 (lines 661-701).
 * Legal: E3 sign-off 2026-04-22.
 *
 * Responsibilities:
 * - Parse `<vendor>/<product>-<capture-date>.md` filenames into metadata.
 * - Dedupe by SHA-256 content hash (bucket-independent).
 * - Persist sanitized `LeakedSystemPrompt` records via a repository seam.
 * - Support takedown by `sourceCommit`.
 *
 * Non-goals (deferred / delegated):
 * - Similarity search: see `leak-indexer.ts`.
 * - Telemetry emission: caller passes `onTelemetry` and emits at the edge
 *   (API route / CLI). Telemetry carries hashes + metadata only per R-T1.
 *
 * --------------------------------------------------------------------------
 * Production warning: this scaffold writes to an in-memory repository only.
 * Production deployments MUST wire `setDefaultLeakRepo()` to a persistent,
 * access-controlled store before enabling `CL4R1T4S_ARCHIVE_ENABLED`.
 * --------------------------------------------------------------------------
 */

import { createHash } from 'node:crypto';
import {
  sanitizeLeakContent,
  type SanitizerReport,
} from './leak-archive-pii-sanitizer.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Vendor slug bucket (directory name inside `fixtures/system-prompt-leaks/`). */
export type LeakVendor =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'meta'
  | 'xai'
  | 'mistral'
  | 'alibaba'
  | 'deepseek'
  | 'unknown';

export const LEAK_VENDORS: readonly LeakVendor[] = [
  'anthropic',
  'openai',
  'google',
  'meta',
  'xai',
  'mistral',
  'alibaba',
  'deepseek',
  'unknown',
] as const;

/** Reserved keys that must never be accepted as dynamic lookup keys (R-P1). */
export const RESERVED_PROTO_IDS: readonly string[] = [
  'constructor',
  'prototype',
  '__proto__',
];

export type Cl4r1t4sSourceId = 'cl4r1t4s-primary' | 'cl4r1t4s-mirror';

export interface Cl4r1t4sSource {
  readonly sourceId: Cl4r1t4sSourceId;
  /** Pinned upstream URL (from deploy config, not repo). */
  readonly upstreamUrl: string;
  /** Pre-fetched raw entries (tests + future on-disk ingest). */
  readonly entries: readonly Cl4r1t4sRawEntry[];
}

export interface Cl4r1t4sRawEntry {
  /** Upstream filename, e.g. `anthropic/claude-sonnet-4-2026-03-14.md`. */
  readonly filename: string;
  readonly content: string;
}

/** Parsed metadata extracted from filename. `version` may be null. */
export interface LeakMetadata {
  readonly vendor: LeakVendor;
  readonly product: string;
  readonly version: string | null;
  readonly captureDate: string; // yyyy-mm-dd
  readonly safeFilename: string; // normalized, root-relative
}

export interface LeakedSystemPrompt {
  readonly id: string;
  readonly vendor: LeakVendor;
  readonly product: string;
  readonly version: string | null;
  readonly captureDate: string;
  readonly safeFilename: string;
  /** Sanitized content (PII-scrubbed). */
  readonly content: string;
  readonly contentHash: string;
  readonly sourceId: Cl4r1t4sSourceId;
  readonly sourceCommit: string;
  readonly ingestedAt: string;
  /** PII scrub stats from the sanitizer (no raw content). */
  readonly sanitizerReport: SanitizerReport;
}

export interface IngestReport {
  readonly sourceId: Cl4r1t4sSourceId;
  readonly sourceCommit: string;
  readonly fetched: number;
  readonly accepted: number;
  readonly deduped: number;
  readonly rejected: number;
  readonly rejections: readonly {
    readonly filename: string;
    readonly reason: string;
  }[];
  readonly durationMs: number;
}

export interface LeakQuery {
  readonly vendor?: LeakVendor;
  readonly product?: string;
  readonly text?: string;
  readonly limit?: number;
}

export interface IngestOptions {
  readonly onTelemetry?: (event: LeakTelemetryEvent) => void;
  /** Override clock for tests. */
  readonly now?: () => Date;
}

export type LeakTelemetryEvent =
  | {
      readonly type: 'industry_tools.cl4r1t4s.ingested';
      readonly sourceId: Cl4r1t4sSourceId;
      readonly sourceCommit: string;
      readonly vendor: LeakVendor;
      readonly product: string;
      readonly captureDate: string;
      readonly contentHash: string;
    }
  | {
      readonly type: 'industry_tools.cl4r1t4s.takedown';
      readonly sourceCommit: string;
      readonly removed: number;
    };

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface LeakRepository {
  insert(leak: LeakedSystemPrompt): void;
  hasContentHash(hash: string): boolean;
  list(): readonly LeakedSystemPrompt[];
  removeBySourceCommit(commit: string): number;
  clear(): void;
}

export class InMemoryLeakRepository implements LeakRepository {
  private readonly byId = new Map<string, LeakedSystemPrompt>();
  private readonly hashes = new Set<string>();

  insert(leak: LeakedSystemPrompt): void {
    this.byId.set(leak.id, leak);
    this.hashes.add(leak.contentHash);
  }

  hasContentHash(hash: string): boolean {
    return this.hashes.has(hash);
  }

  list(): readonly LeakedSystemPrompt[] {
    return Array.from(this.byId.values());
  }

  removeBySourceCommit(commit: string): number {
    let removed = 0;
    for (const [id, leak] of this.byId) {
      if (leak.sourceCommit === commit) {
        this.byId.delete(id);
        this.hashes.delete(leak.contentHash);
        removed++;
      }
    }
    return removed;
  }

  clear(): void {
    this.byId.clear();
    this.hashes.clear();
  }
}

let defaultRepo: LeakRepository = new InMemoryLeakRepository();

export function getDefaultLeakRepo(): LeakRepository {
  return defaultRepo;
}

export function setDefaultLeakRepo(repo: LeakRepository): void {
  defaultRepo = repo;
}

export function resetDefaultLeakRepo(): void {
  defaultRepo = new InMemoryLeakRepository();
}

// ---------------------------------------------------------------------------
// Filename parser
// ---------------------------------------------------------------------------

// U+200B-U+200F, U+2028-U+202F, U+2066-U+2069, U+FEFF strip class + C0/C1.
const BIDI_CHARCLASS_SRC = '\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF';
// eslint-disable-next-line no-control-regex
const UNSAFE_CHAR_RE = new RegExp(`[\\u0000-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`, 'g');

const CAPTURE_DATE_RE = /-(\d{4}-\d{2}-\d{2})$/;
const PRODUCT_VERSION_RE = /^([a-z][a-z0-9-]*?)(?:-(\d+(?:\.\d+){0,3}))?$/;

export class LeakFilenameError extends Error {
  readonly code = 'CL4R1T4S.FILENAME.INVALID' as const;
  readonly filename: string;
  constructor(filename: string, reason: string) {
    super(`Invalid CL4R1T4S filename: ${reason}`);
    this.name = 'LeakFilenameError';
    this.filename = filename;
  }
}

export function parseLeakFilename(filename: string): LeakMetadata {
  if (typeof filename !== 'string' || filename.length === 0) {
    throw new LeakFilenameError(String(filename), 'empty or non-string');
  }
  if (filename.length > 240) {
    throw new LeakFilenameError(filename, 'length > 240');
  }
  const clean = filename.replace(UNSAFE_CHAR_RE, '').trim();
  if (clean !== filename) {
    throw new LeakFilenameError(filename, 'contains bidi/control chars');
  }

  if (clean.includes('\\')) {
    throw new LeakFilenameError(filename, 'backslash separator not allowed');
  }
  if (clean.startsWith('/')) {
    throw new LeakFilenameError(filename, 'absolute path not allowed');
  }

  const parts = clean.split('/');
  if (parts.length !== 2) {
    throw new LeakFilenameError(filename, `expected <vendor>/<file>, got ${parts.length} segments`);
  }
  const [vendorSlugRaw, fileRaw] = parts;

  if (vendorSlugRaw === '..' || fileRaw === '..' || vendorSlugRaw === '.' || fileRaw === '.') {
    throw new LeakFilenameError(filename, 'path traversal not allowed');
  }
  if (RESERVED_PROTO_IDS.includes(vendorSlugRaw) || RESERVED_PROTO_IDS.includes(fileRaw)) {
    throw new LeakFilenameError(filename, 'reserved prototype id');
  }

  const vendorSlug = vendorSlugRaw.toLowerCase();
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(vendorSlug)) {
    throw new LeakFilenameError(filename, 'vendor slug pattern');
  }
  const vendor: LeakVendor = (LEAK_VENDORS as readonly string[]).includes(vendorSlug)
    ? (vendorSlug as LeakVendor)
    : 'unknown';

  if (!fileRaw.endsWith('.md')) {
    throw new LeakFilenameError(filename, 'filename must end in .md');
  }
  const stem = fileRaw.slice(0, -3).toLowerCase();
  if (stem.length === 0 || stem.startsWith('.') || stem.startsWith('-')) {
    throw new LeakFilenameError(filename, 'stem must not start with . or -');
  }
  if (!/^[a-z0-9._-]+$/.test(stem)) {
    throw new LeakFilenameError(filename, 'stem contains disallowed chars');
  }

  const dateMatch = CAPTURE_DATE_RE.exec(stem);
  if (!dateMatch) {
    throw new LeakFilenameError(filename, 'missing -yyyy-mm-dd suffix');
  }
  const captureDate = dateMatch[1];
  if (!isValidCaptureDate(captureDate)) {
    throw new LeakFilenameError(filename, `invalid capture date: ${captureDate}`);
  }

  const beforeDate = stem.slice(0, stem.length - dateMatch[0].length);
  if (beforeDate.length === 0) {
    throw new LeakFilenameError(filename, 'missing product segment before date');
  }
  const pv = PRODUCT_VERSION_RE.exec(beforeDate);
  if (!pv) {
    throw new LeakFilenameError(filename, `cannot split product/version from "${beforeDate}"`);
  }
  const product = pv[1];
  const version = pv[2] ?? null;

  const safeFilename = `${vendor}/${stem}.md`;

  return { vendor, product, version, captureDate, safeFilename };
}

function isValidCaptureDate(s: string): boolean {
  const [y, m, d] = s.split('-').map((p) => Number.parseInt(p, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Verify that `candidate` resolves inside `root` (string-only; see tests). */
export function isPathInsideRoot(root: string, candidate: string): boolean {
  if (typeof root !== 'string' || typeof candidate !== 'string') return false;
  const sep = root.endsWith('/') ? '' : '/';
  return candidate === root || candidate.startsWith(root + sep);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Stable SHA-256 hex digest of the PII-scrubbed leak content. */
export function contentHashFor(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function ingestLeak(
  source: Cl4r1t4sSource,
  commit: string,
  options: IngestOptions = {},
): Promise<IngestReport> {
  const start = Date.now();
  const now = options.now ?? (() => new Date());

  if (typeof commit !== 'string' || !/^[a-f0-9]{7,64}$/i.test(commit)) {
    return {
      sourceId: source.sourceId,
      sourceCommit: typeof commit === 'string' ? commit : '',
      fetched: 0,
      accepted: 0,
      deduped: 0,
      rejected: 1,
      rejections: [{ filename: '<source>', reason: 'invalid commit sha' }],
      durationMs: Date.now() - start,
    };
  }

  const repo = getDefaultLeakRepo();
  const rejections: { filename: string; reason: string }[] = [];
  const seenInBatch = new Set<string>();
  let accepted = 0;
  let deduped = 0;

  for (const entry of source.entries) {
    let meta: LeakMetadata;
    try {
      meta = parseLeakFilename(entry.filename);
    } catch (err) {
      rejections.push({
        filename: entry.filename,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    let sanitized;
    try {
      sanitized = sanitizeLeakContent(entry.content);
    } catch (err) {
      rejections.push({
        filename: entry.filename,
        reason: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const hash = contentHashFor(sanitized.clean);
    if (seenInBatch.has(hash) || repo.hasContentHash(hash)) {
      deduped++;
      continue;
    }
    seenInBatch.add(hash);

    const leak: LeakedSystemPrompt = {
      id: `leak_${hash.slice(0, 16)}`,
      vendor: meta.vendor,
      product: meta.product,
      version: meta.version,
      captureDate: meta.captureDate,
      safeFilename: meta.safeFilename,
      content: sanitized.clean,
      contentHash: hash,
      sourceId: source.sourceId,
      sourceCommit: commit,
      ingestedAt: now().toISOString(),
      sanitizerReport: sanitized.report,
    };
    repo.insert(leak);
    accepted++;

    options.onTelemetry?.({
      type: 'industry_tools.cl4r1t4s.ingested',
      sourceId: leak.sourceId,
      sourceCommit: leak.sourceCommit,
      vendor: leak.vendor,
      product: leak.product,
      captureDate: leak.captureDate,
      contentHash: leak.contentHash,
    });
  }

  return {
    sourceId: source.sourceId,
    sourceCommit: commit,
    fetched: source.entries.length,
    accepted,
    deduped,
    rejected: rejections.length,
    rejections,
    durationMs: Date.now() - start,
  };
}

export async function searchLeaks(
  query: LeakQuery,
  opts: { readonly archiveEnabled: boolean } = { archiveEnabled: false },
): Promise<LeakedSystemPrompt[]> {
  if (!opts.archiveEnabled) return [];

  const repo = getDefaultLeakRepo();
  const all = repo.list();
  const textNeedle = query.text ? query.text.toLowerCase() : null;
  const productNeedle = query.product ? query.product.toLowerCase() : null;
  const limit = Number.isFinite(query.limit) && (query.limit ?? 0) > 0 ? (query.limit as number) : Infinity;

  const out: LeakedSystemPrompt[] = [];
  for (const leak of all) {
    if (query.vendor && leak.vendor !== query.vendor) continue;
    if (productNeedle && !leak.product.toLowerCase().includes(productNeedle)) continue;
    if (textNeedle && !leak.content.toLowerCase().includes(textNeedle)) continue;
    out.push(leak);
    if (out.length >= limit) break;
  }
  return out;
}

export async function takedownBySourceCommit(
  commit: string,
  options: { readonly onTelemetry?: (event: LeakTelemetryEvent) => void } = {},
): Promise<{ readonly removed: number }> {
  const repo = getDefaultLeakRepo();
  const removed = repo.removeBySourceCommit(commit);
  options.onTelemetry?.({
    type: 'industry_tools.cl4r1t4s.takedown',
    sourceCommit: commit,
    removed,
  });
  return { removed };
}

/**
 * Safe property lookup respecting `Object.hasOwn` and the reserved denylist.
 * Exported for shared use with indexer / admin layers.
 */
export function safeLookup<T>(
  record: Record<string, T>,
  key: string,
): T | undefined {
  if (typeof key !== 'string') return undefined;
  if (RESERVED_PROTO_IDS.includes(key)) return undefined;
  if (!Object.hasOwn(record, key)) return undefined;
  return record[key];
}
