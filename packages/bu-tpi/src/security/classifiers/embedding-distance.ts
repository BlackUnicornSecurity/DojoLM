// SPDX-License-Identifier: Apache-2.0
/**
 * Embedding-distance check for the classifier stack (R-U4 third layer).
 *
 * Phase 0 ships only the interface + a no-op default. Real wiring
 * (LlamaGuard-3 / a hold-out CBRN corpus / vector index) lands in Phase E
 * with Gap 6 (Onigaeshi) + Gap 11.2 (CL4R1T4S leak archive).
 */

import type {
  ClassifierInput,
  ClassifierVerdict,
} from '../classifier-stack.js';

export interface EmbeddingDistanceVerdict {
  readonly verdict: ClassifierVerdict;
  readonly reason: string;
  readonly distance?: number;
}

export interface EmbeddingDistanceCheck {
  evaluate(input: ClassifierInput): Promise<EmbeddingDistanceVerdict>;
}

/**
 * No-op default — always passes. Replace with a real embedding-distance
 * adapter in deployment bootstrap when the corpus + index are available.
 */
export class NoopEmbeddingDistance implements EmbeddingDistanceCheck {
  async evaluate(): Promise<EmbeddingDistanceVerdict> {
    return { verdict: 'pass', reason: 'no-embedding-check-configured' };
  }
}

/**
 * Threshold-based adapter scaffold. Real implementation supplies the
 * embedding function + reference corpus.
 */
export interface ThresholdEmbeddingOptions {
  readonly threshold: number;
  readonly embed: (text: string) => Promise<readonly number[]>;
  readonly referenceVectors: readonly (readonly number[])[];
  readonly distanceFn?: (
    a: readonly number[],
    b: readonly number[],
  ) => number;
}

export class ThresholdEmbeddingDistance implements EmbeddingDistanceCheck {
  constructor(private readonly opts: ThresholdEmbeddingOptions) {
    if (opts.threshold <= 0 || opts.threshold > 1) {
      throw new Error('threshold must be in (0, 1]');
    }
    if (opts.referenceVectors.length === 0) {
      throw new Error('referenceVectors must be non-empty');
    }
  }

  async evaluate(input: ClassifierInput): Promise<EmbeddingDistanceVerdict> {
    const candidate = await this.opts.embed(input.text);
    const distance = this.opts.distanceFn ?? cosineDistance;
    let nearest = Number.POSITIVE_INFINITY;
    for (const reference of this.opts.referenceVectors) {
      const d = distance(candidate, reference);
      if (d < nearest) nearest = d;
    }
    if (nearest <= this.opts.threshold) {
      return {
        verdict: 'blocked',
        reason: `embedding-near-cbrn-corpus@${nearest.toFixed(3)}`,
        distance: nearest,
      };
    }
    return { verdict: 'pass', reason: 'ok', distance: nearest };
  }
}

export function cosineDistance(
  a: readonly number[],
  b: readonly number[],
): number {
  if (a.length !== b.length || a.length === 0) {
    throw new Error('vectors must be same non-zero length');
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  if (magA === 0 || magB === 0) return 1;
  return 1 - dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
