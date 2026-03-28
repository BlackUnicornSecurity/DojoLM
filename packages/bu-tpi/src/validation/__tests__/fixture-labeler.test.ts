/**
 * KATANA Fixture Labeler Tests (K1.3)
 *
 * Tests fixture labeling logic: category→module mapping, content type detection,
 * difficulty assignment, and full labeling pipeline.
 */

// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import {
  CATEGORY_TO_MODULES,
  CATEGORY_DEFAULT_SEVERITY,
  CATEGORY_TO_DETECTION_CATEGORIES,
  detectContentType,
  assignDifficulty,
  resolveFixtureExpectations,
  labelFixtures,
  buildGroundTruthManifest,
} from '../corpus/fixture-labeler.js';
import { GroundTruthSampleSchema, ManifestSchema } from '../types.js';

const BU_TPI_ROOT = resolve(__dirname, '../../..');

describe('CATEGORY_TO_MODULES mapping', () => {
  it('should have a mapping for all expected fixture categories', () => {
    const expectedCategories = [
      'images', 'audio', 'web', 'context', 'malformed', 'encoded',
      'audio-attacks', 'agent-output', 'search-results', 'social',
      'code', 'boundary', 'untrusted-sources', 'cognitive',
      'delivery-vectors', 'multimodal', 'session', 'dos', 'supply-chain',
      'agent', 'vec', 'or', 'bias', 'environmental', 'modern',
      'translation', 'few-shot', 'tool-manipulation', 'document-attacks',
      'model-theft', 'output', 'mcp', 'prompt-injection', 'token-attacks',
      'webmcp',
    ];
    for (const cat of expectedCategories) {
      expect(CATEGORY_TO_MODULES[cat], `Missing mapping for category: ${cat}`).toBeDefined();
      expect(CATEGORY_TO_MODULES[cat].length).toBeGreaterThan(0);
    }
  });

  it('should only reference valid module IDs from taxonomy', () => {
    const validModules = new Set([
      'core-patterns', 'enhanced-pi', 'pii-detector', 'ssrf-detector',
      'xxe-protopollution', 'env-detector', 'encoding-engine', 'mcp-parser',
      'dos-detector', 'token-analyzer', 'session-bypass', 'email-webfetch',
      'vectordb-interface', 'rag-analyzer', 'supply-chain-detector',
      'model-theft-detector', 'output-detector', 'edgefuzz-detector',
      'webmcp-detector', 'document-pdf', 'document-office', 'image-scanner',
      'audio-scanner', 'social-engineering-detector', 'overreliance-detector',
      'bias-detector', 'deepfake-detector', 'data-provenance',
    ]);
    for (const [category, modules] of Object.entries(CATEGORY_TO_MODULES)) {
      for (const mod of modules) {
        expect(validModules.has(mod), `Invalid module '${mod}' in category '${category}'`).toBe(true);
      }
    }
  });
});

describe('CATEGORY_DEFAULT_SEVERITY', () => {
  it('should have severity for all mapped categories', () => {
    for (const cat of Object.keys(CATEGORY_TO_MODULES)) {
      expect(CATEGORY_DEFAULT_SEVERITY[cat], `Missing severity for: ${cat}`).toBeDefined();
    }
  });

  it('should only use valid severity values', () => {
    for (const sev of Object.values(CATEGORY_DEFAULT_SEVERITY)) {
      expect(['INFO', 'WARNING', 'CRITICAL']).toContain(sev);
    }
  });
});

describe('CATEGORY_TO_DETECTION_CATEGORIES', () => {
  it('should have detection categories for all mapped categories', () => {
    for (const cat of Object.keys(CATEGORY_TO_MODULES)) {
      expect(CATEGORY_TO_DETECTION_CATEGORIES[cat], `Missing detection categories for: ${cat}`).toBeDefined();
    }
  });
});

