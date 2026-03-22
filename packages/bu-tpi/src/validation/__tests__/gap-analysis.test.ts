/**
 * KATANA Coverage Gap Analysis Tests (K1.4)
 */

// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { analyzeGaps, formatGapSummary } from '../corpus/gap-analysis.js';
import { labelFixtures } from '../corpus/fixture-labeler.js';
import { SCHEMA_VERSION, type GroundTruthSample, type ModuleTaxonomyEntry } from '../types.js';

const BU_TPI_ROOT = resolve(__dirname, '../../..');

function makeSample(
  id: string,
  verdict: 'clean' | 'malicious',
  modules: string[] = [],
  categories: string[] = [],
): GroundTruthSample {
  return {
    schema_version: SCHEMA_VERSION,
    id,
    source_file: `fixtures/test/${id}.txt`,
    content_hash: 'a'.repeat(64),
    content_type: 'text',
    expected_verdict: verdict,
    expected_modules: modules,
    expected_severity: verdict === 'malicious' ? 'CRITICAL' : null,
    expected_categories: categories,
    difficulty: 'trivial',
    source_type: 'synthetic',
    reviewer_1: { id: 'test', verdict, timestamp: '2026-01-01T00:00:00.000Z' },
    reviewer_2: { id: 'test', verdict, timestamp: '2026-01-01T00:00:00.000Z' },
    independent_agreement: true,
    holdout: false,
  };
}

function makeTaxEntry(moduleId: string, tier: number): ModuleTaxonomyEntry {
  return {
    module_id: moduleId,
    display_name: moduleId,
    description: 'Test module',
    tier,
    input_type: 'text',
    deterministic: true,
    detection_categories: ['TEST_CAT'],
    severity_levels: ['CRITICAL'],
    capabilities: ['test'],
    source_file: 'test.ts',
    pattern_count: 1,
  };
}

