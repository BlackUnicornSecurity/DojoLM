/**
 * File: master-sources.test.ts
 * Purpose: Tests for Master Source Adapters (Story 13.3)
 * Scope: Each adapter parse function, URL validation, malformed data
 */

import { describe, it, expect } from 'vitest';
import {
  MITREAtlasAdapter,
  OWASPLLMTop10Adapter,
  NVDAIAdapter,
  getAdapter,
  getAvailableSourceIds,
  getAllAdapters,
} from '../master-sources.js';

// ===========================================================================
// MITRE ATLAS Adapter
// ===========================================================================

describe('MITREAtlasAdapter', () => {
  const adapter = new MITREAtlasAdapter();

  it('returns correct source metadata', () => {
    expect(adapter.getSourceId()).toBe('mitre-atlas');
    expect(adapter.getSourceName()).toBe('MITRE ATLAS');
    expect(adapter.getSourceUrl()).toContain('github');
    expect(adapter.getSourceUrl()).toContain('ATLAS');
  });

  it('parses valid ATLAS data with objects array', () => {
    const raw = {
      objects: [
        {
          id: 'AML.T0001',
          name: 'Prompt Injection Attack',
          description: 'An adversary crafts malicious prompts to manipulate LLM behavior.',
          type: 'technique',
          created: '2024-01-01T00:00:00Z',
          modified: '2024-06-01T00:00:00Z',
          external_references: [{ external_id: 'AML.T0001' }],
        },
        {
          id: 'AML.T0002',
          name: 'Model Evasion',
          description: 'Techniques to evade model detection.',
          type: 'technique',
        },
      ],
    };

    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(2);

    const first = entries[0];
    expect(first.id).toBe('atlas-AML_T0001');
    expect(first.sourceId).toBe('mitre-atlas');
    expect(first.sourceTier).toBe('master');
    expect(first.title).toBe('Prompt Injection Attack');
    expect(first.category).toBe('prompt-injection');
    expect(first.severity).toBe('WARNING');
    expect(first.confidence).toBe(0.85);
    expect(first.techniqueIds).toContain('AML.T0001');
    expect(first.indicators).toContain('AML.T0001');

    const second = entries[1];
    expect(second.category).toBe('evasion');
  });

  it('parses data with techniques key', () => {
    const raw = {
      techniques: [
        { id: 'AML.T0003', name: 'Data Exfiltration via model', description: 'Extract training data.' },
      ],
    };

    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('data-exfiltration');
  });

  it('handles malformed data gracefully', () => {
    expect(adapter.parse(null)).toEqual([]);
    expect(adapter.parse(undefined)).toEqual([]);
    expect(adapter.parse('string')).toEqual([]);
    expect(adapter.parse({ objects: [{ noId: true }] })).toEqual([]);
  });

  it('skips entries without id or name', () => {
    const raw = {
      objects: [
        { description: 'No ID or name' },
        { id: 'AML.T0004', name: 'Valid Entry', description: 'Has both' },
      ],
    };
    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('atlas-AML_T0004');
  });

  it('sanitizes HTML in descriptions', () => {
    const raw = {
      objects: [
        {
          id: 'AML.T0005',
          name: 'XSS Test',
          description: 'Description with <script>alert("xss")</script> and normal text.',
        },
      ],
    };
    const entries = adapter.parse(raw);
    expect(entries[0].description).not.toContain('<script>');
  });

  it('maps categories correctly', () => {
    const tests = [
      { name: 'Prompt Injection', expected: 'prompt-injection' },
      { name: 'Model Evasion Attack', expected: 'evasion' },
      { name: 'Data Exfiltration Technique', expected: 'data-exfiltration' },
      { name: 'Training Data Poisoning', expected: 'data-poisoning' },
      { name: 'Model Theft via API', expected: 'model-theft' },
      { name: 'Generic ML Attack', expected: 'ml-attack' },
    ];

    for (const { name, expected } of tests) {
      const entries = adapter.parse({ objects: [{ id: 'test', name, description: '' }] });
      expect(entries[0].category).toBe(expected);
    }
  });
});

// ===========================================================================
// OWASP LLM Top 10 Adapter
// ===========================================================================

describe('OWASPLLMTop10Adapter', () => {
  const adapter = new OWASPLLMTop10Adapter();

  it('returns correct source metadata', () => {
    expect(adapter.getSourceId()).toBe('owasp-llm-top10');
    expect(adapter.getSourceName()).toBe('OWASP LLM Top 10');
    expect(adapter.getSourceUrl()).toContain('OWASP');
  });

  it('parses valid OWASP data with risks array', () => {
    const raw = {
      risks: [
        {
          id: 'LLM01',
          name: 'Prompt Injection',
          description: 'Manipulating LLM via crafted inputs.',
          rank: 1,
          impact: 'High',
        },
        {
          id: 'LLM02',
          name: 'Sensitive Data Leakage',
          description: 'Unintended exposure of sensitive data.',
          rank: 2,
        },
      ],
    };

    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(2);

    expect(entries[0].id).toBe('owasp-llm01');
    expect(entries[0].sourceId).toBe('owasp-llm-top10');
    expect(entries[0].category).toBe('prompt-injection');
    expect(entries[0].severity).toBe('CRITICAL');
    expect(entries[0].confidence).toBe(0.95);

    expect(entries[1].category).toBe('data-exfiltration');
  });

  it('parses data with items key', () => {
    const raw = {
      items: [
        { id: 'LLM05', name: 'Supply Chain Vulnerabilities', description: 'Attacks on dependencies.' },
      ],
    };
    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].category).toBe('supply-chain');
  });

  it('handles malformed data gracefully', () => {
    expect(adapter.parse(null)).toEqual([]);
    expect(adapter.parse({})).toEqual([]);
    expect(adapter.parse({ risks: [{ noNameOrId: true }] })).toEqual([]);
  });

  it('maps categories correctly', () => {
    const tests = [
      { name: 'Prompt Injection', expected: 'prompt-injection' },
      { name: 'Data Leak Prevention', expected: 'data-exfiltration' },
      { name: 'Supply Chain Attack', expected: 'supply-chain' },
      { name: 'Denial of Service', expected: 'denial-of-service' },
      { name: 'Overreliance on LLM', expected: 'overreliance' },
      { name: 'Training Data Poisoning', expected: 'data-poisoning' },
      { name: 'Generic LLM Risk', expected: 'llm-security' },
    ];

    for (const { name, expected } of tests) {
      const entries = adapter.parse({ risks: [{ id: 'test', name, description: '' }] });
      expect(entries[0].category).toBe(expected);
    }
  });
});

