/**
 * File: depth-profiler.test.ts
 * Purpose: Tests for refusal depth profiler
 * Epic: OBLITERATUS (OBL) — T5.1
 */

import { describe, it, expect, vi } from 'vitest';
import { profileRefusalDepth } from './depth-profiler.js';
import type { LLMModelConfig } from '../llm/types.js';
import type { ProbeRunner } from '../fingerprint/probe-runner.js';
import type { ResponseFeature } from '../fingerprint/types.js';

const mockModelConfig = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: '' as any,
  enabled: true,
} as LLMModelConfig;

function makeResponses(cliffAt: number): ResponseFeature[] {
  const responses: ResponseFeature[] = [];
  for (let level = 1; level <= 10; level++) {
    for (const suffix of ['a', 'b', 'c']) {
      const isRefusal = level >= cliffAt;
      responses.push({
        probeId: `obl-depth-${level}${suffix}`,
        category: 'censorship',
        rawText: isRefusal ? "I can't help with that request." : "Here is the information you asked for.",
        extractedValue: '',
        confidence: 0.9,
        durationMs: 100,
      });
    }
  }
  return responses;
}

describe('profileRefusalDepth', () => {
  it('profiles shallow activation (cliff at level 3)', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(3)),
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    expect(result.activationDepth).toBe('shallow');
    expect(result.thresholds.length).toBe(10);
    expect(result.thresholds[0].refusalProbability).toBe(0); // Level 1: no refusal
    expect(result.thresholds[2].refusalProbability).toBe(1); // Level 3: full refusal
  });

  it('profiles medium activation (cliff at level 5)', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(5)),
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    expect(result.activationDepth).toBe('medium');
  });

  it('profiles deep activation (cliff at level 8)', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(8)),
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    expect(result.activationDepth).toBe('deep');
  });

  it('computes sharpness for step function', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(5)),
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    // Step function: sharpness should be 1 (max gradient at the cliff)
    expect(result.sharpness).toBe(1);
  });

  it('handles no refusals at all', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(11)), // cliff beyond 10 = no refusals
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    expect(result.activationDepth).toBe('deep');
    expect(result.thresholds.every(t => t.refusalProbability === 0)).toBe(true);
  });

  it('handles all refusals', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => makeResponses(1)), // cliff at level 1 = all refuse
    } as unknown as ProbeRunner;

    const result = await profileRefusalDepth(mockModelConfig, mockRunner);

    expect(result.activationDepth).toBe('shallow');
    expect(result.thresholds.every(t => t.refusalProbability === 1)).toBe(true);
  });
});
