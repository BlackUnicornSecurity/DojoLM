// SPDX-License-Identifier: Apache-2.0
/**
 * Bushido sign-off attestation predicate — in-toto Statement payload
 * for the locked Q-attestation record.
 *
 * E1-PHASE-3-B14b (Master Plan v1.0 §4.2 + §4.1 RB-4 Stage-B + RB-7
 * Stage-B). Builds on the Onigaeshi B-14a Sigstore substrate; the
 * wire format is identical (in-toto Statement v1 + DSSE envelope) so
 * the existing `SignerPort` adapters from `bu-tpi/onigaeshi` are
 * structurally compatible — Bushido callers cast at the boundary.
 *
 * Predicate type: `dojolm.bushido.signoff/v1` — locked attestation
 * record + 4-component manifest binding from RB-4 Stage-A.
 *
 * R-T1 discipline: the predicate commits to scalar metadata + the
 * 4 component hashes from manifestComponents + signer identities (the
 * load-bearing legal-defensibility signal). Never carries raw chain
 * content, raw bypass-matrix submissions, or BAISS verdict raw data.
 *
 * License: Apache-2.0.
 */

/**
 * Closed predicate-type URI for the `dojolm.bushido.signoff/v1`
 * schema. Verifiers key off this URI to dispatch the right parser.
 * Future schema migrations bump to `v2`.
 */
export const BUSHIDO_SIGNOFF_PREDICATE_TYPE =
  'https://specs.dojolm.com/bushido-signoff/v1' as const;

/** Closed-enum sign-off seat roles mirrored from `signoff-store.ts`. */
export type BushidoSignoffSeatRole = 'compliance' | 'redteam' | 'reviewer';

/**
 * Predicate fields snapshotted at the LOCK transition. One predicate
 * per locked attestation; never re-signed (immutable post-lock per
 * RB-7 retention contract).
 */
export interface BushidoSignoffPredicate {
  /** Predicate type URI — pinned to BUSHIDO_SIGNOFF_PREDICATE_TYPE. */
  readonly _type: typeof BUSHIDO_SIGNOFF_PREDICATE_TYPE;
  /** "YYYYQ[1-4]" quarter key (already grammar-validated by signoff-store). */
  readonly quarterKey: string;
  /** RFC 3339 timestamp of the lock transition (= 2nd signature). */
  readonly lockedAt: string;
  /**
   * RB-4 Stage-A: sha256-hex over the canonical-JSON serialisation of
   * the 4-component manifest (chainCatalogHash + bypassMatrixHash +
   * baissLedgerHash + timestampSource + timestampValue). The predicate
   * re-lists the components below so an external verifier can reproduce
   * the manifest hash from the predicate alone without dereferencing
   * the WORM record.
   */
  readonly manifestHash: string;
  readonly chainCatalogHash: string;
  readonly bypassMatrixHash: string;
  readonly baissLedgerHash: string;
  /**
   * `'system'` at Stage-A (RFC 3161 candidate). When Stage-B
   * cosign+Rekor signing succeeds, the SignerResult's
   * `inclusionProof.integratedTime` provides a stronger
   * trusted-timestamp source — the wrapper layer
   * (signoff-cosign-port) overrides the manifest timestamp pair to
   * `'rekor-inclusion'` BEFORE building the predicate so the lock-time
   * binding is the Rekor-witnessed value, not the system clock.
   */
  readonly timestampSource: 'system' | 'rfc-3161' | 'rekor-inclusion';
  readonly timestampValue: string;
  /**
   * Sign-off seat roles in the order they signed. Always exactly 2
   * entries at lock-time (per REQUIRED_SIGNATURES). External verifiers
   * use this to satisfy the "2-of-N seats" attestation rule.
   */
  readonly signerRoles: ReadonlyArray<BushidoSignoffSeatRole>;
  /**
   * Signer user-ids in the same order as `signerRoles`. Identities are
   * load-bearing for legal defensibility, so they're persisted in clear.
   */
  readonly signerIds: ReadonlyArray<string>;
  /**
   * Signer human-readable usernames mirroring `signerIds`. Useful for
   * audit-log spot-checks and the Bushido panel UI.
   */
  readonly signerUsernames: ReadonlyArray<string>;
  /**
   * Optional sha256-hex of the WORM-stored record canonical bytes —
   * when the wrapper layer pre-computes it, the predicate carries the
   * binding so cosign's `subject.digest.sha256 === wormPayloadHash`
   * cross-check (CRIT-1 omnibus-audit fix lesson from B-14a) is
   * verifiable post-hoc without dereferencing the WORM record.
   */
  readonly wormPayloadHash?: string;
  /**
   * E1-PHASE-4-M2 S5 — optional sha256-hex Merkle root committing to the
   * compliance/sign-off evidence ledger at lock (chain catalog / bypass
   * matrix / BAISS ledger / manifest / WORM record content hashes). Set
   * by the wrapper layer when `SIGSTORE_SIGNOFF_MERKLE_ENABLED=true` and
   * the cosign signing path succeeds; absent on legacy / pre-Merkle
   * records (additive — legacy on-wire shape stays byte-identical).
   *
   * R-T1: the root is derived ONLY from content hashes (each leaf is a
   * sha256, never a raw identity-bearing record), so the value carries
   * no `signerUsernames` / `signerIds` / `operatorId`. The leaf vector is
   * built in `dojolm-web/src/lib/bushido/signoff-store.ts`
   * (`computeSignoffMerkleLeaves`).
   */
  readonly merkleRoot?: string;
  /** Schema version pin (semver-on-spec). */
  readonly specVersion: '1.0.0';
}

