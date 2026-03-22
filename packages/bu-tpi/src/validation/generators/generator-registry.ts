/**
 * KATANA Generator Registry & Seeded RNG (K2.1)
 *
 * Deterministic variation generation infrastructure.
 * Uses 0x100000000 divisor for [0, 1) range (lesson learned from fuzzing).
 *
 * ISO 17025 Clause 7.2.2: Method validation through robust variation testing.
 */

import { createHash } from 'node:crypto';
import { GENERATOR_CONFIG } from '../config.js';
import { SCHEMA_VERSION, type GeneratedSample, type GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Seeded RNG
// ---------------------------------------------------------------------------

/**
 * Deterministic pseudo-random number generator using xorshift128+.
 * Produces identical sequences across Node.js versions for a given seed.
 */
export class SeededRNG {
  private state0: number;
  private state1: number;

  constructor(seed: number) {
    if (GENERATOR_CONFIG.RNG_DIVISOR !== 0x100000000) {
      throw new Error(
        `RNG_DIVISOR must be 0x100000000 (4294967296), got ${GENERATOR_CONFIG.RNG_DIVISOR}`,
      );
    }
    // Initialize state from seed using splitmix64-like initialization
    this.state0 = this.splitmix(seed);
    this.state1 = this.splitmix(seed + 1);
  }

  /**
   * Returns a float in [0, 1) range.
   * Uses 0x100000000 divisor — NOT 0xffffffff (which can produce 1.0).
   */
  next(): number {
    let s1 = this.state0;
    const s0 = this.state1;
    this.state0 = s0;
    s1 ^= (s1 << 23) & 0xffffffff;
    s1 ^= s1 >>> 17;
    s1 ^= s0;
    s1 ^= s0 >>> 26;
    this.state1 = s1;
    return ((this.state0 + this.state1) >>> 0) / GENERATOR_CONFIG.RNG_DIVISOR;
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns true with the given probability [0, 1]. */
  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  /** Selects a random element from an array. */
  pick<T>(array: readonly T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return array[this.nextInt(0, array.length - 1)];
  }

  /** Fisher-Yates shuffle (returns new array). */
  shuffle<T>(array: readonly T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private splitmix(x: number): number {
    x = ((x >>> 0) + 0x9e3779b9) & 0xffffffff;
    x = (x ^ (x >>> 16)) & 0xffffffff;
    x = ((x * 0x85ebca6b) >>> 0) & 0xffffffff;
    x = (x ^ (x >>> 13)) & 0xffffffff;
    x = ((x * 0xc2b2ae35) >>> 0) & 0xffffffff;
    x = (x ^ (x >>> 16)) & 0xffffffff;
    return x >>> 0;
  }
}

// ---------------------------------------------------------------------------
// Generator Interface
// ---------------------------------------------------------------------------

/**
 * A variation generator transforms base ground-truth samples into
 * new samples with known expected verdicts.
 */
export interface VariationGenerator {
  /** Unique generator identifier */
  readonly id: string;

  /** Semantic version */
  readonly version: string;

  /** Human-readable description */
  readonly description: string;

  /** Variation type identifier (e.g., 'encoding', 'unicode', 'structural') */
  readonly variationType: string;

  /**
   * List of evasion capabilities this generator tests.
   * Used for module-aware verdict inheritance: if a module doesn't claim
   * to handle a capability, generated samples won't be expected to detect it.
   */
  readonly capabilities: readonly string[];

  /**
   * Generate variations from a base sample.
   *
   * @param sample - The base ground-truth sample
   * @param content - The actual content of the sample
   * @param rng - Seeded RNG for deterministic generation
   * @returns Array of generated variations with expected verdicts
   */
  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[];
}

/** Output from a generator before ID/hash assignment */
export interface GeneratedSampleOutput {
  content: string;
  expected_verdict: 'clean' | 'malicious';
  expected_modules: string[];
  variation_type: string;
  difficulty: 'trivial' | 'moderate' | 'advanced' | 'evasive';
}

// ---------------------------------------------------------------------------
// Generator Registry
// ---------------------------------------------------------------------------

/**
 * Registry for all variation generators.
 * Generators are registered once and applied during corpus generation.
 */
export class GeneratorRegistry {
  private readonly generators = new Map<string, VariationGenerator>();

  /** Register a generator. Throws if ID already registered. */
  register(generator: VariationGenerator): void {
    if (this.generators.has(generator.id)) {
      throw new Error(`Generator '${generator.id}' is already registered`);
    }
    this.generators.set(generator.id, generator);
  }

  /** Unregister a generator by ID. Returns true if it existed. */
  unregister(id: string): boolean {
    return this.generators.delete(id);
  }

  /** Get a generator by ID. */
  get(id: string): VariationGenerator | undefined {
    return this.generators.get(id);
  }

  /** Check if a generator is registered. */
  has(id: string): boolean {
    return this.generators.has(id);
  }

  /** List all registered generators. */
  list(): readonly VariationGenerator[] {
    return [...this.generators.values()];
  }

  /** Get the count of registered generators. */
  get size(): number {
    return this.generators.size;
  }

  /**
   * Generate all variations for a base sample using all registered generators.
   * Module-aware: only expects detection for capabilities the module claims.
   *
   * @param sample - Base ground-truth sample
   * @param content - Sample content
   * @param seed - RNG seed (unique per sample for determinism)
   * @param moduleCapabilities - Map of module_id -> claimed capabilities
   */
  generateAll(
    sample: GroundTruthSample,
    content: string,
    seed: number,
    moduleCapabilities?: ReadonlyMap<string, readonly string[]>,
  ): GeneratedSample[] {
    const results: GeneratedSample[] = [];

    for (const generator of this.generators.values()) {
      const rng = new SeededRNG(seed ^ hashString(generator.id));
      const outputs = generator.generate(sample, content, rng);

      for (let i = 0; i < outputs.length; i++) {
        const output = outputs[i];

        // Module-aware verdict inheritance: filter expected_modules
        // to only those that claim to handle this generator's capabilities
        const filteredModules = moduleCapabilities
          ? output.expected_modules.filter(moduleId => {
              const caps = moduleCapabilities.get(moduleId);
              if (!caps) return true; // no capability data = assume full coverage
              return generator.capabilities.some(c => caps.includes(c));
            })
          : output.expected_modules;

        const id = `${sample.id}::${generator.id}::${i}`;
        const contentHash = createHash('sha256').update(output.content).digest('hex');

        results.push({
          schema_version: SCHEMA_VERSION,
          id,
          base_sample_id: sample.id,
          generator_id: generator.id,
          generator_version: generator.version,
          seed,
          content: output.content,
          content_hash: contentHash,
          content_type: sample.content_type,
          expected_verdict: output.expected_verdict,
          expected_modules: filteredModules,
          variation_type: output.variation_type,
          difficulty: output.difficulty,
        });
      }
    }

    return results;
  }
}

/** Singleton registry for the KATANA framework. */
export const generatorRegistry = new GeneratorRegistry();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Hash a string to a 32-bit integer for seed mixing using SHA-256. */
function hashString(s: string): number {
  const digest = createHash('sha256').update(s).digest();
  return digest.readUInt32BE(0);
}
