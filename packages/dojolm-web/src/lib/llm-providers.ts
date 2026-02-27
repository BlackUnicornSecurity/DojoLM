/**
 * File: llm-providers.ts
 * Purpose: Provider adapter interface and factory for LLM APIs
 * Index:
 * - LLMProviderAdapter interface (line 18)
 * - ProviderRequestOptions (line 78)
 * - ProviderResponse (line 109)
 * - StreamChunk (line 135)
 * - Provider factory (line 158)
 * - Config validation (line 186)
 */

import type { LLMProvider, LLMModelConfig } from './llm-types';

// ===========================================================================
// Types
// ===========================================================================

/**
 * Options for a provider request
 */
export interface ProviderRequestOptions {
  /** The prompt to send */
  prompt: string;

  /** Maximum tokens to generate */
  maxTokens?: number;

  /** Temperature (0-2) */
  temperature?: number;

  /** Top-p sampling (0-1) */
  topP?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** System message (for providers that support it) */
  systemMessage?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Whether to stream the response */
  stream?: boolean;
}

/**
 * Standardized response from any provider
 */
export interface ProviderResponse {
  /** The generated text response */
  text: string;

  /** Number of tokens in the prompt */
  promptTokens: number;

  /** Number of tokens in the completion */
  completionTokens: number;

  /** Total tokens used */
  totalTokens: number;

  /** The model that was used */
  model: string;

  /** Whether the response was filtered */
  filtered?: boolean;

  /** Filter reason if applicable */
  filterReason?: string;

  /** Duration of the request in milliseconds */
  durationMs: number;

  /** Raw response for debugging */
  raw?: unknown;
}

/**
 * A chunk from a streaming response
 */
export interface StreamChunk {
  /** Text delta for this chunk */
  delta: string;

  /** Whether this is the final chunk */
  done: boolean;

  /** Cumulative prompt tokens (available in final chunk) */
  promptTokens?: number;

  /** Cumulative completion tokens (available in final chunk) */
  completionTokens?: number;

  /** Any metadata for this chunk */
  metadata?: Record<string, unknown>;
}

/**
 * Stream callback function type
 */
export type StreamCallback = (chunk: StreamChunk) => void;

// ===========================================================================
// Provider Adapter Interface
// ===========================================================================

/**
 * Standard interface for all LLM providers
 *
 * All provider adapters must implement this interface to ensure
 * consistent behavior across different LLM APIs.
 */
export interface LLMProviderAdapter {
  /** The provider type this adapter handles */
  readonly providerType: LLMProvider;

  /**
   * Execute a prompt and get the response
   *
   * @param config - Model configuration to use
   * @param options - Request options
   * @returns Promise resolving to the provider response
   */
  execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions
  ): Promise<ProviderResponse>;

  /**
   * Execute a prompt with streaming
   *
   * @param config - Model configuration to use
   * @param options - Request options
   * @param onChunk - Callback for each stream chunk
   * @returns Promise resolving to the final provider response
   */
  streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback
  ): Promise<ProviderResponse>;

  /**
   * Validate that a configuration is correct for this provider
   *
   * @param config - Configuration to validate
   * @returns true if valid, throws error if invalid
   */
  validateConfig(config: LLMModelConfig): boolean;

  /**
   * Test that the provider is accessible with the given config
   *
   * @param config - Configuration to test
   * @returns Promise resolving to true if connection works
   */
  testConnection(config: LLMModelConfig): Promise<boolean>;

  /**
   * Get the maximum context window for a model
   *
   * @param modelName - Name of the model
   * @returns Maximum tokens the model can handle
   */
  getMaxContext(modelName: string): number;

  /**
   * Estimate cost for a request in USD
   *
   * @param modelName - Name of the model
   * @param promptTokens - Estimated input tokens
   * @param completionTokens - Estimated output tokens
   * @returns Estimated cost in USD
   */
  estimateCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number
  ): number;

  /**
   * Check if this adapter supports streaming
   */
  supportsStreaming: boolean;
}

