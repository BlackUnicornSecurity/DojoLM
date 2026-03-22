/**
 * KATANA Corpus Generation Pipeline Tests (K2.12)
 *
 * Tests the end-to-end generation pipeline: batched processing,
 * determinism, module filtering, sample validation, stats, and manifest.
 *
 * ISO 17025 Clause 7.2.2 (robustness)
 */

import { describe, it, expect } from 'vitest';
import {
  generateCorpus,
  generateCorpusWithContent,
  validateGeneratedSample,
  formatGenerationSummary,
  type GenerationProgress,
} from '../generators/corpus-generation-pipeline.js';
import {
  GeneratorRegistry,
  SeededRNG,
  type VariationGenerator,
  type GeneratedSampleOutput,
} from '../generators/generator-registry.js';
import { SCHEMA_VERSION, type GroundTruthSample, type ModuleTaxonomyEntry } from '../types.js';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGroundTruth(id: string, overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `fixtures/${id}.txt`,
    content_hash: createHash('sha256').update(id).digest('hex'),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    expected_severity: 'CRITICAL',
    expected_categories: ['PROMPT_INJECTION'],
    difficulty: 'trivial',
    source_type: 'synthetic',
    reviewer_1: { id: 'auto', verdict: 'malicious', timestamp: '2026-01-01T00:00:00.000Z' },
    reviewer_2: { id: 'auto', verdict: 'malicious', timestamp: '2026-01-01T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

function makeTaxonomy(moduleId: string, capabilities: string[] = []): ModuleTaxonomyEntry {
  return {
    module_id: moduleId,
    display_name: moduleId,
    description: `Test module ${moduleId}`,
    tier: 1,
    input_type: 'text',
    deterministic: true,
    detection_categories: ['TEST'],
    severity_levels: ['CRITICAL'],
    capabilities,
    source_file: 'test.ts',
    pattern_count: 10,
  };
}

/** Simple test generator that produces fixed-count variations */
function makeTestGenerator(
  id: string,
  count: number,
  capabilities: string[] = ['test_cap'],
): VariationGenerator {
  return {
    id,
    version: '1.0.0',
    description: `Test generator ${id}`,
    variationType: id,
    capabilities,
    generate(sample: GroundTruthSample, content: string, rng: SeededRNG): GeneratedSampleOutput[] {
      const outputs: GeneratedSampleOutput[] = [];
      for (let i = 0; i < count; i++) {
        outputs.push({
          content: `${content}::${id}::${i}::${rng.next().toFixed(6)}`,
          expected_verdict: sample.expected_verdict,
          expected_modules: sample.expected_modules,
          variation_type: id,
          difficulty: 'moderate',
        });
      }
      return outputs;
    },
  };
}

function makeRegistry(generators: VariationGenerator[]): GeneratorRegistry {
  const registry = new GeneratorRegistry();
  for (const gen of generators) {
    registry.register(gen);
  }
  return registry;
}

// ---------------------------------------------------------------------------
// Validate Generated Sample
// ---------------------------------------------------------------------------

describe('validateGeneratedSample', () => {
  it('accepts valid sample', () => {
    const content = 'valid test content';
    const sample = {
      schema_version: SCHEMA_VERSION as '1.0.0',
      id: 'sample-1::gen-a::0',
      base_sample_id: 'sample-1',
      generator_id: 'gen-a',
      generator_version: '1.0.0',
      seed: 42,
      content,
      content_hash: createHash('sha256').update(content).digest('hex'),
      content_type: 'text' as const,
      expected_verdict: 'malicious' as const,
      expected_modules: ['core-patterns'],
      variation_type: 'encoding',
      difficulty: 'moderate' as const,
    };
    expect(validateGeneratedSample(sample)).toBe(true);
  });

  it('rejects empty content', () => {
    const sample = {
      schema_version: SCHEMA_VERSION as '1.0.0',
      id: 'sample-1::gen-a::0',
      base_sample_id: 'sample-1',
      generator_id: 'gen-a',
      generator_version: '1.0.0',
      seed: 42,
      content: '',
      content_hash: createHash('sha256').update('').digest('hex'),
      content_type: 'text' as const,
      expected_verdict: 'malicious' as const,
      expected_modules: ['core-patterns'],
      variation_type: 'encoding',
      difficulty: 'moderate' as const,
    };
    expect(validateGeneratedSample(sample)).toBe(false);
  });

  it('rejects wrong hash', () => {
    const sample = {
      schema_version: SCHEMA_VERSION as '1.0.0',
      id: 'sample-1::gen-a::0',
      base_sample_id: 'sample-1',
      generator_id: 'gen-a',
      generator_version: '1.0.0',
      seed: 42,
      content: 'test content',
      content_hash: 'wrong'.padEnd(64, '0'),
      content_type: 'text' as const,
      expected_verdict: 'malicious' as const,
      expected_modules: ['core-patterns'],
      variation_type: 'encoding',
      difficulty: 'moderate' as const,
    };
    expect(validateGeneratedSample(sample)).toBe(false);
  });

  it('rejects missing :: in ID', () => {
    const content = 'test';
    const sample = {
      schema_version: SCHEMA_VERSION as '1.0.0',
      id: 'no-separator',
      base_sample_id: 'sample-1',
      generator_id: 'gen-a',
      generator_version: '1.0.0',
      seed: 42,
      content,
      content_hash: createHash('sha256').update(content).digest('hex'),
      content_type: 'text' as const,
      expected_verdict: 'malicious' as const,
      expected_modules: ['core-patterns'],
      variation_type: 'encoding',
      difficulty: 'moderate' as const,
    };
    expect(validateGeneratedSample(sample)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Generate Corpus (basic)
// ---------------------------------------------------------------------------

describe('generateCorpus', () => {
  it('generates variations from base samples', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 3)]);
    const samples = [makeGroundTruth('s1'), makeGroundTruth('s2')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    // 2 base samples * 3 variations = 6
    expect(result.samples.length).toBe(6);
    expect(result.stats.total_generated).toBe(6);
    expect(result.stats.base_samples_processed).toBe(2);
  });

  it('is deterministic with same seed', () => {
    const registry1 = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const registry2 = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result1 = generateCorpus(samples, taxonomy, { seed: 42, registry: registry1 });
    const result2 = generateCorpus(samples, taxonomy, { seed: 42, registry: registry2 });

    expect(result1.samples.map(s => s.content)).toEqual(result2.samples.map(s => s.content));
  });

  it('produces different results with different seeds', () => {
    const registry1 = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const registry2 = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result1 = generateCorpus(samples, taxonomy, { seed: 42, registry: registry1 });
    const result2 = generateCorpus(samples, taxonomy, { seed: 99, registry: registry2 });

    // Different seeds → different RNG → different content
    expect(result1.samples[0].content).not.toBe(result2.samples[0].content);
  });

  it('respects maxSamples limit', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 10)]);
    const samples = [makeGroundTruth('s1'), makeGroundTruth('s2')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, maxSamples: 5, registry });

    expect(result.samples.length).toBe(5);
    expect(result.stats.total_generated).toBe(5);
  });

  it('filters by module', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [
      makeGroundTruth('s1', { expected_modules: ['core-patterns'] }),
      makeGroundTruth('s2', { expected_modules: ['pii-detector'] }),
      makeGroundTruth('s3', { expected_verdict: 'clean', expected_modules: [] }),
    ];
    const taxonomy = [
      makeTaxonomy('core-patterns', ['test_cap']),
      makeTaxonomy('pii-detector', ['test_cap']),
    ];

    const result = generateCorpus(samples, taxonomy, {
      seed: 42,
      modules: ['core-patterns'],
      registry,
    });

    // s1 (core-patterns) + s3 (clean, always included) = 2 base samples * 2 = 4
    expect(result.samples.length).toBe(4);
    expect(result.stats.base_samples_skipped).toBe(1);
  });

  it('reports progress', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1'), makeGroundTruth('s2'), makeGroundTruth('s3')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];
    const progressUpdates: GenerationProgress[] = [];

    generateCorpus(samples, taxonomy, {
      seed: 42,
      batchSize: 2,
      registry,
      onProgress: (p) => progressUpdates.push({ ...p }),
    });

    // 3 samples / batch 2 = 2 batches
    expect(progressUpdates.length).toBe(2);
    expect(progressUpdates[0].currentBatch).toBe(1);
    expect(progressUpdates[0].totalBatches).toBe(2);
    expect(progressUpdates[1].baseSamplesProcessed).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Stats Tracking
// ---------------------------------------------------------------------------

describe('GenerationStats', () => {
  it('tracks per-generator counts', () => {
    const registry = makeRegistry([
      makeTestGenerator('gen-a', 2),
      makeTestGenerator('gen-b', 3),
    ]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.stats.by_generator['gen-a']).toBe(2);
    expect(result.stats.by_generator['gen-b']).toBe(3);
  });

  it('tracks per-module counts', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1', { expected_modules: ['core-patterns', 'pii-detector'] })];
    const taxonomy = [
      makeTaxonomy('core-patterns', ['test_cap']),
      makeTaxonomy('pii-detector', ['test_cap']),
    ];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.stats.by_module['core-patterns']).toBe(2);
    expect(result.stats.by_module['pii-detector']).toBe(2);
  });

  it('tracks malicious vs clean counts', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [
      makeGroundTruth('s1', { expected_verdict: 'malicious' }),
      makeGroundTruth('s2', { expected_verdict: 'clean' }),
    ];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.stats.malicious_generated).toBe(2);
    expect(result.stats.clean_generated).toBe(2);
  });

  it('tracks generators used', () => {
    const registry = makeRegistry([
      makeTestGenerator('gen-a', 1),
      makeTestGenerator('gen-b', 1),
    ]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.stats.generators_used).toContain('gen-a');
    expect(result.stats.generators_used).toContain('gen-b');
  });

  it('records elapsed time', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 1)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.stats.elapsed_ms).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