describe('resolveFixtureExpectations', () => {
  it('routes PDF document attacks only to document-pdf with PDF categories', () => {
    const expectations = resolveFixtureExpectations('document-attacks', 'pdf-form-field-inject.txt');
    expect(expectations.modules).toEqual(['document-pdf']);
    expect(expectations.detectionCategories.every(cat => cat.startsWith('PDF_'))).toBe(true);
  });

  it('routes Office document attacks only to document-office with Office categories', () => {
    const expectations = resolveFixtureExpectations('document-attacks', 'docx-ole-embed.txt');
    expect(expectations.modules).toEqual(['document-office']);
    expect(expectations.detectionCategories.every(cat => cat.startsWith('OFFICE_'))).toBe(true);
  });

  it('routes XLSX document attacks to document-office', () => {
    const expectations = resolveFixtureExpectations('document-attacks', 'xlsx-formula-injection.txt');
    expect(expectations.modules).toEqual(['document-office']);
    expect(expectations.detectionCategories.every(cat => cat.startsWith('OFFICE_'))).toBe(true);
  });

  it('routes generic web injection fixtures only to core-patterns', () => {
    const expectations = resolveFixtureExpectations('web', 'style-injection.html', '<script>console.log("SYSTEM OVERRIDE")</script>');
    expect(expectations.modules).toEqual(['core-patterns']);
  });

  it('routes SSRF-like web fixtures to ssrf-detector', () => {
    const expectations = resolveFixtureExpectations('web', 'redirect-chain-ssrf.txt', 'Location: http://169.254.169.254/latest/meta-data/');
    expect(expectations.modules).toContain('ssrf-detector');
  });
});

describe('detectContentType', () => {
  it('should detect text files', () => {
    expect(detectContentType('test.txt')).toBe('text');
    expect(detectContentType('test.json')).toBe('text');
    expect(detectContentType('test.html')).toBe('text');
    expect(detectContentType('test.py')).toBe('text');
    expect(detectContentType('test.js')).toBe('text');
    expect(detectContentType('test.md')).toBe('text');
    expect(detectContentType('test.svg')).toBe('text');
    expect(detectContentType('test.fixture')).toBe('text');
  });

  it('should detect binary files', () => {
    expect(detectContentType('test.jpg')).toBe('binary');
    expect(detectContentType('test.png')).toBe('binary');
    expect(detectContentType('test.mp3')).toBe('binary');
    expect(detectContentType('test.wav')).toBe('binary');
    expect(detectContentType('test.pdf')).toBe('binary');
    expect(detectContentType('test.docx')).toBe('binary');
  });

  it('should handle extensionless files as text', () => {
    expect(detectContentType('Makefile')).toBe('text');
    expect(detectContentType('LICENSE')).toBe('text');
  });

  it('should be case-insensitive for extensions', () => {
    expect(detectContentType('test.JPG')).toBe('binary');
    expect(detectContentType('test.PNG')).toBe('binary');
  });
});

describe('assignDifficulty', () => {
  it('should assign trivial to clean samples', () => {
    expect(assignDifficulty('prompt-injection', true)).toBe('trivial');
    expect(assignDifficulty('encoded', true)).toBe('trivial');
  });

  it('should assign advanced to evasion categories', () => {
    expect(assignDifficulty('encoded', false)).toBe('advanced');
    expect(assignDifficulty('vec', false)).toBe('advanced');
    expect(assignDifficulty('translation', false)).toBe('advanced');
  });

  it('should assign trivial to basic categories', () => {
    expect(assignDifficulty('prompt-injection', false)).toBe('trivial');
    expect(assignDifficulty('context', false)).toBe('trivial');
  });

  it('should assign moderate as default', () => {
    expect(assignDifficulty('dos', false)).toBe('moderate');
    expect(assignDifficulty('bias', false)).toBe('moderate');
  });
});

