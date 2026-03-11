/**
 * File: providers/index.ts
 * Purpose: Provider registry and initialization
 * Index:
 * - Provider exports (line 13)
 * - Registration function (line 32)
 */

// Import all provider adapters
import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { ollamaProvider } from './ollama';
import { zaiProvider } from './zai';
import { moonshotProvider } from './moonshot';

import type { LLMProvider } from '../llm-types';
import type { LLMProviderAdapter } from '../llm-providers';

// ===========================================================================
// Provider Registry
// ===========================================================================

/**
 * Map of all available providers to their adapters
 */
const PROVIDER_ADAPTERS: Partial<Record<LLMProvider, LLMProviderAdapter>> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  ollama: ollamaProvider,
  lmstudio: ollamaProvider, // LM Studio uses OpenAI-compatible API
  llamacpp: ollamaProvider, // llama.cpp uses OpenAI-compatible API
  google: anthropicProvider, // Will be implemented separately
  cohere: anthropicProvider, // Will be implemented separately
  zai: zaiProvider,
  moonshot: moonshotProvider,
  custom: openaiProvider, // Custom uses OpenAI-compatible adapter
};

/**
 * Get a provider adapter by type
 */
export function getProviderAdapter(type: LLMProvider): LLMProviderAdapter {
  const adapter = PROVIDER_ADAPTERS[type];
  if (!adapter) {
    throw new Error(`No adapter found for provider: ${type}`);
  }
  return adapter;
}

/**
 * Get all available provider types
 */
export function getAvailableProviders(): LLMProvider[] {
  return Object.keys(PROVIDER_ADAPTERS) as LLMProvider[];
}

/**
 * Check if a provider type is supported
 */
export function isProviderSupported(type: LLMProvider): boolean {
  return type in PROVIDER_ADAPTERS;
}

// Export all providers
export {
  openaiProvider,
  anthropicProvider,
  ollamaProvider,
  zaiProvider,
  moonshotProvider,
};

// Export error types
export * from './errors';
