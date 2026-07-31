// SPDX-License-Identifier: Apache-2.0
/**
 * DojolmLM platform-audit predicate — generic in-toto Statement payload
 * for the audit-logger.ts callsites outside the Onigaeshi engagement
 * substrate and the Bushido sign-off ledger.
 *
 * E1-PHASE-4-B14c Slice 1 (Master Plan v1.0 §4.2 / epics doc §E1-PHASE-4-B14c):
 * the platform-audit cutover migrates ~74 remaining `audit-logger.ts`
 * callsites + 57 AuditEvent enum members from per-entry HMAC to
 * cosign-signed + Rekor-witnessed attestations. The substrate is the
 * same generic `SignerPort` adapter used by Onigaeshi (B-14a) and
 * Bushido (B-14b); only the predicate URI differs so verifiers can
 * dispatch the right parser per audit domain.
 *
 * Predicate type URI: `https://specs.dojolm.com/platform-audit/v1`
 *   - Distinct from Onigaeshi's `https://specs.dojolm.com/audit/v1`
 *     so the two substrates are queryable independently in Rekor.
 *   - Distinct from Bushido's `https://specs.dojolm.com/bushido-signoff/v1`.
 *   - Spec text published alongside `dojolm.eval/v1` in the public
 *     `github.com/BlackUnicornSecurity/eval-predicate` repo (M-11.2).
 *
 * R-T1: the predicate carries scalar metadata + content hashes only.
 * Raw audit detail content lives on the filesystem under restricted
 * permissions (audit-YYYY-MM-DD.log); the predicate only commits to
 * its sha256-hex hash so a verifier can re-derive the same hash from
 * the row without dereferencing the detail map.
 *
 * License: Apache-2.0.
 */

import { createHash } from 'node:crypto';

import type { InTotoStatement } from 'bu-tpi/onigaeshi';

/**
 * Closed predicate-type URI for the `dojolm.platform-audit/v1` schema.
 * Pinned to the path component `platform-audit` to distinguish from
 * Onigaeshi `audit` (engagement-scoped) and Bushido `bushido-signoff`
 * (quarter-locked attestation).
 */
export const DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE =
  'https://specs.dojolm.com/platform-audit/v1' as const;

/**
 * Closed-enum of supported audit-module domains. B-14c decomposes the
 * audit-logger cutover into 10 module groups (master plan §10 table);
 * Slice 1 ships `'kill-switch'` only. Subsequent slices add the
 * remaining 9 module ids in low→high blast-radius order:
 *
 *   2. retention      — RETENTION_RUN events
 *   3. members-invites — MEMBER_INVITE_*
 *   4. llm-calls      — LLM_REQUEST / LLM_RESPONSE / LLM_BUDGET_EXCEEDED
 *   5. mitsuke-triage — MITSUKE_TRIAGE_OVERRIDE_*
 *   6. kotoba         — KOTOBA_SCORE / KOTOBA_HARDEN
 *   7. hattori        — GUARD_DEFENSE_* / GUARD_HARDENING_ANALYZE / GUARD_MODE_BLOCK
 *   8. atemi          — TEMPORAL_RUN / ATEMI_PROBE_* (Phase 4 wave)
 *   9. eval-readers   — KOKUGIKAN_SUBMISSION_INGEST + reader paths
 *  10. auth-rbac      — AUTH_* / USER_* / API_KEY_* / ATTACK_MODE_CHANGE
 *
 * Module ids are kebab-case; the closed enum below carries
 * `'kill-switch'` plus the 9 ids listed above.
 */
export type DojolmPlatformAuditModule =
  | 'kill-switch'
  | 'retention'
  | 'members-invites'
  | 'llm-calls'
  | 'mitsuke-triage'
  | 'kotoba'
  | 'hattori'
  | 'atemi'
  | 'eval-readers'
  | 'auth-rbac';

/**
 * Closed-enum of audit log levels mirrored from `audit-logger.ts`
 * `AuditLevel`. Re-exported here so the predicate type is decoupled
 * from the writer-side type — verifiers reading the predicate don't
 * need a runtime dependency on the writer module.
 */
export type DojolmPlatformAuditLevel = 'info' | 'warn' | 'error';

/**
 * Predicate fields snapshotted at the audit-event write time.
 *
 * R-T1 discipline:
 *   - `actorOperatorId` is the stable id of the operator who initiated
 *     the audited mutation (e.g., the operator who fired the
 *     kill-switch). Persisted in clear because legal-defensibility
 *     queries on "who fired KILL_ATEMI on 2026-04-30?" load-bear on
 *     identity.
 *   - `actorIpHash` and `actorUserAgentHash` are SHA-256 hex hashes
 *     so the predicate never leaks raw IP or User-Agent strings to
 *     a public Rekor instance. The HMAC-chain row at
 *     `audit-YYYY-MM-DD.log` retains the raw values under restricted
 *     filesystem permissions for forensics.
 *   - `detailHash` is the SHA-256 hex of the canonical-JSON
 *     serialisation of the audit row's `details` map AFTER PII
 *     redaction (the same redaction the audit-logger applies before
 *     writing to disk). A verifier re-derives the same hash by
 *     hashing the row's `details` field.
 */
