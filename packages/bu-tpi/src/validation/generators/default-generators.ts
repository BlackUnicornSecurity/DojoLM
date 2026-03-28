/**
 * Default KATANA variation generator registration.
 *
 * The operational corpus-generation pipeline uses the singleton registry by
 * default, so the built-in generators must be registered deterministically
 * before generation begins.
 */

import { binaryVariationGenerator } from './binary-variations.js';
import { boundaryVariationGenerator } from './boundary-variations.js';
import { combinationVariationGenerator } from './combination-variations.js';
import { encodingVariationGenerator } from './encoding-variations.js';
import {
  GeneratorRegistry,
  generatorRegistry,
  type VariationGenerator,
} from './generator-registry.js';
import { indirectInjectionVariationGenerator } from './indirect-injection-variations.js';
import { multiTurnVariationGenerator } from './multi-turn-variations.js';
import { multilingualVariationGenerator } from './multilingual-variations.js';
import { paraphraseVariationGenerator } from './paraphrase-variations.js';
import { semanticEvasionVariationGenerator } from './semantic-evasion-variations.js';
import { stressVariationGenerator } from './stress-variations.js';
import { structuralVariationGenerator } from './structural-variations.js';
import { unicodeVariationGenerator } from './unicode-variations.js';

export const DEFAULT_VARIATION_GENERATORS: readonly VariationGenerator[] = [
  encodingVariationGenerator,
  unicodeVariationGenerator,
  structuralVariationGenerator,
  paraphraseVariationGenerator,
  multiTurnVariationGenerator,
  indirectInjectionVariationGenerator,
  semanticEvasionVariationGenerator,
  multilingualVariationGenerator,
  combinationVariationGenerator,
  binaryVariationGenerator,
  stressVariationGenerator,
  boundaryVariationGenerator,
] as const;

export function registerDefaultVariationGenerators(
  registry: GeneratorRegistry = generatorRegistry,
): GeneratorRegistry {
  for (const generator of DEFAULT_VARIATION_GENERATORS) {
    if (!registry.has(generator.id)) {
      registry.register(generator);
    }
  }

  return registry;
}
