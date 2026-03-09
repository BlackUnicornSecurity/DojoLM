/**
 * File: llm-constants.ts
 * Purpose: LLM Provider configurations and constants
 * Index:
 * - Provider configurations (line 16)
 * - Rate limits (line 82)
 * - Default models (line 108)
 * - Cost tracking constants (line 138)
 * - Validation rules (line 158)
 */

import type { LLMProvider } from './llm-types';

// ===========================================================================
// Provider Configurations
// ===========================================================================

/**
 * Base API URLs for each provider
 */
export const PROVIDER_BASE_URLS: Record<LLMProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com',
  ollama: 'http://localhost:11434',
  lmstudio: 'http://localhost:1234',
  llamacpp: 'http://localhost:8080',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  cohere: 'https://api.cohere.com/v1',
  zai: 'https://api.z.ai/api/anthropic',
  moonshot: 'https://api.moonshot.cn/v1',
  custom: '', // User must provide
} as const;

/**
 * Default models for each provider
 */
export const DEFAULT_MODELS: Record<LLMProvider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  ollama: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'phi3'],
  lmstudio: ['llama-3.2', 'mistral', 'qwen2.5', 'phi-3'],
  llamacpp: ['llama-3.2', 'mistral', 'qwen2.5', 'phi-3'],
  google: ['gemini-2.0-flash-exp', 'gemini-1.5-pro'],
  cohere: ['command-r-plus', 'command-r'],
  zai: ['glm-4.7', 'glm-4-flash'],
  moonshot: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  custom: [], // User-defined models
} as const;

/**
 * Provider display names and descriptions
 */
export const PROVIDER_INFO: Record<LLMProvider, { name: string; description: string; officialUrl: string }> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4, GPT-4o, and other OpenAI models',
    officialUrl: 'https://platform.openai.com',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Haiku, and other Anthropic models',
    officialUrl: 'https://www.anthropic.com',
  },
  ollama: {
    name: 'Ollama',
    description: 'Open-source models running locally',
    officialUrl: 'https://ollama.com',
  },
  lmstudio: {
    name: 'LM Studio',
    description: 'Local LLM inference with OpenAI-compatible API',
    officialUrl: 'https://lmstudio.ai',
  },
  llamacpp: {
    name: 'llama.cpp',
    description: 'Local GGUF model inference server',
    officialUrl: 'https://github.com/ggerganov/llama.cpp',
  },
  google: {
    name: 'Google AI',
    description: 'Gemini models from Google',
    officialUrl: 'https://ai.google.dev',
  },
  cohere: {
    name: 'Cohere',
    description: 'Command R and other Cohere models',
    officialUrl: 'https://cohere.com',
  },
  zai: {
    name: 'z.ai (Zhipu AI)',
    description: 'GLM series models via z.ai API',
    officialUrl: 'https://open.bigmodel.cn',
  },
  moonshot: {
    name: 'Moonshot AI (Kimi)',
    description: 'Chinese AI lab with long-context models',
    officialUrl: 'https://www.moonshot.cn',
  },
  custom: {
    name: 'Custom Provider',
    description: 'User-defined OpenAI-compatible endpoint',
    officialUrl: '',
  },
} as const;

/**
 * Providers that are OpenAI-compatible (can use the same API client)
 */
export const OPENAI_COMPATIBLE_PROVIDERS: readonly LLMProvider[] = [
  'openai',
  'ollama',
  'lmstudio',
  'llamacpp',
  'zai',
  'moonshot',
  'custom',
] as const;

/**
 * Providers that use native SDKs
 */
export const NATIVE_SDK_PROVIDERS: readonly LLMProvider[] = [
  'anthropic',
  'google',
  'cohere',
] as const;

// ===========================================================================
// Rate Limits
// ===========================================================================

/**
 * Default rate limits per provider (requests per minute)
 * Used for preventing API quota exhaustion
 */