// ===========================================================================
// NVD AI CVE Adapter
// ===========================================================================

describe('NVDAIAdapter', () => {
  const adapter = new NVDAIAdapter();

  it('returns correct source metadata', () => {
    expect(adapter.getSourceId()).toBe('nvd-ai');
    expect(adapter.getSourceName()).toBe('NVD AI CVEs');
    expect(adapter.getSourceUrl()).toContain('nvd.nist.gov');
  });

  it('parses valid NVD data', () => {
    const raw = {
      vulnerabilities: [
        {
          cve: {
            id: 'CVE-2024-12345',
            descriptions: [
              { lang: 'en', value: 'A critical vulnerability in an AI system.' },
            ],
            metrics: {
              cvssMetricV31: [
                { cvssData: { baseScore: 9.5 } },
              ],
            },
            published: '2024-01-15T00:00:00Z',
            lastModified: '2024-02-01T00:00:00Z',
          },
        },
      ],
    };

    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.id).toBe('nvd-cve-2024-12345');
    expect(entry.sourceId).toBe('nvd-ai');
    expect(entry.title).toBe('CVE-2024-12345');
    expect(entry.category).toBe('cve');
    expect(entry.severity).toBe('CRITICAL');
    expect(entry.metadata.cvssScore).toBe(9.5);
  });

  it('maps CVSS scores to severity correctly', () => {
    const makeVuln = (score: number) => ({
      vulnerabilities: [{
        cve: {
          id: 'CVE-TEST',
          descriptions: [{ lang: 'en', value: 'Test' }],
          metrics: { cvssMetricV31: [{ cvssData: { baseScore: score } }] },
        },
      }],
    });

    expect(adapter.parse(makeVuln(9.5))[0].severity).toBe('CRITICAL');
    expect(adapter.parse(makeVuln(7.0))[0].severity).toBe('WARNING');
    expect(adapter.parse(makeVuln(2.0))[0].severity).toBe('INFO');
  });

  it('handles missing metrics gracefully', () => {
    const raw = {
      vulnerabilities: [{
        cve: {
          id: 'CVE-NO-METRICS',
          descriptions: [{ lang: 'en', value: 'No CVSS data' }],
        },
      }],
    };
    const entries = adapter.parse(raw);
    expect(entries).toHaveLength(1);
    expect(entries[0].severity).toBe('WARNING');
    expect(entries[0].metadata.cvssScore).toBeNull();
  });

  it('handles malformed data gracefully', () => {
    expect(adapter.parse(null)).toEqual([]);
    expect(adapter.parse({})).toEqual([]);
    expect(adapter.parse({ vulnerabilities: [{ cve: {} }] })).toEqual([]);
  });

  it('prefers English description', () => {
    const raw = {
      vulnerabilities: [{
        cve: {
          id: 'CVE-LANG',
          descriptions: [
            { lang: 'fr', value: 'Description en français' },
            { lang: 'en', value: 'English description' },
          ],
        },
      }],
    };
    const entries = adapter.parse(raw);
    expect(entries[0].description).toContain('English description');
  });
});

// ===========================================================================
// Adapter Registry
// ===========================================================================

describe('Adapter Registry', () => {
  it('getAdapter returns correct adapter by ID', () => {
    const atlas = getAdapter('mitre-atlas');
    expect(atlas).not.toBeNull();
    expect(atlas!.getSourceId()).toBe('mitre-atlas');

    const owasp = getAdapter('owasp-llm-top10');
    expect(owasp).not.toBeNull();
    expect(owasp!.getSourceId()).toBe('owasp-llm-top10');

    const nvd = getAdapter('nvd-ai');
    expect(nvd).not.toBeNull();
    expect(nvd!.getSourceId()).toBe('nvd-ai');
  });

  it('getAdapter returns null for unknown source', () => {
    expect(getAdapter('unknown-source')).toBeNull();
  });

  it('getAvailableSourceIds returns all 3 sources', () => {
    const ids = getAvailableSourceIds();
    expect(ids).toHaveLength(3);
    expect(ids).toContain('mitre-atlas');
    expect(ids).toContain('owasp-llm-top10');
    expect(ids).toContain('nvd-ai');
  });

  it('getAllAdapters returns adapter instances', () => {
    const adapters = getAllAdapters();
    expect(adapters).toHaveLength(3);
    for (const adapter of adapters) {
      expect(adapter.getSourceId).toBeDefined();
      expect(adapter.getSourceUrl()).toContain('https://');
    }
  });
});
