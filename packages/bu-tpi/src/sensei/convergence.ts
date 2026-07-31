// SPDX-License-Identifier: Apache-2.0
/**
 * Convergence detector for refusal-aware campaigns (Gap 4 / #140, PR-140c).
 *
 * The closed-loop rewriter should halt when the target has returned
 * several near-identical refusals in a row — additional turns waste
 * budget without advancing the attack. This module provides:
 *
 *  - `cosineSimilarity(a, b)` — term-frequency cosine over tokenised text
 *  - `detectConvergence(responses, options)` — sliding-window invariant
 *    check that the last N responses all exceed the similarity threshold
 *
 * Heuristic + offline — no embeddings dep, no LLM call.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConvergenceOptions {
  /** Number of consecutive responses required to trigger convergence. */
  readonly windowSize?: number;
  /** Minimum pairwise cosine similarity across the window. */
  readonly similarityThreshold?: number;
}

export interface ConvergenceResult {
  readonly converged: boolean;
  /** Lowest pairwise similarity observed in the window, when applicable. */
  readonly minPairwiseSimilarity: number;
  /** Number of responses actually inspected. */
  readonly windowExamined: number;
  readonly reason: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_WINDOW_SIZE = 3;
export const DEFAULT_SIMILARITY_THRESHOLD = 0.9;

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'have', 'he', 'i', 'in', 'is', 'it', 'its', 'of', 'on',
  'or', 'that', 'the', 'this', 'to', 'was', 'were', 'will', 'with',
  'you', 'your',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

function termFrequency(tokens: readonly string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

/**
 * Term-frequency cosine similarity on tokenised input.
 * Returns a value in [0, 1] where 1 = identical token distribution.
 * Two empty / zero-token inputs are defined as identical (1.0).
 * One empty + one non-empty is defined as completely dissimilar (0.0).
 */
export function cosineSimilarity(a: string, b: string): number {
  const tfA = termFrequency(tokenize(a));
  const tfB = termFrequency(tokenize(b));

  if (tfA.size === 0 && tfB.size === 0) return 1;
  if (tfA.size === 0 || tfB.size === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const [, count] of tfA) normA += count * count;
  for (const [, count] of tfB) normB += count * count;

  const smaller = tfA.size <= tfB.size ? tfA : tfB;
  const larger = smaller === tfA ? tfB : tfA;
  for (const [term, count] of smaller) {
    const otherCount = larger.get(term);
    if (otherCount) dot += count * otherCount;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// Convergence detector
// ---------------------------------------------------------------------------

/**
 * Detect loop convergence over a trailing window of responses.
 *
 * Returns `converged: true` iff:
 *   1. At least `windowSize` responses are available, AND
 *   2. The minimum pairwise cosine similarity across the trailing
 *      `windowSize` responses is ≥ `similarityThreshold`.
 *
 * Caller is responsible for filtering the input to refusal / partial-
 * refusal responses if that is the intended gating condition.
 */
export function detectConvergence(
  responses: readonly string[],
  options: ConvergenceOptions = {},
): ConvergenceResult {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE;
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;

  if (windowSize < 2) {
    throw new RangeError('windowSize must be >= 2');
  }
  if (threshold < 0 || threshold > 1) {
    throw new RangeError('similarityThreshold must be in [0, 1]');
  }

  if (responses.length < windowSize) {
    return {
      converged: false,
      minPairwiseSimilarity: 0,
      windowExamined: responses.length,
      reason: `insufficient history: ${responses.length} < ${windowSize}`,
    };
  }

  const window = responses.slice(-windowSize);
  let minSim = 1;
  for (let i = 0; i < window.length; i += 1) {
    for (let j = i + 1; j < window.length; j += 1) {
      const sim = cosineSimilarity(window[i]!, window[j]!);
      if (sim < minSim) minSim = sim;
    }
  }

  if (minSim >= threshold) {
    return {
      converged: true,
      minPairwiseSimilarity: minSim,
      windowExamined: windowSize,
      reason: `last ${windowSize} responses have pairwise similarity ≥ ${threshold} (min=${minSim.toFixed(3)})`,
    };
  }

  return {
    converged: false,
    minPairwiseSimilarity: minSim,
    windowExamined: windowSize,
    reason: `pairwise similarity below threshold (min=${minSim.toFixed(3)} < ${threshold})`,
  };
}
