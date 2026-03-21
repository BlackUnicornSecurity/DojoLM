/**
 * D5.2 — Quality Metric Extractor Tests
 *
 * Pure function tests for all exported extractors and aggregators.
 * No external dependencies, no mocks required.
 */

import { describe, it, expect } from 'vitest';
import {
  extractCoherence,
  extractRelevance,
  extractConsistency,
  extractVerbosity,
  computeQualityMetrics,
  compareModels,
} from '../llm-quality-metrics';
import type { QualityMetrics } from '../llm-quality-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMetrics(overrides: Partial<QualityMetrics> = {}): QualityMetrics {
  return {
    coherenceScore: 0.5,
    relevanceScore: 0.5,
    consistencyScore: 1.0,
    verbosityRatio: 1.0,
    responseLatencyMs: 100,
    tokenCount: 50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// 1. extractCoherence
// ---------------------------------------------------------------------------

describe('extractCoherence', () => {
  it('returns a score > 0.5 for a well-connected response with transition words', () => {
    const prompt = 'Describe machine learning.';
    // Adjacent sentences share content words AND the text uses transition phrases.
    // Sentence 1→2: share "machine", "learning"
    // Sentence 2→3: share "learning", "model", "training"
    // Sentence 3→4: share "model", "training", "data"
    // 3 transitions across 3 gaps → transitionRatio = 1.0  (→ +0.4)
    // High adjacent word overlap → topicConsistency well above 0.17 (→ > +0.1)
    const response =
      'Machine learning trains a model on data. ' +
      'However, machine learning requires large amounts of training data for the model to generalise. ' +
      'Furthermore, model training with insufficient data causes overfitting. ' +
      'Therefore, collecting diverse training data remains essential for any model.';

    const score = extractCoherence(prompt, response);

    expect(score).toBeGreaterThan(0.5);
  });

  it('returns a score < 0.5 for disconnected, unrelated sentences', () => {
    const prompt = 'Tell me something.';
    const response =
      'Bananas are yellow. ' +
      'The Roman Empire fell in 476 AD. ' +
      'Quantum entanglement puzzles physicists. ' +
      'Soccer players run many miles per game.';

    const score = extractCoherence(prompt, response);

    expect(score).toBeLessThan(0.5);
  });

  it('returns 0 for an empty response', () => {
    expect(extractCoherence('some prompt', '')).toBe(0);
  });

  it('returns 0.5 for a single-sentence response', () => {
    expect(extractCoherence('prompt', 'Just one sentence here.')).toBe(0.5);
  });

  it('returns a value in the [0, 1] range', () => {
    const prompt = 'Describe machine learning.';
    const response =
      'Machine learning enables computers to learn from data. ' +
      'Moreover, it uses statistical techniques. ' +
      'Additionally, deep learning is a subfield. ' +
      'Therefore, AI applications are expanding rapidly.';

    const score = extractCoherence(prompt, response);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. extractRelevance
// ---------------------------------------------------------------------------

describe('extractRelevance', () => {
  it('returns a score > 0.5 for an on-topic response', () => {
    // extractWords splits on whitespace only (no punctuation stripping).
    // To maximise Jaccard we need the prompt's content tokens to appear
    // verbatim in the response.
    //
    // Prompt: "neural networks learn training"
    //   extractWords → ["neural", "networks", "learn", "training"]  (4 words)
    //
    // Response reuses all four densely and introduces only a few novel words
    // ("weights", "data", "patterns").  Union ≈ 7, intersection = 4 → Jaccard ≈ 0.57.
    // Bigram "neural networks" appears in both → phraseRatio > 0.
    //
    // Expected score: 0.6 * 0.57 + 0.4 * (≥1/3) ≈ 0.34 + 0.13 ≈ 0.47 minimum.
    // With multiple matching bigrams ("networks learn", "learn training") phraseRatio
    // climbs, pushing the total over 0.5.
    const prompt = 'neural networks learn training';
    const response =
      'neural networks learn from training data. ' +
      'neural networks learn training patterns. ' +
      'neural networks learn training weights.';

    const score = extractRelevance(prompt, response);

    expect(score).toBeGreaterThan(0.5);
  });

  it('returns a score < 0.3 for a completely off-topic response', () => {
    const prompt = 'What are the main benefits of regular exercise?';
    const response =
      'The Eiffel Tower was built in 1889 for the Paris World Fair. ' +
      'It stands 330 metres tall and weighs approximately 7300 tonnes.';

    const score = extractRelevance(prompt, response);

    expect(score).toBeLessThan(0.3);
  });

  it('returns 0 when either prompt or response is empty', () => {
    expect(extractRelevance('', 'some response')).toBe(0);
    expect(extractRelevance('some prompt', '')).toBe(0);
  });

  it('returns 0.5 when the prompt contains only stopwords (no content words)', () => {
    // extractWords filters stopwords; a stopword-only prompt yields size 0
    const score = extractRelevance('the a an is', 'some other words here');
    expect(score).toBe(0.5);
  });

  it('returns a value in the [0, 1] range', () => {
    const score = extractRelevance('neural networks deep learning', 'deep learning neural network training');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 3. extractConsistency
// ---------------------------------------------------------------------------

describe('extractConsistency', () => {
  it('returns 1.0 for identical responses', () => {
    const text = 'The capital of France is Paris, a major European city.';
    const score = extractConsistency([text, text, text]);

    expect(score).toBe(1.0);
  });

  it('returns 1.0 for a single response', () => {
    const score = extractConsistency(['Only one response provided here.']);

    expect(score).toBe(1.0);
  });

  it('returns 1.0 for an empty array (no pairs to compare)', () => {
    const score = extractConsistency([]);

    expect(score).toBe(1.0);
  });

  it('returns a score < 0.5 for very different responses', () => {
    const responses = [
      'Photosynthesis converts sunlight into glucose inside chloroplasts using carbon dioxide.',
      'The stock market crashed in nineteen twenty-nine triggering widespread economic depression.',
      'Rugby players tackle opponents carrying oval balls across grass fields during matches.',
      'Renaissance paintings celebrated humanist ideals and depicted mythological narratives beautifully.',
    ];

    const score = extractConsistency(responses);

    expect(score).toBeLessThan(0.5);
  });

  it('returns a value in the [0, 1] range for mixed responses', () => {
    const responses = [
      'Neural networks learn by adjusting weights through back-propagation.',
      'Deep learning uses neural networks with many hidden layers.',
    ];

    const score = extractConsistency(responses);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 4. extractVerbosity
// ---------------------------------------------------------------------------

describe('extractVerbosity', () => {
  it('returns a higher ratio when the response is longer than the prompt', () => {
    const prompt = 'Hi';
    const longResponse = 'Hello there, here is a very detailed explanation that goes on for quite some time.';

    const ratio = extractVerbosity(prompt, longResponse);

    expect(ratio).toBeGreaterThan(1);
  });

  it('returns 1.0 when response and prompt are the same length', () => {
    const text = 'abc';
    expect(extractVerbosity(text, text)).toBe(1.0);
  });

  it('returns response.length when prompt is empty (divides by max(0,1)=1)', () => {
    const response = 'hello';
    const ratio = extractVerbosity('', response);

    // empty string has length 0; max(0,1)=1; ratio = response.length / 1
    expect(ratio).toBe(response.length);
  });

  it('returns 0 when response is empty', () => {
    expect(extractVerbosity('some prompt', '')).toBe(0);
  });

  it('scales proportionally with response length', () => {
    const prompt = 'A'.repeat(10);
    const shortResponse = 'B'.repeat(20);
    const longResponse = 'B'.repeat(40);

    expect(extractVerbosity(prompt, longResponse)).toBeCloseTo(
      2 * extractVerbosity(prompt, shortResponse),
    );
  });
});

// ---------------------------------------------------------------------------
// 5. computeQualityMetrics
// ---------------------------------------------------------------------------

describe('computeQualityMetrics', () => {
  it('returns all six required fields', () => {
    const metrics = computeQualityMetrics('prompt text', 'response text', 123, 42);

    expect(metrics).toHaveProperty('coherenceScore');
    expect(metrics).toHaveProperty('relevanceScore');
    expect(metrics).toHaveProperty('consistencyScore');
    expect(metrics).toHaveProperty('verbosityRatio');
    expect(metrics).toHaveProperty('responseLatencyMs');
    expect(metrics).toHaveProperty('tokenCount');
  });

  it('passes latencyMs and tokenCount through unchanged', () => {
    const latency = 987;
    const tokens = 321;

    const metrics = computeQualityMetrics('prompt', 'response', latency, tokens);

    expect(metrics.responseLatencyMs).toBe(latency);
    expect(metrics.tokenCount).toBe(tokens);
  });

  it('all numeric fields are finite numbers', () => {
    const metrics = computeQualityMetrics('What is AI?', 'AI stands for artificial intelligence.', 200, 10);

    for (const key of Object.keys(metrics) as (keyof QualityMetrics)[]) {
      expect(typeof metrics[key]).toBe('number');
      expect(Number.isFinite(metrics[key])).toBe(true);
    }
  });

  it('single-response consistency defaults to 1.0', () => {
    const metrics = computeQualityMetrics('prompt', 'response', 0, 0);

    expect(metrics.consistencyScore).toBe(1.0);
  });

  it('coherenceScore and relevanceScore are in the [0, 1] range', () => {
    const metrics = computeQualityMetrics(
      'Explain gradient descent in machine learning.',
      'Gradient descent minimizes a loss function by iteratively moving in the direction of steepest descent. ' +
        'However, learning rate selection is critical for convergence.',
      150,
      30,
    );

    expect(metrics.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(metrics.coherenceScore).toBeLessThanOrEqual(1);
    expect(metrics.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(metrics.relevanceScore).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 6. compareModels
// ---------------------------------------------------------------------------

describe('compareModels', () => {
  it('returns null winner when both models have identical metrics', () => {
    const shared = makeMetrics({ coherenceScore: 0.8, relevanceScore: 0.7, consistencyScore: 0.9 });
    const groupA = Array.from({ length: 10 }, () => ({ ...shared }));
    const groupB = Array.from({ length: 10 }, () => ({ ...shared }));

    const result = compareModels(groupA, groupB, 'Alpha', 'Beta');

    expect(result.winner).toBeNull();
  });

  it('sets winner to the better model when there is a statistically significant difference', () => {
    // Model A clearly outperforms Model B across all quality metrics
    const highMetrics = (i: number): QualityMetrics =>
      makeMetrics({
        coherenceScore: 0.90 + i * 0.001,
        relevanceScore: 0.88 + i * 0.001,
        consistencyScore: 0.92 + i * 0.001,
      });

    const lowMetrics = (i: number): QualityMetrics =>
      makeMetrics({
        coherenceScore: 0.10 + i * 0.001,
        relevanceScore: 0.12 + i * 0.001,
        consistencyScore: 0.08 + i * 0.001,
      });

    const groupA = Array.from({ length: 30 }, (_, i) => highMetrics(i));
    const groupB = Array.from({ length: 30 }, (_, i) => lowMetrics(i));

    const result = compareModels(groupA, groupB, 'ModelHigh', 'ModelLow');

    expect(result.winner).toBe('ModelHigh');
  });

  it('returns the correct model names in modelA and modelB', () => {
    const groupA = [makeMetrics()];
    const groupB = [makeMetrics()];

    const result = compareModels(groupA, groupB, 'Prometheus', 'Titan');

    expect(result.modelA).toBe('Prometheus');
    expect(result.modelB).toBe('Titan');
  });

  it('returns sampleSize equal to the smaller of the two group sizes', () => {
    const groupA = Array.from({ length: 5 }, () => makeMetrics());
    const groupB = Array.from({ length: 8 }, () => makeMetrics());

    const result = compareModels(groupA, groupB, 'A', 'B');

    expect(result.sampleSize).toBe(5);
  });

  it('includes deltas for coherenceScore, relevanceScore, and consistencyScore', () => {
    const groupA = [makeMetrics({ coherenceScore: 0.8, relevanceScore: 0.7, consistencyScore: 0.9 })];
    const groupB = [makeMetrics({ coherenceScore: 0.6, relevanceScore: 0.5, consistencyScore: 0.7 })];

    const result = compareModels(groupA, groupB, 'A', 'B');

    expect(result.metricDeltas).toHaveProperty('coherenceScore');
    expect(result.metricDeltas).toHaveProperty('relevanceScore');
    expect(result.metricDeltas).toHaveProperty('consistencyScore');
    expect(result.metricDeltas['coherenceScore']).toBeCloseTo(0.2);
    expect(result.metricDeltas['relevanceScore']).toBeCloseTo(0.2);
    expect(result.metricDeltas['consistencyScore']).toBeCloseTo(0.2);
  });

  it('significanceLevel is a number in the (0, 1] range', () => {
    const groupA = Array.from({ length: 5 }, () => makeMetrics());
    const groupB = Array.from({ length: 5 }, () => makeMetrics());

    const result = compareModels(groupA, groupB, 'A', 'B');

    expect(typeof result.significanceLevel).toBe('number');
    expect(result.significanceLevel).toBeGreaterThan(0);
    expect(result.significanceLevel).toBeLessThanOrEqual(1);
  });

  it('uses default model names when none are provided', () => {
    const groupA = [makeMetrics()];
    const groupB = [makeMetrics()];

    const result = compareModels(groupA, groupB);

    expect(result.modelA).toBe('Model A');
    expect(result.modelB).toBe('Model B');
  });
});
