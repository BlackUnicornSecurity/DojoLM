/**
 * K3.3 — SignatureMatcher: Match feature vectors against known model signatures.
 *
 * Implements weighted cosine distance for ranking and verification.
 */

import type {
  FeatureVector,
  BehavioralSignature,
  CandidateMatch,
  VerificationResult,
} from './types.js';
import { FEATURE_WEIGHTS } from './features.js';

const MIN_CONFIDENCE = 0.3;
const DRIFT_THRESHOLD = 0.25;

// ---------------------------------------------------------------------------
// Core Distance Functions
// ---------------------------------------------------------------------------

export function weightedCosineDistance(
  a: FeatureVector,
  b: FeatureVector,
  weights: Readonly<Record<string, number>>,
): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  let matched = 0;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const va = a[key];
    const vb = b[key];

    // Skip dimensions missing in either vector
    if (va === undefined || vb === undefined) continue;

    const w = weights[key] ?? 1;
    dotProduct += va * vb * w;
    normA += va * va * w;
    normB += vb * vb * w;
    matched++;
  }

  if (matched === 0 || normA === 0 || normB === 0) return 1;

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return 1 - Math.max(0, Math.min(1, similarity));
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

export function matchSignatures(
  features: FeatureVector,
  db: readonly BehavioralSignature[],
): readonly CandidateMatch[] {
  const candidates: CandidateMatch[] = [];

  for (const sig of db) {
    const distance = weightedCosineDistance(features, sig.features, FEATURE_WEIGHTS);
    const confidence = 1 - distance;

    if (confidence < MIN_CONFIDENCE) continue;

    const { matched, divergent } = identifyFeatureDifferences(features, sig.features);

    candidates.push({
      modelId: sig.modelId,
      modelFamily: sig.modelFamily,
      provider: sig.provider,
      confidence,
      distance,
      matchedFeatures: matched,
      divergentFeatures: divergent,
    });
  }

  return [...candidates].sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

export function verifySignature(
  features: FeatureVector,
  expected: BehavioralSignature,
): VerificationResult {
  const distance = weightedCosineDistance(features, expected.features, FEATURE_WEIGHTS);
  const driftScore = distance;
  const { divergent } = identifyFeatureDifferences(features, expected.features);

  return {
    targetConfig: {},
    expectedSignature: expected,
    match: driftScore < DRIFT_THRESHOLD,
    driftScore,
    divergentFeatures: divergent,
  };
}

// ---------------------------------------------------------------------------
// Signature Loading
// ---------------------------------------------------------------------------

let cachedSignatures: readonly BehavioralSignature[] | null = null;

export function loadSignatures(
  db?: readonly BehavioralSignature[],
): readonly BehavioralSignature[] {
  if (db) return db;

  if (!cachedSignatures) {
    // Lazy load from barrel export — import at call time to avoid circular deps
    // Callers should pass db explicitly when possible
    cachedSignatures = [];
  }

  return cachedSignatures;
}

export function setSignatureCache(
  db: readonly BehavioralSignature[],
): void {
  cachedSignatures = db;
}

// ---------------------------------------------------------------------------
// Feature Comparison
// ---------------------------------------------------------------------------

function identifyFeatureDifferences(
  a: FeatureVector,
  b: FeatureVector,
): { readonly matched: readonly string[]; readonly divergent: readonly string[] } {
  const matched: string[] = [];
  const divergent: string[] = [];
  const DIVERGENCE_THRESHOLD = 0.3;

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);

  for (const key of allKeys) {
    const va = a[key];
    const vb = b[key];

    if (va === undefined || vb === undefined) {
      divergent.push(key);
      continue;
    }

    if (Math.abs(va - vb) > DIVERGENCE_THRESHOLD) {
      divergent.push(key);
    } else {
      matched.push(key);
    }
  }

  return { matched, divergent };
}
