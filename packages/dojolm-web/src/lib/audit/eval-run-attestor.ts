// SPDX-License-Identifier: Apache-2.0
/**
 * dojolm.eval/v1 run attestor — signs a stored signed-run record via the
 * cosign `SignerPort` and persists the attestation.
 *
 * E1-PHASE-4-M1 (MOAT-1) slice 3b (Master Plan v1.0 §4.2). The cross-package
 * wire (`dojolm-web` ↔ `bu-tpi`) that turns a stored `dojolm.eval/v1` run into
 * a verifiable, cosign-attested provenance record. Mirrors the platform-audit
 * `cosign-attestor.ts` (B-14c): build the in-toto Statement, sign it via the
 * generic `SignerPort`, persist the DSSE envelope + Rekor inclusion proof.
 *
 * Signer backend (founder-locked, decision #1/#4): M-1 shipped the pure-TS
 * `in-memory-test` `InProcessTestSigner` (deterministic, no cosign binary, no
 * real Rekor). E1-PHASE-4-M2 slice 1 wires the real static-key `private-rekor`
 * backend, selected from env (mirroring `buildAuditSigner`); the in-memory
 * signer stays available as a dev/CI override. E1-PHASE-4-M2 slice 2 adds the
 * `fulcio-keyless` backend, selected per-surface via DOJOLM_EVAL_ATTEST_BACKEND.
 *
 * Gating: `getEvalAttestationSigner` returns null unless
 * `DOJOLM_EVAL_ATTEST_ENABLED === 'true'`, so production `attestEvalRun()`
 * no-ops by default (there is NO production caller in 3b — this slice ships the
 * capability; wiring the attest step into the run-append flow is a follow-up).
 * The flag is dedicated (NOT the audit substrate's `SIGSTORE_AUDIT_ENABLED`) so
 * eval attestation is independently deployable and never drags in the cosign
 * env required by the onigaeshi/platform-audit signer.
 *
 * Failure-isolation contract: `attestEvalRun` NEVER throws. The signed-run row
 * is already persisted (slice 1), so attestation is additive provenance — any
 * failure (signer resolution, sign, or persist) is reported via `deps.onError`
 * and yields null. A non-null result means the attestation was BOTH signed AND
 * durably persisted (stricter than platform-audit, which returns the Rekor URI
 * even if its companion-file index write fails — eval has no separate durable
 * anchor under in-memory-test, so "success" must mean "stored").
 *
 * License: Apache-2.0.
 */

import { buildSigner } from 'bu-tpi/onigaeshi';
import type { SignerPort } from 'bu-tpi/onigaeshi';

import {
  resolveSignerBackend,
  buildKeylessConfigFromEnv,
} from '@/lib/cosign-signer-backend-env';

import {
  EVAL_PREDICATE_TYPE,
  type DojoLmEvalV1Predicate,
  type SignedRunRecord,
} from '@/lib/signed-runs-store';

import { buildEvalAttestation } from './dojolm-eval-attestation-predicate';
import { appendEvalAttestation } from './eval-attestations-store';

/** Memoised in-flight signer construction (`null` = unresolved). */
let cachedSignerPromise: Promise<SignerPort | null> | null = null;

/**
 * Resolve the eval attestation signer for this process. Returns null unless
 * `DOJOLM_EVAL_ATTEST_ENABLED === 'true'`. When enabled it selects the backend
 * from `DOJOLM_EVAL_ATTEST_BACKEND` ∈ `private-rekor` (default) | `fulcio-keyless`
 * | `in-memory-test` (generalising the legacy `DOJOLM_EVAL_ATTEST_DEV_BACKEND=
 * in-memory-test` override, which still works). `private-rekor` reads the
 * static-key env (mirroring `buildAuditSigner`); `fulcio-keyless` (E1-PHASE-4-M2)
 * reads the per-surface keyless env.
 *
 * Caches the in-flight PROMISE (not the resolved value) so concurrent first
 * callers join ONE construction — `buildSigner({backend:'private-rekor'})`
 * does real async work (CLI-adapter import + `assertReady` binary probe) that
 * must not be duplicated. A build failure clears the cache so the next call
 * retries (mirrors `getOnigaeshiAuditSigner` in `worm-store.ts`).
 */
