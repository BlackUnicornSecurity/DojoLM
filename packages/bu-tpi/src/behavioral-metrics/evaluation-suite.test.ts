/**
 * File: evaluation-suite.test.ts
 * Purpose: Tests for behavioral metrics computation
 * Epic: OBLITERATUS (OBL) — T2.1
 */

import { describe, it, expect } from 'vitest';
import { computeBehavioralMetrics } from './evaluation-suite.js';
import type { ResponseFeature } from '../fingerprint/types.js';

function makeResponse(overrides: Partial<ResponseFeature> & { rawText: string }): ResponseFeature {
  return {
    probeId: 'test-probe',
    category: 'safety-boundary',
    extractedValue: '',
    confidence: 0.9,
    durationMs: 100,
    ...overrides,
  };
}

describe('computeBehavioralMetrics', () => {
  it('returns zeros for empty responses', () => {
    const result = computeBehavioralMetrics([]);
    expect(result.refusalRate).toBe(0);
    expect(result.coherenceScore).toBe(0);
    expect(result.behavioralDrift).toBe(0);
    expect(result.consistencyScore).toBe(0);
  });

  it('computes correct refusal rate', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ rawText: "I can't help with that request." }),
      makeResponse({ rawText: "I can't assist with this." }),
      makeResponse({ rawText: "Sure, here is the information you requested about network security." }),
      makeResponse({ rawText: "Here are some details about the topic." }),
    ];
    const result = computeBehavioralMetrics(responses);
    expect(result.refusalRate).toBe(0.5);
  });

  it('computes high refusal rate for all-refusing responses', () => {
    const responses: ResponseFeature[] = Array.from({ length: 5 }, () =>
      makeResponse({ rawText: "I can't help with that." })
    );
    const result = computeBehavioralMetrics(responses);
    expect(result.refusalRate).toBe(1);
  });

  it('computes zero refusal rate for all-compliant responses', () => {
    const responses: ResponseFeature[] = Array.from({ length: 5 }, () =>
      makeResponse({ rawText: "Sure, here is the information. Network security involves multiple layers of protection." })
    );
    const result = computeBehavioralMetrics(responses);
    expect(result.refusalRate).toBe(0);
  });

  it('computes coherence score based on response structure', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ rawText: "This is a well-structured response. It has multiple sentences. Each one adds value." }),
      makeResponse({ rawText: "Another good response with proper structure. The content is meaningful." }),
    ];
    const result = computeBehavioralMetrics(responses);
    expect(result.coherenceScore).toBeGreaterThan(0);
    expect(result.coherenceScore).toBeLessThanOrEqual(1);
  });

  it('computes low coherence for empty or minimal responses', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ rawText: '', confidence: 0.1 }),
      makeResponse({ rawText: 'ok', confidence: 0.1 }),
    ];
    const result = computeBehavioralMetrics(responses);
    expect(result.coherenceScore).toBeLessThan(0.5);
  });

  it('computes behavioral drift from response variance', () => {
    // Varied response lengths indicate drift
    const responses: ResponseFeature[] = [
      makeResponse({ rawText: "Short." }),
      makeResponse({ rawText: "This is a much longer response that contains significantly more words and detail about the topic at hand, providing extensive information." }),
      makeResponse({ rawText: "Medium length response here." }),
      makeResponse({ rawText: "Another extremely detailed and verbose response with lots of information packed into every sentence of the answer." }),
    ];
    const result = computeBehavioralMetrics(responses);
    expect(result.behavioralDrift).toBeGreaterThan(0);
  });

  it('computes high consistency for uniform responses', () => {
    const responses: ResponseFeature[] = Array.from({ length: 6 }, () =>
      makeResponse({ rawText: "I can't help with that request. This is against my guidelines.", category: 'safety-boundary' })
    );
    const result = computeBehavioralMetrics(responses);
    expect(result.consistencyScore).toBeGreaterThan(0.5);
  });

  it('all metrics are between 0 and 1', () => {
    const responses: ResponseFeature[] = Array.from({ length: 10 }, (_, i) =>
      makeResponse({
        probeId: `probe-${i}`,
        rawText: i % 2 === 0
          ? "I can't help with that dangerous request."
          : "Sure, here is the information about cybersecurity best practices.",
      })
    );
    const result = computeBehavioralMetrics(responses);
    expect(result.refusalRate).toBeGreaterThanOrEqual(0);
    expect(result.refusalRate).toBeLessThanOrEqual(1);
    expect(result.coherenceScore).toBeGreaterThanOrEqual(0);
    expect(result.coherenceScore).toBeLessThanOrEqual(1);
    expect(result.behavioralDrift).toBeGreaterThanOrEqual(0);
    expect(result.behavioralDrift).toBeLessThanOrEqual(1);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(1);
  });
});
