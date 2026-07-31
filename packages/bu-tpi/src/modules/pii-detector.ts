// SPDX-License-Identifier: Apache-2.0
/**
 * S33: Real-time PII Detection Module
 * Detects personal identifiable information (PII) in scanner input.
 * Integrates with OWASP-GAP-03, NIST-GAP-02 compliance requirements.
 * Self-registers with scannerRegistry on import.
 */

import type { ScannerModule, Finding, RegexPattern } from '../types.js';
import { SEVERITY } from '../types.js';
import { scannerRegistry } from './registry.js';

const MODULE_NAME = 'pii-detector';
const MODULE_SOURCE = 'S33';
const ENGINE = 'pii-detector';

const MAX_INPUT_LENGTH = 500_000;
// Reserved/non-routable email domains that can never be a real, deliverable
// PII address — suppressing them is precision, not recall relaxation:
//   - example.{com,org,net} + bare `.example` TLD (RFC 6761 / RFC 2606)
//   - `.internal` TLD (ICANN-reserved 2024 for private use), incl. multi-label
//   - .test / .invalid (RFC 2606), localhost
// The `(?:[A-Za-z0-9-]+\.)+(?:example|internal)` alt covers bare-TLD forms like
// `ops@org.example` and `mailer@sub.org.internal`; the trailing negative
// lookahead anchors at the domain end so `foo.example.com` still routes through
// the first alt (and real TLDs like .io/.com are never matched here).
const RESERVED_PLACEHOLDER_EMAIL_RE = /\b[A-Za-z0-9._%+-]+@(?:(?:[A-Za-z0-9-]+\.)?example\.(?:com|org|net)|(?:[A-Za-z0-9-]+\.)+(?:example|internal)|(?:[A-Za-z0-9-]+\.)?(?:test|invalid)|localhost)(?![A-Za-z0-9.-])/i;
// SC.1.10: first alt covers NANP fictitious-use range 555-0100..0199 in any area code (per NANPA administration).
// These are officially reserved for fiction/documentation and never assigned to real subscribers.
// Second alt preserves the original 555-123-4567 pop-culture placeholder (structurally different: 555 as area code).
// (?<!\d) / (?!\d) lookbehind+lookahead anchor on digit boundaries — prevents mid-number matches
// (e.g., "412555014789" embedded in an order ID).
const RESERVED_PLACEHOLDER_PHONE_RE = /(?<!\d)(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?555[-.\s]?01\d{2}(?!\d)|(?<!\d)(?:\+?1[-.\s]?)?\(?555\)?[-.\s]?123[-.\s]?4567(?!\d)/;

// SC.1.10 FP fixes: ZW-char strip + rot13 suppression
// Covers: ZWSP U+200B, ZWNJ U+200C, ZWJ U+200D, RLM U+200F, BOM/ZWNBS U+FEFF, soft-hyphen U+00AD, word-joiner U+2060
// eslint-disable-next-line no-misleading-character-class
const ZW_STRIP_RE = /[​‌‍‏﻿­⁠]/g;

function rot13(s: string): string {
  return s.replace(/[A-Za-z]/g, c => {
    const b = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b);
  });
}

// SC.1.10 FN fixes: collect decoded text variants (URL / HTML-entity / unicode-escape /
// hex-escape / octal-escape / base64) so encoded PII is still detected.
// Depth-capped (max 2 layers) and variant-capped (max 6) to bound runtime.
const MAX_DECODE_VARIANTS = 6;