export async function getEvalAttestationSigner(): Promise<SignerPort | null> {
  if (cachedSignerPromise) return cachedSignerPromise;
  cachedSignerPromise = buildEvalSigner().catch((err) => {
    cachedSignerPromise = null;
    throw err;
  });
  return cachedSignerPromise;
}

async function buildEvalSigner(): Promise<SignerPort | null> {
  if (process.env.DOJOLM_EVAL_ATTEST_ENABLED !== 'true') return null;
  const backend = resolveSignerBackend('DOJOLM_EVAL_ATTEST');
  // Dev/CI override (and the explicit `in-memory-test` selection): in-memory
  // signer with no cosign binary on the host. Lets the capability be
  // smoke-tested without dragging in the cosign env.
  if (backend === 'in-memory-test') {
    return buildSigner({ backend: 'in-memory-test' });
  }
  if (backend === 'fulcio-keyless') {
    // E1-PHASE-4-M2 (MOAT-1): Fulcio keyless OIDC. The CRIT-2 read-auth gate is
    // threaded from DOJOLM_EVAL_REKOR_READ_AUTH_ATTESTED via the shared helper —
    // NEVER hardcoded true; buildSigner refuses to build without it (outside
    // CI). Eval keeps its OWN Rekor URL (DOJOLM_EVAL_REKOR_URL) so it stays
    // independently deployable, sharing only the host cosign binary.
    return buildSigner(
      buildKeylessConfigFromEnv({
        backendVar: 'DOJOLM_EVAL_ATTEST_BACKEND',
        keylessPrefix: 'DOJOLM_EVAL',
        rekorUrl: process.env.DOJOLM_EVAL_REKOR_URL,
        rekorUrlVar: 'DOJOLM_EVAL_REKOR_URL',
        cosignBinaryPath: process.env.COSIGN_BINARY_PATH,
      }),
    );
  }
  // backend === 'private-rekor' (default): static-key cosign CLI → private
  // Rekor, mirroring buildAuditSigner (worm-store.ts). R-T1 DEPLOY PRE-FLIGHT
  // (founder-gated): the private Rekor MUST require read authentication — the
  // DSSE payload exposes the predicate (operatorId in clear) as base64. Eval
  // keeps its OWN enable flag + Rekor URL so it stays independently
  // deployable; it shares the host cosign binary + signing keys.
  const rekorUrl = process.env.DOJOLM_EVAL_REKOR_URL;
  const cosignBinaryPath = process.env.COSIGN_BINARY_PATH;
  const cosignSigningKeyPath = process.env.COSIGN_SIGNING_KEY_PATH;
  const cosignVerifyingKeyPath = process.env.COSIGN_VERIFYING_KEY_PATH;
  // Optional (offline / egress-restricted verify): a local trusted_root.json for
  // `cosign verify-blob-attestation --trusted-root`. Shared host cosign property
  // like COSIGN_BINARY_PATH. Unset ⇒ cosign fetches the public-good TUF root live.
  const cosignTrustedRootPath = process.env.COSIGN_TRUSTED_ROOT_PATH;
  if (
    !rekorUrl ||
    !cosignBinaryPath ||
    !cosignSigningKeyPath ||
    !cosignVerifyingKeyPath
  ) {
    throw new Error(
      'DOJOLM_EVAL_ATTEST_ENABLED=true requires DOJOLM_EVAL_REKOR_URL, ' +
        'COSIGN_BINARY_PATH, COSIGN_SIGNING_KEY_PATH, COSIGN_VERIFYING_KEY_PATH ' +
        '(or DOJOLM_EVAL_ATTEST_DEV_BACKEND=in-memory-test for dev/CI)',
    );
  }
  return buildSigner({
    backend: 'private-rekor',
    rekorUrl,
    cosignBinaryPath,
    cosignSigningKeyPath,
    cosignVerifyingKeyPath,
    ...(cosignTrustedRootPath ? { cosignTrustedRootPath } : {}),
  });
}

