// SPDX-License-Identifier: Apache-2.0
/**
 * File: leak-indexer.ts
 * Purpose: Gap 11.2 — similarity search over CL4R1T4S archive (hash-based stub).
 * Story: Industry-tools parity plan section 11.2 (lines 661-701).
 *
 * **Scope divergence:** the spec calls for embedding-based similarity. No
 * embedding infrastructure is shipped in bu-tpi yet, so this module ships a
 * **hash-token / Jaccard** approximation (acceptable per the task brief:
 * "hash-based stub acceptable if embedding infra not shipped; flag in
 * scope-divergence"). The public API is stable so swapping in a real
 * embedder later is additive-only.
 *
 * --------------------------------------------------------------------------
 * Production warning: token-overlap similarity is weak signal for leak
 * re-use detection. Treat matches as hints, not evidence. Replace with an
 * embedding model before relying on this for defense regressions.
 * --------------------------------------------------------------------------
 */

import {
  getDefaultLeakRepo,
  type LeakedSystemPrompt,
  type LeakVendor,
} from './leak-archive.js';
import { sanitizeLeakContent } from './leak-archive-pii-sanitizer.js';

export interface LeakMatch {
  readonly leakId: string;
  readonly vendor: LeakVendor;
  readonly product: string;
  readonly version: string | null;
  readonly captureDate: string;
  readonly contentHash: string;
  readonly similarity: number; // 0..1
}

export interface SimilarityOptions {
  /**
   * Lower-bound similarity to include in results. Below this floor a
   * candidate is omitted. Default 0.35 — empirically the minimum signal
   * above which Jaccard-on-tokens starts being interesting.
   */
  readonly floor?: number;
  readonly limit?: number;
  readonly archiveEnabled: boolean;
}

const DEFAULT_FLOOR = 0.35;
const MAX_TOKENS = 4096;

/**
 * Compute similarity between `candidate` and every record in the archive.
 * Sanitizes `candidate` first so a probe containing PII cannot poison the
 * token bag (and so the comparison is apples-to-apples against stored,
 * sanitized content).
 *
 * Returns matches ordered by descending similarity, filtered by `floor`.
 * When `archiveEnabled=false`, returns `[]` (flag-off semantics).
 */
export async function similarityToKnownLeaks(
  candidate: string,
  opts: SimilarityOptions,
): Promise<LeakMatch[]> {
  if (!opts.archiveEnabled) return [];
  if (typeof candidate !== 'string' || candidate.length === 0) return [];

  let clean: string;
  try {
    clean = sanitizeLeakContent(candidate).clean;
  } catch {
    // Input was empty or all-PII — cannot compare.
    return [];
  }

  const candidateTokens = tokenize(clean);
  if (candidateTokens.size === 0) return [];

  const floor = opts.floor ?? DEFAULT_FLOOR;
  const limit = Number.isFinite(opts.limit) && (opts.limit ?? 0) > 0 ? (opts.limit as number) : Infinity;

  const repo = getDefaultLeakRepo();
  const scored: LeakMatch[] = [];

  for (const leak of repo.list()) {
    const sim = jaccardSimilarity(candidateTokens, tokenize(leak.content));
    if (sim < floor) continue;
    scored.push(toMatch(leak, sim));
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, Number.isFinite(limit) ? limit : scored.length);
}

function toMatch(leak: LeakedSystemPrompt, similarity: number): LeakMatch {
  return {
    leakId: leak.id,
    vendor: leak.vendor,
    product: leak.product,
    version: leak.version,
    captureDate: leak.captureDate,
    contentHash: leak.contentHash,
    similarity,
  };
}

function tokenize(text: string): Set<string> {
  const bag = new Set<string>();
  let count = 0;
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw) continue;
    if (raw.length < 3) continue; // drop stop-ish tokens
    bag.add(raw);
    count++;
    if (count >= MAX_TOKENS) break;
  }
  return bag;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const t of smaller) {
    if (larger.has(t)) intersection++;
  }
  const union = a.size + b.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}
