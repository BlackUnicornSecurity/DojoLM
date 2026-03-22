/**
 * Tests for KATANA Corpus Expander (K1.5)
 */
import { describe, it, expect } from 'vitest';
import { expandCorpus, computeExpansionTargets } from '../corpus/corpus-expander.js';
import { GroundTruthSampleSchema } from '../types.js';

describe('corpus-expander', () => {
  describe('expandCorpus', () => {
    it('generates malicious samples for modules with gaps', () => {
      // Only request enhanced-pi with gap, set all others to 0 target to isolate
      const existing = new Map([['enhanced-pi', 10]]);
      const targets = new Map([['enhanced-pi', 50]]);

      // expandCorpus iterates ALL templates; modules not in targets default to 150
      // So we test that enhanced-pi gets exactly the 40 needed
      const { samples, stats } = expandCorpus(existing, targets, 42);

      expect(stats.modules_expanded).toContain('enhanced-pi');
      expect(stats.by_module['enhanced-pi']).toBe(40); // 50 - 10 = 40 needed

      const enhancedPiSamples = samples.filter(
        s => s.expected_verdict === 'malicious' && s.expected_modules.includes('enhanced-pi'),
      );
      expect(enhancedPiSamples.length).toBe(40);
    });

    it('generates clean samples for negative coverage', () => {
      const existing = new Map([['pii-detector', 10]]);
      const targets = new Map([['pii-detector', 50]]);

      const { samples, stats } = expandCorpus(existing, targets, 42);

      const clean = samples.filter(s => s.expected_verdict === 'clean');
      expect(clean.length).toBeGreaterThanOrEqual(200); // minimum 200 clean
      expect(stats.clean_generated).toBe(clean.length);
    });

    it('skips modules that already meet target', () => {
      const existing = new Map([['enhanced-pi', 150]]);
      const targets = new Map([['enhanced-pi', 150]]);

      const { stats } = expandCorpus(existing, targets, 42);

      expect(stats.modules_expanded).not.toContain('enhanced-pi');
      expect(stats.by_module['enhanced-pi']).toBeUndefined();
    });

    it('generates deterministic output for same seed', () => {
      const existing = new Map([['pii-detector', 0]]);
      const targets = new Map([['pii-detector', 20]]);

      const result1 = expandCorpus(existing, targets, 42);
      const result2 = expandCorpus(existing, targets, 42);

      expect(result1.samples.length).toBe(result2.samples.length);
      for (let i = 0; i < result1.samples.length; i++) {
        expect(result1.samples[i].content_hash).toBe(result2.samples[i].content_hash);
      }
    });

    it('produces different output for different seeds', () => {
      const existing = new Map([['pii-detector', 0]]);
      const targets = new Map([['pii-detector', 20]]);

      const result1 = expandCorpus(existing, targets, 42);
      const result2 = expandCorpus(existing, targets, 99);

      // Content hashes should differ (different RNG sequences pick different vars)
      const hashes1 = result1.samples.map(s => s.content_hash);
      const hashes2 = result2.samples.map(s => s.content_hash);
      expect(hashes1).not.toEqual(hashes2);
    });

    it('all generated samples pass schema validation', () => {
      const existing = new Map([['ssrf-detector', 0], ['mcp-parser', 0]]);
      const targets = new Map([['ssrf-detector', 10], ['mcp-parser', 10]]);

      const { samples } = expandCorpus(existing, targets, 42);

      for (const sample of samples) {
        const result = GroundTruthSampleSchema.safeParse(sample);
        if (!result.success) {
          throw new Error(`Sample ${sample.id} failed validation: ${result.error.message}`);
        }
      }
    });

    it('sample IDs are unique', () => {
      const existing = new Map([['enhanced-pi', 0], ['pii-detector', 0], ['ssrf-detector', 0]]);
      const targets = new Map([['enhanced-pi', 30], ['pii-detector', 30], ['ssrf-detector', 30]]);

      const { samples } = expandCorpus(existing, targets, 42);

      const ids = samples.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('content hashes are valid SHA-256', () => {
      const existing = new Map([['enhanced-pi', 0]]);
      const targets = new Map([['enhanced-pi', 10]]);

      const { samples } = expandCorpus(existing, targets, 42);

      for (const sample of samples) {
        expect(sample.content_hash).toMatch(/^[a-f0-9]{64}$/);
      }
    });

    it('covers all modules with templates', () => {
      // Every module in MODULE_ATTACK_TEMPLATES should generate samples when needed
      const existing = new Map<string, number>();
      const targets = new Map<string, number>();

      // Request 5 samples from each module
      const expectedModules = [
        'enhanced-pi', 'pii-detector', 'ssrf-detector', 'xxe-protopollution',
        'env-detector', 'encoding-engine', 'mcp-parser', 'dos-detector',
        'token-analyzer', 'session-bypass', 'email-webfetch', 'vectordb-interface',
        'rag-analyzer', 'supply-chain-detector', 'model-theft-detector',
        'output-detector', 'edgefuzz-detector', 'webmcp-detector',
        'document-pdf', 'document-office', 'social-engineering-detector',
        'overreliance-detector', 'bias-detector', 'deepfake-detector',
        'data-provenance',
      ];

      for (const mod of expectedModules) {
        existing.set(mod, 0);
        targets.set(mod, 5);
      }

      const { stats } = expandCorpus(existing, targets, 42);

      for (const mod of expectedModules) {
        expect(stats.by_module[mod]).toBe(5);
      }
    });

    it('malicious samples have correct severity and categories', () => {
      const existing = new Map([['pii-detector', 0]]);
      const targets = new Map([['pii-detector', 5]]);

      const { samples } = expandCorpus(existing, targets, 42);
      const malicious = samples.filter(s => s.expected_verdict === 'malicious');

      for (const s of malicious) {
        expect(s.expected_severity).toBeTruthy();
        expect(s.expected_categories.length).toBeGreaterThan(0);
      }
    });

    it('clean samples have null severity and empty categories', () => {
      const existing = new Map([['enhanced-pi', 0]]);
      const targets = new Map([['enhanced-pi', 5]]);

      const { samples } = expandCorpus(existing, targets, 42);
      const clean = samples.filter(s => s.expected_verdict === 'clean');

      for (const s of clean) {
        expect(s.expected_severity).toBeNull();
        expect(s.expected_categories).toEqual([]);
        expect(s.expected_modules).toEqual([]);
      }
    });

    it('total_generated equals malicious + clean', () => {
      const existing = new Map([['enhanced-pi', 0], ['pii-detector', 0]]);
      const targets = new Map([['enhanced-pi', 30], ['pii-detector', 30]]);

      const { stats } = expandCorpus(existing, targets, 42);

      expect(stats.total_generated).toBe(stats.malicious_generated + stats.clean_generated);
    });

    it('reviewer metadata is properly set', () => {
      const existing = new Map([['enhanced-pi', 0]]);
      const targets = new Map([['enhanced-pi', 5]]);

      const { samples } = expandCorpus(existing, targets, 42);

      for (const sample of samples) {
        expect(sample.reviewer_1.id).toBe('corpus-expander-v1');
        expect(sample.reviewer_2.id).toBe('template-metadata');
        expect(sample.independent_agreement).toBe(true);
        expect(sample.holdout).toBe(false);
        expect(sample.source_type).toBe('synthetic');
      }
    });
  });

  describe('computeExpansionTargets', () => {
    it('extracts targets from gap report', () => {
      const gapReport = {
        modules: [
          { module_id: 'enhanced-pi', tier: 1, positive_count: 100, required_positive: 150, gap_positive: 50 },
          { module_id: 'bias-detector', tier: 2, positive_count: 50, required_positive: 100, gap_positive: 50 },
        ],
      };

      const { targetPerModule, existingPositiveCounts } = computeExpansionTargets(gapReport);

      expect(targetPerModule.get('enhanced-pi')).toBe(150);
      expect(targetPerModule.get('bias-detector')).toBe(100);
      expect(existingPositiveCounts.get('enhanced-pi')).toBe(100);
      expect(existingPositiveCounts.get('bias-detector')).toBe(50);
    });
  });
});
