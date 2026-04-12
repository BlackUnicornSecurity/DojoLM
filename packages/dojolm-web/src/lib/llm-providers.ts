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

import type {
  LLMProvider,
  LLMModelConfig,
  ProviderRequestOptions,
  ProviderResponse,
  StreamChunk,
  StreamCallback,
  LLMProviderAdapter,
} from './llm-types';

export type {
  ProviderRequestOptions,
  ProviderResponse,
  StreamChunk,
  StreamCallback,
  LLMProviderAdapter,
};

// ===========================================================================
// Provider Registry
// ===========================================================================

/**
 * Lazy-loaded provider adapters
 * This avoids circular dependencies and reduces initial bundle size
 */
let providerAdapters: Partial<Record<LLMProvider, LLMProviderAdapter>> | null = null;

async function loadAdapters(): Promise<Partial<Record<LLMProvider, LLMProviderAdapter>>> {
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
    sharedProviders,
  ] = await Promise.all([
    import('./providers/openai'),
    import('./providers/anthropic'),
    import('./providers/ollama'),
    import('./providers/lmstudio'),
    import('./providers/llamacpp'),
    import('./providers/zai'),
    import('./providers/moonshot'),
    import('bu-tpi/llm'),
  ]);

  const {
    googleProvider,
    cohereProvider,
    ai21Provider,
    replicateProvider,
    cloudflareProvider,
    createOpenAICompatibleProvider,
    getPreset,
  } = sharedProviders;

  const presetBackedProvider = (presetId: string): LLMProviderAdapter => {
    // Lazy resolution: defer preset lookup to first use so a missing preset
    // for one provider (e.g. blackunicorn) doesn't poison the entire adapter map
    // and block unrelated providers (e.g. ollama). See lessonslearned 2026-04-12.
    let cached: LLMProviderAdapter | null = null;
    const resolve = (): LLMProviderAdapter => {
      if (cached) return cached;
      const preset = getPreset(presetId);
      if (!preset) {
        throw new Error(`Missing shared provider preset for "${presetId}"`);
      }
      cached = createOpenAICompatibleProvider(preset);
      return cached;
    };
    // Return a proxy that delegates every method call to the lazily-resolved adapter
    return new Proxy({} as LLMProviderAdapter, {
      get(_target, prop) {
        // Don't resolve for Symbol introspection (vitest/node probes Symbol.toPrimitive etc.)
        if (typeof prop === 'symbol') return undefined;
        const resolved = resolve();
        const value = (resolved as unknown as Record<string | symbol, unknown>)[prop];
        return typeof value === 'function' ? value.bind(resolved) : value;
      },
      has(_target, prop) {
        if (typeof prop === 'symbol') return false;
        const resolved = resolve();
        return prop in resolved;
      },
    });
  };

  providerAdapters = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    google: googleProvider,
    cohere: cohereProvider,
    ai21: ai21Provider,
    replicate: replicateProvider,
    cloudflare: cloudflareProvider,
    groq: presetBackedProvider('groq'),
    together: presetBackedProvider('together'),
    fireworks: presetBackedProvider('fireworks'),
    deepseek: presetBackedProvider('deepseek'),
    mistral: presetBackedProvider('mistral'),
    ollama: ollamaProvider,
    lmstudio: lmstudioProvider,
    llamacpp: llamacppProvider,
    zai: zaiProvider,
    moonshot: moonshotProvider,
    blackunicorn: presetBackedProvider('blackunicorn'),
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
// SSRF Protection
// ===========================================================================

/**
 * Blocked IP ranges for SSRF prevention (SEC-001).
 * Covers cloud metadata services, loopback, and link-local addresses.
 */
const SSRF_BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  'metadata.google.com',
] as const;

function isBlockedSsrfTarget(urlStr: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return 'Invalid URL format';
  }

  const hostname = parsed.hostname;

  // Block cloud metadata IPs (AWS, Azure, GCP, Alibaba, Oracle)
  const blockedIpPrefixes = [
    '169.254.169.254',  // AWS / Azure / GCP metadata
    '100.100.100.200',  // Alibaba Cloud metadata
    '192.0.0.192',      // Oracle Cloud metadata
    '127.',             // Loopback
    '0.0.0.0',          // Unspecified
    '0.',               // Zero-prefix
  ];

  for (const prefix of blockedIpPrefixes) {
    if (hostname.startsWith(prefix)) {
      return `Blocked SSRF target: ${hostname} (cloud metadata / loopback)`;
    }
  }

  // Block IPv6 loopback and link-local
  if (hostname === '[::1]' || hostname === '::1') {
    return 'Blocked SSRF target: IPv6 loopback';
  }
  if (hostname.startsWith('[fe80:') || hostname.startsWith('[fd00:') || hostname.startsWith('fe80:') || hostname.startsWith('fd00:')) {
    return 'Blocked SSRF target: IPv6 link-local / unique-local';
  }

  // Block known metadata hostnames
  for (const blocked of SSRF_BLOCKED_HOSTNAMES) {
    if (hostname === blocked) {
      return `Blocked SSRF target: ${hostname}`;
    }
  }

  return null; // Safe
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

  // SEC-001: SSRF validation for baseUrl
  if (config.baseUrl) {
    const ssrfError = isBlockedSsrfTarget(config.baseUrl);
    if (ssrfError) {
      errors.push(ssrfError);
    }
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

  if (config.requestTimeout !== undefined) {
    if (!Number.isFinite(config.requestTimeout) || !Number.isInteger(config.requestTimeout)) {
      errors.push('Request timeout must be an integer number of milliseconds');
    } else if (config.requestTimeout < 1000 || config.requestTimeout > 600000) {
      errors.push('Request timeout must be between 1000 and 600000 ms');
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
