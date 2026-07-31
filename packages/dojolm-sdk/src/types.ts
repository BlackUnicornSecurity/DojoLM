// SPDX-License-Identifier: Apache-2.0
//
// @dojolm/sdk — public type surface.
//
// Mirrors the `dojolm.eval/v1` in-toto predicate schema authoritative in the
// separate spec repo `github.com/BlackUnicornSecurity/eval-predicate` (Apache-2.0 code
// + CC-BY-4.0 spec text). When the spec repo ships v0.1 (E1-D-M11-2 of Master
// Plan v1.0), the SDK pins a tagged version; until then these types are local
// scaffolding marked as PROVISIONAL.

/**
 * Content-addressed reference — mirrors `$defs/ContentAddressedRef` of the
 * published `dojolm.eval/v1` JSON Schema. Discriminated union on `scheme`. The
 * per-scheme `value` grammar (hex length, CID grammar, URI) is enforced by the
 * JSON Schema at the wire boundary; a verifier validates the wire predicate
 * against the schema, not against this dev-ergonomic type.
 */
export type ContentAddressedRef =
  | {
      readonly scheme: 'sha256';
      /** Lowercase-hex SHA-256 — 64 chars. Canonical bytes of an open-weight model / corpus / rubric file. */
      readonly value: string;
    }
  | {
      readonly scheme: 'git';
      /** Git commit sha — 40 lowercase-hex chars. */
      readonly value: string;
    }
  | {
      readonly scheme: 'ipfs-cid';
      /** IPFS CIDv0 or CIDv1. */
      readonly value: string;
    }
  | {
      /** Closed-weight model: vendor-published model-card hash + provider name. */
      readonly scheme: 'vendor-model-card';
      /** Lowercase-hex SHA-256 — 64 chars. */
      readonly value: string;
      /** Provider domain, e.g. `anthropic.com`, `openai.com`. */
      readonly provider: string;
    }
  | {
      readonly scheme: 'uri';
      /** Direct URI to a judge implementation (regex pattern / classifier model / human-judge runbook). */
      readonly value: string;
    };

/**
 * PROVISIONAL — the `dojolm.eval/v1` predicate. Field shape is reconciled to
 * the published v1 JSON Schema (`https://specs.dojolm.com/eval/v1/schema.json`;
 * ADR-verifier-cli §1.2 drift closed). Still PROVISIONAL: pins to the spec-repo
 * tag when M-11.2 ships v0.1. The wire predicate is validated against the JSON
 * Schema, not against this type.
 *
 * Per master plan §4.3 M-1.1: AI-specific evaluation run record.
 */
export interface DojoLmEvalV1Predicate {
  readonly _type: 'https://specs.dojolm.com/eval/v1';
  readonly modelRef: ContentAddressedRef;
  readonly systemPromptHash: string;
  readonly probeCorpusRef: ContentAddressedRef;
  readonly judgeModelRef: ContentAddressedRef;
  readonly judgeRubricHash: string;
  readonly sampleSize: number;
  readonly seed: number;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly operatorId: string;
  readonly transcriptHash: string;
  readonly verdictHash: string;
  /**
   * OPTIONAL. SHA-256 hex of the WORM-stored row canonical bytes; when present,
   * MUST equal the wrapping in-toto Statement's `subject.digest.sha256`
   * (CRIT-1 cosign binding check).
   */
  readonly wormPayloadHash?: string;
  /** Schema semver. MAJOR bumps move to a new predicate URI (`eval/v1` → `eval/v2`). */
  readonly specVersion: '1.0.0';
}

/**
 * Verifier output. Conforms to `dojolm-verify <pack.dsse>` CLI exit-code
 * contract: exit 0 ⇄ `valid: true`; exit 1 with diagnostic ⇄
 * `valid: false` + non-empty `errors[]`.
 */
export interface VerifyResult {
  readonly valid: boolean;
  readonly runCount: number;
  readonly signers: ReadonlyArray<{ readonly subject: string; readonly fingerprint: string }>;
  readonly errors: ReadonlyArray<string>;
  readonly rekorRoot: string;
  readonly verifiedAt: string;
}

/**
 * Submission ingest input — must match the existing Kokugikan submission
 * schema (DO-NOT-TOUCH per master plan §9). Optional `proofRef` field added
 * additively per E1-PHASE-4-M1; until M-1 ships, omit.
 */
export interface SubmissionInput {
  readonly id: string;
  readonly techniqueId: string;
  readonly modelId: string;
  readonly refusalClass: RefusalClass;
  readonly submittedAt?: string;
  /** Set after E1-PHASE-4-M1 lands; references a row in the
   *  co-located `signed-runs.jsonl` store carrying the
   *  `dojolm.eval/v1` predicate. */
  readonly proofRef?: string;
}

/**
 * Closed enum of refusal classes per the production Kokugikan schema.
 * Source of truth: `packages/dojolm-web/src/lib/kokugikan-submission-store.ts`
 * `REFUSAL_CLASSES`.
 */
export type RefusalClass = 'refused' | 'partial' | 'complied' | 'errored';

export interface TenantUrl {
  readonly url: string;
}

export interface ApiKeyAuth {
  readonly apiKey: string;
}

export interface TransparencyLogEntry {
  readonly logIndex: number;
  readonly payload: DojoLmEvalV1Predicate;
  readonly signature: string;
  readonly inclusionProof: {
    readonly rootHash: string;
    readonly treeSize: number;
    readonly path: ReadonlyArray<string>;
  };
  readonly entryTimestamp: string;
}
