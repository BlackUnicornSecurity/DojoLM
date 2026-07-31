// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/redact — recursive, pseudonymous redactor (OSS, Epic 1 / F-Compliance F8).
 *
 * The canonical `redactSensitiveFields` (audit-logger.ts) recurses into plain objects
 * but SKIPS arrays (it only recurses when `!Array.isArray(value)`). LLM/eval evidence
 * is array-heavy — message lists, tool-call arrays, finding arrays — so a secret nested
 * inside an array survives the canonical redactor untouched. This redactor recurses into
 * arrays AND nested arrays AND nested objects: no sensitive leaf survives, however deep
 * or array-wrapped.
 *
 * A sensitive leaf is replaced by a PSEUDONYM — a keyed/salted hash token of the form
 * `[redacted:<class>:<8 hex>]`. It is NEVER the raw value and is deliberately NOT called
 * "anonymous": a keyed hash is *pseudonymous* (GDPR Recital 26 — re-identifiable by the
 * key holder, uncorrelatable across keys/salts). Same (value, class, key, salt) → same
 * token (a value stays correlatable *within* one evidence scope); a different key/salt →
 * a different token (no cross-scope correlation).
 *
 * Pure + deterministic: no I/O, no clock, no hidden secret (the caller supplies key/salt).
 * Fail-safe: a cyclic or too-deep value collapses to a typed marker, never passes through
 * raw; non-JSON leaves (function/symbol/bigint) are coerced or dropped, never leaked.
 */

import { createHash, createHmac } from 'node:crypto';

import { TATAMI_HASH_ALGO, canonicalize } from './hash-chain';
import type { TatamiRedactedPreview, TatamiRedactionClass, TatamiRedactionTier } from './types';

/** Hex chars of the keyed hash kept in a pseudonym token. */
const PSEUDONYM_HEX_LEN = 8;

/** Default recursion ceiling — a DoS / cyclic-payload backstop. */
const DEFAULT_MAX_DEPTH = 64;

/** Emitted in place of a value that re-enters itself (cycle) — never the raw value. */
export const REDACT_CYCLE_MARKER = '[redacted:cycle]';

/** Emitted past `maxDepth` — never the raw value. */
export const REDACT_DEPTH_MARKER = '[redacted:max-depth]';

/**
 * Emitted for a non-plain container (Map/Set/Date/RegExp/class instance). Their
 * contents are not own-enumerable string keys, so we cannot recurse them safely;
 * collapsing to an explicit marker is fail-safe AND honest — never a silent `{}`
 * (which would falsely read as "handled") and never the raw value. Evidence payloads
 * are expected to be plain JSON (objects/arrays/scalars); a non-plain value is an
 * anomaly, redacted conservatively.
 */
export const REDACT_NONPLAIN_MARKER = '[redacted:non-plain]';

/** Max chars of the JSON-serialized redacted preview text (DoS bound). */
export const MAX_PREVIEW_TEXT_LEN = 2000;

/**
 * Sensitive field names per class, matched on the NORMALIZED key (lowercased, with `_`
 * and `-` stripped) — exactly as the canonical redactor matches, so `apiKey`, `api_key`
 * and `api-key` all collapse to `apikey`. Matching is exact (not substring) on purpose:
 * substring matching would mis-redact innocents like `tokenCount` → `token`.
 *
 * When a key matches, the WHOLE subtree it holds is redacted (every scalar leaf under an
 * array/object value becomes a pseudonym), so `messages: [{ token: '…' }]` is covered.
 */
