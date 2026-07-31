// SPDX-License-Identifier: Apache-2.0
/**
 * Platform-audit cosign attestor — bridges `audit-logger.ts` write paths
 * to the Sigstore substrate.
 *
 * E1-PHASE-4-B14c Slice 1 (Master Plan v1.0 §4.2 / epics doc §E1-PHASE-4-B14c):
 * the first module group migrated from HMAC-only to dual-write
 * (HMAC + cosign + Rekor) is `kill-switch` — exactly one AuditEvent
 * (`KILL_SWITCH_FIRE`), exactly two callsites (admin/kill-switch route
 * + two-person-approval handler), lowest blast radius.
 *
 * Design (matches B-14a Slice 2b dual-write contract):
 *   1. The audit-logger's `writeEntry` continues to append the HMAC
 *      row to `data/audit/audit-YYYY-MM-DD.log`. That path is UNCHANGED.
 *   2. AFTER the HMAC write succeeds, the audit-logger calls
 *      `attestPlatformAuditEntry()` to cosign-attest a parallel row.
 *   3. The attestation lands at `data/audit/cosign-YYYY-MM-DD.jsonl`
 *      — a separate JSONL companion file so an operator can stage the
 *      cosign stream independently of the HMAC log rotation.
 *   4. Signer construction is gated by `SIGSTORE_AUDIT_ENABLED=true`
 *      (re-used from B-14a; same flag, same key material, same Rekor
 *      instance — operator burden is zero new flags for B-14c Slice 1).
 *   5. Signer failures are isolated: they log to stderr but never
 *      throw back to the audit-logger, so a flaky cosign binary
 *      cannot break the HMAC write path.
 *
 * R-T1: the predicate carries scalar hashes only. Raw IP / User-Agent /
 * detail values stay in the HMAC chain (filesystem-protected); the
 * cosign attestation only commits to their sha256-hex.
 *
 * License: Apache-2.0.
 */

import { mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveDataPath } from '@/lib/runtime-paths';
import { getOnigaeshiAuditSigner } from '@/lib/onigaeshi/worm-store';
import type { SignerPort, SignerResult } from 'bu-tpi/onigaeshi';

import {
  buildDojolmPlatformAuditStatement,
  canonicaliseDetailsJson,
  DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE,
  type DojolmPlatformAuditLevel,
  type DojolmPlatformAuditModule,
  type DojolmPlatformAuditPredicate,
} from './dojolm-platform-audit-predicate';

/** Companion-file directory (mirrors AUDIT_DIR in audit-logger.ts). */
const COSIGN_DIR = resolveDataPath('audit');

/**
 * Companion-file path resolver — `data/audit/cosign-YYYY-MM-DD.jsonl`.
 * One file per UTC day; the audit-logger's own rotation handles size
 * pressure on the HMAC log independently.
 */
function todayCosignPath(now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(COSIGN_DIR, `cosign-${date}.jsonl`);
}

/**
 * Persisted companion-row shape. One JSONL line per successful cosign
 * attestation; verifiers tail the file to enumerate signed rows since
 * the last checkpoint. The row mirrors the HMAC-log row's `timestamp`
 * + `event` so an operator can cross-reference cosign attestations
 * against HMAC entries during the dual-write soak.
 */
export interface PlatformAuditCosignRow {
  readonly timestamp: string;
  readonly module: DojolmPlatformAuditModule;
  readonly event: string;
  readonly predicateType: string;
  readonly entryUri: string;
  readonly logIndex: number;
  readonly rootHash: string;
  readonly detailHash: string;
}

/**
 * Input for `attestPlatformAuditEntry()` — the union of fields the
 * audit-logger has at write time. Mirrors `AuditLogEntry` + `AuditActor`
 * without importing the writer to dodge circular dependency.
 */
export interface AttestPlatformAuditInput {
  readonly module: DojolmPlatformAuditModule;
  readonly event: string;
  readonly level: DojolmPlatformAuditLevel;
  readonly timestamp: string;
  readonly actorOperatorId: string;
  readonly actorIpAddress: string;
  readonly actorUserAgent: string;
  /**
   * Already-redacted details map (the audit-logger applies
   * `redactSensitiveFields` BEFORE handing the entry to us so the
   * detailHash commits to the post-redaction value — same value
   * persisted to the HMAC log).
   */
  readonly redactedDetails: Readonly<Record<string, unknown>>;
}

/**
 * Result of a successful attestation call. Returned for callers that
 * want to surface the URI in API responses (e.g., the kill-switch
 * route could expose `cosignAttestationUri` in its 200 body to
 * acknowledge the dual-write landed).
 */
export interface AttestPlatformAuditResult {
  readonly entryUri: string;
  readonly logIndex: number;
  readonly rootHash: string;
}

/**
 * Optional dependency-injection seam for tests. Production callers
 * leave `signerOverride` unset and the helper resolves the cached
 * signer via `getOnigaeshiAuditSigner()`. Tests inject an
 * `InProcessTestSigner` instance directly to avoid the cosign-binary
 * dependency.
 *
 * `nowOverride` lets tests pin the timestamp used for the companion
 * file path; production reads system clock.
 */
