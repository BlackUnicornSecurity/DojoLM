// SPDX-License-Identifier: Apache-2.0
/**
 * dojolm.eval/v1 attestation predicate — builds the in-toto Statement
 * that wraps a stored signed-run record's `DojoLmEvalV1Predicate` for
 * cosign attestation.
 *
 * E1-PHASE-4-M1 (MOAT-1) slice 3b (Master Plan v1.0 §4.2). Companion to
 * the §9-free `signed-runs-store.ts` (slice 1): that store persists the
 * eval-run predicate; this module turns one stored record into a signable
 * in-toto Statement, and `eval-run-attestor.ts` (slice 3b) signs it via the
 * `SignerPort` + persists the attestation to `eval-attestations-store.ts`.
 *
 * Mirrors `dojolm-platform-audit-predicate.ts` (B-14c) with two eval-specific
 * differences:
 *   1. The attested `predicateType` REUSES the published eval URI
 *      `EVAL_PREDICATE_TYPE` (`https://specs.dojolm.com/eval/v1`) — the
 *      attested predicate IS the `DojoLmEvalV1Predicate`, so no new
 *      predicate-type URI is minted (verifiers dispatch on the same URI
 *      the signed-runs store already pins).
 *   2. The signed-run record is NESTED (`predicate.modelRef.{scheme,value,
 *      provider}`, etc.), unlike the platform-audit flat details map. The
 *      canonicaliser here is therefore RECURSIVE (sort object keys at every
 *      depth; preserve array order; scalars verbatim) so the record hash is
 *      independent of JSON key-insertion order.
 *
 * CRIT-1 subject-digest binding (audit B-14a): the Statement's
 * `subject.digest.sha256` is the SHA-256 of the deep-canonical record bytes,
 * and `eval-run-attestor.ts` passes those SAME bytes as `subjectBytes` to
 * `signer.sign(...)` — so the cryptographic binding
 * `subject.digest.sha256 === sha256(subjectBytes)` (which the cosign CLI
 * adapter enforces at M-2) holds. The binding is to the canonical RECORD
 * bytes, not to `transcriptHash`/`verdictHash` — the store holds only those
 * hashes, not the bytes they commit to, so `sha256(bytes)` would be
 * unprovable at attest time.
 *
 * Pure data construction — no cosign / fs / network. License: Apache-2.0.
 */

import { createHash } from 'node:crypto';

import type { InTotoStatement } from 'bu-tpi/onigaeshi';

import {
  EVAL_PREDICATE_TYPE,
  type DojoLmEvalV1Predicate,
  type SignedRunRecord,
} from '@/lib/signed-runs-store';

/** In-toto Statement v1 envelope type URI (wire constant). */
const IN_TOTO_STATEMENT_TYPE = 'https://in-toto.io/Statement/v1' as const;

/**
 * Max object/array nesting the canonicaliser will descend. A valid eval record
 * is ~3 levels deep ({ predicate: { modelRef: { value } } }); 64 is generous
 * headroom. The bound makes the EXPORTED canonicaliser stack-safe for verifier
 * callers that re-derive the hash from an UNTRUSTED record (`JSON.parse` happily
 * builds 100k-deep nesting that would otherwise blow the V8 stack with an
 * uncatchable RangeError) — same "a reader never chokes on hostile bytes"
 * posture the signed-runs store enforces on ingest.
 */
const MAX_CANON_DEPTH = 64;

/**
 * SHA-256 hex digest of `input` (utf8). Pure helper used by the record-hash
 * derivation here and re-usable by a verifier re-deriving the same hash from
 * a stored record.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Recursively canonicalise an arbitrary JSON value to a stable-ordered JSON
 * string:
 *   - objects → keys sorted ascending at EVERY depth;
 *   - arrays  → element order PRESERVED (order is semantically significant);
 *   - scalars (string / number / boolean / null) → emitted verbatim.
 *
 * `null` is handled before the object branch so `Object.keys(null)` can never
 * throw. The result feeds `sha256Hex` so the record hash is independent of the
 * key-insertion order a caller happened to use.
 */
export function deepCanonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value, 0));
}

/**
 * Recursively rebuild `value` with object keys sorted; arrays kept in order.
 * `depth` is bounded by MAX_CANON_DEPTH so hostile deep nesting throws a normal
 * (catchable, stable-message) Error instead of a stack-overflow RangeError.
 */
function sortDeep(value: unknown, depth: number): unknown {
  if (depth > MAX_CANON_DEPTH) {
    throw new Error('deepCanonicalize: input nesting exceeds the max depth');
  }
  if (Array.isArray(value)) {
    return value.map((entry) => sortDeep(entry, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      sorted[key] = sortDeep(source[key], depth + 1);
    }
    return sorted;
  }
  return value;
}

/** Deep-canonical JSON of a full signed-run record (the bytes the hash binds to). */
export function canonicaliseRecord(record: SignedRunRecord): string {
  return deepCanonicalize(record);
}

/**
 * Built attestation parts. `canonical` + `recordHash` are returned alongside the
 * Statement so the attestor binds the SAME bytes it hashed as `subjectBytes`
 * without re-canonicalising (single source of truth for the CRIT-1 binding).
 */
export interface EvalAttestation {
  readonly statement: InTotoStatement<DojoLmEvalV1Predicate>;
  /** Deep-canonical record JSON — the bytes passed to the signer as subjectBytes. */
  readonly canonical: string;
  /** `sha256(canonical)` — the Statement subject digest. */
  readonly recordHash: string;
}

/**
 * Build a frozen in-toto Statement wrapping a signed-run record's eval
 * predicate, plus the canonical bytes + hash it binds to. Pure — does NOT sign;
 * `eval-run-attestor.ts` calls the signer with `Buffer.from(canonical)` so the
 * CRIT-1 binding `subject.digest.sha256 === sha256(subjectBytes)` holds.
 */
export function buildEvalAttestation(record: SignedRunRecord): EvalAttestation {
  const canonical = canonicaliseRecord(record);
  const recordHash = sha256Hex(canonical);
  const statement: InTotoStatement<DojoLmEvalV1Predicate> = Object.freeze({
    _type: IN_TOTO_STATEMENT_TYPE,
    subject: Object.freeze([
      Object.freeze({
        name: `dojolm/eval/${record.id}`,
        digest: Object.freeze({ sha256: recordHash }),
      }),
    ]),
    predicateType: EVAL_PREDICATE_TYPE,
    predicate: record.predicate,
  });
  return { statement, canonical, recordHash };
}

/** Convenience wrapper returning only the Statement (verifier / test use). */
export function buildEvalAttestationStatement(
  record: SignedRunRecord,
): InTotoStatement<DojoLmEvalV1Predicate> {
  return buildEvalAttestation(record).statement;
}
