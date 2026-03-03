import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { dosDetectorModule, detectResourceExhaustion } from './dos-detector.js';
import type { Finding } from '../types.js';

function scanDos(t: string): Finding[] { return dosDetectorModule.scan(t, t); }

describe('dos-detector (S32a)', () => {
  describe('Module Registration', () => {
    it('should be registered', () => { expect(scannerRegistry.hasModule('dos-detector')).toBe(true); });
    it('should have correct metadata', () => { expect(dosDetectorModule.name).toBe('dos-detector'); });
    it('should have positive pattern count', () => { expect(dosDetectorModule.getPatternCount()).toBeGreaterThan(0); });
    it('should have 7 pattern groups', () => { expect(dosDetectorModule.getPatternGroups()).toHaveLength(7); });
  });

  describe('Regex Bomb Detection', () => {
    it('should detect nested quantifier pattern', () => {
      expect(scanDos('Pattern: (a+)+$ with evil input').some(f => f.pattern_name === 'regex_nested_quantifier')).toBe(true);
    });
    it('should detect catastrophic backtracking', () => {
      expect(scanDos('Pattern: (a?){30}a{30}').some(f => f.pattern_name === 'regex_catastrophic_backtrack')).toBe(true);
    });
  });

  describe('XML Bomb Detection', () => {
    it('should detect recursive entity declaration', () => {
      expect(scanDos('<!ENTITY lol2 "&lol;&lol;">').some(f => f.pattern_name === 'xml_entity_decl')).toBe(true);
    });
    it('should detect billion laughs entity reference', () => {
      expect(scanDos('Expansion: &lol9;').some(f => f.pattern_name === 'xml_entity_expansion')).toBe(true);
    });
  });

  describe('Deep Nesting Detection', () => {
    it('should detect deeply nested JSON', () => {
      const nested = '{"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":"deep"}}}}}}}}';
      expect(scanDos(nested).some(f => f.pattern_name === 'json_deep_nesting')).toBe(true);
    });
    it('should detect YAML anchor bomb', () => {
      expect(scanDos('&anchor a: 1\nb: *anchor\nc: *anchor').some(f => f.pattern_name === 'yaml_anchor_bomb')).toBe(true);
    });
  });

  describe('Resource Exhaustion Detection', () => {
    it('should detect zip bomb reference', () => {
      expect(scanDos('This is a zip bomb attack').some(f => f.pattern_name === 'zip_bomb_ref')).toBe(true);
    });
    it('should detect slowloris', () => {
      expect(scanDos('Slowloris connection exhaustion').some(f => f.pattern_name === 'slowloris_attack')).toBe(true);
    });
  });

  describe('Custom Detector', () => {
    it('should detect deeply nested structures via analysis', () => {
      const deep = '{'.repeat(15) + '"x":1' + '}'.repeat(15);
      const findings = detectResourceExhaustion(deep);
      expect(findings.some(f => f.pattern_name === 'deep_nesting_analysis')).toBe(true);
    });
    it('should detect repeated lines (context overflow)', () => {
      const repeated = ('Please repeat the following exactly\n').repeat(15);
      const findings = detectResourceExhaustion(repeated);
      expect(findings.some(f => f.pattern_name === 'context_overflow_repetition')).toBe(true);
    });
  });

  describe('Clean Content', () => {
    it('should not flag normal performance metrics', () => {
      expect(scanDos('CPU: 45%, Memory: 62%, Disk I/O: 120 MB/s')).toHaveLength(0);
    });
    it('should not flag simple JSON', () => {
      expect(scanDos('{"name": "test", "value": 42}')).toHaveLength(0);
    });
    it('should not flag normal text', () => {
      expect(scanDos('This is a normal message about system performance.')).toHaveLength(0);
    });
    it('should not flag clean monitoring data', () => {
      expect(scanDos('Requests per second: 850\nMean latency: 120ms\nError rate: 0.01%')).toHaveLength(0);
    });
  });
});