export interface AttestPlatformAuditDeps {
  readonly signerOverride?: SignerPort | null;
  readonly nowOverride?: () => Date;
  /**
   * Optional callback fired when the signer throws OR rejects with
   * any error. Default behaviour logs to stderr; tests use this to
   * assert isolation without polluting test stdout.
   */
  readonly onError?: (err: unknown) => void;
}

/**
 * Attest a platform-audit row via the cosign Sigstore substrate.
 * No-ops + returns null when `SIGSTORE_AUDIT_ENABLED` is off or the
 * signer factory returns null.
 *
 * **Failure isolation contract**: this function NEVER throws. Any
 * underlying error (signer construction failure, cosign CLI error,
 * companion-file write error) is reported via `deps.onError` and
 * swallowed. The audit-logger's HMAC write path is the canonical
 * audit substrate during the dual-write window — cosign is best-
 * effort until the operator flips `SIGSTORE_AUDIT_ENABLED=true` and
 * the full 4-week dual-write soak completes.
 */
export async function attestPlatformAuditEntry(
  input: AttestPlatformAuditInput,
  deps: AttestPlatformAuditDeps = {},
): Promise<AttestPlatformAuditResult | null> {
  const onError = deps.onError ?? defaultOnError;
  let signer: SignerPort | null;
  try {
    signer =
      deps.signerOverride !== undefined
        ? deps.signerOverride
        : await getOnigaeshiAuditSigner();
  } catch (err) {
    onError(err);
    return null;
  }
  if (signer === null) return null;

  let signResult: SignerResult;
  try {
    const canonicalDetailsJson = canonicaliseDetailsJson(input.redactedDetails);
    const statement = buildDojolmPlatformAuditStatement({
      module: input.module,
      event: input.event,
      level: input.level,
      timestamp: input.timestamp,
      actorOperatorId: input.actorOperatorId,
      actorIpAddress: input.actorIpAddress,
      actorUserAgent: input.actorUserAgent,
      canonicalDetailsJson,
    });
    const subjectBytes = Buffer.from(canonicalDetailsJson, 'utf8');
    signResult = await signer.sign<DojolmPlatformAuditPredicate>(
      statement,
      subjectBytes,
    );
  } catch (err) {
    onError(err);
    return null;
  }

  try {
    await persistCosignRow({
      timestamp: input.timestamp,
      module: input.module,
      event: input.event,
      predicateType: DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE,
      entryUri: signResult.entryUri,
      logIndex: signResult.inclusionProof.logIndex,
      rootHash: signResult.inclusionProof.rootHash,
      detailHash: extractDetailHash(signResult),
    }, deps.nowOverride?.() ?? new Date());
  } catch (err) {
    // Persistence failure isolated — the cosign attestation IS already
    // anchored in Rekor at this point (the URI is returned), so the
    // operator can recover the row from Rekor later. The companion
    // file is an indexing convenience, not the source of truth.
    onError(err);
  }

  return Object.freeze({
    entryUri: signResult.entryUri,
    logIndex: signResult.inclusionProof.logIndex,
    rootHash: signResult.inclusionProof.rootHash,
  });
}

/**
 * Append one JSONL row to the day's companion file. Creates the
 * directory if missing. Atomic per `appendFile` semantics on POSIX.
 */
async function persistCosignRow(
  row: PlatformAuditCosignRow,
  now: Date,
): Promise<void> {
  await mkdir(COSIGN_DIR, { recursive: true });
  const filePath = path.join(
    COSIGN_DIR,
    `cosign-${now.toISOString().slice(0, 10)}.jsonl`,
  );
  await appendFile(filePath, `${JSON.stringify(row)}\n`, 'utf8');
}

/**
 * Re-extract `detailHash` from the SignerResult's DSSE envelope by
 * decoding the payload and reading the predicate field. Returns
 * empty string on any parse failure (defensive — the caller persists
 * an empty string rather than crashing the audit-write path).
 */
function extractDetailHash(result: SignerResult): string {
  try {
    const decoded = Buffer.from(result.envelope.payload, 'base64').toString(
      'utf8',
    );
    const parsed = JSON.parse(decoded);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const stmt = parsed as { predicate?: { detailHash?: unknown } };
    if (
      stmt.predicate &&
      typeof stmt.predicate.detailHash === 'string'
    ) {
      return stmt.predicate.detailHash;
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Default error reporter — single-line stderr emit so a flaky cosign
 * binary surfaces in container logs without leaking secrets. Tests
 * override via `deps.onError`.
 */
function defaultOnError(err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(
    '[platform-audit-cosign-attestor] signer failure (isolated; HMAC write unaffected):',
    err instanceof Error ? err.message : err,
  );
}

/**
 * Test helper — exposed for tests that need the resolved companion
 * file path (so they can read back the JSONL row + assert shape).
 * Pure / no side effects.
 */
export function __testResolveCosignPath(now: Date = new Date()): string {
  return todayCosignPath(now);
}
