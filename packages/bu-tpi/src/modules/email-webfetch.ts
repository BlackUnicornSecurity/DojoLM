/**
 * S20: Email/MIME Parser + WebFetch Analyzer
 * Detects injections via email/MIME messages and web-fetched content.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

export const EMAIL_HEADER_PATTERNS: RegexPattern[] = [
  { name: 'email-header-injection', cat: 'EMAIL_HEADER_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:From|To|CC|BCC|Subject|Reply-To)\s*:\s*[^\n]*(?:\r?\n\s+){2,}[^\n]*(?:ignore|override|system\s+prompt)/i,
    desc: 'Email header injection with folded header manipulation', source: 'S20', weight: 9 },
  { name: 'email-cc-bcc-inject', cat: 'EMAIL_HEADER_INJECTION', sev: SEVERITY.CRITICAL,
    re: /(?:Subject|From|To)\s*:.*\r?\n(?:CC|BCC)\s*:\s*[^\n]+/i,
    desc: 'Email CC/BCC injection via header line break', source: 'S20', weight: 9 },
  { name: 'email-subject-injection', cat: 'EMAIL_HEADER_INJECTION', sev: SEVERITY.WARNING,
    re: /Subject\s*:\s*[^\n]*(?:ignore|override|disregard|bypass)\s+(?:all\s+)?(?:previous|prior)\s+(?:instructions|rules)/i,
    desc: 'Injection keywords in email Subject header', source: 'S20', weight: 7 },
];

export const MIME_PATTERNS: RegexPattern[] = [
  { name: 'mime-content-type-mismatch', cat: 'MIME_MANIPULATION', sev: SEVERITY.WARNING,
    re: /Content-Type\s*:\s*(?:text\/html|application\/javascript)[^\n]*\r?\n[^\n]{0,500}(?:ignore|override|system\s+prompt)/i,
    desc: 'Injection in MIME part with executable content type', source: 'S20', weight: 7 },
  { name: 'mime-hidden-part', cat: 'MIME_MANIPULATION', sev: SEVERITY.WARNING,
    re: /Content-Disposition\s*:\s*(?:inline|attachment)\s*;[^\n]*\r?\n[^\n]{0,200}(?:ignore|override|system\s+prompt)/i,
    desc: 'Injection in hidden MIME attachment/inline part', source: 'S20', weight: 7 },
];

export const WEBFETCH_RESPONSE_PATTERNS: RegexPattern[] = [
  { name: 'webfetch-content-type-mismatch', cat: 'WEBFETCH_MANIPULATION', sev: SEVERITY.WARNING,
    re: /Content-Type\s*:\s*(?:text\/plain|application\/json)[^\n]*[\s\S]{0,200}?<\s*script/i,
    desc: 'Content-Type mismatch: script in non-script response', source: 'S20', weight: 8 },
  { name: 'webfetch-redirect-chain', cat: 'WEBFETCH_MANIPULATION', sev: SEVERITY.WARNING,
    re: /(?:Location|Refresh)\s*:\s*https?:\/\/[^\n]+(?:\r?\n[^\n]*){0,10}(?:Location|Refresh)\s*:\s*https?:\/\/[^\n]+(?:\r?\n[^\n]*){0,10}(?:Location|Refresh)\s*:/i,
    desc: 'Excessive redirect chain detected (3+ redirects)', source: 'S20', weight: 7 },
  { name: 'webfetch-script-injection', cat: 'WEBFETCH_INJECTION', sev: SEVERITY.CRITICAL,
    re: /<\s*script\b[^>]*>[^<]{0,500}(?:ignore|override|system\s+prompt|disregard)/i,
    desc: 'Script tag with injection payload in web content', source: 'S20', weight: 9 },
  { name: 'webfetch-data-uri', cat: 'WEBFETCH_INJECTION', sev: SEVERITY.WARNING,
    re: /(?:src|href|action)\s*=\s*["']data:(?:text\/html|application\/javascript)[^"']+["']/i,
    desc: 'Data URI with executable content type', source: 'S20', weight: 8 },
  { name: 'webfetch-event-handler', cat: 'WEBFETCH_INJECTION', sev: SEVERITY.WARNING,
    re: /\bon(?:load|error|click|mouseover|focus|blur)\s*=\s*["'][^"']*(?:ignore|override|system|prompt)/i,
    desc: 'HTML event handler with injection payload', source: 'S20', weight: 8 },
];

const EMAIL_PATTERN_GROUPS: { patterns: RegexPattern[]; name: string }[] = [
  { patterns: EMAIL_HEADER_PATTERNS, name: 'EMAIL_HEADERS' },
  { patterns: MIME_PATTERNS, name: 'MIME_PARTS' },
  { patterns: WEBFETCH_RESPONSE_PATTERNS, name: 'WEBFETCH_RESPONSE' },
];

const emailWebfetchModule: ScannerModule = {
  name: 'email-webfetch',
  version: '1.0.0',
  description: 'Detects injections via email/MIME messages and web-fetched content',
  supportedContentTypes: ['text/plain', 'message/rfc822', 'text/html'],

  scan(text: string, normalized: string): Finding[] {
    // Input length guard to prevent ReDoS on large payloads
    const MAX_INPUT_LENGTH = 500_000;
    if (text.length > MAX_INPUT_LENGTH) {
      return [{ category: 'EMAIL_WEBFETCH_SIZE_LIMIT', severity: 'WARNING' as const,
        description: `Input too large (${text.length} chars) — truncated for email/webfetch analysis`,
        match: '', pattern_name: 'email_webfetch_size_limit', source: 'S20', engine: 'EmailWebFetch' }];
    }
    const findings: Finding[] = [];
    for (const group of EMAIL_PATTERN_GROUPS) {
      for (const p of group.patterns) {
        const m = normalized.match(p.re) || text.match(p.re);
        if (m) {
          findings.push({ category: p.cat, severity: p.sev, description: p.desc,
            match: m[0]!.slice(0, 100), pattern_name: p.name, source: p.source || 'S20', engine: 'EmailWebFetch',
            ...(p.weight !== undefined && { weight: p.weight }) });
        }
      }
    }
    return findings;
  },

  getPatternCount() {
    return EMAIL_PATTERN_GROUPS.reduce((c, g) => c + g.patterns.length, 0);
  },

  getPatternGroups() {
    return EMAIL_PATTERN_GROUPS.map(g => ({ name: g.name, count: g.patterns.length, source: 'S20' }));
  },
};

scannerRegistry.register(emailWebfetchModule);
export { emailWebfetchModule };
