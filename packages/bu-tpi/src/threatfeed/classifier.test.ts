/**
 * Classifier Tests
 * Tests for: classifyThreat, extractIndicators, assessConfidence, assessSeverity
 */

import { describe, it, expect } from 'vitest';
import {
  classifyThreat,
  extractIndicators,
  assessConfidence,
  assessSeverity,
} from './classifier.js';
import type { ThreatEntry, ThreatClassification } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

function makeEntry(overrides: Partial<ThreatEntry> = {}): ThreatEntry {
  return {
    id: 'entry-1',
    sourceId: 'src-1',
    title: 'Test',
    description: 'Test description',
    rawContent: 'test content',
    classifiedType: null,
    severity: null,
    confidence: 0,
    indicators: [],
    extractedPatterns: [],
    createdAt: new Date().toISOString(),
    processedAt: null,
    ...overrides,
  };
}

describe('Classifier', () => {
  describe('classifyThreat', () => {
    // CL-001
    it('CL-001: classifies prompt injection content', () => {
      const entry = makeEntry({
        rawContent: 'This is a prompt injection attack with jailbreak and bypass safety',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('prompt-injection');
      expect(result.confidence).toBeGreaterThan(0);
    });

    // CL-002
    it('CL-002: classifies MCP-related threats', () => {
      const entry = makeEntry({
        rawContent: 'MCP model context protocol capability spoofing tool shadow',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('mcp');
      expect(result.confidence).toBeGreaterThan(0);
    });

    // CL-003
    it('CL-003: classifies supply chain attacks', () => {
      const entry = makeEntry({
        rawContent: 'supply chain dependency confusion typosquatting package poison backdoor',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('supply-chain');
    });

    // CL-004
    it('CL-004: returns unknown for unclassifiable content', () => {
      const entry = makeEntry({
        rawContent: 'weather forecast sunny tomorrow umbrella',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('No matching keywords');
    });

    // CL-005
    it('CL-005: returns unknown for oversized content', () => {
      const entry = makeEntry({
        rawContent: 'x'.repeat(MAX_INPUT_LENGTH + 1),
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('unknown');
      expect(result.reasoning).toContain('too large');
    });

    // CL-006
    it('CL-006: classification includes reasoning with matched keywords', () => {
      const entry = makeEntry({
        rawContent: 'denial of service resource exhaustion token explosion',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('dos');
      expect(result.reasoning).toContain('denial of service');
    });

    // CL-007
    it('CL-007: picks category with highest keyword match count', () => {
      // More web keywords than prompt-injection keywords
      const entry = makeEntry({
        rawContent: 'XSS cross-site scripting CSRF SQL injection SSRF XXE prototype pollution prompt injection',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('web');
    });

    // CL-008
    it('CL-008: classifies agent attacks', () => {
      const entry = makeEntry({
        rawContent: 'agent attack tool abuse function calling tool poisoning',
      });
      const result = classifyThreat(entry);
      expect(result.type).toBe('agent');
    });
  });

  describe('extractIndicators', () => {
    // CL-009
    it('CL-009: extracts IP addresses from content', () => {
      const indicators = extractIndicators('Attacker IP: 192.168.1.1 and 8.8.8.8');
      const ips = indicators.filter((i) => i.type === 'ip');
      expect(ips.length).toBeGreaterThanOrEqual(2);
      expect(ips.map((i) => i.value)).toContain('192.168.1.1');
      expect(ips.map((i) => i.value)).toContain('8.8.8.8');
    });

    // CL-010
    it('CL-010: extracts domain names from content', () => {
      const indicators = extractIndicators('Contacted malicious.example.com and evil.org');
      const domains = indicators.filter((i) => i.type === 'domain');
      expect(domains.length).toBeGreaterThanOrEqual(2);
    });

    // CL-011
    it('CL-011: extracts SHA hashes from content', () => {
      const sha256 = 'a'.repeat(64);
      const sha1 = 'b'.repeat(40);
      const md5 = 'c'.repeat(32);
      const indicators = extractIndicators(`Hashes: ${sha256} ${sha1} ${md5}`);
      const hashes = indicators.filter((i) => i.type === 'hash');
      expect(hashes).toHaveLength(3);
    });

    // CL-012
    it('CL-012: extracts MITRE ATT&CK technique IDs', () => {
      const indicators = extractIndicators('Techniques used: T1059 T1059.001 T1566');
      const techniques = indicators.filter((i) => i.type === 'technique');
      expect(techniques.length).toBeGreaterThanOrEqual(3);
      expect(techniques.map((i) => i.value)).toContain('T1059');
      expect(techniques.map((i) => i.value)).toContain('T1059.001');
    });

    // CL-013
    it('CL-013: returns empty array for oversized content', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      expect(extractIndicators(oversized)).toEqual([]);
    });

    // CL-014
    it('CL-014: includes context around extracted indicators', () => {
      const indicators = extractIndicators('The attacker used IP 8.8.8.8 to exfiltrate data');
      const ip = indicators.find((i) => i.type === 'ip');
      expect(ip?.context).toBeDefined();
      expect(ip!.context.length).toBeGreaterThan(0);
    });
  });

  describe('assessConfidence', () => {
    // CL-015
    it('CL-015: boosts confidence when indicators are present', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.5, reasoning: 'test' };
      const entry = makeEntry({
        indicators: [{ type: 'ip', value: '1.2.3.4', context: '' }],
        rawContent: 'a'.repeat(100),
      });
      const result = assessConfidence(entry, classification);
      expect(result).toBeGreaterThan(0.5);
    });

    // CL-016
    it('CL-016: boosts confidence when extractedPatterns are present', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.5, reasoning: 'test' };
      const entry = makeEntry({
        extractedPatterns: ['pattern1'],
        rawContent: 'a'.repeat(100),
      });
      const result = assessConfidence(entry, classification);
      expect(result).toBeGreaterThan(0.5);
    });

    // CL-017
    it('CL-017: reduces confidence for very short entries', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.8, reasoning: 'test' };
      const entry = makeEntry({ rawContent: 'short' });
      const result = assessConfidence(entry, classification);
      expect(result).toBeLessThan(0.8);
    });

    // CL-018
    it('CL-018: caps confidence at 1.0', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.95, reasoning: 'test' };
      const entry = makeEntry({
        indicators: [{ type: 'ip', value: '1.2.3.4', context: '' }],
        extractedPatterns: ['p1'],
        rawContent: 'a'.repeat(100),
      });
      const result = assessConfidence(entry, classification);
      expect(result).toBeLessThanOrEqual(1.0);
    });
  });

  describe('assessSeverity', () => {
    // CL-019
    it('CL-019: returns CRITICAL for zero-day content', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.3, reasoning: '' };
      expect(assessSeverity('zero-day exploit found', classification)).toBe('CRITICAL');
      expect(assessSeverity('0-day vulnerability', classification)).toBe('CRITICAL');
    });

    // CL-020
    it('CL-020: returns CRITICAL for RCE content', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.3, reasoning: '' };
      expect(assessSeverity('remote code execution vulnerability', classification)).toBe('CRITICAL');
    });

    // CL-021
    it('CL-021: returns CRITICAL for actively exploited content', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.3, reasoning: '' };
      expect(assessSeverity('this vuln is actively exploited in the wild', classification)).toBe('CRITICAL');
    });

    // CL-022
    it('CL-022: returns CRITICAL for high confidence classification', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.9, reasoning: '' };
      expect(assessSeverity('some generic threat content', classification)).toBe('CRITICAL');
    });

    // CL-023
    it('CL-023: returns WARNING for medium confidence classification', () => {
      const classification: ThreatClassification = { type: 'web', confidence: 0.6, reasoning: '' };
      expect(assessSeverity('some generic threat content', classification)).toBe('WARNING');
    });

    // CL-024
    it('CL-024: returns INFO for low confidence classification', () => {
      const classification: ThreatClassification = { type: 'unknown', confidence: 0.2, reasoning: '' };
      expect(assessSeverity('some generic content', classification)).toBe('INFO');
    });
  });
});
