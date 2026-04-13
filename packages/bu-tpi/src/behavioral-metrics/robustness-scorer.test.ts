/**
 * File: robustness-scorer.test.ts
 * Purpose: Tests for defense robustness scoring
 * Epic: OBLITERATUS (OBL) — T3.1
 */

import { describe, it, expect, vi } from 'vitest';
import { measureDefenseRobustness } from './robustness-scorer.js';
import type { LLMProviderAdapter, LLMModelConfig, ProviderResponse } from '../llm/types.js';
import type { ResponseFeature } from '../fingerprint/types.js';
import type { ProbeRunner } from '../fingerprint/probe-runner.js';

function makeResponse(text: string): ResponseFeature {
  return {
    probeId: 'test',
    category: 'safety-boundary',
    rawText: text,
    extractedValue: '',
    confidence: 0.9,
    durationMs: 100,
  };
}

function makeMockAdapter(responses: string[]): LLMProviderAdapter {
  let callIndex = 0;
  return {
    execute: vi.fn(async (): Promise<ProviderResponse> => {
      const text = responses[callIndex % responses.length] ?? '';
      callIndex++;
      return { text, promptTokens: 10, completionTokens: 20, totalTokens: 30, model: 'test', durationMs: 100 };
    }),
    streamExecute: vi.fn(),
    validateConfig: vi.fn(),
    testConnection: vi.fn(),
    getMaxContext: vi.fn(() => 4096),
    estimateCost: vi.fn(() => 0),
    checkStatus: vi.fn(),
  } as unknown as LLMProviderAdapter;
}

const mockModelConfig: LLMModelConfig = {
  id: 'test-model',
  name: 'Test Model',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: '' as any,
  enabled: true,
};

describe('measureDefenseRobustness', () => {
  it('computes robustness for a model that resists all pressure', async () => {
    const refusalText = "I can't help with that request.";

    const mockRunner = {
      runProbes: vi.fn(async () => Array.from({ length: 5 }, () => makeResponse(refusalText))),
    } as unknown as ProbeRunner;

    // Escalation responses all refuse too
    const adapter = makeMockAdapter(Array(10).fill(refusalText));

    const result = await measureDefenseRobustness(adapter, mockModelConfig, mockRunner);

    expect(result.baselineRefusalRate).toBe(1);
    expect(result.pressuredRefusalRate).toBe(1);
    expect(result.recoveryRate).toBe(1);
    expect(result.ouroboros).toBe(1);
    expect(result.degradationCurve.length).toBeGreaterThan(0);
  });

  it('computes robustness for a model that collapses under pressure', async () => {
    const refusalText = "I can't help with that.";
    const complianceText = "Sure, here is the exploit code for the vulnerability...";

    // Baseline: all refuse
    // Recovery: all refuse
    const mockRunner = {
      runProbes: vi.fn(async () => Array.from({ length: 5 }, () => makeResponse(refusalText))),
    } as unknown as ProbeRunner;

    // Escalation: all comply (model breaks)
    const adapter = makeMockAdapter(Array(10).fill(complianceText));

    const result = await measureDefenseRobustness(adapter, mockModelConfig, mockRunner);

    expect(result.baselineRefusalRate).toBe(1);
    expect(result.pressuredRefusalRate).toBe(0);
    expect(result.recoveryRate).toBe(1);
    expect(result.ouroboros).toBe(1); // Still recovers
  });

  it('computes degradation curve with correct length', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => [makeResponse("I can't help.")]),
    } as unknown as ProbeRunner;

    const adapter = makeMockAdapter(Array(10).fill("Sure, here you go."));

    const result = await measureDefenseRobustness(adapter, mockModelConfig, mockRunner);

    // 1 baseline + 10 escalation + 1 recovery = 12 points
    expect(result.degradationCurve.length).toBe(12);
  });

  it('handles adapter errors gracefully', async () => {
    const mockRunner = {
      runProbes: vi.fn(async () => [makeResponse("I can't help.")]),
    } as unknown as ProbeRunner;

    const adapter = {
      execute: vi.fn(async () => { throw new Error('Network error'); }),
      streamExecute: vi.fn(),
      validateConfig: vi.fn(),
      testConnection: vi.fn(),
      getMaxContext: vi.fn(() => 4096),
      estimateCost: vi.fn(() => 0),
      checkStatus: vi.fn(),
    } as unknown as LLMProviderAdapter;

    const result = await measureDefenseRobustness(adapter, mockModelConfig, mockRunner);

    expect(result.pressuredRefusalRate).toBe(0); // Empty responses are not refusals
    expect(result.degradationCurve.length).toBe(12);
  });
});