export const DEFAULT_RATE_LIMITS: Record<LLMProvider, { rpm: number; tpm: number }> = {
  openai: { rpm: 3000, tpm: 200000 }, // 3K RPM, 200K TPM
  anthropic: { rpm: 1000, tpm: 80000 },  // 1K RPM, 80K TPM
  ollama: { rpm: 10000, tpm: 600000 },  // Local: high limits
  lmstudio: { rpm: 10000, tpm: 600000 }, // Local: high limits
  llamacpp: { rpm: 10000, tpm: 600000 }, // Local: high limits
  google: { rpm: 60, tpm: 0 },          // 60 RPM (no TPM limit)
  cohere: { rpm: 100, tpm: 0 },
  zai: { rpm: 200, tpm: 100000 },
  moonshot: { rpm: 60, tpm: 0 },
  custom: { rpm: 1000, tpm: 100000 },     // Default custom limit
} as const;

/**
 * Maximum concurrent requests per provider
 */
export const MAX_CONCURRENT_REQUESTS: Record<LLMProvider, number> = {
  openai: 10,
  anthropic: 5,
  ollama: 20,
  lmstudio: 20,
  llamacpp: 20,
  google: 5,
  cohere: 5,
  zai: 10,
  moonshot: 5,
  custom: 5,
} as const;

// ===========================================================================
// Timeout Settings
// ===========================================================================

/**
 * Default timeout for API requests in milliseconds
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Maximum timeout for API requests in milliseconds
 */
export const MAX_REQUEST_TIMEOUT_MS = 120000; // 2 minutes

/**
 * Timeout for batch execution
 */
export const BATCH_TIMEOUT_MS = 300000; // 5 minutes

// ===========================================================================
// Cost Tracking
// ===========================================================================

/**
 * Estimated costs per 1M tokens (input/output) in USD
 * Used for cost calculation before execution
 */
export const TOKEN_COSTS: Record<LLMProvider, { input: number; output: number }> = {
  openai: { input: 2.50, output: 10.00 },     // GPT-4o approx
  anthropic: { input: 3.00, output: 15.00 }, // Claude 3.5 Sonnet approx
  ollama: { input: 0, output: 0 },           // Free (local)
  lmstudio: { input: 0, output: 0 },        // Free (local)
  llamacpp: { input: 0, output: 0 },        // Free (local)
  google: { input: 0.075, output: 0.30 },   // Gemini 1.5 Pro approx
  cohere: { input: 0.15, output: 0.60 },
  zai: { input: 0.50, output: 2.00 },
  moonshot: { input: 1.00, output: 2.00 },
  custom: { input: 0, output: 0 },           // User-defined
} as const;

/**
 * Budget alert thresholds (percentage of monthly budget)
 */
export const BUDGET_ALERTS = {
  WARNING: 0.8,   // 80% of budget
  CRITICAL: 0.9,  // 90% of budget
} as const;

/**
 * Default monthly budgets per provider (USD)
 */
export const DEFAULT_MONTHLY_BUDGETS: Record<LLMProvider, number> = {
  openai: 100,
  anthropic: 100,
  ollama: 0,      // No cost for local
  lmstudio: 0,   // No cost for local
  llamacpp: 0,    // No cost for local
  google: 20,
  cohere: 20,
  zai: 20,
  moonshot: 20,
  custom: 50,
} as const;

// ===========================================================================
// Validation Rules
// ===========================================================================

/**
 * Minimum model name length
 */
export const MIN_MODEL_NAME_LENGTH = 2;

/**
 * Maximum model name length
 */
export const MAX_MODEL_NAME_LENGTH = 100;

/**
 * Maximum API key length (for validation)
 */
export const MAX_API_KEY_LENGTH = 200;

/**
 * Minimum base URL length for custom providers
 */
export const MIN_BASE_URL_LENGTH = 10;

/**
 * Valid temperature range
 */
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const;

/**
 * Valid top-p range
 */
export const TOP_P_RANGE = { min: 0, max: 1 } as const;

/**
 * Allowed custom URL protocols
 */
