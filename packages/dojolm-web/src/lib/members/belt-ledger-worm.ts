// SPDX-License-Identifier: Apache-2.0
/**
 * File: lib/members/belt-ledger-worm.ts
 * Purpose: Epic 4B.5 S4B.5.1a — self-contained WORM signing primitive
 *          for the member belt ledger.
 *
 * Extends the R-T3 "append-only + WORM-signed" invariant already carried
 * by the onigaeshi audit chain (`packages/bu-tpi/src/audit/`). That chain
 * cannot cross the Next.js server/client boundary without leaking a
 * server-only import into the client bundle, so E4B.5 ships a local
 * self-contained primitive with identical mechanics:
 *
 *   - hash chain: `entryHash = HMAC-SHA-256(canonical(body) + previousHash_or_empty)`
 *   - signing key: `process.env.BELT_LEDGER_SIGNING_KEY` (dev default + prod-guard)
 *   - canonical JSON: sorted keys, stable whitespace, rejects non-plain
 *     objects + unsupported primitives (functions, symbols, undefined,
 *     BigInt)
 *
 * This module is **server-only** — it imports `node:crypto`. It must
 * never be reachable from a client bundle. Enforcement: the
 * `'use client'` component at `app/(shell)/members/bounty/BountyClient.tsx`
 * imports only from `belt-ledger-source` (pure constants + type-only
 * re-exports); any direct `import` from this module into a client
 * component would surface as a Next.js build error ("Module not
 * found: Can't resolve 'node:crypto' in client code").
 *
 * Verification is the in-module `verifyChain(entries, signingKey)`
 * helper. A dedicated `/api/members/bounty/belt-ledger/verify` HTTP
 * endpoint is **deferred to Epic 4B.6** (admin-side) — do NOT expose
 * `verifyChain` over HTTP from this sub-epic.
 */

import { createHmac } from 'node:crypto';

/**
 * Dev default signing key — used ONLY when `BELT_LEDGER_SIGNING_KEY`
 * is not set AND `NODE_ENV !== 'production'`. Surfaces a single
 * `console.warn` on first miss (throttled at module scope). Production
 * builds fail loudly at `getBeltLedgerSigningKey()` time when the env
 * var is unset — no silent fallback in prod.
 */
export const DEV_DEFAULT_SIGNING_KEY = 'dev-e4b5-belt-ledger-key';

let warnedDevDefault = false;

/**
 * Read the HMAC signing key at request time.
 *
 * Contract:
 *   - `process.env.BELT_LEDGER_SIGNING_KEY` wins when set + non-empty.
 *   - Otherwise, in non-production, fall back to `DEV_DEFAULT_SIGNING_KEY`
 *     with a one-shot `console.warn`.
 *   - In production, throw loudly so the deploy surfaces the
 *     misconfiguration (signing a WORM chain with a predictable dev
 *     key would defeat the tamper-evidence guarantee).
 *
 * Re-read per call so an operator can rotate the key via env-reload
 * without a process restart; the cost is a single `process.env` read.
 */
export function getBeltLedgerSigningKey(): string {
  const fromEnv = process.env.BELT_LEDGER_SIGNING_KEY;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'BELT_LEDGER_SIGNING_KEY is required in production — refusing to sign belt ledger with the dev default.',
    );
  }
  if (!warnedDevDefault) {
    warnedDevDefault = true;
    console.warn(
      '[belt-ledger-worm] BELT_LEDGER_SIGNING_KEY is unset — using dev default. Set the env var before deploying.',
    );
  }
  return DEV_DEFAULT_SIGNING_KEY;
}

/** Test-only — re-arm the one-shot dev-default warning. */
export function _resetBeltLedgerWormWarningForTests(): void {
  warnedDevDefault = false;
}

/**
 * Plain-object-only JSON body shape. Only strings, numbers, booleans,
 * null, arrays of the same, and plain objects with string keys are
 * allowed. Canonicalisation rejects anything else — this keeps the
 * signature deterministic AND refuses surprise shapes (functions,
 * symbols, BigInts) that JSON.stringify would silently drop or throw.
 */
export type CanonicalPrimitive = string | number | boolean | null;
export type CanonicalValue =
  | CanonicalPrimitive
  | readonly CanonicalValue[]
  | CanonicalEntryBody;
export type CanonicalEntryBody = { readonly [key: string]: CanonicalValue };

/**
 * Canonical JSON encoder. Object keys are sorted lexically; arrays
 * preserve insertion order. Whitespace is fixed (no spaces, no
 * newlines). Non-finite numbers and unsupported primitives raise —
 * the resulting string is byte-stable across processes + Node versions.
 */
