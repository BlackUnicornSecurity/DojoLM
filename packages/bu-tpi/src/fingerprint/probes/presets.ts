/**
 * Probe Presets & Barrel Aggregation
 * Combines all probe categories into presets for different fingerprinting modes.
 */

import type { ProbePreset, ProbeQuery, ProbeCategory, ProbePresetName } from '../types.js';
import { SELF_DISCLOSURE_PROBES } from './self-disclosure.js';
import { CAPABILITY_PROBES } from './capability.js';
import { KNOWLEDGE_BOUNDARY_PROBES } from './knowledge-boundary.js';
import { SAFETY_BOUNDARY_PROBES } from './safety-boundary.js';
import { STYLE_ANALYSIS_PROBES } from './style-analysis.js';
import { PARAMETER_SENSITIVITY_PROBES } from './parameter-sensitivity.js';
import { TIMING_LATENCY_PROBES } from './timing-latency.js';
import { TOKENIZER_PROBES } from './tokenizer.js';
import { MULTI_TURN_PROBES } from './multi-turn.js';
import { CENSORSHIP_PROBES } from './censorship.js';
import { API_METADATA_PROBES } from './api-metadata.js';
import { WATERMARK_PROBES } from './watermark.js';
import { MULTIMODAL_PROBES } from './multimodal.js';
import { CONTEXT_WINDOW_PROBES } from './context-window.js';
import { FINE_TUNING_PROBES } from './fine-tuning.js';
import { QUANTIZATION_PROBES } from './quantization.js';
import { MODEL_LINEAGE_PROBES } from './model-lineage.js';

// ---------------------------------------------------------------------------
// All probes by category
// ---------------------------------------------------------------------------

export const ALL_PROBES: ReadonlyMap<ProbeCategory, readonly ProbeQuery[]> = new Map<
  ProbeCategory,
  readonly ProbeQuery[]
>([
  ['self-disclosure', SELF_DISCLOSURE_PROBES],
  ['capability', CAPABILITY_PROBES],
  ['knowledge-boundary', KNOWLEDGE_BOUNDARY_PROBES],
  ['safety-boundary', SAFETY_BOUNDARY_PROBES],
  ['style-analysis', STYLE_ANALYSIS_PROBES],
  ['parameter-sensitivity', PARAMETER_SENSITIVITY_PROBES],
  ['timing-latency', TIMING_LATENCY_PROBES],
  ['tokenizer', TOKENIZER_PROBES],
  ['multi-turn', MULTI_TURN_PROBES],
  ['censorship', CENSORSHIP_PROBES],
  ['api-metadata', API_METADATA_PROBES],
  ['watermark', WATERMARK_PROBES],
  ['multimodal', MULTIMODAL_PROBES],
  ['context-window', CONTEXT_WINDOW_PROBES],
  ['fine-tuning', FINE_TUNING_PROBES],
  ['quantization', QUANTIZATION_PROBES],
  ['model-lineage', MODEL_LINEAGE_PROBES],
]);

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** Tier 1 categories — fast, high-signal probes */
const TIER_1_CATEGORIES: readonly ProbeCategory[] = [
  'self-disclosure',
  'capability',
  'knowledge-boundary',
  'safety-boundary',
  'style-analysis',
  'parameter-sensitivity',
  'timing-latency',
  'tokenizer',
  'multi-turn',
] as const;

/** All 17 categories */
const ALL_CATEGORIES: readonly ProbeCategory[] = [
  ...TIER_1_CATEGORIES,
  'censorship',
  'api-metadata',
  'watermark',
  'multimodal',
  'context-window',
  'fine-tuning',
  'quantization',
  'model-lineage',
] as const;

export const PROBE_PRESETS: readonly ProbePreset[] = [
  {
    name: 'quick',
    categories: ['self-disclosure', 'capability', 'knowledge-boundary'],
    description: 'Fast identification (~40 probes)',
    estimatedProbes: 40,
  },
  {
    name: 'standard',
    categories: [...TIER_1_CATEGORIES],
    description: 'Standard fingerprint (~76 probes)',
    estimatedProbes: 76,
  },
  {
    name: 'full',
    categories: [...ALL_CATEGORIES],
    description: 'Complete fingerprint (~210 probes)',
    estimatedProbes: 210,
  },
  {
    name: 'verify',
    categories: ['self-disclosure', 'capability', 'style-analysis', 'censorship'],
    description: 'Verification preset (~52 probes)',
    estimatedProbes: 52,
  },
  {
    name: 'stealth',
    categories: ['style-analysis', 'timing-latency', 'tokenizer', 'parameter-sensitivity'],
    description: 'Stealth fingerprint (~44 probes)',
    estimatedProbes: 44,
  },
] as const satisfies readonly ProbePreset[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns all probes for a named preset.
 */
export function getProbesForPreset(preset: ProbePresetName): readonly ProbeQuery[] {
  const found = PROBE_PRESETS.find((p) => p.name === preset);
  if (!found) {
    throw new Error(`Unknown probe preset: ${preset}`);
  }
  return getProbesForCategories(found.categories);
}

/**
 * Returns all probes matching the given categories.
 */
export function getProbesForCategories(
  categories: readonly ProbeCategory[],
): readonly ProbeQuery[] {
  const result: ProbeQuery[] = [];
  for (const category of categories) {
    const probes = ALL_PROBES.get(category);
    if (probes) {
      result.push(...probes);
    }
  }
  return result;
}
