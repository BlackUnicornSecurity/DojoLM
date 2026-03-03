/**
 * Shared test infrastructure for LLM provider testing (P8-S78)
 *
 * Provides:
 * - providerTestContract(): generates standard test suite for any provider
 * - createMockProvider(): factory returning a mock provider adapter
 * - createMockResponse(): generates valid response payloads per provider format
 * - Global test setup utilities
 *
 * Index:
 * - createMockResponse (line ~20)
 * - createMockProvider (line ~80)
 * - providerTestContract (line ~140)
 * - setupLLMTestGuard / teardownLLMTestGuard (line ~260)
 */

import type {
  LLMProvider,
  LLMModelConfig,
  LLMProviderAdapter,
  ProviderRequestOptions,
  ProviderResponse,
  StreamChunk,
  StreamCallback,
  LLMProviderStatus,
} from './types.js';

// ===========================================================================
// Mock Response Factory
// ===========================================================================

/** Options for creating a mock response */
export interface MockResponseOptions {
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  filtered?: boolean;
  filterReason?: string;
  durationMs?: number;
}

/** Create a valid mock ProviderResponse */
export function createMockResponse(
  provider: LLMProvider,
  overrides: MockResponseOptions = {},
): ProviderResponse {
  return {
    text: overrides.text ?? 'This is a mock LLM response for testing purposes.',
    promptTokens: overrides.promptTokens ?? 10,
    completionTokens: overrides.completionTokens ?? 25,
    totalTokens: (overrides.promptTokens ?? 10) + (overrides.completionTokens ?? 25),
    model: overrides.model ?? 'mock-model',
    filtered: overrides.filtered,
    filterReason: overrides.filterReason,
    durationMs: overrides.durationMs ?? 150,
  };
}

/** Provider-specific HTTP response formats */
export const MOCK_HTTP_RESPONSES = {
  'openai-compatible': (text: string = 'Mock response') => ({
    id: 'chatcmpl-mock',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'mock-model',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 25, total_tokens: 35 },
  }),

  'anthropic': (text: string = 'Mock response') => ({
    id: 'msg_mock',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text }],
    model: 'claude-3-5-sonnet-20241022',
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 25 },
  }),

  'google': (text: string = 'Mock response') => ({
    candidates: [{
      content: { parts: [{ text }], role: 'model' },
      finishReason: 'STOP',
    }],
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 25, totalTokenCount: 35 },
  }),

  'cohere': (text: string = 'Mock response') => ({
    response_id: 'mock-id',
    text,
    generation_id: 'mock-gen',
    token_count: { prompt_tokens: 10, response_tokens: 25, total_tokens: 35 },
  }),

  'ai21': (text: string = 'Mock response') => ({
    id: 'mock-id',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 25, total_tokens: 35 },
  }),

  'ollama': (text: string = 'Mock response') => ({
    id: 'chatcmpl-mock',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'llama3.2',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    }],
    usage: { prompt_tokens: 10, completion_tokens: 25, total_tokens: 35 },
  }),
} as const;

// ===========================================================================
// Mock Provider Factory
// ===========================================================================

/** Configuration for a mock provider */
export interface MockProviderConfig {
  providerType?: LLMProvider;
  supportsStreaming?: boolean;
  executeResponse?: ProviderResponse;
  executeError?: Error;
  validateResult?: boolean;
  connectionResult?: boolean;
  maxContext?: number;
  costPerToken?: number;
  status?: LLMProviderStatus;
}

/** Create a mock LLMProviderAdapter for testing */
export function createMockProvider(config: MockProviderConfig = {}): LLMProviderAdapter {
  const defaultResponse = createMockResponse(config.providerType ?? 'custom');

  return {
    providerType: config.providerType ?? 'custom',
    supportsStreaming: config.supportsStreaming ?? true,

    async execute(_modelConfig: LLMModelConfig, _options: ProviderRequestOptions): Promise<ProviderResponse> {
      if (config.executeError) {
        throw config.executeError;
      }
      return config.executeResponse ?? defaultResponse;
    },

    async streamExecute(
      _modelConfig: LLMModelConfig,
      _options: ProviderRequestOptions,
      onChunk: StreamCallback,
    ): Promise<ProviderResponse> {
      if (config.executeError) {
        throw config.executeError;
      }
      const response = config.executeResponse ?? defaultResponse;
      // Simulate streaming by sending chunks
      const words = response.text.split(' ');
      for (const word of words) {
        onChunk({ delta: word + ' ', done: false });
      }
      onChunk({ delta: '', done: true, completionTokens: response.completionTokens });
      return response;
    },

    validateConfig(modelConfig: LLMModelConfig): boolean {
      if (config.validateResult !== undefined) return config.validateResult;
      // Basic validation: model name must be non-empty
      return !!modelConfig.model && modelConfig.model.length > 0;
    },

    async testConnection(_modelConfig: LLMModelConfig): Promise<boolean> {
      return config.connectionResult ?? true;
    },

    getMaxContext(_modelName: string): number {
      return config.maxContext ?? 128_000;
    },

    estimateCost(_modelName: string, promptTokens: number, completionTokens: number): number {
      const rate = config.costPerToken ?? 0.000003;
      return (promptTokens + completionTokens) * rate;
    },

    async checkStatus(_modelConfig: LLMModelConfig): Promise<LLMProviderStatus> {
      return config.status ?? 'available';
    },
  };
}

// ===========================================================================
// Provider Test Contract
// ===========================================================================

