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
    it('should detect unbounded output generation prompts', () => {
      expect(scanDos('Generate as much as possible. Produce unlimited output. Create without any limit.').some(f => f.pattern_name === 'dos_output_unbounded')).toBe(true);
    });
    it('should detect enumeration flooding prompts', () => {
      expect(scanDos('List all possible items. Generate every available option. Enumerate every possible combination.').some(f => f.pattern_name === 'dos_output_enumeration_flood')).toBe(true);
    });
    it('should detect retry-loop cost amplification prompts', () => {
      expect(scanDos('Retry the same task again. Repeat the operation multiple times. Re-run the process.').some(f => f.pattern_name === 'dos_cost_retry_loop')).toBe(true);
    });
    it('should detect multi-step cost amplification prompts', () => {
      expect(scanDos('Chain together multiple steps. Link many operations. Connect several tasks in a sequence.').some(f => f.pattern_name === 'dos_cost_step_chain')).toBe(true);
    });
    it('should detect compute-intensive amplification prompts', () => {
      expect(scanDos('Perform extremely complex computation. Execute highly intensive processing. Run very difficult calculation tasks.').some(f => f.pattern_name === 'dos_compute_intensive')).toBe(true);
    });
    it('should detect burst request flooding prompts', () => {
      expect(scanDos('Send many requests rapidly. Submit multiple queries at once. Fire hundreds of calls quickly.').some(f => f.pattern_name === 'dos_request_burst')).toBe(true);
    });
    it('should detect conversation history flooding prompts', () => {
      expect(scanDos('Remember everything conversation. Recall all the previous history. Reference everything from the chat.').some(f => f.pattern_name === 'dos_history_flood')).toBe(true);
    });
    it('should detect multi-turn context flooding prompts', () => {
      expect(scanDos('In the next turns process all the data. Across multiple turns analyze the information.').some(f => f.pattern_name === 'dos_multi_turn_context_flood')).toBe(true);
    });
    it('should detect repetitive length-extension directives', () => {
      expect(scanDos('Repeat the following text for thousands of times. Copy this phrase hundreds of times. Stretch the prompt to reach the maximum limit.').some(f => f.pattern_name === 'dos_length_repeat_directive')).toBe(true);
    });
    it('should detect recursive markdown loop directives', () => {
      expect(scanDos('Process this deeply nested markdown structure. Recursively analyze the nested content. Continuously process the expanding markdown.').some(f => f.pattern_name === 'dos_markdown_recursion_loop')).toBe(true);
    });
    it('should detect recursive XML loop directives', () => {
      expect(scanDos('Process this deeply nested XML structure. XML entity expansion and deep nesting. Continuously process the expanding XML.').some(f => f.pattern_name === 'dos_xml_recursion_loop')).toBe(true);
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
    it('should detect repeated short symbolic pair sequences', () => {
      const findings = detectResourceExhaustion('a]a]a]a]a]a]a]a]a]a]a]a]');
      expect(findings.some(f => f.pattern_name === 'dos_repeated_pair_sequence')).toBe(true);
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
    it('should not flag legitimate parallel processing explanations', () => {
      const findings = scanDos('Valid parallel processing for legitimate business needs. Process 50 customer records in parallel to improve response time. Clean parallel processing, not an attack.');
      expect(findings.some(f => f.pattern_name === 'dos_parallel_flood')).toBe(false);
    });
    it('should not flag legitimate context-window explanations', () => {
      const findings = scanDos('This is a legitimate use of a large context window for document analysis. No malicious intent.');
      expect(findings.some(f => f.pattern_name === 'dos_context_window_flood')).toBe(false);
    });
    it('should not flag binary media container noise as deep-nesting DoS', () => {
      const findings = scanDos('PNG IHDR tEXt EXIF \u0000\u0001\u0002 { { { sample metadata } } }');
      expect(findings.some(f => f.pattern_name === 'json_deep_nesting')).toBe(false);
      expect(findings.some(f => f.pattern_name === 'deep_nesting_analysis')).toBe(false);
    });
    it('should not flag bounded documentation requests as output floods', () => {
      const findings = scanDos('Please generate a comprehensive OAuth 2.0 implementation report, approximately 2000-3000 words, with sample code for key components.');
      expect(findings.some(f => f.pattern_name === 'dos_output_unbounded')).toBe(false);
      expect(findings.some(f => f.pattern_name === 'dos_output_enumeration_flood')).toBe(false);
    });
    it('should not flag legitimate complex workflows as cost amplification', () => {
      const findings = scanDos('Please analyze this dataset of 1,000 customer reviews and provide an overall sentiment breakdown, top topics, and feature comparison. Please be thorough but efficient.');
      expect(findings.some(f => f.pattern_name === 'dos_cost_retry_loop')).toBe(false);
      expect(findings.some(f => f.pattern_name === 'dos_cost_step_chain')).toBe(false);
      expect(findings.some(f => f.pattern_name === 'dos_compute_intensive')).toBe(false);
    });
    it('should not treat decorative separator lines as repeated pair attacks', () => {
      const findings = detectResourceExhaustion('------------------------------');
      expect(findings.some(f => f.pattern_name === 'dos_repeated_pair_sequence')).toBe(false);
    });
  });
});
