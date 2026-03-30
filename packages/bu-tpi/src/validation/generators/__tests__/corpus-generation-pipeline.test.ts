/**
 * Tests for KATANA Corpus Generation Pipeline (K2.12)
 */

import { describe, it, expect } from 'vitest';
import {
  generateCorpus,
  generateCorpusWithContent,
  validateGeneratedSample,
  formatGenerationSummary,
  type GenerationProgress,
} from '../corpus-generation-pipeline.js';
import {
  GeneratorRegistry,
  SeededRNG,
  type VariationGenerator,
  type GeneratedSampleOutput,
} from '../generator-registry.js';
import {
  SCHEMA_VERSION,
  type GroundTruthSample,
  type GeneratedSample,
  type ModuleTaxonomyEntry,
} from '../../types.js';
import { createHash } from 'node:crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSample(id: string, overrides: Partial<GroundTruthSample> = {}): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `fixtures/text/${id}.txt`,
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    expected_severity: 'WARNING',
    expected_categories: ['prompt-injection'],
    difficulty: 'moderate',
    source_type: 'synthetic',
    reviewer_1: { id: 'r1', verdict: 'malicious', timestamp: '2026-01-01T00:00:00Z' },
    reviewer_2: { id: 'r2', verdict: 'malicious', timestamp: '2026-01-01T00:00:00Z' },
    independent_agreement: true,
    holdout: false,
    ...overrides,
  };
}

function makeSimpleGenerator(id: string): VariationGenerator {
  return {
    id,
    version: '1.0.0',
    description: `Test generator ${id}`,
    variationType: 'test',
    capabilities: ['test_cap'],
    generate: (sample, content, rng) => [{
      content: `${id}:${content}:${rng.next().toFixed(4)}`,
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: `test:${id}`,
      difficulty: 'moderate',
    }],
  };
}

function makeTaxonomy(): ModuleTaxonomyEntry[] {
  return [{
    module_id: 'core-patterns',
    display_name: 'Core Patterns',
    description: 'Core pattern matching module',
    tier: 1,
    input_type: 'text',
    deterministic: true,
    detection_categories: ['prompt-injection'],
    severity_levels: ['WARNING'],
    capabilities: ['test_cap'],
    source_file: 'modules/core-patterns.ts',
    pattern_count: 100,
  }];
}

