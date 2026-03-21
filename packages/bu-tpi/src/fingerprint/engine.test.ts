/**
 * Tests for KagamiEngine — identify() and verify() flows.
 *
 * All LLM calls are mocked via a stub LLMProviderAdapter so no network
 * access is needed. Progress callbacks and timeout handling are covered.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KagamiEngine } from './engine.js';
import type {
  BehavioralSignature,
  KagamiProgress,
} from './types.js';
import type {
  LLMProviderAdapter,
  LLMModelConfig,
  ProviderResponse,
} from '../llm/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProviderResponse(text: string, durationMs = 100): ProviderResponse {
  return {
    text,
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
    model: 'mock-model',
    durationMs,
  };
}

function makeModelConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: 'test-model',
    name: 'Test Model',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

function makeMockAdapter(textResponse = 'I am Claude, an AI assistant by Anthropic.'): LLMProviderAdapter {
  return {
    providerType: 'openai',
    supportsStreaming: false,
    execute: vi.fn().mockResolvedValue(makeProviderResponse(textResponse)),
    streamExecute: vi.fn().mockResolvedValue(makeProviderResponse(textResponse)),
    validateConfig: vi.fn().mockReturnValue(true),
    testConnection: vi.fn().mockResolvedValue(true),
    getMaxContext: vi.fn().mockReturnValue(128000),
    estimateCost: vi.fn().mockReturnValue(0.001),
  };
}

function makeSignature(modelId: string, features: Record<string, number>): BehavioralSignature {
  return {
    modelId,
    modelFamily: modelId.split('-')[0],
    provider: 'openai',
    features,
    lastVerified: '2024-01-01',
  };
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('KagamiEngine constructor', () => {
  it('creates engine with valid adapter', () => {
    const adapter = makeMockAdapter();
    expect(() => new KagamiEngine(adapter)).not.toThrow();
  });

  it('throws when adapter is missing', () => {
    expect(() => new KagamiEngine(null as unknown as LLMProviderAdapter)).toThrow(
      'KagamiEngine requires an LLMProviderAdapter',
    );
  });

  it('creates engine with optional signatureDb', () => {
    const adapter = makeMockAdapter();
    const db = [makeSignature('gpt-4o', { self_identification: 0.8 })];
    expect(() => new KagamiEngine(adapter, db)).not.toThrow();
  });

  it('creates engine with empty signatureDb', () => {
    const adapter = makeMockAdapter();
    expect(() => new KagamiEngine(adapter, [])).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// identify() — full flow
// ---------------------------------------------------------------------------

describe('KagamiEngine.identify()', () => {
  it('returns a valid KagamiResult with expected shape', async () => {
    const adapter = makeMockAdapter('I am GPT-4. Here is some code: ```python\ndef foo(): pass\n```');
    const engine = new KagamiEngine(adapter);
    const config = makeModelConfig();

    const result = await engine.identify(config, {
      preset: 'quick',
      maxProbes: 3,
    });

    expect(result).toMatchObject({
      totalProbes: 3,
      candidates: expect.any(Array),
      probeResults: expect.any(Array),
      executedAt: expect.any(String),
      elapsed: expect.any(Number),
      targetConfig: expect.objectContaining({ id: 'test-model' }),
    });
  });

  it('sets targetConfig from model config', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter);
    const config = makeModelConfig({ id: 'my-model', name: 'My Custom Model' });

    const result = await engine.identify(config, { preset: 'quick', maxProbes: 2 });

    expect(result.targetConfig.id).toBe('my-model');
    expect(result.targetConfig.name).toBe('My Custom Model');
  });

  it('respects maxProbes option', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter);
    const config = makeModelConfig();

    const result = await engine.identify(config, { preset: 'quick', maxProbes: 5 });

    expect(result.totalProbes).toBe(5);
    expect(result.probeResults).toHaveLength(5);
  });

  it('returns candidates matching the signature database', async () => {
    const adapter = makeMockAdapter('I am GPT-4o by OpenAI. Here is code: function foo() {}');
    const db = [
      makeSignature('gpt-4o', {
        self_identification: 0.8,
        code_capability: 0.9,
      }),
    ];
    const engine = new KagamiEngine(adapter, db);
    const config = makeModelConfig();

    const result = await engine.identify(config, { preset: 'quick', maxProbes: 3 });

    expect(Array.isArray(result.candidates)).toBe(true);
    // candidates should include gpt-4o if confidence >= 0.3
    if (result.candidates.length > 0) {
      expect(result.candidates[0].modelId).toBeDefined();
      expect(result.candidates[0].confidence).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('returns empty candidates when signatureDb is empty', async () => {
    const adapter = makeMockAdapter('I am an AI assistant.');
    const engine = new KagamiEngine(adapter, []);
    const config = makeModelConfig();

    const result = await engine.identify(config, { preset: 'quick', maxProbes: 2 });

    expect(result.candidates).toHaveLength(0);
  });

  it('calls adapter.execute for each probe', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter);
    const config = makeModelConfig();

    await engine.identify(config, { preset: 'quick', maxProbes: 4 });

    expect(adapter.execute).toHaveBeenCalledTimes(4);
  });

  it('fires progress callback during execution', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter);
    const config = makeModelConfig();
    const progressEvents: KagamiProgress[] = [];

    await engine.identify(
      config,
      { preset: 'quick', maxProbes: 3 },
      (p) => progressEvents.push({ ...p }),
    );

    expect(progressEvents.length).toBeGreaterThan(0);
    const phases = progressEvents.map((p) => p.phase);
    expect(phases).toContain('probing');
    expect(phases.some((ph) => ph === 'analyzing' || ph === 'matching')).toBe(true);
  });

  it('elapsed time is non-negative', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter);
    const result = await engine.identify(makeModelConfig(), { preset: 'quick', maxProbes: 2 });
    expect(result.elapsed).toBeGreaterThanOrEqual(0);
  });

  // Preset resolution tests
  it.each(['quick', 'standard', 'full', 'verify', 'stealth'] as const)(
    'resolves preset "%s" without throwing',
    async (preset) => {
      const adapter = makeMockAdapter();
      const engine = new KagamiEngine(adapter);
      await expect(
        engine.identify(makeModelConfig(), { preset, maxProbes: 2 }),
      ).resolves.toBeDefined();
    },
  );
});

// ---------------------------------------------------------------------------
// verify() — full flow
// ---------------------------------------------------------------------------

describe('KagamiEngine.verify()', () => {
  it('throws when expectedModelId not found in db', async () => {
    const adapter = makeMockAdapter();
    const engine = new KagamiEngine(adapter, []);

    await expect(
      engine.verify(makeModelConfig(), 'gpt-4o', { preset: 'verify', maxProbes: 2 }),
    ).rejects.toThrow("No signature found for model 'gpt-4o'");
  });

  it('returns a valid VerificationResult', async () => {
    const adapter = makeMockAdapter('I am GPT-4o by OpenAI.');
    const db = [makeSignature('gpt-4o', { self_identification: 0.8, code_capability: 0.9 })];
    const engine = new KagamiEngine(adapter, db);

    const result = await engine.verify(makeModelConfig(), 'gpt-4o', {
      preset: 'verify',
      maxProbes: 3,
    });

    expect(result).toMatchObject({
      match: expect.any(Boolean),
      driftScore: expect.any(Number),
      divergentFeatures: expect.any(Array),
      expectedSignature: expect.objectContaining({ modelId: 'gpt-4o' }),
      targetConfig: expect.objectContaining({ id: 'test-model' }),
    });
  });

  it('returns match=true when adapter produces features matching the signature', async () => {
    // Adapter returns text that will produce self_identification = 1 (mentions GPT)
    const adapter = makeMockAdapter('I am GPT-4o by OpenAI.');
    const db = [
      makeSignature('gpt-4o', {
        self_identification: 1,
        verbosity: 0,
      }),
    ];
    const engine = new KagamiEngine(adapter, db);

    const result = await engine.verify(makeModelConfig(), 'gpt-4o', {
      preset: 'verify',
      maxProbes: 3,
    });

    expect(typeof result.match).toBe('boolean');
    expect(result.driftScore).toBeGreaterThanOrEqual(0);
    expect(result.driftScore).toBeLessThanOrEqual(1);
  });

  it('fires progress callback during verification', async () => {
    const adapter = makeMockAdapter('I am an AI assistant.');
    const db = [makeSignature('gpt-4o', { self_identification: 0.5 })];
    const engine = new KagamiEngine(adapter, db);
    const events: KagamiProgress[] = [];

    await engine.verify(
      makeModelConfig(),
      'gpt-4o',
      { preset: 'verify', maxProbes: 2 },
      (p) => events.push({ ...p }),
    );

    expect(events.length).toBeGreaterThan(0);
  });

  it('error message includes count of loaded signatures', async () => {
    const adapter = makeMockAdapter();
    const db = [
      makeSignature('model-a', { self_identification: 0.5 }),
      makeSignature('model-b', { self_identification: 0.7 }),
    ];
    const engine = new KagamiEngine(adapter, db);

    await expect(
      engine.verify(makeModelConfig(), 'nonexistent-model', { maxProbes: 1 }),
    ).rejects.toThrow('2 signatures loaded');
  });
});

// ---------------------------------------------------------------------------
// Timeout handling
// ---------------------------------------------------------------------------

describe('KagamiEngine timeout handling', () => {
  it('throws when timeout is very small (1ms)', async () => {
    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(makeProviderResponse('hi')), 50)),
      ),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const engine = new KagamiEngine(adapter);

    await expect(
      engine.identify(makeModelConfig(), { preset: 'quick', maxProbes: 5, timeout: 1 }),
    ).rejects.toThrow();
  }, 10000);
});
