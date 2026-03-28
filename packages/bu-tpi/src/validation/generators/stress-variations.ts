/**
 * KATANA Adversarial Stress Variation Generator
 *
 * Produces harder, label-preserving variants from existing fixtures using
 * deterministic SAGE and EdgeFuzz mutation operators. By registering this
 * generator in the default pipeline, every new dojo fixture automatically
 * receives a reusable stress-discovery layer.
 */

import {
  SeededRNG as SageSeededRNG,
  characterSubstitution,
  contextFraming,
  delimiterInjection,
  encodingWrapping,
  instructionParaphrasing,
} from '../../sage/mutation-engine.js';
import {
  composeWithCoreMutation as composeWithWebMCPMutation,
  type WebMCPMutationResult,
} from '../../sage/webmcp-mutations.js';
import { encodingWrapMulti, structuralNest } from '../../sage/edgefuzz-mutations.js';
import type { GroundTruthSample } from '../types.js';
import type { GeneratedSampleOutput, VariationGenerator } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';

const MAX_STRESS_LENGTH = 12_000;

function clip(text: string): string {
  return text.length <= MAX_STRESS_LENGTH
    ? text
    : `${text.slice(0, MAX_STRESS_LENGTH)}\n...[TRUNCATED_STRESS_VARIANT]`;
}

function makeSageRng(sampleId: string, variant: string, rng: SeededRNG): SageSeededRNG {
  return new SageSeededRNG(`${sampleId}:${variant}:${rng.nextInt(0, 1_000_000)}`);
}

function buildMaliciousStressVariants(
  sample: GroundTruthSample,
  content: string,
  rng: SeededRNG,
): GeneratedSampleOutput[] {
  const outputs: GeneratedSampleOutput[] = [];

  const framingRng = makeSageRng(sample.id, 'framed-confusable', rng);
  const framed = contextFraming(content, framingRng).mutated;
  const delimited = delimiterInjection(framed, framingRng).mutated;
  outputs.push({
    content: clip(characterSubstitution(delimited, framingRng).mutated),
    expected_verdict: 'malicious',
    expected_modules: [...sample.expected_modules],
    variation_type: 'stress:framed-confusable',
    difficulty: 'evasive',
  });

  const encodedRng = makeSageRng(sample.id, 'paraphrased-multi-encoded', rng);
  const paraphrased = instructionParaphrasing(content, encodedRng).mutated;
  const encoded = encodingWrapping(paraphrased, encodedRng).mutated;
  const layered = encodingWrapMulti(encoded, encodedRng);
  outputs.push({
    content: clip(`Stress payload: layered encoding chain (${layered.description})\n${layered.mutated}`),
    expected_verdict: 'malicious',
    expected_modules: [...sample.expected_modules],
    variation_type: 'stress:paraphrased-multi-encoded',
    difficulty: 'evasive',
  });

  const nestedRng = makeSageRng(sample.id, 'nested-hybrid', rng);
  const nested = structuralNest(`Embedded instructions follow:\n${content}`, nestedRng).mutated;
  outputs.push({
    content: clip(nested),
    expected_verdict: 'malicious',
    expected_modules: [...sample.expected_modules],
    variation_type: 'stress:nested-hybrid',
    difficulty: 'evasive',
  });

  if (/[<>{}]|https?:\/\/|<script|<style|<div|<html/i.test(content)) {
    const webRng = makeSageRng(sample.id, 'webmcp-hybrid', rng);
    const webMutation = composeWithWebMCPMutation(content, webRng).webResult;
    outputs.push({
      content: clip(webMutation.mutated),
      expected_verdict: 'malicious',
      expected_modules: [...sample.expected_modules],
      variation_type: 'stress:webmcp-hybrid',
      difficulty: 'evasive',
    });
  }

  return outputs;
}

function buildCleanStressVariants(
  sample: GroundTruthSample,
  content: string,
  rng: SeededRNG,
): GeneratedSampleOutput[] {
  const outputs: GeneratedSampleOutput[] = [];
  const safeContent = `Safe documentation example:\n${content}`;

  const benignRng = makeSageRng(sample.id, 'clean-framed-reference', rng);
  const benignFrame = delimiterInjection(contextFraming(safeContent, benignRng).mutated, benignRng).mutated;
  outputs.push({
    content: clip(benignFrame),
    expected_verdict: 'clean',
    expected_modules: [...sample.expected_modules],
    variation_type: 'stress:clean-framed-reference',
    difficulty: 'advanced',
  });

  const structuredRng = makeSageRng(sample.id, 'clean-structured-encoded', rng);
  const encoded = encodingWrapping(safeContent, structuredRng).mutated;
  const nested = structuralNest(encoded, structuredRng).mutated;
  outputs.push({
    content: clip(nested),
    expected_verdict: 'clean',
    expected_modules: [...sample.expected_modules],
    variation_type: 'stress:clean-structured-encoded',
    difficulty: 'advanced',
  });

  return outputs;
}

export const stressVariationGenerator: VariationGenerator = {
  id: 'stress-variations',
  version: '1.0.0',
  description: 'Deterministic SAGE/EdgeFuzz stress variants that harden future fixtures into reusable discovery cases',
  variationType: 'stress',
  capabilities: [
    'combination_evasion',
    'chained_evasion',
    'encoding_evasion',
    'multi_layer_encoding',
    'structural_evasion',
    'format_wrapping',
    'semantic_evasion',
    'social_engineering',
    'homoglyph_evasion',
    'zero_width_evasion',
  ],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    if (sample.content_type !== 'text') return [];
    if (content.trim().length < 5) return [];

    if (sample.expected_verdict === 'malicious') {
      return buildMaliciousStressVariants(sample, content, rng);
    }

    return buildCleanStressVariants(sample, content, rng);
  },
};

export type StressVariationPreview = {
  readonly variation_type: string;
  readonly content: string;
};

export function previewStressVariations(
  sample: GroundTruthSample,
  content: string,
  seed = 42,
): readonly StressVariationPreview[] {
  return stressVariationGenerator
    .generate(sample, content, new SeededRNG(seed))
    .map(output => ({
      variation_type: output.variation_type,
      content: output.content,
    }));
}
