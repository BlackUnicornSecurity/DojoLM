/**
 * Data-Driven OpenAI-Compatible Provider Registry (P8-S80)
 *
 * Single file + single class replaces 25+ individual provider files.
 * Each OpenAI-compatible provider is registered with its preset config deltas.
 *
 * Index:
 * - createOpenAICompatibleProvider (line ~15)
 * - registerOpenAICompatibleProviders (line ~25)
 */

import type { LLMProviderAdapter, ProviderPreset } from '../types.js';
import { OpenAICompatibleProvider } from './openai-compatible.js';
import { getCloudPresets, getLocalPresets, registerProvider } from '../registry.js';

/**
 * Create an OpenAI-compatible provider adapter from a preset.
 */
export function createOpenAICompatibleProvider(preset: ProviderPreset): LLMProviderAdapter {
  return new OpenAICompatibleProvider(
    preset.id as any, // Provider type from preset
    preset,
  );
}

/**
 * Register all OpenAI-compatible providers from presets.
 * Non-compatible providers (Anthropic, Google, Cohere, AI21, Replicate, Cloudflare)
 * need their own implementation files and are NOT registered here.
 */
export function registerOpenAICompatibleProviders(): void {
  const nonCompatible = new Set([
    'anthropic', 'google', 'cohere', 'cohere-v2', 'ai21',
    'replicate', 'cloudflare', 'aleph-alpha',
  ]);

  // Register cloud presets that are OpenAI-compatible
  for (const preset of getCloudPresets()) {
    if (preset.isOpenAICompatible && !nonCompatible.has(preset.id)) {
      registerProvider(preset.id, createOpenAICompatibleProvider(preset));
    }
  }

  // Register local presets (all are OpenAI-compatible)
  for (const preset of getLocalPresets()) {
    if (preset.isOpenAICompatible) {
      registerProvider(preset.id, createOpenAICompatibleProvider(preset));
    }
  }
}
