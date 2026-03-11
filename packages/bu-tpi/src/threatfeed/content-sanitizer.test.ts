/**
 * Content Sanitizer Tests
 * Tests for: stripXMLEntities, stripScriptTags, stripControlCharacters,
 * normalizeWhitespace, sanitizeContent
 */

import { describe, it, expect } from 'vitest';
import {
  stripXMLEntities,
  stripScriptTags,
  stripControlCharacters,
  normalizeWhitespace,
  sanitizeContent,
} from './content-sanitizer.js';
import { MAX_INPUT_LENGTH } from './types.js';

describe('Content Sanitizer', () => {
  describe('stripXMLEntities', () => {
    // CS-001
    it('CS-001: removes DOCTYPE declarations', () => {
      const xml = '<!DOCTYPE foo SYSTEM "bar"><root>content</root>';
      const result = stripXMLEntities(xml);
      expect(result).not.toContain('DOCTYPE');
      expect(result).toContain('<root>content</root>');
    });

    // CS-002
    it('CS-002: removes DOCTYPE with inline entity definitions', () => {
      const xml = '<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><data>&xxe;</data>';
      const result = stripXMLEntities(xml);
      expect(result).not.toContain('DOCTYPE');
      expect(result).not.toContain('ENTITY');
      expect(result).not.toContain('&xxe;');
    });

    // CS-003
    it('CS-003: preserves standard XML entities', () => {
      const xml = '<data>&amp; &lt; &gt; &quot; &apos;</data>';
      const result = stripXMLEntities(xml);
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
    });

    // CS-004
    it('CS-004: removes SYSTEM and PUBLIC references', () => {
      const xml = 'SYSTEM "http://evil.com/dtd" PUBLIC "foo" "bar" <data/>';
      const result = stripXMLEntities(xml);
      expect(result).not.toContain('SYSTEM');
      expect(result).not.toContain('PUBLIC');
    });

    // CS-005
    it('CS-005: removes CDATA sections', () => {
      const xml = '<data><![CDATA[hidden content]]></data>';
      const result = stripXMLEntities(xml);
      expect(result).not.toContain('CDATA');
      expect(result).not.toContain(']]>');
    });

    // CS-006
    it('CS-006: removes processing instructions (non-xml)', () => {
      const xml = '<?xml version="1.0"?><?php echo "evil"; ?><data/>';
      const result = stripXMLEntities(xml);
      expect(result).not.toContain('<?php');
      expect(result).toContain('<?xml');
    });

    // CS-007
    it('CS-007: returns empty string for oversized input', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      expect(stripXMLEntities(oversized)).toBe('');
    });
  });

  describe('stripScriptTags', () => {
    // CS-008
    it('CS-008: removes script tags and their content', () => {
      const html = '<p>Hello</p><script>alert("xss")</script><p>World</p>';
      const result = stripScriptTags(html);
      expect(result).not.toContain('script');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('<p>World</p>');
    });

    // CS-009
    it('CS-009: removes event handlers from attributes', () => {
      const html = '<div onclick="alert(1)" onmouseover="hack()">content</div>';
      const result = stripScriptTags(html);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).toContain('content');
    });

    // CS-010
    it('CS-010: removes javascript: protocol', () => {
      const html = '<a href="javascript:alert(1)">click</a>';
      const result = stripScriptTags(html);
      expect(result).not.toMatch(/javascript\s*:/i);
    });

    // CS-011
    it('CS-011: removes data: protocol in src/href', () => {
      const html = '<img src="data:image/svg+xml,<svg onload=alert(1)>">';
      const result = stripScriptTags(html);
      expect(result).not.toContain('data:');
    });

    // CS-012
    it('CS-012: removes iframe tags', () => {
      const html = '<iframe src="http://evil.com"></iframe><iframe />';
      const result = stripScriptTags(html);
      expect(result).not.toContain('iframe');
    });

    // CS-013
    it('CS-013: removes object and embed tags', () => {
      const html = '<object data="evil.swf"></object><embed src="evil.swf"/>';
      const result = stripScriptTags(html);
      expect(result).not.toContain('object');
      expect(result).not.toContain('embed');
    });

    // CS-014
    it('CS-014: returns empty string for oversized input', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      expect(stripScriptTags(oversized)).toBe('');
    });
  });

  describe('stripControlCharacters', () => {
    // CS-015
    it('CS-015: removes C0 control characters except tab/newline/CR', () => {
      const text = 'Hello\x00\x01\x02World\tOK\n';
      const result = stripControlCharacters(text);
      expect(result).toBe('HelloWorld\tOK\n');
    });

    // CS-016
    it('CS-016: removes C1 control characters', () => {
      const text = 'Test\x80\x8F\x9Fcontent';
      const result = stripControlCharacters(text);
      expect(result).toBe('Testcontent');
    });

    // CS-017
    it('CS-017: removes zero-width characters', () => {
      const text = 'Test\u200B\u200F\uFEFFcontent';
      const result = stripControlCharacters(text);
      expect(result).toBe('Testcontent');
    });

    // CS-018
    it('CS-018: returns empty for oversized input', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      expect(stripControlCharacters(oversized)).toBe('');
    });
  });

  describe('normalizeWhitespace', () => {
    // CS-019
    it('CS-019: normalizes CRLF and CR to LF', () => {
      expect(normalizeWhitespace('a\r\nb\rc')).toBe('a\nb\nc');
    });

    // CS-020
    it('CS-020: collapses excessive spaces and newlines', () => {
      expect(normalizeWhitespace('a     b')).toBe('a  b');
      expect(normalizeWhitespace('a\n\n\n\n\nb')).toBe('a\n\n\nb');
    });

    // CS-021
    it('CS-021: converts tabs to double spaces', () => {
      expect(normalizeWhitespace('\tindented')).toBe('  indented');
    });

    // CS-022
    it('CS-022: returns empty for oversized input', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      expect(normalizeWhitespace(oversized)).toBe('');
    });
  });

  describe('sanitizeContent', () => {
    // CS-023
    it('CS-023: runs full pipeline and tracks removed elements', () => {
      const dirty = '<!DOCTYPE foo><script>alert(1)</script>\x00Hello';
      const result = sanitizeContent(dirty);
      expect(result.sanitized).not.toContain('DOCTYPE');
      expect(result.sanitized).not.toContain('script');
      expect(result.sanitized).not.toContain('\x00');
      expect(result.removedElements).toContain('XML entities/DTD');
      expect(result.removedElements).toContain('Script tags/event handlers');
      expect(result.removedElements).toContain('Control characters');
    });

    // CS-024
    it('CS-024: returns empty with error message for oversized content', () => {
      const oversized = 'x'.repeat(MAX_INPUT_LENGTH + 1);
      const result = sanitizeContent(oversized);
      expect(result.sanitized).toBe('');
      expect(result.removedElements).toContain('Content exceeds maximum length');
    });

    // CS-025
    it('CS-025: clean content passes through without removedElements', () => {
      const clean = 'This is clean content with no malicious elements.';
      const result = sanitizeContent(clean);
      expect(result.sanitized).toContain('This is clean content');
      expect(result.removedElements).toHaveLength(0);
    });
  });
});
