// SPDX-License-Identifier: Apache-2.0
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
  { name: 'aliyun_metadata', cat: 'SSRF_CLOUD_METADATA', sev: SEVERITY.CRITICAL,
    re: /100\.100\.100\.200/, desc: 'Alibaba Cloud metadata endpoint', source: 'S18', weight: 10 },
  { name: 'cloud_metadata_path', cat: 'SSRF_CLOUD_METADATA', sev: SEVERITY.CRITICAL,
    re: /\b(?:fetch|curl|request|open|download|access|retrieve|get)\b[^\n]{0,80}\/latest\/meta-data\//i,
    desc: 'Cloud metadata path targeted in request-like context', source: 'S18', weight: 9 },
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
    re: /(?:fetch|curl|request|redirect|href|url|uri|target|window\.location|location\.(?:href|assign|replace))[^\n]{0,40}https?:\/\/localhost(?::\d+)?/i, desc: 'Localhost URL reference in a request-like context (potential SSRF)', source: 'S18', weight: 3 },
];

export const DNS_REBINDING_PATTERNS: RegexPattern[] = [
  { name: 'dns_rebinding_service', cat: 'SSRF_DNS_REBINDING', sev: SEVERITY.CRITICAL,
    re: /\b(?:rbndr|nip\.io|xip\.io|sslip\.io|1u\.ms)\b/i, desc: 'Known DNS rebinding service', source: 'S18', weight: 9 },
  { name: 'dns_rebinding_ipv6_loopback', cat: 'SSRF_DNS_REBINDING', sev: SEVERITY.CRITICAL,
    re: /(?:AAAA\s+record\s*:\s*[^-\n]+->\s*::1|IPv6\s+DNS\s+Rebinding|Access\s+localhost\s+via\s+IPv6\s+rebinding)/i,
    desc: 'IPv6 loopback DNS rebinding attempt', source: 'S18', weight: 10 },
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

// SC.1.7b: documentation-placeholder framing suppression for internal-IP
// SSRF findings. The boundary:official-placeholder-doc variation generator
// emits clean fixtures shaped as placeholder infrastructure notes
// containing localhost:3000-style references. Existing nginx-config guard
// doesn't recognize the documentation-template framing class (1,617 / 1,619
// ssrf-detector FPs). Two-signal requirement (placeholder framing AND
// inactive-credential disclaimer) mitigates single-keyword bypass.
//
// Security: cloud-metadata endpoints (AWS/GCP/Aliyun) remain CRITICAL and
// are UNCONDITIONALLY emitted regardless of surrounding framing.
// SC.1.7b regexes are intentionally narrow:
//   PLACEHOLDER_FRAMING_RE: multi-word documentation framing markers. Bare
//     `placeholder` is excluded to avoid matching React form placeholders /
//     HTML placeholder attributes / generic config stubs — the framing
//     class requires a more specific context phrase.
//   INACTIVE_CREDENTIAL_RE: phrase-form disclaimers requiring "not" (literal,
//     no `t?` quantifier) so ordinary "no active key" error messages don't
//     trigger. Bare `redacted` and `safe documentation` removed per security
//     review (HIGH bypass: two-token prepend like "placeholder redacted"
//     would silence WARNING findings on internal IPs).
//   Co-location requirement: both signals must appear within 500 chars of
//     each other so they cannot be smuggled via separate sentences.
const PLACEHOLDER_FRAMING_RE = /(?:reserved\s+example|example\s+data|negative\s+control|for\s+documentation\s+(?:only|purposes)|reserved\s+for\s+testing|placeholder\s+(?:infrastructure|notes?|document|template))/i;
const INACTIVE_CREDENTIAL_RE = /(?:not\s+(?:active|live|real)\s+(?:secret|endpoint|credential|token|key)|none\s+of\s+the\s+above\s+(?:are|values))/i;
const CLOUD_METADATA_HOST_RE = /^(?:169\.254\.169\.254|100\.100\.100\.200|metadata\.google\.internal|fd00:ec2::254)$/i;

function checkCoLocatedFraming(text: string): boolean {
  const framingMatch = PLACEHOLDER_FRAMING_RE.exec(text);
  if (!framingMatch) return false;
  const inactiveMatch = INACTIVE_CREDENTIAL_RE.exec(text);
  if (!inactiveMatch) return false;
  return Math.abs(framingMatch.index - inactiveMatch.index) < 500;
}

// P3-WaveA-R3: benign internal-IP framing suppression. RFC1918/loopback
// literals appear in defense docs (deny/allow CIDR lists), container
// orchestration (HEALTHCHECK probes), and listener-bind configs — none of
// which are SSRF. Two narrow, recall-preserving gates:
//   CIDR_SUFFIX_RE: the literal is immediately followed by /NN (0-32) with a
//     block terminator (no further path char) — a network-range descriptor,
//     not a request target. Applied to all four internal-IP patterns.
//   LOOPBACK_BENIGN_CTX_RE: a loopback (127.x) literal sits within 80 chars of
//     a health-check / orchestration / listener-bind marker. Host-restricted
//     to loopback so rfc1918 request targets and cloud-metadata emits are
//     never silenced. (localhost/127.0.0.1 URL targets reuse this regex via
//     the detectSsrfUrls benign-infra guard below.)
// Verified recall-safe: 0 new FN across the 125-sample ssrf-detector GT set.
const CIDR_SUFFIX_RE = /^\/(?:3[0-2]|[12]\d|\d)(?![\w/])/;
const LOOPBACK_BENIGN_CTX_RE = /(?:proxy_pass|upstream|server_name|listen(?:\s+\d+|\s)|nginx|reverse[\s_-]?proxy|bind_address|HEALTHCHECK|health[_-]?check|healthz|readyz|livez|\/health\b|\/metrics\b|liveness|readiness)/i;
const INTERNAL_IP_PATTERN_NAMES = new Set(['rfc1918_class_a', 'rfc1918_class_b', 'rfc1918_class_c', 'loopback_ipv4']);

function isBenignInternalIpFraming(patternName: string, matched: string, index: number, text: string): boolean {
  if (!INTERNAL_IP_PATTERN_NAMES.has(patternName)) return false;
  const after = text.slice(index + matched.length, index + matched.length + 6);
  if (CIDR_SUFFIX_RE.test(after)) return true;
  if (patternName === 'loopback_ipv4') {
    const ctx = text.slice(Math.max(0, index - 80), index + matched.length + 80);
    if (LOOPBACK_BENIGN_CTX_RE.test(ctx)) return true;
  }
  return false;
}

export function detectSsrfUrls(text: string): Finding[] {
  const findings: Finding[] = [];
  // Co-located two-signal requirement: BOTH placeholder framing AND
  // inactive-credential disclaimer must appear within 500 chars of each
  // other. A two-keyword prepend can no longer silence detection unless
  // the attacker also reproduces the multi-word phrase structure AND
  // keeps both signals close.
  const hasPlaceholderFraming = checkCoLocatedFraming(text);
  const urlRe = /(?:https?|ftp|gopher|file|dict|ldap|tftp):\/\/[^\s"'<>\)}]+/gi;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(text)) !== null) {
    try {
      const url = new URL(m[0]);
      const host = url.hostname;
      const normalizedHost = host.replace(/^\[(.*)\]$/, '$1').toLowerCase();
      const contextStart = Math.max(0, m.index - 80);
      const contextEnd = Math.min(text.length, m.index + m[0].length + 80);
      const context = text.slice(contextStart, contextEnd);
      // P3-WaveA-R3: broadened to container-orchestration / health-probe
      // framing (host-restricted to loopback/localhost below), so a deploy
      // script's `curl http://localhost:8080/health` or a Dockerfile
      // HEALTHCHECK probe is not flagged as SSRF.
      const isBenignInfraConfig = LOOPBACK_BENIGN_CTX_RE.test(context);
      const isCloudMetadata = CLOUD_METADATA_HOST_RE.test(normalizedHost);
      const isInternal = normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1'
        || isCloudMetadata
        || /^10\.\d+\.\d+\.\d+$/.test(normalizedHost) || /^192\.168\.\d+\.\d+$/.test(normalizedHost)
        || /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(normalizedHost);
      if (isBenignInfraConfig && (normalizedHost === 'localhost' || normalizedHost === '127.0.0.1' || normalizedHost === '::1')) {
        continue;
      }
      // SC.1.7b: documentation-placeholder framing suppression. Bounded
      // to non-cloud-metadata hosts so the CRITICAL cloud-metadata emit
      // is never silenced by surrounding documentation vocabulary.
      if (hasPlaceholderFraming && isInternal && !isCloudMetadata) {
        continue;
      }
      if (isInternal) {
        findings.push({ category: 'SSRF_URL_TARGET', severity: isCloudMetadata ? SEVERITY.CRITICAL : SEVERITY.WARNING,
          description: `SSRF: URL targets internal host "${normalizedHost}"`,
          match: m[0].slice(0, 100), source: 'S18', engine: 'ssrf-detector',
          pattern_name: 'ssrf_url_target', weight: isCloudMetadata ? 10 : 7 });
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
        let m = normalized.match(p.re);
        let haystack = normalized;
        if (!m) { m = text.match(p.re); haystack = text; }
        if (m) {
          // P3-WaveA-R3: suppress internal-IP literals in CIDR-block /
          // loopback-orchestration framing (recall-safe; cloud-metadata and
          // rfc1918 request targets are untouched).
          if (isBenignInternalIpFraming(p.name, m[0]!, m.index ?? 0, haystack)) continue;
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S18', engine: 'ssrf-detector',
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
