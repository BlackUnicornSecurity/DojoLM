// SPDX-License-Identifier: Apache-2.0
/**
 * Onigaeshi audit predicate — in-toto Statement payload schema.
 *
 * E1-PHASE-2-B14a Slice 1 (Master Plan v1.0 §4.2): the Onigaeshi audit
 * substrate is the platform's substrate template for the Sigstore
 * migration. Pass-1 subagent #4 identified Onigaeshi's existing
 * `audit-worm-writer.ts` + `engagement-signer.ts` + `audit.ts`
 * `verifyAuditIntegrity` as the closest module to the v5.1 Sigstore
 * end-state. B-14a ports them to cosign + Rekor; B-14b carries the
 * pattern to Bushido sign-off; B-14c rolls it out platform-wide.
 *
 * This file defines the in-toto predicate schema written into the DSSE
 * envelope. Predicate type: `dojolm.audit/v1` — generic audit-event
 * predicate consumed by the cosign attestation flow.
 *
 * The predicate is intentionally narrower than the audit ENTRY shape in
 * `audit.ts` — it carries only the fields that an external verifier
 * needs to re-validate the row (engagement id, actor, target, outcome,
 * timestamp, scalar detail hash) without leaking R-T1-protected
 * content. Raw seed / outcome / mitigation strings stay on the
 * filesystem under restricted permissions; the predicate only commits
 * to their content hashes.
 *
 * License: Apache-2.0.
 */

import type { OnigaeshiAuditType } from './audit.js';

/**
 * Closed predicate-type URI for the `dojolm.audit/v1` schema. Mirrors
 * the in-toto convention where predicate type is a stable URI rather
 * than a free-form string — verifiers key off this to dispatch the
 * right parser. The path component pins the schema version; future
 * v2 schemas use `dojolm.audit/v2`.
 *
 * The spec text for this predicate is intended to ship in the public
 * `github.com/BlackUnicornSecurity/eval-predicate` repo alongside
 * `dojolm.eval/v1` once M-11.2 publishes the spec-repo skeleton.
 */
export const ONIGAESHI_AUDIT_PREDICATE_TYPE =
  'https://specs.dojolm.com/audit/v1' as const;

/** Closed-enum of audit outcomes mirrored from the audit entry. */
export type OnigaeshiAuditPredicateOutcome = 'allowed' | 'blocked' | 'n/a';

/**
 * The in-toto Statement payload. Conforms to in-toto Statement v1
 * (`https://in-toto.io/Statement/v1`) when wrapped in the DSSE
 * envelope — the wrapping shape (typed statement + base64 payload +
 * signatures) is produced by the cosign signer, not by this module.
 *
 * R-T1 discipline: this struct carries scalar metadata + content
 * hashes only. Never the raw seed / outcome / mitigation payload that
 * `audit-worm-writer.ts` keeps under restricted permissions.
 */
export interface OnigaeshiAuditPredicate {
  /** Predicate type URI — pinned to ONIGAESHI_AUDIT_PREDICATE_TYPE. */
  readonly _type: typeof ONIGAESHI_AUDIT_PREDICATE_TYPE;
  /** Engagement id (already grammar-validated by ID_RE per audit.ts). */
  readonly engagementId: string;
  /** Audit-event kind (closed enum mirrored from OnigaeshiAuditType). */
  readonly eventType: OnigaeshiAuditType;
  /** Actor id (length-bounded, control-char-stripped per audit.ts). */
  readonly actor: string;
  /** Target model id (matches engagement schema). */
  readonly targetModel: string;
  /** Outcome classification. */
  readonly outcome: OnigaeshiAuditPredicateOutcome;
  /** RFC 3339 timestamp. */
  readonly timestamp: string;
  /**
   * SHA-256 hex of the canonical-JSON serialisation of the audit row's
   * `detail` map. Lets the verifier re-derive the same hash without
   * accessing the detail content directly (R-T1).
   */
  readonly detailHash: string;
  /**
   * REQUIRED SHA-256 hex of the WORM-stored row payload. The caller
   * (audit-worm-writer) hashes the canonical on-disk record bytes and
   * passes the digest here so it becomes the in-toto subject digest —
   * the cryptographic binding between the attestation and the WORM row
   * (CRIT-1). Made non-optional in the B-14a downstream-wiring slice: an
   * audit attestation with no WORM binding is never legitimately produced.
   * Consumers that decode this from an UNTRUSTED envelope still re-guard
   * the runtime type (see verifyAuditIntegrity's `cosign-binding-missing`).
   */
  readonly wormPayloadHash: string;
  /** Schema version pin (semver-on-spec). */
  readonly specVersion: '1.0.0';
}

/**
 * Subject reference for the in-toto Statement envelope. Pins the
 * audit row to a stable resource id — verifiers use this to look up
 * the row in the WORM store.
 */
export interface OnigaeshiAuditSubject {
  /** "<engagementId>/<timestamp>" — uniquely names the audit row. */
  readonly name: string;
  /** {"sha256": "<wormPayloadHash>"} matching the predicate field. */
  readonly digest: Readonly<{ sha256: string }>;
}

/**
 * Statement envelope (in-toto v1) ready to feed into the DSSE signer.
 * The cosign signer wraps this in a base64 payload + signature trio
 * and posts it to the configured Rekor instance.
 */
export interface OnigaeshiAuditStatement {
  readonly _type: 'https://in-toto.io/Statement/v1';
  readonly subject: ReadonlyArray<OnigaeshiAuditSubject>;
  readonly predicateType: typeof ONIGAESHI_AUDIT_PREDICATE_TYPE;
  readonly predicate: OnigaeshiAuditPredicate;
}

/**
 * Build a frozen in-toto Statement from validated inputs. Pure data
 * construction — does NOT call cosign; that lives in `cosign-signer.ts`
 * (Slice 2).
 */
export function buildOnigaeshiAuditStatement(input: {
  readonly engagementId: string;
  readonly eventType: OnigaeshiAuditType;
  readonly actor: string;
  readonly targetModel: string;
  readonly outcome: OnigaeshiAuditPredicateOutcome;
  readonly timestamp: string;
  readonly detailHash: string;
  readonly wormPayloadHash: string;
}): OnigaeshiAuditStatement {
  const predicate: OnigaeshiAuditPredicate = Object.freeze({
    _type: ONIGAESHI_AUDIT_PREDICATE_TYPE,
    engagementId: input.engagementId,
    eventType: input.eventType,
    actor: input.actor,
    targetModel: input.targetModel,
    outcome: input.outcome,
    timestamp: input.timestamp,
    detailHash: input.detailHash,
    wormPayloadHash: input.wormPayloadHash,
    specVersion: '1.0.0',
  });
  // wormPayloadHash is the subject digest — always (it is now required).
  const subjectDigest = input.wormPayloadHash;
  const subject: OnigaeshiAuditSubject = Object.freeze({
    name: `${input.engagementId}/${input.timestamp}`,
    digest: Object.freeze({ sha256: subjectDigest }),
  });
  return Object.freeze({
    _type: 'https://in-toto.io/Statement/v1',
    subject: Object.freeze([subject]),
    predicateType: ONIGAESHI_AUDIT_PREDICATE_TYPE,
    predicate,
  });
}
