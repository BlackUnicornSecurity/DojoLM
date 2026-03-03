/**
 * S57: SAGE Content Safety Filter
 * Ensures generated attack variants don't contain harmful real-world content.
 * Per SME CRIT-04: content safety filter on all SAGE outputs.
 */

import type { ContentSafetyResult } from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

const MODULE_SOURCE = 'S57';

/**
 * Patterns that indicate genuinely harmful content (not security test patterns).
 * These detect real exploit code, actual malware, real PII, etc.
 */
const HARMFUL_PATTERNS: Array<{ pattern: RegExp; reason: string; weight: number }> = [
  // Real personal information patterns
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, reason: 'Contains SSN-like pattern', weight: 0.9 },
  { pattern: /\b[A-Z]{2}\d{6,9}\b/, reason: 'Contains passport-like number', weight: 0.7 },

  // Real financial data
  { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, reason: 'Contains credit card number pattern', weight: 0.9 },

  // Real executable payloads (not test patterns)
  { pattern: /(?:rm\s+-rf\s+\/(?!\s*\*)|dd\s+if=\/dev\/zero\s+of=\/dev\/sd)/i, reason: 'Contains destructive system commands', weight: 0.95 },
  { pattern: /(?:format\s+[cC]:\s*\/[yY]|del\s+\/[fFsS]\s+\/[qQ]\s+[cC]:\\)/i, reason: 'Contains destructive Windows commands', weight: 0.95 },

  // Actual malware signatures
  { pattern: /(?:WScript\.Shell|ActiveXObject\s*\(\s*["']WScript)/i, reason: 'Contains Windows script execution', weight: 0.8 },

  // Real network exploitation
  { pattern: /(?:nmap\s+-sS\s+\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|masscan\s+\d)/i, reason: 'Contains real network scanning commands', weight: 0.7 },

  // Cryptocurrency theft patterns
  { pattern: /(?:sendtoaddress|bitcoin-cli\s+send|eth\.sendTransaction)/i, reason: 'Contains cryptocurrency transaction commands', weight: 0.85 },

  // Real phishing templates
  { pattern: /(?:your\s+account\s+(?:has\s+been|will\s+be)\s+(?:suspended|locked|closed).*(?:click|verify|confirm)\s+(?:here|now|immediately))/i, reason: 'Contains phishing template language', weight: 0.6 },
];

/**
 * Content categories that shouldn't appear in generated variants.
 */
const CONTENT_BLOCKLIST: Array<{ pattern: RegExp; reason: string; weight: number }> = [
  // Violence/harm to specific groups
  { pattern: /(?:how\s+to\s+(?:make|build|create)\s+(?:a\s+)?(?:bomb|explosive|weapon))/i, reason: 'Contains weapon creation instructions', weight: 1.0 },
  { pattern: /(?:synthesize|manufacture)\s+(?:sarin|vx|mustard\s+gas|ricin)/i, reason: 'Contains chemical weapon references', weight: 1.0 },

  // CSAM-related
  { pattern: /(?:child|minor|underage).*(?:explicit|sexual|nude)/i, reason: 'Contains child exploitation language', weight: 1.0 },

  // Self-harm instructions
  { pattern: /(?:how\s+to\s+(?:commit|attempt)\s+(?:suicide|self-harm))/i, reason: 'Contains self-harm instructions', weight: 1.0 },
];

/**
 * Check content safety of generated text.
 * Returns pass/fail with harm score and reasons.
 */
export function checkContentSafety(text: string): ContentSafetyResult {
  if (text.length > MAX_INPUT_LENGTH) {
    return { pass: false, harmScore: 1.0, reasons: ['Input exceeds maximum length'] };
  }

  const reasons: string[] = [];
  let maxWeight = 0;

  // Check blocklist (always fail regardless of score)
  let blocklistHit = false;
  for (const { pattern, reason, weight } of CONTENT_BLOCKLIST) {
    if (pattern.test(text)) {
      reasons.push(reason);
      maxWeight = Math.max(maxWeight, weight);
      blocklistHit = true;
    }
  }

  // Check harmful patterns
  for (const { pattern, reason, weight } of HARMFUL_PATTERNS) {
    if (pattern.test(text)) {
      reasons.push(reason);
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  const harmScore = maxWeight;
  const pass = !blocklistHit && (reasons.length === 0 || harmScore < 0.7);

  return { pass, harmScore, reasons };
}

/**
 * Calculate harm score for fitness function.
 * Per SME CRIT-04: harmfulness ceiling - variants above threshold get fitness=0.
 */
export function calculateHarmScore(text: string): number {
  if (text.length > MAX_INPUT_LENGTH) return 1.0;

  const result = checkContentSafety(text);
  return result.harmScore;
}

/**
 * Sanitize output by redacting harmful patterns.
 */
export function sanitizeOutput(text: string): string {
  if (text.length > MAX_INPUT_LENGTH) return '[REDACTED: Input too large]';

  let sanitized = text;

  // Redact SSN-like patterns
  sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]');

  // Redact credit card patterns
  sanitized = sanitized.replace(
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    '[REDACTED-CC]'
  );

  // Redact destructive commands
  sanitized = sanitized.replace(
    /(?:rm\s+-rf\s+\/(?!\s*\*)|dd\s+if=\/dev\/zero\s+of=\/dev\/sd)/gi,
    '[REDACTED-CMD]'
  );

  return sanitized;
}
