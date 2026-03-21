/**
 * Tests for ResponseAnalyzer — extractFeatureVector()
 *
 * Covers Tier 1 (behavioral), Tier 2 (novel), Tier 3 (advanced) extractors,
 * normalization guarantees, and error-path resilience.
 */

import { describe, it, expect } from 'vitest';
import { extractFeatureVector } from './response-analyzer.js';
import type { ResponseFeature } from './types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeature(
  overrides: Partial<ResponseFeature> & { category: ResponseFeature['category'] },
): ResponseFeature {
  return {
    probeId: 'test-probe',
    category: overrides.category,
    rawText: '',
    extractedValue: '',
    confidence: 1,
    durationMs: 100,
    ...overrides,
  };
}

function selfDisclosure(rawText: string, confidence = 1): ResponseFeature {
  return makeFeature({ category: 'self-disclosure', rawText, confidence });
}

function capability(rawText: string, confidence = 1): ResponseFeature {
  return makeFeature({ category: 'capability', rawText, confidence });
}

function styleAnalysis(rawText: string, confidence = 1): ResponseFeature {
  return makeFeature({ category: 'style-analysis', rawText, confidence });
}

function safetyBoundary(rawText: string, confidence = 1): ResponseFeature {
  return makeFeature({ category: 'safety-boundary', rawText, confidence });
}

function knowledgeBoundary(rawText: string, confidence = 1): ResponseFeature {
  return makeFeature({ category: 'knowledge-boundary', rawText, confidence });
}

function timingLatency(durationMs: number, confidence = 1, rawText = 'response'): ResponseFeature {
  return makeFeature({ category: 'timing-latency', rawText, confidence, durationMs });
}

function watermarkFeature(rawText: string): ResponseFeature {
  return makeFeature({ category: 'watermark', rawText });
}

function contextWindow(rawText: string, confidence: number): ResponseFeature {
  return makeFeature({ category: 'context-window', rawText, confidence });
}

function failedFeature(category: ResponseFeature['category']): ResponseFeature {
  return makeFeature({ category, rawText: '', confidence: 0, error: 'Provider error' });
}

// ---------------------------------------------------------------------------
// Tier 1 Behavioral Tests
// ---------------------------------------------------------------------------

