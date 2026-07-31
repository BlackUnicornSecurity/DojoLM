// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/hash-chain — Tatami B7 integrity primitive (OSS).
 *
 * A local, self-verifiable content-hash + prev-hash chain. This is what makes a
 * Tatami proof/receipt *evidence* and not a copy-pasteable text file: any reader
 * can recompute the chain offline and detect a single mutated byte — WITHOUT
 * Fulcio/Rekor/keyless attestation (that is the EE `tatami-vault` layer).
 *
 * Pure + deterministic; no I/O; no secrets. Canonical serialization sorts object
 * keys recursively so two semantically-equal payloads hash identically regardless
 * of key order. Array order is preserved (order is meaningful).
 */

import { createHash } from 'node:crypto';

export const TATAMI_HASH_ALGO = 'sha256';
/** prevHash sentinel for the first link in a chain. */
export const GENESIS_PREV_HASH = 'genesis';

export interface TatamiHashLink {
  /** 0-based position in the chain. */
  readonly seq: number;
  /** Previous link's contentHash, or GENESIS_PREV_HASH for seq 0. */
  readonly prevHash: string;
  /** sha256 hex of canonical(payload) bound to prevHash. */
  readonly contentHash: string;
}

export type ChainBreakReason =
  | 'length_mismatch'
  | 'seq_out_of_order'
  | 'prev_hash_mismatch'
  | 'content_hash_mismatch';

export interface ChainVerification {
  readonly valid: boolean;
  /** seq of the first broken link, or null when valid. */
  readonly brokenAt: number | null;
  readonly reason: ChainBreakReason | null;
}

/** Deterministic JSON: object keys sorted recursively, array order kept. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) out[key] = sortKeys(obj[key]);
    return out;
  }
  return value;
}

export function canonicalize(value: unknown): string {
  // Normalize first: round-trip through JSON so the hash binds the JSON
  // representation (exactly what gets stored/exported) and cannot be subverted
  // by a `toJSON` method, getter, or function arriving via an `unknown` payload.
  // This also collapses class instances to plain objects and treats an
  // `undefined`/function field as absent (the JSON convention). Top-level
  // `undefined`/function → `null` (JSON.stringify yields undefined there).
  const json = JSON.stringify(value);
  const normalized: unknown = json === undefined ? null : JSON.parse(json);
  return JSON.stringify(sortKeys(normalized));
}

/** Hash a payload bound to its predecessor — tampering with either breaks it. */
export function hashContent(payload: unknown, prevHash: string): string {
  return createHash(TATAMI_HASH_ALGO)
    .update(`${canonicalize(payload)}\n${prevHash}`)
    .digest('hex');
}

/** Append one link after `prev` (or a genesis link when `prev` is null). */
export function appendLink(payload: unknown, prev: TatamiHashLink | null): TatamiHashLink {
  const seq = prev ? prev.seq + 1 : 0;
  const prevHash = prev ? prev.contentHash : GENESIS_PREV_HASH;
  return { seq, prevHash, contentHash: hashContent(payload, prevHash) };
}

/** Fold an ordered payload list into a linked chain. */
export function buildChain(payloads: readonly unknown[]): TatamiHashLink[] {
  const links: TatamiHashLink[] = [];
  let prev: TatamiHashLink | null = null;
  for (const payload of payloads) {
    const link = appendLink(payload, prev);
    links.push(link);
    prev = link;
  }
  return links;
}

/** True when `link` still authenticates `payload` at its declared prevHash. */
export function verifyLink(payload: unknown, link: TatamiHashLink): boolean {
  return link.contentHash === hashContent(payload, link.prevHash);
}

/** Re-derive the whole chain and report the first break (if any). */
export function verifyChain(
  payloads: readonly unknown[],
  links: readonly TatamiHashLink[],
): ChainVerification {
  if (payloads.length !== links.length) {
    return {
      valid: false,
      brokenAt: Math.min(payloads.length, links.length),
      reason: 'length_mismatch',
    };
  }
  let prevHash = GENESIS_PREV_HASH;
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    if (link.seq !== i) return { valid: false, brokenAt: i, reason: 'seq_out_of_order' };
    if (link.prevHash !== prevHash) {
      return { valid: false, brokenAt: i, reason: 'prev_hash_mismatch' };
    }
    if (link.contentHash !== hashContent(payloads[i], prevHash)) {
      return { valid: false, brokenAt: i, reason: 'content_hash_mismatch' };
    }
    prevHash = link.contentHash;
  }
  return { valid: true, brokenAt: null, reason: null };
}

/** Read-side guard — drops malformed links (mirrors sibling stores' posture). */
export function isTatamiHashLink(v: unknown): v is TatamiHashLink {
  if (typeof v !== 'object' || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.seq === 'number'
    && Number.isInteger(l.seq)
    && l.seq >= 0
    && typeof l.prevHash === 'string'
    && (l.prevHash === GENESIS_PREV_HASH || /^[0-9a-f]{64}$/.test(l.prevHash))
    && typeof l.contentHash === 'string'
    && /^[0-9a-f]{64}$/.test(l.contentHash)
  );
}