const SECRET_FIELDS: ReadonlySet<string> = new Set([
  'apikey', 'password', 'passwd', 'secret', 'token', 'authorization', 'accesstoken',
  'refreshtoken', 'bearer', 'privatekey', 'clientsecret', 'sessiontoken', 'cookie',
]);
const PII_FIELDS: ReadonlySet<string> = new Set([
  'email', 'emailaddress', 'phone', 'phonenumber', 'ssn', 'address', 'dob',
  'dateofbirth', 'firstname', 'lastname', 'fullname', 'ipaddress', 'creditcard',
  'cardnumber',
]);
const ATTACK_FIELDS: ReadonlySet<string> = new Set([
  'payload', 'rawpayload', 'attackpayload', 'jailbreak', 'exploit', 'mutation',
  'rawprompt', 'injection', 'attacktechnique',
]);

/** Stable emit order for the `applied` set (matches the union declaration order). */
const CLASS_ORDER: readonly TatamiRedactionClass[] = ['pii', 'secret', 'attack_technique'];

export interface TatamiRedactOptions {
  /**
   * Keyed-hash key for pseudonyms (HMAC-SHA256). STRONGLY recommended for low-entropy
   * PII (email/phone): without it the salted hash is offline-dictionary-attackable.
   * Same key → same token (correlatable within scope); a different key → uncorrelatable.
   */
  readonly key?: string;
  /** Extra salt folded into every token (e.g. an org/case id) for scope isolation. */
  readonly salt?: string;
  /** Recursion ceiling; deeper nodes collapse to {@link REDACT_DEPTH_MARKER}. */
  readonly maxDepth?: number;
}

export interface TatamiRedactionOutcome {
  /**
   * The input, structurally preserved, with every sensitive leaf replaced by a
   * pseudonym. Always JSON-safe (cycle-free, no functions) — safe to hash/store/export.
   */
  readonly value: unknown;
  /** Distinct redaction classes applied, deduped and in {@link CLASS_ORDER}. */
  readonly applied: readonly TatamiRedactionClass[];
}

/** Normalize a key the way the canonical redactor does: lowercase, drop `_` and `-`. */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, '');
}

/** The redaction class a field name implies, or null when the field is not sensitive. */
function classifyField(key: string): TatamiRedactionClass | null {
  const k = normalizeKey(key);
  if (SECRET_FIELDS.has(k)) return 'secret';
  if (PII_FIELDS.has(k)) return 'pii';
  if (ATTACK_FIELDS.has(k)) return 'attack_technique';
  return null;
}

/** Keyed (or salted-hash fallback) pseudonym for one scalar leaf — never the raw value. */
function pseudonym(value: unknown, cls: TatamiRedactionClass, opts: ResolvedOptions): string {
  const material = canonicalize({ c: cls, s: opts.salt, v: value });
  const digest = opts.key
    ? createHmac(TATAMI_HASH_ALGO, opts.key).update(material).digest('hex')
    : createHash(TATAMI_HASH_ALGO).update(material).digest('hex');
  return `[redacted:${cls}:${digest.slice(0, PSEUDONYM_HEX_LEN)}]`;
}

interface ResolvedOptions {
  readonly key?: string;
  readonly salt: string;
  readonly maxDepth: number;
}

/**
 * True only for a PLAIN object we can safely recurse via `Object.entries` — a literal
 * `{}` or a null-prototype dict. Map/Set/Date/RegExp/class instances are excluded (their
 * data is not own-enumerable string keys), matching the canonical redactor's
 * `Object.getPrototypeOf(value) === Object.prototype` test.
 */
function isPlainContainer(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** Coerce a non-sensitive scalar to a JSON-safe value (drop functions/symbols). */
function scalarToJsonSafe(value: unknown): unknown {
  if (value === null) return null;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return value;
  if (t === 'bigint') return (value as bigint).toString();
  // function / symbol / undefined → absent (JSON convention); never leaked.
  return undefined;
}

/**
 * Redact an ENTIRE subtree: every scalar leaf becomes a pseudonym of `cls`, while array
 * and object structure is preserved and recursed. Reached when a key is itself sensitive.
 */
function redactSubtree(
  value: unknown,
  cls: TatamiRedactionClass,
  depth: number,
  opts: ResolvedOptions,
  path: Set<object>,
): unknown {
  if (depth > opts.maxDepth) return REDACT_DEPTH_MARKER;
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    if (path.has(value)) return REDACT_CYCLE_MARKER;
    if (!Array.isArray(value) && !isPlainContainer(value)) return REDACT_NONPLAIN_MARKER;
    path.add(value);
    const out = Array.isArray(value)
      ? value.map((v) => redactSubtree(v, cls, depth + 1, opts, path))
      : mapEntries(value, (v) => redactSubtree(v, cls, depth + 1, opts, path));
    path.delete(value);
    return out;
  }
  return pseudonym(value, cls, opts);
}

