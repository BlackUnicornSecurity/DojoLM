/**
 * URL Validator Tests
 * Tests for: isInternalIP, validateSourceURL
 */

import { describe, it, expect } from 'vitest';
import { isInternalIP, validateSourceURL } from './url-validator.js';

describe('URL Validator', () => {
  describe('isInternalIP', () => {
    // UV-001
    it('UV-001: detects RFC1918 10.x.x.x addresses', () => {
      expect(isInternalIP('10.0.0.1')).toBe(true);
      expect(isInternalIP('10.255.255.255')).toBe(true);
    });

    // UV-002
    it('UV-002: detects RFC1918 172.16-31.x.x addresses', () => {
      expect(isInternalIP('172.16.0.1')).toBe(true);
      expect(isInternalIP('172.31.255.255')).toBe(true);
      expect(isInternalIP('172.15.0.1')).toBe(false);
      expect(isInternalIP('172.32.0.1')).toBe(false);
    });

    // UV-003
    it('UV-003: detects RFC1918 192.168.x.x addresses', () => {
      expect(isInternalIP('192.168.0.1')).toBe(true);
      expect(isInternalIP('192.168.1.100')).toBe(true);
    });

    // UV-004
    it('UV-004: detects localhost addresses', () => {
      expect(isInternalIP('127.0.0.1')).toBe(true);
      expect(isInternalIP('127.0.0.2')).toBe(true);
      expect(isInternalIP('::1')).toBe(true);
      expect(isInternalIP('0:0:0:0:0:0:0:1')).toBe(true);
    });

    // UV-005
    it('UV-005: detects link-local addresses', () => {
      expect(isInternalIP('169.254.1.1')).toBe(true);
      expect(isInternalIP('fe80::1')).toBe(true);
    });

    // UV-006
    it('UV-006: detects multicast addresses', () => {
      expect(isInternalIP('224.0.0.1')).toBe(true);
      expect(isInternalIP('239.255.255.255')).toBe(true);
      expect(isInternalIP('ff02::1')).toBe(true);
    });

    // UV-007
    it('UV-007: detects broadcast and null addresses', () => {
      expect(isInternalIP('255.255.255.255')).toBe(true);
      expect(isInternalIP('0.0.0.0')).toBe(true);
      expect(isInternalIP('::')).toBe(true);
    });

    // UV-008
    it('UV-008: detects cloud metadata endpoint', () => {
      expect(isInternalIP('169.254.169.254')).toBe(true);
    });

    // UV-009
    it('UV-009: returns false for public IP addresses', () => {
      expect(isInternalIP('8.8.8.8')).toBe(false);
      expect(isInternalIP('1.1.1.1')).toBe(false);
      expect(isInternalIP('203.0.113.1')).toBe(false);
    });
  });

  describe('validateSourceURL', () => {
    // UV-010
    it('UV-010: accepts valid HTTPS URLs', () => {
      const result = validateSourceURL('https://feeds.example.com/rss');
      expect(result.valid).toBe(true);
    });

    // UV-011
    it('UV-011: rejects invalid URL format', () => {
      const result = validateSourceURL('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid URL');
    });

    // UV-012
    it('UV-012: rejects HTTP (non-HTTPS) URLs', () => {
      const result = validateSourceURL('http://example.com/feed');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    // UV-013
    it('UV-013: rejects localhost URLs', () => {
      expect(validateSourceURL('https://localhost/feed').valid).toBe(false);
      expect(validateSourceURL('https://127.0.0.1/feed').valid).toBe(false);
    });

    // UV-014
    it('UV-014: rejects internal IP addresses', () => {
      expect(validateSourceURL('https://10.0.0.1/feed').valid).toBe(false);
      expect(validateSourceURL('https://192.168.1.1/feed').valid).toBe(false);
    });

    // UV-015
    it('UV-015: rejects URLs with blocked domain keywords', () => {
      expect(validateSourceURL('https://internal.corp.com/feed').valid).toBe(false);
      expect(validateSourceURL('https://intranet.example.com/feed').valid).toBe(false);
    });

    // UV-016
    it('UV-016: enforces domain allowlist when configured', () => {
      const allowlist = { domains: ['trusted.com'], protocols: ['https'] };
      expect(validateSourceURL('https://trusted.com/feed', allowlist).valid).toBe(true);
      expect(validateSourceURL('https://untrusted.com/feed', allowlist).valid).toBe(false);
    });

    // UV-017
    it('UV-017: allows subdomains of allowlisted domains', () => {
      const allowlist = { domains: ['trusted.com'], protocols: ['https'] };
      const result = validateSourceURL('https://feeds.trusted.com/rss', allowlist);
      expect(result.valid).toBe(true);
    });

    // UV-018
    it('UV-018: rejects non-allowed protocols when protocol list is set', () => {
      const allowlist = { domains: [], protocols: ['https'] };
      const result = validateSourceURL('ftp://example.com/feed', allowlist);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Protocol');
    });

    // UV-019
    it('UV-019: rejects metadata.google.internal domain', () => {
      const result = validateSourceURL('https://metadata.google.internal/v1');
      expect(result.valid).toBe(false);
    });

    // UV-020
    it('UV-020: rejects instance-data domain', () => {
      const result = validateSourceURL('https://instance-data.example.com/meta');
      expect(result.valid).toBe(false);
    });
  });
});