function collectDecodedVariants(text: string, depth = 0): string[] {
  if (depth >= 2 || text.length > MAX_INPUT_LENGTH) return [];
  const out: string[] = [];

  const push = (d: string): void => {
    if (d === text || out.length >= MAX_DECODE_VARIANTS || out.includes(d)) return;
    out.push(d);
    if (depth < 1) {
      for (const v of collectDecodedVariants(d, depth + 1)) {
        if (out.length < MAX_DECODE_VARIANTS && !out.includes(v)) out.push(v);
      }
    }
  };

  if (/%[0-9A-Fa-f]{2}/.test(text)) {
    try { push(decodeURIComponent(text.replace(/\+/g, ' '))); } catch {}
  }
  if (/&#\d+;/.test(text)) {
    push(text.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))));
  }
  if (/&#x[0-9A-Fa-f]+;/i.test(text)) {
    push(text.replace(/&#x([0-9A-Fa-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }
  if (/\\u[0-9A-Fa-f]{4}/i.test(text)) {
    push(text.replace(/\\u([0-9A-Fa-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }
  if (/\\x[0-9A-Fa-f]{2}/i.test(text)) {
    push(text.replace(/\\x([0-9A-Fa-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))));
  }
  if (/\\[0-7]{3}/.test(text)) {
    push(text.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
  }
  for (const m of text.matchAll(/(?:^|[\s(,:|])\s*([A-Za-z0-9+/]{16,}={0,2})(?=$|[\s),\n])/gm)) {
    if (out.length >= MAX_DECODE_VARIANTS) break;
    try {
      const d = Buffer.from(m[1]!, 'base64').toString('utf8');
      const printable = d.replace(/[^\x20-\x7E\n\r\t]/g, '');
      if (printable.length >= 10 && printable.length / d.length > 0.8) push(d);
    } catch {}
  }

  return [...new Set(out)].slice(0, MAX_DECODE_VARIANTS);
}

// --- PII Type Configuration ---

export interface PIIConfig {
  ssn: boolean;
  creditCard: boolean;
  email: boolean;
  phone: boolean;
  ipAddress: boolean;
  passport: boolean;
  medicalRecord: boolean;
  driverLicense: boolean;
  bankAccount: boolean;
  dateOfBirth: boolean;
  nationalId: boolean;
}

const DEFAULT_CONFIG: PIIConfig = {
  ssn: true,
  creditCard: true,
  email: true,
  phone: true,
  ipAddress: true,
  passport: true,
  medicalRecord: true,
  driverLicense: true,
  bankAccount: true,
  dateOfBirth: true,
  nationalId: true,
};

let activeConfig: PIIConfig = { ...DEFAULT_CONFIG };

export function configurePII(config: Partial<PIIConfig>): void {
  activeConfig = { ...activeConfig, ...config };
}

export function getPIIConfig(): PIIConfig {
  return { ...activeConfig };
}

// --- SSN Patterns ---

export const SSN_PATTERNS: RegexPattern[] = [
  { name: 'ssn_dashed', cat: 'PII_SSN', sev: SEVERITY.CRITICAL,
    re: /\b\d{3}-\d{2}-\d{4}\b/, desc: 'US Social Security Number (dashed format)', source: MODULE_SOURCE, weight: 10 },
  { name: 'ssn_spaced', cat: 'PII_SSN', sev: SEVERITY.CRITICAL,
    re: /\b\d{3}\s\d{2}\s\d{4}\b/, desc: 'US Social Security Number (spaced format)', source: MODULE_SOURCE, weight: 10 },
  { name: 'ssn_label', cat: 'PII_SSN', sev: SEVERITY.CRITICAL,
    re: /(?:ssn|social\s*security\s*(?:number|#|no\.?))\s*[:=]?\s*\d{3}[-\s]?\d{2}[-\s]?\d{4}/i,
    desc: 'Labeled Social Security Number', source: MODULE_SOURCE, weight: 10 },
];

// --- Credit Card Patterns ---

export const CREDIT_CARD_PATTERNS: RegexPattern[] = [
  { name: 'cc_visa', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b4\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, desc: 'Visa credit card number', source: MODULE_SOURCE, weight: 10 },
  { name: 'cc_mastercard', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b5[1-5]\d{2}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, desc: 'Mastercard credit card number', source: MODULE_SOURCE, weight: 10 },
  { name: 'cc_amex', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b3[47]\d{2}[-\s]?\d{6}[-\s]?\d{5}\b/, desc: 'American Express card number', source: MODULE_SOURCE, weight: 10 },
  { name: 'cc_discover', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b6(?:011|5\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, desc: 'Discover card number', source: MODULE_SOURCE, weight: 10 },
  { name: 'cc_jcb', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b35(?:2[89]|[3-8]\d)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, desc: 'JCB credit card number', source: MODULE_SOURCE, weight: 10 },
  { name: 'cc_maestro', cat: 'PII_CREDIT_CARD', sev: SEVERITY.CRITICAL,
    re: /\b(?:6304|6706|6709|6761)[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, desc: 'Maestro credit card number', source: MODULE_SOURCE, weight: 10 },
];

// --- Email Patterns ---

export const EMAIL_PATTERNS: RegexPattern[] = [
  { name: 'email_address', cat: 'PII_EMAIL', sev: SEVERITY.WARNING,
    re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, desc: 'Email address detected', source: MODULE_SOURCE, weight: 6 },
  { name: 'email_labeled', cat: 'PII_EMAIL', sev: SEVERITY.WARNING,
    re: /(?:e-?mail|contact)\s*[:=]\s*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/i,
    desc: 'Labeled email address', source: MODULE_SOURCE, weight: 7 },
];

// --- Phone Patterns ---

export const PHONE_PATTERNS: RegexPattern[] = [
  // P3 Wave D precision: require a valid NANP area code AND exchange ([2-9]\d\d).
  // NANP forbids area/exchange codes starting with 0 or 1, so digit runs like
  // "178-432-2026" / "189-345-6000" (benign order/token IDs) are not US phone
  // numbers. Pure strict-subset of the prior \d{3} form — every valid number it
  // matched before, it still matches; only invalid-NANP runs are dropped.
  { name: 'phone_us', cat: 'PII_PHONE', sev: SEVERITY.WARNING,
    re: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b/, desc: 'US phone number', source: MODULE_SOURCE, weight: 6 },
  { name: 'phone_intl', cat: 'PII_PHONE', sev: SEVERITY.WARNING,
    re: /\b\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/, desc: 'International phone number', source: MODULE_SOURCE, weight: 6 },
  { name: 'phone_labeled', cat: 'PII_PHONE', sev: SEVERITY.WARNING,
    re: /(?:phone|tel(?:ephone)?|mobile|cell|fax)\s*(?:#|no\.?|number)?\s*[:=]\s*[\d(+][\d\s().+-]{7,20}/i,
    desc: 'Labeled phone number', source: MODULE_SOURCE, weight: 7 },
];

// --- IP Address Patterns ---

export const IP_ADDRESS_PATTERNS: RegexPattern[] = [
  { name: 'ipv4_private', cat: 'PII_IP_ADDRESS', sev: SEVERITY.INFO,
    re: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/,
    desc: 'Private IPv4 address', source: MODULE_SOURCE, weight: 4 },
  // P3 Wave D precision: exclude reserved / non-routable ranges that are not a
  // public IP and therefore not public-IP PII — RFC1918 private (10/8, 172.16/12,
  // 192.168/16), RFC5737 documentation TEST-NET (192.0.2/24, 198.51.100/24,
  // 203.0.113/24), RFC6598 CGN (100.64/10), RFC2544 benchmarking (198.18/15),
  // link-local (169.254/16), loopback (127/8) and this-host 0.0.0.0. Private
  // ranges still raise the INFO-level ipv4_private; the documentation/CGN/
  // link-local ranges are benign placeholders. Strict-subset narrow: only stops
  // matching addresses that are definitionally not public.
  { name: 'ipv4_public', cat: 'PII_IP_ADDRESS', sev: SEVERITY.WARNING,
    re: /\b(?!(?:0\.0\.0\.0\b|10\.|127\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.|198\.1[89]\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.))(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/,
    desc: 'IPv4 address detected', source: MODULE_SOURCE, weight: 5 },
];

// --- Passport Patterns ---

export const PASSPORT_PATTERNS: RegexPattern[] = [
  { name: 'passport_us', cat: 'PII_PASSPORT', sev: SEVERITY.CRITICAL,
    re: /(?:passport\s*(?:#|no\.?|number)?\s*[:=]?\s*)[A-Z]\d{8}/i,
    desc: 'US passport number', source: MODULE_SOURCE, weight: 9 },
  { name: 'passport_generic', cat: 'PII_PASSPORT', sev: SEVERITY.CRITICAL,
    re: /(?:passport\s*(?:#|no\.?|number)?\s*[:=]?\s*)[A-Z]{1,2}\d{6,9}/i,
    desc: 'Passport number (generic format)', source: MODULE_SOURCE, weight: 9 },
];

// --- Medical Record Patterns ---

export const MEDICAL_RECORD_PATTERNS: RegexPattern[] = [
  { name: 'mrn_labeled', cat: 'PII_MEDICAL', sev: SEVERITY.CRITICAL,
    re: /(?:MRN|medical\s*record\s*(?:#|no\.?|number)?|patient\s*(?:id|#|no\.?))\s*[:=]?\s*[A-Z0-9]{4,12}/i,
    desc: 'Medical record number', source: MODULE_SOURCE, weight: 9 },
  { name: 'npi_number', cat: 'PII_MEDICAL', sev: SEVERITY.CRITICAL,
    re: /\bNPI\s*[:=]?\s*\d{10}\b/i, desc: 'National Provider Identifier (NPI)', source: MODULE_SOURCE, weight: 9 },
  { name: 'dea_number', cat: 'PII_MEDICAL', sev: SEVERITY.WARNING,
    re: /\bDEA\s*(?:#|no\.?)?\s*[:=]?\s*[A-Z]{2}\d{7}/i, desc: 'DEA registration number', source: MODULE_SOURCE, weight: 8 },
];

// --- Driver License Patterns ---

export const DRIVER_LICENSE_PATTERNS: RegexPattern[] = [
  { name: 'dl_labeled', cat: 'PII_DRIVER_LICENSE', sev: SEVERITY.CRITICAL,
    re: /(?:driver'?s?\s*licen[cs]e|\bDL\b)\s*(?:#|no\.?|number)?\s*[:=]?\s*(?=[A-Z0-9]{5,15}\b)(?=[A-Z0-9]*\d)[A-Z0-9]{5,15}\b/i,
    desc: 'Driver license number', source: MODULE_SOURCE, weight: 9 },
];

// --- Bank Account Patterns ---

export const BANK_ACCOUNT_PATTERNS: RegexPattern[] = [
  { name: 'iban', cat: 'PII_BANK_ACCOUNT', sev: SEVERITY.CRITICAL,
    re: /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?(?:\d{4}\s?){2,7}\d{1,4}\b/,
    desc: 'IBAN (International Bank Account Number)', source: MODULE_SOURCE, weight: 9 },
  { name: 'routing_account', cat: 'PII_BANK_ACCOUNT', sev: SEVERITY.CRITICAL,
    re: /(?:routing|ABA)\s*(?:#|no\.?)?\s*[:=]?\s*\d{9}\b/i,
    desc: 'Bank routing/ABA number', source: MODULE_SOURCE, weight: 9 },
  { name: 'account_number_labeled', cat: 'PII_BANK_ACCOUNT', sev: SEVERITY.CRITICAL,
    re: /(?:account|acct)\s*(?:#|no\.?|number)?\s*[:=]?\s*\d{8,17}\b/i,
    desc: 'Bank account number', source: MODULE_SOURCE, weight: 9 },
];

// --- Date of Birth Patterns ---

export const DOB_PATTERNS: RegexPattern[] = [
  { name: 'dob_labeled', cat: 'PII_DOB', sev: SEVERITY.WARNING,
    re: /(?:date\s*of\s*birth|DOB|born\s*(?:on)?|birthday)\s*[:=]?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/i,
    desc: 'Date of birth', source: MODULE_SOURCE, weight: 7 },
];

// --- National ID Patterns ---

export const NATIONAL_ID_PATTERNS: RegexPattern[] = [
  { name: 'nie_spain', cat: 'PII_NATIONAL_ID', sev: SEVERITY.CRITICAL,
    re: /\b[XYZ]\d{7}[A-Z]\b/, desc: 'Spanish NIE (foreigner ID)', source: MODULE_SOURCE, weight: 9 },
  { name: 'dni_spain', cat: 'PII_NATIONAL_ID', sev: SEVERITY.CRITICAL,
    re: /\b\d{8}[A-Z]\b/, desc: 'Spanish DNI (national ID)', source: MODULE_SOURCE, weight: 9 },
  { name: 'national_id_labeled', cat: 'PII_NATIONAL_ID', sev: SEVERITY.CRITICAL,
    re: /(?:national\s*(?:id|identification)\s*(?:#|no\.?|number)?|citizen\s*id|ID\s*card\s*(?:#|no\.?))\s*[:=]?\s*[A-Z0-9]{5,15}/i,
    desc: 'National identification number', source: MODULE_SOURCE, weight: 9 },
];

// --- Redaction Support ---

export function redactPII(text: string): string {
  let result = text;
  const allPatterns = [
    ...SSN_PATTERNS,
    ...CREDIT_CARD_PATTERNS,
    ...EMAIL_PATTERNS,
    ...PHONE_PATTERNS,
    ...PASSPORT_PATTERNS,
    ...MEDICAL_RECORD_PATTERNS,
    ...DRIVER_LICENSE_PATTERNS,
    ...BANK_ACCOUNT_PATTERNS,
    ...DOB_PATTERNS,
    ...NATIONAL_ID_PATTERNS,
  ];
  for (const p of allPatterns) {
    // Use global flag to redact ALL occurrences, not just the first
    const globalRe = new RegExp(p.re.source, p.re.flags.includes('g') ? p.re.flags : p.re.flags + 'g');
    result = result.replace(globalRe, '[REDACTED]');
  }
  return result;
}

// --- Custom Detection ---

export function detectPIIExposure(text: string): Finding[] {
  const findings: Finding[] = [];

  // Detect bulk PII patterns (e.g., data dumps with multiple PII types)
  let piiTypeCount = 0;
  const piiChecks: Array<{ re: RegExp; type: string }> = [
    { re: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN' },
    { re: /\b[45]\d{3}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, type: 'CC' },
    { re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, type: 'Email' },
    { re: /(?:passport\s*(?:#|no\.?|number)?\s*[:=]?\s*)[A-Z]{1,2}\d{6,9}/i, type: 'Passport' },
    { re: /(?:MRN|medical\s*record|patient\s*(?:id|#))\s*[:=]?\s*[A-Z0-9]{4,12}/i, type: 'Medical' },
  ];

  const detectedTypes: string[] = [];
  const configMap: Record<string, keyof PIIConfig> = { SSN: 'ssn', CC: 'creditCard', Email: 'email', Passport: 'passport', Medical: 'medicalRecord' };
  for (const check of piiChecks) {
    // Respect activeConfig — skip disabled PII types
    if (configMap[check.type] && !activeConfig[configMap[check.type]]) continue;
    if (check.re.test(text)) {
      piiTypeCount++;
      detectedTypes.push(check.type);
    }
  }

  if (piiTypeCount >= 3) {
    findings.push({
      category: 'PII_BULK_EXPOSURE',
      severity: SEVERITY.CRITICAL,
      description: `Bulk PII exposure: ${piiTypeCount} PII types detected in single input`,
      match: `Types: ${detectedTypes.join(', ')}`,
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'bulk_pii_exposure',
      weight: 10,
    });
  }

  if (
    /Contact\s+[A-Z][a-z]+\s+[A-Z][a-z]+\s+at\s+[A-Za-z0-9._%+-]+@(?:example\.(?:com|org|net)|[A-Za-z0-9.-]+\.[A-Za-z]{2,})\s+or\s+call\s+(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)
  ) {
    findings.push({
      category: 'PII_CONTACT_BUNDLE',
      severity: SEVERITY.WARNING,
      description: 'Named contact bundle exposes linked person, email, and phone information together',
      match: text.slice(0, 100),
      source: MODULE_SOURCE,
      engine: ENGINE,
      pattern_name: 'contact_bundle',
      weight: 7,
    });
  }

  return findings;
}

function shouldSuppressPIIMatch(patternName: string, match: string): boolean {
  if (patternName === 'email_address' || patternName === 'email_labeled') {
    if (RESERVED_PLACEHOLDER_EMAIL_RE.test(match)) return true;
    // SC.1.10: suppress ROT13-encoded placeholder emails (e.g., wbua@rknzcyr.pbz = john@example.com)
    if (RESERVED_PLACEHOLDER_EMAIL_RE.test(rot13(match))) return true;
  }

  if (patternName === 'phone_us' || patternName === 'phone_labeled') {
    if (RESERVED_PLACEHOLDER_PHONE_RE.test(match)) return true;
    // SC.1.10: ZW-char interspersion breaks literal regex match — strip before checking
    const stripped = match.replace(ZW_STRIP_RE, '');
    if (stripped !== match && RESERVED_PLACEHOLDER_PHONE_RE.test(stripped)) return true;
  }

  return false;
}

function sanitizeBenignPlaceholderPII(text: string): string {
  // SC.1.10: construct global regex per-call from the non-global source — avoids module-level
  // mutable lastIndex state and any concurrent-use hazard (review Finding 1).
  const phoneGlobalRe = new RegExp(RESERVED_PLACEHOLDER_PHONE_RE.source, 'g');
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@(?:(?:[A-Za-z0-9-]+\.)?example\.(?:com|org|net)|(?:[A-Za-z0-9-]+\.)+(?:example|internal)|(?:[A-Za-z0-9-]+\.)?(?:test|invalid)|localhost)(?![A-Za-z0-9.-])/gi, '[BENIGN_EMAIL]')
    .replace(phoneGlobalRe, '[BENIGN_PHONE]');
}

// --- Pattern Group Registry ---

type PatternGroupDef = { name: string; patterns: RegexPattern[]; configKey: keyof PIIConfig };

const PATTERN_GROUPS: PatternGroupDef[] = [
  { name: 'SSN_PATTERNS', patterns: SSN_PATTERNS, configKey: 'ssn' },
  { name: 'CREDIT_CARD_PATTERNS', patterns: CREDIT_CARD_PATTERNS, configKey: 'creditCard' },
  { name: 'EMAIL_PATTERNS', patterns: EMAIL_PATTERNS, configKey: 'email' },
  { name: 'PHONE_PATTERNS', patterns: PHONE_PATTERNS, configKey: 'phone' },
  { name: 'IP_ADDRESS_PATTERNS', patterns: IP_ADDRESS_PATTERNS, configKey: 'ipAddress' },
  { name: 'PASSPORT_PATTERNS', patterns: PASSPORT_PATTERNS, configKey: 'passport' },
  { name: 'MEDICAL_RECORD_PATTERNS', patterns: MEDICAL_RECORD_PATTERNS, configKey: 'medicalRecord' },
  { name: 'DRIVER_LICENSE_PATTERNS', patterns: DRIVER_LICENSE_PATTERNS, configKey: 'driverLicense' },
  { name: 'BANK_ACCOUNT_PATTERNS', patterns: BANK_ACCOUNT_PATTERNS, configKey: 'bankAccount' },
  { name: 'DOB_PATTERNS', patterns: DOB_PATTERNS, configKey: 'dateOfBirth' },
  { name: 'NATIONAL_ID_PATTERNS', patterns: NATIONAL_ID_PATTERNS, configKey: 'nationalId' },
];

const DETECTORS: Array<{ name: string; fn: (text: string) => Finding[] }> = [
  { name: 'detectPIIExposure', fn: detectPIIExposure },
];

// --- Module Definition ---

export const piiDetectorModule: ScannerModule = {
  name: MODULE_NAME,
  version: '1.0.0',
  description: 'Detects PII exposure including SSN, credit cards, email, phone, passport, medical records, and more',
  supportedContentTypes: ['text/plain', 'application/json'],

  scan(text: string, normalized: string): Finding[] {
    if (text.length > MAX_INPUT_LENGTH) return [];

    const findings: Finding[] = [];
    const sanitizedText = sanitizeBenignPlaceholderPII(text);
    const sanitizedNormalized = sanitizeBenignPlaceholderPII(normalized);

    for (const group of PATTERN_GROUPS) {
      if (!activeConfig[group.configKey]) continue;
      for (const p of group.patterns) {
        const m = p.re.exec(sanitizedNormalized) ?? p.re.exec(sanitizedText);
        if (m) {
          if (shouldSuppressPIIMatch(p.name, m[0])) {
            continue;
          }
          findings.push({
            category: p.cat,
            severity: p.sev,
            description: p.desc,
            match: m[0].substring(0, 120),
            source: p.source ?? MODULE_SOURCE,
            engine: ENGINE,
            pattern_name: p.name,
            weight: p.weight,
          });
        }
      }
    }

    for (const det of DETECTORS) {
      findings.push(...det.fn(text));
    }

    // SC.1.10: scan decoded variants so encoding-obfuscated PII (URL / HTML-entity /
    // unicode-escape / hex-escape / octal-escape / base64) is still caught.
    // Deduplication by pattern_name: skip if the pattern already fired on the raw text.
    const variants = collectDecodedVariants(text);
    for (const decoded of variants) {
      const sanDec = sanitizeBenignPlaceholderPII(decoded);
      const sanDecLow = sanDec.toLowerCase();
      for (const group of PATTERN_GROUPS) {
        if (!activeConfig[group.configKey]) continue;
        for (const p of group.patterns) {
          if (findings.some(f => f.pattern_name === p.name)) continue;
          const m = p.re.exec(sanDec) ?? p.re.exec(sanDecLow);
          if (m && !shouldSuppressPIIMatch(p.name, m[0])) {
            findings.push({
              category: p.cat, severity: p.sev, description: p.desc,
              match: m[0].substring(0, 120), source: p.source ?? MODULE_SOURCE,
              engine: ENGINE, pattern_name: p.name, weight: p.weight,
            });
          }
        }
      }
    }

    return findings;
  },

  getPatternCount(): number {
    let count = 0;
    for (const g of PATTERN_GROUPS) count += g.patterns.length;
    return count;
  },

  getPatternGroups(): { name: string; count: number; source: string }[] {
    return PATTERN_GROUPS.map(g => ({
      name: g.name,
      count: g.patterns.length,
      source: MODULE_SOURCE,
    }));
  },
};

// Self-register on import (with guard for hot-reload/test isolation)
if (!scannerRegistry.hasModule('pii-detector')) {
  scannerRegistry.register(piiDetectorModule);
}