export function canonicalJson(value: CanonicalValue): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number') {
    if (!Number.isFinite(value as number)) {
      throw new Error('canonicalJson: non-finite numbers are not supported');
    }
    return JSON.stringify(value);
  }
  if (t === 'boolean') return (value as boolean) ? 'true' : 'false';
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (const item of value) parts.push(canonicalJson(item));
    return `[${parts.join(',')}]`;
  }
  if (t === 'object' && value !== null) {
    // Reject non-plain objects (classes, Date, Buffer, Map, Set).
    const proto = Object.getPrototypeOf(value as object);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(
        'canonicalJson: only plain objects are supported (got an instance of a class / host type)',
      );
    }
    const obj = value as Record<string, CanonicalValue>;
    const keys = Object.keys(obj).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = obj[key];
      if (v === undefined) {
        throw new Error(`canonicalJson: undefined values are not supported (key "${key}")`);
      }
      parts.push(`${JSON.stringify(key)}:${canonicalJson(v)}`);
    }
    return `{${parts.join(',')}}`;
  }
  throw new Error(
    `canonicalJson: unsupported value type "${t}" — only string, number, boolean, null, arrays, and plain objects are allowed`,
  );
}

/**
 * Hash one ledger entry body against the previous hash in the chain.
 *
 * Inputs:
 *   - `body` — canonical body (the promotion record minus hash pointers)
 *   - `previousHash` — the prior entry's `entryHash`, or `null` for the
 *     first entry in the chain (no previous). Passed as an empty string
 *     when null so a first entry with null prev is distinguishable from
 *     a later entry whose prev happens to be `'null'`.
 *   - `signingKey` — from `getBeltLedgerSigningKey()`
 *
 * Output: hex-encoded HMAC-SHA-256 digest.
 *
 * Tamper-evidence: changing any field of `body` OR flipping one char
 * of `previousHash` changes the digest deterministically. The same
 * input always produces the same digest (server-agnostic).
 */
export function hashEntry(
  body: CanonicalEntryBody,
  previousHash: string | null,
  signingKey: string,
): string {
  if (typeof signingKey !== 'string' || signingKey.length === 0) {
    throw new Error('hashEntry: signingKey must be a non-empty string');
  }
  const canonical = canonicalJson(body);
  const prev = previousHash ?? '';
  return createHmac('sha256', signingKey).update(canonical).update(prev).digest('hex');
}

/**
 * One verified ledger entry as stored on the source. Kept local to
 * `belt-ledger-worm.ts` so the verifier works on any append-only chain
 * that carries the two chain pointers — the public interface type
 * lives on `belt-ledger-source.ts` and extends this shape.
 */
export interface VerifiableChainEntry {
  readonly previousHash: string | null;
  readonly entryHash: string;
}

export interface VerifyChainResult {
  readonly ok: boolean;
  /** Index of the first entry whose digest or previousHash linkage did not verify. */
  readonly firstInvalidIndex: number | null;
}

/**
 * Extract the canonical body from a chain entry by dropping the two
 * chain-pointer fields. The returned object is a plain object safe to
 * feed into `canonicalJson`; consumers MUST NOT retain a reference
 * (the rebuilt body is a throwaway for verification).
 */
export function extractCanonicalBody<T extends VerifiableChainEntry>(entry: T): CanonicalEntryBody {
  const body: Record<string, CanonicalValue> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'previousHash' || key === 'entryHash') continue;
    body[key] = value as CanonicalValue;
  }
  return body;
}

/**
 * Walk a chain start-to-end and confirm every entry's digest matches
 * the stored `entryHash`, and every `previousHash` matches the prior
 * entry's `entryHash`. Tests seed tampered chains and assert the
 * returned `firstInvalidIndex` matches the tampered index.
 *
 * This function is the in-module verifier. A public HTTP verification
 * endpoint ships with Epic 4B.6 (admin-side) — do NOT call this from
 * `/api/members/bounty/belt-ledger/route.ts` in E4B.5.
 */
export function verifyChain<T extends VerifiableChainEntry>(
  entries: readonly T[],
  signingKey: string,
): VerifyChainResult {
  let prevHash: string | null = null;
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (entry.previousHash !== prevHash) {
      return { ok: false, firstInvalidIndex: i };
    }
    const body = extractCanonicalBody(entry);
    const recomputed = hashEntry(body, prevHash, signingKey);
    if (recomputed !== entry.entryHash) {
      return { ok: false, firstInvalidIndex: i };
    }
    prevHash = entry.entryHash;
  }
  return { ok: true, firstInvalidIndex: null };
}