describe('analyzeGaps', () => {
  it('should identify gaps for under-covered modules', () => {
    const samples = [
      ...Array.from({ length: 10 }, (_, i) => makeSample(`pos-${i}`, 'malicious', ['mod-a'])),
      ...Array.from({ length: 10 }, (_, i) => makeSample(`neg-${i}`, 'clean')),
    ];
    const taxonomy = [makeTaxEntry('mod-a', 1)];

    const report = analyzeGaps(samples, taxonomy);
    expect(report.total_samples).toBe(20);
    expect(report.total_clean).toBe(10);
    expect(report.total_malicious).toBe(10);

    const modA = report.per_module[0];
    expect(modA.positive_count).toBe(10);
    expect(modA.positive_required).toBe(150);
    expect(modA.positive_gap).toBe(140);
    expect(modA.negative_count).toBe(10);
    expect(modA.negative_required).toBe(150);
    expect(modA.negative_gap).toBe(140);
    expect(modA.coverage_met).toBe(false);
  });

  it('should mark module as covered when requirements met', () => {
    const samples = [
      ...Array.from({ length: 200 }, (_, i) => makeSample(`pos-${i}`, 'malicious', ['mod-a'])),
      ...Array.from({ length: 200 }, (_, i) => makeSample(`neg-${i}`, 'clean')),
    ];
    const taxonomy = [makeTaxEntry('mod-a', 1)];

    const report = analyzeGaps(samples, taxonomy);
    const modA = report.per_module[0];
    expect(modA.positive_gap).toBe(0);
    expect(modA.negative_gap).toBe(0);
    expect(modA.coverage_met).toBe(true);
    expect(report.modules_covered).toBe(1);
  });

  it('should handle Tier 2 with lower requirements', () => {
    const samples = [
      ...Array.from({ length: 100 }, (_, i) => makeSample(`pos-${i}`, 'malicious', ['mod-t2'])),
      ...Array.from({ length: 100 }, (_, i) => makeSample(`neg-${i}`, 'clean')),
    ];
    const taxonomy = [makeTaxEntry('mod-t2', 2)];

    const report = analyzeGaps(samples, taxonomy);
    const mod = report.per_module[0];
    expect(mod.positive_required).toBe(100);
    expect(mod.negative_required).toBe(100);
    expect(mod.coverage_met).toBe(true);
  });

  it('should handle Tier 3 with lowest requirements', () => {
    const samples = [
      ...Array.from({ length: 50 }, (_, i) => makeSample(`pos-${i}`, 'malicious', ['mod-t3'])),
      ...Array.from({ length: 50 }, (_, i) => makeSample(`neg-${i}`, 'clean')),
    ];
    const taxonomy = [makeTaxEntry('mod-t3', 3)];

    const report = analyzeGaps(samples, taxonomy);
    const mod = report.per_module[0];
    expect(mod.positive_required).toBe(50);
    expect(mod.negative_required).toBe(50);
    expect(mod.coverage_met).toBe(true);
  });

  it('should count modules_missing for modules with 0 positive samples', () => {
    // Module has no positive samples but clean samples exist in corpus
    const samples = [
      makeSample('clean-1', 'clean'),
      makeSample('clean-2', 'clean'),
    ];
    const taxonomy = [makeTaxEntry('mod-missing', 1)];

    const report = analyzeGaps(samples, taxonomy);
    expect(report.modules_missing).toBe(1);
    expect(report.modules_covered).toBe(0);
    expect(report.modules_with_gaps).toBe(0);
  });

  it('should count modules_missing even with empty corpus', () => {
    const samples: GroundTruthSample[] = [];
    const taxonomy = [makeTaxEntry('mod-missing', 1)];

    const report = analyzeGaps(samples, taxonomy);
    expect(report.modules_missing).toBe(1);
    expect(report.modules_covered).toBe(0);
  });

  it('should handle multiple modules sharing samples', () => {
    const samples = [
      makeSample('s1', 'malicious', ['mod-a', 'mod-b']),
      makeSample('s2', 'clean'),
    ];
    const taxonomy = [makeTaxEntry('mod-a', 1), makeTaxEntry('mod-b', 1)];

    const report = analyzeGaps(samples, taxonomy);
    expect(report.per_module[0].positive_count).toBe(1);
    expect(report.per_module[1].positive_count).toBe(1);
  });
});

describe('analyzeGaps with real fixtures', () => {
  it('should produce a valid report for all 2380 fixtures', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const taxonomyPath = resolve(BU_TPI_ROOT, 'validation/taxonomy/module-taxonomy.json');
    const taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf-8'));

    const report = analyzeGaps(samples, taxonomy.modules);

    expect(report.total_samples).toBe(2380);
    expect(report.modules_total).toBe(29);
    expect(report.per_module).toHaveLength(29);

    // Verify counts add up
    expect(report.modules_covered + report.modules_with_gaps + report.modules_missing).toBe(report.modules_total);
  });

  it('should identify core-patterns as having the most positive samples', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const taxonomyPath = resolve(BU_TPI_ROOT, 'validation/taxonomy/module-taxonomy.json');
    const taxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf-8'));

    const report = analyzeGaps(samples, taxonomy.modules);
    const corePatternsEntry = report.per_module.find(m => m.module_id === 'core-patterns');
    expect(corePatternsEntry).toBeDefined();
    expect(corePatternsEntry!.positive_count).toBeGreaterThan(100);
  });
});

describe('formatGapSummary', () => {
  it('should produce a readable markdown report', () => {
    const samples = [
      ...Array.from({ length: 10 }, (_, i) => makeSample(`pos-${i}`, 'malicious', ['mod-a'])),
      ...Array.from({ length: 5 }, (_, i) => makeSample(`neg-${i}`, 'clean')),
    ];
    const taxonomy = [makeTaxEntry('mod-a', 1)];

    const report = analyzeGaps(samples, taxonomy);
    const summary = formatGapSummary(report);

    expect(summary).toContain('# KATANA Corpus Gap Analysis');
    expect(summary).toContain('Total samples: 15');
    expect(summary).toContain('mod-a');
    expect(summary).toContain('GAP');
  });
});
