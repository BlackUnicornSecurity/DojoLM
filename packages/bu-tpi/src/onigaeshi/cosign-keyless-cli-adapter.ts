// SPDX-License-Identifier: Apache-2.0
/**
 * cosign CLI adapter — production FULCIO KEYLESS (OIDC) `SignerPort`.
 *
 * E1-PHASE-4-M2 slice 1 (MOAT-1). Mirrors the static-key adapter
 * (`cosign-signer-cli-adapter.ts`) but signs against a short-lived
 * Fulcio certificate minted from an operator OIDC token — there is NO
 * long-lived key on disk. The security-critical primitives both adapters
 * share (exec wrapper, version gate, the CRIT-1 subject digest-binding,
 * the bundle parser, the verify-stdout extractor, the env builder) live
 * in `cosign-cli-shared.ts` and are REUSED here, never duplicated
 * (blueprint §5 anti-pattern #7).
 *
 * Sign:   `cosign attest-blob --identity-token @<0o600 tokenfile>
 *          --fulcio-url … --oidc-issuer … --rekor-url … --new-bundle-format -`
 *         (subjectBytes on stdin — the token CANNOT share stdin).
 * Verify: `cosign verify-blob-attestation --certificate-identity <san>
 *          --certificate-oidc-issuer <iss> --rekor-url …` (NO `--key`).
 *
 * R-T1 / bearer-secret discipline (blueprint §3.2 / §5 anti-pattern #1):
 *   - the OIDC token is a Buffer, acquired PER-`sign()` from the injected
 *     `OidcTokenSource` (never cached on the adapter);
 *   - it is written to a `mkdtempSync` 0o600 tokenfile and passed as
 *     `--identity-token @<tokenfile>` — NEVER a bare value in argv (which
 *     would leak in `ps`);
 *   - the Buffer is `.fill(0)`'d and the tokenfile unlinked in a `finally`
 *     on EVERY path (success + throw);
 *   - the token is never logged, never placed in an error, never in the
 *     cached-signer closure.
 *
 * NOTE: keyless does NOT make the DSSE payload safe — `operatorId` /
 * `signerUsernames` are clear in the payload regardless of backend
 * (CRIT-2). The runtime `rekorReadAuthAttested` gate (enforced in
 * `cosign-signer.ts:validateSignerConfig`) is the R-T1 control; this
 * adapter is only constructed once that gate has passed.
 *
 * License: Apache-2.0.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { OnigaeshiAuditPredicate } from './audit-predicate.js';
import {
  execFileAsync,
  assertCosignVersion,
  assertSubjectBytesBinding,
  buildCosignEnv,
  buildCosignVerifyEnv,
  parseCosignBundle,
  extractPredicateFromVerifyStdout,
  COSIGN_TIMEOUT_MS,
  COSIGN_MAX_BUFFER,
} from './cosign-cli-shared.js';
import type {
  SignerPort,
  SignerResult,
  DsseEnvelope,
  InTotoStatement,
  VerifyContext,
} from './cosign-signer.js';
import type { OidcTokenSource } from './oidc-token-source.js';
import { acceptedPredicateTypes } from './predicate-type-aliases.js';

/**
 * Minimum cosign 2.x MINOR required for keyless. Old 2.x binaries predate
 * stable `--identity-token @file` handling; pin a floor so a stale binary
 * fails fast at `assertReady` rather than mishandling the secret indirection.
 */
const KEYLESS_MIN_COSIGN_MINOR = 4;

export interface CosignKeylessCliConfig {
  /** Absolute path to the cosign binary. */
  readonly binaryPath: string;
  /** Fulcio CA URL (mints the short-lived signing cert from the OIDC token). */
  readonly fulcioUrl: string;
  /** OIDC issuer URL (operator identity provider — self-hosted Dex per §0=A). */
  readonly oidcIssuer: string;
  /** Private Rekor URL. */
  readonly rekorUrl: string;
  /**
   * Expected operator identity (cert SAN) pinned at verify via
   * `--certificate-identity`. A cert for a different SAN — even under the
   * trusted issuer — MUST fail (anti-pattern #13).
   */
  readonly certificateIdentity: string;
  /** OIDC token source — Buffer, per-`sign()`, aud+iss pinned at acquisition. */
  readonly tokenSource: OidcTokenSource;
  /** Optional override of the default predicate type URI (testing only). */
  readonly predicateTypeOverride?: string;
  /** Optional env overrides forwarded to every cosign invocation. */
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * Production-grade keyless `SignerPort`. Callers MUST await
 * `assertReady()` before sign/verify (mirrors the static adapter).
 */
export class CosignKeylessCliAdapter implements SignerPort {
  private readonly config: CosignKeylessCliConfig;
  private ready: boolean = false;

