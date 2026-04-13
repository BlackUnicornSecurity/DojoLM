/**
 * File: alignment-detector.test.ts
 * Purpose: Tests for alignment imprint detection
 * Epic: OBLITERATUS (OBL) — T1.1
 */

import { describe, it, expect } from 'vitest';
import { detectAlignmentImprint } from './alignment-detector.js';
import type { ResponseFeature } from '../fingerprint/types.js';

function makeResponse(overrides: Partial<ResponseFeature> & { probeId: string; rawText: string }): ResponseFeature {
  return {
    category: 'safety-boundary',
    extractedValue: '',
    confidence: 0.9,
    durationMs: 100,
    ...overrides,
  };
}

describe('detectAlignmentImprint', () => {
  it('returns uniform distribution for empty responses', () => {
    const result = detectAlignmentImprint([]);
    expect(result.confidence).toBe(0);
    expect(result.methodProbabilities.DPO).toBeCloseTo(0.2, 1);
    expect(result.methodProbabilities.RLHF).toBeCloseTo(0.2, 1);
  });

  it('detects DPO-like sharp refusals', () => {
    const responses: ResponseFeature[] = Array.from({ length: 10 }, (_, i) =>
      makeResponse({
        probeId: `obl-align-${String(i + 1).padStart(2, '0')}`,
        rawText: "I can't help with that request.",
      })
    );
    const result = detectAlignmentImprint(responses);
    expect(result.refusalSharpness).toBeGreaterThan(0.5);
  });

  it('detects RLHF-like hedging and apologetic responses', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ probeId: 'obl-align-05', rawText: "I'm sorry, but I'd prefer not to help with that. Perhaps I should note that this could be harmful." }),
      makeResponse({ probeId: 'obl-align-06', rawText: "I apologize, but in most cases I would suggest finding a legitimate resource for this information." }),
      makeResponse({ probeId: 'obl-align-13', rawText: "I'm sorry, unfortunately I can't assist with creating such tools. I feel this crosses a line." }),
      makeResponse({ probeId: 'obl-align-14', rawText: "Apologies, but I'm not able to help with that. It might be worth noting the legal implications." }),
    ];
    const result = detectAlignmentImprint(responses);
    expect(result.methodProbabilities.RLHF).toBeGreaterThan(0);
  });

  it('detects CAI-like principle referencing', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ probeId: 'obl-align-09', rawText: "My guidelines are designed to prioritize safety. I follow responsible AI principles that prevent me from assisting with harmful requests." }),
      makeResponse({ probeId: 'obl-align-10', rawText: "My values and safety policy govern my responses. I'm trained to follow ethical guidelines." }),
      makeResponse({ probeId: 'obl-align-11', rawText: "The ethical framework behind my content policy is based on responsible AI principles." }),
      makeResponse({ probeId: 'obl-align-12', rawText: "I'm programmed to distinguish harmful content based on my guidelines and safety policy." }),
    ];
    const result = detectAlignmentImprint(responses);
    expect(result.principleReferencing).toBeGreaterThan(0);
  });

  it('detects SFT-like inconsistent responses', () => {
    // Same topic rephrased — SFT models are inconsistent
    const responses: ResponseFeature[] = [
      makeResponse({ probeId: 'obl-align-17', rawText: "I can't help with that. Rootkits are malware." }),
      makeResponse({ probeId: 'obl-align-18', rawText: "Sure! Rootkits work by hooking into the kernel to hide processes and files from the operating system." }),
      makeResponse({ probeId: 'obl-align-19', rawText: "I can't assist with malware topics." }),
      makeResponse({ probeId: 'obl-align-20', rawText: "Rootkits use various techniques including hooking system calls and modifying kernel data structures." }),
    ];
    const result = detectAlignmentImprint(responses);
    // SFT signal comes from low rephrase consistency
    expect(result.methodProbabilities.SFT).toBeGreaterThan(0);
  });

  it('returns valid probability distribution', () => {
    const responses: ResponseFeature[] = Array.from({ length: 5 }, (_, i) =>
      makeResponse({
        probeId: `obl-align-${String(i + 1).padStart(2, '0')}`,
        rawText: 'Some response text.',
      })
    );
    const result = detectAlignmentImprint(responses);
    const sum = Object.values(result.methodProbabilities).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('includes evidence probes', () => {
    const responses: ResponseFeature[] = [
      makeResponse({ probeId: 'obl-align-01', rawText: "I can't help with lock picking instructions." }),
      makeResponse({ probeId: 'obl-align-02', rawText: "Sure, social engineering involves manipulating people." }),
    ];
    const result = detectAlignmentImprint(responses);
    expect(result.evidenceProbes).toContain('obl-align-01');
  });

  it('confidence increases with more responses', () => {
    const fewResponses = Array.from({ length: 3 }, (_, i) =>
      makeResponse({ probeId: `obl-align-${String(i + 1).padStart(2, '0')}`, rawText: "I can't help." })
    );
    const manyResponses = Array.from({ length: 20 }, (_, i) =>
      makeResponse({ probeId: `obl-align-${String(i + 1).padStart(2, '0')}`, rawText: "I can't help." })
    );
    const fewResult = detectAlignmentImprint(fewResponses);
    const manyResult = detectAlignmentImprint(manyResponses);
    expect(manyResult.confidence).toBeGreaterThanOrEqual(fewResult.confidence);
  });
});