describe('Generation manifest', () => {
  it('builds manifest with correct structure', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.manifest.schema_version).toBe(SCHEMA_VERSION);
    expect(result.manifest.manifest_type).toBe('generated');
    expect(result.manifest.entry_count).toBe(2);
    expect(result.manifest.entries.length).toBe(2);
  });

  it('manifest entries have id, file_path, content_hash', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 1)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    const entry = result.manifest.entries[0];
    expect(entry.id).toBeTruthy();
    expect(entry.file_path).toMatch(/^generated\//);
    expect(entry.content_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// generateCorpusWithContent
// ---------------------------------------------------------------------------

describe('generateCorpusWithContent', () => {
  it('uses content loader function', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 1)]);
    const samples = [makeGroundTruth('s1'), makeGroundTruth('s2')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const loadedContent: string[] = [];
    const result = generateCorpusWithContent(
      samples,
      (sample) => {
        const content = `content-for-${sample.id}`;
        loadedContent.push(content);
        return content;
      },
      taxonomy,
      { seed: 42, registry },
    );

    expect(result.samples.length).toBe(2);
    expect(loadedContent).toEqual(['content-for-s1', 'content-for-s2']);
    expect(result.samples[0].content).toContain('content-for-s1');
  });
});

// ---------------------------------------------------------------------------
// Format Summary
// ---------------------------------------------------------------------------