export const ALLOWED_URL_PROTOCOLS = ['https:', 'http:'] as const;

// ===========================================================================
// Dashboard Constants
// ===========================================================================

/**
 * Default concurrent execution limit for batch tests.
 * Configurable via LLM_CONCURRENT_LIMIT env var (1-50).
 */
export const DEFAULT_CONCURRENT_LIMIT = 5;

export function getConcurrentLimit(): number {
  if (typeof window !== 'undefined') return DEFAULT_CONCURRENT_LIMIT;
  const envVal = process.env.LLM_CONCURRENT_LIMIT;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50) return parsed;
  }
  return DEFAULT_CONCURRENT_LIMIT;
}

/**
 * Maximum batch size (configurable via LLM_MAX_BATCH_SIZE env var, default 10000, range 1-50000).
 */
export function getMaxBatchSize(): number {
  if (typeof window !== 'undefined') return 10000;
  const envVal = process.env.LLM_MAX_BATCH_SIZE;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 50000) return parsed;
  }
  return 10000;
}

/**
 * Maximum batch size in bytes (input)
 */
export const MAX_BATCH_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Maximum concurrent batches per user
 */
export const MAX_CONCURRENT_BATCHES = 5;

/**
 * Maximum results to store per model before archiving
 */
export const MAX_RESULTS_PER_MODEL = 10000;

/**
 * Dashboard refresh rate (SSE reconnection interval)
 */
export const DASHBOARD_REFRESH_RATE_MS = 2000; // 2 seconds

/**
 * SSE reconnection timeout
 */
export const SSE_RECONNECT_TIMEOUT_MS = 5000;

// ===========================================================================
// Data Retention
// ===========================================================================

/**
 * Default data retention period in days
 */
export const DEFAULT_RETENTION_DAYS = 90;

/**
 * Maximum data retention period in days
 */
export const MAX_RETENTION_DAYS = 365;

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Check if a provider uses OpenAI-compatible API
 */
export function isOpenAICompatible(provider: LLMProvider): boolean {
  return OPENAI_COMPATIBLE_PROVIDERS.includes(provider);
}

/**
 * Check if a provider requires a native SDK
 */
export function requiresNativeSDK(provider: LLMProvider): boolean {
  return NATIVE_SDK_PROVIDERS.includes(provider);
}

/**
 * Get the display name for a provider
 */
export function getProviderDisplayName(provider: LLMProvider): string {
  return PROVIDER_INFO[provider]?.name || provider;
}

/**
 * Get rate limit for a provider
 */
export function getRateLimit(provider: LLMProvider): { rpm: number; tpm: number } {
  return DEFAULT_RATE_LIMITS[provider] || { rpm: 100, tpm: 0 };
}

/**
 * Validate API key format for a provider
 */
export function validateApiKey(provider: LLMProvider, apiKey: string): boolean {
  if (!apiKey || apiKey.length === 0) {
    return false;
  }

  if (apiKey.length > MAX_API_KEY_LENGTH) {
    return false;
  }

  // Provider-specific validation patterns
  const patterns: Record<LLMProvider, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{32,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9_-]{32,95}$/,
    google: /^AIza[a-zA-Z0-9_-]{35}$/,
    cohere: /^[a-zA-Z0-9]{40}$/,
    // ollama, lmstudio, llamacpp, zai, moonshot, custom have no strict format
    ollama: /.*/,
    lmstudio: /.*/,
    llamacpp: /.*/,
    zai: /.*/,
    moonshot: /.*/,
    custom: /.*/,
  };

  const pattern = patterns[provider];
  return pattern ? pattern.test(apiKey) : true;
}

/**
 * Estimate cost for an API call
 */
export function estimateCost(
  provider: LLMProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const costs = TOKEN_COSTS[provider];
  const inputCost = (inputTokens / 1_000_000) * costs.input;
  const outputCost = (outputTokens / 1_000_000) * costs.output;
  return inputCost + outputCost;
}