// ===========================================================================
// Provider Registry
// ===========================================================================

/**
 * Lazy-loaded provider adapters
 * This avoids circular dependencies and reduces initial bundle size
 */
let providerAdapters: Record<LLMProvider, LLMProviderAdapter> | null = null;

async function loadAdapters(): Promise<Record<LLMProvider, LLMProviderAdapter>> {
  if (providerAdapters) {
    return providerAdapters;
  }

  const [
    { openaiProvider },
    { anthropicProvider },
    { ollamaProvider },
    { lmstudioProvider },
    { llamacppProvider },
    { zaiProvider },
    { moonshotProvider },
  ] = await Promise.all([
    import('./providers/openai'),
    import('./providers/anthropic'),
    import('./providers/ollama'),
    import('./providers/lmstudio'),
    import('./providers/llamacpp'),
    import('./providers/zai'),
    import('./providers/moonshot'),
  ]);

  providerAdapters = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    ollama: ollamaProvider,
    lmstudio: lmstudioProvider,
    llamacpp: llamacppProvider,
    google: anthropicProvider, // Placeholder - to be implemented
    cohere: anthropicProvider, // Placeholder - to be implemented
    zai: zaiProvider,
    moonshot: moonshotProvider,
    custom: openaiProvider, // Custom uses OpenAI-compatible
  };

  return providerAdapters;
}

/**
 * Get an adapter instance for a provider
 */
export async function getProviderAdapter(
  provider: LLMProvider
): Promise<LLMProviderAdapter> {
  const adapters = await loadAdapters();
  const adapter = adapters[provider];

  if (!adapter) {
    throw new Error(
      `No adapter found for provider: ${provider}. ` +
      `Available providers: ${Object.keys(adapters).join(', ')}`
    );
  }

  return adapter;
}

/**
 * Get all registered provider types
 */
export async function getRegisteredProviders(): Promise<LLMProvider[]> {
  const adapters = await loadAdapters();
  return Object.keys(adapters) as LLMProvider[];
}

// ===========================================================================
// Config Validation
// ===========================================================================

/**
 * Validate an LLM model configuration
 *
 * Performs common validation checks and delegates to provider-specific
 * validation if an adapter is available.
 */
export async function validateModelConfig(
  config: LLMModelConfig
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic validation
  if (!config.id || config.id.trim().length === 0) {
    errors.push('Model ID is required');
  }

  if (!config.name || config.name.trim().length === 0) {
    errors.push('Model name is required');
  }

  if (!config.provider) {
    errors.push('Provider is required');
  }

  if (!config.model || config.model.trim().length === 0) {
    errors.push('Model identifier is required');
  }

  // Provider-specific validation
  if (config.provider && errors.length === 0) {
    try {
      const adapter = await getProviderAdapter(config.provider);
      adapter.validateConfig(config);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  // Temperature validation
  if (config.temperature !== undefined) {
    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }
  }

  // Top-p validation
  if (config.topP !== undefined) {
    if (config.topP < 0 || config.topP > 1) {
      errors.push('Top-p must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Test a model configuration by making a minimal API call
 */
export async function testModelConfig(
  config: LLMModelConfig
): Promise<{ success: boolean; error?: string; durationMs?: number }> {
  const startTime = Date.now();

  try {
    // Validate first
    const validation = await validateModelConfig(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
      };
    }

    // Test connection
    const adapter = await getProviderAdapter(config.provider);
    const connected = await adapter.testConnection(config);

    return {
      success: connected,
      error: connected ? undefined : 'Connection test failed',
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}

// ===========================================================================
// Provider Factory Helpers
// ===========================================================================

/**
 * Create a standard request timeout promise
 */
export function createTimeoutPromise(
  timeoutMs: number,
  operation: string
): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

/**
 * Wrap a promise with timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  return Promise.race([
    promise,
    createTimeoutPromise(timeoutMs, operation),
  ]);
}

/**
 * Calculate request duration
 */
export function measureDuration(startTime: number): number {
  return Date.now() - startTime;
}