/**
 * Generates a standard test suite for any provider implementation.
 * Returns an object of test cases that can be spread into a describe block.
 *
 * Usage in vitest:
 * ```
 * const contract = providerTestContract(myProvider, mockConfig, mockResponses);
 * describe('MyProvider', () => {
 *   for (const [name, testFn] of Object.entries(contract)) {
 *     it(name, testFn);
 *   }
 * });
 * ```
 */
export function providerTestContract(
  provider: LLMProviderAdapter,
  config: LLMModelConfig,
  _mockResponses?: Record<string, unknown>,
): Record<string, () => void | Promise<void>> {
  return {
    'has correct providerType': () => {
      if (!provider.providerType) {
        throw new Error('providerType must be defined');
      }
    },

    'has supportsStreaming boolean': () => {
      if (typeof provider.supportsStreaming !== 'boolean') {
        throw new Error('supportsStreaming must be a boolean');
      }
    },

    'validateConfig returns boolean': () => {
      const result = provider.validateConfig(config);
      if (typeof result !== 'boolean') {
        throw new Error('validateConfig must return a boolean');
      }
    },

    'validateConfig rejects empty model': () => {
      const badConfig = { ...config, model: '' };
      const result = provider.validateConfig(badConfig);
      if (result !== false) {
        throw new Error('validateConfig should reject empty model name');
      }
    },

    'getMaxContext returns positive number': () => {
      const maxCtx = provider.getMaxContext(config.model);
      if (typeof maxCtx !== 'number' || maxCtx <= 0) {
        throw new Error('getMaxContext must return positive number');
      }
    },

    'estimateCost returns non-negative number': () => {
      const cost = provider.estimateCost(config.model, 100, 200);
      if (typeof cost !== 'number' || cost < 0) {
        throw new Error('estimateCost must return non-negative number');
      }
    },

    'execute returns ProviderResponse shape': async () => {
      const response = await provider.execute(config, {
        prompt: 'Test prompt',
        maxTokens: 100,
      });
      if (typeof response.text !== 'string') {
        throw new Error('response.text must be a string');
      }
      if (typeof response.promptTokens !== 'number') {
        throw new Error('response.promptTokens must be a number');
      }
      if (typeof response.completionTokens !== 'number') {
        throw new Error('response.completionTokens must be a number');
      }
      if (typeof response.totalTokens !== 'number') {
        throw new Error('response.totalTokens must be a number');
      }
      if (typeof response.durationMs !== 'number') {
        throw new Error('response.durationMs must be a number');
      }
    },

    'testConnection returns boolean': async () => {
      const result = await provider.testConnection(config);
      if (typeof result !== 'boolean') {
        throw new Error('testConnection must return a boolean');
      }
    },
  };
}

// ===========================================================================
// Test Guard — Prevents Unmocked HTTP Requests
// ===========================================================================

let originalFetch: typeof globalThis.fetch | undefined;
let envBackup: Record<string, string | undefined> = {};

/** API key env var pattern */
const API_KEY_PATTERN = /^[A-Z][A-Z0-9_]*_API_KEY$/;

/**
 * Setup global test guard: overrides fetch to throw on unmocked calls,
 * and clears all *_API_KEY env vars.
 */
export function setupLLMTestGuard(): void {
  // Back up and clear API key env vars
  envBackup = {};
  for (const key of Object.keys(process.env)) {
    if (API_KEY_PATTERN.test(key)) {
      envBackup[key] = process.env[key];
      delete process.env[key];
    }
  }

  // Override global fetch to prevent real HTTP requests
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    throw new Error(
      `[LLM Test Guard] Unmocked HTTP request detected!\n` +
      `URL: ${url}\n` +
      `Method: ${init?.method ?? 'GET'}\n` +
      `All outbound requests must be mocked in LLM tests.`
    );
  }) as typeof globalThis.fetch;
}

/**
 * Teardown test guard: restore original fetch and env vars.
 */
export function teardownLLMTestGuard(): void {
  // Restore fetch
  if (originalFetch) {
    globalThis.fetch = originalFetch;
    originalFetch = undefined;
  }

  // Restore env vars
  for (const [key, value] of Object.entries(envBackup)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  envBackup = {};
}

/**
 * Create a mock fetch function that returns predefined responses.
 * Use with vi.stubGlobal('fetch', createMockFetch(...)).
 */
export function createMockFetch(
  responses: Record<string, { status: number; body: unknown; headers?: Record<string, string> }>,
): typeof globalThis.fetch {
  return (async (input: string | URL | Request, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    // Find matching response by URL prefix
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(response.body), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...response.headers,
          },
        });
      }
    }

    throw new Error(`[Mock Fetch] No mock found for URL: ${url}`);
  }) as typeof globalThis.fetch;
}

// ===========================================================================
// Test Config Factory
// ===========================================================================

/** Create a minimal valid LLMModelConfig for testing */
export function createTestModelConfig(overrides: Partial<LLMModelConfig> = {}): LLMModelConfig {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test Model',
    provider: overrides.provider ?? 'openai',
    model: overrides.model ?? 'gpt-4o',
    apiKey: overrides.apiKey ?? 'sk-test-mock-key-for-testing-only-not-real',
    baseUrl: overrides.baseUrl,
    enabled: overrides.enabled ?? true,
    maxTokens: overrides.maxTokens,
    organizationId: overrides.organizationId,
    projectId: overrides.projectId,
    customHeaders: overrides.customHeaders,
    temperature: overrides.temperature,
    topP: overrides.topP,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
}