/** Test-only — clears the memoised signer so per-test env mutations take effect. */
export function __resetEvalAttestationSignerForTests(): void {
  cachedSignerPromise = null;
}

/** Optional DI seam + clock override + error sink for `attestEvalRun`. */
export interface AttestEvalRunDeps {
  /**
   * Inject a signer directly (tests pass an `InProcessTestSigner`); pass null
   * to force the gated-off no-op. Leave unset to resolve via
   * `getEvalAttestationSigner()`.
   */
  readonly signerOverride?: SignerPort | null;
  /** Pin the `createdAt` clock; production reads the system clock. */
  readonly nowOverride?: () => Date;
  /** Fired when any step throws; default logs a single redacted stderr line. */
  readonly onError?: (err: unknown) => void;
}

/** Result of a successful attestation — the run key, record hash, and Rekor URI. */
export interface AttestEvalRunResult {
  readonly runId: string;
  readonly recordHash: string;
  readonly entryUri: string;
}

/**
 * Attest a stored signed-run record: build the in-toto Statement, sign it via
 * the resolved/injected `SignerPort`, and persist the attestation. Returns null
 * when gated off (no signer) or on ANY failure (isolated via `deps.onError`).
 */
export async function attestEvalRun(
  record: SignedRunRecord,
  deps: AttestEvalRunDeps = {},
): Promise<AttestEvalRunResult | null> {
  const onError = deps.onError ?? defaultOnError;
  try {
    const signer =
      deps.signerOverride !== undefined
        ? deps.signerOverride
        : await getEvalAttestationSigner();
    // Gated off / no signer resolved → additive attestation simply no-ops.
    return signer === null
      ? null
      : await signAndPersistAttestation(record, signer, deps.nowOverride);
  } catch (err) {
    onError(err);
    return null;
  }
}

/**
 * Build → sign → persist for a resolved signer. Extracted so the gating
 * null-check stays a single ternary (no early-return branch) and the
 * sign/persist sequence reads as one straight-line unit.
 */
async function signAndPersistAttestation(
  record: SignedRunRecord,
  signer: SignerPort,
  nowOverride: (() => Date) | undefined,
): Promise<AttestEvalRunResult> {
  // Single canonicalisation: the SAME bytes hashed into the Statement subject
  // digest are passed as subjectBytes, so the CRIT-1 binding
  // (subject.digest.sha256 === sha256(subjectBytes)) holds by construction.
  const { statement, canonical, recordHash } = buildEvalAttestation(record);
  const subjectBytes = Buffer.from(canonical, 'utf8');
  const signResult = await signer.sign<DojoLmEvalV1Predicate>(
    statement,
    subjectBytes,
  );
  await appendEvalAttestation({
    runId: record.id,
    recordHash,
    predicateType: EVAL_PREDICATE_TYPE,
    envelope: signResult.envelope,
    inclusionProof: signResult.inclusionProof,
    entryUri: signResult.entryUri,
    createdAt: (nowOverride?.() ?? new Date()).toISOString(),
  });
  return Object.freeze({
    runId: record.id,
    recordHash,
    entryUri: signResult.entryUri,
  });
}

/**
 * Default error reporter — single-line stderr emit so a flaky signer surfaces
 * in container logs without leaking the record body. Tests override via
 * `deps.onError`.
 */
function defaultOnError(err: unknown): void {
  // Never log a raw non-Error value (it could carry record content); emit only
  // a bounded Error message or a fixed sentinel.
  const detail = (err instanceof Error ? err.message : '[non-Error thrown]').slice(
    0,
    512,
  );
  console.error(
    '[eval-run-attestor] attestation failed (isolated; signed-run row unaffected):',
    detail,
  );
}