describe('formatGenerationSummary', () => {
  it('produces readable markdown', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });
    const summary = formatGenerationSummary(result.stats);

    expect(summary).toContain('# Corpus Generation Summary');
    expect(summary).toContain('Seed:** 42');
    expect(summary).toContain('gen-a');
    expect(summary).toContain('By Generator');
    expect(summary).toContain('By Difficulty');
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles empty base samples', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const result = generateCorpus([], [], { seed: 42, registry });

    expect(result.samples.length).toBe(0);
    expect(result.stats.total_generated).toBe(0);
  });

  it('handles no generators registered', () => {
    const registry = makeRegistry([]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns')];

    const result = generateCorpus(samples, taxonomy, { seed: 42, registry });

    expect(result.samples.length).toBe(0);
    expect(result.stats.total_generated).toBe(0);
  });

  it('handles batch size larger than sample count', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, {
      seed: 42,
      batchSize: 100,
      registry,
    });

    expect(result.samples.length).toBe(2);
  });

  it('handles batch size of 1', () => {
    const registry = makeRegistry([makeTestGenerator('gen-a', 2)]);
    const samples = [makeGroundTruth('s1'), makeGroundTruth('s2')];
    const taxonomy = [makeTaxonomy('core-patterns', ['test_cap'])];

    const result = generateCorpus(samples, taxonomy, {
      seed: 42,
      batchSize: 1,
      registry,
    });

    expect(result.samples.length).toBe(4);
  });
});
