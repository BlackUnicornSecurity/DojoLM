// SPDX-License-Identifier: Apache-2.0
/**
 * File: leak-archive-pii-sanitizer.ts
 * Purpose: Gap 11.2 — PII scrub at ingest for CL4R1T4S leak archive.
 * Story: Industry-tools parity plan section 11.2 (lines 661-701).
 *
 * Runs on every ingest regardless of `CL4R1T4S_ARCHIVE_BUNDLED`. Emails,
 * phone numbers, sample user-data blocks, and named persons (best-effort,
 * label-triggered) are replaced with opaque placeholders before content is
 * persisted. The sanitizer rejects empty inputs and inputs whose scrub
 * yields an empty string.
 *
 * --------------------------------------------------------------------------
 * Production warning: PII detection is best-effort regex, not ML-based NER.
 * It WILL miss novel formats. Operators running internal deployments must
 * treat the archive as confidential regardless.
 * --------------------------------------------------------------------------
 */

// Bidi-override / zero-width / format codepoints.
// U+200B-U+200F, U+2028-U+202F, U+2066-U+2069, U+FEFF.
const BIDI_CHARCLASS_SRC = '\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF';

// Strip bidi, zero-width, format chars + C0/C1 control except \t\n\r.
// eslint-disable-next-line no-control-regex
const BIDI_STRIP_RE = new RegExp(
  `[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`,
  'g',
);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

const PHONE_RE =
  /(?<![\w])(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}(?![\w])/g;

const USER_DATA_HEADER_RE =
  /^([ \t]*(?:user|example(?:\s+user)?\s+(?:query|prompt|input)|sample(?:\s+user)?\s+(?:query|prompt|input)|end-user|customer)[ \t]*:)/gim;

const NAMED_PERSON_LINE_RE =
  /\b(?:name|author|signed(?:\s+by)?|from|contact)\s*[:=]\s*([A-Za-z][a-z]{1,30}(?:\s+[A-Za-z][a-z]{1,30}){1,3})/gi;

export interface SanitizerOptions {
  readonly emailPlaceholder?: string;
  readonly phonePlaceholder?: string;
  readonly userDataPlaceholder?: string;
  readonly personPlaceholder?: string;
}

export interface SanitizerReport {
  readonly emails: number;
  readonly phones: number;
  readonly userDataHeaders: number;
  readonly persons: number;
  readonly bidiStripped: number;
}

export interface SanitizerResult {
  readonly clean: string;
  readonly report: SanitizerReport;
}

export class EmptySanitizeRejectionError extends Error {
  readonly code = 'CL4R1T4S.SANITIZE.EMPTY' as const;
  constructor(reason: 'input-empty' | 'scrub-empty') {
    super(
      reason === 'input-empty'
        ? 'sanitizeLeakContent: input must be a non-empty string'
        : 'sanitizeLeakContent: scrubbed output is empty — refusing to ingest',
    );
    this.name = 'EmptySanitizeRejectionError';
  }
}

const DEFAULTS: Required<SanitizerOptions> = {
  emailPlaceholder: '[EMAIL_REDACTED]',
  phonePlaceholder: '[PHONE_REDACTED]',
  userDataPlaceholder: '[USER_DATA_REDACTED]:',
  personPlaceholder: '[PERSON_REDACTED]',
};

export function sanitizeLeakContent(
  raw: string,
  options: SanitizerOptions = {},
): SanitizerResult {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new EmptySanitizeRejectionError('input-empty');
  }

  const opts = { ...DEFAULTS, ...options };

  let bidiCount = 0;
  const bidiStripped = raw.replace(BIDI_STRIP_RE, () => {
    bidiCount++;
    return '';
  });

  let emailCount = 0;
  let out = bidiStripped.replace(EMAIL_RE, () => {
    emailCount++;
    return opts.emailPlaceholder;
  });

  let phoneCount = 0;
  out = out.replace(PHONE_RE, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 7) return match;
    phoneCount++;
    return opts.phonePlaceholder;
  });

  let userDataCount = 0;
  out = out.replace(USER_DATA_HEADER_RE, () => {
    userDataCount++;
    return opts.userDataPlaceholder;
  });

  let personCount = 0;
  out = out.replace(NAMED_PERSON_LINE_RE, (match, _name: string) => {
    personCount++;
    const label = match.split(/[:=]/)[0];
    const separator = match.includes('=') ? '=' : ':';
    return `${label}${separator} ${opts.personPlaceholder}`;
  });

  // Scrub-empty guard: if removing placeholders leaves no non-whitespace
  // signal, refuse to persist. This catches "all-PII" payloads
  // (e.g. a file that's just an email list).
  const withoutPlaceholders = out
    .replaceAll(opts.emailPlaceholder, '')
    .replaceAll(opts.phonePlaceholder, '')
    .replaceAll(opts.userDataPlaceholder, '')
    .replaceAll(opts.personPlaceholder, '');
  if (withoutPlaceholders.trim().length === 0) {
    throw new EmptySanitizeRejectionError('scrub-empty');
  }

  return {
    clean: out,
    report: {
      emails: emailCount,
      phones: phoneCount,
      userDataHeaders: userDataCount,
      persons: personCount,
      bidiStripped: bidiCount,
    },
  };
}