  constructor(config: CosignKeylessCliConfig) {
    this.config = config;
  }

  /**
   * Verify the cosign binary version: v2 major pin PLUS a minimum 2.x
   * minor floor (keyless `--identity-token @file` needs a recent 2.x).
   */
  async assertReady(): Promise<void> {
    if (this.ready) return;
    await assertCosignVersion(this.config.binaryPath, {
      minMinor: KEYLESS_MIN_COSIGN_MINOR,
    });
    this.ready = true;
  }

  /**
   * Sign an in-toto Statement via Fulcio keyless. Binds subjectBytes to
   * the declared digest (shared CRIT-1), acquires a fresh OIDC token,
   * writes it to a 0o600 tokenfile, invokes `attest-blob` with
   * `--identity-token @<tokenfile>`, then zeroizes + unlinks on every path.
   */
  async sign<P = OnigaeshiAuditPredicate>(
    statement: InTotoStatement<P>,
    subjectBytes?: Buffer,
  ): Promise<SignerResult> {
    if (!this.ready) {
      throw new Error(
        '[cosign-keyless-cli-adapter] assertReady() must be awaited before sign()',
      );
    }
    // CRIT-1 (shared): validate the subject binding BEFORE acquiring the
    // bearer secret — a bad statement must not even cause a token fetch.
    await assertSubjectBytesBinding(statement, subjectBytes);

    const token = await this.config.tokenSource.acquire();
    // Outer finally guarantees the bearer secret is zeroized on EVERY path —
    // INCLUDING a throw from mkdtempSync before the tempdir exists (R-T1).
    try {
      const tempDir = mkdtempSync(join(tmpdir(), 'dojolm-cosign-keyless-'));
      const predicateFile = join(tempDir, 'predicate.json');
      const tokenFile = join(tempDir, 'identity-token');
      const bundleFile = join(tempDir, 'bundle.json');
      try {
        writeFileSync(predicateFile, JSON.stringify(statement.predicate), {
          mode: 0o600,
        });
        // 0o600 tokenfile + `--identity-token @<file>` — the token is NEVER
        // a bare argv value (it would be visible in `ps`).
        writeFileSync(tokenFile, token, { mode: 0o600 });
        const predicateType =
          this.config.predicateTypeOverride ?? statement.predicateType;
        const args = [
          'attest-blob',
          '--predicate',
          predicateFile,
          '--type',
          predicateType,
          '--fulcio-url',
          this.config.fulcioUrl,
          '--oidc-issuer',
          this.config.oidcIssuer,
          '--identity-token',
          `@${tokenFile}`,
          '--rekor-url',
          this.config.rekorUrl,
          '--bundle',
          bundleFile,
          '--yes', // skip confirmation prompts; safe in non-interactive
          '--new-bundle-format',
          '-', // stdin source — cosign hashes subjectBytes piped below
        ];
        await execFileAsync(this.config.binaryPath, args, {
          timeout: COSIGN_TIMEOUT_MS,
          maxBuffer: COSIGN_MAX_BUFFER,
          env: buildCosignEnv(this.config.env),
          input: subjectBytes,
        });
        const bundleJson = await readFile(bundleFile, 'utf8');
        // Carry the raw cosign bundle (verificationMaterial) so a future keyless
        // verify can re-verify — same fix as the static adapter. The keyless
        // verify BODY still needs the M-3a bundle-path work (FORWARD-DEP below),
        // but capturing the bundle here keeps the two adapters symmetric and
        // avoids a silent SignerResult that can never drive a working verify.
        // (B-14a verify-path fix, 2026-06-28.)
        return Object.freeze({
          ...parseCosignBundle(bundleJson, statement),
          bundle: bundleJson,
        });
      } finally {
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // best-effort cleanup
        }
      }
    } finally {
      // Zeroize the bearer secret on EVERY path (success, cosign throw, AND a
      // pre-tempdir mkdtempSync/acquire-region throw).
      token.fill(0);
    }
  }