describe('labelFixtures', () => {
  it('should label all fixtures from the manifest', () => {
    const { samples, stats } = labelFixtures(BU_TPI_ROOT);

    // Should label all 2380 fixtures
    expect(stats.total).toBe(2380);
    expect(stats.labeled).toBe(2380);
    expect(stats.unmappedCategories).toHaveLength(0);
    expect(samples).toHaveLength(2380);
  });

  it('should produce valid GroundTruthSample objects for ALL samples', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);

    // Validate ALL samples against Zod schema (ISO 17025 — every sample matters)
    const errors: string[] = [];
    for (const sample of samples) {
      const result = GroundTruthSampleSchema.safeParse(sample);
      if (!result.success) {
        errors.push(`${sample.id}: ${result.error.message}`);
      }
    }
    expect(errors, `${errors.length} invalid samples:\n${errors.slice(0, 5).join('\n')}`).toHaveLength(0);
  });

  it('should have correct clean/malicious ratio', () => {
    const { stats } = labelFixtures(BU_TPI_ROOT);
    expect(stats.clean + stats.malicious).toBe(stats.total);
    expect(stats.clean).toBeGreaterThan(0);
    expect(stats.malicious).toBeGreaterThan(0);
  });

  it('should have empty expected_modules for clean samples', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const cleanSamples = samples.filter(s => s.expected_verdict === 'clean');
    for (const sample of cleanSamples) {
      expect(sample.expected_modules, `Clean sample ${sample.id} has modules`).toEqual([]);
    }
  });

  it('should have non-empty expected_modules for malicious samples', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const maliciousSamples = samples.filter(s => s.expected_verdict === 'malicious');
    for (const sample of maliciousSamples) {
      expect(sample.expected_modules.length, `Malicious sample ${sample.id} has no modules`).toBeGreaterThan(0);
    }
  });

  it('should detect both text and binary content types', () => {
    const { stats } = labelFixtures(BU_TPI_ROOT);
    expect(stats.text).toBeGreaterThan(0);
    expect(stats.binary).toBeGreaterThan(0);
    expect(stats.text + stats.binary).toBe(stats.total);
  });

  it('should have unique sample IDs', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const ids = new Set(samples.map(s => s.id));
    expect(ids.size).toBe(samples.length);
  });

  it('should map all fixture categories', () => {
    const { stats } = labelFixtures(BU_TPI_ROOT);
    expect(stats.unmappedCategories).toHaveLength(0);
  });

  it('should track per-module sample counts', () => {
    const { stats } = labelFixtures(BU_TPI_ROOT);
    expect(Object.keys(stats.byModule).length).toBeGreaterThan(0);
    // core-patterns should have the most since it's mapped to many categories
    expect(stats.byModule['core-patterns']).toBeGreaterThan(100);
  });

  it('should have SHA-256 hashes for all samples', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    for (const sample of samples.slice(0, 50)) {
      expect(sample.content_hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('should correct clearly benign clean-prefixed fixtures that were misclassified in the source manifest', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const sharedDoc = samples.find(s => s.id === 'gt::delivery-vectors::clean-shared-document.txt');
    expect(sharedDoc?.expected_verdict).toBe('clean');
    expect(sharedDoc?.expected_modules).toEqual([]);
  });

  it('should trust benign clean-prefixed web fixtures even when the source manifest marks them malicious', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const cleanPage = samples.find(s => s.id === 'gt::web::clean-page.html');
    expect(cleanPage?.expected_verdict).toBe('clean');
    expect(cleanPage?.expected_modules).toEqual([]);
  });

  it('should correct benign clean-prefixed WebMCP fixtures with negative-control prose', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const cleanOauth = samples.find(s => s.id === 'gt::webmcp::clean-oauth-flow.fixture');
    expect(cleanOauth?.expected_verdict).toBe('clean');
    expect(cleanOauth?.expected_modules).toEqual([]);
  });

  it('should relabel clearly malicious binary fixtures even when the source manifest marks them clean', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);

    expect(samples.find(s => s.id === 'gt::audio::basileak-audio-flac-001.flac')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::audio::basileak-audio-flac-002.flac')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::audio::basileak-audio-opus-001.opus')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::multimodal::pantheonlm-video-wmv-001.wmv')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::multimodal::basileak-video-wmv-002.wmv')?.expected_verdict).toBe('malicious');
  });

  it('should relabel clearly malicious text fixtures even when the source manifest marks them clean', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);

    expect(samples.find(s => s.id === 'gt::dos::dos-flood-sustained.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::dos::dos-loop-code.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::dos::dos-output-expand.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::dos::dos-length-recursive.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::dos::dos-context-token.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::dos::dos-loop-multi.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::output::out-path-var.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::output::out-ssrf-dns.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::token-attacks::token-bpe-boundary-split.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::malformed::special-chars-name.txt')?.expected_verdict).toBe('malicious');
    expect(samples.find(s => s.id === 'gt::malformed::invalid-magic.txt')?.expected_verdict).toBe('malicious');
  });

  it('should keep explicit clean text controls clean when they describe legitimate usage', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);

    expect(samples.find(s => s.id === 'gt::output::out-cmd-clean.txt')?.expected_verdict).toBe('clean');
  });
});

describe('buildGroundTruthManifest', () => {
  it('should build a valid manifest', () => {
    const { samples } = labelFixtures(BU_TPI_ROOT);
    const manifest = buildGroundTruthManifest(samples);

    const result = ManifestSchema.safeParse(manifest);
    expect(result.success, `Invalid manifest: ${result.error?.message}`).toBe(true);
    expect(manifest.entry_count).toBe(2380);
    expect(manifest.manifest_type).toBe('ground-truth');
    expect(manifest.entries).toHaveLength(2380);
  });
});