function makeGeneratedSample(overrides: Partial<GeneratedSample> = {}): GeneratedSample {
  const content = overrides.content ?? 'test variation content';
  return {
    schema_version: SCHEMA_VERSION,
    id: 'sample-001::gen-a::0',
    base_sample_id: 'sample-001',
    generator_id: 'gen-a',
    generator_version: '1.0.0',
    seed: 42,
    content,
    content_hash: createHash('sha256').update(content).digest('hex'),
    content_type: 'text',
    expected_verdict: 'malicious',
    expected_modules: ['core-patterns'],
    variation_type: 'test:gen-a',
    difficulty: 'moderate',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateGeneratedSample
// ---------------------------------------------------------------------------

describe('validateGeneratedSample', () => {
  it('returns true for a valid generated sample', () => {
    const sample = makeGeneratedSample();
    expect(validateGeneratedSample(sample)).toBe(true);
  });

  it('returns false for empty content', () => {
    const sample = makeGeneratedSample({ content: '' });
    expect(validateGeneratedSample(sample)).toBe(false);
  });

  it('returns false for mismatched content hash', () => {
    const sample = makeGeneratedSample({ content_hash: 'b'.repeat(64) });
    expect(validateGeneratedSample(sample)).toBe(false);
  });

  it('returns false for ID without :: separator', () => {
    const sample = makeGeneratedSample({ id: 'no-separator' });
    expect(validateGeneratedSample(sample)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// generateCorpus
// ---------------------------------------------------------------------------

describe('generateCorpus', () => {
  it('generates variations from base samples using a custom registry', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));

    const samples = [makeSample('s1'), makeSample('s2')];
    const taxonomy = makeTaxonomy();

    const result = generateCorpus(samples, taxonomy, { registry, seed: 42 });

    expect(result.samples.length).toBe(2);
    expect(result.stats.base_samples_processed).toBe(2);
    expect(result.stats.total_generated).toBe(2);
    expect(result.stats.generators_used).toContain('gen-a');
  });

  it('respects maxSamples limit', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));
    registry.register(makeSimpleGenerator('gen-b'));

    const samples = [makeSample('s1'), makeSample('s2'), makeSample('s3')];
    const taxonomy = makeTaxonomy();

    const result = generateCorpus(samples, taxonomy, { registry, seed: 42, maxSamples: 3 });

    expect(result.samples.length).toBeLessThanOrEqual(3);
  });

  it('is deterministic with same seed', () => {
    const makeRegistry = () => {
      const r = new GeneratorRegistry();
      r.register(makeSimpleGenerator('gen-a'));
      return r;
    };

    const samples = [makeSample('s1')];
    const taxonomy = makeTaxonomy();

    const r1 = generateCorpus(samples, taxonomy, { registry: makeRegistry(), seed: 42 });
    const r2 = generateCorpus(samples, taxonomy, { registry: makeRegistry(), seed: 42 });

    expect(r1.samples.map(s => s.content)).toEqual(r2.samples.map(s => s.content));
  });

  it('calls onProgress callback', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));

    const samples = [makeSample('s1')];
    const taxonomy = makeTaxonomy();
    const progressCalls: GenerationProgress[] = [];

    generateCorpus(samples, taxonomy, {
      registry,
      seed: 42,
      onProgress: (p) => progressCalls.push({ ...p }),
    });

    expect(progressCalls.length).toBeGreaterThan(0);
    expect(progressCalls[0].baseSamplesTotal).toBe(1);
  });

  it('builds manifest with correct structure', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));

    const samples = [makeSample('s1')];
    const taxonomy = makeTaxonomy();

    const result = generateCorpus(samples, taxonomy, { registry, seed: 42 });

    expect(result.manifest.schema_version).toBe(SCHEMA_VERSION);
    expect(result.manifest.manifest_type).toBe('generated');
    expect(result.manifest.entry_count).toBe(result.samples.length);
    expect(result.manifest.entries).toHaveLength(result.samples.length);
    for (const entry of result.manifest.entries) {
      expect(entry.id).toBeTruthy();
      expect(entry.file_path).toContain('generated/');
      expect(entry.content_hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('filters samples by module when specified', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));

    const samples = [
      makeSample('s1', { expected_modules: ['core-patterns'] }),
      makeSample('s2', { expected_modules: ['other-module'] }),
    ];
    const taxonomy = makeTaxonomy();

    const result = generateCorpus(samples, taxonomy, {
      registry,
      seed: 42,
      modules: ['core-patterns'],
    });

    // s1 matches module filter, s2 does not (but s2 is malicious, not clean, so excluded)
    expect(result.stats.base_samples_skipped).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// generateCorpusWithContent
// ---------------------------------------------------------------------------

describe('generateCorpusWithContent', () => {
  it('uses content loader instead of source_file', () => {
    const registry = new GeneratorRegistry();
    const gen: VariationGenerator = {
      id: 'content-gen',
      version: '1.0.0',
      description: 'Content test',
      variationType: 'test',
      capabilities: ['test'],
      generate: (_sample, content, rng) => [{
        content: `loaded:${content}`,
        expected_verdict: 'malicious',
        expected_modules: ['core-patterns'],
        variation_type: 'test:content',
        difficulty: 'moderate',
      }],
    };
    registry.register(gen);

    const samples = [makeSample('s1')];
    const taxonomy = makeTaxonomy();
    const loader = (s: GroundTruthSample) => `content-for-${s.id}`;

    const result = generateCorpusWithContent(samples, loader, taxonomy, { registry, seed: 42 });

    expect(result.samples.length).toBe(1);
    expect(result.samples[0].content).toBe('loaded:content-for-s1');
  });
});

// ---------------------------------------------------------------------------
// formatGenerationSummary
// ---------------------------------------------------------------------------

describe('formatGenerationSummary', () => {
  it('produces a markdown summary string', () => {
    const registry = new GeneratorRegistry();
    registry.register(makeSimpleGenerator('gen-a'));

    const samples = [makeSample('s1')];
    const taxonomy = makeTaxonomy();

    const result = generateCorpus(samples, taxonomy, { registry, seed: 42 });
    const summary = formatGenerationSummary(result.stats);

    expect(summary).toContain('# Corpus Generation Summary');
    expect(summary).toContain('Seed');
    expect(summary).toContain('gen-a');
    expect(summary).toContain('By Generator');
    expect(summary).toContain('By Variation Type');
    expect(summary).toContain('By Difficulty');
  });
});