/**
 * Walk the value, redacting only the subtrees held by sensitive keys. Non-sensitive
 * scalars pass through (coerced JSON-safe); arrays and objects are recursed so a sensitive
 * key nested at any depth — including inside an array — is found (the F8 fix).
 */
function walk(
  value: unknown,
  depth: number,
  opts: ResolvedOptions,
  applied: Set<TatamiRedactionClass>,
  path: Set<object>,
): unknown {
  if (depth > opts.maxDepth) return REDACT_DEPTH_MARKER;
  if (typeof value !== 'object' || value === null) return scalarToJsonSafe(value);
  if (path.has(value)) return REDACT_CYCLE_MARKER;
  if (!Array.isArray(value) && !isPlainContainer(value)) return REDACT_NONPLAIN_MARKER;
  path.add(value);
  let out: unknown;
  if (Array.isArray(value)) {
    out = value.map((v) => walk(v, depth + 1, opts, applied, path));
  } else {
    out = mapEntries(value, (v, key) => {
      const cls = classifyField(key);
      if (cls) {
        applied.add(cls);
        return redactSubtree(v, cls, depth + 1, opts, path);
      }
      return walk(v, depth + 1, opts, applied, path);
    });
  }
  path.delete(value);
  return out;
}

/** Build a new object from `obj`'s own enumerable keys, dropping `undefined` results. */
function mapEntries(
  obj: Record<string, unknown>,
  fn: (value: unknown, key: string) => unknown,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const next = fn(value, key);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

/** Distinct applied classes in stable order. */
function orderedClasses(applied: ReadonlySet<TatamiRedactionClass>): TatamiRedactionClass[] {
  return CLASS_ORDER.filter((c) => applied.has(c));
}

/**
 * Recursively redact a value's sensitive fields into pseudonyms. The input is never
 * mutated; the returned `value` is a JSON-safe structural copy and `applied` lists the
 * distinct classes redacted (suitable for {@link TatamiRedactedPreview.applied}).
 */
export function redactPayload(value: unknown, opts: TatamiRedactOptions = {}): TatamiRedactionOutcome {
  const resolved: ResolvedOptions = {
    ...(opts.key ? { key: opts.key } : {}),
    salt: opts.salt ?? '',
    maxDepth: opts.maxDepth ?? DEFAULT_MAX_DEPTH,
  };
  const applied = new Set<TatamiRedactionClass>();
  const redacted = walk(value, 0, resolved, applied, new Set<object>());
  return { value: redacted, applied: orderedClasses(applied) };
}

/**
 * Build a redacted, pseudonymous {@link TatamiRedactedPreview} from a raw payload: the
 * canonical (key-sorted) JSON of the redacted value, bounded to {@link MAX_PREVIEW_TEXT_LEN}.
 * The `applied` set is reported truthfully so a reader knows what was masked. Use an OSS
 * tier (`internal_redacted` / `customer_safe`) from an OSS context.
 */
export function buildRedactedPreview(
  value: unknown,
  tier: TatamiRedactionTier,
  opts: TatamiRedactOptions = {},
): TatamiRedactedPreview {
  const { value: redacted, applied } = redactPayload(value, opts);
  return { tier, text: canonicalize(redacted).slice(0, MAX_PREVIEW_TEXT_LEN), applied };
}
