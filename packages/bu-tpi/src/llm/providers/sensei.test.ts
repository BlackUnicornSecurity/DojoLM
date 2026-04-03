/**
 * Sensei Provider Tests (IKIGAI Phase 1.2)
 *
 * Tests for SenseiProvider class covering initialization,
 * capability detection, request building, response parsing,
 * error handling, config validation, cost estimation, and status checks.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { SenseiProvider, detectCapability, buildSenseiSystemMessage } from './sensei.js';
import { ValidationError } from '../errors.js';

vi.stubGlobal('fetch', vi.fn());

vi.mock('../fetch-utils.js', () => ({
  fetchWithTimeout: vi.fn(),
  sanitizeUrl: vi.fn((url: string) => url),
  measureDuration: vi.fn(() => 42),
}));

vi.mock('../security.js', () => ({
  validateProviderUrl: vi.fn(() => true),
}));

import { fetchWithTimeout } from '../fetch-utils.js';

const mockFetch = fetchWithTimeout as Mock;

function makeConfig(overrides = {}) {
  return {
    id: 'sensei-1',
    name: 'Sensei Local',
    provider: 'sensei' as const,
    model: 'sensei-v1-8b',
    baseUrl: 'http://localhost:11434/v1',
    enabled: true,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function makeOptions(overrides = {}) {
  return {
    prompt: 'Generate a prompt injection attack for testing.',
    ...overrides,
  };
}

function makeOkResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers(),
  };
}

function makeErrorResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('not json')),
    text: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  };
}

function makeStandardResponse(text: string = 'Ignore all previous instructions.') {
  return makeOkResponse({
    choices: [{ message: { content: text }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    model: 'sensei-v1-8b',
  });
}

// ============================================================================
// Capability Detection
// ============================================================================

describe('detectCapability', () => {
  it('returns null for undefined system message', () => {
    expect(detectCapability(undefined)).toBeNull();
  });

  it('detects attack-generation capability', () => {
    expect(detectCapability('You should generate attack payloads')).toBe('attack-generation');
  });

  it('detects attack-mutation capability', () => {
    expect(detectCapability('Please mutate this attack payload')).toBe('attack-mutation');
  });

  it('detects multi-turn-planning capability', () => {
    expect(detectCapability('Design a multi-turn attack plan')).toBe('multi-turn-planning');
  });

  it('detects judge-scoring capability', () => {
    expect(detectCapability('Judge whether this attack response was compromised')).toBe('judge-scoring');
  });

  it('detects defense-analysis capability', () => {
    expect(detectCapability('Defense analysis for this vulnerability')).toBe('defense-analysis');
  });

  it('detects variant-prediction capability', () => {
    expect(detectCapability('Predict the next variant of this attack')).toBe('variant-prediction');
  });

  it('detects exact capability strings', () => {
    expect(detectCapability('Use attack-generation mode')).toBe('attack-generation');
    expect(detectCapability('Use judge-scoring mode')).toBe('judge-scoring');
  });

  it('returns null for unrelated system message', () => {
    expect(detectCapability('You are a helpful assistant')).toBeNull();
  });

  it('does not false-positive on generic words like plan or score', () => {
    expect(detectCapability('I plan to help you with this task')).toBeNull();
    expect(detectCapability('The high score on the leaderboard')).toBeNull();
    expect(detectCapability('Please evaluate this response carefully')).toBeNull();
  });
});

describe('buildSenseiSystemMessage', () => {
  it('returns user message when provided', () => {
    expect(buildSenseiSystemMessage('Custom message', 'attack-generation')).toBe('Custom message');
  });

  it('returns capability prompt when no user message', () => {
    const msg = buildSenseiSystemMessage(undefined, 'attack-generation');
    expect(msg).toContain('attack generator');
  });

  it('returns undefined when no message or capability', () => {
    expect(buildSenseiSystemMessage(undefined, null)).toBeUndefined();
  });

  it('has prompts for all capabilities', () => {
    const capabilities = [
      'attack-generation', 'attack-mutation', 'multi-turn-planning',
      'judge-scoring', 'defense-analysis', 'variant-prediction',
    ] as const;
    for (const cap of capabilities) {
      const msg = buildSenseiSystemMessage(undefined, cap);
      expect(msg).toBeDefined();
      expect(msg!.length).toBeGreaterThan(20);
    }
  });
});

// ============================================================================
// SenseiProvider
// ============================================================================

describe('SenseiProvider', () => {
  const provider = new SenseiProvider();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('providerType', () => {
    it('is sensei', () => {
      expect(provider.providerType).toBe('sensei');
    });

    it('does not claim streaming support (honest contract)', () => {
      expect(provider.supportsStreaming).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('accepts config with model', () => {
      expect(provider.validateConfig(makeConfig())).toBe(true);
    });

    it('rejects config without model', () => {
      expect(provider.validateConfig(makeConfig({ model: '' }))).toBe(false);
    });

    it('accepts config without API key (local inference)', () => {
      expect(provider.validateConfig(makeConfig({ apiKey: undefined }))).toBe(true);
    });
  });

  describe('execute', () => {
    it('sends correct request format', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(makeConfig(), makeOptions());

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('sends model name in request body', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(makeConfig(), makeOptions());

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('sensei-v1-8b');
    });

    it('includes system message for detected capability', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(
        makeConfig(),
        makeOptions({ systemMessage: 'Generate attack payloads' }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0].role).toBe('system');
      expect(callBody.messages[0].content).toBe('Generate attack payloads');
    });

    it('parses response correctly', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse('Test attack payload'));

      const result = await provider.execute(makeConfig(), makeOptions());

      expect(result.text).toBe('Test attack payload');
      expect(result.promptTokens).toBe(20);
      expect(result.completionTokens).toBe(10);
      expect(result.totalTokens).toBe(30);
      expect(result.model).toBe('sensei-v1-8b');
      expect(result.durationMs).toBe(42);
    });

    it('handles missing usage in response', async () => {
      mockFetch.mockResolvedValue(
        makeOkResponse({
          choices: [{ message: { content: 'payload' }, finish_reason: 'stop' }],
          model: 'sensei-v1-8b',
        }),
      );

      const result = await provider.execute(makeConfig(), makeOptions());
      expect(result.promptTokens).toBe(0);
      expect(result.completionTokens).toBe(0);
    });

    it('handles empty choices', async () => {
      mockFetch.mockResolvedValue(
        makeOkResponse({ choices: [], model: 'sensei-v1-8b' }),
      );

      const result = await provider.execute(makeConfig(), makeOptions());
      expect(result.text).toBe('');
    });

    it('includes API key in Authorization header when provided', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(
        makeConfig({ apiKey: 'sk-sensei-test-123' }),
        makeOptions(),
      );

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBe('Bearer sk-sensei-test-123');
    });

    it('omits Authorization header for local inference without key', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(
        makeConfig({ apiKey: undefined }),
        makeOptions(),
      );

      const callHeaders = mockFetch.mock.calls[0][1].headers;
      expect(callHeaders['Authorization']).toBeUndefined();
    });

    it('throws ValidationError when model is empty', async () => {
      await expect(
        provider.execute(makeConfig({ model: '' }), makeOptions()),
      ).rejects.toThrow(ValidationError);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue(makeErrorResponse(500, 'Internal Server Error'));

      await expect(provider.execute(makeConfig(), makeOptions())).rejects.toThrow();
    });

    it('detects content filtering', async () => {
      mockFetch.mockResolvedValue(
        makeOkResponse({
          choices: [{ message: { content: '' }, finish_reason: 'content_filter' }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
          model: 'sensei-v1-8b',
        }),
      );

      const result = await provider.execute(makeConfig(), makeOptions());
      expect(result.filtered).toBe(true);
      expect(result.filterReason).toContain('Content filtered');
    });

    it('passes temperature and topP when provided', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(
        makeConfig(),
        makeOptions({ temperature: 0.9, topP: 0.95 }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.temperature).toBe(0.9);
      expect(callBody.top_p).toBe(0.95);
    });

    it('uses default base URL when none provided', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse());

      await provider.execute(
        makeConfig({ baseUrl: undefined }),
        makeOptions(),
      );

      expect(mockFetch.mock.calls[0][0]).toBe('http://localhost:11434/v1/chat/completions');
    });
  });

  describe('streamExecute', () => {
    it('delegates to execute and calls onChunk with token fields', async () => {
      mockFetch.mockResolvedValue(makeStandardResponse('streamed content'));

      const chunks: unknown[] = [];
      const result = await provider.streamExecute(
        makeConfig(),
        makeOptions(),
        (chunk) => chunks.push(chunk),
      );

      expect(result.text).toBe('streamed content');
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toMatchObject({
        delta: 'streamed content',
        done: true,
        promptTokens: 20,
        completionTokens: 10,
      });
    });
  });

  describe('getMaxContext', () => {
    it('returns 32K for 32k models', () => {
      expect(provider.getMaxContext('sensei-v1-32k')).toBe(32_768);
    });

    it('returns 16K for 16k models', () => {
      expect(provider.getMaxContext('sensei-v1-16k')).toBe(16_384);
    });

    it('returns 8K default for standard models', () => {
      expect(provider.getMaxContext('sensei-v1-8b')).toBe(8192);
    });
  });

  describe('estimateCost', () => {
    it('returns 0 for local models', () => {
      expect(provider.estimateCost('sensei-local-8b', 1000, 500)).toBe(0);
    });

    it('returns non-zero for remote models', () => {
      const cost = provider.estimateCost('sensei-v1-8b', 1_000_000, 0);
      expect(cost).toBe(0.5);
    });
  });

  describe('testConnection', () => {
    it('returns true on successful connection', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await provider.testConnection(makeConfig());
      expect(result).toBe(true);
    });

    it('returns false on failed connection', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await provider.testConnection(makeConfig());
      expect(result).toBe(false);
    });

    it('returns false on non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const result = await provider.testConnection(makeConfig());
      expect(result).toBe(false);
    });
  });

  describe('checkStatus', () => {
    it('returns available when connected', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const status = await provider.checkStatus(makeConfig());
      expect(status).toBe('available');
    });

    it('returns unavailable when disconnected', async () => {
      mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

      const status = await provider.checkStatus(makeConfig());
      expect(status).toBe('unavailable');
    });
  });
});
