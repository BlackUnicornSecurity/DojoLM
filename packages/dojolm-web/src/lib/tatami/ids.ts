// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/ids — Tatami proof + case id mint + grammar (single source of truth).
 *
 * Each `mint*Id` and its `{@link …_ID}` grammar MUST stay in lockstep: the validator
 * the read routes apply has to accept exactly what the create/capture route mints.
 * Co-locating each minter with its grammar prevents drift — a drift would make the
 * read routes 400 a freshly-minted id. Proof ids are tagged `tp-`, case ids `tc-`,
 * so the two id spaces never collide and a reader can tell them apart by prefix.
 */

import { randomBytes } from 'node:crypto';

/** Proof id grammar: `tp-<base36 time>-<10 random hex>`. */
export const PROOF_ID = /^tp-[a-z0-9]+-[0-9a-f]{10}$/;

/** Defensive upper bound on an inbound id string before the regex test. */
export const MAX_PROOF_ID_LEN = 64;

/**
 * Mint a unique proof id (`tp-<base36 time>-<10 random hex>`), mirroring the
 * scan-runs id convention. A random nonce — NOT a hash of run/operator — keeps the
 * public id collision-free under same-millisecond concurrency AND free of any
 * operator-identity linkage. `randomBytes(5)` → exactly 10 hex chars.
 */
export function mintProofId(): string {
  return `tp-${Date.now().toString(36)}-${randomBytes(5).toString('hex')}`;
}

/** True iff `id` is a well-formed proof id (length-bounded, then grammar-checked). */
export function isTatamiProofId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_PROOF_ID_LEN && PROOF_ID.test(id);
}

/** Case id grammar: `tc-<base36 time>-<10 random hex>` (proof-id shape, `tc` tag). */
export const CASE_ID = /^tc-[a-z0-9]+-[0-9a-f]{10}$/;

/** Defensive upper bound on an inbound case-id string before the regex test. */
export const MAX_CASE_ID_LEN = 64;

/**
 * Mint a unique case id (`tc-<base36 time>-<10 random hex>`). Same construction as
 * {@link mintProofId} with a `tc` tag, so case and proof ids never collide and a
 * reader can tell them apart by prefix. Random nonce — no operator-identity linkage.
 */
export function mintCaseId(): string {
  return `tc-${Date.now().toString(36)}-${randomBytes(5).toString('hex')}`;
}

/** True iff `id` is a well-formed case id (length-bounded, then grammar-checked). */
export function isTatamiCaseId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_CASE_ID_LEN && CASE_ID.test(id);
}
