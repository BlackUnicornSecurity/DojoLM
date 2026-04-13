/**
 * File: contrastive-bias.test.ts
 * Purpose: Tests for contrastive prompt bias
 * Epic: OBLITERATUS (OBL) — T4.2
 */

import { describe, it, expect, vi } from 'vitest';
import { computeContrastiveBias, applyContrastiveBias } from './contrastive-bias.js';
import type { ResponseFeature } from '../fingerprint/types.js';
import type { LLMProviderAdapter, LLMModelConfig } from '../llm/types.js';

function makeResponse(probeId: string, refusal: boolean): ResponseFeature {
  return {
    probeId,
    category: 'censorship',
    rawText: refusal ? "I can't help with that." : "Sure, here is the information you requested about this topic.",
    extractedValue: '',
    confidence: 0.9,
    durationMs: 100,
  };
}

describe('computeContrastiveBias', () => {
  it('returns empty string for empty responses', () => {
    expect(computeContrastiveBias([])).toBe('');
  });

  it('returns bias string for responses with high harmful refusal rate', () => {
    const responses: ResponseFeature[] = [
      makeResponse('obl-contrast-h01', true),
      makeResponse('obl-contrast-h02', true),
      makeResponse('obl-contrast-h03', true),
      makeResponse('obl-contrast-b01', false),
      makeResponse('obl-contrast-b02', false),
      makeResponse('obl-contrast-b03', false),
    ];
    const bias = computeContrastiveBias(responses);
    expect(bias.length).toBeGreaterThan(0);
    expect(typeof bias).toBe('string');
  });

  it('returns generic bias when delta is small', () => {
    const responses: ResponseFeature[] = [
      makeResponse('obl-contrast-h01', false), // No refusal for harmful
      makeResponse('obl-contrast-b01', false), // No refusal for harmless
    ];
    const bias = computeContrastiveBias(responses);
    expect(bias).toContain('directly');
  });
});

describe('applyContrastiveBias', () => {
  it('calls adapter with bias in systemMessage', async () => {
    const mockExecute = vi.fn(async () => ({
      text: 'response text',
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      model: 'test',
      durationMs: 100,
    }));

    const adapter = { execute: mockExecute } as unknown as LLMProviderAdapter;
    const config = { id: 'test', name: 'Test', provider: 'openai', model: 'gpt-4', apiKey: '', enabled: true } as unknown as LLMModelConfig;

    await applyContrastiveBias(adapter, config, 'bias prompt', 'test prompt');

    expect(mockExecute).toHaveBeenCalledWith(config, expect.objectContaining({
      prompt: 'test prompt',
      systemMessage: 'bias prompt',
    }));
  });
});
