/**
 * Tests for SignatureMatcher:
 *   weightedCosineDistance, matchSignatures, verifySignature
 *
 * Covers distance math, ranking, confidence threshold filtering, and
 * verification drift detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  weightedCosineDistance,
  matchSignatures,
  verifySignature,
  setSignatureCache,
} from './signature-matcher.js';
import type {
  FeatureVector,
  BehavioralSignature,
  CandidateMatch,
  VerificationResult,
} from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignature(
  modelId: string,
  features: FeatureVector,
  overrides: Partial<BehavioralSignature> = {},
): BehavioralSignature {
  return {
    modelId,
    modelFamily: overrides.modelFamily ?? modelId.split('-')[0],
    provider: overrides.provider ?? 'test-provider',
    features,
    lastVerified: '2024-01-01',
    ...overrides,
  };
}

// uniform weights of 1 for all keys
function uniformWeights(keys: string[]): Record<string, number> {
  return Object.fromEntries(keys.map((k) => [k, 1]));
}

// ---------------------------------------------------------------------------
// weightedCosineDistance
// ---------------------------------------------------------------------------

describe('weightedCosineDistance()', () => {
  it('returns 0 for identical vectors', () => {
    const a: FeatureVector = { x: 0.5, y: 0.8, z: 0.2 };
    const b: FeatureVector = { x: 0.5, y: 0.8, z: 0.2 };
    const weights = uniformWeights(['x', 'y', 'z']);
    const dist = weightedCosineDistance(a, b, weights);
    expect(dist).toBeCloseTo(0, 5);
  });

  it('returns 1 for orthogonal vectors', () => {
    // In non-negative space, truly orthogonal means one has zeros where other has values.
    // [1,0] vs [0,1] → dot=0, so similarity=0, distance=1
    const a: FeatureVector = { x: 1, y: 0 };
    const b: FeatureVector = { x: 0, y: 1 };
    const weights = uniformWeights(['x', 'y']);
    const dist = weightedCosineDistance(a, b, weights);
    expect(dist).toBeCloseTo(1, 5);
  });

  it('returns 1 for zero vector (no matched dimensions)', () => {
    const a: FeatureVector = { x: 0.5 };
    const b: FeatureVector = { y: 0.5 }; // disjoint keys
    const weights = { x: 1, y: 1 };
    const dist = weightedCosineDistance(a, b, weights);
    expect(dist).toBe(1);
  });

  it('returns lower distance for more similar vectors', () => {
    const reference: FeatureVector = { x: 0.8, y: 0.6, z: 0.4 };
    const close: FeatureVector = { x: 0.75, y: 0.65, z: 0.45 };
    const far: FeatureVector = { x: 0.1, y: 0.1, z: 0.9 };
    const weights = uniformWeights(['x', 'y', 'z']);

    const distClose = weightedCosineDistance(reference, close, weights);
    const distFar = weightedCosineDistance(reference, far, weights);
    expect(distClose).toBeLessThan(distFar);
  });

  it('higher weight on a matched dimension increases similarity', () => {
    const a: FeatureVector = { x: 1, y: 0.1 };
    const b: FeatureVector = { x: 1, y: 0.9 };
    const lowWeight = { x: 1, y: 10 }; // high weight on differing dim → less similar
    const highWeight = { x: 10, y: 1 }; // high weight on matching dim → more similar

    const distHighWeightOnMatch = weightedCosineDistance(a, b, highWeight);
    const distHighWeightOnDiff = weightedCosineDistance(a, b, lowWeight);
    expect(distHighWeightOnMatch).toBeLessThan(distHighWeightOnDiff);
  });

  it('returns value in [0, 1] range', () => {
    const a: FeatureVector = { x: 0.3, y: 0.7, z: 0.5 };
    const b: FeatureVector = { x: 0.9, y: 0.1, z: 0.6 };
    const weights = uniformWeights(['x', 'y', 'z']);
    const dist = weightedCosineDistance(a, b, weights);
    expect(dist).toBeGreaterThanOrEqual(0);
    expect(dist).toBeLessThanOrEqual(1);
  });

  it('defaults missing weight keys to 1', () => {
    const a: FeatureVector = { x: 0.5, y: 0.5 };
    const b: FeatureVector = { x: 0.5, y: 0.5 };
    const weights = {}; // no weights provided → defaults to 1
    const dist = weightedCosineDistance(a, b, weights);
    expect(dist).toBeCloseTo(0, 5);
  });

  it('handles empty vectors (both empty) returning 1', () => {
    const dist = weightedCosineDistance({}, {}, {});
    expect(dist).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// matchSignatures
// ---------------------------------------------------------------------------

describe('matchSignatures()', () => {
  const gpt4oFeatures: FeatureVector = {
    self_identification: 0.8,
    code_capability: 0.9,
    verbosity: 0.6,
    refusal_threshold: 0.3,
  };

  const gpt4oSignature = makeSignature('gpt-4o', gpt4oFeatures, {
    modelFamily: 'gpt',
    provider: 'openai',
  });

  const claudeFeatures: FeatureVector = {
    self_identification: 0.9,
    code_capability: 0.7,
    verbosity: 0.8,
    refusal_threshold: 0.8,
  };

  const claudeSignature = makeSignature('claude-3-5-sonnet', claudeFeatures, {
    modelFamily: 'claude',
    provider: 'anthropic',
  });

  const db = [gpt4oSignature, claudeSignature];

  it('returns candidates sorted by confidence descending', () => {
    const results = matchSignatures(gpt4oFeatures, db);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].confidence).toBeGreaterThanOrEqual(results[i].confidence);
    }
  });

  it('ranks GPT-4o signature first when querying GPT-4o-like features', () => {
    const results = matchSignatures(gpt4oFeatures, db);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].modelId).toBe('gpt-4o');
  });

  it('ranks Claude signature first when querying Claude-like features', () => {
    const results = matchSignatures(claudeFeatures, db);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].modelId).toBe('claude-3-5-sonnet');
  });

  it('filters out candidates below 0.3 confidence threshold', () => {
    // A feature vector orthogonal to all signatures should yield no candidates
    const randomFeatures: FeatureVector = {
      unknown_dim_a: 0,
      unknown_dim_b: 0,
    };
    const results = matchSignatures(randomFeatures, db);
    // All results must have confidence >= 0.3
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('returns empty array for empty database', () => {
    const results = matchSignatures(gpt4oFeatures, []);
    expect(results).toHaveLength(0);
  });

  it('each result includes modelId, modelFamily, provider, confidence, distance', () => {
    const results = matchSignatures(gpt4oFeatures, db);
    for (const r of results) {
      expect(r.modelId).toBeDefined();
      expect(r.modelFamily).toBeDefined();
      expect(r.provider).toBeDefined();
      expect(r.confidence).toBeDefined();
      expect(r.distance).toBeDefined();
    }
  });

  it('confidence + distance sum to approximately 1', () => {
    const results = matchSignatures(gpt4oFeatures, db);
    for (const r of results) {
      expect(r.confidence + r.distance).toBeCloseTo(1, 5);
    }
  });

  it('includes matchedFeatures and divergentFeatures arrays', () => {
    const results = matchSignatures(gpt4oFeatures, db);
    for (const r of results) {
      expect(Array.isArray(r.matchedFeatures)).toBe(true);
      expect(Array.isArray(r.divergentFeatures)).toBe(true);
    }
  });

  it('handles single signature database', () => {
    const results = matchSignatures(gpt4oFeatures, [gpt4oSignature]);
    expect(results.length).toBeLessThanOrEqual(1);
    if (results.length > 0) {
      expect(results[0].modelId).toBe('gpt-4o');
    }
  });
});

// ---------------------------------------------------------------------------
// verifySignature
// ---------------------------------------------------------------------------

describe('verifySignature()', () => {
  const knownFeatures: FeatureVector = {
    self_identification: 0.9,
    code_capability: 0.85,
    verbosity: 0.7,
    refusal_threshold: 0.6,
    formality_level: 0.8,
  };

  const knownSignature = makeSignature('gpt-4o', knownFeatures, {
    modelFamily: 'gpt',
    provider: 'openai',
  });

  it('returns match=true when features closely match signature (drift < 0.25)', () => {
    // Nearly identical features → very low drift
    const sameFeatures: FeatureVector = {
      self_identification: 0.88,
      code_capability: 0.84,
      verbosity: 0.72,
      refusal_threshold: 0.61,
      formality_level: 0.79,
    };
    const result = verifySignature(sameFeatures, knownSignature);
    expect(result.match).toBe(true);
    expect(result.driftScore).toBeLessThan(0.25);
  });

  it('returns match=false when features diverge significantly (drift >= 0.25)', () => {
    // Completely different features → high drift
    const differentFeatures: FeatureVector = {
      self_identification: 0.0,
      code_capability: 0.0,
      verbosity: 0.0,
      refusal_threshold: 1.0,
      formality_level: 0.0,
    };
    const result = verifySignature(differentFeatures, knownSignature);
    expect(result.match).toBe(false);
    expect(result.driftScore).toBeGreaterThanOrEqual(0.25);
  });

  it('returns expectedSignature in result', () => {
    const result = verifySignature(knownFeatures, knownSignature);
    expect(result.expectedSignature).toBe(knownSignature);
  });

  it('returns divergentFeatures array', () => {
    const result = verifySignature(knownFeatures, knownSignature);
    expect(Array.isArray(result.divergentFeatures)).toBe(true);
  });

  it('driftScore is in [0, 1] range', () => {
    const result = verifySignature(knownFeatures, knownSignature);
    expect(result.driftScore).toBeGreaterThanOrEqual(0);
    expect(result.driftScore).toBeLessThanOrEqual(1);
  });

  it('detects model swap — different model family features fail verification', () => {
    // Simulate a completely different model's features being checked against known sig
    const swappedModelFeatures: FeatureVector = {
      self_identification: 0.05, // rarely identifies
      code_capability: 0.2,
      verbosity: 0.95, // very verbose
      refusal_threshold: 0.05,
      formality_level: 0.1,
    };
    const result = verifySignature(swappedModelFeatures, knownSignature);
    expect(result.match).toBe(false);
  });

  it('identical features produce driftScore near 0', () => {
    const result = verifySignature(knownFeatures, knownSignature);
    expect(result.driftScore).toBeCloseTo(0, 3);
  });
});

// ---------------------------------------------------------------------------
// setSignatureCache
// ---------------------------------------------------------------------------

describe('setSignatureCache()', () => {
  it('does not throw when called with valid signatures', () => {
    const sigs = [
      makeSignature('model-a', { self_identification: 0.5 }),
      makeSignature('model-b', { self_identification: 0.8 }),
    ];
    expect(() => setSignatureCache(sigs)).not.toThrow();
  });

  it('accepts empty array', () => {
    expect(() => setSignatureCache([])).not.toThrow();
  });
});
