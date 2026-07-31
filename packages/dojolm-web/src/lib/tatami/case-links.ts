// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/case-links — case ↔ proof linkage (D-H4-2, case-side). Split out of
 * `./case` in HC-2.C Lane B (DX-1) when the parent file crossed the 400-line
 * comfort threshold. Behaviour is unchanged from the prior `case.ts`
 * inlining; the import seam is the only difference (callers re-export via
 * `lib/tatami/index.ts`, which preserves the public surface).
 *
 * Pure + immutable: both functions return a NEW {@link TatamiCase}; the
 * proof is NEVER touched (its B7 self-anchor stays valid — the case owns
 * the link, so attach/detach are case-only mutations).
 */

import { MAX_CASE_PROOF_IDS } from './case';
import {
  isTatamiCase,
  type TatamiCase,
  type TatamiProof,
  type TatamiSourceModule,
} from './types';

export interface AttachProofToCaseParams {
  /** The case the proof is filed under — the link's owner (D-H4-2, case-side). */
  readonly tatamiCase: TatamiCase;
  /**
   * The proof being attached. Read-only here: attach NEVER mutates the proof, so its
   * B7 self-anchor stays valid (captured evidence is immutable; the mutable case owns
   * the linkage). Only `id` (→ proofIds) and `source.module` (→ linkedModules) are read.
   */
  readonly proof: TatamiProof;
  /** RFC-3339 UTC; caller-supplied so the mutation is deterministic (no hidden clock). */
  readonly now: string;
}

/**
 * File a proof under a case (D-H4-2 — the case-side link). Pure + immutable: returns
 * a NEW case (spread, never mutate) with the proof referenced; the proof is untouched.
 *
 *   - proofIds:      append `proof.id` iff absent (set semantics; insertion order kept)
 *   - linkedModules: union with `proof.source.module` (dedup; insertion order kept)
 *   - updatedAt:     advanced to `now`
 *   - status / severity / everything else: unchanged
 *
 * Idempotent on the arrays: re-attaching an already-linked proof yields the same
 * proofIds/linkedModules (only `updatedAt` advances). The route additionally short-
 * circuits an already-linked proof to a true no-op (no write); this guard keeps the
 * function independently correct.
 *
 * @throws if the result fails {@link isTatamiCase} (defense-in-depth; the store also
 *   validates before write).
 */
export function attachProofToCase(params: AttachProofToCaseParams): TatamiCase {
  const { tatamiCase, proof, now } = params;

  const alreadyLinked = tatamiCase.proofIds.includes(proof.id);
  // H-2 — refuse a NEW link that would push the case past MAX_CASE_PROOF_IDS (an
  // unbounded case eventually exceeds the store's MAX_ROW_BYTES and can never be
  // written again). Re-attaching an already-linked proof stays a safe no-op even at
  // the cap. The attach route surfaces this as a 422 via its own pre-check; this throw
  // keeps the function independently correct (defense-in-depth, like the guard below).
  if (!alreadyLinked && tatamiCase.proofIds.length >= MAX_CASE_PROOF_IDS) {
    throw new Error(`tatami/case: proofIds cap (${MAX_CASE_PROOF_IDS}) reached`);
  }

  const proofIds = alreadyLinked
    ? tatamiCase.proofIds
    : [...tatamiCase.proofIds, proof.id];

  const sourceModule = proof.source.module;
  const linkedModules = tatamiCase.linkedModules.includes(sourceModule)
    ? tatamiCase.linkedModules
    : [...tatamiCase.linkedModules, sourceModule];

  const next: TatamiCase = { ...tatamiCase, proofIds, linkedModules, updatedAt: now };
  if (!isTatamiCase(next)) {
    throw new Error('tatami/case: attach produced an invalid case');
  }
  return next;
}

export interface DetachProofFromCaseParams {
  /** The case the proof is being removed from (case-side link; the proof is untouched). */
  readonly tatamiCase: TatamiCase;
  /** The proof id to unlink. Returned UNCHANGED if it is not currently linked. */
  readonly proofId: string;
  /**
   * The proofs that REMAIN linked after `proofId` is removed (the route loads them,
   * org-scoped). `linkedModules` is recomputed from their `source.module` — a module
   * survives only while some remaining proof still sources it. An unresolvable remaining
   * proof (deleted / retention-expired) contributes no module, so a module sourced ONLY
   * by such a proof drops; its id is still kept in `proofIds` (only the detached id is
   * removed). The detached proof itself is NEVER passed here.
   */
  readonly remainingProofs: readonly TatamiProof[];
  /** RFC-3339 UTC; caller-supplied so the mutation is deterministic (no hidden clock). */
  readonly now: string;
}

/**
 * Remove a proof from a case (S3 / TATAMI-CASE-DETACH — the inverse of
 * {@link attachProofToCase}). Pure + immutable: returns a NEW case; the PROOF is never
 * touched (its B7 self-anchor stays valid — the case owns the link, so a detach is a
 * case-only mutation, exactly mirroring attach).
 *
 *   - proofIds:      `proofId` filtered out (insertion order of the rest preserved)
 *   - linkedModules: RECOMPUTED from `remainingProofs` (a module survives only while a
 *                    remaining proof still sources it; dedup, remaining-list order)
 *   - updatedAt:     advanced to `now`
 *   - status / severity / everything else: unchanged
 *
 * Idempotent: detaching a proof that is NOT linked returns the case UNCHANGED (same
 * reference, `updatedAt` not advanced) — the route short-circuits this to a no-write.
 *
 * @throws if the result fails {@link isTatamiCase} (defense-in-depth; the store also
 *   validates before write).
 */
export function detachProofFromCase(params: DetachProofFromCaseParams): TatamiCase {
  const { tatamiCase, proofId, remainingProofs, now } = params;

  // Idempotent no-op: nothing to remove. Return the SAME case (no updatedAt bump); the
  // route detects this (proofId absent) and skips the write entirely.
  if (!tatamiCase.proofIds.includes(proofId)) {
    return tatamiCase;
  }

  const proofIds = tatamiCase.proofIds.filter((id) => id !== proofId);

  // Recompute linkedModules from the remaining proofs — a module stays linked only while
  // some remaining proof sources it. Fresh array, dedup; never mutate the input.
  const linkedModules: TatamiSourceModule[] = [];
  for (const p of remainingProofs) {
    if (!linkedModules.includes(p.source.module)) {
      linkedModules.push(p.source.module);
    }
  }

  const next: TatamiCase = { ...tatamiCase, proofIds, linkedModules, updatedAt: now };
  if (!isTatamiCase(next)) {
    throw new Error('tatami/case: detach produced an invalid case');
  }
  return next;
}
