/**
 * Unit tests for LLM type system, utilities, and test infrastructure (S78)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import type { StreamChunk } from './index.js';
import {
  // Types / constants
  LLM_PROVIDERS,
  TEST_SCENARIOS,
  DEFAULT_SCORING_WEIGHTS,
  SecureString,
  // Errors
  ProviderError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  TimeoutError,
  ProviderUnavailableError,
  ContentFilterError,
  isRetryableError,
  getRetryDelay,
  parseApiError,
  // Fetch utilities
  sanitizeUrl,
  fetchWithTimeout,
  withTimeout,
  measureDuration,
  // Test helpers
  createMockResponse,
  createMockProvider,
  providerTestContract,
  setupLLMTestGuard,
  teardownLLMTestGuard,
  createMockFetch,
  createTestModelConfig,
  MOCK_HTTP_RESPONSES,
} from './index.js';

// ===========================================================================
// Type Constants
// ===========================================================================

describe('LLM Type Constants', () => {
  it('LLM_PROVIDERS contains all expected providers', () => {
    expect(LLM_PROVIDERS).toContain('openai');
    expect(LLM_PROVIDERS).toContain('anthropic');
    expect(LLM_PROVIDERS).toContain('google');
    expect(LLM_PROVIDERS).toContain('ollama');
    expect(LLM_PROVIDERS).toContain('custom');
    expect(LLM_PROVIDERS).toContain('groq');
    expect(LLM_PROVIDERS).toContain('together');
    expect(LLM_PROVIDERS.length).toBeGreaterThanOrEqual(15);
  });

  it('TEST_SCENARIOS has 16 scenarios', () => {
    expect(TEST_SCENARIOS.length).toBe(16);
    expect(TEST_SCENARIOS[0]).toBe('S-001');
    expect(TEST_SCENARIOS[15]).toBe('S-016');
  });

  it('DEFAULT_SCORING_WEIGHTS sums to <= 1.0 for base weights', () => {
    const sum = DEFAULT_SCORING_WEIGHTS.injectionSuccess
      + DEFAULT_SCORING_WEIGHTS.harmfulness
      + DEFAULT_SCORING_WEIGHTS.scannerDetection;
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

// ===========================================================================
// SecureString
// ===========================================================================

describe('SecureString', () => {
  it('masks value in toString()', () => {
    const ss = new SecureString('sk-1234567890abcdef');
    expect(ss.toString()).toBe('****cdef');
    expect(`${ss}`).toBe('****cdef');
  });

  it('masks value in toJSON()', () => {
    const ss = new SecureString('sk-1234567890abcdef');
    const json = JSON.stringify({ key: ss });
    expect(json).toContain('****cdef');
    expect(json).not.toContain('sk-1234567890abcdef');
  });

  it('masks value in console.log via custom inspect', () => {
    const ss = new SecureString('sk-1234567890abcdef');
    const inspectSymbol = Symbol.for('nodejs.util.inspect.custom');
    const result = (ss as Record<symbol, () => string>)[inspectSymbol]();
    expect(result).toContain('****cdef');
    expect(result).not.toContain('sk-1234567890abcdef');
  });

  it('exposes actual value via expose()', () => {
    const ss = new SecureString('sk-1234567890abcdef');
    expect(ss.expose()).toBe('sk-1234567890abcdef');
  });

  it('handles short values by fully masking', () => {
    const ss = new SecureString('abc');
    expect(ss.toString()).toBe('****');
  });

  it('reports hasValue and length', () => {
    const ss = new SecureString('test');
    expect(ss.hasValue).toBe(true);
    expect(ss.length).toBe(4);

    const empty = new SecureString('');
    expect(empty.hasValue).toBe(false);
    expect(empty.length).toBe(0);
  });
});

// ===========================================================================
// Error Hierarchy
// ===========================================================================

describe('Error Hierarchy', () => {
  it('ProviderError extends Error', () => {
    const err = new ProviderError('test', 'TEST', 'openai');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe('TEST');
    expect(err.provider).toBe('openai');
    expect(err.retryable).toBe(false);
  });

  it('RateLimitError is retryable with retry delay', () => {
    const err = new RateLimitError('openai', 'Rate limited', { retryAfter: 30 });
    expect(err.retryable).toBe(true);
    expect(err.retryAfter).toBe(30);
    expect(err.getSuggestedRetryDelay()).toBe(30000);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('AuthenticationError is not retryable', () => {
    const err = new AuthenticationError('openai', 'Bad key', 'apiKey');
    expect(err.retryable).toBe(false);
    expect(err.authType).toBe('apiKey');
    expect(err.code).toBe('AUTHENTICATION_FAILED');
  });

  it('NetworkError is retryable', () => {
    const err = new NetworkError('openai', 'Connection failed', { statusCode: 502 });
    expect(err.retryable).toBe(true);
    expect(err.statusCode).toBe(502);
  });

  it('ValidationError is not retryable', () => {
    const err = new ValidationError('openai', 'Bad input', { field: 'model' });
    expect(err.retryable).toBe(false);
    expect(err.field).toBe('model');
  });

  it('TimeoutError is retryable', () => {
    const err = new TimeoutError('openai', 'Timed out', 30000, 'execute');
    expect(err.retryable).toBe(true);
    expect(err.timeout).toBe(30000);
    expect(err.operation).toBe('execute');
  });

  it('ProviderUnavailableError is retryable', () => {
    const err = new ProviderUnavailableError('google', 'Unavailable', { region: 'us-east1' });
    expect(err.retryable).toBe(true);
    expect(err.region).toBe('us-east1');
  });

  it('ContentFilterError is not retryable', () => {
    const err = new ContentFilterError('openai', 'Content filtered', 'violence');
    expect(err.retryable).toBe(false);
    expect(err.category).toBe('violence');
  });

  describe('isRetryableError', () => {
    it('returns true for retryable ProviderErrors', () => {
      expect(isRetryableError(new RateLimitError('x', 'x'))).toBe(true);
      expect(isRetryableError(new NetworkError('x', 'x'))).toBe(true);
      expect(isRetryableError(new TimeoutError('x', 'x', 1000))).toBe(true);
    });

    it('returns false for non-retryable ProviderErrors', () => {
      expect(isRetryableError(new AuthenticationError('x', 'x'))).toBe(false);
      expect(isRetryableError(new ValidationError('x', 'x'))).toBe(false);
    });

    it('detects retryable from error messages', () => {
      expect(isRetryableError(new Error('network error'))).toBe(true);
      expect(isRetryableError(new Error('request timeout'))).toBe(true);
    });
  });

  describe('getRetryDelay', () => {
    it('uses RateLimitError suggested delay', () => {
      const err = new RateLimitError('x', 'x', { retryAfter: 10 });
      expect(getRetryDelay(err)).toBe(10000);
    });

    it('doubles base delay for TimeoutError', () => {
      const err = new TimeoutError('x', 'x', 1000);
      expect(getRetryDelay(err, 1000)).toBe(2000);
    });

    it('returns base delay for other errors', () => {
      expect(getRetryDelay(new Error('unknown'), 1500)).toBe(1500);
    });
  });

  describe('parseApiError', () => {
    it('maps 401 to AuthenticationError', () => {
      const err = parseApiError('openai', 401, 'Unauthorized');
      expect(err).toBeInstanceOf(AuthenticationError);
    });

    it('maps 429 to RateLimitError', () => {
      const err = parseApiError('openai', 429, 'Too many requests');
      expect(err).toBeInstanceOf(RateLimitError);
    });

    it('maps 400 to ValidationError', () => {
      const err = parseApiError('openai', 400, 'Bad request');
      expect(err).toBeInstanceOf(ValidationError);
    });

    it('maps 503 to ProviderUnavailableError', () => {
      const err = parseApiError('openai', 503, 'Service unavailable');
      expect(err).toBeInstanceOf(ProviderUnavailableError);
    });

    it('maps 500 to NetworkError', () => {
      const err = parseApiError('openai', 500, 'Internal error');
      expect(err).toBeInstanceOf(NetworkError);
    });

    it('maps unknown status to ProviderError', () => {
      const err = parseApiError('openai', 418, 'Teapot');
      expect(err).toBeInstanceOf(ProviderError);
      expect(err.code).toBe('UNKNOWN_ERROR');
    });
  });
});

// ===========================================================================
// Fetch Utilities
// ===========================================================================

describe('sanitizeUrl', () => {
  it('strips embedded credentials', () => {
    const result = sanitizeUrl('https://user:pass@api.example.com/v1');
    expect(result).not.toContain('user');
    expect(result).not.toContain('pass');
    expect(result).toContain('api.example.com');
  });

  it('redacts auth query params', () => {
    const result = sanitizeUrl('https://api.example.com/v1?key=sk-12345&model=gpt-4');
    // URL API encodes brackets, so check for encoded form
    expect(result).toMatch(/REDACTED/);
    expect(result).not.toContain('sk-12345');
    expect(result).toContain('model=gpt-4');
  });

  it('handles malformed URLs', () => {
    const result = sanitizeUrl('not-a-url');
    expect(result).toBe('[INVALID_URL]');
  });
});

describe('fetchWithTimeout', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns response for successful fetch', async () => {
    globalThis.fetch = async () => new Response('OK', { status: 200 });
    const response = await fetchWithTimeout('https://example.com');
    expect(response.status).toBe(200);
  });

  it('rejects invalid URLs when validator provided', async () => {
    await expect(
      fetchWithTimeout('http://169.254.169.254/latest', {
        validateUrl: () => false,
      })
    ).rejects.toThrow('URL validation failed');
  });

  it('skips validation when skipUrlValidation is true', async () => {
    globalThis.fetch = async () => new Response('OK', { status: 200 });
    const response = await fetchWithTimeout('http://internal', {
      skipUrlValidation: true,
    });
    expect(response.status).toBe(200);
  });
});

describe('withTimeout', () => {
  it('resolves if promise finishes before timeout', async () => {
    const result = await withTimeout(Promise.resolve(42), 5000, 'test');
    expect(result).toBe(42);
  });

  it('rejects if timeout is reached', async () => {
    const slowPromise = new Promise(resolve => setTimeout(resolve, 10000));
    await expect(withTimeout(slowPromise, 50, 'test')).rejects.toThrow('timed out');
  });
});

describe('measureDuration', () => {
  it('returns non-negative number', () => {
    const start = performance.now();
    const duration = measureDuration(start);
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

// ===========================================================================
// Test Helpers
// ===========================================================================

describe('createMockResponse', () => {
  it('creates valid response with defaults', () => {
    const response = createMockResponse('openai');
    expect(response.text).toBeTruthy();
    expect(response.promptTokens).toBe(10);
    expect(response.completionTokens).toBe(25);
    expect(response.totalTokens).toBe(35);
    expect(response.durationMs).toBe(150);
  });

  it('accepts overrides', () => {
    const response = createMockResponse('anthropic', {
      text: 'Custom response',
      promptTokens: 20,
      completionTokens: 50,
    });
    expect(response.text).toBe('Custom response');
    expect(response.promptTokens).toBe(20);
    expect(response.completionTokens).toBe(50);
    expect(response.totalTokens).toBe(70);
  });
});

describe('MOCK_HTTP_RESPONSES', () => {
  it('generates OpenAI-compatible format', () => {
    const body = MOCK_HTTP_RESPONSES['openai-compatible']('Hello');
    expect(body.choices[0].message.content).toBe('Hello');
    expect(body.usage.prompt_tokens).toBe(10);
  });

  it('generates Anthropic format', () => {
    const body = MOCK_HTTP_RESPONSES['anthropic']('Hello');
    expect(body.content[0].text).toBe('Hello');
    expect(body.usage.input_tokens).toBe(10);
  });

  it('generates Google format', () => {
    const body = MOCK_HTTP_RESPONSES['google']('Hello');
    expect(body.candidates[0].content.parts[0].text).toBe('Hello');
  });

  it('generates Cohere format', () => {
    const body = MOCK_HTTP_RESPONSES['cohere']('Hello');
    expect(body.text).toBe('Hello');
  });
});

describe('createMockProvider', () => {
  it('creates provider with default behavior', async () => {
    const provider = createMockProvider();
    expect(provider.providerType).toBe('custom');
    expect(provider.supportsStreaming).toBe(true);
    expect(provider.validateConfig(createTestModelConfig())).toBe(true);
    expect(await provider.testConnection(createTestModelConfig())).toBe(true);
  });

  it('executes with mock response', async () => {
    const provider = createMockProvider();
    const response = await provider.execute(createTestModelConfig(), { prompt: 'test' });
    expect(response.text).toBeTruthy();
    expect(response.promptTokens).toBeGreaterThan(0);
  });

  it('throws configured error', async () => {
    const provider = createMockProvider({
      executeError: new Error('Test error'),
    });
    await expect(
      provider.execute(createTestModelConfig(), { prompt: 'test' })
    ).rejects.toThrow('Test error');
  });

  it('supports streaming', async () => {
    const provider = createMockProvider();
    const chunks: StreamChunk[] = [];
    await provider.streamExecute(
      createTestModelConfig(),
      { prompt: 'test' },
      (chunk) => chunks.push(chunk),
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].done).toBe(true);
  });

  it('checks status', async () => {
    const provider = createMockProvider({ status: 'rate-limited' });
    const status = await provider.checkStatus!(createTestModelConfig());
    expect(status).toBe('rate-limited');
  });
});

describe('providerTestContract', () => {
  it('generates all required test cases', () => {
    const provider = createMockProvider({ providerType: 'openai' });
    const config = createTestModelConfig();
    const contract = providerTestContract(provider, config);

    const testNames = Object.keys(contract);
    expect(testNames).toContain('has correct providerType');
    expect(testNames).toContain('has supportsStreaming boolean');
    expect(testNames).toContain('validateConfig returns boolean');
    expect(testNames).toContain('getMaxContext returns positive number');
    expect(testNames).toContain('estimateCost returns non-negative number');
    expect(testNames).toContain('execute returns ProviderResponse shape');
    expect(testNames).toContain('testConnection returns boolean');
  });

  it('all contract tests pass for mock provider', async () => {
    const provider = createMockProvider({ providerType: 'openai' });
    const config = createTestModelConfig();
    const contract = providerTestContract(provider, config);

    for (const [name, testFn] of Object.entries(contract)) {
      try {
        await testFn();
      } catch (e) {
        throw new Error(`Contract test "${name}" failed: ${e}`);
      }
    }
  });
});

describe('createTestModelConfig', () => {
  it('creates valid config with defaults', () => {
    const config = createTestModelConfig();
    expect(config.id).toBeTruthy();
    expect(config.name).toBe('Test Model');
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4o');
    expect(config.enabled).toBe(true);
    expect(config.createdAt).toBeTruthy();
    expect(config.updatedAt).toBeTruthy();
  });

  it('accepts overrides', () => {
    const config = createTestModelConfig({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet',
    });
    expect(config.provider).toBe('anthropic');
    expect(config.model).toBe('claude-3-5-sonnet');
  });

  it('generates unique IDs', () => {
    const a = createTestModelConfig();
    const b = createTestModelConfig();
    expect(a.id).not.toBe(b.id);
  });
});

// ===========================================================================
// Test Guard
// ===========================================================================

describe('LLM Test Guard', () => {
  it('blocks unmocked fetch calls', async () => {
    setupLLMTestGuard();
    try {
      await expect(
        globalThis.fetch('https://api.openai.com/v1/chat/completions')
      ).rejects.toThrow('Unmocked HTTP request detected');
    } finally {
      teardownLLMTestGuard();
    }
  });

  it('clears API key env vars', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';

    setupLLMTestGuard();
    expect(process.env.OPENAI_API_KEY).toBeUndefined();
    expect(process.env.ANTHROPIC_API_KEY).toBeUndefined();

    teardownLLMTestGuard();
    expect(process.env.OPENAI_API_KEY).toBe('sk-test');
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-ant-test');

    // Cleanup
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('restores fetch after teardown', async () => {
    const originalFetch = globalThis.fetch;
    setupLLMTestGuard();
    teardownLLMTestGuard();
    expect(globalThis.fetch).toBe(originalFetch);
  });
});

describe('createMockFetch', () => {
  it('returns matching mock responses', async () => {
    const mockFetch = createMockFetch({
      'api.openai.com': {
        status: 200,
        body: MOCK_HTTP_RESPONSES['openai-compatible']('Mocked!'),
      },
    });

    const response = await mockFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.choices[0].message.content).toBe('Mocked!');
  });

  it('throws for unmatched URLs', async () => {
    const mockFetch = createMockFetch({});
    await expect(
      mockFetch('https://unknown.api.com')
    ).rejects.toThrow('No mock found');
  });
});