/**
 * Subject reference for the in-toto Statement envelope. Pins the
 * locked attestation to a stable resource id — verifiers use this to
 * look up the record in the sign-off ledger.
 */
export interface BushidoSignoffSubject {
  /** "bushido/sign-off/<quarterKey>" — uniquely names the locked record. */
  readonly name: string;
  /** {"sha256": "<wormPayloadHash>"} matching the predicate field. */
  readonly digest: Readonly<{ sha256: string }>;
}

/**
 * Statement envelope (in-toto v1) ready to feed into the cosign
 * signer. Structurally compatible with `OnigaeshiAuditStatement` so
 * existing `SignerPort` adapters from `bu-tpi/onigaeshi` accept it
 * via runtime structural matching — Bushido callers cast at the
 * boundary (the wire format is identical; only the TypeScript
 * predicate type differs).
 */
export interface BushidoSignoffStatement {
  readonly _type: 'https://in-toto.io/Statement/v1';
  readonly subject: ReadonlyArray<BushidoSignoffSubject>;
  readonly predicateType: typeof BUSHIDO_SIGNOFF_PREDICATE_TYPE;
  readonly predicate: BushidoSignoffPredicate;
}

/**
 * Build a frozen in-toto Statement from the locked attestation fields.
 * Pure data construction — does NOT call cosign; that lives in the
 * wrapper layer in `dojolm-web/src/lib/bushido/signoff-cosign-port.ts`.
 */
export function buildBushidoSignoffStatement(input: {
  readonly quarterKey: string;
  readonly lockedAt: string;
  readonly manifestHash: string;
  readonly chainCatalogHash: string;
  readonly bypassMatrixHash: string;
  readonly baissLedgerHash: string;
  readonly timestampSource: 'system' | 'rfc-3161' | 'rekor-inclusion';
  readonly timestampValue: string;
  readonly signerRoles: ReadonlyArray<BushidoSignoffSeatRole>;
  readonly signerIds: ReadonlyArray<string>;
  readonly signerUsernames: ReadonlyArray<string>;
  readonly wormPayloadHash?: string;
  /** E1-PHASE-4-M2 S5 — content-hash Merkle root (see predicate field). */
  readonly merkleRoot?: string;
}): BushidoSignoffStatement {
  const predicate: BushidoSignoffPredicate = Object.freeze({
    _type: BUSHIDO_SIGNOFF_PREDICATE_TYPE,
    quarterKey: input.quarterKey,
    lockedAt: input.lockedAt,
    manifestHash: input.manifestHash,
    chainCatalogHash: input.chainCatalogHash,
    bypassMatrixHash: input.bypassMatrixHash,
    baissLedgerHash: input.baissLedgerHash,
    timestampSource: input.timestampSource,
    timestampValue: input.timestampValue,
    signerRoles: Object.freeze([...input.signerRoles]),
    signerIds: Object.freeze([...input.signerIds]),
    signerUsernames: Object.freeze([...input.signerUsernames]),
    ...(input.wormPayloadHash ? { wormPayloadHash: input.wormPayloadHash } : {}),
    ...(input.merkleRoot ? { merkleRoot: input.merkleRoot } : {}),
    specVersion: '1.0.0',
  });
  const subjectDigest = input.wormPayloadHash ?? input.manifestHash;
  const subject: BushidoSignoffSubject = Object.freeze({
    name: `bushido/sign-off/${input.quarterKey}`,
    digest: Object.freeze({ sha256: subjectDigest }),
  });
  return Object.freeze({
    _type: 'https://in-toto.io/Statement/v1',
    subject: Object.freeze([subject]),
    predicateType: BUSHIDO_SIGNOFF_PREDICATE_TYPE,
    predicate,
  });
}
