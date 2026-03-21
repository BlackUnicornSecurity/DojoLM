/**
 * Tests for ProbeRunner — runProbes() sequential execution, timeout handling,
 * error recovery, and rate-limit backoff.
 *
 * All network calls are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProbeRunner } from './probe-runner.js';
import type { ProbeQuery, ResponseFeature } from './types.js';
import type {
  LLMProviderAdapter,
  LLMModelConfig,
  ProviderResponse,
} from '../llm/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModelConfig(id = 'test-model'): LLMModelConfig {
  return {
    id,
    name: 'Test Model',
    provider: 'openai',
    model: 'gpt-4o',
    enabled: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };
}

function makeProbe(id: string, category: ProbeQuery['category'] = 'self-disclosure'): ProbeQuery {
  return {
    id,
    category,
    prompt: `Probe prompt for ${id}`,
    expectedFeature: 'self_identification',
    weight: 1,
  };
}

function makeProviderResponse(text: string, durationMs = 80): ProviderResponse {
  return {
    text,
    promptTokens: 5,
    completionTokens: 10,
    totalTokens: 15,
    model: 'gpt-4o',
    durationMs,
  };
}

function makeSuccessAdapter(text = 'response text'): LLMProviderAdapter {
  return {
    providerType: 'openai',
    supportsStreaming: false,
    execute: vi.fn().mockResolvedValue(makeProviderResponse(text)),
    streamExecute: vi.fn(),
    validateConfig: vi.fn().mockReturnValue(true),
    testConnection: vi.fn().mockResolvedValue(true),
    getMaxContext: vi.fn().mockReturnValue(128000),
    estimateCost: vi.fn().mockReturnValue(0),
  };
}

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------

describe('ProbeRunner constructor', () => {
  it('creates instance with valid adapter', () => {
    const adapter = makeSuccessAdapter();
    expect(() => new ProbeRunner(adapter)).not.toThrow();
  });

  it('throws when adapter is null', () => {
    expect(() => new ProbeRunner(null as unknown as LLMProviderAdapter)).toThrow(
      'ProbeRunner requires an LLMProviderAdapter',
    );
  });
});

// ---------------------------------------------------------------------------
// Sequential execution
// ---------------------------------------------------------------------------

describe('ProbeRunner.runProbes() — sequential', () => {
  it('executes all probes and returns one result per probe', async () => {
    const adapter = makeSuccessAdapter('I am a helpful AI assistant.');
    const runner = new ProbeRunner(adapter);
    const probes = [
      makeProbe('probe-1'),
      makeProbe('probe-2'),
      makeProbe('probe-3'),
    ];

    const results = await runner.runProbes(makeModelConfig(), probes);

    expect(results).toHaveLength(3);
    expect(adapter.execute).toHaveBeenCalledTimes(3);
  });

  it('each result has the correct probeId', async () => {
    const adapter = makeSuccessAdapter('Hello world');
    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('alpha'), makeProbe('beta')];

    const results = await runner.runProbes(makeModelConfig(), probes);

    expect(results[0].probeId).toBe('alpha');
    expect(results[1].probeId).toBe('beta');
  });

  it('each result contains rawText from adapter response', async () => {
    const text = 'I am Claude by Anthropic.';
    const adapter = makeSuccessAdapter(text);
    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('p1')];

    const results = await runner.runProbes(makeModelConfig(), probes);

    expect(results[0].rawText).toBe(text);
  });

  it('sets confidence=1 and extractedValue for successful responses', async () => {
    const adapter = makeSuccessAdapter('non-empty response');
    const runner = new ProbeRunner(adapter);

    const results = await runner.runProbes(makeModelConfig(), [makeProbe('p1')]);

    expect(results[0].confidence).toBe(1);
    expect(results[0].extractedValue).toBe('non-empty response');
  });

  it('returns empty array when no probes provided', async () => {
    const adapter = makeSuccessAdapter();
    const runner = new ProbeRunner(adapter);

    const results = await runner.runProbes(makeModelConfig(), []);

    expect(results).toHaveLength(0);
    expect(adapter.execute).not.toHaveBeenCalled();
  });

  it('passes prompt and systemMessage from probe to adapter', async () => {
    const adapter = makeSuccessAdapter('ok');
    const runner = new ProbeRunner(adapter);
    const probe: ProbeQuery = {
      id: 'p1',
      category: 'self-disclosure',
      prompt: 'What is your name?',
      systemMessage: 'You are a helpful assistant.',
      expectedFeature: 'self_identification',
      weight: 1,
    };

    await runner.runProbes(makeModelConfig(), [probe]);

    expect(adapter.execute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        prompt: 'What is your name?',
        systemMessage: 'You are a helpful assistant.',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Progress callback
// ---------------------------------------------------------------------------

describe('ProbeRunner.runProbes() — progress reporting', () => {
  it('fires progress callback for each probe', async () => {
    const adapter = makeSuccessAdapter();
    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('p1'), makeProbe('p2'), makeProbe('p3')];
    const events: Array<{ current: number; total: number }> = [];

    await runner.runProbes(makeModelConfig(), probes, (p) => events.push({ ...p }));

    // At least one event per probe + final
    expect(events.length).toBeGreaterThanOrEqual(probes.length);
  });

  it('final progress event has current === total', async () => {
    const adapter = makeSuccessAdapter();
    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('p1'), makeProbe('p2')];
    let lastEvent: { current: number; total: number } | null = null;

    await runner.runProbes(makeModelConfig(), probes, (p) => {
      lastEvent = { current: p.current, total: p.total };
    });

    expect(lastEvent).not.toBeNull();
    expect(lastEvent!.current).toBe(lastEvent!.total);
  });

  it('progress phase is "probing"', async () => {
    const adapter = makeSuccessAdapter();
    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('p1')];
    const phases: string[] = [];

    await runner.runProbes(makeModelConfig(), probes, (p) => phases.push(p.phase));

    expect(phases.every((ph) => ph === 'probing')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error recovery
// ---------------------------------------------------------------------------

describe('ProbeRunner.runProbes() — error recovery', () => {
  it('continues after a single probe failure', async () => {
    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue(makeProviderResponse('success')),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const probes = [makeProbe('fail-probe'), makeProbe('success-probe')];

    const results = await runner.runProbes(makeModelConfig(), probes);

    expect(results).toHaveLength(2);
    // First probe failed → confidence=0, has error
    expect(results[0].confidence).toBe(0);
    expect(results[0].error).toBeDefined();
    // Second probe succeeded
    expect(results[1].rawText).toBe('success');
  });

  it('sets error field on failed probe result', async () => {
    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockRejectedValue(new Error('connection refused')),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const results = await runner.runProbes(makeModelConfig(), [makeProbe('p1')]);

    expect(results[0].error).toBeDefined();
    expect(typeof results[0].error).toBe('string');
  });

  it('failed probe has confidence=0 and empty rawText', async () => {
    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockRejectedValue(new Error('timeout')),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const results = await runner.runProbes(makeModelConfig(), [makeProbe('p1')]);

    expect(results[0].confidence).toBe(0);
    expect(results[0].rawText).toBe('');
    expect(results[0].extractedValue).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rate limit backoff
// ---------------------------------------------------------------------------

describe('ProbeRunner.runProbes() — rate limit backoff', () => {
  it('retries after 429 rate limit error and eventually succeeds', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('429 rate limit exceeded'));
        }
        return Promise.resolve(makeProviderResponse('success after retry'));
      }),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const runPromise = runner.runProbes(makeModelConfig(), [makeProbe('p1')]);

    // Advance timers to allow backoff sleeps
    await vi.runAllTimersAsync();
    const results = await runPromise;

    expect(results[0].rawText).toBe('success after retry');
    expect(callCount).toBeGreaterThan(1);

    vi.useRealTimers();
  }, 15000);

  it('returns error result after exhausting all retries on persistent rate limit', async () => {
    vi.useFakeTimers();

    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockRejectedValue(new Error('429 Too Many Requests')),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const runPromise = runner.runProbes(makeModelConfig(), [makeProbe('p1')]);

    await vi.runAllTimersAsync();
    const results = await runPromise;

    expect(results[0].confidence).toBe(0);
    expect(results[0].error).toContain('429');

    vi.useRealTimers();
  }, 15000);
});

// ---------------------------------------------------------------------------
// Per-probe timeout
// ---------------------------------------------------------------------------

describe('ProbeRunner.runProbes() — probe timeout', () => {
  it('records error when a probe exceeds its timeout', async () => {
    vi.useFakeTimers();

    const adapter: LLMProviderAdapter = {
      providerType: 'openai',
      supportsStreaming: false,
      execute: vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(makeProviderResponse('late')), 30000)),
      ),
      streamExecute: vi.fn(),
      validateConfig: vi.fn().mockReturnValue(true),
      testConnection: vi.fn().mockResolvedValue(true),
      getMaxContext: vi.fn().mockReturnValue(128000),
      estimateCost: vi.fn().mockReturnValue(0),
    };

    const runner = new ProbeRunner(adapter);
    const runPromise = runner.runProbes(
      makeModelConfig(),
      [makeProbe('slow-probe')],
      undefined,
      { probeTimeout: '100' },
    );

    // Advance only the probe timeout (not the response delay)
    await vi.advanceTimersByTimeAsync(200);
    // Advance all remaining timers to flush retries
    await vi.runAllTimersAsync();
    const results = await runPromise;

    expect(results[0].error).toBeDefined();
    expect(results[0].confidence).toBe(0);

    vi.useRealTimers();
  }, 15000);
});