export interface DojolmPlatformAuditPredicate {
  /** Predicate type URI — pinned to DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE. */
  readonly _type: typeof DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE;
  /** Audit module domain (one of the 10 B-14c module groups). */
  readonly module: DojolmPlatformAuditModule;
  /** Concrete AuditEvent string (e.g., 'KILL_SWITCH_FIRE'). */
  readonly event: string;
  /** Audit log level mirrored from the row. */
  readonly level: DojolmPlatformAuditLevel;
  /** RFC 3339 timestamp from the audit row. */
  readonly timestamp: string;
  /** Stable operator id (R-T1: persisted in clear; load-bears legal defensibility). */
  readonly actorOperatorId: string;
  /** SHA-256 hex of the operator's source IP. */
  readonly actorIpHash: string;
  /** SHA-256 hex of the operator's User-Agent header. */
  readonly actorUserAgentHash: string;
  /** SHA-256 hex of the canonical-JSON serialisation of the audit row's details map. */
  readonly detailHash: string;
  /** Schema version pin (semver-on-spec). */
  readonly specVersion: '1.0.0';
}

/**
 * In-toto Statement carrying a DojolmPlatformAuditPredicate. The wire
 * format is identical to OnigaeshiAuditStatement + BushidoSignoffStatement
 * (in-toto v1); only the TypeScript predicate type narrows.
 */
export type DojolmPlatformAuditStatement = InTotoStatement<DojolmPlatformAuditPredicate>;

/**
 * Input for building a platform-audit predicate. Mirrors the audit-row
 * shape from `audit-logger.ts` (AuditLogEntry + AuditActor) without
 * importing the writer module to avoid a circular dependency.
 */
export interface BuildDojolmPlatformAuditStatementInput {
  readonly module: DojolmPlatformAuditModule;
  readonly event: string;
  readonly level: DojolmPlatformAuditLevel;
  readonly timestamp: string;
  readonly actorOperatorId: string;
  readonly actorIpAddress: string;
  readonly actorUserAgent: string;
  /** Canonical-JSON serialisation of the redacted details map. */
  readonly canonicalDetailsJson: string;
}

/**
 * SHA-256 hex digest of `input` (utf8). Pure helper used both by the
 * predicate builder (detailHash, actor hashes) and by verifiers that
 * re-derive the same hashes from the audit row on disk.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Build a frozen in-toto Statement from a platform-audit row input.
 * Pure data construction — does NOT call cosign; that lives in the
 * wrapper at `cosign-attestor.ts`.
 *
 * The Statement's subject digest is the SHA-256 of `canonicalDetailsJson`
 * — same value as `detailHash` so the cosign CRIT-1 binding check
 * (subject.digest.sha256 === sha256(subjectBytes)) holds when the
 * caller passes the canonical details JSON as `subjectBytes`.
 */
export function buildDojolmPlatformAuditStatement(
  input: BuildDojolmPlatformAuditStatementInput,
): DojolmPlatformAuditStatement {
  const detailHash = sha256Hex(input.canonicalDetailsJson);
  const predicate: DojolmPlatformAuditPredicate = Object.freeze({
    _type: DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE,
    module: input.module,
    event: input.event,
    level: input.level,
    timestamp: input.timestamp,
    actorOperatorId: input.actorOperatorId,
    actorIpHash: sha256Hex(input.actorIpAddress),
    actorUserAgentHash: sha256Hex(input.actorUserAgent),
    detailHash,
    specVersion: '1.0.0',
  });
  return Object.freeze({
    _type: 'https://in-toto.io/Statement/v1',
    subject: Object.freeze([
      Object.freeze({
        name: `dojolm/platform-audit/${input.module}/${input.event}/${input.timestamp}`,
        digest: Object.freeze({ sha256: detailHash }),
      }),
    ]),
    predicateType: DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE,
    predicate,
  });
}

/**
 * Canonicalise a details map to a stable-ordered JSON string so the
 * verifier can re-derive `detailHash`. Sort keys alphabetically at the
 * top level only; deep canonicalisation is not required for B-14c
 * Slice 1 because the audit-logger details maps are flat (PII
 * redaction recurses but the resulting tree is already deterministic
 * per `redactSensitiveFields` semantics).
 */
export function canonicaliseDetailsJson(
  details: Readonly<Record<string, unknown>>,
): string {
  const keys = Object.keys(details).sort();
  const ordered: Record<string, unknown> = {};
  for (const k of keys) {
    ordered[k] = details[k];
  }
  return JSON.stringify(ordered);
}
