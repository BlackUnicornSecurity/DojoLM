/**
 * S18: SSRF Cloud Metadata Detector
 * Detects SSRF and cloud metadata access attempts.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const CLOUD_METADATA_PATTERNS: RegexPattern[] = [
  { name: 'aws_metadata_ipv4', cat: 'SSRF_CLOUD_METADATA', sev: SEVERITY.CRITICAL,
    re: /169\.254\.169\.254/, desc: 'AWS EC2 metadata endpoint (IPv4)', source: 'S18', weight: 10 },
  { name: 'aws_metadata_ipv6', cat: 'SSRF_CLOUD_METADATA', sev: SEVERITY.CRITICAL,
    re: /fd00:ec2::254/i, desc: 'AWS EC2 metadata endpoint (IPv6)', source: 'S18', weight: 10 },
  { name: 'gcp_metadata', cat: 'SSRF_CLOUD_METADATA', sev: SEVERITY.CRITICAL,
    re: /metadata\.google\.internal/i, desc: 'GCP metadata endpoint', source: 'S18', weight: 10 },
];

export const INTERNAL_IP_PATTERNS: RegexPattern[] = [
  { name: 'rfc1918_class_a', cat: 'SSRF_INTERNAL_IP', sev: SEVERITY.WARNING,
    re: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, desc: 'RFC1918 Class A private IP', source: 'S18', weight: 6 },
  { name: 'rfc1918_class_b', cat: 'SSRF_INTERNAL_IP', sev: SEVERITY.WARNING,
    re: /\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/, desc: 'RFC1918 Class B private IP (Docker/K8s range)', source: 'S18', weight: 6 },
  { name: 'rfc1918_class_c', cat: 'SSRF_INTERNAL_IP', sev: SEVERITY.WARNING,
    re: /\b192\.168\.\d{1,3}\.\d{1,3}\b/, desc: 'RFC1918 Class C private IP', source: 'S18', weight: 6 },
  { name: 'loopback_ipv4', cat: 'SSRF_INTERNAL_IP', sev: SEVERITY.WARNING,
    re: /\b127\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, desc: 'IPv4 loopback', source: 'S18', weight: 7 },
  { name: 'localhost_ref', cat: 'SSRF_INTERNAL_IP', sev: SEVERITY.INFO,
    re: /https?:\/\/localhost(?::\d+)?/i, desc: 'Localhost URL reference (potential SSRF)', source: 'S18', weight: 3 },
];

export const DNS_REBINDING_PATTERNS: RegexPattern[] = [
  { name: 'dns_rebinding_service', cat: 'SSRF_DNS_REBINDING', sev: SEVERITY.CRITICAL,
    re: /\b(?:rbndr|nip\.io|xip\.io|sslip\.io|1u\.ms)\b/i, desc: 'Known DNS rebinding service', source: 'S18', weight: 9 },
];

export const PROTOCOL_SMUGGLING_PATTERNS: RegexPattern[] = [
  { name: 'gopher_protocol', cat: 'SSRF_PROTOCOL_SMUGGLING', sev: SEVERITY.CRITICAL,
    re: /gopher:\/\/\S+/i, desc: 'Gopher protocol (SSRF)', source: 'S18', weight: 9 },
  { name: 'file_protocol', cat: 'SSRF_PROTOCOL_SMUGGLING', sev: SEVERITY.CRITICAL,
    re: /file:\/\/\/(?!workspace\/|home\/\w+\/Documents\/|Users\/\w+\/Documents\/)\S+/i, desc: 'File protocol for local file access', source: 'S18', weight: 9 },
  { name: 'dict_protocol', cat: 'SSRF_PROTOCOL_SMUGGLING', sev: SEVERITY.CRITICAL,
    re: /dict:\/\/\S+/i, desc: 'Dict protocol (SSRF port scanning)', source: 'S18', weight: 9 },
  { name: 'ldap_protocol', cat: 'SSRF_PROTOCOL_SMUGGLING', sev: SEVERITY.CRITICAL,
    re: /ldap:\/\/\S+/i, desc: 'LDAP protocol (SSRF)', source: 'S18', weight: 8 },
];

export function detectSsrfUrls(text: string): Finding[] {
  const findings: Finding[] = [];
  const urlRe = /(?:https?|ftp|gopher|file|dict|ldap|tftp):\/\/[^\s"'<>\])}]+/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    try {
      const url = new URL(m[0]);
      const host = url.hostname;
      const isInternal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
        || host === '169.254.169.254' || host === 'metadata.google.internal'
        || /^10\.\d+\.\d+\.\d+$/.test(host) || /^192\.168\.\d+\.\d+$/.test(host)
        || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host);
      if (isInternal) {
        findings.push({ category: 'SSRF_URL_TARGET', severity: host === '169.254.169.254' ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          description: `SSRF: URL targets internal host "${host}"`,
          match: m[0].slice(0, 100), source: 'S18', engine: 'SSRF',
          pattern_name: 'ssrf_url_target', weight: host === '169.254.169.254' ? 10 : 7 });
      }
    } catch { /* invalid URL */ }
  }
  return findings;
}

const SSRF_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: CLOUD_METADATA_PATTERNS, name: 'CLOUD_METADATA' },
  { patterns: INTERNAL_IP_PATTERNS, name: 'INTERNAL_IP' },
  { patterns: DNS_REBINDING_PATTERNS, name: 'DNS_REBINDING' },
  { patterns: PROTOCOL_SMUGGLING_PATTERNS, name: 'PROTOCOL_SMUGGLING' },
];
const SSRF_DETECTORS = [{ name: 'ssrf-urls', detect: detectSsrfUrls }];

const ssrfDetectorModule: ScannerModule = {
  name: 'ssrf-detector',
  version: '1.0.0',
  description: 'Detects SSRF and cloud metadata access attempts',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    const findings: Finding[] = [];
    for (const group of SSRF_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S18', engine: 'SSRF',
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    for (const d of SSRF_DETECTORS) { findings.push(...d.detect(text)); }
    return findings;
  },

  getPatternCount() {
    return SSRF_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0) + SSRF_DETECTORS.length;
  },

  getPatternGroups() {
    const groups = SSRF_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: 'S18' }));
    groups.push({ name: 'ssrf-detectors', count: SSRF_DETECTORS.length, source: 'S18' });
    return groups;
  },
};

scannerRegistry.register(ssrfDetectorModule);
export { ssrfDetectorModule };
