/**
 * K1.1 — Module Taxonomy Tests
 *
 * Validates the taxonomy JSON against Zod schema and
 * verifies completeness against scanner registry.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ModuleTaxonomySchema, type ModuleTaxonomy } from '../types.js';

// Load taxonomy from data directory
const taxonomyPath = resolve(
  import.meta.dirname ?? __dirname,
  '../../../validation/taxonomy/module-taxonomy.json',
);

const taxonomy: ModuleTaxonomy = JSON.parse(readFileSync(taxonomyPath, 'utf-8'));

describe('K1.1 — Module Taxonomy Schema Validation', () => {
  it('passes Zod schema validation', () => {
    expect(() => ModuleTaxonomySchema.parse(taxonomy)).not.toThrow();
  });

  it('has schema_version 1.0.0', () => {
    expect(taxonomy.schema_version).toBe('1.0.0');
  });

  it('has generated_at timestamp', () => {
    expect(taxonomy.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('K1.1 — Module Completeness', () => {
  const expectedModuleIds = [
    'core-patterns',
    'enhanced-pi',
    'pii-detector',
    'ssrf-detector',
    'xxe-protopollution',
    'env-detector',
    'encoding-engine',
    'mcp-parser',
    'dos-detector',
    'token-analyzer',
    'session-bypass',
    'email-webfetch',
    'vectordb-interface',
    'rag-analyzer',
    'supply-chain-detector',
    'model-theft-detector',
    'output-detector',
    'edgefuzz-detector',
    'webmcp-detector',
    'document-pdf',
    'document-office',
    'image-scanner',
    'audio-scanner',
    'social-engineering-detector',
    'overreliance-detector',
    'bias-detector',
    'deepfake-detector',
    'data-provenance',
    'shingan-scanner',
  ];

  it('contains all 29 expected modules', () => {
    const moduleIds = taxonomy.modules.map(m => m.module_id);
    expect(moduleIds).toHaveLength(29);
    for (const id of expectedModuleIds) {
      expect(moduleIds).toContain(id);
    }
  });

  it('has no duplicate module IDs', () => {
    const ids = taxonomy.modules.map(m => m.module_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('K1.1 — Tier Assignments', () => {
  const tier1Modules = [
    'core-patterns', 'enhanced-pi', 'pii-detector', 'ssrf-detector',
    'xxe-protopollution', 'env-detector', 'encoding-engine', 'mcp-parser',
    'dos-detector', 'token-analyzer', 'session-bypass', 'email-webfetch',
    'vectordb-interface', 'rag-analyzer', 'supply-chain-detector',
    'model-theft-detector', 'output-detector', 'edgefuzz-detector',
    'webmcp-detector', 'document-pdf', 'document-office',
    'image-scanner', 'audio-scanner',
  ];

  const tier2Modules = [
    'social-engineering-detector', 'overreliance-detector',
    'bias-detector', 'deepfake-detector', 'data-provenance',
    'shingan-scanner',
  ];

  it('assigns Tier 1 to deterministic objective modules', () => {
    for (const id of tier1Modules) {
      const mod = taxonomy.modules.find(m => m.module_id === id);
      expect(mod?.tier, `${id} should be Tier 1`).toBe(1);
    }
  });

  it('assigns Tier 2 to semi-subjective modules', () => {
    for (const id of tier2Modules) {
      const mod = taxonomy.modules.find(m => m.module_id === id);
      expect(mod?.tier, `${id} should be Tier 2`).toBe(2);
    }
  });
});

describe('K1.1 — Module Properties', () => {
  it('all modules have non-empty detection_categories', () => {
    for (const mod of taxonomy.modules) {
      expect(mod.detection_categories.length, `${mod.module_id} categories`).toBeGreaterThan(0);
    }
  });

  it('all modules have non-empty capabilities', () => {
    for (const mod of taxonomy.modules) {
      expect(mod.capabilities.length, `${mod.module_id} capabilities`).toBeGreaterThan(0);
    }
  });

  it('all modules have non-empty severity_levels', () => {
    for (const mod of taxonomy.modules) {
      expect(mod.severity_levels.length, `${mod.module_id} severities`).toBeGreaterThan(0);
    }
  });

  it('all modules are deterministic', () => {
    // All scanner modules in this project are regex-based
    for (const mod of taxonomy.modules) {
      expect(mod.deterministic, `${mod.module_id} deterministic`).toBe(true);
    }
  });

  it('binary modules have binary input_type', () => {
    const binaryModules = ['image-scanner', 'audio-scanner'];
    for (const id of binaryModules) {
      const mod = taxonomy.modules.find(m => m.module_id === id);
      expect(mod?.input_type, `${id} input_type`).toBe('binary');
    }
  });

  it('text modules have text input_type', () => {
    const textModules = taxonomy.modules.filter(
      m => !['image-scanner', 'audio-scanner'].includes(m.module_id),
    );
    for (const mod of textModules) {
      expect(mod.input_type, `${mod.module_id} input_type`).toBe('text');
    }
  });

  it('source_file paths start with src/', () => {
    for (const mod of taxonomy.modules) {
      expect(mod.source_file, `${mod.module_id} source_file`).toMatch(/^src\//);
    }
  });
});