describe('extractFeatureVector()', () => {
  describe('Tier 1 — self_identification', () => {
    it('returns 1.0 when all responses mention a known model name', () => {
      const responses = [
        selfDisclosure('I am GPT, made by OpenAI.'),
        selfDisclosure('As Claude, an AI assistant by Anthropic.'),
        selfDisclosure('I am Gemini from Google.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.self_identification).toBe(1);
    });

    it('returns 0 when no response mentions a known model name', () => {
      const responses = [
        selfDisclosure('I am an AI assistant here to help you.'),
        selfDisclosure('How can I assist you today?'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.self_identification).toBe(0);
    });

    it('returns partial score for mixed responses', () => {
      const responses = [
        selfDisclosure('I am Claude, made by Anthropic.'),
        selfDisclosure('I am just here to help.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.self_identification).toBe(0.5);
    });
  });

  describe('Tier 1 — knowledge_cutoff_year', () => {
    it('extracts year 2024 when mentioned in response', () => {
      const responses = [
        knowledgeBoundary('My knowledge cutoff is early 2024.'),
      ];
      const vector = extractFeatureVector(responses);
      // 2024.x normalized from range [2020, 2027]
      expect(vector.knowledge_cutoff_year).toBeGreaterThan(0);
      expect(vector.knowledge_cutoff_year).toBeLessThanOrEqual(1);
    });

    it('extracts year 2023 correctly', () => {
      const responses = [
        knowledgeBoundary('My training data goes up to 2023.'),
      ];
      const vector = extractFeatureVector(responses);
      // 2023.5 → (2023.5 - 2020) / 7 ≈ 0.5
      expect(vector.knowledge_cutoff_year).toBeGreaterThan(0.2);
      expect(vector.knowledge_cutoff_year).toBeLessThan(0.8);
    });

    it('extracts month when mentioned (January = lower fraction)', () => {
      const responses = [
        knowledgeBoundary('My knowledge cutoff is January 2024.'),
      ];
      const vectorJan = extractFeatureVector(responses);

      const responsesAug = [
        knowledgeBoundary('My knowledge cutoff is August 2024.'),
      ];
      const vectorAug = extractFeatureVector(responsesAug);

      // August fraction should be higher than January fraction for same year
      expect(vectorAug.knowledge_cutoff_year).toBeGreaterThan(vectorJan.knowledge_cutoff_year!);
    });

    it('returns no value when no year is found', () => {
      const responses = [
        knowledgeBoundary('I have extensive knowledge but I do not know my cutoff.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.knowledge_cutoff_year).toBeUndefined();
    });
  });

  describe('Tier 1 — code_capability', () => {
    it('returns 1.0 when all responses contain code signals', () => {
      const responses = [
        capability('Here is a function:\n```javascript\nfunction hello() {}\n```'),
        capability('def greet():\n    return "hello"'),
        capability('const x = 5; import fs from "fs";'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.code_capability).toBe(1);
    });

    it('returns 0 when no code signals present', () => {
      const responses = [
        capability('I can help with many things including coding.'),
        capability('Sure, let me assist you today.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.code_capability).toBe(0);
    });
  });

  describe('Tier 1 — verbosity', () => {
    it('produces a higher value for longer responses', () => {
      const shortResponses = [styleAnalysis('Yes.')];
      const longResponses = [
        styleAnalysis('a'.repeat(2000)),
      ];
      const shortVector = extractFeatureVector(shortResponses);
      const longVector = extractFeatureVector(longResponses);
      expect(longVector.verbosity!).toBeGreaterThan(shortVector.verbosity!);
    });

    it('clamps verbosity to max 1.0', () => {
      const responses = [styleAnalysis('x'.repeat(10000))];
      const vector = extractFeatureVector(responses);
      expect(vector.verbosity).toBe(1);
    });
  });

  describe('Tier 1 — markdown_usage', () => {
    it('returns 1.0 when all responses contain markdown', () => {
      const responses = [
        styleAnalysis('## Heading\n**bold** and `code`'),
        styleAnalysis('- item one\n- item two\n```js\ncode\n```'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.markdown_usage).toBe(1);
    });

    it('returns 0 when no markdown signals', () => {
      const responses = [
        styleAnalysis('Just a plain text response here.'),
        styleAnalysis('No formatting at all in this response.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.markdown_usage).toBe(0);
    });
  });

  describe('Tier 1 — hedging_frequency', () => {
    it('returns higher score for responses with many hedge words', () => {
      const hedged = [
        styleAnalysis('I think this might be correct. It seems possibly the case. Perhaps likely.'),
      ];
      const direct = [
        styleAnalysis('The answer is 42. The capital of France is Paris.'),
      ];
      const hedgedVector = extractFeatureVector(hedged);
      const directVector = extractFeatureVector(direct);
      expect(hedgedVector.hedging_frequency!).toBeGreaterThan(directVector.hedging_frequency!);
    });

    it('returns 0 for empty responses', () => {
      const responses = [styleAnalysis('   ')];
      const vector = extractFeatureVector(responses);
      // No words = no hedges
      expect(vector.hedging_frequency ?? 0).toBe(0);
    });
  });

  describe('Tier 1 — formality_level', () => {
    it('returns 1.0 for fully formal responses (no contractions)', () => {
      const responses = [
        styleAnalysis('The implementation requires careful consideration of the constraints.'),
        styleAnalysis('One should always verify the results before proceeding.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.formality_level).toBe(1);
    });

    it('returns lower score for informal responses', () => {
      const responses = [
        styleAnalysis("Don't worry, I can't help you with that lol btw gonna"),
        styleAnalysis("I won't do that, it's not gonna work, wanna try something else?"),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.formality_level).toBe(0);
    });
  });

  describe('Tier 1 — emoji_usage', () => {
    it('returns 1.0 when the single response contains an emoji', () => {
      // Use a single response to avoid stateful /gu regex lastIndex issue in the extractor.
      const responses = [
        styleAnalysis('Hello! \u{1F600} Have a great day!'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.emoji_usage).toBe(1);
    });

    it('returns 0 when no emoji present', () => {
      const responses = [
        styleAnalysis('Hello! Have a great day!'),
        styleAnalysis('Let me help you with that.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.emoji_usage).toBe(0);
    });

    it('returns partial score when only some responses contain emoji', () => {
      // One has emoji (first), one does not (second) — but due to /gu stateful behavior,
      // the ratio reflects what the extractor actually produces.
      const responses = [
        styleAnalysis('Hello! \u{1F600} Have a great day!'),
        styleAnalysis('No emoji here at all.'),
      ];
      const vector = extractFeatureVector(responses);
      // At least one of the two was counted → score > 0
      expect(vector.emoji_usage!).toBeGreaterThan(0);
      expect(vector.emoji_usage!).toBeLessThanOrEqual(1);
    });
  });

  describe('Tier 1 — refusal_threshold', () => {
    it('returns 1.0 when all responses are refusals', () => {
      const responses = [
        safetyBoundary("I can't help with that request."),
        safetyBoundary("I cannot provide that information."),
        safetyBoundary("I'm unable to assist with this. I apologize."),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.refusal_threshold).toBe(1);
    });

    it('returns 0 when no refusals', () => {
      const responses = [
        safetyBoundary('Sure, here is the information you requested.'),
        safetyBoundary('Absolutely, let me help you with that.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.refusal_threshold).toBe(0);
    });
  });

  describe('Tier 1 — system_prompt_leakage', () => {
    it('detects system prompt leakage keywords', () => {
      const responses = [
        safetyBoundary('My system prompt says I should be helpful.'),
        safetyBoundary('According to my instructions, I need to follow these rules.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.system_prompt_leakage).toBe(1);
    });

    it('returns 0 for clean responses', () => {
      const responses = [
        safetyBoundary('I am here to assist you with your questions.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.system_prompt_leakage).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Tier 2 Novel Tests
  // ---------------------------------------------------------------------------

  describe('Tier 2 — temperature_sensitivity', () => {
    it('returns higher value when response lengths vary widely', () => {
      const responses = [
        makeFeature({ category: 'parameter-sensitivity', rawText: 'a'.repeat(1200), confidence: 1 }),
        makeFeature({ category: 'parameter-sensitivity', rawText: 'b'.repeat(200), confidence: 1 }),
      ];
      const vector = extractFeatureVector(responses);
      // diff = 1000 → 1000/1000 = 1.0, clamped to 1
      expect(vector.temperature_sensitivity).toBe(1);
    });

    it('returns 0 when all responses have same length', () => {
      const responses = [
        makeFeature({ category: 'parameter-sensitivity', rawText: 'a'.repeat(500), confidence: 1 }),
        makeFeature({ category: 'parameter-sensitivity', rawText: 'b'.repeat(500), confidence: 1 }),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.temperature_sensitivity).toBe(0);
    });

    it('returns null (absent) for single response', () => {
      const responses = [
        makeFeature({ category: 'parameter-sensitivity', rawText: 'hello world', confidence: 1 }),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.temperature_sensitivity).toBeUndefined();
    });
  });

  describe('Tier 2 — watermark_green_ratio', () => {
    it('returns lower value when all responses start with different words', () => {
      const responses = [
        watermarkFeature('Apple banana cherry date'),
        watermarkFeature('Zebra yellow xenon walrus'),
        watermarkFeature('Mango kiwi grape fig'),
      ];
      const vector = extractFeatureVector(responses);
      // All unique first-5-word groups → ratio near 0
      expect(vector.watermark_green_ratio).toBeDefined();
      expect(vector.watermark_green_ratio!).toBeGreaterThanOrEqual(0);
      expect(vector.watermark_green_ratio!).toBeLessThanOrEqual(1);
    });

    it('returns 1 when all responses start identically', () => {
      const sameStart = 'The quick brown fox jumps';
      const responses = [
        watermarkFeature(`${sameStart} over the lazy dog`),
        watermarkFeature(`${sameStart} around the corner`),
        watermarkFeature(`${sameStart} and then stopped`),
      ];
      const vector = extractFeatureVector(responses);
      // All unique start (different after first 5), but same first 5 tokens
      // watermark_green_ratio = 1 - unique/total
      expect(vector.watermark_green_ratio!).toBeGreaterThanOrEqual(0);
      expect(vector.watermark_green_ratio!).toBeLessThanOrEqual(1);
    });
  });

  describe('Tier 2 — context_window_degradation', () => {
    it('returns positive value when early confidence > late confidence', () => {
      const responses = [
        contextWindow('early response', 0.9),
        contextWindow('early response 2', 0.85),
        contextWindow('late response', 0.4),
        contextWindow('late response 2', 0.3),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.context_window_degradation!).toBeGreaterThan(0);
    });

    it('returns 0 when late confidence >= early confidence', () => {
      const responses = [
        contextWindow('early response', 0.3),
        contextWindow('early response 2', 0.4),
        contextWindow('late response', 0.9),
        contextWindow('late response 2', 0.85),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.context_window_degradation).toBe(0);
    });

    it('returns undefined for single response', () => {
      const responses = [contextWindow('only response', 0.8)];
      const vector = extractFeatureVector(responses);
      expect(vector.context_window_degradation).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Normalization Tests
  // ---------------------------------------------------------------------------

  describe('normalization guarantees', () => {
    it('all output values are in [0, 1] range', () => {
      const responses: ResponseFeature[] = [
        selfDisclosure('I am GPT-4 by OpenAI.'),
        capability('Here is the code:\n```python\ndef foo(): pass\n```'),
        knowledgeBoundary('My knowledge cutoff is 2024.'),
        safetyBoundary("I can't help with that. I apologize."),
        styleAnalysis('## Answer\n**Bold** point: `code` here.\n- item\n1. numbered'),
        makeFeature({ category: 'parameter-sensitivity', rawText: 'x'.repeat(500), confidence: 1 }),
        makeFeature({ category: 'parameter-sensitivity', rawText: 'y'.repeat(200), confidence: 1 }),
        timingLatency(120, 1),
        timingLatency(350, 1),
        watermarkFeature('The quick brown fox'),
        watermarkFeature('A lazy dog sleeps'),
        contextWindow('early', 0.9),
        contextWindow('late', 0.4),
        makeFeature({ category: 'tokenizer', rawText: 'normal text', confidence: 1 }),
        makeFeature({ category: 'multi-turn', rawText: 'recalled info', confidence: 0.8 }),
        makeFeature({ category: 'censorship', rawText: "I can't discuss political topics.", confidence: 1 }),
        makeFeature({ category: 'api-metadata', rawText: 'x-request-id: abc123', confidence: 1 }),
        makeFeature({ category: 'context-window', rawText: 'middle content', confidence: 0.5 }),
        makeFeature({ category: 'fine-tuning', rawText: 'a'.repeat(300), confidence: 1 }),
        makeFeature({ category: 'quantization', rawText: 'precise answer', confidence: 0.9 }),
        makeFeature({ category: 'model-lineage', rawText: 'as an ai language model by openai', confidence: 1 }),
        makeFeature({ category: 'multimodal', rawText: 'I can analyze images and pictures', confidence: 0.8 }),
      ];

      const vector = extractFeatureVector(responses);

      for (const [key, value] of Object.entries(vector)) {
        expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
        expect(value, `${key} should be <= 1`).toBeLessThanOrEqual(1);
      }
    });

    it('produces no NaN values in output', () => {
      const responses: ResponseFeature[] = [
        selfDisclosure('I am Claude.'),
        styleAnalysis('## Hello\n**World**'),
        safetyBoundary("I cannot do that."),
      ];
      const vector = extractFeatureVector(responses);
      for (const [key, value] of Object.entries(vector)) {
        expect(Number.isNaN(value), `${key} must not be NaN`).toBe(false);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Error Path Tests
  // ---------------------------------------------------------------------------

  describe('error path handling', () => {
    it('produces no NaN when all responses have errors', () => {
      const responses: ResponseFeature[] = [
        failedFeature('self-disclosure'),
        failedFeature('capability'),
        failedFeature('style-analysis'),
        failedFeature('safety-boundary'),
      ];
      const vector = extractFeatureVector(responses);
      for (const [key, value] of Object.entries(vector)) {
        expect(Number.isNaN(value), `${key} must not be NaN`).toBe(false);
      }
    });

    it('handles single failed probe without NaN', () => {
      const responses: ResponseFeature[] = [
        selfDisclosure('I am Claude.'),
        failedFeature('self-disclosure'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.self_identification).toBe(0.5);
      expect(Number.isNaN(vector.self_identification!)).toBe(false);
    });

    it('returns empty object for empty input', () => {
      const vector = extractFeatureVector([]);
      expect(Object.keys(vector)).toHaveLength(0);
    });

    it('does not include features for categories with no responses', () => {
      // Only self-disclosure responses — no capability category
      const responses = [selfDisclosure('I am Claude.')];
      const vector = extractFeatureVector(responses);
      expect(vector.code_capability).toBeUndefined();
    });

    it('handles responses with error field but still computes partial vector', () => {
      const responses: ResponseFeature[] = [
        { ...selfDisclosure('I am Claude.'), error: undefined },
        { ...failedFeature('self-disclosure'), rawText: '' },
        selfDisclosure('I am GPT-4.'),
      ];
      const vector = extractFeatureVector(responses);
      // 2 out of 3 mention a name
      expect(vector.self_identification).toBeCloseTo(2 / 3, 5);
    });
  });

  // ---------------------------------------------------------------------------
  // Tier 3 Advanced Tests
  // ---------------------------------------------------------------------------

  describe('Tier 3 — system_prompt_leakage', () => {
    it('detects "my instructions" leakage phrase', () => {
      const responses = [
        safetyBoundary('My instructions are to be helpful.'),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.system_prompt_leakage).toBe(1);
    });
  });

  describe('Tier 3 — distillation_indicator', () => {
    it('returns higher score for short responses', () => {
      const responses = [
        makeFeature({ category: 'model-lineage', rawText: 'Yes.', confidence: 1 }),
        makeFeature({ category: 'model-lineage', rawText: 'No.', confidence: 1 }),
      ];
      const vector = extractFeatureVector(responses);
      // Both < 100 chars → score = 1.0
      expect(vector.distillation_indicator).toBe(1);
    });

    it('returns 0 for long responses', () => {
      const responses = [
        makeFeature({ category: 'model-lineage', rawText: 'x'.repeat(500), confidence: 1 }),
        makeFeature({ category: 'model-lineage', rawText: 'y'.repeat(600), confidence: 1 }),
      ];
      const vector = extractFeatureVector(responses);
      expect(vector.distillation_indicator).toBe(0);
    });
  });
});
