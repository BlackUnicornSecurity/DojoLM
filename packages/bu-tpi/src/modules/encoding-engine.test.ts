import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { encodingEngineModule, detectMultiLayerEncoding, detectRot13 } from './encoding-engine.js';
import type { Finding } from '../types.js';

function scanEnc(t: string): Finding[] { return encodingEngineModule.scan(t, t); }

describe('encoding-engine', () => {
  it('should be registered', () => { expect(scannerRegistry.hasModule('encoding-engine')).toBe(true); });
  it('should have positive pattern count', () => { expect(encodingEngineModule.getPatternCount()).toBeGreaterThan(0); });

  describe('Encoding Detection', () => {
    it('should detect URL encoding', () => {
      expect(scanEnc('%3C%73%63%72%69%70%74%3E').some(f => f.pattern_name === 'url-encoding-sequence')).toBe(true);
    });
    it('should detect HTML hex entities', () => {
      expect(scanEnc('&#x3C;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3E;').some(f => f.pattern_name === 'html-hex-entity')).toBe(true);
    });
    it('should detect HTML decimal entities', () => {
      expect(scanEnc('&#60;&#115;&#99;&#114;&#105;&#112;&#116;&#62;').some(f => f.pattern_name === 'html-decimal-entity')).toBe(true);
    });
    it('should detect unicode escapes', () => {
      expect(scanEnc('\\u003C\\u0073\\u0063\\u0072\\u0069\\u0070\\u0074\\u003E').some(f => f.pattern_name === 'unicode-escape')).toBe(true);
    });
    it('should detect hex escapes', () => {
      expect(scanEnc('\\x3C\\x73\\x63\\x72\\x69\\x70\\x74\\x3E').some(f => f.pattern_name === 'hex-escape')).toBe(true);
    });
  });

  describe('Mixed Encoding', () => {
    it('should detect mixed URL+Unicode', () => {
      expect(scanEnc('%3Cscript%3E\\u0061\\u006C').some(f => f.pattern_name === 'mixed-url-unicode')).toBe(true);
    });
  });

  describe('Multi-Layer Decoder', () => {
    it('should decode URL-encoded payloads', () => {
      const f = detectMultiLayerEncoding('%3Cscript%3Ealert(1)');
      expect(f.length).toBeGreaterThanOrEqual(1);
      expect(f[0].pattern_name).toBe('multi-layer-encoding');
    });
    it('should decode hex-encoded payloads', () => {
      const f = detectMultiLayerEncoding('\\x3C\\x73\\x63\\x72\\x69\\x70\\x74\\x3E');
      expect(f.length).toBeGreaterThanOrEqual(1);
    });
    it('should respect depth/timeout limits', () => {
      let payload = 'alert(1)';
      for (let i = 0; i < 20; i++) payload = encodeURIComponent(payload);
      const start = Date.now();
      detectMultiLayerEncoding(payload);
      expect(Date.now() - start).toBeLessThan(500);
    });
  });

  describe('ROT13 Detector', () => {
    it('should detect ROT13-encoded keywords', () => {
      const f = detectRot13('nyreg(1)'); // "alert" in ROT13
      expect(f.length).toBe(1);
      expect(f[0].pattern_name).toBe('rot13-encoded-injection');
    });
    it('should not flag normal text', () => {
      expect(detectRot13('The quick brown fox')).toHaveLength(0);
    });
  });

  describe('Clean Content', () => {
    it('should not flag normal text', () => { expect(scanEnc('Hello world, normal text.')).toHaveLength(0); });
  });
});
