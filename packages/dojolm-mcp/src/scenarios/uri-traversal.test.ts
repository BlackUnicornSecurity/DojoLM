import { describe, it, expect } from 'vitest';
import {
  URI_TRAVERSAL_SCENARIO,
  TRAVERSAL_TEST_URIS,
} from './uri-traversal.js';

describe('uri-traversal scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(URI_TRAVERSAL_SCENARIO.id).toBe('uri-traversal-01');
      expect(URI_TRAVERSAL_SCENARIO.name).toBe('Resource URI Traversal');
      expect(URI_TRAVERSAL_SCENARIO.type).toBe('uri-traversal');
      expect(URI_TRAVERSAL_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(URI_TRAVERSAL_SCENARIO.payloads)).toBe(true);
    });

    it('has at least 5 payload variants', () => {
      expect(URI_TRAVERSAL_SCENARIO.payloads.length).toBeGreaterThanOrEqual(5);
    });

    it('each payload has required fields', () => {
      for (const payload of URI_TRAVERSAL_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain URI traversal patterns', () => {
      for (const payload of URI_TRAVERSAL_SCENARIO.payloads) {
        expect(payload.content).toMatch(/file:\/\/\//);
      }
    });

    it('includes encoded and null-byte variants', () => {
      const contents = URI_TRAVERSAL_SCENARIO.payloads.map((p) => p.content);
      expect(contents.some((c) => c.includes('%2e'))).toBe(true);
      expect(contents.some((c) => c.includes('%00'))).toBe(true);
    });
  });

  describe('TRAVERSAL_TEST_URIS', () => {
    it('exports a non-empty readonly array', () => {
      expect(TRAVERSAL_TEST_URIS.length).toBeGreaterThanOrEqual(5);
    });

    it('all URIs start with file:///', () => {
      for (const uri of TRAVERSAL_TEST_URIS) {
        expect(uri).toMatch(/^file:\/\/\//);
      }
    });

    it('includes dot-dot traversal patterns', () => {
      const hasDotDot = TRAVERSAL_TEST_URIS.some(
        (uri) => uri.includes('..') || uri.includes('%2e%2e'),
      );
      expect(hasDotDot).toBe(true);
    });

    it('includes sensitive file targets', () => {
      const allUris = TRAVERSAL_TEST_URIS.join(' ');
      expect(allUris).toContain('passwd');
      expect(allUris).toContain('ssh');
    });
  });
});
