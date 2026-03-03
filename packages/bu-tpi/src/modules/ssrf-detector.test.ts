import { describe, it, expect } from 'vitest';
import { scannerRegistry } from './registry.js';
import { ssrfDetectorModule, detectSsrfUrls } from './ssrf-detector.js';
import type { Finding } from '../types.js';

function scanSsrf(t: string): Finding[] { return ssrfDetectorModule.scan(t, t); }

describe('ssrf-detector', () => {
  it('should be registered', () => { expect(scannerRegistry.hasModule('ssrf-detector')).toBe(true); });
  it('should have positive pattern count', () => { expect(ssrfDetectorModule.getPatternCount()).toBeGreaterThan(0); });

  describe('Cloud Metadata', () => {
    it('should detect AWS metadata', () => {
      expect(scanSsrf('curl http://169.254.169.254/latest/meta-data/').some(f => f.pattern_name === 'aws_metadata_ipv4')).toBe(true);
    });
    it('should detect GCP metadata', () => {
      expect(scanSsrf('GET http://metadata.google.internal/computeMetadata/v1/').some(f => f.pattern_name === 'gcp_metadata')).toBe(true);
    });
  });

  describe('Internal IPs', () => {
    it('should detect RFC1918 Class A', () => {
      expect(scanSsrf('http://10.0.0.1:8080/admin').some(f => f.pattern_name === 'rfc1918_class_a')).toBe(true);
    });
    it('should detect RFC1918 Class C', () => {
      expect(scanSsrf('http://192.168.1.1/config').some(f => f.pattern_name === 'rfc1918_class_c')).toBe(true);
    });
    it('should detect loopback', () => {
      expect(scanSsrf('http://127.0.0.1:3000/debug').some(f => f.pattern_name === 'loopback_ipv4')).toBe(true);
    });
  });

  describe('DNS Rebinding', () => {
    it('should detect rebinding services', () => {
      expect(scanSsrf('resolve attacker.nip.io').some(f => f.pattern_name === 'dns_rebinding_service')).toBe(true);
    });
  });

  describe('Protocol Smuggling', () => {
    it('should detect gopher', () => {
      expect(scanSsrf('url=gopher://host:25/xHELO').some(f => f.pattern_name === 'gopher_protocol')).toBe(true);
    });
    it('should detect file protocol', () => {
      expect(scanSsrf('load file:///etc/passwd').some(f => f.pattern_name === 'file_protocol')).toBe(true);
    });
  });

  describe('URL Detector', () => {
    it('should detect SSRF to internal IP', () => {
      const f = detectSsrfUrls('fetch("http://10.0.0.5:8080/admin")');
      expect(f.some(x => x.pattern_name === 'ssrf_url_target')).toBe(true);
    });
    it('should not flag external URLs', () => {
      expect(detectSsrfUrls('fetch("http://8.8.8.8/dns")')).toHaveLength(0);
    });
  });

  describe('Clean Content', () => {
    it('should not flag normal text', () => {
      expect(scanSsrf('Visit https://example.com for more info')).toHaveLength(0);
    });
  });
});
