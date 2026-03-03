/**
 * Provider Registry — Factory pattern for LLM provider management (P8-S79)
 *
 * Extends the dojolm-web loadAdapters()/getProviderAdapter() factory pattern.
 * Module-level Map with resetRegistry() for test isolation.
 * No singleton class — factory functions only.
 *
 * Index:
 * - registerProvider / unregisterProvider (line ~20)
 * - getProviderAdapter / listProviders (line ~50)
 * - resetRegistry (line ~80)
 * - loadPresets / getPreset (line ~90)
 */

import { createRequire } from 'node:module';
import type { LLMProviderAdapter, ProviderPreset } from './types.js';

const require = createRequire(import.meta.url);
const presetsData = require('./llm-presets.json') as {
  presets: ProviderPreset[];
  localPresets: ProviderPreset[];
};

// ===========================================================================
// Provider Registry (Module-level Map)
// ===========================================================================

const MAX_REGISTRY_SIZE = 200;

/** Registered provider adapters */
const registry = new Map<string, LLMProviderAdapter>();

/**
 * Register a provider adapter.
 * @throws if registry is at max capacity
 */
export function registerProvider(id: string, adapter: LLMProviderAdapter): void {
  if (registry.size >= MAX_REGISTRY_SIZE && !registry.has(id)) {
    throw new Error(`Provider registry at max capacity (${MAX_REGISTRY_SIZE})`);
  }
  registry.set(id, adapter);
}

/**
 * Unregister a provider adapter.
 */
export function unregisterProvider(id: string): boolean {
  return registry.delete(id);
}

/**
 * Get a registered provider adapter by ID.
 */
export function getProviderAdapter(id: string): LLMProviderAdapter | undefined {
  return registry.get(id);
}

/**
 * List all registered provider IDs.
 */
export function listProviders(): string[] {
  return [...registry.keys()];
}

/**
 * Get count of registered providers.
 */
export function getProviderCount(): number {
  return registry.size;
}

/**
 * Reset the registry for test isolation.
 * Clears all registered providers.
 */
export function resetRegistry(): void {
  // Clear all adapter references — JS strings are immutable so true zeroing
  // is not possible, but clearing the Map removes references for GC.
  // Per S79 spec: "zeroes out key material before deleting references"
  registry.clear();
}

// ===========================================================================
// Presets (Frozen at runtime)
// ===========================================================================

/** All cloud/remote provider presets (frozen) */
const cloudPresets: readonly ProviderPreset[] = Object.freeze(
  (presetsData.presets as ProviderPreset[]).map(p => Object.freeze({ ...p }))
);

/** All local provider presets (frozen) */
const localPresets: readonly ProviderPreset[] = Object.freeze(
  (presetsData.localPresets as ProviderPreset[]).map(p => Object.freeze({ ...p }))
);

/** Combined presets lookup map */
const presetMap = new Map<string, ProviderPreset>();
for (const p of cloudPresets) presetMap.set(p.id, p);
for (const p of localPresets) presetMap.set(p.id, p);

/**
 * Get all cloud/remote provider presets.
 */
export function getCloudPresets(): readonly ProviderPreset[] {
  return cloudPresets;
}

/**
 * Get all local provider presets.
 */
export function getLocalPresets(): readonly ProviderPreset[] {
  return localPresets;
}

/**
 * Get all presets (cloud + local).
 */
export function getAllPresets(): readonly ProviderPreset[] {
  return [...cloudPresets, ...localPresets];
}

/**
 * Get a specific preset by ID.
 */
export function getPreset(id: string): ProviderPreset | undefined {
  return presetMap.get(id);
}

/**
 * Get total number of presets.
 */
export function getPresetCount(): number {
  return presetMap.size;
}