  async verify<P = OnigaeshiAuditPredicate>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    // ctx accepted for SignerPort symmetry. The keyless bundle-verify path
    // (consuming ctx.bundle + ctx.subjectBytes the way the static adapter does)
    // is a tracked M-3a FORWARD-DEP; today keyless verification pins cert
    // identity + issuer, not a caller-supplied bundle. (B-14a verify-path fix.)
    ctx?: VerifyContext,
  ): Promise<P | null> {
    if (!this.ready) {
      throw new Error(
        '[cosign-keyless-cli-adapter] assertReady() must be awaited before verify()',
      );
    }
    if (ctx !== undefined) {
      // The keyless bundle-verify path is an M-3a FORWARD-DEP (see verifyOne).
      // Make the discard NON-SILENT: a caller that correctly supplies a
      // VerifyContext would otherwise receive null via the legacy cert-identity
      // path, indistinguishable from a real "signature invalid" verdict.
      // eslint-disable-next-line no-console
      console.warn(
        '[cosign-keyless-cli-adapter] verify: VerifyContext supplied but the keyless bundle-verify path is an M-3a forward-dep — ctx IGNORED; verifying via the legacy cert-identity path (may return null until M-3a lands)',
      );
    }
    // BU-106 dual-accept: cosign's `--type` flag is single-valued; try each
    // accepted alias (legacy + canonical for migrating types, else the one
    // exact type). First success wins. Bounded to the accept-list (<= 2).
    for (const candidateType of acceptedPredicateTypes(expectedPredicateType)) {
      const result = await this.verifyOne<P>(envelope, candidateType, ctx);
      if (result !== null) return result;
    }
    return null;
  }

  /**
   * Verify against EXACTLY ONE predicate type. Keyless verification pins
   * the operator identity (`--certificate-identity`) AND the issuer
   * (`--certificate-oidc-issuer`) and passes NO `--key`. Returns the
   * decoded predicate on success, or null on any cosign failure (expired
   * cert, identity/issuer mismatch, inclusion-proof failure, unparseable
   * stdout) per the SignerPort contract.
   */
  private async verifyOne<P>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    // _ctx — see verify(): keyless bundle-path is an M-3a FORWARD-DEP; unused today.
    _ctx?: VerifyContext,
  ): Promise<P | null> {
    const tempDir = mkdtempSync(join(tmpdir(), 'dojolm-cosign-keyless-verify-'));
    const bundleFile = join(tempDir, 'bundle.json');
    try {
      // FORWARD-DEP (S3 live-smoke / M-3a verifier): `--certificate-identity`
      // can only gate a real verification once the bundle carries the Fulcio
      // leaf cert + tlog. The shared `DsseEnvelope` does not yet retain the
      // cert (`parseCosignBundle` keeps only payload+sigs+inclusionProof), so
      // against a live cosign this bundle lacks the trust material and verify
      // returns null. Carrying the cert through `DsseEnvelope` is a shared
      // public-schema change owned by the verifier slice (plan §4 S4 / MED-4),
      // NOT S1. This wiring mirrors the static adapter's verify shape + pins
      // the keyless cert-identity/issuer flags; the live trust decision lands
      // with M-3a. Unit tests here prove flag wiring + the null-on-failure
      // contract, not the live cert evaluation.
      //
      // PARITY TARGET for the M-3a port: mirror the STATIC adapter's
      // `decodeVerifiedPredicate` + `sameEnvelope` — decode the predicate from
      // the cosign-AUTHENTICATED bundle and cross-check the caller `envelope`
      // (payloadType + payload + sig) — rather than the weaker stdout parse used
      // below. Do NOT copy this stdout-parse shape as the verified pattern.
      const bundle = {
        mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.3',
        verificationMaterial: {},
        dsseEnvelope: envelope,
      };
      writeFileSync(bundleFile, JSON.stringify(bundle), { mode: 0o600 });
      const args = [
        'verify-blob-attestation',
        '--bundle',
        bundleFile,
        '--type',
        expectedPredicateType,
        '--certificate-identity',
        this.config.certificateIdentity,
        '--certificate-oidc-issuer',
        this.config.oidcIssuer,
        '--rekor-url',
        this.config.rekorUrl,
        '--new-bundle-format',
        '-', // stdin sink; pass empty input
      ];
      let stdout: string;
      try {
        const result = await execFileAsync(this.config.binaryPath, args, {
          timeout: COSIGN_TIMEOUT_MS,
          maxBuffer: COSIGN_MAX_BUFFER,
          // verify never needs COSIGN_PASSWORD — narrow it out (parity with the
          // static adapter's verify paths).
          env: buildCosignVerifyEnv(this.config.env),
          input: '',
        });
        stdout = result.stdout;
      } catch {
        // Verification failure (non-zero exit) → null per the contract.
        return null;
      }
      const extracted = extractPredicateFromVerifyStdout(stdout, expectedPredicateType);
      return extracted as P | null;
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}
